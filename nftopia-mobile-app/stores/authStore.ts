import { createStore } from '@/src/utils/store.factory';
import { AuthStore, User } from '@/types/auth';

export const VERSION = 2;

// Migrations for auth store
const migrations = [
  {
    version: 1,
    up: (state: any) => {
      // Add isCreator field if missing
      return {
        ...state,
        isCreator: state.user?.isCreator || false,
      };
    },
  },
  {
    version: 2,
    up: (state: any) => {
      // Add lastLogin field
      return {
        ...state,
        lastLogin: state.lastLogin || new Date().toISOString(),
      };
    },
  },
];

const initialState = {
  user: null,
  loading: false,
  isAuthenticated: false,
  isCreator: false,
  error: null,
  isCheckingAuth: true,
  lastLogin: null,
};

export const useAuthStore = createStore<AuthStore>({
  name: 'auth-store',
  initialState: initialState as AuthStore,
  actions: (set, get) => ({
    ...initialState,

    // State Management Actions
    setUser: (user: User | null) =>
      set({
        user,
        isAuthenticated: !!user,
        isCreator: user?.isCreator || false,
        lastLogin: user ? new Date().toISOString() : get().lastLogin,
      }),

    setLoading: (loading: boolean) => set({ loading }),
    setError: (error: string | null) => set({ error }),
    clearError: () => set({ error: null }),
    setIsCheckingAuth: (isChecking: boolean) => set({ isCheckingAuth: isChecking }),
    setIsCreator: (isCreator: boolean) => set({ isCreator }),

    // Authentication Actions
    initializeAuth: async () => {
      set({ isCheckingAuth: true, loading: true });
      // Auth initialization will be handled by the store's persistence
      set({ isCheckingAuth: false, loading: false });
    },

    logout: async () => {
      try {
        set({ loading: true });
        set({
          user: null,
          isAuthenticated: false,
          isCreator: false,
          loading: false,
          error: null,
        });
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : 'Failed to logout',
          loading: false,
        });
      }
    },

    // Navigation Actions
    navigateToScreen: (_screen: string) => {
      // Will be handled by React Navigation
    },

    goBack: () => {
      // Will be handled by React Navigation
    },

    resetToScreen: (_screen: string) => {
      // Will be handled by React Navigation
    },
  }),
  persist: {
    enabled: true,
    name: 'auth-storage',
    version: VERSION,
    migrate: async (state: any, version: number) => {
      let migratedState = state;
      for (const migration of migrations) {
        if (migration.version > version) {
          migratedState = await migration.up(migratedState);
        }
      }
      return migratedState;
    },
    partialize: (state: AuthStore) => ({
      user: state.user,
      isAuthenticated: state.isAuthenticated,
      isCreator: state.isCreator,
      lastLogin: state.lastLogin,
    }),
    storage: 'secure', // Use secure storage for auth
  },
  devtools: {
    enabled: __DEV__,
    name: 'AuthStore',
  },
});

// Hook for using auth state
export const useAuth = () =>
  useAuthStore((state) => ({
    user: state.user,
    loading: state.loading,
    isAuthenticated: state.isAuthenticated,
    error: state.error,
    isCheckingAuth: state.isCheckingAuth,
    setUser: state.setUser,
    setLoading: state.setLoading,
    setError: state.setError,
    clearError: state.clearError,
    initializeAuth: state.initializeAuth,
    logout: state.logout,
  }));