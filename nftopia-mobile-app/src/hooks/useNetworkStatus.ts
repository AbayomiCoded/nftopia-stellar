import { useState, useEffect, useCallback } from 'react';
import NetInfo from '@react-native-community/netinfo';

interface NetworkStatus {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  type: string;
  previousConnected: boolean;
}

export function useNetworkStatus(debounceMs: number = 1000) {
  const [status, setStatus] = useState<NetworkStatus>({
    isConnected: true,
    isInternetReachable: true,
    type: 'unknown',
    previousConnected: true,
  });
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null;
    let lastStatus: NetworkStatus | null = null;

    const handleNetworkChange = (netInfo: any) => {
      const newStatus: NetworkStatus = {
        isConnected: netInfo.isConnected ?? false,
        isInternetReachable: netInfo.isInternetReachable,
        type: netInfo.type,
        previousConnected: lastStatus?.isConnected ?? true,
      };

      // Debounce to avoid false positives on brief network blips
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      timeoutId = setTimeout(() => {
        setStatus(newStatus);
        lastStatus = newStatus;
      }, debounceMs);
    };

    // Subscribe to network changes
    const unsubscribe = NetInfo.addEventListener(handleNetworkChange);

    // Initial check
    NetInfo.fetch().then(handleNetworkChange);

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      unsubscribe();
    };
  }, [debounceMs]);

  const manualCheck = useCallback(async () => {
    setIsChecking(true);
    try {
      const netInfo = await NetInfo.fetch();
      const newStatus: NetworkStatus = {
        isConnected: netInfo.isConnected ?? false,
        isInternetReachable: netInfo.isInternetReachable,
        type: netInfo.type,
        previousConnected: status.isConnected,
      };
      setStatus(newStatus);
      return newStatus.isConnected && newStatus.isInternetReachable;
    } finally {
      setIsChecking(false);
    }
  }, [status.isConnected]);

  const isOffline = !status.isConnected || status.isInternetReachable === false;
  const justWentOffline = isOffline && status.previousConnected;
  const justCameOnline = !isOffline && !status.previousConnected;

  return {
    isOffline,
    isConnected: status.isConnected,
    isInternetReachable: status.isInternetReachable,
    connectionType: status.type,
    justWentOffline,
    justCameOnline,
    manualCheck,
    isChecking,
  };
}
