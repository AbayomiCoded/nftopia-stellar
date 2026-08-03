import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import { match } from '@formatjs/intl-localematcher';
import resources from './resources';
import { Language, DEFAULT_LANGUAGE, FALLBACK_LANGUAGE, SUPPORTED_LANGUAGES } from './types';
import type { TranslationResources } from './types';

// Initialize with device language
const deviceLanguage = Localization.getLocales()[0]?.languageCode || DEFAULT_LANGUAGE;
const preferredLanguages = Localization.getLocales().map(locale => locale.languageCode || DEFAULT_LANGUAGE);

// Match device language with supported languages
const matchedLanguage = match(
  preferredLanguages,
  SUPPORTED_LANGUAGES,
  FALLBACK_LANGUAGE
) as Language;

const i18nInstance = i18n.createInstance();

i18nInstance
  .use(initReactI18next)
  .init({
    resources,
    lng: matchedLanguage,
    fallbackLng: FALLBACK_LANGUAGE,
    compatibilityJSON: 'v3',
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  });

export default i18nInstance;

// Helper functions
export const changeLanguage = async (language: Language): Promise<void> => {
  await i18nInstance.changeLanguage(language);
};

export const getCurrentLanguage = (): Language => {
  return i18nInstance.language as Language;
};

export const getSupportedLanguages = (): Language[] => {
  return SUPPORTED_LANGUAGES;
};

export const isRTL = (language?: Language): boolean => {
  const lang = language || getCurrentLanguage();
  return lang === 'ar';
};

export { SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE, FALLBACK_LANGUAGE };