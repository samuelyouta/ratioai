import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { auth: { getSession: async () => ({ data: { session: { access_token: "tok" } } }) } },
}));

import { analyzeMealPhoto } from "@/lib/mealAiClient";
import { ScanLimitError, scansUsedToday, scansLeftToday, markScanLimitReached } from "@/lib/scanQuota";

const respond = (status: number, body: unknown) =>
  vi.fn(async () => ({ ok: status < 400, status, text: async () => JSON.stringify(body) }));

describe("analyzeMealPhoto scan limit", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.unstubAllGlobals();
  });

  it("counts a successful scan and sends the day header", async () => {
    const f = respond(200, { ok: true });
    vi.stubGlobal("fetch", f);
    await analyzeMealPhoto("img");
    expect(scansUsedToday()).toBe(1);
    const headers = (f.mock.calls[0] as unknown as [string, RequestInit])[1].headers as Record<string, string>;
    expect(headers["x-scan-day"]).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("does not count failed scans", async () => {
    vi.stubGlobal("fetch", respond(500, { error: "boom" }));
    await expect(analyzeMealPhoto("img")).rejects.toThrow();
    expect(scansUsedToday()).toBe(0);
  });

  it("maps a server 429 to ScanLimitError and locks the device", async () => {
    vi.stubGlobal("fetch", respond(429, { code: "daily_scan_limit", limit: 40, error: "Done for today" }));
    await expect(analyzeMealPhoto("img")).rejects.toBeInstanceOf(ScanLimitError);
    expect(scansLeftToday()).toBe(0);
  });

  it("blocks locally without a request once the limit is hit", async () => {
    const f = respond(200, {});
    vi.stubGlobal("fetch", f);
    markScanLimitReached();
    await expect(analyzeMealPhoto("img")).rejects.toBeInstanceOf(ScanLimitError);
    expect(f).not.toHaveBeenCalled();
  });
});

describe("transcribeMealAudio", () => {
  it("posts the recording and returns the transcript", async () => {
    const f = respond(200, { text: " two eggs " });
    vi.stubGlobal("fetch", f);
    const { transcribeMealAudio } = await import("@/lib/mealAiClient");
    await expect(transcribeMealAudio("QUJD", "audio/mp4")).resolves.toBe("two eggs");
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain("/api/transcribe-audio");
    expect(JSON.parse(init.body as string)).toEqual({ audioBase64: "QUJD", mimeType: "audio/mp4" });
  });
});
