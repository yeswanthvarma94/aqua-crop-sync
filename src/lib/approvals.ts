
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

// Apply a change immediately (used when current user is owner)
const applyImmediateChange = async (type: ChangeType, payload: any, accountId: string | null) => {
  const acc = accountId || getActiveAccountId();
  if (!acc) throw new Error("No active account");

  // Minimal helpers for feeding local mirror
  const feedingKey = (locationId: string, tankId: string, dateKey: string) => `feeding:${locationId}:${tankId}:${dateKey}`;
  const saveFeedingLocal = (locationId: string, tankId: string, dateKey: string, list: any[]) =>
    localStorage.setItem(feedingKey(locationId, tankId, dateKey), JSON.stringify(list));
  const loadFeedingLocal = (locationId: string, tankId: string, dateKey: string) => {
    try { const raw = localStorage.getItem(feedingKey(locationId, tankId, dateKey)); return raw ? JSON.parse(raw) : []; } catch { return []; }
  };

  switch (type) {
    case "materials/log": {
      const { locationId, tankId, dateKey, entry, stockId, quantity } = payload;
      const datePart = (dateKey || new Date().toISOString().slice(0, 10)).slice(0, 10);
      const timePart = ((entry?.time as string) || "00:00").padStart(5, "0");
      const loggedAt = new Date(`${datePart}T${timePart}:00.000Z`).toISOString();

      await supabase.from("material_logs").insert([
        {
          account_id: acc,
          location_id: locationId || null,
          stock_id: stockId || null,
          tank_id: tankId || null,
          quantity: Number(quantity || 0),
          note: entry?.notes || null,
          logged_at: loggedAt,
        },
      ]);

      if (stockId) {
        const { data: s } = await supabase.from("stocks").select("quantity").eq("id", stockId).maybeSingle();
        const currentQty = Number((s as any)?.quantity || 0);
        await supabase
          .from("stocks")
          .update({ quantity: Math.max(0, currentQty - Number(quantity || 0)) })
          .eq("id", stockId);
      }
      break;
    }
    case "feeding/log": {
      const { locationId, tankId, dateKey, entry, stockId, quantity } = payload;
      const existing = loadFeedingLocal(locationId, tankId, dateKey);
      existing.push(entry);
      saveFeedingLocal(locationId, tankId, dateKey, existing);

      const datePart = (dateKey || new Date().toISOString().slice(0, 10)).slice(0, 10);
      const timePart = ((entry?.time as string) || "00:00").padStart(5, "0");
      const loggedAt = new Date(`${datePart}T${timePart}:00.000Z`).toISOString();

      await supabase.from("material_logs").insert([
        {
          account_id: acc,
          location_id: locationId || null,
          stock_id: stockId || null,
          tank_id: tankId || null,
          quantity: Number(quantity || 0),
          note: entry?.notes || null,
          logged_at: loggedAt,
        },
      ]);

      if (stockId) {
        const { data: s2 } = await supabase.from("stocks").select("quantity").eq("id", stockId).maybeSingle();
        const currentQty2 = Number((s2 as any)?.quantity || 0);
        await supabase
          .from("stocks")
          .update({ quantity: Math.max(0, currentQty2 - Number(quantity || 0)) })
          .eq("id", stockId);
      }
      break;
    }
    case "expenses/add": {
      const { locationId, tankId, entry } = payload;
      const incurredAt = (entry?.date || entry?.dateKey || new Date().toISOString().slice(0, 10)).slice(0, 10);
      await supabase.from("expenses").insert([
        {
          account_id: acc,
          location_id: locationId || null,
          tank_id: tankId || null,
          category: entry?.category || null,
          name: entry?.name || null,
          notes: entry?.notes || null,
          description: entry?.name || entry?.category || 'Expense',
          amount: Number(entry?.amount || 0),
          incurred_at: incurredAt,
        },
      ]);
      break;
    }
    case "stocks/upsert": {
      const { locationId, name, unit, quantity, category, pricePerUnit, minStock, expiryISO, notes } = payload;
      const { data: existing } = await supabase
        .from("stocks")
        .select("id, quantity, total_amount")
        .eq("account_id", acc)
        .eq("location_id", locationId)
        .eq("name", name)
        .eq("unit", unit)
        .maybeSingle();

      const qty = Number(quantity || 0);
      const ppu = Number(pricePerUnit || 0);
      const incrAmount = qty * ppu;

      if (existing?.id) {
        await supabase
          .from("stocks")
          .update({
            quantity: Math.max(0, Number((existing as any).quantity || 0) + qty),
            price_per_unit: ppu,
            min_stock: Number(minStock || 0),
            expiry_date: expiryISO ? new Date(expiryISO).toISOString().slice(0, 10) : null,
            notes: notes || null,
            total_amount: Number((existing as any).total_amount || 0) + incrAmount,
          })
          .eq("id", (existing as any).id);
      } else {
        await supabase.from("stocks").insert([
          {
            account_id: acc,
            location_id: locationId || null,
            name,
            category: category || null,
            unit,
            quantity: Math.max(0, qty),
            price_per_unit: ppu,
            min_stock: Number(minStock || 0),
            expiry_date: expiryISO ? new Date(expiryISO).toISOString().slice(0, 10) : null,
            notes: notes || null,
            total_amount: incrAmount,
          },
        ]);
      }
      break;
    }
    case "tanks/create": {
      const { tank } = payload;
      await supabase.from("tanks").insert([{
        id: tank.id,
        account_id: tank.account_id || acc,
        location_id: tank.locationId,
        name: tank.name,
        type: tank.type || null,
      }]);
      break;
    }
    case "tanks/start_crop": {
      const { tankId, iso } = payload;
      await supabase.from("tank_crops").insert([{
        account_id: acc,
        tank_id: tankId,
        seed_date: new Date(iso).toISOString().slice(0, 10),
        end_date: null,
      }]);
      break;
    }
    case "tanks/end_crop": {
      const { tankId, iso } = payload;
      await supabase
        .from("tank_crops")
        .update({ end_date: new Date(iso).toISOString().slice(0, 10) })
        .eq("tank_id", tankId)
        .is("end_date", null);
      break;
    }
    case "locations/create": {
      const { location } = payload;
      await supabase.from("locations").insert([{
        id: location.id,
        account_id: location.account_id || acc,
        name: location.name,
        address: location.address || null,
      }]);
      break;
    }
    case "locations/update": {
      const { id, updates } = payload;
      await supabase.from("locations").update({
        name: updates?.name ?? undefined,
        address: updates?.address ?? undefined,
      }).eq("id", id);
      break;
    }
    case "locations/delete": {
      const { id } = payload;
      await supabase.from("locations").delete().eq("id", id);
      break;
    }
    default:
      break;
  }
};

export const enqueueChange = async <T = any>(type: ChangeType, payload: T, description: string): Promise<PendingChange<T> | null> => {
  const accountId = getActiveAccountId();
  if (!accountId) {
    console.warn("enqueueChange: no active account");
    return null;
  }
  try {
    await applyImmediateChange(type, payload, accountId);
    return {
      id: crypto.randomUUID(),
      type,
      description,
      payload,
      createdAt: new Date().toISOString(),
      status: "approved",
      createdBy: null,
    } as any;
  } catch (e) {
    console.error("enqueueChange immediate apply failed:", e);
    return null;
  }
};
