import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n from '../utils/i18n';
import { userApi } from '../utils/apiClient';

export type Language = 'en' | 'te' | 'hi';

interface LanguageContextType {
  language: Language;
  changeLanguage: (lang: Language) => Promise<void>;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const LANGUAGE_STORAGE_KEY = '@forlok_language';

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('en');
  const [isLoading, setIsLoading] = useState(true);

  // Load saved language preference
  useEffect(() => {
    loadLanguage();
  }, []);

  const loadLanguage = async () => {
    try {
      const savedLanguage = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (savedLanguage && (savedLanguage === 'en' || savedLanguage === 'te' || savedLanguage === 'hi')) {
        setLanguage(savedLanguage as Language);
        await i18n.changeLanguage(savedLanguage);
      } else {
        // Default to English if no preference saved
        setLanguage('en');
        await i18n.changeLanguage('en');
      }
    } catch (error) {
      console.error('Error loading language:', error);
      setLanguage('en');
      await i18n.changeLanguage('en');
    } finally {
      setIsLoading(false);
    }
  };

  const changeLanguage = async (lang: Language) => {
    try {
      setLanguage(lang);
      await i18n.changeLanguage(lang);
      await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
      const res = await userApi.updateLanguage(lang);
      if (!res.success) {
        console.warn('Language updated locally but backend sync failed:', res.error);
      }
    } catch (error) {
      console.error('Error changing language:', error);
    }
  };

  const t = (key: string): string => {
    return i18n.t(key);
  };

  if (isLoading) {
    return null; // Or return a loading component
  }

  return (
    <LanguageContext.Provider value={{ language, changeLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
};
