import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { analyticsService } from '@/src/analytics/analytics.service';
import { errorLogger } from '@/src/errors/logger';
import apiClient from '@/lib/api/sample';
import { Notification } from '@/types';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export interface PushNotificationData {
  notificationId: string;
  type: 'bid' | 'sale' | 'follow' | 'mint' | 'auction_end' | 'listing' | 'offer' | 'transfer';
  title: string;
  message: string;
  data?: {
    nftId?: string;
    nftName?: string;
    nftImage?: string;
    userId?: string;
    userName?: string;
    amount?: string;
    currency?: string;
    auctionId?: string;
    collectionId?: string;
  };
  timestamp: number;
}

export interface ScheduledNotification {
  id: string;
  title: string;
  message: string;
  trigger: Notifications.NotificationTriggerInput;
  data?: Record<string, any>;
}

class PushNotificationService {
  private static instance: PushNotificationService;
  private expoPushToken: string | null = null;
  private isRegistered = false;
  private notificationListener: Notifications.Subscription | null = null;
  private responseListener: Notifications.Subscription | null = null;
  private onNotificationReceived: ((notification: PushNotificationData) => void) | null = null;
  private onNotificationOpened: ((notification: PushNotificationData) => void) | null = null;

  private constructor() {}

  static getInstance(): PushNotificationService {
    if (!PushNotificationService.instance) {
      PushNotificationService.instance = new PushNotificationService();
    }
    return PushNotificationService.instance;
  }

