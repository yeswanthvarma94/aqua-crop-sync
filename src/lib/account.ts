
import { supabase } from "@/integrations/supabase/client";

export const ACTIVE_ACCOUNT_KEY = "activeAccountId";

export const getActiveAccountId = (): string | null => {
  try {
    return localStorage.getItem(ACTIVE_ACCOUNT_KEY);
  } catch {
    return null;
  }
};

export const setActiveAccountId = (accountId: string) => {
  try {
    localStorage.setItem(ACTIVE_ACCOUNT_KEY, accountId);
  } catch {
    // no-op
  }
};

export const clearActiveAccountId = () => {
  try {
    localStorage.removeItem(ACTIVE_ACCOUNT_KEY);
  } catch {
    // no-op
  }
};

/**
 * Ensures the current user has an account and is a member.
 * - If ACTIVE_ACCOUNT_KEY present and user is a member, returns it.
 * - Else tries to find any account membership and sets it active.
 * - Else creates a default account with user as owner and sets it active.
 */
export const ensureDefaultAccount = async (userId: string): Promise<string> => {
  console.log('ensureDefaultAccount called for user:', userId);
  
  // If an active account is already set and user is member, use it
  const existing = getActiveAccountId();
  console.log('Existing active account ID:', existing);
  
  if (existing) {
    const { data: ownedExisting } = await supabase
      .from("accounts")
      .select("id")
      .eq("id", existing)
      .eq("owner_id", userId)
      .maybeSingle();
    
    console.log('Owned existing check result:', ownedExisting);
    if (ownedExisting) return existing;

    const { data: m } = await supabase
      .from("account_members")
      .select("id")
      .eq("account_id", existing)
      .eq("user_id", userId)
      .maybeSingle();
    
    console.log('Member check result:', m);
    if (m) return existing;

    // Not owner or member of stored account; clear it before proceeding
    console.log('Clearing invalid active account ID');
    clearActiveAccountId();
  }

  // Prefer any account owned by this user
  console.log('Looking for accounts owned by user:', userId);
  const { data: ownedAccounts, error: ownErr } = await supabase
    .from("accounts")
    .select("id")
    .eq("owner_id", userId)
    .limit(1);
  
  console.log('Owned accounts query result:', ownedAccounts, 'Error:', ownErr);
  if (!ownErr && ownedAccounts && ownedAccounts.length > 0) {
    const accountId = (ownedAccounts[0] as any).id as string;
    console.log('Found owned account, setting as active:', accountId);
    setActiveAccountId(accountId);
    return accountId;
  }

  // Otherwise find any memberships for this user
  console.log('Looking for memberships for user:', userId);
  const { data: memberships, error: memErr } = await supabase
    .from("account_members")
    .select("account_id")
    .eq("user_id", userId)
    .limit(1);
  
  console.log('Memberships query result:', memberships, 'Error:', memErr);
  if (!memErr && memberships && memberships.length > 0) {
    const accountId = (memberships[0] as any).account_id as string;
    console.log('Found membership, setting as active:', accountId);
    setActiveAccountId(accountId);
    return accountId;
  }

  // Create default account with user as owner
  console.log('Creating default account for user:', userId);
  const defaultName = "My Farm";
  const { data: created, error: createErr } = await supabase
    .from("accounts")
    .insert([{ name: defaultName, owner_id: userId }])
    .select("id")
    .single();
  
  console.log('Account creation result:', created, 'Error:', createErr);
  if (createErr || !created?.id) throw createErr || new Error("Unable to create default account");
  const accountId = (created as any)!.id as string;
  
  // Ensure the owner also exists in account_members with explicit 'owner' role
  try {
    console.log('Adding owner to account_members:', accountId, userId);
    await supabase.from("account_members").insert([
      { account_id: accountId, user_id: userId, role: "owner" as any },
    ]);
  } catch {
    // no-op: owner permissions derive from accounts.owner_id regardless
    console.log('Failed to add owner to account_members, but continuing');
  }
  
  console.log('Setting new account as active:', accountId);
  setActiveAccountId(accountId);
  return accountId;
};

/**
 * Returns membership role for a user within an account.
 */
export const getMembershipRole = async (
  accountId: string,
  userId: string
): Promise<"owner" | "manager" | "partner" | null> => {
  // Owner is in accounts.owner_id
  const { data: acc } = await supabase
    .from("accounts")
    .select("owner_id")
    .eq("id", accountId)
    .maybeSingle();
  if (acc && (acc as any).owner_id === userId) return "owner";

  const { data: member } = await supabase
    .from("account_members")
    .select("role")
    .eq("account_id", accountId)
    .eq("user_id", userId)
    .maybeSingle();

  return ((member as any)?.role as any) ?? null;
};

