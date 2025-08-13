// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateUserReq {
  accountId: string;
  username: string; // simple handle, lowercase letters/numbers/_
  password: string;
  role: "manager" | "partner";
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body: CreateUserReq = await req.json();
    const { accountId, username, password, role } = body || {} as any;

    if (!accountId || !username || !password || !role) {
      return new Response(JSON.stringify({ error: "Missing fields" }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    const uname = String(username).trim().toLowerCase();
    if (!/^([a-z0-9_]{3,30})$/.test(uname)) {
      return new Response(JSON.stringify({ error: "Invalid username format" }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
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

    // Enforce unique username
    const { data: existing } = await userClient
      .from("usernames")
      .select("username")
      .eq("username", uname)
      .maybeSingle();
    if (existing) {
      return new Response(JSON.stringify({ error: "Username already taken" }), { status: 409, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    // Check current member count (trigger also enforces)
    const { count } = await userClient
      .from("account_members")
      .select("user_id", { count: "exact", head: true })
      .eq("account_id", accountId);
    if ((count ?? 0) >= 5) {
      return new Response(JSON.stringify({ error: "Member limit reached (max 5 including owner)" }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    // Service client for admin auth operations
    const adminClient = createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

    const emailAlias = `${uname}@users.aqualedger.local`;
    const { data: created, error: createErr } = await adminClient.auth.admin.createUser({
      email: emailAlias,
      password,
      email_confirm: true,
      user_metadata: { username: uname },
    });
    if (createErr || !created.user) {
      return new Response(JSON.stringify({ error: createErr?.message || "Failed to create auth user" }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    const newUserId = created.user.id;

    // Insert membership (RLS ensures only owner can insert)
    const { error: memErr } = await userClient
      .from("account_members")
      .insert({ account_id: accountId, user_id: newUserId, role });
    if (memErr) {
      return new Response(JSON.stringify({ error: memErr.message }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    // Save username mapping
    const { error: mapErr } = await userClient
      .from("usernames")
      .insert({ user_id: newUserId, account_id: accountId, username: uname });
    if (mapErr) {
      return new Response(JSON.stringify({ error: mapErr.message }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    return new Response(JSON.stringify({ ok: true, userId: newUserId, username: uname, role }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (err: any) {
    console.error("team-create-user error", err);
    return new Response(JSON.stringify({ error: err?.message || "Unexpected error" }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
  }
});
