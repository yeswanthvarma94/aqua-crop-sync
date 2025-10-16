// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateUserReq {
  accountId: string;
  username: string;
  role: "manager" | "partner";
  name: string;
  otpToken?: string;
  skipOtpVerification?: boolean;
}

// Secure password generator using Web Crypto API
function generateSecurePassword(length: number = 24): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?";
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array).map(x => chars[x % chars.length]).join('');
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body: CreateUserReq = await req.json();
    const { accountId, username, role, name, otpToken, skipOtpVerification = true } = body || {} as any;

    if (!accountId || !username || !role || !name) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    const phoneNumber = String(username).trim();
    if (!/^[+]?[1-9]\d{7,14}$/.test(phoneNumber.replace(/[\s\-]/g, ''))) {
      return new Response(JSON.stringify({ error: "Invalid phone number format" }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }
    
    if (!name || String(name).trim().length < 2) {
      return new Response(JSON.stringify({ error: "Name must be at least 2 characters" }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }
    
    if (!["manager", "partner"].includes(role)) {
      return new Response(JSON.stringify({ error: "Invalid role specified" }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!serviceKey) {
      if (import.meta.env.DEV) console.error("Missing service role key");
      return new Response(JSON.stringify({ error: "Configuration error" }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: req.headers.get("Authorization")! } },
    });

    // Verify authentication
    const { data: { user: authUser }, error: authError } = await userClient.auth.getUser();
    if (authError || !authUser) {
      return new Response(JSON.stringify({ error: "Authentication required" }), { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    // Verify ownership using secure function
    const { data: isOwner, error: ownerCheckErr } = await userClient.rpc("verify_account_owner", {
      account_uuid: accountId,
      user_uuid: authUser.id
    });

    if (ownerCheckErr || !isOwner) {
      if (import.meta.env.DEV) console.error("Ownership verification failed:", ownerCheckErr);
      return new Response(JSON.stringify({ error: "Access denied" }), { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    // Check if user can add team member (plan verification)
    const { data: canAdd, error: planCheckErr } = await userClient.rpc("can_add_team_member", {
      account_uuid: accountId,
      user_uuid: authUser.id
    });

    if (planCheckErr) {
      if (import.meta.env.DEV) console.error("Plan check failed:", planCheckErr);
      return new Response(JSON.stringify({ error: "Unable to verify subscription plan" }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    if (!canAdd) {
      return new Response(JSON.stringify({ error: "Your subscription plan does not allow adding team members or member limit reached" }), { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    // Check existing username
    const { data: existingUsername } = await userClient
      .from("usernames")
      .select("username")
      .eq("account_id", accountId)
      .eq("username", phoneNumber)
      .maybeSingle();

    if (existingUsername) {
      return new Response(JSON.stringify({ error: "This phone number is already added to this account" }), { status: 409, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    const adminClient = createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

    // Check existing profile by phone
    const { data: existingProfile, error: profileLookupErr } = await adminClient
      .from("profiles")
      .select("user_id")
      .eq("phone", phoneNumber)
      .maybeSingle();

    if (profileLookupErr && import.meta.env.DEV) {
      console.log("Profile lookup error:", profileLookupErr);
    }

    // If OTP token is provided and not skipping verification, verify it first
    if (otpToken && !skipOtpVerification) {
      try {
        const { error: verifyErr } = await adminClient.auth.verifyOtp({
          phone: phoneNumber,
          token: otpToken,
          type: 'sms'
        });
        
        if (verifyErr) {
          return new Response(JSON.stringify({ error: "Invalid OTP code" }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
        }
      } catch (otpErr: any) {
        if (import.meta.env.DEV) console.error("OTP verification error:", otpErr);
        return new Response(JSON.stringify({ error: "OTP verification failed" }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
      }
    }

    // Determine target user
    let newUserId = existingProfile?.user_id as string | undefined;

    if (!newUserId) {
      // Generate secure password (24 characters with full character diversity)
      const tempPassword = generateSecurePassword(24);
      
      const { data: created, error: createErr } = await adminClient.auth.admin.createUser({
        phone: phoneNumber,
        password: tempPassword,
        phone_confirm: true,
        user_metadata: { username: phoneNumber, name: String(name).trim() },
      });
      
      if (createErr || !created?.user) {
        if (import.meta.env.DEV) console.error("Failed to create auth user:", createErr);
        
        // If phone already exists, look up the existing profile
        if (createErr?.status === 422 || createErr?.message?.toLowerCase().includes("phone") || createErr?.message?.toLowerCase().includes("exists")) {
          const { data: prof2 } = await adminClient
            .from("profiles")
            .select("user_id")
            .eq("phone", phoneNumber)
            .maybeSingle();
          
          if (!prof2) {
            return new Response(JSON.stringify({ error: "Phone number already registered" }), { status: 409, headers: { "Content-Type": "application/json", ...corsHeaders } });
          }
          newUserId = prof2.user_id as string;
        } else {
          return new Response(JSON.stringify({ error: "Failed to create user account" }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
        }
      } else {
        newUserId = created.user.id;
      }
    }

    // Ensure profile exists
    const { error: profileUpsertErr } = await adminClient
      .from("profiles")
      .upsert({ user_id: newUserId as string, name: String(name).trim(), phone: phoneNumber }, { onConflict: "user_id" });
    
    if (profileUpsertErr) {
      if (import.meta.env.DEV) console.error("Failed to upsert user profile:", profileUpsertErr);
      return new Response(JSON.stringify({ error: "Failed to update user profile" }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    // Ensure membership exists
    const { data: existingMem } = await userClient
      .from("account_members")
      .select("id, role")
      .eq("account_id", accountId)
      .eq("user_id", newUserId as string)
      .maybeSingle();

    if (existingMem) {
      if ((existingMem as any).role !== role) {
        const { error: updErr } = await userClient
          .from("account_members")
          .update({ role })
          .eq("account_id", accountId)
          .eq("user_id", newUserId as string);
        
        if (updErr) {
          return new Response(JSON.stringify({ error: "Failed to update member role" }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
        }
      }
    } else {
      const { error: memErr } = await userClient
        .from("account_members")
        .insert({ account_id: accountId, user_id: newUserId as string, role });
      
      if (memErr) {
        return new Response(JSON.stringify({ error: "Failed to add team member" }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
      }
    }

    // Save username mapping
    const { error: mapErr } = await userClient
      .from("usernames")
      .insert({ user_id: newUserId, account_id: accountId, username: phoneNumber });
    
    if (mapErr) {
      return new Response(JSON.stringify({ error: "Failed to create username mapping" }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    // Log audit event
    const clientIp = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    try {
      await adminClient.rpc("log_audit_event", {
        p_user_id: authUser.id,
        p_account_id: accountId,
        p_action: "team_member_added",
        p_details: { added_user_id: newUserId, username: phoneNumber, role },
        p_ip_address: clientIp
      });
    } catch (auditErr) {
      if (import.meta.env.DEV) console.error("Audit log failed:", auditErr);
    }

    // Send OTP for login (never return password in response)
    if (!skipOtpVerification) {
      try {
        await adminClient.auth.signInWithOtp({
          phone: phoneNumber,
          options: { shouldCreateUser: false }
        });
      } catch (otpErr) {
        if (import.meta.env.DEV) console.log("Failed to send setup OTP:", otpErr);
      }
    }

    const setupMessage = skipOtpVerification 
      ? "Team member created successfully. They can log in using their phone number."
      : "Team member created successfully. They will receive an OTP for initial login setup.";

    return new Response(JSON.stringify({ 
      ok: true, 
      userId: newUserId, 
      username: phoneNumber, 
      name: String(name).trim(), 
      role,
      message: setupMessage
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (err: any) {
    if (import.meta.env.DEV) console.error("team-create-user error:", err);
    return new Response(JSON.stringify({ error: "An error occurred while processing your request" }), { 
      status: 500, 
      headers: { "Content-Type": "application/json", ...corsHeaders } 
    });
  }
});
