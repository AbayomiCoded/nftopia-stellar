export interface User {
  id: string;
  email?: string;
  walletAddress?: string;
  walletType?: 'argentx' | 'braavos' | 'stellar';
  isCreator?: boolean;
  createdAt: Date;
}

export type AuthNavigatorScreen = 
  | 'Onboarding'
  | 'WalletSelection'
  | 'WalletCreate'
  | 'WalletImport'
  | 'EmailLogin'
  | 'EmailRegister';

export interface AuthStore {
  // State
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  isCreator: boolean;
  error: string | null;
  isCheckingAuth: boolean;
  
  // Actions - State Management
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  setIsCheckingAuth: (isChecking: boolean) => void;
  setIsCreator: (isCreator: boolean) => void;
  
  // Actions - Authentication
  initializeAuth: () => Promise<void>;
  logout: () => Promise<void>;
  
  // Navigation actions
  navigateToScreen: (screen: AuthNavigatorScreen) => void;
  goBack: () => void;
  resetToScreen: (screen: AuthNavigatorScreen) => void;
}
