import React, { useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, AppState, AppStateStatus } from 'react-native';
import { useOfflineStore } from '@/stores/offlineStore';
import { useNotificationStore } from '@/stores/notificationStore';
import { useCreatorStore } from '@/stores/creatorStore';
import { Notification } from '@/types';

// WebSocket URL for real-time notifications
const WS_URL = 'wss://api.nftopia.io/ws/notifications';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { setOnlineStatus, processQueue, isOnline } = useOfflineStore();
  const { addNotification, fetchUnreadCount } = useNotificationStore();
  const { refreshAll } = useCreatorStore();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const appState = useRef(AppState.currentState);

  // Network status monitoring
  useEffect(() => {
    // Simulate NetInfo listener (would use @react-native-community/netinfo)
    const checkConnection = () => {
      fetch('https://api.nftopia.io/health', { method: 'HEAD' })
        .then(() => {
          if (!isOnline) {
            setOnlineStatus(true);
            processQueue();
            refreshAll();
          }
        })
        .catch(() => {
          if (isOnline) {
            setOnlineStatus(false);
          }
        });
    };

    const interval = setInterval(checkConnection, 30000);
    checkConnection(); // Initial check

    return () => clearInterval(interval);
  }, []);

  // WebSocket connection for real-time notifications
  const connectWebSocket = useCallback(() => {
    try {
      const ws = new WebSocket(WS_URL);

      ws.onopen = () => {
        console.log('WebSocket connected');
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
        } catch {
          // Ignore parse errors
        }
      };

      ws.onclose = () => {
        // Reconnect after 5 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          connectWebSocket();
        }, 5000);
      };

      ws.onerror = () => {
        ws.close();
      };

      wsRef.current = ws;
    } catch {
      // WebSocket not available
    }
  }, []);

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
        // App came to foreground - refresh data
        refreshAll();
        fetchUnreadCount();
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, []);

  return <>{children}</>;
}