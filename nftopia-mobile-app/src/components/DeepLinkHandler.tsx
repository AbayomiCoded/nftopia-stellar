import React, { useEffect } from 'react';
import { useDeepLink } from '@/src/hooks/useDeepLink';
import { useAuthStore } from '@/stores/authStore';

interface DeepLinkHandlerProps {
  children: React.ReactNode;
}

export function DeepLinkHandler({ children }: DeepLinkHandlerProps) {
  const { processDeepLink, getPendingDeepLink } = useDeepLink();
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    // Check for pending deep link on mount
    const pendingLink = getPendingDeepLink();
    if (pendingLink) {
      processDeepLink(pendingLink);
    }
  }, [isAuthenticated]);

  return <>{children}</>;
}