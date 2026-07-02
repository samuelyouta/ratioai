import { Capacitor } from "@capacitor/core";
import {
  Purchases,
  LOG_LEVEL,
  type CustomerInfo,
  type PurchasesOfferings,
  type PurchasesPackage,
} from "@revenuecat/purchases-capacitor";
import { isNative } from "@/lib/native";

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
  if (import.meta.env.VITE_SUBSCRIPTION_BYPASS === "true") return false;
  if (!isNative()) {
    return import.meta.env.VITE_SUBSCRIPTION_REQUIRED_WEB === "true";
  }
  return true;
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

  // iOS: native AppDelegate configures RevenueCat on launch (see Info.plist RevenueCatAPIKey).
  if (platform === "ios") {
    if (appUserId) {
      await Purchases.logIn({ appUserID: appUserId });
    }
    configured = true;
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
  await configureRevenueCat(appUserId);
  const { customerInfo } = await Purchases.logIn({ appUserID: appUserId });
  return customerInfo;
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
  if (!(await configureRevenueCat())) return null;
  const { customerInfo } = await Purchases.getCustomerInfo();
  return customerInfo;
}

export async function getOfferings(): Promise<PurchasesOfferings | null> {
  if (!isNative()) return null;
  if (!(await configureRevenueCat())) return null;
  const offerings = await Purchases.getOfferings();
  return offerings;
}

export async function purchasePackage(pkg: PurchasesPackage): Promise<CustomerInfo> {
  const { customerInfo } = await Purchases.purchasePackage({ aPackage: pkg });
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
