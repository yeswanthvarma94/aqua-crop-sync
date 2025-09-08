import { Wifi, WifiOff, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { syncService } from "@/services/syncService";
import { cn } from "@/lib/utils";

export const NetworkStatus: React.FC = () => {
  const { isOnline, isReconnecting, connectionType } = useNetworkStatus();

  const handleRetrySync = () => {
    if (isOnline) {
      syncService.processQueue();
    }
  };

  if (isOnline && !isReconnecting) {
    return (
      <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
        <Wifi className="w-3 h-3 mr-1" />
        Online {connectionType && `(${connectionType})`}
      </Badge>
    );
  }

  if (isReconnecting) {
    return (
      <Badge variant="outline" className="bg-accent/10 text-accent border-accent/30">
        <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
        Reconnecting...
      </Badge>
    );
  }

  return (
    <div className="flex items-center space-x-2">
      <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30">
        <WifiOff className="w-3 h-3 mr-1" />
        Offline
      </Badge>
      <Button 
        size="sm" 
        variant="ghost" 
        onClick={handleRetrySync}
        className="h-6 px-2 text-xs"
      >
        <RefreshCw className="w-3 h-3" />
      </Button>
    </div>
  );
};