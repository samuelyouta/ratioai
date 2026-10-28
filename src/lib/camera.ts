/**
 * Camera helpers that can never wait forever.
 *
 * `getUserMedia` and `video.play()` have no timeout of their own: on iOS a stalled
 * WebView, a camera still held by another request, or a permission dialog that
 * never resolves leaves the promise pending, which is the "Starting camera…"
 * spinner that never ends. Everything here is bounded.
 */

export const CAMERA_START_TIMEOUT_MS = 8_000;
export const CAMERA_FRAME_TIMEOUT_MS = 5_000;

export class CameraTimeoutError extends Error {
  constructor(message = "Camera took too long to start") {
    super(message);
    this.name = "CameraTimeoutError";
  }
}

export function withTimeout<T>(promise: Promise<T>, ms: number, onTimeout: () => Error): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(onTimeout()), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

export function stopStream(stream: MediaStream | null | undefined) {
  stream?.getTracks().forEach((t) => {
    try {
      t.stop();
    } catch {
      /* already stopped */
    }
  });
}

/** True when the user (or a policy) refused camera access, as opposed to a hardware/runtime fault. */
export function isCameraPermissionError(error: unknown): boolean {
  const name = (error as { name?: string } | null)?.name ?? "";
  return name === "NotAllowedError" || name === "PermissionDeniedError" || name === "SecurityError";
}

type Facing = "environment" | "user";

function constraintLadder(facing: Facing): MediaStreamConstraints[] {
  return [
    {
      audio: false,
      video: { facingMode: { ideal: facing }, width: { ideal: 1920 }, height: { ideal: 1080 } },
    },
    { audio: false, video: { facingMode: { ideal: facing } } },
    { audio: false, video: true },
  ];
}

/**
 * Open a camera stream, easing off the constraints if the device rejects them,
 * and give up after `timeoutMs` overall. A stream that arrives after the
 * deadline is stopped so the camera is never left running in the background.
 */
export async function openCameraStream(
  facing: Facing,
  mediaDevices: Pick<MediaDevices, "getUserMedia"> | undefined = typeof navigator === "undefined"
    ? undefined
    : navigator.mediaDevices,
  timeoutMs = CAMERA_START_TIMEOUT_MS,
): Promise<MediaStream> {
  if (!mediaDevices?.getUserMedia) throw new Error("Camera API unavailable");

  const deadline = Date.now() + timeoutMs;
  let lastError: unknown = null;

  for (const constraints of constraintLadder(facing)) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) break;

    const pending = mediaDevices.getUserMedia(constraints);
    try {
      return await withTimeout(pending, remaining, () => new CameraTimeoutError());
    } catch (e) {
      if (e instanceof CameraTimeoutError) {
        pending.then(stopStream, () => undefined);
        throw e;
      }
      if (isCameraPermissionError(e)) throw e;
      lastError = e;
    }
  }

  throw lastError ?? new CameraTimeoutError();
}

/** Attach a stream to a <video> and resolve once it is actually showing frames. */
export async function attachStream(
  video: HTMLVideoElement,
  stream: MediaStream,
  timeoutMs = CAMERA_FRAME_TIMEOUT_MS,
): Promise<void> {
  video.srcObject = stream;

  const hasFrame = () => video.readyState >= 2 && video.videoWidth > 0;
  const ready = new Promise<void>((resolve) => {
    if (hasFrame()) {
      resolve();
      return;
    }
    const done = () => {
      if (!hasFrame()) return;
      video.removeEventListener("loadeddata", done);
      video.removeEventListener("playing", done);
      resolve();
    };
    video.addEventListener("loadeddata", done);
    video.addEventListener("playing", done);
  });

  // play() can be rejected by autoplay policy; the frame check below is what matters.
  void video.play().catch(() => undefined);
  await withTimeout(ready, timeoutMs, () => new CameraTimeoutError("Camera produced no picture"));
}
