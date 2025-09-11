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
      return new Response(JSON.stringify({ error: "Missing fields" }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    const uname = String(username).trim().toLowerCase();
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!serviceKey) {
      return new Response(JSON.stringify({ error: "Missing service role key" }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: req.headers.get("Authorization")! } },
    });

    // Verify caller is owner for the account
    const { data: ownerCheck } = await userClient
      .from("accounts")
      .select("id")
      .eq("id", accountId)
      .limit(1)
      .maybeSingle();
    if (!ownerCheck) {
      return new Response(JSON.stringify({ error: "Only owner can reset passwords" }), { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    // Find mapping
    const { data: mapping, error: mapErr } = await userClient
      .from("usernames")
      .select("user_id, account_id, username")
      .eq("account_id", accountId)
      .eq("username", uname)
      .maybeSingle();
    if (mapErr || !mapping) {
      return new Response(JSON.stringify({ error: "User not found in this account" }), { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    const adminClient = createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
    
    // Send password reset OTP to the user's phone number
    const { error: otpErr } = await adminClient.auth.signInWithOtp({
      phone: username,
      options: {
        shouldCreateUser: false
      }
    });
    
    if (otpErr) {
      return new Response(JSON.stringify({ error: "Failed to send reset OTP: " + otpErr.message }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    return new Response(JSON.stringify({ 
      ok: true, 
      message: `Password reset OTP sent to ${username}` 
    }), { 
      status: 200, 
      headers: { "Content-Type": "application/json", ...corsHeaders } 
    });
  } catch (err: any) {
    console.error("team-reset-password error", err);
    return new Response(JSON.stringify({ error: err?.message || "Unexpected error" }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
  }
});
