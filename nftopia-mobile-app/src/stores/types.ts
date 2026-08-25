import { Wallet } from '../services/stellar/types';

export interface User {
  id: string;
  email: string;
  username: string;
}

export interface AuthState {
  // State
  user: User | null;
  wallet: Wallet | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  sessionExpiryTime: number | null;
  warningThreshold: number;
  showExpiryWarning: boolean;
  isLocked: boolean;
  lockTimeout: number;
  failedUnlockAttempts: number;
  lockoutUntil: number | null;
  appLockEnabled: boolean;

  // Simple setters
  setUser: (user: User | null) => void;
  setWallet: (wallet: Wallet | null) => void;
  setAuthenticated: (value: boolean) => void;
  setLoading: (value: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  setSessionExpiryTime: (time: number | null) => void;
  setShowExpiryWarning: (show: boolean) => void;
  setWarningThreshold: (seconds: number) => void;
  setLocked: (locked: boolean) => void;
  setLockTimeout: (seconds: number) => void;
  setFailedUnlockAttempts: (attempts: number) => void;
  setLockoutUntil: (time: number | null) => void;
  setAppLockEnabled: (enabled: boolean) => void;

  // Complex actions
  loginWithEmail: (email: string, password: string) => Promise<void>;
  loginWithWallet: (wallet: Wallet) => Promise<void>;
  registerWithEmail: (email: string, password: string, username: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<boolean>;
  extendSession: () => Promise<void>;
  getSessionTimeRemaining: () => number | null;
  checkSessionExpiry: () => boolean;
  lockApp: () => void;
  unlockApp: (pin?: string) => Promise<boolean>;
  resetFailedAttempts: () => void;
  isInLockout: () => boolean;
  getLockoutRemaining: () => number;
}
