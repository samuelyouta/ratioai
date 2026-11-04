export interface LanguageInfo {
  code: string;
  /** Name written in the language itself, as shown in the picker. */
  native: string;
  english: string;
  /** Used for AI prompts so item names and notes come back in the same language. */
  aiName: string;
}

export const LANGUAGES = [
  { code: "en", native: "English", english: "English", aiName: "English" },
  { code: "es", native: "Español", english: "Spanish", aiName: "Spanish" },
  { code: "fr", native: "Français", english: "French", aiName: "French" },
  { code: "de", native: "Deutsch", english: "German", aiName: "German" },
  { code: "pt", native: "Português", english: "Portuguese", aiName: "Portuguese" },
  { code: "it", native: "Italiano", english: "Italian", aiName: "Italian" },
  { code: "zh", native: "简体中文", english: "Chinese (Simplified)", aiName: "Simplified Chinese" },
  { code: "ja", native: "日本語", english: "Japanese", aiName: "Japanese" },
  { code: "ko", native: "한국어", english: "Korean", aiName: "Korean" },
  { code: "ru", native: "Русский", english: "Russian", aiName: "Russian" },
] as const satisfies readonly LanguageInfo[];

export type LanguageCode = (typeof LANGUAGES)[number]["code"];

export const DEFAULT_LANGUAGE: LanguageCode = "en";

export function isLanguageCode(value: unknown): value is LanguageCode {
  return typeof value === "string" && LANGUAGES.some((l) => l.code === value);
}

export function languageInfo(code: LanguageCode): LanguageInfo {
  return LANGUAGES.find((l) => l.code === code) ?? LANGUAGES[0];
}

/** Maps a browser locale such as "pt-BR" or "zh-Hans-CN" to a supported language. */
export function matchLanguage(locale: string | undefined | null): LanguageCode | null {
  if (!locale) return null;
  const base = locale.toLowerCase().split(/[-_]/)[0];
  return isLanguageCode(base) ? base : null;
}
