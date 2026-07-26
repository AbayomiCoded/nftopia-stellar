import { create } from 'zustand';
import { persist, PersistOptions } from 'zustand/middleware';
import { NFT, Collection, DashboardStats, ActivityEvent, Transaction } from '@/types';
import apiClient from '@/lib/api/sample';

interface CreatorStore {
  // Dashboard
  stats: DashboardStats | null;
  activityFeed: ActivityEvent[];
  statsLoading: boolean;
  statsError: string | null;

  // NFTs
  nfts: NFT[];
  nftsLoading: boolean;
  nftsError: string | null;

  // Collections
  collections: Collection[];
  collectionsLoading: boolean;
  collectionsError: string | null;

  // Earnings
  totalEarnings: string;
  pendingEarnings: string;
  totalSales: number;
  transactions: Transaction[];
  earningsLoading: boolean;
  earningsError: string | null;

  // Actions
  fetchDashboardStats: () => Promise<void>;
  fetchActivityFeed: () => Promise<void>;
  fetchMyNFTs: () => Promise<void>;
  fetchMyCollections: () => Promise<void>;
  fetchEarnings: () => Promise<void>;
  fetchTransactions: () => Promise<void>;
  refreshAll: () => Promise<void>;
}

export const useCreatorStore = create<CreatorStore>()(
  persist(
    (set, get) => ({
      // Initial state
      stats: null,
      activityFeed: [],
      statsLoading: false,
      statsError: null,
      nfts: [],
      nftsLoading: false,
      nftsError: null,
      collections: [],
      collectionsLoading: false,
      collectionsError: null,
      totalEarnings: '0',
      pendingEarnings: '0',
      totalSales: 0,
      transactions: [],
      earningsLoading: false,
      earningsError: null,

      fetchDashboardStats: async () => {
        set({ statsLoading: true, statsError: null });
        try {
          const stats = await apiClient.getDashboardStats();
          set({ stats, statsLoading: false });
        } catch (error: any) {
          set({ statsError: error.message, statsLoading: false });
        }
      },

      fetchActivityFeed: async () => {
        try {
          const activityFeed = await apiClient.getActivityFeed();
          set({ activityFeed });
        } catch (error: any) {
          console.error('Failed to fetch activity feed:', error.message);
        }
      },

      fetchMyNFTs: async () => {
        set({ nftsLoading: true, nftsError: null });
        try {
          const nfts = await apiClient.getMyNFTs();
          set({ nfts, nftsLoading: false });
        } catch (error: any) {
          set({ nftsError: error.message, nftsLoading: false });
        }
      },

      fetchMyCollections: async () => {
        set({ collectionsLoading: true, collectionsError: null });
        try {
          const collections = await apiClient.getMyCollections();
          set({ collections, collectionsLoading: false });
        } catch (error: any) {
          set({ collectionsError: error.message, collectionsLoading: false });
        }
      },

      fetchEarnings: async () => {
        set({ earningsLoading: true, earningsError: null });
        try {
          const earnings = await apiClient.getEarnings();
          set({
            totalEarnings: earnings.totalEarnings,
            pendingEarnings: earnings.pendingEarnings,
            totalSales: earnings.totalSales,
            earningsLoading: false,
          });
        } catch (error: any) {
          set({ earningsError: error.message, earningsLoading: false });
        }
      },

      fetchTransactions: async () => {
        try {
          const transactions = await apiClient.getTransactions();
          set({ transactions });
        } catch (error: any) {
          console.error('Failed to fetch transactions:', error.message);
        }
      },

      refreshAll: async () => {
        await Promise.all([
          get().fetchDashboardStats(),
          get().fetchActivityFeed(),
          get().fetchMyNFTs(),
          get().fetchMyCollections(),
          get().fetchEarnings(),
          get().fetchTransactions(),
        ]);
      },
    }),
    {
      name: 'creator-storage',
      partialize: (state: CreatorStore) => ({
        stats: state.stats,
        nfts: state.nfts,
        collections: state.collections,
        totalEarnings: state.totalEarnings,
        pendingEarnings: state.pendingEarnings,
        totalSales: state.totalSales,
        transactions: state.transactions,
      }),
    } as unknown as PersistOptions<CreatorStore>
  )
);