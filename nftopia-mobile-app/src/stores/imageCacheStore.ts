import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface CacheEntry {
  url: string;
  timestamp: number;
  size: number;
  format: string;
}

interface ImageCacheState {
  cache: Record<string, CacheEntry>;
  totalSize: number;
  maxSize: number;
  addToCache: (url: string, size: number, format: string) => void;
  getFromCache: (url: string) => CacheEntry | undefined;
  clearCache: () => void;
  removeFromCache: (url: string) => void;
  getCacheSize: () => number;
  isCached: (url: string) => boolean;
}

export const useImageCacheStore = create<ImageCacheState>()(
  persist(
    (set, get) => ({
      cache: {},
      totalSize: 0,
      maxSize: 100 * 1024 * 1024, // 100MB

      addToCache: (url: string, size: number, format: string) => {
        const state = get();
        const newTotalSize = state.totalSize + size;

        // If cache is full, remove oldest entries
        if (newTotalSize > state.maxSize) {
          const entries = Object.entries(state.cache);
          entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
          let freedSize = 0;
          const keepEntries: [string, CacheEntry][] = [];

          for (const [key, entry] of entries) {
            if (freedSize + entry.size < state.totalSize - state.maxSize + size) {
              freedSize += entry.size;
            } else {
              keepEntries.push([key, entry]);
            }
          }

          const newCache: Record<string, CacheEntry> = {};
          keepEntries.forEach(([key, entry]) => {
            newCache[key] = entry;
          });

          set({
            cache: {
              ...newCache,
              [url]: { url, timestamp: Date.now(), size, format },
            },
            totalSize: state.totalSize - freedSize + size,
          });
        } else {
          set({
            cache: { ...state.cache, [url]: { url, timestamp: Date.now(), size, format } },
            totalSize: state.totalSize + size,
          });
        }
      },

      getFromCache: (url: string) => {
        const state = get();
        const entry = state.cache[url];
        if (entry) {
          // Update timestamp for LRU
          set({
            cache: {
              ...state.cache,
              [url]: { ...entry, timestamp: Date.now() },
            },
          });
        }
        return entry;
      },

      clearCache: () => {
        set({ cache: {}, totalSize: 0 });
      },

      removeFromCache: (url: string) => {
        const state = get();
        const entry = state.cache[url];
        if (entry) {
          const newCache = { ...state.cache };
          delete newCache[url];
          set({
            cache: newCache,
            totalSize: state.totalSize - entry.size,
          });
        }
      },

      getCacheSize: () => {
        return get().totalSize;
      },

      isCached: (url: string) => {
        return !!get().cache[url];
      },
    }),
    {
      name: 'image-cache-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);