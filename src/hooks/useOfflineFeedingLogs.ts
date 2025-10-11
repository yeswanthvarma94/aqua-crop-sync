import { useOfflineStorage } from './useOfflineStorage';
import { useAuth } from '@/state/AuthContext';
import { OfflineFeedingLog } from '@/lib/offlineStorage';

export const useOfflineFeedingLogs = () => {
  const { accountId } = useAuth();
  
  return useOfflineStorage<OfflineFeedingLog>('feedingLogs', accountId);
};
