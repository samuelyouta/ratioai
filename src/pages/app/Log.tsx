import { motion } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useCallback, useEffect, useRef, useState } from "react";
import { X, Camera, Image as ImageIcon, History as HistoryIcon, Loader2, RefreshCw } from "lucide-react";
import RecentMeals from "@/components/app/RecentMeals";
import MealPickerSheet from "@/components/app/MealPickerSheet";
import { compressImageForAnalysis, isLikelyImageFile } from "@/lib/image";
import { setPendingMealImage } from "@/lib/mealImageStore";
import { isNative } from "@/lib/native";
import { useNativeFeatures } from "@/hooks/useNativeFeatures";
import { App as CapApp } from "@capacitor/app";
import {
  CameraTimeoutError,
  isCameraPermissionError,
  openCameraStream,
  attachStream,
  stopStream,
  withTimeout,
} from "@/lib/camera";
import { formatDayLabel, isToday } from "@/lib/dayKey";
import { readDayParam, withDay } from "@/lib/loggingDay";
import { scansLeftToday, DAILY_SCAN_LIMIT } from "@/lib/scanQuota";
import { toast } from "sonner";

type CameraStatus = "starting" | "live" | "denied" | "unavailable" | "timeout";

const Log = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const targetDay = readDayParam(searchParams);
  const galleryRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [scanning, setScanning] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const scanningRef = useRef(false);
  const previewRef = useRef<string | null>(null);
  scanningRef.current = scanning;
  previewRef.current = previewUrl;
  const [cameraStatus, setCameraStatus] = useState<CameraStatus>("starting");
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const { takePhoto, pickFromGallery, tapHaptic } = useNativeFeatures();

  const startToken = useRef(0);
  const restartsLeft = useRef(2);
  const lastStartAt = useRef(0);
  const [slowStart, setSlowStart] = useState(false);

  const stopCamera = useCallback(() => {
    stopStream(streamRef.current);
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  /** Invalidates any start that is still in flight, so a late stream can't resurrect the camera. */
  const cancelPendingStart = useCallback(() => {
    startToken.current += 1;
  }, []);

  const startCamera = useCallback(
    async (facing: "environment" | "user" = facingMode, autoRetry = true) => {
      const token = ++startToken.current;
      lastStartAt.current = Date.now();
      const stale = () => token !== startToken.current;

      setCameraStatus("starting");
      stopCamera();

      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraStatus("unavailable");
        return;
      }

      let stream: MediaStream | null = null;
      try {
        stream = await openCameraStream(facing);
        if (stale()) {
          stopStream(stream);
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (!video) throw new Error("Camera view not ready");
        await attachStream(video, stream);
        if (stale()) return;

        stream.getVideoTracks().forEach((track) =>
          track.addEventListener("ended", () => {
            if (stale() || scanningRef.current) return;
            if (restartsLeft.current > 0) {
              restartsLeft.current -= 1;
              void startCamera(facing);
            } else {
              setCameraStatus("unavailable");
            }
          }),
        );
        setCameraStatus("live");
      } catch (e) {
        if (stale()) {
          stopStream(stream);
          return;
        }
        console.warn("camera start failed", e);
        stopCamera();
        if (e instanceof CameraTimeoutError && autoRetry) {
          // The first start after a long idle is the one most likely to stall; one quiet retry usually clears it.
          await new Promise((resolve) => window.setTimeout(resolve, 300));
          if (!stale()) void startCamera(facing, false);
          return;
        }
        if (isCameraPermissionError(e)) setCameraStatus("denied");
        else if (e instanceof CameraTimeoutError) setCameraStatus("timeout");
        else setCameraStatus("unavailable");
      }
    },
    [facingMode, stopCamera],
  );

  const retryCamera = useCallback(() => {
    // Foreground events can arrive twice (page visibility and the native app state); one start is enough.
    if (Date.now() - lastStartAt.current < 1_000) return;
    restartsLeft.current = 2;
    void startCamera();
  }, [startCamera]);

  useEffect(() => {
    setSlowStart(false);
    if (cameraStatus !== "starting") return;
    const timer = window.setTimeout(() => setSlowStart(true), 3_000);
    return () => window.clearTimeout(timer);
  }, [cameraStatus]);

  useEffect(() => {
    void startCamera(facingMode);
    return () => {
      cancelPendingStart();
      stopCamera();
    };
  }, [facingMode, startCamera, stopCamera, cancelPendingStart]);

  // A backgrounded app loses its camera; release it and bring it back on return.
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        cancelPendingStart();
        stopCamera();
      } else if (!scanningRef.current && !previewRef.current) {
        retryCamera();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    let appListener: { remove: () => Promise<void> } | null = null;
    let disposed = false;
    if (isNative()) {
      void CapApp.addListener("appStateChange", ({ isActive }) => {
        if (!isActive) {
          cancelPendingStart();
          stopCamera();
        } else if (!scanningRef.current && !previewRef.current) {
          retryCamera();
        }
      }).then((handle) => {
        if (disposed) void handle.remove();
        else appListener = handle;
      });
    }

    return () => {
      disposed = true;
      document.removeEventListener("visibilitychange", onVisibility);
      void appListener?.remove();
    };
  }, [cancelPendingStart, retryCamera, stopCamera]);

  /** Photo scans are capped per day; point people at the other ways to log once they are used up. */
  const scanAllowed = () => {
    if (scansLeftToday() > 0) return true;
    toast.error("Daily scan limit reached", {
      description: `You've used all ${DAILY_SCAN_LIMIT} photo scans for today. You can still log with Search & Edit or Describe Meal.`,
    });
    return false;
  };

  const storeAndAnalyze = async (dataUrl: string) => {
    setScanning(true);
    cancelPendingStart();
    stopCamera();
    try {
      const compressed = await withTimeout(
        compressImageForAnalysis(dataUrl),
        20_000,
        () => new Error("Preparing the photo took too long. Please try again."),
      );
      setPreviewUrl(compressed);
      setPendingMealImage(compressed);
      navigate(withDay("/app/analyze", targetDay));
    } catch (e) {
      console.error(e);
      toast.error("Couldn't load that photo", {
        description:
          e instanceof Error
            ? e.message
            : "Try another image, or take a new photo with the camera.",
      });
      setScanning(false);
      void startCamera();
    }
  };

  const captureFromStream = async () => {
    if (!scanAllowed()) return;
    const video = videoRef.current;
    if (!video || video.readyState < 2) {
      toast.error("Camera not ready", { description: "Wait a moment and try again." });
      return;
    }

    setScanning(true);
    void tapHaptic();

    try {
      const width = video.videoWidth || 1280;
      const height = video.videoHeight || 720;
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas unavailable");
      ctx.drawImage(video, 0, 0, width, height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
      await storeAndAnalyze(dataUrl);
    } catch {
      toast.error("Couldn't capture photo");
      setScanning(false);
    }
  };

  const handleFile = async (file: File) => {
    if (!isLikelyImageFile(file)) {
      toast.error("Please choose an image file");
      return;
    }
    setScanning(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error ?? new Error("Failed to read image"));
        reader.readAsDataURL(file);
      });
      await storeAndAnalyze(dataUrl);
    } catch {
      toast.error("Couldn't load that photo", {
        description: "Try another image, or take a new photo with the camera.",
      });
      setScanning(false);
      void startCamera();
    }
  };

  const openGallery = async () => {
    if (scanning || !scanAllowed()) return;

    // Native: use Capacitor Photos picker (converts HEIC → JPEG).
    if (isNative()) {
      setScanning(true);
      cancelPendingStart();
      stopCamera();
      try {
        const dataUrl = await pickFromGallery();
        if (!dataUrl) {
          setScanning(false);
          void startCamera();
          return;
        }
        await storeAndAnalyze(dataUrl);
      } catch (e) {
        console.error(e);
        toast.error("Couldn't load that photo", {
          description:
            e instanceof Error ? e.message : "Allow Photos access in Settings, then try again.",
        });
        setScanning(false);
        void startCamera();
      }
      return;
    }

    galleryRef.current?.click();
  };

  /** Fallback when live preview isn't available (permissions / old WebView). */
  const handleNativeFallbackCapture = async () => {
    if (!isNative()) {
      toast.error("Camera unavailable", { description: "Allow camera access and try again." });
      return;
    }
    if (!scanAllowed()) return;
    setScanning(true);
    cancelPendingStart();
    stopCamera();
    try {
      const dataUrl = await takePhoto();
      if (!dataUrl) {
        setScanning(false);
        void startCamera();
        return;
      }
      await storeAndAnalyze(dataUrl);
    } catch {
      toast.error("Camera unavailable", { description: "Check camera permissions in Settings." });
      setScanning(false);
      void startCamera();
    }
  };

  const handleShutter = async () => {
    if (scanning) return;
    if (cameraStatus === "live") {
      await captureFromStream();
      return;
    }
    await handleNativeFallbackCapture();
  };

  const flipCamera = () => {
    if (scanning) return;
    setFacingMode((prev) => (prev === "environment" ? "user" : "environment"));
  };

  const showLive = cameraStatus === "live" && !previewUrl;
  const scansLeft = scansLeftToday();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="h-[100dvh] bg-background flex flex-col relative overflow-hidden"
    >
      <div className="flex-1 min-h-0 relative bg-black overflow-hidden">
        {/* Live camera feed */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`absolute inset-0 w-full h-full object-cover transition-opacity ${
            showLive ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
        />

        {previewUrl ? (
          <img src={previewUrl} alt="Captured meal" className="absolute inset-0 w-full h-full object-cover" />
        ) : null}

        {!showLive && !previewUrl && (
          <div className="absolute inset-0 bg-gradient-to-b from-muted/50 to-card flex flex-col items-center justify-center gap-3 px-6">
            {cameraStatus === "starting" ? (
              <>
                <Loader2 className="w-6 h-6 text-primary animate-spin" />
                <p className="text-sm text-primary font-medium tracking-wide">Starting camera…</p>
                {slowStart && (
                  <div className="mt-1 flex flex-col items-center gap-2">
                    <p className="text-xs text-muted-foreground text-center">
                      Taking longer than usual. You don't have to wait.
                    </p>
                    <div className="flex gap-2">
                      {isNative() && (
                        <button
                          type="button"
                          onClick={() => void handleNativeFallbackCapture()}
                          className="px-4 h-10 rounded-xl gradient-glow text-xs font-semibold text-primary-foreground"
                        >
                          Open system camera
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => void openGallery()}
                        className="px-4 h-10 rounded-xl border border-border bg-secondary text-xs font-semibold text-foreground"
                      >
                        Pick from Gallery
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                <p className="text-sm text-foreground font-medium text-center">
                  {cameraStatus === "denied"
                    ? "Camera permission needed"
                    : cameraStatus === "timeout"
                      ? "The camera is taking too long"
                      : "Camera unavailable"}
                </p>
                <p className="text-xs text-muted-foreground text-center">
                  {cameraStatus === "denied"
                    ? "Allow camera access in Settings to frame your meal, or pick a photo from Gallery."
                    : isNative()
                      ? "Open the system camera, pick from Gallery, or try the live preview again."
                      : "Pick a photo from Gallery, or try the camera again."}
                </p>
                <div className="mt-1 flex flex-col items-center gap-2">
                  {isNative() && cameraStatus !== "denied" && (
                    <button
                      type="button"
                      onClick={() => void handleNativeFallbackCapture()}
                      className="px-4 h-10 rounded-xl gradient-glow text-xs font-semibold text-primary-foreground"
                    >
                      Open system camera
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={retryCamera}
                    className="text-xs font-semibold text-primary underline-offset-4 hover:underline"
                  >
                    Try again
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Viewfinder */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="relative w-64 h-64 sm:w-72 sm:h-72">
            <div className="absolute inset-0 border border-primary/30 rounded-2xl" />
            {[
              "top-0 left-0 border-t-2 border-l-2 rounded-tl-2xl",
              "top-0 right-0 border-t-2 border-r-2 rounded-tr-2xl",
              "bottom-0 left-0 border-b-2 border-l-2 rounded-bl-2xl",
              "bottom-0 right-0 border-b-2 border-r-2 rounded-br-2xl",
            ].map((pos) => (
              <div
                key={pos}
                className={`absolute w-6 h-6 border-primary ${pos}`}
                style={{ boxShadow: "0 0 10px hsl(var(--primary) / 0.5)" }}
              />
            ))}
            {scanning && (
              <motion.div
                initial={{ top: 0, opacity: 0.9 }}
                animate={{ top: "100%", opacity: 1 }}
                transition={{ duration: 1.2, ease: "easeInOut", repeat: Infinity }}
                className="absolute left-0 right-0 h-[2px] bg-primary"
                style={{ boxShadow: "0 0 16px hsl(var(--primary)), 0 0 32px hsl(var(--primary) / 0.6)" }}
              />
            )}
          </div>
        </div>

        <div className="absolute top-0 left-0 right-0 px-4 safe-top-sm flex items-center justify-between z-10">
          <button
            onClick={() => {
              stopCamera();
              navigate(withDay("/app/today", targetDay));
            }}
            className="w-10 h-10 rounded-xl glass border border-border flex items-center justify-center"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-foreground" />
          </button>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.15 }}
            className="glass border border-border rounded-full px-3 py-1.5"
          >
            <span className="text-xs font-medium text-foreground">
              {scanning
                ? "Capturing…"
                : scansLeft <= 5
                  ? scansLeft === 0
                    ? "No scans left today"
                    : `${scansLeft} scan${scansLeft === 1 ? "" : "s"} left today`
                  : showLive
                    ? "Place food in frame"
                    : "Snap a meal"}
            </span>
          </motion.div>
          <button
            type="button"
            disabled={scanning || cameraStatus !== "live"}
            onClick={flipCamera}
            className="w-10 h-10 rounded-xl glass border border-border flex items-center justify-center disabled:opacity-40"
            aria-label="Flip camera"
          >
            <RefreshCw className="w-4 h-4 text-foreground" />
          </button>
        </div>

        <div className="absolute bottom-6 left-4 right-4">
          <div className="glass border border-border rounded-2xl p-3">
            <p className="text-xs text-muted-foreground text-center">
              Tip: include the whole plate in frame for better portion estimates
            </p>
          </div>
        </div>
      </div>

      <motion.div className="shrink-0 bg-background px-4 pt-3 pb-3 safe-bottom">
        {!isToday(targetDay) && (
          <p className="mb-2 rounded-lg border border-primary/30 bg-primary/10 px-3 py-1.5 text-[11px] font-semibold text-primary">
            Adding to {formatDayLabel(targetDay)} · not today
          </p>
        )}

        <div className="mb-3">
          <RecentMeals
            limit={6}
            variant="chips"
            title="Quick re-log"
            day={targetDay}
            onLogged={() => navigate(withDay("/app/today", targetDay))}
          />
        </div>

        <div className="flex items-center justify-around">
          <button
            disabled={scanning}
            onClick={() => void openGallery()}
            className="flex flex-col items-center gap-1 w-16"
          >
            <div className="w-11 h-11 rounded-xl bg-secondary flex items-center justify-center">
              <ImageIcon className="w-5 h-5 text-secondary-foreground" />
            </div>
            <span className="text-[10px] text-muted-foreground">Gallery</span>
          </button>

          <motion.button
            disabled={scanning}
            onClick={() => void handleShutter()}
            whileTap={{ scale: 0.9 }}
            className="w-[4.5rem] h-[4.5rem] rounded-full gradient-glow shadow-glow flex items-center justify-center"
            aria-label="Take photo"
          >
            <div className="w-14 h-14 rounded-full border-4 border-primary-foreground/20 flex items-center justify-center">
              {scanning ? (
                <Loader2 className="w-6 h-6 text-primary-foreground animate-spin" />
              ) : (
                <Camera className="w-6 h-6 text-primary-foreground" />
              )}
            </div>
          </motion.button>

          <button
            disabled={scanning}
            onClick={() => setPickerOpen(true)}
            className="flex flex-col items-center gap-1 w-16"
          >
            <div className="w-11 h-11 rounded-xl bg-secondary flex items-center justify-center">
              <HistoryIcon className="w-5 h-5 text-secondary-foreground" />
            </div>
            <span className="text-[10px] text-muted-foreground">All meals</span>
          </button>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            disabled={scanning}
            onClick={() => {
              stopCamera();
              navigate(withDay("/app/manual", targetDay));
            }}
            className="h-11 rounded-xl border border-border bg-secondary/40 hover:bg-secondary/60 transition-colors text-sm font-medium text-foreground/90"
          >
            Search &amp; Edit
          </button>
          <button
            disabled={scanning}
            onClick={() => {
              stopCamera();
              navigate(withDay("/app/describe", targetDay));
            }}
            className="h-11 rounded-xl border border-primary/30 bg-primary/10 hover:bg-primary/15 transition-colors text-sm font-medium text-foreground"
          >
            Describe Meal
          </button>
        </div>
      </motion.div>

      <MealPickerSheet
        open={pickerOpen}
        day={targetDay}
        onClose={() => setPickerOpen(false)}
        onLogged={() => {
          stopCamera();
          navigate(withDay("/app/today", targetDay));
        }}
      />

      <input
        ref={galleryRef}
        type="file"
        accept="image/*,.heic,.heif,image/heic,image/heif"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) void handleFile(file);
        }}
      />
    </motion.div>
  );
};

export default Log;
