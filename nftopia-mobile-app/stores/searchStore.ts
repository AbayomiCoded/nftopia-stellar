import { create } from 'zustand';
import { persist, PersistOptions } from 'zustand/middleware';
import { SearchResult, SearchFilters, NFT, Collection, CreatorProfile } from '@/types';
import apiClient from '@/lib/api/sample';

interface SearchStore {
  query: string;
  results: SearchResult | null;
  filters: SearchFilters;
  loading: boolean;
  error: string | null;
  recentSearches: string[];
  debounceTimer: ReturnType<typeof setTimeout> | null;

  setQuery: (query: string) => void;
  setFilters: (filters: Partial<SearchFilters>) => void;
  search: (query: string) => Promise<void>;
  clearSearch: () => void;
  addRecentSearch: (query: string) => void;
  clearRecentSearches: () => void;
}

export const useSearchStore = create<SearchStore>()(
  persist(
    (set, get) => ({
      query: '',
      results: null,
      filters: { type: 'all', sortBy: 'relevance' },
      loading: false,
      error: null,
      recentSearches: [],
      debounceTimer: null,

      setQuery: (query: string) => {
        set({ query });
        // Clear existing debounce timer
        const { debounceTimer } = get();
        if (debounceTimer) clearTimeout(debounceTimer);
        // Set new debounce timer (400ms)
        const timer = setTimeout(() => {
          if (query.trim()) {
            get().search(query.trim());
          } else {
            set({ results: null });
          }
        }, 400);
        set({ debounceTimer: timer });
      },

      setFilters: (filters: Partial<SearchFilters>) => {
        set((state) => ({ filters: { ...state.filters, ...filters } }));
        const { query } = get();
        if (query.trim()) get().search(query.trim());
      },

      search: async (query: string) => {
        if (!query.trim()) return;
        set({ loading: true, error: null });
        try {
          const { filters } = get();
          const results = await apiClient.search(query, filters);
          set({ results, loading: false });
          get().addRecentSearch(query);
          apiClient.trackEvent('search_performed', { query, filters: filters.type });
        } catch (error: any) {
          set({ error: error.message, loading: false });
        }
      },

      clearSearch: () => {
        const { debounceTimer } = get();
        if (debounceTimer) clearTimeout(debounceTimer);
        set({ query: '', results: null, error: null });
      },

      addRecentSearch: (query: string) => {
        set((state) => {
          const searches = state.recentSearches.filter((s) => s !== query);
          return { recentSearches: [query, ...searches].slice(0, 10) };
        });
      },

      clearRecentSearches: () => {
        set({ recentSearches: [] });
      },
    }),
    {
      name: 'search-storage',
      partialize: (state: SearchStore) => ({
        recentSearches: state.recentSearches,
      }),
    } as unknown as PersistOptions<SearchStore>
  )
);