/**
 * The app sends the user's language code with each AI request so item names,
 * titles and notes come back in the language they use. Only known codes are
 * accepted; anything else falls back to English.
 */

const LANGUAGES = {
  en: "English",
  es: "Spanish",
  fr: "French",
  de: "German",
  pt: "Portuguese",
  it: "Italian",
  zh: "Simplified Chinese",
  ja: "Japanese",
  ko: "Korean",
  ru: "Russian",
};

function resolveLanguage(code) {
  const key = typeof code === "string" ? code.trim().toLowerCase() : "";
  return Object.prototype.hasOwnProperty.call(LANGUAGES, key) ? key : "en";
}

/** Extra system-prompt text for non-English users; empty for English. */
function languageInstruction(code) {
  const lang = resolveLanguage(code);
  if (lang === "en") return "";
  return `\n\nLanguage: write every user-facing text field (title, item names, portion descriptions, hiddenIngredient, notes) in ${LANGUAGES[lang]}. Keep the JSON structure, field names and numbers unchanged, and keep the emoji icon.`;
}

module.exports = { LANGUAGES, resolveLanguage, languageInstruction };
