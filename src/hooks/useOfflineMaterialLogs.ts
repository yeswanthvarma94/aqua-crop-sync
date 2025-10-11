import { useOfflineStorage } from './useOfflineStorage';
import { useAuth } from '@/state/AuthContext';
import { OfflineMaterialLog } from '@/lib/offlineStorage';

export const useOfflineMaterialLogs = () => {
  const { accountId } = useAuth();
  
  return useOfflineStorage<OfflineMaterialLog>('materialLogs', accountId);
};
