import { useTranslation as useI18nTranslation } from 'react-i18next';
import { useLanguageStore } from '@/src/stores/languageStore';
import { getCurrentLanguage, changeLanguage, isRTL } from '@/src/i18n';

export function useTranslation() {
  const { t, i18n } = useI18nTranslation();
  const { language, setLanguage } = useLanguageStore();

  const changeLanguageHandler = async (lang: typeof language) => {
    await changeLanguage(lang);
    setLanguage(lang);
  };

  return {
    t,
    i18n,
    language,
    setLanguage: changeLanguageHandler,
    currentLanguage: getCurrentLanguage(),
    isRTL: isRTL(),
  };
}