import { Capacitor } from "@capacitor/core";
import {
  Purchases,
  LOG_LEVEL,
  type CustomerInfo,
  type PurchasesOfferings,
  type PurchasesPackage,
  type PurchasesStoreProduct,
} from "@revenuecat/purchases-capacitor";
import { isNative } from "@/lib/native";
import { enableAppleAdsAttribution } from "@/lib/appleAds";

/** RevenueCat entitlement identifier — must match dashboard + App Store setup. */
export const ENTITLEMENT_ID =
  import.meta.env.VITE_REVENUECAT_ENTITLEMENT_ID || "pro";

/** App Store / Play Store product IDs — create these in App Store Connect. */
export const PRODUCT_IDS = {
  monthly: import.meta.env.VITE_REVENUECAT_PRODUCT_MONTHLY || "ratioai_pro_monthly",
  yearly: import.meta.env.VITE_REVENUECAT_PRODUCT_YEARLY || "ratioai_pro_yearly",
} as const;

export type SubscriptionStatus = "unknown" | "loading" | "active" | "inactive";

let configured = false;

export function isSubscriptionRequired(): boolean {
  // Native builds always gate the app. A bypass flag in the iOS build
  // was letting people log meals without ever seeing a paywall.
  if (!isNative()) {
    return import.meta.env.VITE_SUBSCRIPTION_REQUIRED_WEB === "true";
  }
  return true;
}

/** The yearly RatioAi Pro product includes this free introductory offer. */
export const YEARLY_FREE_TRIAL_DAYS = 3;

/**
 * Trial length to show for the yearly plan. Uses the App Store introductory
 * offer when the store has one, and the product's 3-day trial otherwise.
 */
export function resolvedYearlyTrialDays(
  intro: { price: number; periodUnit: string; periodNumberOfUnits: number; cycles: number } | null | undefined,
): number {
  return freeTrialDays(intro) ?? YEARLY_FREE_TRIAL_DAYS;
}

/**
 * Monthly equivalent of the yearly price, in the store's own currency format.
 * Prefers the string Apple/RevenueCat already localized for the account's country.
 */
export function yearlyPerMonthLabel(
  product:
    | { pricePerMonthString?: string | null; price?: number; currencyCode?: string }
    | null
    | undefined,
  locale: string,
): string | null {
  if (!product) return null;
  if (product.pricePerMonthString) return product.pricePerMonthString;
  if (typeof product.price !== "number" || !product.currencyCode) return null;
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: product.currencyCode,
    }).format(product.price / 12);
  } catch {
    return null;
  }
}

/** Days in a free introductory offer, or null when the product has no free trial. */
export function freeTrialDays(
  intro: { price: number; periodUnit: string; periodNumberOfUnits: number; cycles: number } | null | undefined,
): number | null {
  if (!intro || intro.price > 0) return null;
  const count = Math.max(1, intro.periodNumberOfUnits) * Math.max(1, intro.cycles || 1);
  switch ((intro.periodUnit || "").toUpperCase()) {
    case "DAY":
      return count;
    case "WEEK":
      return count * 7;
    case "MONTH":
      return count * 30;
    case "YEAR":
      return count * 365;
    default:
      return null;
  }
}

export function hasActiveEntitlement(info: CustomerInfo | null): boolean {
  if (!info) return false;
  const ent = info.entitlements.active[ENTITLEMENT_ID];
  return Boolean(ent?.isActive);
}

function getApiKey(): string | null {
  const platform = Capacitor.getPlatform();
  if (platform === "ios") {
    return import.meta.env.VITE_REVENUECAT_IOS_API_KEY || null;
  }
  if (platform === "android") {
    return import.meta.env.VITE_REVENUECAT_ANDROID_API_KEY || null;
  }
  return null;
}

export async function configureRevenueCat(appUserId?: string): Promise<boolean> {
  if (!isNative()) return false;
  if (configured && !appUserId) return true;

  const platform = Capacitor.getPlatform();

  if (platform === "ios") {
    const apiKey = import.meta.env.VITE_REVENUECAT_IOS_API_KEY;
    if (!apiKey) {
      console.warn("RevenueCat iOS API key missing");
      return false;
    }
    if (!configured) {
      if (import.meta.env.DEV) {
        await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });
      }
      await Purchases.configure({
        apiKey,
        appUserID: appUserId,
      });
      configured = true;
      void enableAppleAdsAttribution();
      return true;
    }
    if (appUserId) {
      await Purchases.logIn({ appUserID: appUserId });
    }
    return true;
  }

  const apiKey = getApiKey();
  if (!apiKey) {
    console.warn("RevenueCat API key missing for platform", platform);
    return false;
  }

  if (import.meta.env.DEV) {
    await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });
  }

  await Purchases.configure({
    apiKey,
    appUserID: appUserId,
  });
  configured = true;
  return true;
}

