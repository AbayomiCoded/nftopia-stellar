import { createStore } from '@/src/utils/store.factory';
import { Notification, NotificationPreferences } from '@/types';
import apiClient from '@/lib/api/sample';
import { pushNotificationService } from '@/src/services/pushNotification.service';

export const VERSION = 1;

const defaultPreferences: NotificationPreferences = {
  outbid: true,
  sale: true,
  follow: true,
  mint: true,
  auction_end: true,
  listing: true,
  offer: true,
  transfer: true,
  pushEnabled: true,
};

interface NotificationStore {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  preferences: NotificationPreferences;

  fetchNotifications: () => Promise<void>;
  fetchUnreadCount: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  fetchPreferences: () => Promise<void>;
  updatePreferences: (prefs: Partial<NotificationPreferences>) => Promise<void>;
  addNotification: (notification: Notification) => void;
  resetBadgeCount: () => Promise<void>;
}

const initialState: NotificationStore = {
  notifications: [],
  unreadCount: 0,
  loading: false,
  error: null,
  preferences: defaultPreferences,

  fetchNotifications: async () => {},
  fetchUnreadCount: async () => {},
  markAsRead: async () => {},
  markAllAsRead: async () => {},
  fetchPreferences: async () => {},
  updatePreferences: async () => {},
  addNotification: () => {},
  resetBadgeCount: async () => {},
};

export const useNotificationStore = createStore<NotificationStore>({
  name: 'notification-store',
  initialState,
  actions: (set, get) => ({
    ...initialState,

    fetchNotifications: async () => {
      set({ loading: true, error: null });
      try {
        const notifications = await apiClient.getNotifications();
        const unreadCount = notifications.filter(n => !n.read).length;
        await pushNotificationService.updateBadgeCount(unreadCount);
        set({ notifications, unreadCount, loading: false });
      } catch (error: any) {
        set({ error: error.message, loading: false });
      }
    },

    fetchUnreadCount: async () => {
      try {
        const { count } = await apiClient.getUnreadCount();
        set({ unreadCount: count });
        await pushNotificationService.updateBadgeCount(count);
      } catch {
        // Silently fail
      }
    },

    markAsRead: async (id: string) => {
      try {
        await apiClient.markNotificationRead(id);
        set((state) => {
          const newNotifications = state.notifications.map((n) =>
            n.id === id ? { ...n, read: true } : n
          );
          const newUnreadCount = newNotifications.filter(n => !n.read).length;
          pushNotificationService.updateBadgeCount(newUnreadCount);
          return {
            notifications: newNotifications,
            unreadCount: newUnreadCount,
          };
        });
      } catch (error: any) {
        console.error('Failed to mark notification as read:', error.message);
      }
    },

    markAllAsRead: async () => {
      try {
        await apiClient.markAllNotificationsRead();
        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, read: true })),
          unreadCount: 0,
        }));
        await pushNotificationService.resetBadgeCount();
      } catch (error: any) {
        console.error('Failed to mark all as read:', error.message);
      }
    },

    fetchPreferences: async () => {
      try {
        const preferences = await apiClient.getNotificationPreferences();
        set({ preferences });
      } catch {
        // Use defaults
      }
    },

    updatePreferences: async (prefs: Partial<NotificationPreferences>) => {
      try {
        const preferences = await apiClient.updateNotificationPreferences(prefs);
        set({ preferences });
      } catch (error: any) {
        console.error('Failed to update preferences:', error.message);
      }
    },

    addNotification: (notification: Notification) => {
      set((state) => {
        const newNotifications = [notification, ...state.notifications];
        const newUnreadCount = newNotifications.filter(n => !n.read).length;
        pushNotificationService.updateBadgeCount(newUnreadCount);
        return {
          notifications: newNotifications,
          unreadCount: newUnreadCount,
        };
      });
    },

    resetBadgeCount: async () => {
      await pushNotificationService.resetBadgeCount();
      set({ unreadCount: 0 });
    },
  }),
  persist: {
    enabled: true,
    name: 'notification-storage',
    version: VERSION,
    partialize: (state: NotificationStore) => ({
      notifications: state.notifications,
      unreadCount: state.unreadCount,
      preferences: state.preferences,
    }),
    storage: 'async', // Use async storage for notifications
    blacklist: ['loading', 'error'], // Don't persist loading and error states
  },
  devtools: {
    enabled: __DEV__,
    name: 'NotificationStore',
  },
});