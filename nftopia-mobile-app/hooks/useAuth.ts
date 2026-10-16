import { useCallback, useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useWalletConnect } from './useWalletConnect';
import { Wallet } from '@/src/services/stellar/types';

export function useAuth() {
  const user = useAuthStore((s) => s.user);
  const wallet = useAuthStore((s) => s.wallet);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.loading);
  const isCheckingAuth = useAuthStore((s) => s.isCheckingAuth);
  const error = useAuthStore((s) => s.error);
  const clearError = useAuthStore((s) => s.clearError);
  const storeLoginWithWallet = useAuthStore((s) => s.loginWithWallet);
  const storeLogout = useAuthStore((s) => s.logout);

  const { activeWallet, activePublicKey } = useWalletConnect();

  /** Signs in with the given wallet, or the currently connected one if omitted. */
  const login = useCallback(
    async (walletToUse?: Wallet) => {
      const target = walletToUse ?? activeWallet;
      if (!target) {
        throw new Error('No wallet available to sign in with');
      }
      await storeLoginWithWallet(target);
    },
    [activeWallet, storeLoginWithWallet],
  );

  const logout = useCallback(() => storeLogout(), [storeLogout]);

  const authenticatedPublicKey = wallet?.publicKey;
  useEffect(() => {
    if (!isAuthenticated || !authenticatedPublicKey) return;
    if (activePublicKey === authenticatedPublicKey) return;
    // The wallet backing this session was switched or disconnected — the
    // session no longer corresponds to a wallet this device can prove it
    // controls, so end it rather than leave a stale "authenticated" state.
    void logout();
  }, [isAuthenticated, authenticatedPublicKey, activePublicKey, logout]);

  return {
    user,
    wallet,
    isAuthenticated,
    isLoading,
    isCheckingAuth,
    error,
    clearError,
    login,
    logout,
  };
}
