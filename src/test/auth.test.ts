import { describe, expect, it } from "vitest";
import { hasAuthCallbackParams } from "@/lib/auth";

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
