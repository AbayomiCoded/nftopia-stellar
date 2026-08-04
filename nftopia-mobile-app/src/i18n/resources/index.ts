import en from './en.json';
import fr from './fr.json';
import es from './es.json';
import de from './de.json';
import ar from './ar.json';
import type { TranslationResources } from '../types';

const resources: TranslationResources = {
  en: { translation: en },
  fr: { translation: fr },
  es: { translation: es },
  de: { translation: de },
  ar: { translation: ar },
};

export default resources;