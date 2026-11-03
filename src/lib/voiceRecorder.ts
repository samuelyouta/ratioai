import { CameraTimeoutError, isCameraPermissionError, stopStream, withTimeout } from "@/lib/camera";

/**
 * Records a short voice note for the meal AI.
 *
 * The browser SpeechRecognition API is not dependable inside the iOS app's WebView
 * (it needs a separate Speech Recognition permission and often just fails), so the app
 * records the audio itself and the server transcribes it.
 */

export const MAX_RECORDING_MS = 75_000;
export const MIN_RECORDING_MS = 700;
export const MIC_START_TIMEOUT_MS = 8_000;

const MIME_CANDIDATES = ["audio/mp4", "audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus"];

export type VoiceErrorCode = "unsupported" | "permission" | "timeout" | "too-short" | "empty" | "failed";

export class VoiceError extends Error {
  readonly code: VoiceErrorCode;
  constructor(code: VoiceErrorCode, message: string) {
    super(message);
    this.name = "VoiceError";
    this.code = code;
  }
}

export interface Recording {
  blob: Blob;
  mimeType: string;
  durationMs: number;
}

export interface ActiveRecording {
  /** Stops and resolves with the audio. Rejects with a VoiceError if nothing usable was captured. */
  stop(): Promise<Recording>;
  /** Stops and throws the audio away. */
  cancel(): void;
}

export function isVoiceRecordingSupported(): boolean {
  return (
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia &&
    typeof MediaRecorder !== "undefined"
  );
}

export function pickMimeType(isSupported: (mime: string) => boolean = (m) => MediaRecorder.isTypeSupported(m)): string {
  return MIME_CANDIDATES.find((m) => isSupported(m)) ?? "";
}

export function fileExtensionFor(mimeType: string): string {
  const base = mimeType.split(";")[0].trim().toLowerCase();
  if (base === "audio/mp4" || base === "audio/x-m4a" || base === "audio/aac") return "m4a";
  if (base === "audio/ogg") return "ogg";
  if (base === "audio/wav" || base === "audio/x-wav") return "wav";
  if (base === "audio/mpeg") return "mp3";
  return "webm";
}

export async function startRecording(options: { onAutoStop?: () => void } = {}): Promise<ActiveRecording> {
  if (!isVoiceRecordingSupported()) {
    throw new VoiceError("unsupported", "Voice input isn't available on this device.");
  }

  let stream: MediaStream;
  const pending = navigator.mediaDevices.getUserMedia({ audio: true });
  try {
    stream = await withTimeout(pending, MIC_START_TIMEOUT_MS, () => new CameraTimeoutError("Microphone took too long to start"));
  } catch (e) {
    pending.then(stopStream, () => undefined);
    if (isCameraPermissionError(e)) {
      throw new VoiceError("permission", "Microphone access is off. Turn it on in Settings > RatioAi > Microphone.");
    }
    if (e instanceof CameraTimeoutError) {
      throw new VoiceError("timeout", "The microphone didn't respond. Please try again.");
    }
    throw new VoiceError("failed", "Couldn't start the microphone. Please try again.");
  }

  let recorder: MediaRecorder;
  try {
    const mimeType = pickMimeType();
    recorder = new MediaRecorder(stream, mimeType ? { mimeType, audioBitsPerSecond: 48_000 } : undefined);
  } catch {
    stopStream(stream);
    throw new VoiceError("unsupported", "Voice input isn't available on this device.");
  }

  const chunks: Blob[] = [];
  const startedAt = Date.now();
  let finished = false;
  let discard = false;
  let settle: ((r: Recording) => void) | null = null;
  let fail: ((e: VoiceError) => void) | null = null;
  const done = new Promise<Recording>((resolve, reject) => {
    settle = resolve;
    fail = reject;
  });
  // A rejection nobody awaits (cancel) must not surface as an unhandled error.
  done.catch(() => undefined);

  const cleanup = () => {
    window.clearTimeout(limitTimer);
    document.removeEventListener("visibilitychange", onHidden);
    stopStream(stream);
  };

  const finish = () => {
    if (finished) return;
    finished = true;
    cleanup();
    const durationMs = Date.now() - startedAt;
    const mimeType = recorder.mimeType || chunks[0]?.type || "audio/webm";
    const blob = new Blob(chunks, { type: mimeType });
    if (discard) fail?.(new VoiceError("failed", "Recording cancelled."));
    else if (durationMs < MIN_RECORDING_MS) fail?.(new VoiceError("too-short", "That was too short. Hold on a moment longer and describe your meal."));
    else if (blob.size === 0) fail?.(new VoiceError("empty", "Nothing was recorded. Please try again."));
    else settle?.({ blob, mimeType, durationMs });
  };

  const requestStop = () => {
    if (recorder.state !== "inactive") {
      try {
        recorder.stop();
        return;
      } catch {
        /* fall through to finish */
      }
    }
    finish();
  };

  const onHidden = () => {
    if (document.hidden) {
      requestStop();
      options.onAutoStop?.();
    }
  };

  const limitTimer = window.setTimeout(() => {
    requestStop();
    options.onAutoStop?.();
  }, MAX_RECORDING_MS);

  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) chunks.push(e.data);
  };
  recorder.onstop = finish;
  recorder.onerror = () => {
    if (finished) return;
    finished = true;
    cleanup();
    fail?.(new VoiceError("failed", "Recording failed. Please try again."));
  };
  document.addEventListener("visibilitychange", onHidden);

  try {
    recorder.start();
  } catch {
    finished = true;
    cleanup();
    throw new VoiceError("failed", "Couldn't start recording. Please try again.");
  }

  return {
    stop: () => {
      requestStop();
      return done;
    },
    cancel: () => {
      discard = true;
      requestStop();
    },
  };
}

export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error("Couldn't read the recording"));
    reader.onload = () => {
      const result = String(reader.result ?? "");
      resolve(result.slice(result.indexOf(",") + 1));
    };
    reader.readAsDataURL(blob);
  });
}
