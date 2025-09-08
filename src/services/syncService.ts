import { supabase } from '@/integrations/supabase/client';
import { db, SyncQueueItem, OfflineRecord } from '@/lib/offlineStorage';
import { toast } from '@/hooks/use-toast';

export class SyncService {
  private isRunning = false;
  private retryDelay = 1000; // Start with 1 second
  private maxRetries = 3;

  async addToQueue(
    operation: 'create' | 'update' | 'delete',
    table: string,
    data: any,
    originalId?: string
  ): Promise<void> {
    const queueItem: SyncQueueItem = {
      id: crypto.randomUUID(),
      operation,
      table,
      data,
      originalId,
      createdAt: Date.now(),
      retryCount: 0
    };

    await db.syncQueue.add(queueItem);
  }

  async processQueue(): Promise<void> {
    if (this.isRunning || !navigator.onLine) return;
    
    this.isRunning = true;
    
    try {
      const queueItems = await db.syncQueue
        .where('retryCount')
        .below(this.maxRetries)
        .toArray();

      if (queueItems.length === 0) {
        this.isRunning = false;
        return;
      }

      console.log(`Processing ${queueItems.length} sync queue items`);

      for (const item of queueItems) {
        try {
          await this.processQueueItem(item);
          await db.syncQueue.delete(item.id);
        } catch (error) {
          console.error('Failed to process queue item:', error);
          await this.handleQueueItemError(item, error as Error);
        }
      }
    } catch (error) {
      console.error('Sync queue processing failed:', error);
    } finally {
      this.isRunning = false;
    }
  }

  private async processQueueItem(item: SyncQueueItem): Promise<void> {
    const { operation, table, data } = item;

    switch (operation) {
      case 'create':
        await this.handleCreate(table, data);
        break;
      case 'update':
        await this.handleUpdate(table, data);
        break;
      case 'delete':
        await this.handleDelete(table, data.id);
        break;
    }
  }

  private async handleCreate(table: string, data: any): Promise<void> {
    const { syncStatus, lastModified, ...cleanData } = data;
    
    const { data: result, error } = await supabase
      .from(table)
      .insert(cleanData)
      .select()
      .single();

    if (error) throw error;

    // Update local record with server ID and mark as synced
    const localTable = this.getLocalTable(table);
    await localTable.update(data.id, {
      id: result.id, // Update with server ID
      syncStatus: 'synced' as const,
      lastModified: Date.now()
    });
  }

  private async handleUpdate(table: string, data: any): Promise<void> {
    const { syncStatus, lastModified, ...cleanData } = data;
    
    const { error } = await supabase
      .from(table)
      .update(cleanData)
      .eq('id', data.id);

    if (error) throw error;

    // Update local record sync status
    const localTable = this.getLocalTable(table);
    await localTable.update(data.id, {
      syncStatus: 'synced' as const,
      lastModified: Date.now()
    });
  }

  private async handleDelete(table: string, id: string): Promise<void> {
    const { error } = await supabase
      .from(table)
      .delete()
      .eq('id', id);

    if (error && error.code !== 'PGRST116') { // Ignore if already deleted
      throw error;
    }

    // Remove from local storage
    const localTable = this.getLocalTable(table);
    await localTable.delete(id);
  }

  private async handleQueueItemError(item: SyncQueueItem, error: Error): Promise<void> {
    const newRetryCount = item.retryCount + 1;
    
    if (newRetryCount >= this.maxRetries) {
      // Mark local record as error
      const localTable = this.getLocalTable(item.table);
      if (item.data.id) {
        await localTable.update(item.data.id, {
          syncStatus: 'error' as const,
          syncError: error.message
        });
      }
      
      await db.syncQueue.delete(item.id);
      
      toast({
        title: "Sync Error",
        description: `Failed to sync ${item.table} after ${this.maxRetries} attempts`,
        variant: "destructive"
      });
    } else {
      // Update retry count and delay
      await db.syncQueue.update(item.id, {
        retryCount: newRetryCount,
        error: error.message
      });
    }
  }

  private getLocalTable(tableName: string) {
    switch (tableName) {
      case 'farms':
        return db.farms;
      case 'tanks':
        return db.tanks;
      case 'stocks':
        return db.stocks;
      case 'feeding_logs':
        return db.feedingLogs;
      case 'expenses':
        return db.expenses;
      case 'material_logs':
        return db.materialLogs;
      default:
        throw new Error(`Unknown table: ${tableName}`);
    }
  }

  async downloadUserData(accountId: string): Promise<void> {
    if (!navigator.onLine) {
      throw new Error('Cannot download data while offline');
    }

    try {
      console.log('Downloading user data...');

      // Download farms
      const { data: farms } = await supabase
        .from('farms')
        .select('*')
        .eq('account_id', accountId);

      if (farms) {
        await db.farms.clear();
        const offlineFarms = farms.map(farm => ({
          ...farm,
          syncStatus: 'synced' as const,
          lastModified: Date.now()
        }));
        await db.farms.bulkAdd(offlineFarms);
      }

      // Download tanks
      const { data: tanks } = await supabase
        .from('tanks')
        .select('*')
        .eq('account_id', accountId);

      if (tanks) {
        await db.tanks.clear();
        const offlineTanks = tanks.map(tank => ({
          ...tank,
          syncStatus: 'synced' as const,
          lastModified: Date.now()
        }));
        await db.tanks.bulkAdd(offlineTanks);
      }

      // Download stocks
      const { data: stocks } = await supabase
        .from('stocks')
        .select('*')
        .eq('account_id', accountId);

      if (stocks) {
        await db.stocks.clear();
        const offlineStocks = stocks.map(stock => ({
          ...stock,
          syncStatus: 'synced' as const,
          lastModified: Date.now()
        }));
        await db.stocks.bulkAdd(offlineStocks);
      }

      console.log('User data downloaded successfully');
    } catch (error) {
      console.error('Failed to download user data:', error);
      throw error;
    }
  }

  async getSyncStats() {
    const [queueCount, errorCount] = await Promise.all([
      db.syncQueue.count(),
      db.syncQueue.where('retryCount').aboveOrEqual(this.maxRetries).count()
    ]);

    return {
      pendingSync: queueCount,
      syncErrors: errorCount
    };
  }
}

export const syncService = new SyncService();