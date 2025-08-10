
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

/**
 * Ensures the current user has an account and is a member.
 * - If ACTIVE_ACCOUNT_KEY present and user is a member, returns it.
 * - Else tries to find any account membership and sets it active.
 * - Else creates a default account with user as owner and sets it active.
 */
export const ensureDefaultAccount = async (userId: string): Promise<string> => {
  // If an active account is already set and user is member, use it
  const existing = getActiveAccountId();
  if (existing) {
    const { data: ownedExisting } = await supabase
      .from("accounts")
      .select("id")
      .eq("id", existing)
      .eq("owner_id", userId)
      .maybeSingle();
    if (ownedExisting) return existing;

    const { data: m } = await supabase
      .from("account_members")
      .select("id")
      .eq("account_id", existing)
      .eq("user_id", userId)
      .maybeSingle();
    if (m) return existing;
  }

  // Prefer any account owned by this user
  const { data: ownedAccounts, error: ownErr } = await supabase
    .from("accounts")
    .select("id")
    .eq("owner_id", userId)
    .limit(1);
  if (!ownErr && ownedAccounts && ownedAccounts.length > 0) {
    const accountId = (ownedAccounts[0] as any).id as string;
    setActiveAccountId(accountId);
    return accountId;
  }

  // Otherwise find any memberships for this user
  const { data: memberships, error: memErr } = await supabase
    .from("account_members")
    .select("account_id")
    .eq("user_id", userId)
    .limit(1);
  if (!memErr && memberships && memberships.length > 0) {
    const accountId = (memberships[0] as any).account_id as string;
    setActiveAccountId(accountId);
    return accountId;
  }

  // Create default account with user as owner
  const defaultName = "My Farm";
  const { data: created, error: createErr } = await supabase
    .from("accounts")
    .insert([{ name: defaultName, owner_id: userId }])
    .select("id")
    .single();
  if (createErr || !created?.id) throw createErr || new Error("Unable to create default account");
  const accountId = (created as any)!.id as string;
  // Ensure the owner also exists in account_members with explicit 'owner' role
  try {
    await supabase.from("account_members").insert([
      { account_id: accountId, user_id: userId, role: "owner" as any },
    ]);
  } catch {
    // no-op: owner permissions derive from accounts.owner_id regardless
  }
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
