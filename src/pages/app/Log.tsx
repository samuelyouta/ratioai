import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useRef, useState } from "react";
import { X, Camera, Image as ImageIcon, Loader2 } from "lucide-react";
import RecentMeals from "@/components/app/RecentMeals";
import { compressImageForAnalysis } from "@/lib/image";
import { isNative } from "@/lib/native";
import { useNativeFeatures } from "@/hooks/useNativeFeatures";
import { toast } from "sonner";

const LAST_IMAGE_KEY = "ratioai.lastImage";

const Log = () => {
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [scanning, setScanning] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const { takePhoto } = useNativeFeatures();

  const storeAndAnalyze = async (dataUrl: string) => {
    setScanning(true);
    try {
      const compressed = await compressImageForAnalysis(dataUrl);
      setPreviewUrl(compressed);
      try {
        sessionStorage.setItem(LAST_IMAGE_KEY, compressed);
      } catch {
        toast.warning("Couldn't cache preview", { description: "Analysis will still run." });
      }
      navigate("/app/analyze");
    } catch {
      toast.error("Couldn't process that image", { description: "Try another photo." });
      setScanning(false);
    }
  };

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file");
      return;
    }
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    await storeAndAnalyze(dataUrl);
  };

  const handleCameraCapture = async () => {
    if (isNative()) {
      setScanning(true);
      try {
        const dataUrl = await takePhoto();
        if (!dataUrl) {
          setScanning(false);
          return;
        }
        await storeAndAnalyze(dataUrl);
      } catch {
        toast.error("Camera unavailable", { description: "Check camera permissions in Settings." });
        setScanning(false);
      }
      return;
    }
    fileRef.current?.click();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-background flex flex-col relative"
    >
      <div className="flex-1 relative bg-card overflow-hidden min-h-[42vh]">
        {previewUrl ? (
          <img src={previewUrl} alt="Captured meal" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="absolute inset-0 bg-gradient-to-b from-muted/50 to-card flex items-center justify-center"
          >
            <p className="text-sm text-primary font-medium tracking-wide">Place food in frame</p>
          </motion.div>
        )}

        {/* Thin bounding-box viewfinder with corner brackets */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="relative w-64 h-64">
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


        <div className="absolute top-0 left-0 right-0 px-4 pt-4 flex items-center justify-between z-10">
          <button
            onClick={() => navigate("/app/today")}
            className="w-10 h-10 rounded-xl glass border border-border flex items-center justify-center"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-foreground" />
          </button>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="glass border border-border rounded-full px-3 py-1.5"
          >
            <span className="text-xs font-medium text-foreground">
              {scanning ? "Preparing…" : "Snap a meal"}
            </span>
          </motion.div>
          <div className="w-10 h-10 rounded-xl glass border border-border flex items-center justify-center">
            <span className="text-sm">🔬</span>
          </div>
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
        <div className="mb-5">
          <RecentMeals limit={4} variant="stack" title="Quick re-log" onLogged={() => navigate("/app/today")} />
        </div>

        <div className="flex items-center justify-around">
          <button
            disabled={scanning}
            onClick={() => galleryRef.current?.click()}
            className="flex flex-col items-center gap-1"
          >
            <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center">
              <ImageIcon className="w-5 h-5 text-secondary-foreground" />
            </div>
            <span className="text-[10px] text-muted-foreground">Gallery</span>
          </button>

          <motion.button
            disabled={scanning}
            onClick={handleCameraCapture}
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
            onClick={() => navigate("/app/manual")}
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
            onClick={() => navigate("/app/manual")}
            className="h-11 rounded-xl border border-border bg-secondary/40 hover:bg-secondary/60 transition-colors text-sm font-medium text-foreground/90"
          >
            Search & Edit
          </button>
          <button
            disabled={scanning}
            onClick={() => navigate("/app/describe")}
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
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) void handleFile(file);
        }}
      />
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
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
