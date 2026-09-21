import { describe, expect, it } from "vitest";
import {
  hasAuthCallbackParams,
  authCallbackPathFromUrl,
  parseAuthParamsFromUrl,
  formatOAuthError,
  browserPendingMessage,
  NATIVE_OAUTH_BRIDGE,
  getLaunchPath,
  isAuthFlowPath,
  getPostSignInPath,
  passwordSignInError,
} from "@/lib/auth";

describe("hasAuthCallbackParams", () => {
  it("detects PKCE code in query", () => {
    expect(hasAuthCallbackParams("?code=abc123", "")).toBe(true);
  });

  it("detects auth error in query", () => {
    expect(hasAuthCallbackParams("?error=access_denied", "")).toBe(true);
  });

  it("detects tokens in hash", () => {
    expect(hasAuthCallbackParams("", "#access_token=tok&refresh_token=ref")).toBe(true);
  });

  it("returns false for normal routes", () => {
    expect(hasAuthCallbackParams("", "")).toBe(false);
    expect(hasAuthCallbackParams("?foo=bar", "")).toBe(false);
  });
});

describe("authCallbackPathFromUrl", () => {
  it("maps custom-scheme magic links to the callback route", () => {
    expect(authCallbackPathFromUrl("com.ratioai.ios://auth-callback?code=abc")).toBe(
      "/app/auth/callback?code=abc",
    );
  });

  it("returns null for unrelated deep links", () => {
    expect(authCallbackPathFromUrl("com.ratioai.ios://other")).toBeNull();
  });

  it("parses codes from custom-scheme URLs", () => {
    expect(parseAuthParamsFromUrl("com.ratioai.ios://auth-callback?code=abc")).toEqual({
      code: "abc",
      error: null,
    });
  });
});

describe("formatOAuthError", () => {
  it("returns a generic message", () => {
    expect(formatOAuthError("google", new Error("network"))).toContain("Google");
  });

  it("keeps backend configuration details off the user's screen", () => {
    const shown = formatOAuthError("apple", new Error("Unacceptable audience in id_token"));
    expect(shown).not.toContain("com.ratioai.ios");
    expect(shown).not.toMatch(/supabase/i);
    expect(shown).toMatch(/email and password/i);
  });
});

describe("browser OAuth bridge", () => {
  it("uses the public Vercel bridge URL", () => {
    expect(NATIVE_OAUTH_BRIDGE).toContain("/app/auth/native-bridge");
  });

  it("shows a pending message for browser sign-in", () => {
    expect(browserPendingMessage("google")).toContain("browser");
  });
});

describe("getLaunchPath", () => {
  it("sends new users to welcome", () => {
    expect(getLaunchPath(false, false)).toBe("/app/welcome");
    expect(getLaunchPath(false, true)).toBe("/app/welcome");
  });

  it("requires sign-in after onboarding when there is no session", () => {
    expect(getLaunchPath(true, false)).toBe("/app/signin");
  });

  it("opens the app when onboarded and signed in", () => {
    expect(getLaunchPath(true, true)).toBe("/app/today");
  });
});

describe("isAuthFlowPath", () => {
  it("treats sign-in and callback as auth screens", () => {
    expect(isAuthFlowPath("/app/signin")).toBe(true);
    expect(isAuthFlowPath("/app/auth/callback")).toBe(true);
    expect(isAuthFlowPath("/app/today")).toBe(false);
    expect(isAuthFlowPath("/app/insights")).toBe(false);
  });
});

describe("getPostSignInPath", () => {
  it("honours the stored redirect when the user is already onboarded", () => {
    expect(getPostSignInPath(true, "/app/history")).toBe("/app/history");
  });

  it("continues into onboarding rather than bouncing back to the welcome screen", () => {
    // Returning a signed-in user to /app/welcome reads as a failed sign-in and
    // was half of the loop App Review reported on iPad.
    expect(getPostSignInPath(false, "/app/today")).toBe("/app/onboarding/goal");
    expect(getPostSignInPath(false, "/app/today")).not.toBe("/app/welcome");
  });
});

describe("passwordSignInError", () => {
  it("explains a rejected email or password", () => {
    expect(passwordSignInError("Invalid login credentials")).toMatch(/not recognised/i);
  });

  it("calls out an unconfirmed account", () => {
    expect(passwordSignInError("Email not confirmed")).toMatch(/confirmed/i);
  });

  it("turns a WebKit network failure into something actionable", () => {
    expect(passwordSignInError("Load failed")).toMatch(/connection/i);
  });

  it("falls back to a usable default", () => {
    expect(passwordSignInError(undefined)).toMatch(/could not sign in/i);
  });
});
