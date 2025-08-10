// Centralized approvals queue utilities
// Data is stored in localStorage under the key "pendingChanges"

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
}

const STORAGE_KEY = "pendingChanges";

export const loadPendingChanges = (): PendingChange[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PendingChange[]) : [];
  } catch {
    return [];
  }
};

export const savePendingChanges = (list: PendingChange[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
};

export const enqueueChange = <T = any>(type: ChangeType, payload: T, description: string): PendingChange<T> => {
  const change: PendingChange<T> = {
    id: crypto.randomUUID(),
    type,
    description,
    payload,
    createdAt: new Date().toISOString(),
  };
  const list = loadPendingChanges();
  list.unshift(change);
  savePendingChanges(list);
  return change;
};
