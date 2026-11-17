import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Check, Loader2, Sparkles } from "lucide-react";
import type { PurchasesStoreProduct } from "@revenuecat/purchases-capacitor";
import { useSubscription } from "@/hooks/useSubscription";
import { freeTrialDays } from "@/lib/subscriptions";
import { useT, type TranslationKey } from "@/i18n";
import { isNative } from "@/lib/native";

const FEATURES: TranslationKey[] = [
  "paywall.f1",
  "paywall.f2",
  "paywall.f3",
  "paywall.f4",
  "paywall.f5",
];

const Paywall = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from || "/app/today";
  const { t } = useT();
  const {
    isPro,
    status,
    monthlyPackage,
    yearlyPackage,
    monthlyProduct,
    yearlyProduct,
    purchase,
    restore,
    refresh,
    subscriptionRequired,
    productsUnavailable,
  } = useSubscription();

  const [selected, setSelected] = useState<"yearly" | "monthly">("yearly");
  const [busy, setBusy] = useState<"purchase" | "restore" | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const yearly = yearlyPackage?.product ?? yearlyProduct;
  const monthly = monthlyPackage?.product ?? monthlyProduct;
  const trialDays = freeTrialDays(yearly?.introPrice);
  const yearlyOffersTrial =
    !yearly || trialDays !== null || (yearly.introPrice != null && yearly.introPrice.price === 0);

  useEffect(() => {
    if (subscriptionRequired && isPro && status !== "loading" && status !== "unknown") {
      navigate(from, { replace: true });
    }
  }, [from, isPro, navigate, status, subscriptionRequired]);

  const handlePurchase = async () => {
    const plan =
      selected === "yearly"
        ? { pkg: yearlyPackage, product: yearlyProduct }
        : { pkg: monthlyPackage, product: monthlyProduct };
    if (!plan.pkg && !plan.product) {
      await refresh();
      setErr(t("paywall.notReady"));
      return;
    }
    setErr(null);
    setBusy("purchase");
    const ok = await purchase(plan);
    setBusy(null);
    if (ok) {
      navigate(from, { replace: true });
    } else {
      setErr(t("paywall.notCompleted"));
    }
  };

  const handleRestore = async () => {
    setErr(null);
    setBusy("restore");
    const ok = await restore();
    setBusy(null);
    if (ok) {
      navigate(from, { replace: true });
    } else {
      setErr(t("paywall.noSub"));
    }
  };

  const cta =
    selected === "monthly"
      ? t("paywall.subscribeMonthly")
      : trialDays
        ? t("paywall.startTrialDays", { days: trialDays })
        : yearlyOffersTrial
          ? t("paywall.startTrial")
          : t("paywall.subscribeYearly");

  if (subscriptionRequired && (status === "loading" || status === "unknown") && !yearly && !monthly) {
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
          <div className="h-full w-full gradient-glow" />
        </div>
      </div>

      <div className="flex-1 flex flex-col px-6 pt-8 pb-10 max-w-sm mx-auto w-full">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 180, damping: 24 }}
        >
          <div className="flex justify-center mb-5">
            <div className="w-14 h-14 rounded-2xl gradient-glow flex items-center justify-center shadow-glow">
              <Sparkles className="w-7 h-7 text-primary-foreground" />
            </div>
          </div>

          <p className="text-[10px] uppercase tracking-[0.25em] text-primary mb-2 text-center">
            RatioAi Pro
          </p>
          <h1 className="text-3xl font-bold text-foreground text-center leading-tight">
            {t("paywall.title")}
          </h1>
          <p className="text-sm text-muted-foreground text-center mt-3 leading-relaxed">
            {t("paywall.body")}
          </p>

          <ul className="mt-8 space-y-3">
            {FEATURES.map((key) => (
              <li key={key} className="flex items-center gap-3 text-sm text-foreground">
                <span className="w-5 h-5 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                  <Check className="w-3 h-3 text-primary" />
                </span>
                {t(key)}
              </li>
            ))}
          </ul>

          <div className="mt-8 space-y-3">
            <PlanCard
              selected={selected === "yearly"}
              onSelect={() => setSelected("yearly")}
              title={t("paywall.yearly")}
              detail={planDetail(yearly, trialDays, t)}
              badge={yearlyOffersTrial ? t("paywall.free") : t("paywall.best")}
            />
            <PlanCard
              selected={selected === "monthly"}
              onSelect={() => setSelected("monthly")}
              title={t("paywall.monthly")}
              detail={
                monthly ? t("paywall.monthlyPrice", { price: monthly.priceString }) : "—"
              }
            />

            {productsUnavailable && (
              <div className="py-1 space-y-3">
                <p className="text-xs text-muted-foreground text-center leading-relaxed">
                  {t("paywall.unavailable")}
                </p>
                <button
                  type="button"
                  onClick={() => void refresh()}
                  className="w-full bg-card border border-border rounded-xl px-4 py-3 text-sm font-semibold text-foreground"
                >
                  {t("paywall.retry")}
                </button>
              </div>
            )}
          </div>

          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => void handlePurchase()}
            disabled={busy !== null}
            className="w-full mt-6 gradient-glow text-primary-foreground rounded-xl px-4 py-4 text-sm font-semibold shadow-glow hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {busy === "purchase" ? <Loader2 className="w-4 h-4 animate-spin" /> : cta}
          </motion.button>

          {err && <p className="text-destructive text-xs text-center mt-3">{err}</p>}

          <p className="mt-4 text-[10px] text-muted-foreground text-center leading-relaxed">
            {t("paywall.legal")}
          </p>

          {!isNative() && !subscriptionRequired && (
            <p className="mt-3 text-[10px] text-muted-foreground text-center leading-relaxed">
              {t("paywall.iosOnly")}
            </p>
          )}

          <div className="mt-6 flex items-center justify-center gap-4 text-[11px]">
            <button
              type="button"
              onClick={() => void handleRestore()}
              disabled={busy !== null}
              className="text-muted-foreground hover:text-primary underline-offset-4 hover:underline disabled:opacity-50"
            >
              {busy === "restore" ? t("paywall.restoring") : t("paywall.restore")}
            </button>
            <a href="/terms" className="text-muted-foreground hover:text-primary underline-offset-4 hover:underline">
              {t("common.terms")}
            </a>
            <a href="/privacy" className="text-muted-foreground hover:text-primary underline-offset-4 hover:underline">
              {t("common.privacy")}
            </a>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

function planDetail(
  product: PurchasesStoreProduct | null,
  trialDays: number | null,
  t: (key: TranslationKey, params?: Record<string, string | number>) => string,
): string {
  if (!product) return "—";
  if (trialDays !== null || (product.introPrice != null && product.introPrice.price === 0)) {
    return t("paywall.yearlyTrial", { price: product.priceString });
  }
  return t("paywall.yearlyPrice", { price: product.priceString });
}

function PlanCard({
  selected,
  onSelect,
  title,
  detail,
  badge,
}: {
  selected: boolean;
  onSelect: () => void;
  title: string;
  detail: string;
  badge?: string;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full text-left rounded-2xl border px-4 py-4 transition-colors ${
        selected ? "border-primary bg-primary/[0.07]" : "border-border bg-card"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{detail}</p>
        </div>
        {badge && (
          <span className="text-[10px] uppercase tracking-wide font-semibold text-primary shrink-0">
            {badge}
          </span>
        )}
      </div>
    </button>
  );
}

export default Paywall;
