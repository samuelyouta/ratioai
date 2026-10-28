import { motion } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useCallback, useEffect, useRef, useState } from "react";
import { X, Camera, Image as ImageIcon, Loader2, RefreshCw } from "lucide-react";
import RecentMeals from "@/components/app/RecentMeals";
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
    async (facing: "environment" | "user" = facingMode) => {
      const token = ++startToken.current;
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
        if (isCameraPermissionError(e)) setCameraStatus("denied");
        else if (e instanceof CameraTimeoutError) setCameraStatus("timeout");
        else setCameraStatus("unavailable");
      }
    },
    [facingMode, stopCamera],
  );

  const retryCamera = useCallback(() => {
    restartsLeft.current = 2;
    void startCamera();
  }, [startCamera]);

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
    if (scanning) return;

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

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-background flex flex-col relative"
    >
      <div className="flex-1 relative bg-black overflow-hidden min-h-[48vh]">
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
              {scanning ? "Capturing…" : showLive ? "Place food in frame" : "Snap a meal"}
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

      <motion.div className="bg-background px-6 py-6 safe-bottom">
        {!isToday(targetDay) && (
          <div className="mb-4 rounded-xl border border-primary/30 bg-primary/10 px-3 py-2">
            <p className="text-xs font-semibold text-primary">
              Adding to {formatDayLabel(targetDay)}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Anything you log here is stamped on that day, not today.
            </p>
          </div>
        )}

        <div className="mb-5">
          <RecentMeals
            limit={4}
            variant="stack"
            title="Quick re-log"
            day={targetDay}
            onLogged={() => navigate(withDay("/app/today", targetDay))}
          />
        </div>

        <div className="flex items-center justify-around">
          <button
            disabled={scanning}
            onClick={() => void openGallery()}
            className="flex flex-col items-center gap-1"
          >
            <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center">
              <ImageIcon className="w-5 h-5 text-secondary-foreground" />
            </div>
            <span className="text-[10px] text-muted-foreground">Gallery</span>
          </button>

          <motion.button
            disabled={scanning}
            onClick={() => void handleShutter()}
            whileTap={{ scale: 0.9 }}
            className="w-20 h-20 rounded-full gradient-glow shadow-glow flex items-center justify-center"
            aria-label="Take photo"
          >
            <div className="w-16 h-16 rounded-full border-4 border-primary-foreground/20 flex items-center justify-center">
              {scanning ? (
                <Loader2 className="w-7 h-7 text-primary-foreground animate-spin" />
              ) : (
                <Camera className="w-7 h-7 text-primary-foreground" />
              )}
            </div>
          </motion.button>

          <button
            disabled={scanning}
            onClick={() => {
              stopCamera();
              navigate(withDay("/app/manual", targetDay));
            }}
            className="flex flex-col items-center gap-1"
          >
            <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center">
              <span className="text-xs font-bold text-secondary-foreground">A–Z</span>
            </div>
            <span className="text-[10px] text-muted-foreground">Search</span>
          </button>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2">
          <button
            disabled={scanning}
            onClick={() => {
              stopCamera();
              navigate(withDay("/app/manual", targetDay));
            }}
            className="h-11 rounded-xl border border-border bg-secondary/40 hover:bg-secondary/60 transition-colors text-sm font-medium text-foreground/90"
          >
            Search & Edit
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
        <p className="mt-2 text-[10px] text-muted-foreground text-center">
          Can't find it? Describe it — we'll estimate the macros.
        </p>
      </motion.div>

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
