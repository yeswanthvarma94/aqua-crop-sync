
import { supabase } from "@/integrations/supabase/client";
import { getActiveAccountId } from "@/lib/account";

// Centralized approvals queue utilities backed by Supabase

export type ChangeType =
  | "materials/log"
  | "feeding/log"
  | "expenses/add"
  | "stocks/upsert"
  | "tanks/create"
  | "tanks/start_crop"
  | "tanks/end_crop"
  | "locations/create"
  | "locations/update"
  | "locations/delete";

export interface PendingChange<T = any> {
  id: string;
  type: ChangeType;
  description: string;
  payload: T;
  createdAt: string; // ISO
  status?: "pending" | "approved" | "rejected";
  createdBy?: string | null;
}

// Load pending changes from Supabase for the active account
export const loadPendingChanges = async (): Promise<PendingChange[]> => {
  const accountId = getActiveAccountId();
  if (!accountId) return [];
  const { data, error } = await supabase
    .from("pending_changes")
    .select("id, type, payload, created_at, status, created_by")
    .eq("account_id", accountId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });
  if (error) {
    console.error("loadPendingChanges:", error);
    return [];
  }
  return ((data as any[]) || []).map((row: any) => ({
    id: row.id,
    type: row.type,
    description: "", // description not stored; optional
    payload: row.payload,
    createdAt: row.created_at,
    status: row.status,
    createdBy: row.created_by,
  }));
};

// Not used anymore (kept for compatibility in callers that import it)
export const savePendingChanges = (_list: PendingChange[]) => {
  // no-op with Supabase backend
};

export const enqueueChange = async <T = any>(type: ChangeType, payload: T, description: string): Promise<PendingChange<T> | null> => {
  const accountId = getActiveAccountId();
  if (!accountId) {
    console.warn("enqueueChange: no active account");
    return null;
  }
  const { data: userRes } = await supabase.auth.getUser();
  const userId = (userRes as any).user?.id ?? null;

  const toInsert = {
    account_id: accountId,
    type,
    payload,
    status: "pending",
    created_by: userId,
    // store description inside payload to preserve it; Approvals UI uses row text anyway
    // alternatively a dedicated column can be added later
  };

  const { data, error } = await supabase
    .from("pending_changes")
    .insert([toInsert])
    .select("id, created_at")
    .single();

  if (error || !data) {
    console.error("enqueueChange:", error);
    return null;
  }

  return {
    id: (data as any).id,
    type,
    description,
    payload,
    createdAt: (data as any).created_at,
    status: "pending",
    createdBy: userId,
  };
};
