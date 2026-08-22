/**
 * In-memory handoff for the meal photo between Log → Analyze.
 * sessionStorage alone often fails on iOS for large Camera Roll images
 * (quota / WebView quirks), which looks like "load failed".
 */

const STORAGE_KEY = "ratioai.lastImage";

let memoryImage: string | null = null;

export function setPendingMealImage(dataUrl: string): void {
  memoryImage = dataUrl;
  try {
    sessionStorage.setItem(STORAGE_KEY, dataUrl);
  } catch {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    // Last resort for smaller images only (~1.5MB chars ≈ 1MB binary)
    if (dataUrl.length < 1_500_000) {
      try {
        localStorage.setItem(STORAGE_KEY, dataUrl);
      } catch {
        /* memory still holds it for same-session navigation */
      }
    }
  }
}

export function consumePendingMealImage(): string | null {
  const fromMemory = memoryImage;
  memoryImage = null;

  let fromStorage: string | null = null;
  try {
    fromStorage = sessionStorage.getItem(STORAGE_KEY);
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
  if (!fromStorage) {
    try {
      fromStorage = localStorage.getItem(STORAGE_KEY);
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }

  return fromMemory || fromStorage;
}

export function peekPendingMealImage(): string | null {
  if (memoryImage) return memoryImage;
  try {
    return sessionStorage.getItem(STORAGE_KEY) || localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}
