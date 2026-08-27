// ── Mocks ─────────────────────────────────────────────────────────────────────

// React Native injects this global at build time; this repo's jest config
// runs in a plain node environment, so shim it before the store module
// (which reads it via the shared createStore factory) is imported.
(global as unknown as { __DEV__: boolean }).__DEV__ = false;

const asyncStorageStore: Record<string, string> = {};

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn((key: string) => Promise.resolve(asyncStorageStore[key] ?? null)),
  setItem: jest.fn((key: string, value: string) => {
    asyncStorageStore[key] = value;
    return Promise.resolve();
  }),
  removeItem: jest.fn((key: string) => {
    delete asyncStorageStore[key];
    return Promise.resolve();
  }),
  mergeItem: jest.fn(),
  clear: jest.fn(() => {
    Object.keys(asyncStorageStore).forEach((k) => delete asyncStorageStore[k]);
    return Promise.resolve();
  }),
  getAllKeys: jest.fn(() => Promise.resolve(Object.keys(asyncStorageStore))),
  multiGet: jest.fn(),
  multiSet: jest.fn(),
  multiRemove: jest.fn(),
}));

// ── Imports (after mocks) ─────────────────────────────────────────────────────

import {
  useRecentlyViewedStore,
  MAX_RECENTLY_VIEWED,
} from '../recentlyViewedStore';

// ── Helpers ───────────────────────────────────────────────────────────────────

function getStore() {
  return useRecentlyViewedStore.getState();
}

const flushMicrotasks = () => new Promise((resolve) => setTimeout(resolve, 0));

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useRecentlyViewedStore', () => {
  beforeEach(() => {
    useRecentlyViewedStore.setState({ items: [] });
    Object.keys(asyncStorageStore).forEach((k) => delete asyncStorageStore[k]);
  });

  describe('initial state', () => {
    it('starts with an empty history', () => {
      expect(getStore().items).toEqual([]);
    });
  });

  describe('trackView', () => {
    it('adds a new NFT id to the front of the history', () => {
      getStore().trackView('nft-1');
      expect(getStore().items.map((i) => i.nftId)).toEqual(['nft-1']);
    });

    it('adds subsequent views to the front, most recent first', () => {
      getStore().trackView('nft-1');
      getStore().trackView('nft-2');
      getStore().trackView('nft-3');

      expect(getStore().items.map((i) => i.nftId)).toEqual([
        'nft-3',
        'nft-2',
        'nft-1',
      ]);
    });

    it('records a viewedAt timestamp for each entry', () => {
      const before = Date.now();
      getStore().trackView('nft-1');
      const after = Date.now();

      const entry = getStore().items[0];
      expect(entry.viewedAt).toBeGreaterThanOrEqual(before);
      expect(entry.viewedAt).toBeLessThanOrEqual(after);
    });

    describe('de-duplication', () => {
      it('moves a re-viewed NFT to the front instead of duplicating it', () => {
        getStore().trackView('nft-1');
        getStore().trackView('nft-2');
        getStore().trackView('nft-3');
        getStore().trackView('nft-1'); // re-view

        const ids = getStore().items.map((i) => i.nftId);
        expect(ids).toEqual(['nft-1', 'nft-3', 'nft-2']);
      });

      it('does not increase history length when re-viewing the same NFT', () => {
        getStore().trackView('nft-1');
        getStore().trackView('nft-1');
        getStore().trackView('nft-1');

        expect(getStore().items).toHaveLength(1);
      });

      it('refreshes the timestamp when an NFT is re-viewed', async () => {
        getStore().trackView('nft-1');
        const firstViewedAt = getStore().items[0].viewedAt;

        await new Promise((resolve) => setTimeout(resolve, 5));
        getStore().trackView('nft-1');
        const secondViewedAt = getStore().items[0].viewedAt;

        expect(secondViewedAt).toBeGreaterThan(firstViewedAt);
      });
    });

    describe('cap', () => {
      it(`caps history at ${MAX_RECENTLY_VIEWED} entries`, () => {
        for (let i = 0; i < MAX_RECENTLY_VIEWED + 5; i++) {
          getStore().trackView(`nft-${i}`);
        }

        expect(getStore().items).toHaveLength(MAX_RECENTLY_VIEWED);
      });

      it('evicts the oldest entries first once over the cap', () => {
        for (let i = 0; i < MAX_RECENTLY_VIEWED + 3; i++) {
          getStore().trackView(`nft-${i}`);
        }

        const ids = getStore().items.map((i) => i.nftId);
        // Most recent (highest index) survive; the first 3 tracked are evicted.
        expect(ids).not.toContain('nft-0');
        expect(ids).not.toContain('nft-1');
        expect(ids).not.toContain('nft-2');
        expect(ids[0]).toBe(`nft-${MAX_RECENTLY_VIEWED + 2}`);
      });

      it('re-viewing an item while at the cap does not evict it', () => {
        for (let i = 0; i < MAX_RECENTLY_VIEWED; i++) {
          getStore().trackView(`nft-${i}`);
        }
        // Re-view the oldest surviving entry.
        getStore().trackView('nft-0');

        const ids = getStore().items.map((i) => i.nftId);
        expect(ids).toHaveLength(MAX_RECENTLY_VIEWED);
        expect(ids[0]).toBe('nft-0');
      });
    });
  });

  describe('clearHistory', () => {
    it('empties the history', () => {
      getStore().trackView('nft-1');
      getStore().trackView('nft-2');

      getStore().clearHistory();

      expect(getStore().items).toEqual([]);
    });

    it('is a no-op on an already-empty history', () => {
      getStore().clearHistory();
      expect(getStore().items).toEqual([]);
    });
  });

  describe('persistence', () => {
    it('writes the tracked NFT id to storage', async () => {
      getStore().trackView('nft-persisted');
      await flushMicrotasks();

      const raw = asyncStorageStore['recently-viewed-storage'];
      expect(raw).toBeDefined();
      expect(raw).toContain('nft-persisted');
    });

    it('removes cleared history from storage', async () => {
      getStore().trackView('nft-1');
      await flushMicrotasks();
      getStore().clearHistory();
      await flushMicrotasks();

      const raw = asyncStorageStore['recently-viewed-storage'];
      expect(raw).toBeDefined();
      expect(raw).not.toContain('nft-1');
    });
  });
});
