import { describe, it, expect, vi, afterEach } from "vitest";
import {
  CameraTimeoutError,
  attachStream,
  isCameraPermissionError,
  openCameraStream,
  withTimeout,
} from "@/lib/camera";

const fakeStream = () => {
  const stop = vi.fn();
  return { stream: { getTracks: () => [{ stop }] } as unknown as MediaStream, stop };
};

const domError = (name: string) => Object.assign(new Error(name), { name });

afterEach(() => vi.useRealTimers());

describe("openCameraStream", () => {
  it("falls back to simpler constraints when the device rejects the first ones", async () => {
    const { stream } = fakeStream();
    const getUserMedia = vi
      .fn()
      .mockRejectedValueOnce(domError("OverconstrainedError"))
      .mockResolvedValueOnce(stream);
    await expect(openCameraStream("environment", { getUserMedia })).resolves.toBe(stream);
    expect(getUserMedia).toHaveBeenCalledTimes(2);
  });

  it("does not retry when permission is denied", async () => {
    const getUserMedia = vi.fn().mockRejectedValue(domError("NotAllowedError"));
    await expect(openCameraStream("environment", { getUserMedia })).rejects.toMatchObject({
      name: "NotAllowedError",
    });
    expect(getUserMedia).toHaveBeenCalledTimes(1);
    expect(isCameraPermissionError(domError("NotAllowedError"))).toBe(true);
  });

  it("gives up on a camera that never answers and stops a stream that arrives late", async () => {
    vi.useFakeTimers();
    const { stream, stop } = fakeStream();
    let release: (s: MediaStream) => void = () => undefined;
    const getUserMedia = vi.fn(() => new Promise<MediaStream>((r) => (release = r)));

    const result = openCameraStream("environment", { getUserMedia }, 1000);
    const assertion = expect(result).rejects.toBeInstanceOf(CameraTimeoutError);
    await vi.advanceTimersByTimeAsync(1100);
    await assertion;

    release(stream);
    await vi.advanceTimersByTimeAsync(0);
    expect(stop).toHaveBeenCalled();
  });

  it("fails clearly when the camera API is missing", async () => {
    await expect(openCameraStream("user", undefined as never)).rejects.toThrow();
  });
});

describe("attachStream", () => {
  const makeVideo = () => {
    const video = document.createElement("video");
    video.play = vi.fn().mockResolvedValue(undefined);
    return video;
  };

  it("resolves once the video has a real frame", async () => {
    const video = makeVideo();
    Object.defineProperty(video, "readyState", { value: 4, configurable: true });
    Object.defineProperty(video, "videoWidth", { value: 640, configurable: true });
    await expect(attachStream(video, fakeStream().stream, 500)).resolves.toBeUndefined();
  });

  it("times out when the stream never produces a picture", async () => {
    const video = makeVideo();
    await expect(attachStream(video, fakeStream().stream, 50)).rejects.toBeInstanceOf(CameraTimeoutError);
  });
});

describe("withTimeout", () => {
  it("passes through the value and the error of the wrapped promise", async () => {
    await expect(withTimeout(Promise.resolve(1), 100, () => new Error("t"))).resolves.toBe(1);
    await expect(withTimeout(Promise.reject(new Error("x")), 100, () => new Error("t"))).rejects.toThrow("x");
  });
});
