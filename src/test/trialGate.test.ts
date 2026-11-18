import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/native", () => ({
  isNative: () => true,
  getPlatform: () => "ios",
}));

import { getPostSignInPath } from "@/lib/auth";

describe("post sign-in on iOS", () => {
  it("opens the free-trial screen instead of meal logging", () => {
    expect(getPostSignInPath(true, "/app/today")).toBe("/app/trial");
    expect(getPostSignInPath(true, "/app/history")).toBe("/app/trial");
    expect(getPostSignInPath(false, "/app/today")).toBe("/app/onboarding/goal");
  });
});
