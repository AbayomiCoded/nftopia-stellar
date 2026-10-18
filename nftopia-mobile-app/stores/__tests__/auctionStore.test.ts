// ── Mocks ─────────────────────────────────────────────────────────────────────

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

jest.mock('@/lib/api/sample', () => ({
  __esModule: true,
  default: {
    getAuctions: jest.fn(),
    getAuctionById: jest.fn(),
    createAuction: jest.fn(),
    placeBid: jest.fn(),
    getBidHistory: jest.fn(),
    watchAuction: jest.fn(),
    unwatchAuction: jest.fn(),
    trackEvent: jest.fn(),
  },
}));

// ── Imports (after mocks) ─────────────────────────────────────────────────────

import { useAuctionStore } from '../auctionStore';
import apiClient from '@/lib/api/sample';
import { Auction, Bid, AuctionFormData } from '@/types';

const mockedApiClient = apiClient as jest.Mocked<typeof apiClient>;

function getStore() {
  return useAuctionStore.getState();
}

const flushMicrotasks = () => new Promise((resolve) => setTimeout(resolve, 0));

// ── Test Fixtures ─────────────────────────────────────────────────────────────

const mockAuction: Auction = {
  id: 'auction-1',
  nftId: 'nft-101',
  nftName: 'Cosmic Nebula #42',
  nftImage: 'https://example.com/nft.png',
  creatorId: 'creator-1',
  creatorName: 'StellaArtist',
  creatorAvatar: 'https://example.com/avatar.png',
  startPrice: '100',
  currentPrice: '150',
  reservePrice: '200',
  currency: 'XLM',
  startTime: '2026-10-01T00:00:00.000Z',
  endTime: new Date(Date.now() + 86400000).toISOString(), // 24h in future
  status: 'active',
  bidCount: 5,
  topBidder: 'bidder-99',
  isWatched: false,
};

const mockEndedAuction: Auction = {
  ...mockAuction,
  id: 'auction-ended-1',
  endTime: '2026-09-01T00:00:00.000Z', // in the past
  status: 'ended',
  currentPrice: '500',
};

const mockBid: Bid = {
  id: 'bid-100',
  auctionId: 'auction-1',
  bidderId: 'user-1',
  bidderName: 'CryptoWhale',
  bidderAvatar: 'https://example.com/whale.png',
  amount: '200',
  currency: 'XLM',
  timestamp: new Date().toISOString(),
  isWinning: true,
};

