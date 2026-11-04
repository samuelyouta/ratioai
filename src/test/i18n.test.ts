import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createRequire } from "module";
import { en } from "@/i18n/en";
import {
  DICTIONARIES,
  LANGUAGES,
  STORAGE_KEY,
  getLanguage,
  intlLocale,
  setLanguage,
  translate,
} from "@/i18n";
import { isLanguageCode, matchLanguage } from "@/i18n/languages";
import { formatDayLabel, todayKey, shiftDayKey } from "@/lib/dayKey";

const { languageInstruction, resolveLanguage, LANGUAGES: SERVER_LANGUAGES } = createRequire(import.meta.url)(
  "../../api/_lib/language.js",
);

const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe("i18n", () => {
  beforeEach(() => {
    localStorage.clear();
    setLanguage("en");
  });
  afterEach(() => {
    localStorage.clear();
    setLanguage("en");
  });

  it("offers the common languages", () => {
    expect(LANGUAGES.map((l) => l.code)).toEqual(
      expect.arrayContaining(["en", "es", "fr", "de", "pt", "it", "zh", "ja", "ko", "ru"]),
    );
    expect(Object.keys(DICTIONARIES).sort()).toEqual(LANGUAGES.map((l) => l.code).sort());
  });

  it.each(LANGUAGES.map((l) => l.code))("%s defines every key with the same placeholders as English", (code) => {
    const dict = DICTIONARIES[code];
    for (const key of Object.keys(en) as (keyof typeof en)[]) {
      expect(dict[key], `${code}:${key}`).toBeTruthy();
      expect(placeholders(dict[key]), `${code}:${key}`).toEqual(placeholders(en[key]));
    }
    expect(Object.keys(dict).length).toBe(Object.keys(en).length);
  });

  it("translates, interpolates and persists the choice", () => {
    expect(translate("nav.today")).toBe("Today");
    setLanguage("es");
    expect(getLanguage()).toBe("es");
    expect(localStorage.getItem(STORAGE_KEY)).toBe("es");
    expect(translate("nav.today")).toBe("Hoy");
    expect(translate("dob.age", { age: 31 })).toBe("Tienes 31 años");
    expect(translate("dob.age", { age: 31 }, "en")).toBe("You are 31 years old");
  });

  it("leaves unknown placeholders alone and ignores invalid codes", () => {
    expect(translate("dob.age")).toBe("You are {age} years old");
    expect(translate("dob.age", { other: 1 })).toBe("You are {age} years old");
    localStorage.clear();
    setLanguage("xx" as never);
    expect(getLanguage()).toBe("en");
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("falls back to English for a missing string", () => {
    const original = DICTIONARIES.fr["nav.log"];
    (DICTIONARIES.fr as Record<string, string>)["nav.log"] = "";
    try {
      expect(translate("nav.log", undefined, "fr")).toBe("Log");
    } finally {
      DICTIONARIES.fr["nav.log"] = original;
    }
  });

  it("matches browser locales to supported languages", () => {
    expect(matchLanguage("pt-BR")).toBe("pt");
    expect(matchLanguage("zh-Hans-CN")).toBe("zh");
    expect(matchLanguage("en_GB")).toBe("en");
    expect(matchLanguage("ar-EG")).toBeNull();
    expect(matchLanguage(undefined)).toBeNull();
    expect(isLanguageCode("ja")).toBe(true);
    expect(isLanguageCode("jp")).toBe(false);
  });

  it("uses a valid locale tag for date formatting", () => {
    expect(intlLocale("zh")).toBe("zh-CN");
    expect(intlLocale("de")).toBe("de");
    for (const l of LANGUAGES) {
      expect(() => new Date().toLocaleDateString(intlLocale(l.code))).not.toThrow();
    }
  });

  it("translates Today / Yesterday / Tomorrow labels", () => {
    const today = todayKey();
    expect(formatDayLabel(today)).toBe("Today");
    setLanguage("fr");
    expect(formatDayLabel(today)).toBe("Aujourd'hui");
    expect(formatDayLabel(shiftDayKey(today, -1))).toBe("Hier");
    expect(formatDayLabel(shiftDayKey(today, 1))).toBe("Demain");
  });
});

describe("api/_lib/language", () => {
  it("accepts only known language codes", () => {
    expect(resolveLanguage("ES")).toBe("es");
    expect(resolveLanguage(" ja ")).toBe("ja");
    expect(resolveLanguage("klingon")).toBe("en");
    expect(resolveLanguage(undefined)).toBe("en");
    expect(resolveLanguage({ toString: () => "es" })).toBe("en");
    expect(resolveLanguage("__proto__")).toBe("en");
  });

  it("adds a language instruction for non-English users only", () => {
    expect(languageInstruction("en")).toBe("");
    expect(languageInstruction(undefined)).toBe("");
    expect(languageInstruction("de")).toContain("German");
    expect(languageInstruction("zh")).toContain("Simplified Chinese");
  });

  it("covers every language the app offers", () => {
    expect(Object.keys(SERVER_LANGUAGES).sort()).toEqual(LANGUAGES.map((l) => l.code).sort());
  });
});
