// Augmented Portion Guide reference library.
// Maps detected food items → familiar real-world objects so users can visually
// confirm if the AI's gram estimate matches what's actually on their plate.

export interface PortionReference {
  /** Visual emoji used in the overlay chip */
  icon: string;
  /** Familiar object name shown to the user */
  object: string;
  /** Approximate grams that the reference object represents */
  grams: number;
  /** Tailwind hue token for the chip ring */
  tone: "primary" | "warning" | "accent";
}

const REFERENCES: Record<string, PortionReference> = {
  meat: { icon: "🃏", object: "Deck of cards", grams: 85, tone: "warning" },
  poultry: { icon: "🃏", object: "Deck of cards", grams: 85, tone: "warning" },
  fish: { icon: "📱", object: "Checkbook", grams: 100, tone: "warning" },
  fruit: { icon: "🎾", object: "Tennis ball", grams: 150, tone: "primary" },
  vegetable: { icon: "🥎", object: "Baseball", grams: 90, tone: "primary" },
  leafy: { icon: "🏐", object: "Two cupped hands", grams: 60, tone: "primary" },
  grain: { icon: "🥌", object: "Hockey puck", grams: 125, tone: "accent" },
  pasta: { icon: "🥌", object: "Hockey puck", grams: 140, tone: "accent" },
  rice: { icon: "🥌", object: "Hockey puck", grams: 125, tone: "accent" },
  potato: { icon: "🖱️", object: "Computer mouse", grams: 170, tone: "accent" },
  bread: { icon: "💿", object: "CD case", grams: 30, tone: "accent" },
  cheese: { icon: "🎲", object: "Pair of dice", grams: 30, tone: "warning" },
  nuts: { icon: "🏓", object: "Ping-pong ball", grams: 28, tone: "warning" },
  oil: { icon: "🪙", object: "Poker chip", grams: 14, tone: "warning" },
  dressing: { icon: "🪙", object: "Poker chip", grams: 14, tone: "warning" },
  butter: { icon: "🎲", object: "One die", grams: 5, tone: "warning" },
  sauce: { icon: "🥄", object: "Tablespoon", grams: 15, tone: "warning" },
  drink: { icon: "🥤", object: "Standard cup", grams: 240, tone: "primary" },
  dessert: { icon: "🧁", object: "Cupcake", grams: 80, tone: "warning" },
  default: { icon: "✋", object: "Cupped palm", grams: 100, tone: "primary" },
};

const KEYWORDS: Array<[RegExp, keyof typeof REFERENCES]> = [
  [/(chicken|turkey|duck)/i, "poultry"],
  [/(beef|steak|pork|lamb|bacon|ham|sausage|meatball|burger)/i, "meat"],
  [/(salmon|tuna|fish|shrimp|cod|tilapia)/i, "fish"],
  [/(apple|banana|orange|berry|berries|grape|melon|peach|pear|fruit|mango|pineapple)/i, "fruit"],
  [/(salad|spinach|kale|lettuce|arugula|greens)/i, "leafy"],
  [/(broccoli|carrot|pepper|tomato|cucumber|zucchini|veg|asparagus|cauliflower)/i, "vegetable"],
  [/(rice)/i, "rice"],
  [/(pasta|noodle|spaghetti|lasagna|penne|macaroni)/i, "pasta"],
  [/(quinoa|oat|cereal|grain|barley|couscous)/i, "grain"],
  [/(potato|fries|sweet potato)/i, "potato"],
  [/(bread|toast|bagel|bun|tortilla|pita|wrap)/i, "bread"],
  [/(cheese|cheddar|mozzarella|parmesan|feta)/i, "cheese"],
  [/(nut|almond|peanut|walnut|cashew|pistachio)/i, "nuts"],
  [/(oil|olive)/i, "oil"],
  [/(dressing|vinaigrette|mayo|aioli)/i, "dressing"],
  [/(butter|ghee)/i, "butter"],
  [/(sauce|gravy|ketchup|mustard|sriracha)/i, "sauce"],
  [/(juice|smoothie|latte|milk|water|soda|tea|coffee)/i, "drink"],
  [/(cake|cookie|brownie|ice cream|donut|pastry|chocolate)/i, "dessert"],
];

export function matchPortion(name: string): PortionReference {
  for (const [re, key] of KEYWORDS) {
    if (re.test(name)) return REFERENCES[key];
  }
  return REFERENCES.default;
}

/** Try to extract grams from an AI portion string like "100g" or "1 cup (240g)". */
export function extractGrams(portion: string): number | null {
  const m = portion.match(/(\d+(?:\.\d+)?)\s*g\b/i);
  return m ? Number(m[1]) : null;
}

/** Return a human-friendly comparison of AI grams vs reference grams. */
export function compareToReference(
  estimateGrams: number | null,
  ref: PortionReference,
): { ratio: number; label: string } | null {
  if (!estimateGrams) return null;
  const ratio = estimateGrams / ref.grams;
  const rounded = Math.round(ratio * 10) / 10;
  if (rounded < 0.4) return { ratio, label: `Smaller than 1 ${ref.object.toLowerCase()}` };
  if (rounded < 0.85) return { ratio, label: `About ½ ${ref.object.toLowerCase()}` };
  if (rounded < 1.2) return { ratio, label: `≈ 1 ${ref.object.toLowerCase()}` };
  if (rounded < 1.7) return { ratio, label: `About 1½ ${ref.object.toLowerCase()}s` };
  return { ratio, label: `≈ ${rounded} ${ref.object.toLowerCase()}s` };
}

/**
 * Deterministic pseudo-random position for an overlay marker, seeded by the
 * item index so the chip lands in a stable spot on every render.
 */
export function overlayPosition(index: number, total: number): { x: number; y: number } {
  // Spread markers around plate center using a fibonacci-ish spiral.
  const golden = 2.39996; // radians
  const angle = index * golden;
  const radius = 0.18 + (index / Math.max(total, 1)) * 0.22;
  const x = 0.5 + Math.cos(angle) * radius;
  const y = 0.5 + Math.sin(angle) * radius * 0.85; // squash vertically for plate
  return {
    x: Math.min(0.85, Math.max(0.15, x)),
    y: Math.min(0.82, Math.max(0.18, y)),
  };
}
