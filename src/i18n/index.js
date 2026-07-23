import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import en from './en';
import es from './es';
import ht from './ht';
import fr from './fr';

const LANGS    = { en, es, ht, fr };
const LANG_KEY = '@pathwayusa/lang';

export const LANGUAGE_OPTIONS = [
  { code: 'en', label: 'EN', full: 'English'   },
  { code: 'es', label: 'ES', full: 'Español',  comingSoon: true },
  { code: 'ht', label: 'KR', full: 'Kreyòl'   },
  { code: 'fr', label: 'FR', full: 'Français', comingSoon: true },
];

const LanguageContext = createContext({
  lang:    'en',
  setLang: () => {},
  t:       (k) => k,
});

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState('en');

  // Restore persisted language on launch
  useEffect(() => {
    AsyncStorage.getItem(LANG_KEY).then((saved) => {
      if (saved && LANGS[saved]) setLangState(saved);
    });
  }, []);

  const setLang = (code) => {
    if (!LANGS[code]) return;
    setLangState(code);
    AsyncStorage.setItem(LANG_KEY, code);
  };

  const t = (key) => LANGS[lang]?.[key] ?? LANGS.en[key] ?? key;

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);
