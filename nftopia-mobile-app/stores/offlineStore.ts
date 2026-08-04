import { create } from 'zustand';
import { persist, PersistOptions } from 'zustand/middleware';
import { OfflineQueueItem, CachedData, NFT, Collection, Notification } from '@/types';

interface OfflineStore {
  isOnline: boolean;
  queue: OfflineQueueItem[];
  cachedData: CachedData;
  lastSync: string | null;

  setOnlineStatus: (isOnline: boolean) => void;
  addToQueue: (item: Omit<OfflineQueueItem, 'id' | 'timestamp' | 'retryCount' | 'maxRetries'>) => void;
  processQueue: () => Promise<void>;
  removeFromQueue: (id: string) => void;
  updateCachedNFTs: (nfts: NFT[]) => void;
  updateCachedCollections: (collections: Collection[]) => void;
  updateCachedNotifications: (notifications: Notification[]) => void;
  addFavorite: (nftId: string) => void;
  removeFavorite: (nftId: string) => void;
  isFavorite: (nftId: string) => boolean;
  addToWatchlist: (nftId: string) => void;
  removeFromWatchlist: (nftId: string) => void;
  isInWatchlist: (nftId: string) => boolean;
  addRecentSearch: (query: string) => void;
  clearRecentSearches: () => void;
  clearCache: () => void;
}

const initialCachedData: CachedData = {
  nfts: [],
  collections: [],
  notifications: [],
  favorites: [],
  watchlist: [],
  recentSearches: [],
  lastSync: '',
};

export const useOfflineStore = create<OfflineStore>()(
  persist(
    (set, get) => ({
      isOnline: true,
      queue: [],
      cachedData: initialCachedData,
      lastSync: null,

      setOnlineStatus: (isOnline: boolean) => {
        set({ isOnline });
        if (isOnline) {
          get().processQueue();
        }
      },

      addToQueue: (item) => {
        const queueItem: OfflineQueueItem = {
          ...item,
          id: `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          timestamp: new Date().toISOString(),
          retryCount: 0,
          maxRetries: 3,
        };
        set((state) => ({ queue: [...state.queue, queueItem] }));
      },

      processQueue: async () => {
        const { queue, isOnline } = get();
        if (!isOnline || queue.length === 0) return;

        const remaining: OfflineQueueItem[] = [];
        for (const item of queue) {
          try {
            // Process each queued action
            await processOfflineAction(item);
          } catch {
            if (item.retryCount < item.maxRetries) {
              remaining.push({
                ...item,
                retryCount: item.retryCount + 1,
              });
            }
          }
        }
        set({ queue: remaining });
      },

      removeFromQueue: (id: string) => {
        set((state) => ({ queue: state.queue.filter((item) => item.id !== id) }));
      },

      updateCachedNFTs: (nfts: NFT[]) => {
        set((state) => ({
          cachedData: { ...state.cachedData, nfts, lastSync: new Date().toISOString() },
          lastSync: new Date().toISOString(),
        }));
      },

      updateCachedCollections: (collections: Collection[]) => {
        set((state) => ({
          cachedData: { ...state.cachedData, collections, lastSync: new Date().toISOString() },
          lastSync: new Date().toISOString(),
        }));
      },

      updateCachedNotifications: (notifications: Notification[]) => {
        set((state) => ({
          cachedData: { ...state.cachedData, notifications, lastSync: new Date().toISOString() },
          lastSync: new Date().toISOString(),
        }));
      },

      addFavorite: (nftId: string) => {
        set((state) => {
          if (state.cachedData.favorites.includes(nftId)) return state;
          return {
            cachedData: {
              ...state.cachedData,
              favorites: [...state.cachedData.favorites, nftId],
            },
          };
        });
      },

      removeFavorite: (nftId: string) => {
        set((state) => ({
          cachedData: {
            ...state.cachedData,
            favorites: state.cachedData.favorites.filter((id) => id !== nftId),
          },
        }));
      },

      isFavorite: (nftId: string) => {
        return get().cachedData.favorites.includes(nftId);
      },

      addToWatchlist: (nftId: string) => {
        set((state) => {
          if (state.cachedData.watchlist.includes(nftId)) return state;
          return {
            cachedData: {
              ...state.cachedData,
              watchlist: [...state.cachedData.watchlist, nftId],
            },
          };
        });
      },

      removeFromWatchlist: (nftId: string) => {
        set((state) => ({
          cachedData: {
            ...state.cachedData,
            watchlist: state.cachedData.watchlist.filter((id) => id !== nftId),
          },
        }));
      },

      isInWatchlist: (nftId: string) => {
        return get().cachedData.watchlist.includes(nftId);
      },

      addRecentSearch: (query: string) => {
        set((state) => {
          const searches = state.cachedData.recentSearches.filter((s) => s !== query);
          return {
            cachedData: {
              ...state.cachedData,
              recentSearches: [query, ...searches].slice(0, 10),
            },
          };
        });
      },

      clearRecentSearches: () => {
        set((state) => ({
          cachedData: { ...state.cachedData, recentSearches: [] },
        }));
      },

      clearCache: () => {
        set({ cachedData: initialCachedData, lastSync: null });
      },
    }),
    {
      name: 'offline-storage',
      partialize: (state: OfflineStore) => ({
        cachedData: state.cachedData,
        lastSync: state.lastSync,
        queue: state.queue,
      }),
    } as unknown as PersistOptions<OfflineStore>
  )
);

async function processOfflineAction(item: OfflineQueueItem): Promise<void> {
  const apiClient = (await import('@/lib/api/sample')).default;
  switch (item.action) {
    case 'mint_nft':
      await apiClient.mintNFT(item.payload);
      break;
    case 'create_collection':
      await apiClient.createCollection(item.payload);
      break;
    case 'mark_notification_read':
      await apiClient.markNotificationRead(item.payload.id);
      break;
    case 'track_event':
      await apiClient.trackEvent(item.payload.event, item.payload.properties);
      break;
    default:
      console.warn('Unknown offline action:', item.action);
  }
}