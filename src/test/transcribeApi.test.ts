import { createRequire } from "module";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const handler = createRequire(import.meta.url)("../../api/transcribe-audio.js");

const res = () => {
  const r: { code?: number; body?: unknown; status: (c: number) => typeof r; json: (b: unknown) => typeof r; setHeader: () => void; end: () => void } = {
    status: (c) => ((r.code = c), r),
    json: (b) => ((r.body = b), r),
    setHeader: () => undefined,
    end: () => undefined,
  };
  return r;
};

describe("api/transcribe-audio", () => {
  const env = { ...process.env };
  beforeEach(() => {
    process.env.OPENAI_API_KEY = "sk-test";
  });
  afterEach(() => {
    process.env = { ...env };
    vi.unstubAllGlobals();
  });

  it("rejects non-POST and empty bodies", async () => {
    const a = res();
    await handler({ method: "GET" }, a);
    expect(a.code).toBe(405);
    const b = res();
    await handler({ method: "POST", body: {} }, b);
    expect(b.code).toBe(400);
  });

  it("rejects oversized audio", async () => {
    const r = res();
    const big = Buffer.alloc(5 * 1024 * 1024).toString("base64");
    await handler({ method: "POST", body: { audioBase64: big, mimeType: "audio/mp4" } }, r);
    expect(r.code).toBe(413);
  });

  it("sends the audio to Whisper and returns the transcript", async () => {
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => ({
      ok: true,
      json: async () => ({ text: " two eggs and toast " }),
    }));
    vi.stubGlobal("fetch", fetchMock);
    const r = res();
    await handler(
      { method: "POST", body: { audioBase64: Buffer.from("abc").toString("base64"), mimeType: "audio/mp4" } },
      r,
    );
    expect(r.code).toBe(200);
    expect(r.body).toEqual({ text: "two eggs and toast" });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain("/audio/transcriptions");
    const form = (init as RequestInit).body as FormData;
    expect((form.get("file") as File).name).toBe("meal.m4a");
    expect(form.get("model")).toBe("whisper-1");
  });

  it("reports a missing key as unavailable", async () => {
    delete process.env.OPENAI_API_KEY;
    const r = res();
    await handler({ method: "POST", body: { audioBase64: "YWJj" } }, r);
    expect(r.code).toBe(503);
  });
});
