// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateUserReq {
  accountId: string;
  username: string; // Phone number
  role: "manager" | "partner";
  name: string; // Full name of the user
  otpToken?: string; // OTP token for verification
  skipOtpVerification?: boolean; // Skip OTP verification if signups not allowed
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body: CreateUserReq = await req.json();
    const { accountId, username, role, name, otpToken, skipOtpVerification = true } = body || {} as any;

    if (!accountId || !username || !role || !name) {
      return new Response(JSON.stringify({ error: "Missing fields" }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    // Validate phone number format for username
    const phoneNumber = String(username).trim();
    if (!/^[+]?[1-9]\d{7,14}$/.test(phoneNumber.replace(/[\s\-]/g, ''))) {
      return new Response(JSON.stringify({ error: "Username must be a valid phone number" }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }
    
    // Validate name
    if (!name || String(name).trim().length < 2) {
      return new Response(JSON.stringify({ error: "Name must be at least 2 characters" }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }
    
    if (!["manager", "partner"].includes(role)) {
      return new Response(JSON.stringify({ error: "Role must be manager or partner" }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!serviceKey) {
      return new Response(JSON.stringify({ error: "Missing service role key" }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    // User-scoped client (to evaluate RLS and ensure caller is the owner)
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: req.headers.get("Authorization")! } },
    });

    // Service client for admin auth operations
    const adminClient = createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

    // Verify caller is owner of account
    const { data: ownerCheck, error: ownerErr } = await userClient
      .from("accounts")
      .select("id")
      .eq("id", accountId)
      .limit(1)
      .maybeSingle();
    if (ownerErr || !ownerCheck) {
      return new Response(JSON.stringify({ error: "Only owner can add team members" }), { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    // Check if the same phone is already used as a username in this account
    const { data: existingUsername } = await userClient
      .from("usernames")
      .select("username")
      .eq("account_id", accountId)
      .eq("username", phoneNumber)
      .maybeSingle();
    if (existingUsername) {
      return new Response(JSON.stringify({ error: "This phone number is already added to this account" }), { status: 409, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    // See if a user already exists with this phone (via profiles; service role bypasses RLS)
    const { data: existingProfile, error: profileLookupErr } = await adminClient
      .from("profiles")
      .select("user_id")
      .eq("phone", phoneNumber)
      .maybeSingle();
    if (profileLookupErr) {
      console.log("Profile lookup error:", profileLookupErr);
    }

    // Note: We intentionally do not query auth.users via PostgREST.
    // If a user with this phone exists, we'll detect it below when creating the auth user
    // and then fall back to the existing profile to get the user_id.

    // Check current member count (trigger also enforces)
    const { count } = await userClient
      .from("account_members")
      .select("user_id", { count: "exact", head: true })
      .eq("account_id", accountId);
    if ((count ?? 0) >= 5) {
      return new Response(JSON.stringify({ error: "Member limit reached (max 5 including owner)" }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }


    // If OTP token is provided and not skipping verification, verify it first
    if (otpToken && !skipOtpVerification) {
      try {
        const { data: verifyData, error: verifyErr } = await adminClient.auth.verifyOtp({
          phone: phoneNumber,
          token: otpToken,
          type: 'sms'
        });
        
        if (verifyErr) {
          return new Response(JSON.stringify({ error: "Invalid OTP: " + verifyErr.message }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
        }
      } catch (otpErr: any) {
        return new Response(JSON.stringify({ error: "OTP verification failed: " + otpErr.message }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
      }
    }

    // Determine target user: use existing profile by phone if available; otherwise create a new auth user
    let tempPassword: string | undefined;
    let newUserId = existingProfile?.user_id as string | undefined;

    if (!newUserId) {
      tempPassword = crypto.randomUUID().substring(0, 12) + "!Aa1";
      const { data: created, error: createErr } = await adminClient.auth.admin.createUser({
        phone: phoneNumber,
        password: tempPassword,
        phone_confirm: true,
        user_metadata: { username: phoneNumber, name: String(name).trim() },
      });
      if (createErr || !created?.user) {
        console.error("Failed to create auth user:", createErr);
        // If phone already exists, look up the existing profile and reuse it
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
          tempPassword = undefined; // existing user; no temp password generated
        } else {
          return new Response(JSON.stringify({ error: createErr?.message || "Failed to create auth user" }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
        }
      } else {
        newUserId = created.user.id;
      }
    }

    // Ensure a profile exists and update basic fields
    const { error: profileUpsertErr } = await adminClient
      .from("profiles")
      .upsert({ user_id: newUserId as string, name: String(name).trim(), phone: phoneNumber }, { onConflict: "user_id" });
    if (profileUpsertErr) {
      console.error("Failed to upsert user profile:", profileUpsertErr);
      return new Response(JSON.stringify({ error: "Failed to update user profile: " + profileUpsertErr.message }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    // Ensure membership exists (update role if already a member)
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
          return new Response(JSON.stringify({ error: updErr.message }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
        }
      }
    } else {
      const { error: memErr } = await userClient
        .from("account_members")
        .insert({ account_id: accountId, user_id: newUserId as string, role });
      if (memErr) {
        return new Response(JSON.stringify({ error: memErr.message }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
      }
    }

    // Save username mapping
    const { error: mapErr } = await userClient
      .from("usernames")
      .insert({ user_id: newUserId, account_id: accountId, username: phoneNumber });
    if (mapErr) {
      return new Response(JSON.stringify({ error: mapErr.message }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    // Send OTP to the new user for initial login setup (if not skipping verification)
    if (!skipOtpVerification) {
      try {
        await adminClient.auth.signInWithOtp({
          phone: phoneNumber,
          options: {
            shouldCreateUser: false
          }
        });
      } catch (otpErr) {
        // Don't fail if OTP sending fails, but log it
        console.log("Failed to send setup OTP:", otpErr);
      }
    }

    const setupMessage = skipOtpVerification 
      ? "Team member created successfully with temporary password. They can log in using their phone number."
      : "Team member created successfully. They will receive an OTP for initial login setup.";

    return new Response(JSON.stringify({ 
      ok: true, 
      userId: newUserId, 
      username: phoneNumber, 
      name: String(name).trim(), 
      role,
      tempPassword: skipOtpVerification ? tempPassword : undefined,
      message: setupMessage
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (err: any) {
    console.error("team-create-user error", err);
    return new Response(JSON.stringify({ error: err?.message || "Unexpected error" }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
  }
});
