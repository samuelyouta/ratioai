import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Check, Loader2 } from "lucide-react";
import mealScan from "@/assets/trial-meal-scan.png";
import { useSubscription } from "@/hooks/useSubscription";
import { yearlyPerMonthLabel } from "@/lib/subscriptions";
import { intlLocale, useT } from "@/i18n";

const TrialIntro = () => {
  const navigate = useNavigate();
  const { t, lang } = useT();
  const {
    isPro,
    status,
    subscriptionRequired,
    yearlyPackage,
    yearlyProduct,
    restore,
  } = useSubscription();
  const [busy, setBusy] = useState(false);

  const yearly = yearlyPackage?.product ?? yearlyProduct;
  const yearlyPrice = yearly?.priceString ?? null;
  const perMonth = yearlyPerMonthLabel(yearly, intlLocale(lang));

  useEffect(() => {
    if (subscriptionRequired && isPro && status !== "loading" && status !== "unknown") {
      navigate("/app/today", { replace: true });
    }
  }, [isPro, navigate, status, subscriptionRequired]);

  const handleRestore = async () => {
    setBusy(true);
    const ok = await restore();
    setBusy(false);
    if (ok) navigate("/app/today", { replace: true });
  };

  if (subscriptionRequired && (status === "loading" || status === "unknown")) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col overflow-y-auto">
      <div className="flex-1 flex flex-col px-6 pb-6 max-w-sm mx-auto w-full safe-top">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 180, damping: 24 }}
          className="flex-1 flex flex-col"
        >
          <h1 className="text-[2rem] font-extrabold text-center leading-[1.12] tracking-tight">
            {t("trial.intro.title")}
          </h1>

          <div className="flex items-center justify-center py-4">
            <div className="relative w-[196px] rounded-[2.1rem] border border-primary/40 bg-black p-[6px] shadow-glow">
              <div className="pointer-events-none absolute left-1/2 top-[10px] z-10 h-3 w-14 -translate-x-1/2 rounded-full bg-black ring-1 ring-primary/30" />
              <div className="overflow-hidden rounded-[1.65rem] bg-black">
                <img
                  src={mealScan}
                  alt={t("trial.intro.previewAlt")}
                  className="block h-auto w-full"
                />
              </div>
            </div>
          </div>

          <p className="flex items-center justify-center gap-2 text-sm font-semibold">
            <Check className="w-4 h-4 text-primary" />
            {t("paywall.noPayment")}
          </p>

          <motion.button
            type="button"
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate("/app/trial/reminder")}
            className="w-full mt-4 rounded-full gradient-glow text-primary-foreground px-4 py-4 text-base font-bold shadow-glow"
          >
            {t("trial.intro.cta")}
          </motion.button>

          <p className="mt-5 text-sm font-semibold text-center">{t("paywall.already")}</p>
          {yearlyPrice && (
            <p className="mt-1 text-xs text-muted-foreground text-center">
              {perMonth
                ? t("trial.intro.yearlyLine", { price: yearlyPrice, perMonth })
                : t("trial.intro.yearlyOnly", { price: yearlyPrice })}
            </p>
          )}

          <div className="mt-4 flex items-center justify-center gap-3 text-[11px] text-muted-foreground">
            <a href="/terms" className="hover:text-primary">{t("common.terms")}</a>
            <span aria-hidden>·</span>
            <a href="/privacy" className="hover:text-primary">{t("common.privacy")}</a>
            <span aria-hidden>·</span>
            <button
              type="button"
              onClick={() => void handleRestore()}
              disabled={busy}
              className="hover:text-primary disabled:opacity-50"
            >
              {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : t("paywall.restoreShort")}
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default TrialIntro;
