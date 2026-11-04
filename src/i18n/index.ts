import { Fragment, createElement, useCallback, useSyncExternalStore, type ReactNode } from "react";
import { en, type TranslationKey } from "@/i18n/en";
import {
  DEFAULT_LANGUAGE,
  isLanguageCode,
  languageInfo,
  matchLanguage,
  type LanguageCode,
} from "@/i18n/languages";
import { es } from "@/i18n/locales/es";
import { fr } from "@/i18n/locales/fr";
import { de } from "@/i18n/locales/de";
import { pt } from "@/i18n/locales/pt";
import { it } from "@/i18n/locales/it";
import { zh } from "@/i18n/locales/zh";
import { ja } from "@/i18n/locales/ja";
import { ko } from "@/i18n/locales/ko";
import { ru } from "@/i18n/locales/ru";

export type { TranslationKey } from "@/i18n/en";
export { LANGUAGES, languageInfo, type LanguageCode } from "@/i18n/languages";

export const STORAGE_KEY = "ratioai.language";

export const DICTIONARIES: Record<LanguageCode, Record<TranslationKey, string>> = {
  en,
  es,
  fr,
  de,
  pt,
  it,
  zh,
  ja,
  ko,
  ru,
};

export type TranslateParams = Record<string, string | number>;

function detectLanguage(): LanguageCode {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (isLanguageCode(saved)) return saved;
  } catch {
    /* storage unavailable, fall through to the device language */
  }
  if (typeof navigator !== "undefined") {
    const candidates = [...(navigator.languages ?? []), navigator.language];
    for (const locale of candidates) {
      const match = matchLanguage(locale);
      if (match) return match;
    }
  }
  return DEFAULT_LANGUAGE;
}

let current: LanguageCode = detectLanguage();
const listeners = new Set<() => void>();

function applyToDocument(lang: LanguageCode) {
  if (typeof document !== "undefined") document.documentElement.lang = lang;
}
applyToDocument(current);

export function getLanguage(): LanguageCode {
  return current;
}

export function setLanguage(lang: LanguageCode) {
  if (!isLanguageCode(lang)) return;
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    /* the choice still applies for this session */
  }
  if (lang === current) return;
  current = lang;
  applyToDocument(lang);
  listeners.forEach((fn) => fn());
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function translate(key: TranslationKey, params?: TranslateParams, lang: LanguageCode = current): string {
  const template = DICTIONARIES[lang]?.[key] || en[key] || key;
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match,
  );
}

/** Locale tag for Intl / toLocale* formatting in the chosen language. */
export function intlLocale(lang: LanguageCode = current): string {
  return { zh: "zh-CN" }[lang as "zh"] ?? lang;
}

export function aiLanguageName(lang: LanguageCode = current): string {
  return languageInfo(lang).aiName;
}

/** Like translate, but placeholders can be filled with React nodes (e.g. a highlighted number). */
export function translateRich(
  key: TranslationKey,
  values: Record<string, ReactNode>,
  lang: LanguageCode = current,
): ReactNode {
  const template = DICTIONARIES[lang]?.[key] || en[key] || key;
  const parts = template.split(/(\{\w+\})/g);
  return createElement(
    Fragment,
    null,
    ...parts.map((part, i) => {
      const name = /^\{(\w+)\}$/.exec(part)?.[1];
      return createElement(Fragment, { key: i }, name && name in values ? values[name] : part);
    }),
  );
}

export function useLanguage(): LanguageCode {
  return useSyncExternalStore(subscribe, getLanguage, getLanguage);
}

/** Translation function that re-renders the component when the language changes. */
export function useT() {
  const lang = useLanguage();
  const t = useCallback(
    (key: TranslationKey, params?: TranslateParams) => translate(key, params, lang),
    [lang],
  );
  const rich = useCallback(
    (key: TranslationKey, values: Record<string, ReactNode>) => translateRich(key, values, lang),
    [lang],
  );
  return { t, rich, lang };
}
