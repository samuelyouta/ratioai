import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Bell, Loader2 } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";
import { enableTrialReminders } from "@/lib/trialReminder";
import { useT } from "@/i18n";

const TrialReminder = () => {
  const navigate = useNavigate();
  const { t } = useT();
  const { isPro, status, subscriptionRequired } = useSubscription();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (subscriptionRequired && isPro && status !== "loading" && status !== "unknown") {
      navigate("/app/today", { replace: true });
    }
  }, [isPro, navigate, status, subscriptionRequired]);

  const continueToPaywall = async () => {
    setBusy(true);
    try {
      await enableTrialReminders();
    } finally {
      setBusy(false);
      navigate("/app/paywall");
    }
  };

  if (subscriptionRequired && (status === "loading" || status === "unknown")) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="safe-top-sticky">
        <div className="h-1 w-full bg-muted">
          <div className="h-full w-2/3 gradient-glow" />
        </div>
      </div>

      <div className="flex-1 flex flex-col px-6 pt-10 pb-10 max-w-sm mx-auto w-full">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 180, damping: 24 }}
          className="flex-1 flex flex-col"
        >
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-full bg-primary/15 flex items-center justify-center">
              <Bell className="w-8 h-8 text-primary" />
            </div>
          </div>

          <h1 className="text-3xl font-bold text-foreground text-center leading-tight">
            {t("trial.reminder.title")}
          </h1>
          <p className="text-sm text-muted-foreground text-center mt-4 leading-relaxed">
            {t("trial.reminder.body")}
          </p>
          <p className="text-xs text-muted-foreground text-center mt-3 leading-relaxed">
            {t("trial.reminder.note")}
          </p>

          <div className="mt-auto pt-10">
            <motion.button
              type="button"
              whileTap={{ scale: 0.97 }}
              onClick={() => void continueToPaywall()}
              disabled={busy}
              className="w-full rounded-full gradient-glow text-primary-foreground px-4 py-4 text-base font-bold shadow-glow disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : t("trial.reminder.cta")}
            </motion.button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default TrialReminder;
