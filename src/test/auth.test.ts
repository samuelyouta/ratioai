import { describe, expect, it } from "vitest";
import {
  hasAuthCallbackParams,
  authCallbackPathFromUrl,
  parseAuthParamsFromUrl,
  formatOAuthError,
  browserPendingMessage,
  NATIVE_OAUTH_BRIDGE,
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
});

describe("browser OAuth bridge", () => {
  it("uses the public Vercel bridge URL", () => {
    expect(NATIVE_OAUTH_BRIDGE).toContain("/app/auth/native-bridge");
  });

  it("shows a pending message for browser sign-in", () => {
    expect(browserPendingMessage("google")).toContain("browser");
  });
});
