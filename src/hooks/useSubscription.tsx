import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { CustomerInfo, PurchasesPackage } from "@revenuecat/purchases-capacitor";
import { Purchases } from "@revenuecat/purchases-capacitor";
import { supabase } from "@/integrations/supabase/client";
import { isNative } from "@/lib/native";
import {
  configureRevenueCat,
  getCustomerInfo,
  getOfferings,
  hasActiveEntitlement,
  isSubscriptionRequired,
  loginRevenueCat,
  logoutRevenueCat,
  pickPaywallPackages,
  purchasePackage,
  restorePurchases,
  type SubscriptionStatus,
} from "@/lib/subscriptions";

interface SubscriptionContextValue {
  status: SubscriptionStatus;
  isPro: boolean;
  subscriptionRequired: boolean;
  monthlyPackage: PurchasesPackage | null;
  yearlyPackage: PurchasesPackage | null;
  refresh: () => Promise<void>;
  purchase: (pkg: PurchasesPackage) => Promise<boolean>;
  restore: () => Promise<boolean>;
}

const SubscriptionContext = createContext<SubscriptionContextValue | null>(null);

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const subscriptionRequired = isSubscriptionRequired();
  const [status, setStatus] = useState<SubscriptionStatus>(
    subscriptionRequired ? "loading" : "active",
  );
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [monthlyPackage, setMonthlyPackage] = useState<PurchasesPackage | null>(null);
  const [yearlyPackage, setYearlyPackage] = useState<PurchasesPackage | null>(null);

  const applyCustomerInfo = useCallback(
    (info: CustomerInfo | null) => {
      setCustomerInfo(info);
      if (!subscriptionRequired) {
        setStatus("active");
        return;
      }
      setStatus(hasActiveEntitlement(info) ? "active" : "inactive");
    },
    [subscriptionRequired],
  );

  const loadOfferings = useCallback(async () => {
    if (!isNative()) return;
    const offerings = await getOfferings();
    const { monthly, yearly } = pickPaywallPackages(offerings);
    setMonthlyPackage(monthly);
    setYearlyPackage(yearly);
  }, []);

  const refresh = useCallback(async () => {
    if (!subscriptionRequired) {
      applyCustomerInfo(null);
      return;
    }
    setStatus("loading");
    const info = await getCustomerInfo();
    applyCustomerInfo(info);
    await loadOfferings();
  }, [applyCustomerInfo, loadOfferings, subscriptionRequired]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!subscriptionRequired) {
        applyCustomerInfo(null);
        return;
      }

      const { data } = await supabase.auth.getSession();
      const userId = data.session?.user?.id;
      if (userId) {
        const info = await loginRevenueCat(userId);
        if (!cancelled) applyCustomerInfo(info);
      } else {
        await configureRevenueCat();
        const info = await getCustomerInfo();
        if (!cancelled) applyCustomerInfo(info);
      }
      if (!cancelled) await loadOfferings();
    })();

    const { data: authSub } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!subscriptionRequired) return;
      if (event === "SIGNED_IN" && session?.user) {
        const info = await loginRevenueCat(session.user.id);
        if (!cancelled) applyCustomerInfo(info);
        if (!cancelled) await loadOfferings();
      }
      if (event === "SIGNED_OUT") {
        await logoutRevenueCat();
        if (!cancelled) applyCustomerInfo(null);
      }
    });

    let rcListenerId: string | undefined;
    if (isNative()) {
      void Purchases.addCustomerInfoUpdateListener((info) => {
        if (!cancelled) applyCustomerInfo(info);
      }).then((listenerId) => {
        rcListenerId = listenerId;
      });
    }

    return () => {
      cancelled = true;
      authSub.subscription.unsubscribe();
      if (rcListenerId) {
        void Purchases.removeCustomerInfoUpdateListener({
          listenerToRemove: rcListenerId,
        });
      }
    };
  }, [applyCustomerInfo, loadOfferings, subscriptionRequired]);

  const purchase = useCallback(
    async (pkg: PurchasesPackage) => {
      try {
        const info = await purchasePackage(pkg);
        applyCustomerInfo(info);
        return hasActiveEntitlement(info);
      } catch (e: unknown) {
        const err = e as { userCancelled?: boolean };
        if (!err?.userCancelled) console.error("purchase failed", e);
        return false;
      }
    },
    [applyCustomerInfo],
  );

  const restore = useCallback(async () => {
    try {
      const info = await restorePurchases();
      applyCustomerInfo(info);
      return hasActiveEntitlement(info);
    } catch (e) {
      console.error("restore failed", e);
      return false;
    }
  }, [applyCustomerInfo]);

  const value = useMemo<SubscriptionContextValue>(
    () => ({
      status,
      isPro: !subscriptionRequired || hasActiveEntitlement(customerInfo),
      subscriptionRequired,
      monthlyPackage,
      yearlyPackage,
      refresh,
      purchase,
      restore,
    }),
    [
      status,
      subscriptionRequired,
      customerInfo,
      monthlyPackage,
      yearlyPackage,
      refresh,
      purchase,
      restore,
    ],
  );

  return (
    <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) {
    throw new Error("useSubscription must be used within SubscriptionProvider");
  }
  return ctx;
}
