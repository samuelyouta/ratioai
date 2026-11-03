import { createRequire } from "module";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const require_ = createRequire(import.meta.url);
const handler = require_("../../api/transcribe-audio.js");

const run = async (body: unknown, method = "POST") => {
  const res = {
    statusCode: 0,
    payload: undefined as unknown,
    headers: {} as Record<string, string>,
    setHeader(k: string, v: string) {
      this.headers[k] = v;
    },
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(p: unknown) {
      this.payload = p;
      return this;
    },
    end() {
      return this;
    },
  };
  await handler({ method, body }, res);
  return res;
};

describe("api/transcribe-audio", () => {
  const env = { ...process.env };
  beforeEach(() => {
    process.env.OPENAI_API_KEY = "sk-test";
  });
  afterEach(() => {
    process.env = { ...env };
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("transcribes the audio with Whisper and returns the text", async () => {
    const fetchMock = vi.fn(async (_u: string, _i?: RequestInit) => ({
      ok: true,
      json: async () => ({ text: " two eggs and toast ", segments: [{ no_speech_prob: 0.01 }] }),
    }));
    vi.stubGlobal("fetch", fetchMock);
    const res = await run({ audioBase64: Buffer.from("abc").toString("base64"), mimeType: "audio/mp4;codecs=opus" });
    expect(res.statusCode).toBe(200);
    expect(res.payload).toEqual({ text: "two eggs and toast" });
    expect(String(fetchMock.mock.calls[0][0])).toContain("/audio/transcriptions");
    const form = (fetchMock.mock.calls[0][1] as RequestInit).body as FormData;
    expect((form.get("file") as File).name).toBe("meal.m4a");
    expect(form.get("model")).toBe("whisper-1");
  });

  it("returns nothing for clips Whisper flags as silence", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ text: "Thanks for watching!", segments: [{ no_speech_prob: 0.9 }] }),
      })),
    );
    const res = await run({ audioBase64: Buffer.from("abc").toString("base64"), mimeType: "audio/webm" });
    expect(res.payload).toEqual({ text: "" });
  });

  it("keeps the text when the response has no segments", () => {
    expect(handler.cleanTranscript({ text: "an apple" })).toBe("an apple");
  });

  it("rejects missing, oversized and misused requests", async () => {
    expect((await run({})).statusCode).toBe(400);
    const big = Buffer.alloc(4 * 1024 * 1024 + 1).toString("base64");
    expect((await run({ audioBase64: big, mimeType: "audio/webm" })).statusCode).toBe(413);
    expect((await run({}, "GET")).statusCode).toBe(405);
  });

  it("reports a missing API key clearly", async () => {
    delete process.env.OPENAI_API_KEY;
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const res = await run({ audioBase64: Buffer.from("abc").toString("base64") });
    expect(res.statusCode).toBe(503);
  });
});
