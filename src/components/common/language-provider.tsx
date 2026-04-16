'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { getLocale, type Language } from '@/lib/localization';

const STORAGE_KEY = 'vexa-language';

type LanguageContextValue = {
  language: Language;
  locale: string;
  setLanguage: (language: Language) => void;
};

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>('en');

  useEffect(() => {
    const savedLanguage = window.localStorage.getItem(STORAGE_KEY);
    if (savedLanguage === 'en' || savedLanguage === 'sv') {
      setLanguage(savedLanguage);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, language);
    document.documentElement.lang = language === 'sv' ? 'sv' : 'en-AU';
  }, [language]);

  const value = useMemo(
    () => ({
      language,
      locale: getLocale(language),
      setLanguage,
    }),
    [language]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }

  return context;
}
