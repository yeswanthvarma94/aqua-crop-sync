import { useOfflineStorage } from './useOfflineStorage';
import { useAuth } from '@/state/AuthContext';
import { OfflineTank } from '@/lib/offlineStorage';

export const useOfflineTanks = () => {
  const { accountId } = useAuth();
  
  return useOfflineStorage<OfflineTank>('tanks', accountId);
};
