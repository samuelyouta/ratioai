import { createRequire } from "module";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const require_ = createRequire(import.meta.url);
const { reserveScan, resolveDay, DAILY_SCAN_LIMIT } = require_("../../api/_lib/scanLimit.js");

const req = (headers: Record<string, string> = {}) => ({ headers, socket: { remoteAddress: "1.2.3.4" } });
const json = (body: unknown, ok = true) => ({ ok, status: ok ? 200 : 500, json: async () => body, text: async () => JSON.stringify(body) });

describe("api scan limit", () => {
  const env = { ...process.env };
  beforeEach(() => {
    process.env.SUPABASE_URL = "https://x.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service";
  });
  afterEach(() => {
    process.env = { ...env };
    vi.unstubAllGlobals();
  });

  it("limit is 40", () => expect(DAILY_SCAN_LIMIT).toBe(40));

  it("accepts the client's day only within a day of UTC", () => {
    const now = new Date("2026-05-10T03:00:00Z");
    expect(resolveDay(req({ "x-scan-day": "2026-05-09" }), now)).toBe("2026-05-09");
    expect(resolveDay(req({ "x-scan-day": "2026-05-20" }), now)).toBe("2026-05-10");
    expect(resolveDay(req({ "x-scan-day": "junk" }), now)).toBe("2026-05-10");
    expect(resolveDay(req(), now)).toBe("2026-05-10");
  });

  it("allows scans when Supabase is not configured", async () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    expect((await reserveScan(req())).allowed).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("keys by the verified user and denies over the limit", async () => {
    const fetchMock = vi.fn(async (url: string, _init?: RequestInit) =>
      url.includes("/auth/v1/user") ? json({ id: "u1" }) : json([{ allowed: false, used: 40 }]),
    );
    vi.stubGlobal("fetch", fetchMock);
    const slot = await reserveScan(req({ authorization: "Bearer tok" }));
    expect(slot.allowed).toBe(false);
    const rpcCall = fetchMock.mock.calls.find(([u]) => String(u).includes("consume_daily_scan"))!;
    expect(JSON.parse((rpcCall[1] as RequestInit).body as string).p_key).toBe("user:u1");
  });

  it("falls back to the IP when there is no valid token", async () => {
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => json([{ allowed: true, used: 1 }]));
    vi.stubGlobal("fetch", fetchMock);
    const slot = await reserveScan(req());
    expect(slot.allowed).toBe(true);
    expect(JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string).p_key).toBe("ip:1.2.3.4");
  });

  it("refunds on request", async () => {
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => json([{ allowed: true, used: 1 }]));
    vi.stubGlobal("fetch", fetchMock);
    const slot = await reserveScan(req());
    await slot.refund();
    expect(String(fetchMock.mock.calls.at(-1)![0])).toContain("refund_daily_scan");
  });

  it("fails open when Supabase errors", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => json({}, false)));
    expect((await reserveScan(req())).allowed).toBe(true);
  });
});
