// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ResetReq {
  accountId: string;
  username: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { accountId, username }: ResetReq = await req.json();
    if (!accountId || !username) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    const uname = String(username).trim().toLowerCase();
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!serviceKey) {
      console.error("Missing service role key");
      return new Response(JSON.stringify({ error: "Configuration error" }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: req.headers.get("Authorization")! } },
    });

    // Verify authentication
    const { data: { user: authUser }, error: authError } = await userClient.auth.getUser();
    if (authError || !authUser) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    // Verify ownership using secure function
    const { data: isOwner, error: ownerCheckErr } = await userClient.rpc("verify_account_owner", {
      account_uuid: accountId,
      user_uuid: authUser.id
    });

    if (ownerCheckErr || !isOwner) {
      console.error("Ownership verification failed");
      return new Response(JSON.stringify({ error: "Access denied" }), { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    // Find mapping
    const { data: mapping, error: mapErr } = await userClient
      .from("usernames")
      .select("user_id, account_id, username")
      .eq("account_id", accountId)
      .eq("username", uname)
      .maybeSingle();
    
    if (mapErr || !mapping) {
      console.error("User mapping not found");
      return new Response(JSON.stringify({ error: "User not found" }), { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    const adminClient = createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
    
    // Send password reset OTP
    const { error: otpErr } = await adminClient.auth.signInWithOtp({
      phone: username,
      options: {
        shouldCreateUser: false
      }
    });
    
    if (otpErr) {
      console.error("Failed to send OTP");
      return new Response(JSON.stringify({ error: "Failed to send password reset code" }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    // Log audit event
    const clientIp = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    await adminClient.rpc("log_audit_event", {
      p_user_id: authUser.id,
      p_account_id: accountId,
      p_action: "password_reset_requested",
      p_details: { target_user_id: mapping.user_id, username: uname },
      p_ip_address: clientIp
    });

    return new Response(JSON.stringify({ 
      ok: true, 
      message: "Password reset code sent successfully" 
    }), { 
      status: 200, 
      headers: { "Content-Type": "application/json", ...corsHeaders } 
    });
  } catch (err: any) {
    console.error("team-reset-password error:", err);
    return new Response(JSON.stringify({ error: "An error occurred while processing your request" }), { 
      status: 500, 
      headers: { "Content-Type": "application/json", ...corsHeaders } 
    });
  }
});
