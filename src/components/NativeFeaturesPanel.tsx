import { motion, AnimatePresence } from "framer-motion";
import { Bell, Check, Heart, Smartphone } from "lucide-react";
import { useNativeFeatures } from "@/hooks/useNativeFeatures";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Props {
  email?: string;
}

const NativeFeaturesPanel = ({ email }: Props) => {
  const { isNative, platform, pushPermission, enablePush, requestHealth, tapHaptic } =
    useNativeFeatures(email);

  if (!isNative) return null;

  const handleEnablePush = async () => {
    await tapHaptic();
    const result = await enablePush();
    if (result === "granted") toast.success("Notifications enabled");
    else if (result === "denied") toast.error("Notifications blocked in Settings");
  };

  const handleHealth = async () => {
    await tapHaptic();
    const result = await requestHealth();
    if (result === "granted") toast.success(`${platform === "ios" ? "Apple Health" : "Google Fit"} connected`);
    else if (result === "denied") toast.error("Health access denied");
    else toast.error("Health not available on this device");
  };

  return (
    <AnimatePresence>
      <motion.section
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 180, damping: 24 }}
        className="mt-8 rounded-2xl border border-border/40 bg-card/40 backdrop-blur p-5"
      >
        <div className="flex items-center gap-2 mb-4">
          <Smartphone className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold tracking-wide uppercase text-foreground/80">
            Native preview · {platform}
          </h3>
        </div>

        <div className="space-y-3">
          <Button
            onClick={handleEnablePush}
            variant="secondary"
            className="w-full justify-between"
            disabled={pushPermission === "granted"}
          >
            <span className="flex items-center gap-2">
              <Bell className="w-4 h-4" />
              {pushPermission === "granted" ? "Notifications on" : "Enable push notifications"}
            </span>
            {pushPermission === "granted" && <Check className="w-4 h-4 text-primary" />}
          </Button>

          <Button
            onClick={handleHealth}
            variant="secondary"
            className="w-full justify-between"
          >
            <span className="flex items-center gap-2">
              <Heart className="w-4 h-4" />
              Connect {platform === "ios" ? "Apple Health" : "Google Fit"}
            </span>
          </Button>
        </div>

        <p className="mt-3 text-xs text-muted-foreground">
          We'll let you know the moment your spot opens up.
        </p>
      </motion.section>
    </AnimatePresence>
  );
};

export default NativeFeaturesPanel;
