import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Language, DEFAULT_LANGUAGE } from '@/src/i18n/types';

interface LanguageState {
  language: Language;
  setLanguage: (language: Language) => void;
  resetLanguage: () => void;
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set) => ({
      language: DEFAULT_LANGUAGE,
      setLanguage: (language: Language) => set({ language }),
      resetLanguage: () => set({ language: DEFAULT_LANGUAGE }),
    }),
    {
      name: 'language-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);