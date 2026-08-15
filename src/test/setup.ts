import "@testing-library/jest-dom";

// Supabase client reads these at import time in unit tests.
if (!import.meta.env.VITE_SUPABASE_URL) {
  // @ts-expect-error vitest env is mutable in tests
  import.meta.env.VITE_SUPABASE_URL = "https://example.supabase.co";
}
if (!import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY) {
  // @ts-expect-error vitest env is mutable in tests
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY = "test-anon-key";
}

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});
