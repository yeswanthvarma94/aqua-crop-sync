import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { syncService } from "@/services/syncService";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { cn } from "@/lib/utils";

export const SyncStatus: React.FC = () => {
  const { isOnline } = useNetworkStatus();
  const [syncStats, setSyncStats] = useState({ pendingSync: 0, syncErrors: 0 });
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    const updateStats = async () => {
      const stats = await syncService.getSyncStats();
      setSyncStats(stats);
    };

    updateStats();
    const interval = setInterval(updateStats, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, []);

  const handleManualSync = async () => {
    if (!isOnline) return;
    
    setIsRefreshing(true);
    try {
      await syncService.processQueue();
    } finally {
      setIsRefreshing(false);
    }
  };

  // Show sync errors if any
  if (syncStats.syncErrors > 0) {
    return (
      <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30">
        <AlertTriangle className="w-3 h-3 mr-1" />
        {syncStats.syncErrors} Error{syncStats.syncErrors > 1 ? 's' : ''}
      </Badge>
    );
  }

  // Don't show pending sync count, always show synced when no errors

  // Show synced status
  return (
    <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
      <CheckCircle2 className="w-3 h-3 mr-1" />
      Synced
    </Badge>
  );
};