import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Check, Sparkles } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";
import { useT, type TranslationKey } from "@/i18n";

const POINTS: TranslationKey[] = ["paywall.f1", "paywall.f2", "paywall.f3"];

const TrialIntro = () => {
  const navigate = useNavigate();
  const { t } = useT();
  const { isPro, status, subscriptionRequired } = useSubscription();

  useEffect(() => {
    if (subscriptionRequired && isPro && status !== "loading" && status !== "unknown") {
      navigate("/app/today", { replace: true });
    }
  }, [isPro, navigate, status, subscriptionRequired]);

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
          <div className="h-full w-1/3 gradient-glow" />
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
            <div className="w-16 h-16 rounded-2xl gradient-glow flex items-center justify-center shadow-glow">
              <Sparkles className="w-8 h-8 text-primary-foreground" />
            </div>
          </div>

          <h1 className="text-3xl font-bold text-foreground text-center leading-tight">
            {t("trial.intro.title")}
          </h1>
          <p className="text-sm text-muted-foreground text-center mt-4 leading-relaxed">
            {t("trial.intro.body")}
          </p>

          <ul className="mt-8 space-y-3">
            {POINTS.map((key) => (
              <li key={key} className="flex items-center gap-3 text-sm text-foreground">
                <span className="w-5 h-5 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                  <Check className="w-3 h-3 text-primary" />
                </span>
                {t(key)}
              </li>
            ))}
          </ul>

          <div className="mt-auto pt-10">
            <motion.button
              type="button"
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate("/app/trial/reminder")}
              className="w-full gradient-glow text-primary-foreground rounded-xl px-4 py-4 text-sm font-semibold shadow-glow"
            >
              {t("trial.intro.cta")}
            </motion.button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default TrialIntro;
