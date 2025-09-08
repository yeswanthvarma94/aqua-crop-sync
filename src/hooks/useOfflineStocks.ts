import { useOfflineStorage } from './useOfflineStorage';
import { useAuth } from '@/state/AuthContext';
import { OfflineStock } from '@/lib/offlineStorage';

export const useOfflineStocks = () => {
  const { accountId } = useAuth();
  
  return useOfflineStorage<OfflineStock>('stocks', accountId);
};