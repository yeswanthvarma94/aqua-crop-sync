import { useOfflineStorage } from './useOfflineStorage';
import { useAuth } from '@/state/AuthContext';
import { OfflineFarm } from '@/lib/offlineStorage';

export const useOfflineFarms = () => {
  const { accountId } = useAuth();
  
  return useOfflineStorage<OfflineFarm>('farms', accountId);
};