import { create } from 'zustand';
import { persist, createJSONStorage, PersistOptions } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Auction, Bid, AuctionFormData } from '@/types';
import apiClient from '@/lib/api/sample';

interface AuctionStore {
  auctions: Auction[];
  currentAuction: Auction | null;
  bidHistory: Bid[];
  watchedAuctions: string[];
  loading: boolean;
  error: string | null;
  filters: { category?: string; minPrice?: string; maxPrice?: string; status?: string };

  fetchAuctions: (filters?: any) => Promise<void>;
  fetchAuctionById: (id: string) => Promise<void>;
  createAuction: (data: AuctionFormData) => Promise<Auction>;
  placeBid: (auctionId: string, amount: string) => Promise<void>;
  fetchBidHistory: (auctionId: string) => Promise<void>;
  toggleWatch: (auctionId: string) => Promise<void>;
  setFilters: (filters: any) => void;
}

export const useAuctionStore = create<AuctionStore>()(
  persist(
    (set, get) => ({
      auctions: [],
      currentAuction: null,
      bidHistory: [],
      watchedAuctions: [],
      loading: false,
      error: null,
      filters: {},

      fetchAuctions: async (filters?: any) => {
        set({ loading: true, error: null });
        try {
          const auctions = await apiClient.getAuctions(1, 20, filters || get().filters);
          set({ auctions, loading: false });
        } catch (error: any) {
          set({ error: error.message, loading: false });
        }
      },

      fetchAuctionById: async (id: string) => {
        set({ loading: true, error: null });
        try {
          const currentAuction = await apiClient.getAuctionById(id);
          set({ currentAuction, loading: false });
        } catch (error: any) {
          set({ error: error.message, loading: false });
        }
      },

      createAuction: async (data: AuctionFormData) => {
        set({ loading: true, error: null });
        try {
          if (!data || !data.nftId || !data.nftId.trim()) {
            throw new Error('Please select an NFT');
          }
          const startPriceNum = Number(data.startPrice);
          if (!data.startPrice || isNaN(startPriceNum) || startPriceNum <= 0) {
            throw new Error('Valid start price is required');
          }
          if (data.reservePrice) {
            const reservePriceNum = Number(data.reservePrice);
            if (isNaN(reservePriceNum) || (reservePriceNum > 0 && reservePriceNum < startPriceNum)) {
              throw new Error('Reserve must be >= start price');
            }
          }
          const durationNum = Number(data.duration);
          if (data.duration === undefined || data.duration === null || isNaN(durationNum) || durationNum < 1) {
            throw new Error('Duration must be at least 1 hour');
          }

          const auction = await apiClient.createAuction(data);
          set((state) => ({ auctions: [auction, ...state.auctions], loading: false }));
          apiClient.trackEvent('auction_created', { nftId: data.nftId, duration: data.duration });
          return auction;
        } catch (error: any) {
          set({ error: error.message, loading: false });
          throw error;
        }
      },

      placeBid: async (auctionId: string, amount: string) => {
        set({ error: null });
        try {
          const numAmount = Number(amount);
          if (!amount || isNaN(numAmount) || numAmount <= 0) {
            throw new Error('Valid bid amount is required');
          }

          const { currentAuction } = get();
          if (currentAuction && currentAuction.id === auctionId) {
            const isEnded =
              currentAuction.status === 'ended' ||
              (currentAuction.endTime && new Date(currentAuction.endTime).getTime() <= Date.now());
            if (isEnded) {
              throw new Error('Cannot bid on a closed auction');
            }
            if (currentAuction.currentPrice && numAmount <= Number(currentAuction.currentPrice)) {
              throw new Error('Bid amount must be higher than current price');
            }
          }

          const bid = await apiClient.placeBid(auctionId, amount);
          set((state) => ({
            bidHistory: [bid, ...state.bidHistory],
            currentAuction: state.currentAuction
              ? { ...state.currentAuction, currentPrice: amount, bidCount: state.currentAuction.bidCount + 1 }
              : null,
          }));
          apiClient.trackEvent('bid_placed', { auctionId, amount });
        } catch (error: any) {
          set({ error: error.message });
          throw error;
        }
      },

      fetchBidHistory: async (auctionId: string) => {
        try {
          const bidHistory = await apiClient.getBidHistory(auctionId);
          set({ bidHistory });
        } catch (error: any) {
          console.error('Failed to fetch bid history:', error.message);
        }
      },

      toggleWatch: async (auctionId: string) => {
        const { watchedAuctions } = get();
        const isWatched = watchedAuctions.includes(auctionId);
        try {
          if (isWatched) {
            await apiClient.unwatchAuction(auctionId);
            set({ watchedAuctions: watchedAuctions.filter((id) => id !== auctionId) });
          } else {
            await apiClient.watchAuction(auctionId);
            set({ watchedAuctions: [...watchedAuctions, auctionId] });
          }
          apiClient.trackEvent('auction_watch_toggle', { auctionId, watching: !isWatched });
        } catch (error: any) {
          console.error('Failed to toggle watch:', error.message);
        }
      },

      setFilters: (filters: any) => {
        set({ filters });
        get().fetchAuctions(filters);
      },
    }),
    {
      name: 'auction-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state: AuctionStore) => ({
        watchedAuctions: state.watchedAuctions,
      }),
    } as unknown as PersistOptions<AuctionStore>
  )
);