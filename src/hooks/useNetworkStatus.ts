import { useState, useEffect } from 'react';

export interface NetworkStatus {
  isOnline: boolean;
  isReconnecting: boolean;
  connectionType?: string;
}

export const useNetworkStatus = (): NetworkStatus => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [connectionType, setConnectionType] = useState<string | undefined>();

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setIsReconnecting(false);
      
      // Check if we have Capacitor Network plugin
      if ((window as any).CapacitorNetwork) {
        (window as any).CapacitorNetwork.getStatus().then((status: any) => {
          setConnectionType(status.connectionType);
        });
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setIsReconnecting(false);
      setConnectionType(undefined);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !navigator.onLine) {
        setIsReconnecting(true);
        // Check connection after a brief delay
        setTimeout(() => {
          setIsOnline(navigator.onLine);
          setIsReconnecting(false);
        }, 1000);
      }
    };

    // Browser events
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Capacitor network events (if available)
    if ((window as any).CapacitorNetwork) {
      const { Network } = (window as any).CapacitorNetwork;
      
      Network.addListener('networkStatusChange', (status: any) => {
        setIsOnline(status.connected);
        setConnectionType(status.connectionType);
        
        if (!status.connected) {
          setIsReconnecting(false);
        }
      });
    }

    // Initial connection type check
    if ((window as any).CapacitorNetwork) {
      (window as any).CapacitorNetwork.getStatus().then((status: any) => {
        setIsOnline(status.connected);
        setConnectionType(status.connectionType);
      });
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return {
    isOnline,
    isReconnecting,
    connectionType
  };
};