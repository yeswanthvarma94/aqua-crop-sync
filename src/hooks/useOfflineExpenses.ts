import { useOfflineStorage } from './useOfflineStorage';
import { useAuth } from '@/state/AuthContext';
import { OfflineExpense } from '@/lib/offlineStorage';

export const useOfflineExpenses = () => {
  const { accountId } = useAuth();
  
  return useOfflineStorage<OfflineExpense>('expenses', accountId);
};
