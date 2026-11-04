# App languages

The app can be used in English, Spanish, French, German, Portuguese, Italian,
Simplified Chinese, Japanese, Korean and Russian.

- **Onboarding, first step:** a language pill sits in the top-right corner (and on the welcome screen).
- **Profile:** a *Language* row sits above *Day & time zone*.
- The choice is stored on the device (`localStorage` key `ratioai.language`). On first launch the
  device language is used when we support it, otherwise English.

## What the language changes

- All UI text in the main flows (welcome, onboarding, Today, Log/camera, Describe, Analyze, Search & Edit,
  History, Insights, Meal details, Profile, sign-in).
- Dates and "Today / Yesterday / Tomorrow" labels.
- AI results. The app sends the language code with `/api/analyze-meal` and `/api/describe-meal`; the
  server (`api/_lib/language.js`) tells the model to write the meal title, item names, portions, hidden
  ingredient and notes in that language. JSON keys and numbers are untouched.
- Voice input is **not** tied to the UI language: Whisper detects what the user speaks.

## Not translated yet (falls back to English)

Paywall, privacy/terms/support pages, the portion helper and portion guide overlay, recipe share card,
level-up modal, and the built-in food database names. Right-to-left languages (Arabic, Hebrew) and Hindi
are not included.

## Adding or editing text

1. Add the key to `src/i18n/en.ts` (the master list; `TranslationKey` is derived from it).
2. Add the same key to every file in `src/i18n/locales/`. TypeScript fails the build if one is missing, and
   `src/test/i18n.test.ts` checks that every language keeps the same `{placeholders}` as English.
3. Use it with `const { t } = useT(); t("some.key", { n: 3 })`. Outside React use `translate(...)`.
   For placeholders that need markup use `rich("some.key", { word: <b>x</b> })`.

## Adding a language

1. Add an entry to `LANGUAGES` in `src/i18n/languages.ts`.
2. Create `src/i18n/locales/<code>.ts` exporting a `Record<TranslationKey, string>` and register it in
   `src/i18n/index.ts` (`DICTIONARIES`).
3. Add the English name to `LANGUAGES` in `api/_lib/language.js` so AI output follows it
   (the test suite checks both lists match).

The translations were drafted automatically and should be reviewed by native speakers before launch.
