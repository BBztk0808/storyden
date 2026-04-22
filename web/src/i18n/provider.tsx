"use client";

import { PropsWithChildren, createContext, useContext, useEffect, useMemo, useState } from "react";

import { I18N_COOKIE_NAME, Locale, defaultLocale, isLocale, normalizeLocale } from "./config";
import { messages } from "./resources";

type I18nValue = {
  locale: Locale;
  setLocale: (next: Locale) => void;
  t: (key: string) => string;
};

const I18nContext = createContext<I18nValue | null>(null);

type Props = PropsWithChildren<{
  initialLocale: Locale;
}>;

export function I18nProvider({ initialLocale, children }: Props) {
  const [locale, setLocaleState] = useState<Locale>(normalizeLocale(initialLocale));

  useEffect(() => {
    const local = typeof window !== "undefined" ? localStorage.getItem(I18N_COOKIE_NAME) : null;

    if (isLocale(local) && local !== locale) {
      setLocaleState(local);
    }
  }, [locale]);

  useEffect(() => {
    document.documentElement.lang = locale;
    localStorage.setItem(I18N_COOKIE_NAME, locale);
    document.cookie = `${I18N_COOKIE_NAME}=${locale}; path=/; max-age=31536000; samesite=lax`;
  }, [locale]);

  const value = useMemo<I18nValue>(() => {
    const t = (key: string) => {
      const dictionary = messages[locale] ?? messages[defaultLocale];
      return dictionary[key] ?? messages[defaultLocale][key] ?? key;
    };

    return {
      locale,
      setLocale: setLocaleState,
      t,
    };
  }, [locale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const value = useContext(I18nContext);

  if (!value) {
    throw new Error("useI18n must be used within I18nProvider");
  }

  return value;
}
