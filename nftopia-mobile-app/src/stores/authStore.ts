import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Wallet } from '../services/stellar/types';
import { SecureStorage } from '../services/stellar/secureStorage';
import { AuthState, User } from './types';
import { deepLinkService } from '@/src/services/deepLink.service';

const secureStorage = new SecureStorage();

const AUTH_TOKEN_KEY = 'nftopia_auth_token';

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      wallet: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      sessionExpiryTime: null,
      warningThreshold: 300, // 5 minutes in seconds
      showExpiryWarning: false,
      isLocked: false,
      lockTimeout: 60, // 1 minute in seconds
      failedUnlockAttempts: 0,
      lockoutUntil: null,
      appLockEnabled: true,

      // Simple setters
      setUser: (user) => set({ user }),
      setWallet: (wallet) => set({ wallet }),
      setAuthenticated: (value) => set({ isAuthenticated: value }),
      setLoading: (value) => set({ isLoading: value }),
      setError: (error) => set({ error }),
      clearError: () => set({ error: null }),
      setSessionExpiryTime: (time) => set({ sessionExpiryTime: time }),
      setShowExpiryWarning: (show) => set({ showExpiryWarning: show }),
      setWarningThreshold: (seconds) => set({ warningThreshold: seconds }),
      setLocked: (locked) => set({ isLocked: locked }),
      setLockTimeout: (seconds) => set({ lockTimeout: seconds }),
      setFailedUnlockAttempts: (attempts) => set({ failedUnlockAttempts: attempts }),
      setLockoutUntil: (time) => set({ lockoutUntil: time }),
      setAppLockEnabled: (enabled) => set({ appLockEnabled: enabled }),

      // Login with email and password
      loginWithEmail: async (email, password) => {
        if (get().isLoading) return;
        set({ isLoading: true, error: null });
        try {
          // TODO: replace with real auth service call when available
          // const { user, token } = await authService.loginWithEmail(email, password);
          // await AsyncStorage.setItem(AUTH_TOKEN_KEY, token);
          // set({ user, isAuthenticated: true });
          // Notify deep link service
          // deepLinkService.setAuthenticated(true);
          // Check for pending deep link
          // const pendingLink = deepLinkService.getPendingDeepLink();
          // if (pendingLink) {
          //   deepLinkService.processDeepLink(pendingLink);
          //   deepLinkService.clearPendingDeepLink();
          // }
          throw new Error('Email login not yet implemented');
        } catch (err) {
          set({ error: (err as Error).message });
        } finally {
          set({ isLoading: false });
        }
      },

      // Login with an existing Stellar wallet
      loginWithWallet: async (wallet: Wallet) => {
        if (get().isLoading) return;
        set({ isLoading: true, error: null });
        try {
          await secureStorage.saveWallet(wallet);
          const now = Math.floor(Date.now() / 1000);
          // Set session expiry to 1 hour from now (configurable)
          set({ wallet, isAuthenticated: true, sessionExpiryTime: now + 3600 });

          // Notify deep link service
          deepLinkService.setAuthenticated(true);

          // Check for pending deep link
          const pendingLink = deepLinkService.getPendingDeepLink();
          if (pendingLink) {
            deepLinkService.processDeepLink(pendingLink);
            deepLinkService.clearPendingDeepLink();
          }
        } catch (err) {
          set({ error: (err as Error).message });
        } finally {
          set({ isLoading: false });
        }
      },

      // Register a new account with email and password
      registerWithEmail: async (email, password, username) => {
        if (get().isLoading) return;
        set({ isLoading: true, error: null });
        try {
          // TODO: replace with real auth service call when available
          // const { user, token } = await authService.register(email, password, username);
          // await AsyncStorage.setItem(AUTH_TOKEN_KEY, token);
          // set({ user, isAuthenticated: true });
          // Notify deep link service
          // deepLinkService.setAuthenticated(true);
          // const pendingLink = deepLinkService.getPendingDeepLink();
          // if (pendingLink) {
          //   deepLinkService.processDeepLink(pendingLink);
          //   deepLinkService.clearPendingDeepLink();
          // }
          throw new Error('Email registration not yet implemented');
        } catch (err) {
          set({ error: (err as Error).message });
        } finally {
          set({ isLoading: false });
        }
      },

      // Logout: clear all auth state and stored credentials
      logout: async () => {
        set({ isLoading: true, error: null });
        try {
          await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
          await secureStorage.deleteWallet();
          
          // Notify deep link service
          deepLinkService.setAuthenticated(false);
          deepLinkService.clearPendingDeepLink();
        } catch {
          // Ignore storage errors on logout to ensure state is always cleared
        } finally {
          set({ user: null, wallet: null, isAuthenticated: false, isLoading: false });
        }
      },

      // Check if a valid auth session exists (wallet or token)
      checkAuth: async () => {
        set({ isLoading: true, error: null });
        try {
          const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
          if (token) {
            // TODO: validate token with auth service when available
            // const user = await authService.validateToken(token);
            // set({ user, isAuthenticated: true });
            set({ isAuthenticated: true });

            // Notify deep link service
            deepLinkService.setAuthenticated(true);

            // Check for pending deep link
            const pendingLink = deepLinkService.getPendingDeepLink();
            if (pendingLink) {
              deepLinkService.processDeepLink(pendingLink);
              deepLinkService.clearPendingDeepLink();
            }

            return true;
          }

          const hasWallet = await secureStorage.hasWallet();
          if (hasWallet) {
            const wallet = await secureStorage.getWallet();
            set({ wallet, isAuthenticated: true });

            // Notify deep link service
            deepLinkService.setAuthenticated(true);

            // Check for pending deep link
            const pendingLink = deepLinkService.getPendingDeepLink();
            if (pendingLink) {
              deepLinkService.processDeepLink(pendingLink);
              deepLinkService.clearPendingDeepLink();
            }

            return true;
          }

          set({ isAuthenticated: false });
          // Notify deep link service
          deepLinkService.setAuthenticated(false);

          return false;
        } catch (err) {
          set({ error: (err as Error).message, isAuthenticated: false });
          // Notify deep link service
          deepLinkService.setAuthenticated(false);
          return false;
        } finally {
          set({ isLoading: false });
        }
      },

      // Extend the current session
      extendSession: async () => {
        try {
          // TODO: Implement token refresh with auth service
          // const newToken = await authService.refreshToken();
          // await AsyncStorage.setItem(AUTH_TOKEN_KEY, newToken);
          // Update session expiry time
          const now = Math.floor(Date.now() / 1000);
          // Assuming 1 hour session extension
          set({ sessionExpiryTime: now + 3600, showExpiryWarning: false });
        } catch (err) {
          set({ error: (err as Error).message });
        }
      },

      // Get time remaining until session expiry (in seconds)
      getSessionTimeRemaining: () => {
        const { sessionExpiryTime } = get();
        if (!sessionExpiryTime) return null;

        const now = Math.floor(Date.now() / 1000);
        const remaining = sessionExpiryTime - now;
        return remaining > 0 ? remaining : 0;
      },

      // Check if session is expired
      checkSessionExpiry: () => {
        const remaining = get().getSessionTimeRemaining();
        return remaining === null ? false : remaining <= 0;
      },

      // Lock the app
      lockApp: () => {
        set({ isLocked: true });
      },

      // Unlock the app
      unlockApp: async (pin?: string): Promise<boolean> => {
        const { isInLockout, failedUnlockAttempts, appLockEnabled } = get();

        // Check if app lock is enabled
        if (!appLockEnabled) {
          set({ isLocked: false });
          return true;
        }

        // Check if in lockout period
        if (isInLockout()) {
          return false;
        }

        // TODO: Implement PIN verification when PIN is set
        // For now, accept any PIN or biometric success
        try {
          // If PIN is provided, verify it (when PIN storage is implemented)
          if (pin) {
            // PIN verification logic would go here
            // For now, we'll just increment attempts on failure
            set({ failedUnlockAttempts: failedUnlockAttempts + 1 });

            // If too many failed attempts, trigger lockout
            if (failedUnlockAttempts + 1 >= 5) {
              const lockoutTime = Date.now() + 30000; // 30 seconds lockout
              set({ lockoutUntil: lockoutTime, failedUnlockAttempts: 0 });
              return false;
            }
            return false;
          }

          // If no PIN provided, assume biometric success (handled by the UI component)
          set({ isLocked: false, failedUnlockAttempts: 0 });
          return true;
        } catch (error) {
          set({ error: (error as Error).message });
          return false;
        }
      },

      // Reset failed unlock attempts
      resetFailedAttempts: () => {
        set({ failedUnlockAttempts: 0, lockoutUntil: null });
      },

      // Check if currently in lockout period
      isInLockout: () => {
        const { lockoutUntil } = get();
        if (!lockoutUntil) return false;
        return Date.now() < lockoutUntil;
      },

      // Get remaining lockout time in seconds
      getLockoutRemaining: () => {
        const { lockoutUntil } = get();
        if (!lockoutUntil) return 0;
        const remaining = Math.ceil((lockoutUntil - Date.now()) / 1000);
        return remaining > 0 ? remaining : 0;
      },
    }),
    {
      name: 'nftopia-auth-storage',
      storage: createJSONStorage(() => ({
        getItem: async (key: string) => {
          try {
            return await AsyncStorage.getItem(key);
          } catch {
            return null;
          }
        },
        setItem: async (key: string, value: string) => {
          try {
            await AsyncStorage.setItem(key, value);
          } catch {
            // Persisting is best-effort; in-memory state stays authoritative for this session.
          }
        },
        removeItem: async (key: string) => {
          try {
            await AsyncStorage.removeItem(key);
          } catch {
            // Persisting is best-effort; in-memory state stays authoritative for this session.
          }
        },
      })),
      // Only persist non-sensitive state; credentials are managed by SecureStorage
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        appLockEnabled: state.appLockEnabled,
        lockTimeout: state.lockTimeout,
      }),
    },
  ),
);