describe('useAuctionStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuctionStore.setState({
      auctions: [],
      currentAuction: null,
      bidHistory: [],
      watchedAuctions: [],
      loading: false,
      error: null,
      filters: {},
    });
    Object.keys(asyncStorageStore).forEach((k) => delete asyncStorageStore[k]);
  });

  // ── Initial State ───────────────────────────────────────────────────────────

  describe('Initial State', () => {
    it('initializes with default state values', () => {
      const state = getStore();
      expect(state.auctions).toEqual([]);
      expect(state.currentAuction).toBeNull();
      expect(state.bidHistory).toEqual([]);
      expect(state.watchedAuctions).toEqual([]);
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.filters).toEqual({});
    });
  });

  // ── fetchAuctions ───────────────────────────────────────────────────────────

  describe('fetchAuctions', () => {
    it('successfully fetches auctions and updates state', async () => {
      mockedApiClient.getAuctions.mockResolvedValueOnce([mockAuction]);

      const fetchPromise = getStore().fetchAuctions();
      expect(getStore().loading).toBe(true);
      expect(getStore().error).toBeNull();

      await fetchPromise;

      expect(mockedApiClient.getAuctions).toHaveBeenCalledWith(1, 20, {});
      expect(getStore().auctions).toEqual([mockAuction]);
      expect(getStore().loading).toBe(false);
      expect(getStore().error).toBeNull();
    });

    it('passes custom filters to apiClient.getAuctions', async () => {
      mockedApiClient.getAuctions.mockResolvedValueOnce([mockAuction]);

      const filters = { status: 'active', minPrice: '50' };
      await getStore().fetchAuctions(filters);

      expect(mockedApiClient.getAuctions).toHaveBeenCalledWith(1, 20, filters);
      expect(getStore().auctions).toEqual([mockAuction]);
    });

    it('falls back to store filters when no arguments are provided', async () => {
      useAuctionStore.setState({ filters: { category: 'art' } });
      mockedApiClient.getAuctions.mockResolvedValueOnce([mockAuction]);

      await getStore().fetchAuctions();

      expect(mockedApiClient.getAuctions).toHaveBeenCalledWith(1, 20, { category: 'art' });
    });

    it('handles API error cleanly and sets error message', async () => {
      mockedApiClient.getAuctions.mockRejectedValueOnce(new Error('Network error'));

      await getStore().fetchAuctions();

      expect(getStore().auctions).toEqual([]);
      expect(getStore().loading).toBe(false);
      expect(getStore().error).toBe('Network error');
    });
  });

  // ── fetchAuctionById ────────────────────────────────────────────────────────

  describe('fetchAuctionById', () => {
    it('successfully fetches an auction by id and updates currentAuction', async () => {
      mockedApiClient.getAuctionById.mockResolvedValueOnce(mockAuction);

      const fetchPromise = getStore().fetchAuctionById('auction-1');
      expect(getStore().loading).toBe(true);

      await fetchPromise;

      expect(mockedApiClient.getAuctionById).toHaveBeenCalledWith('auction-1');
      expect(getStore().currentAuction).toEqual(mockAuction);
      expect(getStore().loading).toBe(false);
      expect(getStore().error).toBeNull();
    });

    it('handles API error when fetching auction by id fails', async () => {
      mockedApiClient.getAuctionById.mockRejectedValueOnce(new Error('Auction not found'));

      await getStore().fetchAuctionById('auction-missing');

      expect(getStore().currentAuction).toBeNull();
      expect(getStore().loading).toBe(false);
      expect(getStore().error).toBe('Auction not found');
    });
  });

  // ── createAuction ───────────────────────────────────────────────────────────

  describe('createAuction', () => {
    const validFormData: AuctionFormData = {
      nftId: 'nft-101',
      startPrice: '100',
      reservePrice: '150',
      currency: 'XLM',
      duration: 24,
    };

    it('successfully creates an auction, prepends it to auctions, and tracks telemetry', async () => {
      const createdAuction: Auction = { ...mockAuction, id: 'auction-created' };
      mockedApiClient.createAuction.mockResolvedValueOnce(createdAuction);

      const result = await getStore().createAuction(validFormData);

      expect(mockedApiClient.createAuction).toHaveBeenCalledWith(validFormData);
      expect(result).toEqual(createdAuction);
      expect(getStore().auctions[0]).toEqual(createdAuction);
      expect(getStore().loading).toBe(false);
      expect(getStore().error).toBeNull();
      expect(mockedApiClient.trackEvent).toHaveBeenCalledWith('auction_created', {
        nftId: 'nft-101',
        duration: 24,
      });
    });

    it('prepends new auction to existing auctions without wiping others', async () => {
      useAuctionStore.setState({ auctions: [mockAuction] });
      const newAuction: Auction = { ...mockAuction, id: 'auction-2' };
      mockedApiClient.createAuction.mockResolvedValueOnce(newAuction);

      await getStore().createAuction(validFormData);

      expect(getStore().auctions).toHaveLength(2);
      expect(getStore().auctions[0]).toEqual(newAuction);
      expect(getStore().auctions[1]).toEqual(mockAuction);
    });

    it('re-throws error and updates store error when API call fails', async () => {
      mockedApiClient.createAuction.mockRejectedValueOnce(new Error('Failed to create on chain'));

      await expect(getStore().createAuction(validFormData)).rejects.toThrow('Failed to create on chain');

      expect(getStore().loading).toBe(false);
      expect(getStore().error).toBe('Failed to create on chain');
    });

    describe('creation validation', () => {
      it('rejects when nftId is missing or empty', async () => {
        const invalidData = { ...validFormData, nftId: '' };

        await expect(getStore().createAuction(invalidData)).rejects.toThrow('Please select an NFT');
        expect(mockedApiClient.createAuction).not.toHaveBeenCalled();
        expect(getStore().error).toBe('Please select an NFT');
        expect(getStore().loading).toBe(false);
      });

      it('rejects when startPrice is missing, zero, or non-numeric', async () => {
        await expect(getStore().createAuction({ ...validFormData, startPrice: '' })).rejects.toThrow(
          'Valid start price is required'
        );
        await expect(getStore().createAuction({ ...validFormData, startPrice: '0' })).rejects.toThrow(
          'Valid start price is required'
        );
        await expect(getStore().createAuction({ ...validFormData, startPrice: '-10' })).rejects.toThrow(
          'Valid start price is required'
        );
        await expect(getStore().createAuction({ ...validFormData, startPrice: 'abc' })).rejects.toThrow(
          'Valid start price is required'
        );

        expect(mockedApiClient.createAuction).not.toHaveBeenCalled();
      });

      it('rejects when reservePrice is provided and is less than startPrice', async () => {
        const invalidData = { ...validFormData, startPrice: '100', reservePrice: '50' };

        await expect(getStore().createAuction(invalidData)).rejects.toThrow('Reserve must be >= start price');
        expect(mockedApiClient.createAuction).not.toHaveBeenCalled();
        expect(getStore().error).toBe('Reserve must be >= start price');
      });

      it('accepts when reservePrice is equal to or greater than startPrice', async () => {
        mockedApiClient.createAuction.mockResolvedValueOnce(mockAuction);
        await getStore().createAuction({ ...validFormData, startPrice: '100', reservePrice: '100' });
        expect(mockedApiClient.createAuction).toHaveBeenCalled();
      });

      it('accepts when reservePrice is omitted', async () => {
        mockedApiClient.createAuction.mockResolvedValueOnce(mockAuction);
        await getStore().createAuction({ ...validFormData, reservePrice: undefined });
        expect(mockedApiClient.createAuction).toHaveBeenCalled();
      });

      it('rejects when duration is missing or less than 1 hour', async () => {
        await expect(getStore().createAuction({ ...validFormData, duration: 0 })).rejects.toThrow(
          'Duration must be at least 1 hour'
        );
        await expect(getStore().createAuction({ ...validFormData, duration: -5 })).rejects.toThrow(
          'Duration must be at least 1 hour'
        );

        expect(mockedApiClient.createAuction).not.toHaveBeenCalled();
      });
    });
  });

  // ── placeBid ────────────────────────────────────────────────────────────────

  describe('placeBid', () => {
    it('successfully places a bid and optimistically updates currentAuction without a full refetch', async () => {
      useAuctionStore.setState({
        currentAuction: { ...mockAuction, currentPrice: '150', bidCount: 5 },
        bidHistory: [],
      });

      const newBid: Bid = {
        ...mockBid,
        amount: '180',
      };
      mockedApiClient.placeBid.mockResolvedValueOnce(newBid);

      await getStore().placeBid('auction-1', '180');

      expect(mockedApiClient.placeBid).toHaveBeenCalledWith('auction-1', '180');
      // Verify optimistic update without refetch
      expect(mockedApiClient.getAuctionById).not.toHaveBeenCalled();
      expect(getStore().currentAuction?.currentPrice).toBe('180');
      expect(getStore().currentAuction?.bidCount).toBe(6);
      expect(getStore().bidHistory).toEqual([newBid]);
      expect(mockedApiClient.trackEvent).toHaveBeenCalledWith('bid_placed', {
        auctionId: 'auction-1',
        amount: '180',
      });
      expect(getStore().error).toBeNull();
    });

    it('successfully prepends to existing bidHistory', async () => {
      const existingBid: Bid = { ...mockBid, id: 'bid-old', amount: '120' };
      useAuctionStore.setState({
        currentAuction: { ...mockAuction, currentPrice: '120', bidCount: 1 },
        bidHistory: [existingBid],
      });

      const nextBid: Bid = { ...mockBid, id: 'bid-new', amount: '160' };
      mockedApiClient.placeBid.mockResolvedValueOnce(nextBid);

      await getStore().placeBid('auction-1', '160');

      expect(getStore().bidHistory).toEqual([nextBid, existingBid]);
      expect(getStore().currentAuction?.currentPrice).toBe('160');
      expect(getStore().currentAuction?.bidCount).toBe(2);
    });

    it('works when currentAuction is null (e.g. called from a list or deep link)', async () => {
      useAuctionStore.setState({ currentAuction: null, bidHistory: [] });
      mockedApiClient.placeBid.mockResolvedValueOnce(mockBid);

      await getStore().placeBid('auction-1', '200');

      expect(getStore().bidHistory).toEqual([mockBid]);
      expect(getStore().currentAuction).toBeNull();
    });

    it('handles API error, sets error state, does not modify currentAuction or bidHistory, and rethrows', async () => {
      const originalAuction = { ...mockAuction, currentPrice: '150', bidCount: 5 };
      useAuctionStore.setState({
        currentAuction: originalAuction,
        bidHistory: [mockBid],
      });

      mockedApiClient.placeBid.mockRejectedValueOnce(new Error('Insufficient balance to place bid'));

      await expect(getStore().placeBid('auction-1', '200')).rejects.toThrow('Insufficient balance to place bid');

      expect(getStore().error).toBe('Insufficient balance to place bid');
      expect(getStore().currentAuction).toEqual(originalAuction);
      expect(getStore().bidHistory).toEqual([mockBid]);
    });

    describe('bid placement edge cases & validation', () => {
      it('rejects when bid amount is empty, zero, negative, or non-numeric', async () => {
        useAuctionStore.setState({ currentAuction: mockAuction });

        await expect(getStore().placeBid('auction-1', '')).rejects.toThrow('Valid bid amount is required');
        await expect(getStore().placeBid('auction-1', '0')).rejects.toThrow('Valid bid amount is required');
        await expect(getStore().placeBid('auction-1', '-50')).rejects.toThrow('Valid bid amount is required');
        await expect(getStore().placeBid('auction-1', 'invalid')).rejects.toThrow('Valid bid amount is required');

        expect(mockedApiClient.placeBid).not.toHaveBeenCalled();
        expect(getStore().error).toBe('Valid bid amount is required');
      });

      it('rejects when bidding below or equal to the current highest price', async () => {
        useAuctionStore.setState({
          currentAuction: { ...mockAuction, currentPrice: '150' },
        });

        // Bidding below current price
        await expect(getStore().placeBid('auction-1', '140')).rejects.toThrow(
          'Bid amount must be higher than current price'
        );
        expect(mockedApiClient.placeBid).not.toHaveBeenCalled();
        expect(getStore().error).toBe('Bid amount must be higher than current price');

        // Bidding equal to current price
        await expect(getStore().placeBid('auction-1', '150')).rejects.toThrow(
          'Bid amount must be higher than current price'
        );
        expect(mockedApiClient.placeBid).not.toHaveBeenCalled();
      });

      it('rejects when bidding on an auction with status "ended"', async () => {
        useAuctionStore.setState({
          currentAuction: { ...mockAuction, status: 'ended' },
        });

        await expect(getStore().placeBid('auction-1', '200')).rejects.toThrow('Cannot bid on a closed auction');
        expect(mockedApiClient.placeBid).not.toHaveBeenCalled();
        expect(getStore().error).toBe('Cannot bid on a closed auction');
      });

      it('rejects when bidding on an auction whose endTime has already passed', async () => {
        useAuctionStore.setState({
          currentAuction: {
            ...mockAuction,
            status: 'active',
            endTime: new Date(Date.now() - 60000).toISOString(), // 1 minute in past
          },
        });

        await expect(getStore().placeBid('auction-1', '200')).rejects.toThrow('Cannot bid on a closed auction');
        expect(mockedApiClient.placeBid).not.toHaveBeenCalled();
        expect(getStore().error).toBe('Cannot bid on a closed auction');
      });
    });
  });

  // ── fetchBidHistory ─────────────────────────────────────────────────────────

  describe('fetchBidHistory', () => {
    it('successfully fetches and stores bid history', async () => {
      mockedApiClient.getBidHistory.mockResolvedValueOnce([mockBid]);

      await getStore().fetchBidHistory('auction-1');

      expect(mockedApiClient.getBidHistory).toHaveBeenCalledWith('auction-1');
      expect(getStore().bidHistory).toEqual([mockBid]);
    });

    it('catches and logs error cleanly without throwing when API fails', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      mockedApiClient.getBidHistory.mockRejectedValueOnce(new Error('Failed to load bids'));

      await getStore().fetchBidHistory('auction-1');

      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to fetch bid history:', 'Failed to load bids');
      expect(getStore().bidHistory).toEqual([]);
      consoleErrorSpy.mockRestore();
    });
  });

  // ── toggleWatch ─────────────────────────────────────────────────────────────

  describe('toggleWatch', () => {
    it('adds auctionId to watchedAuctions and calls watchAuction when not watched', async () => {
      useAuctionStore.setState({ watchedAuctions: [] });
      mockedApiClient.watchAuction.mockResolvedValueOnce(undefined);

      await getStore().toggleWatch('auction-1');

      expect(mockedApiClient.watchAuction).toHaveBeenCalledWith('auction-1');
      expect(getStore().watchedAuctions).toEqual(['auction-1']);
      expect(mockedApiClient.trackEvent).toHaveBeenCalledWith('auction_watch_toggle', {
        auctionId: 'auction-1',
        watching: true,
      });
    });

    it('removes auctionId from watchedAuctions and calls unwatchAuction when already watched', async () => {
      useAuctionStore.setState({ watchedAuctions: ['auction-1', 'auction-2'] });
      mockedApiClient.unwatchAuction.mockResolvedValueOnce(undefined);

      await getStore().toggleWatch('auction-1');

      expect(mockedApiClient.unwatchAuction).toHaveBeenCalledWith('auction-1');
      expect(getStore().watchedAuctions).toEqual(['auction-2']);
      expect(mockedApiClient.trackEvent).toHaveBeenCalledWith('auction_watch_toggle', {
        auctionId: 'auction-1',
        watching: false,
      });
    });

    it('catches and logs error cleanly without throwing when watch toggle fails', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      useAuctionStore.setState({ watchedAuctions: [] });
      mockedApiClient.watchAuction.mockRejectedValueOnce(new Error('Network timeout'));

      await getStore().toggleWatch('auction-1');

      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to toggle watch:', 'Network timeout');
      expect(getStore().watchedAuctions).toEqual([]);
      consoleErrorSpy.mockRestore();
    });
  });

  // ── setFilters ──────────────────────────────────────────────────────────────

  describe('setFilters', () => {
    it('updates filters state and triggers fetchAuctions with the new filters', () => {
      mockedApiClient.getAuctions.mockResolvedValueOnce([]);
      const newFilters = { category: 'photography', status: 'active' };

      getStore().setFilters(newFilters);

      expect(getStore().filters).toEqual(newFilters);
      expect(mockedApiClient.getAuctions).toHaveBeenCalledWith(1, 20, newFilters);
    });
  });

  // ── Persistence & Lifecycle ─────────────────────────────────────────────────

  describe('persistence and lifecycle', () => {
    it('persists watchedAuctions to asyncStorage under auction-storage key', async () => {
      useAuctionStore.setState({
        watchedAuctions: ['auction-10', 'auction-20'],
        auctions: [mockAuction],
        currentAuction: mockAuction,
        loading: true,
        error: 'temp error',
      });

      await flushMicrotasks();

      const raw = asyncStorageStore['auction-storage'];
      expect(raw).toBeDefined();

      const parsed = JSON.parse(raw);
      expect(parsed.state).toEqual({
        watchedAuctions: ['auction-10', 'auction-20'],
      });
      // Verifies that volatile states (auctions, currentAuction, loading, error) are NOT persisted
      expect(parsed.state.auctions).toBeUndefined();
      expect(parsed.state.currentAuction).toBeUndefined();
      expect(parsed.state.loading).toBeUndefined();
      expect(parsed.state.error).toBeUndefined();
    });

    it('properly handles auction closed/settled state in auctions list', async () => {
      mockedApiClient.getAuctions.mockResolvedValueOnce([mockEndedAuction]);

      await getStore().fetchAuctions({ status: 'ended' });

      expect(getStore().auctions).toHaveLength(1);
      expect(getStore().auctions[0].status).toBe('ended');
      expect(getStore().auctions[0].id).toBe('auction-ended-1');
    });
  });
});
