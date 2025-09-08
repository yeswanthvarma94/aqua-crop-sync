import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, OfflineRecord } from '@/lib/offlineStorage';
import { syncService } from '@/services/syncService';
import { useNetworkStatus } from './useNetworkStatus';
import { useLoading } from '@/contexts/LoadingContext';
import { toast } from '@/hooks/use-toast';

export const useOfflineStorage = <T extends OfflineRecord>(
  tableName: keyof typeof db,
  accountId?: string
) => {
  const { isOnline } = useNetworkStatus();
  const { startLoading, stopLoading } = useLoading();
  const [isInitialized, setIsInitialized] = useState(false);

  const table = db[tableName] as any;

  // Get data from offline storage
  const data = useLiveQuery(
    async () => {
      if (!accountId) return [];
      
      const query = table.where('account_id').equals(accountId);
      return await query.toArray();
    },
    [accountId],
    []
  );

  // Create record offline-first
  const create = async (record: Omit<T, keyof OfflineRecord>) => {
    const id = crypto.randomUUID();
    const timestamp = Date.now();
    
    const offlineRecord: T = {
      ...record,
      id,
      syncStatus: isOnline ? 'queued' : 'queued',
      lastModified: timestamp
    } as T;

    try {
      await table.add(offlineRecord);
      
      // Add to sync queue
      await syncService.addToQueue('create', tableName as string, offlineRecord);
      
      // Trigger immediate sync if online
      if (isOnline) {
        syncService.processQueue();
      }

      toast({
        title: "Success",
        description: `${tableName.slice(0, -1)} saved ${isOnline ? 'and syncing' : 'offline'}`,
      });

      return offlineRecord;
    } catch (error) {
      console.error(`Failed to create ${tableName}:`, error);
      throw error;
    }
  };

  // Update record offline-first
  const update = async (id: string, updates: Partial<T>) => {
    try {
      const updatedRecord = {
        ...updates,
        syncStatus: isOnline ? 'queued' : 'queued',
        lastModified: Date.now()
      } as Partial<T>;

      await table.update(id, updatedRecord);
      
      // Get full record for sync queue
      const fullRecord = await table.get(id);
      await syncService.addToQueue('update', tableName as string, fullRecord);
      
      // Trigger immediate sync if online
      if (isOnline) {
        syncService.processQueue();
      }

      toast({
        title: "Success",
        description: `${tableName.slice(0, -1)} updated ${isOnline ? 'and syncing' : 'offline'}`,
      });

      return updatedRecord;
    } catch (error) {
      console.error(`Failed to update ${tableName}:`, error);
      throw error;
    }
  };

  // Delete record offline-first
  const remove = async (id: string) => {
    try {
      const record = await table.get(id);
      if (!record) throw new Error('Record not found');

      await table.delete(id);
      await syncService.addToQueue('delete', tableName as string, { id });
      
      // Trigger immediate sync if online
      if (isOnline) {
        syncService.processQueue();
      }

      toast({
        title: "Success",
        description: `${tableName.slice(0, -1)} deleted ${isOnline ? 'and syncing' : 'offline'}`,
      });
    } catch (error) {
      console.error(`Failed to delete ${tableName}:`, error);
      throw error;
    }
  };

  // Download fresh data when online
  const refresh = async () => {
    if (!isOnline || !accountId) return;

    startLoading('sync');
    try {
      await syncService.downloadUserData(accountId);
      toast({
        title: "Success",
        description: "Data refreshed from server",
      });
    } catch (error) {
      console.error('Failed to refresh data:', error);
      toast({
        title: "Error",
        description: "Failed to refresh data from server",
        variant: "destructive"
      });
    } finally {
      stopLoading('sync');
    }
  };

  // Initialize data download on first load
  useEffect(() => {
    if (isOnline && accountId && !isInitialized) {
      setIsInitialized(true);
      startLoading('initial-load');
      
      syncService.downloadUserData(accountId)
        .then(() => {
          console.log(`${tableName} data initialized`);
        })
        .catch((error) => {
          console.error(`Failed to initialize ${tableName} data:`, error);
        })
        .finally(() => {
          stopLoading('initial-load');
        });
    }
  }, [isOnline, accountId, isInitialized, tableName, startLoading, stopLoading]);

  // Auto-sync when coming back online
  useEffect(() => {
    if (isOnline) {
      syncService.processQueue();
    }
  }, [isOnline]);

  return {
    data: data || [],
    create,
    update,
    remove,
    refresh,
    isOnline,
    isInitialized
  };
};