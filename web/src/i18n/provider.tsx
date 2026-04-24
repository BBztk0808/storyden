"use client";

import {
  PropsWithChildren,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { I18N_COOKIE_NAME, Locale, defaultLocale, isLocale, normalizeLocale } from "./config";
import { messages } from "./resources";

type I18nValue = {
  locale: Locale;
  setLocale: (next: Locale) => void;
  t: (key: string) => string;
};

const I18nContext = createContext<I18nValue | null>(null);

const translatedTextNodes = new WeakMap<Text, string>();
const translatedAttributes = new WeakMap<Element, Map<string, string>>();

const translatedAttributeNames = [
  "aria-label",
  "alt",
  "placeholder",
  "title",
] as const;

const ignoredTranslationParents = new Set([
  "CODE",
  "KBD",
  "PRE",
  "SAMP",
  "SCRIPT",
  "STYLE",
  "TEXTAREA",
]);

type Props = PropsWithChildren<{
  initialLocale: Locale;
}>;

export function I18nProvider({ initialLocale, children }: Props) {
  const [locale, setLocaleState] = useState<Locale>(normalizeLocale(initialLocale));

  useEffect(() => {
    const normalized = normalizeLocale(initialLocale);
    setLocaleState((previous) =>
      previous === normalized ? previous : normalized,
    );
  }, [initialLocale]);

  useEffect(() => {
    const local =
      typeof window !== "undefined"
        ? localStorage.getItem(I18N_COOKIE_NAME)
        : null;

    if (isLocale(local) && local !== locale) {
      setLocaleState(local);
    }
    // Only hydrate from client storage once after mount to avoid update loops.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
    localStorage.setItem(I18N_COOKIE_NAME, locale);
    document.cookie = `${I18N_COOKIE_NAME}=${locale}; path=/; max-age=31536000; samesite=lax`;
  }, [locale]);

  useEffect(() => {
    translateDocument(locale);

    const observer = new MutationObserver(() => {
      translateDocument(locale);
    });

    observer.observe(document.body, {
      attributes: true,
      attributeFilter: translatedAttributeNames as unknown as string[],
      childList: true,
      subtree: true,
    });

    return () => observer.disconnect();
  }, [locale]);

  const value = useMemo<I18nValue>(() => {
    const t = (key: string) => {
      const dictionary = messages[locale] ?? messages[defaultLocale];
      return dictionary[key] ?? messages[defaultLocale][key] ?? key;
    };

    return {
      locale,
      setLocale: (next: Locale) =>
        setLocaleState((previous) => (previous === next ? previous : next)),
      t,
    };
  }, [locale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

function translateDocument(locale: Locale) {
  translateElementAttributes(document.body, locale);

  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode(node) {
        if (!node.textContent?.trim()) {
          return NodeFilter.FILTER_REJECT;
        }

        const parent = node.parentElement;
        if (!parent || shouldIgnoreElement(parent)) {
          return NodeFilter.FILTER_REJECT;
        }

        return NodeFilter.FILTER_ACCEPT;
      },
    },
  );

  while (walker.nextNode()) {
    const node = walker.currentNode as Text;
    const original = translatedTextNodes.get(node) ?? node.textContent ?? "";

    if (!translatedTextNodes.has(node)) {
      translatedTextNodes.set(node, original);
    }

    node.textContent = translateText(original, locale);
  }
}

function translateElementAttributes(root: Element, locale: Locale) {
  const elements = [root, ...Array.from(root.querySelectorAll("*"))];

  for (const element of elements) {
    if (shouldIgnoreElement(element)) {
      continue;
    }

    let originals = translatedAttributes.get(element);

    for (const attribute of translatedAttributeNames) {
      const current = element.getAttribute(attribute);
      if (!current) {
        continue;
      }

      if (!originals) {
        originals = new Map();
        translatedAttributes.set(element, originals);
      }

      if (!originals.has(attribute)) {
        originals.set(attribute, current);
      }

      element.setAttribute(
        attribute,
        translateText(originals.get(attribute) ?? current, locale),
      );
    }
  }
}

function translateText(value: string, locale: Locale) {
  if (locale === defaultLocale) {
    return value;
  }

  const key = normaliseMessageKey(value);
  const translated = messages[locale][key] ?? messages[defaultLocale][key];

  if (!translated || translated === key) {
    return value;
  }

  const leading = value.match(/^\s*/)?.[0] ?? "";
  const trailing = value.match(/\s*$/)?.[0] ?? "";

  return `${leading}${translated}${trailing}`;
}

function normaliseMessageKey(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function shouldIgnoreElement(element: Element) {
  if (element.closest("[data-i18n-ignore]")) {
    return true;
  }

  return ignoredTranslationParents.has(element.tagName);
}

export function useI18n() {
  const value = useContext(I18nContext);

  if (!value) {
    return {
      locale: defaultLocale,
      setLocale: () => undefined,
      t: (key: string) => messages[defaultLocale][key] ?? key,
    };
  }

  return value;
}
