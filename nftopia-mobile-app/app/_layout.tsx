import React, { useEffect, useRef, useCallback, useState } from 'react';
import { View, Text, StyleSheet, AppState, AppStateStatus } from 'react-native';
import { I18nextProvider } from 'react-i18next';
import i18n, { isRTL } from '@/src/i18n';
import { ErrorBoundary } from '@/src/components/ErrorBoundary';
import { errorLogger } from '@/src/errors/logger';
import { analyticsService } from '@/src/analytics/analytics.service';
import { ANALYTICS_EVENTS } from '@/src/analytics/config';
import { ConsentManager } from '@/src/components/ConsentManager';
import { useOfflineStore } from '@/stores/offlineStore';
import { useNotificationStore } from '@/stores/notificationStore';
import { useCreatorStore } from '@/stores/creatorStore';
import { Notification } from '@/types';

// WebSocket URL for real-time notifications
const WS_URL = 'wss://api.nftopia.io/ws/notifications';

function AppLayoutContent({ children }: { children: React.ReactNode }) {
  const { setOnlineStatus, processQueue, isOnline } = useOfflineStore();
  const { addNotification, fetchUnreadCount } = useNotificationStore();
  const { refreshAll } = useCreatorStore();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const appState = useRef(AppState.currentState);
  const [showConsent, setShowConsent] = useState(false);

  // Initialize analytics
  useEffect(() => {
    const initAnalytics = async () => {
      const hasConsent = analyticsService.hasConsent();
      if (hasConsent) {
        await analyticsService.initialize();
        analyticsService.track(ANALYTICS_EVENTS.APP_OPEN);
      } else {
        setShowConsent(true);
      }
    };
    initAnalytics();
  }, []);

  // Set RTL direction when language changes
  useEffect(() => {
    const rtl = isRTL();
    if (rtl) {
      const { I18nManager } = require('react-native');
      if (!I18nManager.isRTL) {
        I18nManager.forceRTL(true);
      }
    } else {
      const { I18nManager } = require('react-native');
      if (I18nManager.isRTL) {
        I18nManager.forceRTL(false);
      }
    }
  }, [i18n.language]);

  // Network status monitoring
  useEffect(() => {
    const checkConnection = () => {
      fetch('https://api.nftopia.io/health', { method: 'HEAD' })
        .then(() => {
          if (!isOnline) {
            setOnlineStatus(true);
            processQueue();
            refreshAll();
            // Retry offline analytics events
            analyticsService.retryOfflineEvents();
            analyticsService.track(ANALYTICS_EVENTS.ONLINE_MODE);
          }
        })
        .catch(() => {
          if (isOnline) {
            setOnlineStatus(false);
            analyticsService.track(ANALYTICS_EVENTS.OFFLINE_MODE);
          }
        });
    };

    const interval = setInterval(checkConnection, 30000);
    checkConnection();

    return () => clearInterval(interval);
  }, [isOnline, setOnlineStatus, processQueue, refreshAll]);

  // WebSocket connection for real-time notifications
  const connectWebSocket = useCallback(() => {
    try {
      const ws = new WebSocket(WS_URL);

      ws.onopen = () => {
        console.log('WebSocket connected');
        analyticsService.track('websocket_connected');
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'notification') {
            const notification: Notification = {
              id: data.payload.id || `ws_${Date.now()}`,
              type: data.payload.type || 'mint',
              title: data.payload.title || 'New Notification',
              message: data.payload.message || '',
              data: data.payload.data,
              read: false,
              createdAt: data.payload.createdAt || new Date().toISOString(),
            };
            addNotification(notification);
            fetchUnreadCount();
          }
        } catch (error) {
          errorLogger.log(error as Error, 'WebSocketMessageHandler');
          analyticsService.trackError(error as Error, {
            event: 'ws_message',
            payload: event.data,
          });
        }
      };

      ws.onclose = () => {
        reconnectTimeoutRef.current = setTimeout(() => {
          connectWebSocket();
        }, 5000);
        analyticsService.track('websocket_closed');
      };

      ws.onerror = (error) => {
        errorLogger.log(error as unknown as Error, 'WebSocketConnection');
        analyticsService.trackError(error as unknown as Error, { event: 'ws_error' });
        ws.close();
      };

      wsRef.current = ws;
    } catch (error) {
      errorLogger.log(error as Error, 'WebSocketConnection');
      analyticsService.trackError(error as Error, { event: 'ws_connect_failed' });
    }
  }, [addNotification, fetchUnreadCount]);

  useEffect(() => {
    connectWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [connectWebSocket]);

  // Handle app state changes (foreground/background)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        refreshAll();
        fetchUnreadCount();
        analyticsService.track(ANALYTICS_EVENTS.APP_FOREGROUND);
      } else if (appState.current === 'active' && nextAppState.match(/inactive|background/)) {
        analyticsService.track(ANALYTICS_EVENTS.APP_BACKGROUND);
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [refreshAll, fetchUnreadCount]);

  // Handle app close
  useEffect(() => {
    const cleanup = async () => {
      analyticsService.track(ANALYTICS_EVENTS.APP_CLOSE);
      await analyticsService.destroy();
    };

    // Note: This is a simplified cleanup, real apps would use AppState for this
    return () => {
      cleanup();
    };
  }, []);

  const handleConsentGiven = async () => {
    setShowConsent(false);
    await analyticsService.initialize();
    analyticsService.track(ANALYTICS_EVENTS.APP_OPEN);
  };

  const handleConsentDenied = () => {
    setShowConsent(false);
  };

  return (
    <>
      <I18nextProvider i18n={i18n}>
        {children}
      </I18nextProvider>
      <ConsentManager
        visible={showConsent}
        onConsentGiven={handleConsentGiven}
        onConsentDenied={handleConsentDenied}
      />
    </>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary
      name="AppRoot"
      onError={(error, errorInfo) => {
        errorLogger.log(error, 'AppRoot', undefined, { componentStack: errorInfo.componentStack });
        analyticsService.trackError(error, { componentStack: errorInfo.componentStack });
      }}
      onReset={() => {
        console.log('App reset after error');
      }}
    >
      <AppLayoutContent>
        {children}
      </AppLayoutContent>
    </ErrorBoundary>
  );
}