import React, { useEffect } from 'react';
import { useNetworkStatus } from '@/src/hooks/useNetworkStatus';
import { useOfflineStore } from '@/stores/offlineStore';
import { useToastStore } from '@/stores/toastStore';

export function NetworkStatusManager() {
  const { isOffline, justCameOnline } = useNetworkStatus();
  const setOnlineStatus = useOfflineStore((state) => state.setOnlineStatus);
  const { showToast } = useToastStore();

  useEffect(() => {
    setOnlineStatus(!isOffline);
  }, [isOffline, setOnlineStatus]);

  useEffect(() => {
    if (justCameOnline) {
      showToast({
        type: 'success',
        title: 'Back Online',
        message: 'Your connection has been restored',
        duration: 3000,
      });
    }
  }, [justCameOnline, showToast]);

  return null;
}
