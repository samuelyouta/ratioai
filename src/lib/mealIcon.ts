// Defensive emoji sanitizer used wherever an AI-supplied "icon" field is shown.
// Some AI responses occasionally return a sentence/phrase in the `icon` slot
// instead of a single emoji, which then overflows the meal hero with giant text.
// This helper extracts the first emoji-like grapheme; falls back to 🍽️.

const EMOJI_RE =
  /\p{Extended_Pictographic}(?:\u200D\p{Extended_Pictographic})*\uFE0F?/u;

export function sanitizeMealIcon(raw: string | null | undefined, fallback = "🍽️"): string {
  if (!raw) return fallback;
  const trimmed = raw.trim();
  if (!trimmed) return fallback;

  // Try to extract the first emoji cluster.
  const match = trimmed.match(EMOJI_RE);
  if (match) return match[0];

  // No emoji found — if it's a short safe label (≤2 visible chars), keep it,
  // otherwise fallback. Use Array.from to count code points, not UTF-16 units.
  const chars = Array.from(trimmed);
  if (chars.length <= 2) return trimmed;
  return fallback;
}
