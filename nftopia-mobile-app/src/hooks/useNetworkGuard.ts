import { useCallback } from 'react';
import { useNetworkStatus } from '@/src/hooks/useNetworkStatus';
import { useOfflineStore } from '@/stores/offlineStore';
import { useToastStore } from '@/stores/toastStore';

export function useNetworkGuard() {
  const { isOffline } = useNetworkStatus();
  const canPerformWriteAction = useOfflineStore((state) => state.canPerformWriteAction);
  const { showToast } = useToastStore();

  const guardWriteAction = useCallback(
    (action: () => void | Promise<void>, errorMessage?: string) => {
      if (!canPerformWriteAction()) {
        showToast({
          type: 'warning',
          title: 'Offline',
          message: errorMessage || 'This action requires an internet connection',
          duration: 3000,
        });
        return false;
      }

      action();
      return true;
    },
    [canPerformWriteAction, showToast]
  );

  const guardAsyncWriteAction = useCallback(
    async (action: () => Promise<void>, errorMessage?: string): Promise<boolean> => {
      if (!canPerformWriteAction()) {
        showToast({
          type: 'warning',
          title: 'Offline',
          message: errorMessage || 'This action requires an internet connection',
          duration: 3000,
        });
        return false;
      }

      try {
        await action();
        return true;
      } catch (error) {
        showToast({
          type: 'error',
          title: 'Action Failed',
          message: error instanceof Error ? error.message : 'An error occurred',
          duration: 3000,
        });
        return false;
      }
    },
    [canPerformWriteAction, showToast]
  );

  return {
    isOffline,
    canPerformWriteAction,
    guardWriteAction,
    guardAsyncWriteAction,
  };
}
