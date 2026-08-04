import { create } from 'zustand';
import { persist, PersistOptions } from 'zustand/middleware';
import { Notification, NotificationPreferences } from '@/types';
import apiClient from '@/lib/api/sample';
import { pushNotificationService } from '@/src/services/pushNotification.service';

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

export const useNotificationStore = create<NotificationStore>()(
  persist(
    (set, get) => ({
      notifications: [],
      unreadCount: 0,
      loading: false,
      error: null,
      preferences: defaultPreferences,

      fetchNotifications: async () => {
        set({ loading: true, error: null });
        try {
          const notifications = await apiClient.getNotifications();
          set({ notifications, loading: false });
          
          // Update badge count based on unread notifications
          const unreadCount = notifications.filter(n => !n.read).length;
          await pushNotificationService.updateBadgeCount(unreadCount);
          set({ unreadCount });
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
            // Update badge count
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
          // Reset badge count
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
          // Update badge count
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
    {
      name: 'notification-storage',
      partialize: (state: NotificationStore) => ({
        notifications: state.notifications,
        unreadCount: state.unreadCount,
        preferences: state.preferences,
      }),
    } as unknown as PersistOptions<NotificationStore>
  )
);