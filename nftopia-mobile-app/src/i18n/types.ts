export type Language = 'en' | 'fr' | 'es' | 'de' | 'ar';

export const SUPPORTED_LANGUAGES: Language[] = ['en', 'fr', 'es', 'de', 'ar'];
export const DEFAULT_LANGUAGE: Language = 'en';
export const FALLBACK_LANGUAGE: Language = 'en';

export type TranslationKey = keyof typeof import('./resources/en.json');

export interface LanguageOption {
  code: Language;
  name: string;
  nativeName: string;
  flag: string;
  direction: 'ltr' | 'rtl';
}

export const LANGUAGE_OPTIONS: Record<Language, LanguageOption> = {
  en: {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    flag: '🇺🇸',
    direction: 'ltr',
  },
  fr: {
    code: 'fr',
    name: 'French',
    nativeName: 'Français',
    flag: '🇫🇷',
    direction: 'ltr',
  },
  es: {
    code: 'es',
    name: 'Spanish',
    nativeName: 'Español',
    flag: '🇪🇸',
    direction: 'ltr',
  },
  de: {
    code: 'de',
    name: 'German',
    nativeName: 'Deutsch',
    flag: '🇩🇪',
    direction: 'ltr',
  },
  ar: {
    code: 'ar',
    name: 'Arabic',
    nativeName: 'العربية',
    flag: '🇸🇦',
    direction: 'rtl',
  },
};

export type TranslationResources = {
  [key in Language]: {
    translation: typeof import('./resources/en.json');
  };
};