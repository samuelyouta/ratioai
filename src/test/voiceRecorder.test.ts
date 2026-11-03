import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  MIN_RECORDING_MS,
  VoiceError,
  fileExtensionFor,
  pickMimeType,
  startRecording,
} from "@/lib/voiceRecorder";

class FakeRecorder {
  static instances: FakeRecorder[] = [];
  state: "inactive" | "recording" = "inactive";
  mimeType = "audio/mp4";
  ondataavailable: ((e: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  onerror: (() => void) | null = null;
  constructor(public stream: MediaStream) {
    FakeRecorder.instances.push(this);
  }
  static isTypeSupported = (m: string) => m === "audio/mp4";
  start() {
    this.state = "recording";
  }
  stop() {
    this.state = "inactive";
    this.ondataavailable?.({ data: new Blob(["audio-bytes"], { type: this.mimeType }) });
    this.onstop?.();
  }
}

const trackStop = vi.fn();
const stream = { getTracks: () => [{ stop: trackStop }] } as unknown as MediaStream;

describe("voiceRecorder", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    FakeRecorder.instances = [];
    trackStop.mockClear();
    vi.stubGlobal("MediaRecorder", FakeRecorder);
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: { getUserMedia: vi.fn().mockResolvedValue(stream) },
    });
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("chooses a supported format and file extension", () => {
    expect(pickMimeType((m) => m.startsWith("audio/webm"))).toBe("audio/webm;codecs=opus");
    expect(pickMimeType(() => false)).toBe("");
    expect(fileExtensionFor("audio/mp4")).toBe("m4a");
    expect(fileExtensionFor("audio/webm;codecs=opus")).toBe("webm");
  });

  it("records, returns the audio and releases the microphone", async () => {
    const rec = await startRecording();
    await vi.advanceTimersByTimeAsync(MIN_RECORDING_MS + 100);
    const out = await rec.stop();
    expect(out.blob.size).toBeGreaterThan(0);
    expect(out.mimeType).toBe("audio/mp4");
    expect(trackStop).toHaveBeenCalled();
  });

  it("rejects recordings that are too short", async () => {
    const rec = await startRecording();
    await expect(rec.stop()).rejects.toMatchObject({ code: "too-short" });
  });

  it("explains a denied microphone permission", async () => {
    (navigator.mediaDevices.getUserMedia as ReturnType<typeof vi.fn>).mockRejectedValue(
      Object.assign(new Error("denied"), { name: "NotAllowedError" }),
    );
    await expect(startRecording()).rejects.toMatchObject({ code: "permission" });
  });

  it("gives up on a microphone that never answers", async () => {
    (navigator.mediaDevices.getUserMedia as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(() => undefined));
    const result = startRecording();
    const assertion = expect(result).rejects.toBeInstanceOf(VoiceError);
    await vi.advanceTimersByTimeAsync(9000);
    await assertion;
  });

  it("stops by itself at the maximum length", async () => {
    const onAutoStop = vi.fn();
    await startRecording({ onAutoStop });
    await vi.advanceTimersByTimeAsync(76_000);
    expect(onAutoStop).toHaveBeenCalled();
    expect(FakeRecorder.instances[0].state).toBe("inactive");
  });

  it("cancel discards the audio and frees the microphone", async () => {
    const rec = await startRecording();
    rec.cancel();
    expect(trackStop).toHaveBeenCalled();
  });
});
