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
        showToast(
          errorMessage || 'This action requires an internet connection',
          'warning',
          3000
        );
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
        showToast(
          errorMessage || 'This action requires an internet connection',
          'warning',
          3000
        );
        return false;
      }

      try {
        await action();
        return true;
      } catch (error) {
        showToast(
          error instanceof Error ? error.message : 'An error occurred',
          'error',
          3000
        );
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