export async function loginRevenueCat(appUserId: string) {
  if (!isNative()) return null;
  // Without a configured SDK every later call throws and leaves the paywall
  // gate spinning forever, so bail out instead of calling logIn().
  if (!(await configureRevenueCat(appUserId))) return null;
  try {
    const { customerInfo } = await Purchases.logIn({ appUserID: appUserId });
    return customerInfo;
  } catch (e) {
    console.warn("RevenueCat login failed", e);
    return null;
  }
}

export async function logoutRevenueCat() {
  if (!isNative() || !configured) return;
  try {
    await Purchases.logOut();
  } catch {
    /* ignore */
  }
}

export async function getCustomerInfo(): Promise<CustomerInfo | null> {
  if (!isNative()) return null;
  try {
    if (!(await configureRevenueCat())) return null;
    const { customerInfo } = await Purchases.getCustomerInfo();
    return customerInfo;
  } catch (e) {
    console.warn("RevenueCat customer info failed", e);
    return null;
  }
}

export async function getOfferings(): Promise<PurchasesOfferings | null> {
  if (!isNative()) return null;
  try {
    if (!(await configureRevenueCat())) return null;
    const offerings = await Purchases.getOfferings();
    return offerings;
  } catch (e) {
    console.warn("RevenueCat offerings failed", e);
    return null;
  }
}

/**
 * Plans for the paywall. Uses the current RevenueCat offering, then asks the
 * store directly so a missing offering still shows the two App Store products.
 */
export async function loadPaywallPlans(): Promise<{
  monthlyPackage: PurchasesPackage | null;
  yearlyPackage: PurchasesPackage | null;
  monthlyProduct: PurchasesStoreProduct | null;
  yearlyProduct: PurchasesStoreProduct | null;
}> {
  const empty = {
    monthlyPackage: null,
    yearlyPackage: null,
    monthlyProduct: null,
    yearlyProduct: null,
  };
  if (!isNative()) return empty;
  const offerings = await getOfferings();
  const picked = pickPaywallPackages(offerings);
  if (picked.monthly || picked.yearly) {
    return {
      monthlyPackage: picked.monthly,
      yearlyPackage: picked.yearly,
      monthlyProduct: picked.monthly?.product ?? null,
      yearlyProduct: picked.yearly?.product ?? null,
    };
  }
  try {
    if (!(await configureRevenueCat())) return empty;
    const { products } = await Purchases.getProducts({
      productIdentifiers: [PRODUCT_IDS.monthly, PRODUCT_IDS.yearly],
    });
    const monthlyProduct =
      products.find((p) => p.identifier === PRODUCT_IDS.monthly) ?? null;
    const yearlyProduct =
      products.find((p) => p.identifier === PRODUCT_IDS.yearly) ?? null;
    return { ...empty, monthlyProduct, yearlyProduct };
  } catch (e) {
    console.warn("RevenueCat products failed", e);
    return empty;
  }
}

export async function purchasePackage(pkg: PurchasesPackage): Promise<CustomerInfo> {
  const { customerInfo } = await Purchases.purchasePackage({ aPackage: pkg });
  return customerInfo;
}

export async function purchaseStoreProduct(product: PurchasesStoreProduct): Promise<CustomerInfo> {
  const { customerInfo } = await Purchases.purchaseStoreProduct({ product });
  return customerInfo;
}

export async function restorePurchases(): Promise<CustomerInfo> {
  const { customerInfo } = await Purchases.restorePurchases();
  return customerInfo;
}

/** Pick annual then monthly from current offering for paywall display. */
export function pickPaywallPackages(offerings: PurchasesOfferings | null): {
  monthly: PurchasesPackage | null;
  yearly: PurchasesPackage | null;
} {
  const current = offerings?.current;
  if (!current) return { monthly: null, yearly: null };

  const monthly =
    current.monthly ??
    current.availablePackages.find((p) => p.packageType === "MONTHLY") ??
    null;

  const yearly =
    current.annual ??
    current.availablePackages.find((p) => p.packageType === "ANNUAL") ??
    null;

  return { monthly, yearly };
}

export function formatPackagePrice(pkg: PurchasesPackage | null): string {
  if (!pkg) return "—";
  return pkg.product.priceString;
}
