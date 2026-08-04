import { useEffect, useState, useCallback } from 'react';
import { Platform } from 'react-native';
import { pushNotificationService, PushNotificationData } from '@/src/services/pushNotification.service';
import { useNotificationStore } from '@/stores/notificationStore';
import { useAnalytics } from '@/src/hooks/useAnalytics';
import { useNavigation } from '@react-navigation/native';
import { errorLogger } from '@/src/errors/logger';

export function usePushNotifications() {
  const navigation = useNavigation();
  const { track } = useAnalytics();
  const { addNotification, fetchUnreadCount } = useNotificationStore();
  const [isInitialized, setIsInitialized] = useState(false);
  const [pushToken, setPushToken] = useState<string | null>(null);
  const [isRegistered, setIsRegistered] = useState(false);

  const handleNotificationReceived = useCallback((data: PushNotificationData) => {
    // Add notification to store
    addNotification({
      id: data.notificationId || `push_${Date.now()}`,
      type: data.type,
      title: data.title,
      message: data.message,
      data: data.data,
      read: false,
      createdAt: new Date(data.timestamp).toISOString(),
    });

    // Update badge count
    pushNotificationService.updateBadgeCount();
    fetchUnreadCount();

    track('push_received', {
      type: data.type,
      notificationId: data.notificationId,
    });
  }, [addNotification, fetchUnreadCount, track]);

  const handleNotificationOpened = useCallback((data: PushNotificationData) => {
    // Mark as read if possible
    track('push_opened', {
      type: data.type,
      notificationId: data.notificationId,
    });

    // Navigate based on notification data
    if (data.data?.deepLink) {
      // Use deep link navigation
      // This would be handled by the deep link service
    } else if (data.data?.nftId) {
      navigation.navigate('NFTDetail', { nftId: data.data.nftId });
    } else if (data.data?.auctionId) {
      navigation.navigate('AuctionDetail', { auctionId: data.data.auctionId });
    } else if (data.data?.collectionId) {
      navigation.navigate('CollectionDetail', { collectionId: data.data.collectionId });
    } else if (data.data?.userId) {
      navigation.navigate('Profile', { userId: data.data.userId });
    } else {
      // Default to notifications screen
      navigation.navigate('Notifications');
    }
  }, [navigation, track]);

  const initialize = useCallback(async () => {
    try {
      await pushNotificationService.initialize(
        handleNotificationReceived,
        handleNotificationOpened
      );

      const token = pushNotificationService.getPushToken();
      const registered = pushNotificationService.isPushRegistered();

      setPushToken(token);
      setIsRegistered(registered);
      setIsInitialized(true);

      // Reset badge count on app launch
      await pushNotificationService.resetBadgeCount();
    } catch (error) {
      errorLogger.log(error as Error, 'usePushNotifications');
    }
  }, [handleNotificationReceived, handleNotificationOpened]);

  const scheduleAuctionNotification = useCallback(async (
    auctionId: string,
    auctionName: string,
    endTime: Date,
    minutesBefore: number = 15
  ) => {
    try {
      return await pushNotificationService.scheduleAuctionEndingNotification(
        auctionId,
        auctionName,
        endTime,
        minutesBefore
      );
    } catch (error) {
      errorLogger.log(error as Error, 'scheduleAuctionNotification');
      return null;
    }
  }, []);

  const cancelNotification = useCallback(async (identifier: string) => {
    try {
      await pushNotificationService.cancelScheduledNotification(identifier);
    } catch (error) {
      errorLogger.log(error as Error, 'cancelNotification');
    }
  }, []);

  const retryRegistration = useCallback(async () => {
    try {
      await pushNotificationService.retryRegistration();
      const registered = pushNotificationService.isPushRegistered();
      setIsRegistered(registered);
    } catch (error) {
      errorLogger.log(error as Error, 'retryRegistration');
    }
  }, []);

  // Initialize on mount
  useEffect(() => {
    initialize();

    return () => {
      pushNotificationService.cleanup();
    };
  }, []);

  return {
    isInitialized,
    pushToken,
    isRegistered,
    scheduleAuctionNotification,
    cancelNotification,
    retryRegistration,
    updateBadgeCount: pushNotificationService.updateBadgeCount.bind(pushNotificationService),
    resetBadgeCount: pushNotificationService.resetBadgeCount.bind(pushNotificationService),
    scheduleNotification: pushNotificationService.scheduleNotification.bind(pushNotificationService),
  };
}

export function useScheduledNotifications() {
  const [scheduled, setScheduled] = useState<Notifications.NotificationRequest[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchScheduled = useCallback(async () => {
    setLoading(true);
    try {
      const notifications = await pushNotificationService.getScheduledNotifications();
      setScheduled(notifications);
    } catch (error) {
      errorLogger.log(error as Error, 'fetchScheduled');
    } finally {
      setLoading(false);
    }
  }, []);

  const cancelAll = useCallback(async () => {
    try {
      await pushNotificationService.cancelAllScheduledNotifications();
      setScheduled([]);
    } catch (error) {
      errorLogger.log(error as Error, 'cancelAll');
    }
  }, []);

  useEffect(() => {
    fetchScheduled();
  }, []);

  return {
    scheduled,
    loading,
    fetchScheduled,
    cancelAll,
    cancelOne: pushNotificationService.cancelScheduledNotification.bind(pushNotificationService),
  };
}