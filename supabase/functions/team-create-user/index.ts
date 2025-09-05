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
  password: string;
  role: "manager" | "partner";
  name: string; // Full name of the user
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body: CreateUserReq = await req.json();
    const { accountId, username, password, role, name } = body || {} as any;

    if (!accountId || !username || !password || !role || !name) {
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

    // Enforce unique username (phone number)
    const { data: existing } = await userClient
      .from("usernames")
      .select("username")
      .eq("username", phoneNumber)
      .maybeSingle();
    if (existing) {
      return new Response(JSON.stringify({ error: "Phone number already registered" }), { status: 409, headers: { "Content-Type": "application/json", ...corsHeaders } });
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

    // Create user with phone number
    const { data: created, error: createErr } = await adminClient.auth.admin.createUser({
      phone: phoneNumber,
      password,
      phone_confirm: true,
      user_metadata: { username: phoneNumber, name: String(name).trim() },
    });
    if (createErr || !created.user) {
      return new Response(JSON.stringify({ error: createErr?.message || "Failed to create auth user" }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    const newUserId = created.user.id;

    // Insert profile with name
    const { error: profileErr } = await adminClient
      .from("profiles")
      .insert({ 
        user_id: newUserId, 
        name: String(name).trim(), 
        phone: phoneNumber 
      });
    if (profileErr) {
      return new Response(JSON.stringify({ error: "Failed to create user profile" }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

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
      .insert({ user_id: newUserId, account_id: accountId, username: phoneNumber });
    if (mapErr) {
      return new Response(JSON.stringify({ error: mapErr.message }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    return new Response(JSON.stringify({ ok: true, userId: newUserId, username: phoneNumber, name: String(name).trim(), role }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (err: any) {
    console.error("team-create-user error", err);
    return new Response(JSON.stringify({ error: err?.message || "Unexpected error" }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
  }
});
