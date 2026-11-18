import { useEffect, useState, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Bell, Check, Crown, Loader2, Lock } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";
import { resolvedYearlyTrialDays } from "@/lib/subscriptions";
import { intlLocale, useT } from "@/i18n";

const Paywall = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from || "/app/today";
  const { t, rich, lang } = useT();
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
  const trialDays = resolvedYearlyTrialDays(yearly?.introPrice);
  const reminderDays = Math.max(trialDays - 1, 1);
  const yearlyPrice = yearly?.priceString ?? null;
  const monthlyPrice = monthly?.priceString ?? null;

  const billingDate = new Date();
  billingDate.setDate(billingDate.getDate() + trialDays);
  const billingLabel = billingDate.toLocaleDateString(intlLocale(lang), {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

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

  const yearlySelected = selected === "yearly";

  if (subscriptionRequired && (status === "loading" || status === "unknown") && !yearly && !monthly) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <div className="safe-top-sm px-4 pb-2">
        <button
          type="button"
          onClick={() => navigate("/app/trial/reminder")}
          aria-label={t("common.back")}
          className="w-10 h-10 rounded-xl flex items-center justify-center text-foreground"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto flex flex-col px-5 pb-8 max-w-sm mx-auto w-full">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 180, damping: 24 }}
        >
          <h1 className="text-[1.65rem] font-bold leading-tight tracking-tight">
            {rich("paywall.headline", {
              days: trialDays,
              free: <span className="text-primary text-glow">{t("paywall.freeWord")}</span>,
            })}
          </h1>

          {yearlySelected ? (
            <ol className="relative mt-6 space-y-4 pl-12">
              <span
                aria-hidden
                className="absolute left-[15px] top-3 bottom-3 w-[3px] rounded-full bg-gradient-to-b from-primary via-primary/80 to-primary/15"
              />
              <TimelineStep
                icon={<Lock className="w-3.5 h-3.5" />}
                title={t("paywall.today")}
                body={t("paywall.todayBody")}
              />
              <TimelineStep
                icon={<Bell className="w-3.5 h-3.5" />}
                title={t("paywall.reminderWhen", { days: reminderDays })}
                body={t("paywall.reminderBody")}
              />
              <TimelineStep
                icon={<Crown className="w-3.5 h-3.5" />}
                title={t("paywall.billingWhen", { days: trialDays })}
                body={t("paywall.billingBody", { date: billingLabel })}
              />
            </ol>
          ) : (
            <p className="mt-6 text-sm text-muted-foreground leading-relaxed">
              {t("paywall.monthlyNow")}
            </p>
          )}

          <div className="mt-6 grid grid-cols-2 gap-3">
            <PlanCard
              selected={!yearlySelected}
              title={t("paywall.monthly")}
              price={monthlyPrice}
              suffix={monthlyPrice ? t("paywall.perMonth") : undefined}
              onSelect={() => setSelected("monthly")}
            />
            <PlanCard
              selected={yearlySelected}
              title={t("paywall.yearly")}
              price={yearlyPrice}
              badge={t("paywall.daysFree", { days: trialDays })}
              onSelect={() => setSelected("yearly")}
            />
          </div>

          {productsUnavailable && (
            <div className="mt-4 space-y-2">
              <p className="text-xs text-muted-foreground text-center leading-relaxed">
                {t("paywall.unavailable")}
              </p>
              <button
                type="button"
                onClick={() => void refresh()}
                className="w-full bg-card border border-border rounded-xl px-4 py-2.5 text-sm font-semibold"
              >
                {t("paywall.retry")}
              </button>
            </div>
          )}

          {yearlySelected && (
            <p className="mt-5 flex items-center justify-center gap-2 text-sm font-medium">
              <Check className="w-4 h-4 text-primary" />
              {t("paywall.noPayment")}
            </p>
          )}

          <motion.button
            type="button"
            whileTap={{ scale: 0.98 }}
            onClick={() => void handlePurchase()}
            disabled={busy !== null}
            className="w-full mt-4 rounded-full gradient-glow text-primary-foreground px-4 py-4 text-base font-bold shadow-glow disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {busy === "purchase" ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : yearlySelected ? (
              t("paywall.startMyTrial", { days: trialDays })
            ) : (
              t("paywall.subscribeMonthly")
            )}
          </motion.button>

          {err && <p className="text-destructive text-xs text-center mt-3">{err}</p>}

          <p className="mt-5 text-sm font-semibold text-center">{t("paywall.already")}</p>
          <p className="mt-1.5 text-[11px] text-muted-foreground text-center leading-relaxed">
            {yearlySelected
              ? t("paywall.legalYearly", { days: trialDays, price: yearlyPrice ?? "—" })
              : t("paywall.legalMonthly", { price: monthlyPrice ?? "—" })}
          </p>

          <div className="mt-4 flex items-center justify-center gap-3 text-[11px] text-muted-foreground">
            <a href="/terms" className="hover:text-primary">{t("common.terms")}</a>
            <span aria-hidden>·</span>
            <a href="/privacy" className="hover:text-primary">{t("common.privacy")}</a>
            <span aria-hidden>·</span>
            <button
              type="button"
              onClick={() => void handleRestore()}
              disabled={busy !== null}
              className="hover:text-primary disabled:opacity-50"
            >
              {busy === "restore" ? t("paywall.restoring") : t("paywall.restoreShort")}
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

function TimelineStep({
  icon,
  title,
  body,
}: {
  icon: ReactNode;
  title: string;
  body: string;
}) {
  return (
    <li className="relative">
      <span className="absolute -left-12 top-0 w-8 h-8 rounded-full gradient-glow text-primary-foreground flex items-center justify-center shadow-glow-sm">
        {icon}
      </span>
      <p className="text-sm font-semibold leading-8">{title}</p>
      <p className="text-xs text-muted-foreground leading-relaxed">{body}</p>
    </li>
  );
}

function PlanCard({
  selected,
  title,
  price,
  suffix,
  badge,
  onSelect,
}: {
  selected: boolean;
  title: string;
  price: string | null;
  suffix?: string;
  badge?: string;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`relative text-left rounded-2xl border-2 px-3.5 py-3.5 transition-colors ${
        selected
          ? "border-primary bg-primary/10 shadow-glow"
          : "border-border bg-card"
      }`}
    >
      {badge && (
        <span className="absolute -top-2.5 right-3 rounded-full bg-foreground text-background text-[9px] font-extrabold tracking-wide px-2 py-0.5 shadow-glow-sm">
          {badge}
        </span>
      )}
      <p className="text-sm font-semibold">{title}</p>
      <div className="mt-2 flex items-center justify-between gap-2">
        <p className="text-sm font-bold">
          {price ?? "—"}
          {suffix && price && (
            <span className="text-xs font-medium text-muted-foreground"> {suffix}</span>
          )}
        </p>
        <span
          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
            selected ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/50"
          }`}
        >
          {selected && <Check className="w-3 h-3" strokeWidth={3} />}
        </span>
      </div>
    </button>
  );
}

export default Paywall;
