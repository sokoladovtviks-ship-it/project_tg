import { useState, useEffect } from 'react';
import { translations, Language } from '../lib/i18n';
import { useTelegram } from './useTelegram';

export const useTranslation = () => {
  const { user } = useTelegram();
  const [language, setLanguage] = useState<Language>('ru');

  useEffect(() => {
    if (user?.language_code) {
      const userLang = user.language_code.toLowerCase();
      if (userLang.startsWith('en')) {
        setLanguage('en');
      } else {
        setLanguage('ru');
      }
    }
  }, [user]);

  const t = (key: string): string => {
    const keys = key.split('.');
    let value: any = translations[language];

    for (const k of keys) {
      if (value && typeof value === 'object') {
        value = value[k];
      } else {
        return key;
      }
    }

    return typeof value === 'string' ? value : key;
  };

  return { t, language, setLanguage };
};
