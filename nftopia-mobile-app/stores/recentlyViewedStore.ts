import { createStore } from '@/src/utils/store.factory';

export const VERSION = 1;

/** Max number of entries retained; oldest entries are evicted first. */
export const MAX_RECENTLY_VIEWED = 20;

export interface RecentlyViewedEntry {
  nftId: string;
  viewedAt: number;
}

interface RecentlyViewedStore {
  items: RecentlyViewedEntry[];

  trackView: (nftId: string) => void;
  clearHistory: () => void;
}

const initialState: RecentlyViewedStore = {
  items: [],

  trackView: () => {},
  clearHistory: () => {},
};

export const useRecentlyViewedStore = createStore<RecentlyViewedStore>({
  name: 'recently-viewed-store',
  initialState,
  actions: (set) => ({
    ...initialState,

    trackView: (nftId: string) => {
      set((state) => {
        // Drop any existing entry for this NFT so re-viewing moves it to the
        // front instead of creating a duplicate, then cap the list length.
        const withoutExisting = state.items.filter((item) => item.nftId !== nftId);
        const next = [{ nftId, viewedAt: Date.now() }, ...withoutExisting].slice(
          0,
          MAX_RECENTLY_VIEWED
        );
        return { items: next };
      });
    },

    clearHistory: () => {
      set({ items: [] });
    },
  }),
  persist: {
    enabled: true,
    name: 'recently-viewed-storage',
    version: VERSION,
    partialize: (state: RecentlyViewedStore) => ({
      items: state.items,
    }),
    storage: 'async',
  },
  devtools: {
    enabled: __DEV__,
    name: 'RecentlyViewedStore',
  },
});
