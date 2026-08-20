import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Check, Loader2, Sparkles } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";
import { formatPackagePrice } from "@/lib/subscriptions";
import type { PurchasesPackage } from "@revenuecat/purchases-capacitor";
import { isNative } from "@/lib/native";

const FEATURES = [
  "Unlimited AI meal logging",
  "Photo & voice macro analysis",
  "Personalized macro targets",
  "Streak tracking & insights",
  "Sync across all your devices",
];

const Paywall = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from || "/app/today";
  const {
    isPro,
    status,
    monthlyPackage,
    yearlyPackage,
    purchase,
    restore,
    subscriptionRequired,
  } = useSubscription();

  const [selected, setSelected] = useState<"yearly" | "monthly">("yearly");
  const [busy, setBusy] = useState<"purchase" | "restore" | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (isPro) {
      navigate(from, { replace: true });
    }
  }, [isPro, from, navigate]);

  const activePkg: PurchasesPackage | null =
    selected === "yearly" ? yearlyPackage : monthlyPackage;

  const handlePurchase = async () => {
    if (!activePkg) {
      setErr("Subscriptions are not available yet. Try again shortly.");
      return;
    }
    setErr(null);
    setBusy("purchase");
    const ok = await purchase(activePkg);
    setBusy(null);
    if (ok) {
      navigate(from, { replace: true });
    } else {
      setErr("Purchase was not completed.");
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
      setErr("No active subscription found for this Apple ID.");
    }
  };

  if (!subscriptionRequired) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <p className="text-sm text-muted-foreground text-center">
          Subscriptions are managed in the iOS app.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="safe-top-sticky">
        <div className="h-1 w-full bg-muted">
          <div className="h-full w-3/4 gradient-glow" />
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
            Your plan is ready
          </h1>
          <p className="text-sm text-muted-foreground text-center mt-3 leading-relaxed">
            Unlock full access to AI-powered macro tracking built around your body and goals.
          </p>

          <ul className="mt-8 space-y-3">
            {FEATURES.map((f) => (
              <li key={f} className="flex items-center gap-3 text-sm text-foreground">
                <span className="w-5 h-5 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                  <Check className="w-3 h-3 text-primary" />
                </span>
                {f}
              </li>
            ))}
          </ul>

          <div className="mt-8 space-y-3">
            {yearlyPackage && (
              <button
                type="button"
                onClick={() => setSelected("yearly")}
                className={`w-full text-left rounded-2xl border px-4 py-4 transition-colors ${
                  selected === "yearly"
                    ? "border-primary bg-primary/[0.07]"
                    : "border-border bg-card"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Yearly</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Best value</p>
                  </div>
                  <p className="text-sm font-bold text-foreground">
                    {formatPackagePrice(yearlyPackage)}
                    <span className="text-xs font-normal text-muted-foreground">/yr</span>
                  </p>
                </div>
              </button>
            )}

            {monthlyPackage && (
              <button
                type="button"
                onClick={() => setSelected("monthly")}
                className={`w-full text-left rounded-2xl border px-4 py-4 transition-colors ${
                  selected === "monthly"
                    ? "border-primary bg-primary/[0.07]"
                    : "border-border bg-card"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Monthly</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Flexible</p>
                  </div>
                  <p className="text-sm font-bold text-foreground">
                    {formatPackagePrice(monthlyPackage)}
                    <span className="text-xs font-normal text-muted-foreground">/mo</span>
                  </p>
                </div>
              </button>
            )}

            {status === "loading" && !monthlyPackage && !yearlyPackage && (
              <div className="flex justify-center py-6">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            )}

            {!monthlyPackage && !yearlyPackage && status !== "loading" && (
              <p className="text-xs text-muted-foreground text-center py-2">
                {isNative()
                  ? "Products are loading from the App Store. Ensure RevenueCat is configured."
                  : "Open the iOS app to subscribe."}
              </p>
            )}
          </div>

          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handlePurchase}
            disabled={busy !== null || !activePkg}
            className="w-full mt-6 gradient-glow text-primary-foreground rounded-xl px-4 py-4 text-sm font-semibold shadow-glow hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {busy === "purchase" ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              "Start my subscription"
            )}
          </motion.button>

          {err && <p className="text-destructive text-xs text-center mt-3">{err}</p>}

          <p className="mt-4 text-[10px] text-muted-foreground text-center leading-relaxed">
            Payment will be charged to your {isNative() ? "Apple ID" : "account"}. Subscription
            auto-renews unless cancelled at least 24 hours before the end of the period.
          </p>

          <div className="mt-6 flex items-center justify-center gap-4 text-[11px]">
            <button
              type="button"
              onClick={handleRestore}
              disabled={busy !== null}
              className="text-muted-foreground hover:text-primary underline-offset-4 hover:underline disabled:opacity-50"
            >
              {busy === "restore" ? "Restoring…" : "Restore Purchases"}
            </button>
            <a href="/terms" className="text-muted-foreground hover:text-primary underline-offset-4 hover:underline">
              Terms
            </a>
            <a href="/privacy" className="text-muted-foreground hover:text-primary underline-offset-4 hover:underline">
              Privacy
            </a>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Paywall;
