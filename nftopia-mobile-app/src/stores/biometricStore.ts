import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { biometricService } from '@/src/services/biometric.service';

interface BiometricState {
  enabled: boolean;
  requireForTransactions: boolean;
  requireForWalletAccess: boolean;
  requireForSettingsChange: boolean;
  sessionTimeout: number; // in minutes
  lastActivity: string | null;
  isLocked: boolean;

  setEnabled: (enabled: boolean) => void;
  setRequireForTransactions: (require: boolean) => void;
  setRequireForWalletAccess: (require: boolean) => void;
  setRequireForSettingsChange: (require: boolean) => void;
  setSessionTimeout: (minutes: number) => void;
  updateLastActivity: () => void;
  lockApp: () => void;
  unlockApp: () => void;
  checkSession: () => boolean;
  reset: () => void;
}

const initialState: BiometricState = {
  enabled: false,
  requireForTransactions: true,
  requireForWalletAccess: true,
  requireForSettingsChange: true,
  sessionTimeout: 5,
  lastActivity: null,
  isLocked: false,
};

export const useBiometricStore = create<BiometricState>()(
  persist(
    (set, get) => ({
      ...initialState,

      setEnabled: (enabled: boolean) => {
        set({ enabled });
        biometricService.saveBiometricPreference(enabled);
      },

      setRequireForTransactions: (require: boolean) => {
        set({ requireForTransactions: require });
      },

      setRequireForWalletAccess: (require: boolean) => {
        set({ requireForWalletAccess: require });
      },

      setRequireForSettingsChange: (require: boolean) => {
        set({ requireForSettingsChange: require });
      },

      setSessionTimeout: (minutes: number) => {
        set({ sessionTimeout: minutes });
      },

      updateLastActivity: () => {
        set({ lastActivity: new Date().toISOString() });
      },

      lockApp: () => {
        set({ isLocked: true });
      },

      unlockApp: () => {
        set({ isLocked: false, lastActivity: new Date().toISOString() });
      },

      checkSession: () => {
        const state = get();
        if (!state.enabled || !state.lastActivity) return true;

        const lastActivity = new Date(state.lastActivity);
        const now = new Date();
        const diffMinutes = (now.getTime() - lastActivity.getTime()) / 60000;

        if (diffMinutes > state.sessionTimeout) {
          set({ isLocked: true });
          return false;
        }

        return !state.isLocked;
      },

      reset: () => {
        set(initialState);
        biometricService.clearSavedCredentials();
      },
    }),
    {
      name: 'biometric-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        enabled: state.enabled,
        requireForTransactions: state.requireForTransactions,
        requireForWalletAccess: state.requireForWalletAccess,
        requireForSettingsChange: state.requireForSettingsChange,
        sessionTimeout: state.sessionTimeout,
        lastActivity: state.lastActivity,
        isLocked: state.isLocked,
      }),
    }
  )
);