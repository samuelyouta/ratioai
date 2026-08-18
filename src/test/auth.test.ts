import { describe, expect, it } from "vitest";
import {
  hasAuthCallbackParams,
  authCallbackPathFromUrl,
  formatOAuthError,
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
});

describe("formatOAuthError", () => {
  it("explains Apple authorization error 1000", () => {
    const message = formatOAuthError(
      "apple",
      new Error("The operation couldn’t be completed. (com.apple.AuthenticationServices.AuthorizationError error 1000.)"),
    );
    expect(message).toContain("Sign In with Apple");
    expect(message).toContain("Xcode");
  });

  it("explains Google unacceptable audience", () => {
    const message = formatOAuthError(
      "google",
      new Error("Unacceptable audience in id_token: [115954156521-8d5o95c67lpkr7dht14bg9nquq4ju209.apps.googleusercontent.com]"),
    );
    expect(message).toContain("Client IDs");
    expect(message).toContain("Supabase");
  });
});
