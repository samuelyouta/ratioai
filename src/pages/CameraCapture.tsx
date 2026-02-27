import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { X, Zap, Camera, RotateCcw, Mic, Barcode } from "lucide-react";
import BottomNav from "@/components/BottomNav";

const CameraCapture = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col relative">
      {/* Simulated camera viewfinder */}
      <div className="flex-1 relative bg-card overflow-hidden">
        {/* Fake camera view */}
        <div className="absolute inset-0 bg-gradient-to-b from-muted/50 to-card flex items-center justify-center">
          <div className="w-64 h-64 border-2 border-primary/40 rounded-3xl relative">
            <div className="absolute -top-1 -left-1 w-8 h-8 border-t-2 border-l-2 border-primary rounded-tl-xl" />
            <div className="absolute -top-1 -right-1 w-8 h-8 border-t-2 border-r-2 border-primary rounded-tr-xl" />
            <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-2 border-l-2 border-primary rounded-bl-xl" />
            <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-2 border-r-2 border-primary rounded-br-xl" />
            
            <motion.div
              animate={{ opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <p className="text-sm text-primary font-medium">Place food here</p>
            </motion.div>
          </div>
        </div>

        {/* Top bar */}
        <div className="absolute top-0 left-0 right-0 px-4 pt-4 flex items-center justify-between z-10">
          <button
            onClick={() => navigate("/home")}
            className="w-10 h-10 rounded-xl glass border border-border flex items-center justify-center"
          >
            <X className="w-5 h-5 text-foreground" />
          </button>
          <div className="flex items-center gap-1.5 glass border border-border rounded-full px-3 py-1.5">
            <Zap className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-medium text-foreground">360° sweep mode</span>
          </div>
          <div className="w-10" />
        </div>

        {/* Tips */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="absolute bottom-6 left-4 right-4"
        >
          <div className="glass border border-border rounded-2xl p-3">
            <p className="text-xs text-muted-foreground text-center">
              💡 Tip: Slowly sweep around the plate for 3 seconds to catch hidden layers
            </p>
          </div>
        </motion.div>
      </div>

      {/* Capture controls */}
      <div className="bg-background px-6 py-6 safe-bottom">
        <div className="flex items-center justify-around">
          {/* Voice */}
          <button className="flex flex-col items-center gap-1">
            <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center">
              <Mic className="w-5 h-5 text-secondary-foreground" />
            </div>
            <span className="text-[10px] text-muted-foreground">Voice</span>
          </button>

          {/* Shutter */}
          <button
            onClick={() => navigate("/ai-result")}
            className="w-20 h-20 rounded-full gradient-glow shadow-glow flex items-center justify-center"
          >
            <div className="w-16 h-16 rounded-full border-4 border-primary-foreground/20 flex items-center justify-center">
              <Camera className="w-7 h-7 text-primary-foreground" />
            </div>
          </button>

          {/* Barcode */}
          <button className="flex flex-col items-center gap-1">
            <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center">
              <Barcode className="w-5 h-5 text-secondary-foreground" />
            </div>
            <span className="text-[10px] text-muted-foreground">Barcode</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default CameraCapture;