  // Initialize push notifications
  async initialize(
    onNotificationReceived?: (notification: PushNotificationData) => void,
    onNotificationOpened?: (notification: PushNotificationData) => void
  ): Promise<void> {
    this.onNotificationReceived = onNotificationReceived || null;
    this.onNotificationOpened = onNotificationOpened || null;

    // Check if device is physical (not simulator)
    if (!Device.isDevice) {
      console.log('Push notifications not supported on simulator');
      return;
    }

    try {
      // Request permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('Push notification permissions denied');
        analyticsService.track('push_permission_denied');
        return;
      }

      analyticsService.track('push_permission_granted');

      // Get Expo push token
      const token = await this.getExpoPushToken();
      if (token) {
        this.expoPushToken = token;
        await this.registerToken(token);
        this.isRegistered = true;
        console.log('Push notification initialized with token:', token);
        analyticsService.track('push_token_registered');
      }

      // Set up listeners
      this.setupListeners();

      // Configure Android notification channel
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#6C5CE7',
          sound: 'default',
        });
      }

      // Check for initial notification (opened from kill state)
      await this.checkInitialNotification();
    } catch (error) {
      errorLogger.log(error as Error, 'PushNotificationService');
      analyticsService.track('push_initialization_error', {
        error: (error as Error).message,
      });
    }
  }

  // Get Expo push token
  private async getExpoPushToken(): Promise<string | null> {
    try {
      const token = await Notifications.getExpoPushTokenAsync({
        experienceId: '@nftopia/nftopia',
      });
      return token.data;
    } catch (error) {
      errorLogger.log(error as Error, 'getExpoPushToken');
      return null;
    }
  }

  // Register token with backend
  private async registerToken(token: string): Promise<void> {
    try {
      await apiClient.registerPushToken(token);
      await AsyncStorage.setItem('push_token', token);
      console.log('Push token registered with backend');
    } catch (error) {
      errorLogger.log(error as Error, 'registerPushToken');
      // Store for retry
      await AsyncStorage.setItem('pending_push_token', token);
    }
  }

  // Retry failed token registration
  async retryRegistration(): Promise<void> {
    try {
      const pendingToken = await AsyncStorage.getItem('pending_push_token');
      if (pendingToken) {
        await apiClient.registerPushToken(pendingToken);
        await AsyncStorage.removeItem('pending_push_token');
        this.isRegistered = true;
        console.log('Push token registration retry successful');
      }
    } catch (error) {
      errorLogger.log(error as Error, 'retryPushRegistration');
    }
  }

  // Set up notification listeners
  private setupListeners(): void {
    // Remove existing listeners
    this.removeListeners();

    // Listener for notifications received while app is foregrounded
    this.notificationListener = Notifications.addNotificationReceivedListener(
      (notification) => {
        this.handleNotificationReceived(notification);
      }
    );

    // Listener for notification interactions (opened)
    this.responseListener = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        this.handleNotificationResponse(response);
      }
    );
  }

  // Remove listeners
  private removeListeners(): void {
    if (this.notificationListener) {
      Notifications.removeNotificationSubscription(this.notificationListener);
      this.notificationListener = null;
    }
    if (this.responseListener) {
      Notifications.removeNotificationSubscription(this.responseListener);
      this.responseListener = null;
    }
  }

  // Handle notification received
  private handleNotificationReceived(notification: Notifications.Notification): void {
    try {
      const data = this.parseNotificationData(notification);
      if (data) {
        // Update badge count
        this.updateBadgeCount();

        // Track analytics
        analyticsService.track('push_received', {
          type: data.type,
          notificationId: data.notificationId,
        });

        // Call callback
        if (this.onNotificationReceived) {
          this.onNotificationReceived(data);
        }
      }
    } catch (error) {
      errorLogger.log(error as Error, 'handleNotificationReceived');
    }
  }

  // Handle notification response (opened)
  private handleNotificationResponse(response: Notifications.NotificationResponse): void {
    try {
      const data = this.parseNotificationData(response.notification);
      if (data) {
        // Update badge count
        this.updateBadgeCount();

        // Track analytics
        analyticsService.track('push_opened', {
          type: data.type,
          notificationId: data.notificationId,
          actionIdentifier: response.actionIdentifier,
        });

        // Call callback
        if (this.onNotificationOpened) {
          this.onNotificationOpened(data);
        } else {
          // Default navigation
          this.navigateFromNotification(data);
        }
      }
    } catch (error) {
      errorLogger.log(error as Error, 'handleNotificationResponse');
    }
  }

  // Parse notification data
  private parseNotificationData(
    notification: Notifications.Notification
  ): PushNotificationData | null {
    try {
      const data = notification.request.content;
      const customData = data.data || {};

      return {
        notificationId: notification.request.identifier || Date.now().toString(),
        type: customData.type || 'mint',
        title: data.title || 'New Notification',
        message: data.body || '',
        data: customData,
        timestamp: Date.now(),
      };
    } catch (error) {
      errorLogger.log(error as Error, 'parseNotificationData');
      return null;
    }
  }

  // Navigate from notification
  private navigateFromNotification(data: PushNotificationData): void {
    // This will be handled by the navigation container
    // The navigation logic will be in the app navigator
    console.log('[PushNotification] Navigate from notification:', data);
  }

  // Check for initial notification (app opened from kill state)
  private async checkInitialNotification(): Promise<void> {
    try {
      const response = await Notifications.getLastNotificationResponseAsync();
      if (response) {
        const data = this.parseNotificationData(response.notification);
        if (data) {
          analyticsService.track('push_initial_open', {
            type: data.type,
            notificationId: data.notificationId,
          });
          if (this.onNotificationOpened) {
            this.onNotificationOpened(data);
          } else {
            this.navigateFromNotification(data);
          }
        }
      }
    } catch (error) {
      errorLogger.log(error as Error, 'checkInitialNotification');
    }
  }

  // Update badge count
  async updateBadgeCount(count?: number): Promise<void> {
    try {
      let badgeCount = count;
      if (badgeCount === undefined) {
        // Get unread count from store or calculate
        const stored = await AsyncStorage.getItem('notification_badge_count');
        badgeCount = stored ? parseInt(stored, 10) + 1 : 1;
      }
      await Notifications.setBadgeCountAsync(badgeCount);
      await AsyncStorage.setItem('notification_badge_count', String(badgeCount));
    } catch (error) {
      errorLogger.log(error as Error, 'updateBadgeCount');
    }
  }

  // Reset badge count
  async resetBadgeCount(): Promise<void> {
    try {
      await Notifications.setBadgeCountAsync(0);
      await AsyncStorage.removeItem('notification_badge_count');
    } catch (error) {
      errorLogger.log(error as Error, 'resetBadgeCount');
    }
  }

  // Send push notification (for testing/development)
  async sendPushNotification(
    token: string,
    title: string,
    body: string,
    data?: Record<string, any>
  ): Promise<void> {
    try {
      await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: token,
          sound: 'default',
          title: title,
          body: body,
          data: data,
          priority: 'high',
        }),
      });
    } catch (error) {
      errorLogger.log(error as Error, 'sendPushNotification');
    }
  }

  // Schedule notification
  async scheduleNotification(
    title: string,
    message: string,
    trigger: Notifications.NotificationTriggerInput,
    data?: Record<string, any>
  ): Promise<string> {
    try {
      const identifier = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body: message,
          data: data || {},
          sound: 'default',
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger,
      });

      analyticsService.track('push_scheduled', {
        identifier,
        triggerType: (trigger as any).type || 'unknown',
      });

      return identifier;
    } catch (error) {
      errorLogger.log(error as Error, 'scheduleNotification');
      throw error;
    }
  }

  // Schedule auction ending notification
  async scheduleAuctionEndingNotification(
    auctionId: string,
    auctionName: string,
    endTime: Date,
    minutesBefore: number = 15
  ): Promise<string> {
    const trigger = new Date(endTime.getTime() - minutesBefore * 60000);
    if (trigger <= new Date()) {
      // If the auction ends soon, send immediately
      return this.scheduleNotification(
        'Auction Ending Soon!',
        `"${auctionName}" is ending in ${minutesBefore} minutes. Place your final bid!`,
        { seconds: 5 },
        {
          type: 'auction_end',
          auctionId,
          auctionName,
          minutesBefore,
        }
      );
    }

    return this.scheduleNotification(
      'Auction Ending Soon',
      `"${auctionName}" is ending in ${minutesBefore} minutes. Place your final bid!`,
      { date: trigger },
      {
        type: 'auction_end',
        auctionId,
        auctionName,
        minutesBefore,
      }
    );
  }

  // Schedule auction ended notification
  async scheduleAuctionEndedNotification(
    auctionId: string,
    auctionName: string,
    endTime: Date
  ): Promise<string> {
    return this.scheduleNotification(
      'Auction Ended',
      `"${auctionName}" has ended. Check the results!`,
      { date: endTime },
      {
        type: 'auction_end',
        auctionId,
        auctionName,
        ended: true,
      }
    );
  }

  // Cancel scheduled notification
  async cancelScheduledNotification(identifier: string): Promise<void> {
    try {
      await Notifications.cancelScheduledNotificationAsync(identifier);
      analyticsService.track('push_cancelled', { identifier });
    } catch (error) {
      errorLogger.log(error as Error, 'cancelScheduledNotification');
    }
  }

  // Cancel all scheduled notifications
  async cancelAllScheduledNotifications(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      analyticsService.track('push_all_cancelled');
    } catch (error) {
      errorLogger.log(error as Error, 'cancelAllScheduledNotifications');
    }
  }

  // Get all scheduled notifications
  async getScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
    try {
      return await Notifications.getAllScheduledNotificationsAsync();
    } catch (error) {
      errorLogger.log(error as Error, 'getScheduledNotifications');
      return [];
    }
  }

  // Get push token
  getPushToken(): string | null {
    return this.expoPushToken;
  }

  // Check if registered
  isPushRegistered(): boolean {
    return this.isRegistered;
  }

  // Cleanup
  cleanup(): void {
    this.removeListeners();
    this.resetBadgeCount();
  }
}

export const pushNotificationService = PushNotificationService.getInstance();