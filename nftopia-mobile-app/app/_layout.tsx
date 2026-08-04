import React, { useEffect, useRef, useCallback, useState } from 'react';
import { View, Text, StyleSheet, AppState, AppStateStatus } from 'react-native';
import { I18nextProvider } from 'react-i18next';
import i18n, { isRTL } from '@/src/i18n';
import { ErrorBoundary } from '@/src/components/ErrorBoundary';
import { errorLogger } from '@/src/errors/logger';
import { analyticsService } from '@/src/analytics/analytics.service';
import { ANALYTICS_EVENTS } from '@/src/analytics/config';
import { ConsentManager } from '@/src/components/ConsentManager';
import { usePushNotifications } from '@/src/hooks/usePushNotifications';
import { useOfflineStore } from '@/stores/offlineStore';
import { useNotificationStore } from '@/stores/notificationStore';
import { useCreatorStore } from '@/stores/creatorStore';
import { persistenceManager } from '@/src/utils/persistence.manager';
import { performanceService } from '@/src/services/performance.service';
import { errorTrackingService } from '@/src/services/errorTracking.service';
import { ToastContainer } from '@/src/components/Toast';
import { AlertContainer } from '@/src/components/Alert';
import { Notification } from '@/types';

const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN || '';
const APP_ENVIRONMENT = process.env.EXPO_PUBLIC_APP_ENVIRONMENT || 'development';
const APP_VERSION = '1.0.0';

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
  const [appInitialized, setAppInitialized] = useState(false);

  // Initialize push notifications
  const { isInitialized: pushInitialized } = usePushNotifications();

  // Initialize app (persistence, analytics, performance, error tracking, etc.)
  useEffect(() => {
    const initApp = async () => {
      try {
        // Initialize error tracking (Sentry)
        if (SENTRY_DSN) {
          errorTrackingService.initialize({
            dsn: SENTRY_DSN,
            environment: APP_ENVIRONMENT,
            release: APP_VERSION,
            enableInDevelopment: true,
            tracesSampleRate: 0.2,
            profilesSampleRate: 0.1,
          });
          console.log('[App] Error tracking initialized');
        }

        // Initialize persistence first
        await persistenceManager.initialize();
        console.log('[App] Persistence initialized');

        // Initialize analytics
        const hasConsent = analyticsService.hasConsent();
        if (hasConsent) {
          await analyticsService.initialize();
          analyticsService.track(ANALYTICS_EVENTS.APP_OPEN);
        } else {
          setShowConsent(true);
        }

        // Start performance monitoring
        performanceService.startFrameTracking();

        // Track memory periodically
        setInterval(() => {
          performanceService.trackMemory();
        }, 30000); // Every 30 seconds

        setAppInitialized(true);
        console.log('[App] App initialized successfully');

        // Track app startup performance
        performanceService.trackMetric('app_startup_complete', performance.now(), 'ms', {
          environment: APP_ENVIRONMENT,
          platform: 'mobile',
        });
      } catch (error) {
        console.error('[App] Initialization failed:', error);
        errorLogger.log(error as Error, 'AppInitialization');
        errorTrackingService.captureException(error as Error, {
          componentName: 'AppInitialization',
          extra: { context: 'app_startup' },
        });
        // Still set initialized to true to prevent infinite loading
        setAppInitialized(true);
      }
    };

    initApp();
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
      const startTime = Date.now();
      fetch('https://api.nftopia.io/health', { method: 'HEAD' })
        .then((response) => {
          const duration = Date.now() - startTime;
          performanceService.trackMetric('network_health_check', duration, 'ms', {
            status: response.status,
            online: true,
          });

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
          const duration = Date.now() - startTime;
          performanceService.trackMetric('network_health_check', duration, 'ms', {
            online: false,
            error: true,
          });

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
    const startTime = Date.now();
    try {
      const ws = new WebSocket(WS_URL);

      ws.onopen = () => {
        const duration = Date.now() - startTime;
        performanceService.trackMetric('websocket_connection', duration, 'ms', {
          status: 'connected',
        });
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
          errorTrackingService.captureException(error as Error, {
            componentName: 'WebSocketMessageHandler',
            extra: { event: 'ws_message' },
          });
        }
      };

      ws.onclose = () => {
        reconnectTimeoutRef.current = setTimeout(() => {
          connectWebSocket();
        }, 5000);
        analyticsService.track('websocket_closed');
        performanceService.trackMetric('websocket_connection', Date.now() - startTime, 'ms', {
          status: 'closed',
        });
      };

      ws.onerror = (error) => {
        errorLogger.log(error as unknown as Error, 'WebSocketConnection');
        analyticsService.trackError(error as unknown as Error, { event: 'ws_error' });
        errorTrackingService.captureException(error as Error, {
          componentName: 'WebSocketConnection',
          extra: { event: 'ws_error' },
        });
        ws.close();
      };

      wsRef.current = ws;
    } catch (error) {
      errorLogger.log(error as Error, 'WebSocketConnection');
      analyticsService.trackError(error as Error, { event: 'ws_connect_failed' });
      errorTrackingService.captureException(error as Error, {
        componentName: 'WebSocketConnection',
        extra: { event: 'ws_connect_failed' },
      });
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
        performanceService.trackMetric('app_foreground', Date.now(), 'ms');
      } else if (appState.current === 'active' && nextAppState.match(/inactive|background/)) {
        analyticsService.track(ANALYTICS_EVENTS.APP_BACKGROUND);
        performanceService.trackMetric('app_background', Date.now(), 'ms');
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
      performanceService.stopFrameTracking();
      
      // Generate performance report
      const report = performanceService.generateReport();
      console.log('[Performance] App shutdown report:', report);
      
      await analyticsService.destroy();
      await errorTrackingService.flush(2000);
    };

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

  // Show nothing until app is initialized
  if (!appInitialized) {
    return null;
  }

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
      <ToastContainer />
      <AlertContainer />
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
        errorTrackingService.captureException(error, {
          componentName: 'AppRoot',
          extra: { componentStack: errorInfo.componentStack },
        });
      }}
      onReset={() => {
        console.log('App reset after error');
        errorTrackingService.addBreadcrumb('App reset after error', 'navigation', 'info');
      }}
    >
      <AppLayoutContent>
        {children}
      </AppLayoutContent>
    </ErrorBoundary>
  );
}