import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useRef, useState } from "react";
import { X, Zap, Camera, Image as ImageIcon, Loader2, Search, Pencil, Sparkles } from "lucide-react";

const Log = () => {
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [scanning, setScanning] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    setScanning(true);
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setPreviewUrl(dataUrl);
      // Stash for the result page to read once analysis completes
      try {
        sessionStorage.setItem("ratioai.lastImage", dataUrl);
      } catch {
        // ignore quota errors
      }
      setTimeout(() => navigate("/app/analyze"), 900);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col relative">
      <div className="flex-1 relative bg-card overflow-hidden">
        {previewUrl ? (
          <img src={previewUrl} alt="Captured meal" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-b from-muted/50 to-card flex items-center justify-center">
            <div className="w-64 h-64 border-2 border-primary/40 rounded-3xl relative">
              <div className="absolute -top-1 -left-1 w-8 h-8 border-t-2 border-l-2 border-primary rounded-tl-xl" />
              <div className="absolute -top-1 -right-1 w-8 h-8 border-t-2 border-r-2 border-primary rounded-tr-xl" />
              <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-2 border-l-2 border-primary rounded-bl-xl" />
              <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-2 border-r-2 border-primary rounded-br-xl" />
              <motion.div
                animate={{ opacity: [0.3, 0.7, 0.3] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute inset-0 flex items-center justify-center"
              >
                <p className="text-sm text-primary font-medium">Place food here</p>
              </motion.div>
            </div>
          </div>
        )}

        {scanning && (
          <motion.div
            initial={{ y: "-100%" }}
            animate={{ y: "100%" }}
            transition={{ duration: 1.2, ease: "easeInOut", repeat: Infinity }}
            className="absolute left-0 right-0 h-12 bg-gradient-to-b from-transparent via-primary/40 to-transparent"
          />
        )}

        <div className="absolute top-0 left-0 right-0 px-4 pt-4 flex items-center justify-between z-10">
          <button
            onClick={() => navigate("/app/today")}
            className="w-10 h-10 rounded-xl glass border border-border flex items-center justify-center"
          >
            <X className="w-5 h-5 text-foreground" />
          </button>
          <div className="flex items-center gap-1.5 glass border border-border rounded-full px-3 py-1.5">
            <Zap className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-medium text-foreground">
              {scanning ? "Scanning…" : "Snap a meal"}
            </span>
          </div>
          <div className="w-10" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="absolute bottom-6 left-4 right-4"
        >
          <div className="glass border border-border rounded-2xl p-3">
            <p className="text-xs text-muted-foreground text-center">
              💡 Tip: include the whole plate in frame for better portion estimates
            </p>
          </div>
        </motion.div>
      </div>

      <div className="bg-background px-6 py-6 safe-bottom">
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

          <button
            disabled={scanning}
            onClick={() => fileRef.current?.click()}
            className="w-20 h-20 rounded-full gradient-glow shadow-glow flex items-center justify-center"
          >
            <div className="w-16 h-16 rounded-full border-4 border-primary-foreground/20 flex items-center justify-center">
              {scanning ? (
                <Loader2 className="w-7 h-7 text-primary-foreground animate-spin" />
              ) : (
                <Camera className="w-7 h-7 text-primary-foreground" />
              )}
            </div>
          </button>

          <button
            disabled={scanning}
            onClick={() => navigate("/app/manual")}
            className="flex flex-col items-center gap-1"
          >
            <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center">
              <Search className="w-5 h-5 text-secondary-foreground" />
            </div>
            <span className="text-[10px] text-muted-foreground">Search</span>
          </button>
        </div>

        <button
          disabled={scanning}
          onClick={() => navigate("/app/manual")}
          className="mt-5 w-full h-11 rounded-xl border border-border bg-secondary/40 hover:bg-secondary/60 transition-colors flex items-center justify-center gap-2 text-sm font-medium text-foreground/90"
        >
          <Pencil className="w-4 h-4 text-muted-foreground" />
          Search & Edit manually
        </button>
        <p className="mt-2 text-[10px] text-muted-foreground text-center">
          AI scan recommended for accuracy
        </p>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
      />
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
      />
    </div>
  );
};

export default Log;
