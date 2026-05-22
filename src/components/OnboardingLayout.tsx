import { motion } from "framer-motion";

interface OnboardingLayoutProps {
  step: number;
  totalSteps: number;
  children: React.ReactNode;
}

const OnboardingLayout = ({ step, totalSteps, children }: OnboardingLayoutProps) => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Progress bar */}
      <div className="px-6 pt-4 pb-2">
        <div className="flex gap-1.5">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div key={i} className="flex-1 h-1 rounded-full overflow-hidden bg-muted">
              {i <= step && (
                <motion.div
                  className="h-full gradient-glow rounded-full"
                  initial={{ width: i < step ? "100%" : "0%" }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      <motion.div
        key={step}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.3 }}
        className="flex-1 flex flex-col justify-center px-6 py-6 max-w-md mx-auto w-full"
      >
        {children}
      </motion.div>

      <div className="px-6 pb-4 flex items-center justify-center gap-2">
        <a href="/privacy" className="text-[11px] text-muted-foreground hover:text-primary transition-colors">
          Privacy
        </a>
        <span className="text-muted-foreground/30 text-[11px]">·</span>
        <a href="/terms" className="text-[11px] text-muted-foreground hover:text-primary transition-colors">
          Terms
        </a>
      </div>
    </div>
  );
};

export default OnboardingLayout;
