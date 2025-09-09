import Dexie, { Table } from 'dexie';

// Sync status for each record
export type SyncStatus = 'synced' | 'queued' | 'error' | 'conflict';

// Base interface for all offline records
export interface OfflineRecord {
  id: string;
  syncStatus: SyncStatus;
  lastModified: number;
  syncError?: string;
}

// Offline data interfaces
export interface OfflineFarm extends OfflineRecord {
  name: string;
  address?: string;
  account_id: string;
  deleted_at?: string;
}

export interface OfflineTank extends OfflineRecord {
  name: string;
  farm_id: string;
  account_id: string;
  type?: string;
  status: string;
  area?: number;
  deleted_at?: string;
}

export interface OfflineStock extends OfflineRecord {
  name: string;
  farm_id?: string;
  account_id: string;
  quantity: number;
  min_stock?: number;
  price_per_unit?: number;
  unit?: string;
  category?: string;
  expiry_date?: string;
  notes?: string;
}

export interface OfflineFeedingLog extends OfflineRecord {
  tank_id?: string;
  farm_id?: string;
  account_id: string;
  stock_id?: string;
  quantity: number;
  fed_at: string;
  schedule?: string;
  notes?: string;
  price_per_unit?: number;
}

export interface OfflineExpense extends OfflineRecord {
  name?: string;
  description: string;
  amount: number;
  category?: string;
  farm_id?: string;
  tank_id?: string;
  account_id: string;
  incurred_at: string;
  notes?: string;
}

export interface OfflineMaterialLog extends OfflineRecord {
  quantity: number;
  account_id: string;
  farm_id?: string;
  tank_id?: string;
  stock_id?: string;
  price_per_unit?: number;
  logged_at: string;
  note?: string;
}

// Sync queue item for pending operations
export interface SyncQueueItem {
  id: string;
  operation: 'create' | 'update' | 'delete';
  table: string;
  data: any;
  originalId?: string;
  createdAt: number;
  retryCount: number;
  error?: string;
}

export class OfflineDatabase extends Dexie {
  farms!: Table<OfflineFarm>;
  tanks!: Table<OfflineTank>;
  stocks!: Table<OfflineStock>;
  feedingLogs!: Table<OfflineFeedingLog>;
  expenses!: Table<OfflineExpense>;
  materialLogs!: Table<OfflineMaterialLog>;
  syncQueue!: Table<SyncQueueItem>;

  constructor() {
    super('AquaLedgerOffline');
    
    this.version(1).stores({
      farms: 'id, account_id, name, syncStatus, lastModified',
      tanks: 'id, account_id, farm_id, name, syncStatus, lastModified',
      stocks: 'id, account_id, farm_id, name, syncStatus, lastModified',
      feedingLogs: 'id, account_id, tank_id, farm_id, fed_at, syncStatus, lastModified',
      expenses: 'id, account_id, farm_id, tank_id, incurred_at, syncStatus, lastModified',
      materialLogs: 'id, account_id, farm_id, tank_id, logged_at, syncStatus, lastModified',
      syncQueue: 'id, table, operation, createdAt, retryCount'
    });
  }
}

export const db = new OfflineDatabase();