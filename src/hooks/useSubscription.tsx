import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { CustomerInfo, PurchasesPackage, PurchasesStoreProduct } from "@revenuecat/purchases-capacitor";
import { Purchases } from "@revenuecat/purchases-capacitor";
import { supabase } from "@/integrations/supabase/client";
import { isNative } from "@/lib/native";
import {
  configureRevenueCat,
  ENTITLEMENT_ID,
  getCustomerInfo,
  hasActiveEntitlement,
  isSubscriptionRequired,
  loadPaywallPlans,
  loginRevenueCat,
  logoutRevenueCat,
  purchasePackage,
  purchaseStoreProduct,
  restorePurchases,
  type SubscriptionStatus,
} from "@/lib/subscriptions";
import { scheduleTrialEndReminder } from "@/lib/trialReminder";
import { isReviewerEmail } from "@/lib/reviewerAccess";
import { trackCheckoutStarted, trackSubscriptionPurchased } from "@/lib/adEvents";

interface SubscriptionContextValue {
  status: SubscriptionStatus;
  isPro: boolean;
  subscriptionRequired: boolean;
  /** No purchasable products came back from the store (e.g. IAPs not approved yet). */
  productsUnavailable: boolean;
  monthlyPackage: PurchasesPackage | null;
  yearlyPackage: PurchasesPackage | null;
  monthlyProduct: PurchasesStoreProduct | null;
  yearlyProduct: PurchasesStoreProduct | null;
  refresh: () => Promise<void>;
  purchase: (plan: {
    pkg: PurchasesPackage | null;
    product: PurchasesStoreProduct | null;
  }) => Promise<boolean>;
  restore: () => Promise<boolean>;
}

const SubscriptionContext = createContext<SubscriptionContextValue | null>(null);

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const subscriptionRequired = isSubscriptionRequired();
  const [status, setStatus] = useState<SubscriptionStatus>(
    subscriptionRequired ? "loading" : "active",
  );
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [reviewerBypass, setReviewerBypass] = useState(false);
  const [monthlyPackage, setMonthlyPackage] = useState<PurchasesPackage | null>(null);
  const [yearlyPackage, setYearlyPackage] = useState<PurchasesPackage | null>(null);
  const [monthlyProduct, setMonthlyProduct] = useState<PurchasesStoreProduct | null>(null);
  const [yearlyProduct, setYearlyProduct] = useState<PurchasesStoreProduct | null>(null);
  const [productsUnavailable, setProductsUnavailable] = useState(false);

  const applyCustomerInfo = useCallback(
    (info: CustomerInfo | null) => {
      setCustomerInfo(info);
      if (!subscriptionRequired) {
        setStatus("active");
        return;
      }
      setStatus(hasActiveEntitlement(info) ? "active" : "inactive");
      const ent = info?.entitlements.active[ENTITLEMENT_ID];
      if (
        ent?.isActive &&
        ent.expirationDateMillis &&
        (ent.periodType === "TRIAL" || ent.periodType === "INTRO")
      ) {
        void scheduleTrialEndReminder(ent.expirationDateMillis);
      }
    },
    [subscriptionRequired],
  );

  const loadOfferings = useCallback(async () => {
    if (!isNative()) return;
    const plans = await loadPaywallPlans();
    setMonthlyPackage(plans.monthlyPackage);
    setYearlyPackage(plans.yearlyPackage);
    setMonthlyProduct(plans.monthlyProduct);
    setYearlyProduct(plans.yearlyProduct);
    setProductsUnavailable(!plans.monthlyProduct && !plans.yearlyProduct);
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
    async (plan: { pkg: PurchasesPackage | null; product: PurchasesStoreProduct | null }) => {
      const storeProduct = plan.pkg?.product ?? plan.product;
      if (!storeProduct) return false;
      try {
        const product = {
          productId: storeProduct.identifier,
          amount: storeProduct.price,
          currency: storeProduct.currencyCode,
          title: storeProduct.title,
        };
        trackCheckoutStarted(product);
        const info = plan.pkg
          ? await purchasePackage(plan.pkg)
          : await purchaseStoreProduct(storeProduct);
        applyCustomerInfo(info);
        const active = hasActiveEntitlement(info);
        if (active) {
          trackSubscriptionPurchased(product);
        }
        return active;
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


  useEffect(() => {
    let cancelled = false;
    void supabase.auth.getSession().then(({ data }) => {
      if (!cancelled) setReviewerBypass(isReviewerEmail(data.session?.user?.email));
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!cancelled) setReviewerBypass(isReviewerEmail(session?.user?.email));
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<SubscriptionContextValue>(
    () => ({
      status,
      isPro: !subscriptionRequired || reviewerBypass || hasActiveEntitlement(customerInfo),
      subscriptionRequired,
      productsUnavailable,
      monthlyPackage,
      yearlyPackage,
      monthlyProduct,
      yearlyProduct,
      refresh,
      purchase,
      restore,
    }),
    [
      status,
      subscriptionRequired,
      reviewerBypass,
      productsUnavailable,
      customerInfo,
      monthlyPackage,
      yearlyPackage,
      monthlyProduct,
      yearlyProduct,
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
