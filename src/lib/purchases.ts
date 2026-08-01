import { Platform } from 'react-native';
import { REVENUECAT_IOS_KEY, REVENUECAT_ANDROID_KEY } from '@/services/env';

/**
 * Crash-proof wrapper over `react-native-purchases` (RevenueCat). Same defensive
 * pattern as lib/haptics.ts and lib/appleAuth.ts: the SDK is lazily required, so
 * the app is safe to run even before the native module is linked (dev builds
 * without `pod install`). Every export is a no-op / safe-default when the SDK is
 * absent or a native call throws — so the paywall gracefully degrades to the
 * existing soft dialog (see lib/paywall.ts) and NOTHING here can crash a flow.
 *
 * The wrapper exposes plain local types (RcPackage / RcOffering) so callers never
 * import RevenueCat's types — that keeps the app compiling before the dependency
 * is installed. The opaque `native` handle round-trips back into purchasePackage.
 *
 * Pro is server-driven (auth.store `selectIsPro` reads `user.subscription`); the
 * RevenueCat entitlement here is only an optimistic signal + the trigger to
 * re-sync the backend row. Cutting the dependency is a one-file delete.
 */

type AnyObj = Record<string, any>; // the SDK is untyped until it's installed

let RNPurchases: AnyObj | null = null;
try {
  RNPurchases = require('react-native-purchases').default;
} catch {
  RNPurchases = null;
}

/** Entitlement identifier configured in the RevenueCat dashboard. */
export const PRO_ENTITLEMENT = 'pro';

/** A purchasable package, decoupled from the SDK's own types. */
export interface RcPackage {
  /** RevenueCat package identifier (e.g. "$rc_monthly"). */
  identifier: string;
  /** Localized, store-authoritative price string, e.g. "$29.00". */
  priceString: string;
  /** Numeric price in the store currency (for computing the annual saving). */
  price: number;
  /** Opaque SDK package object — pass back to purchasePackage(). */
  native: AnyObj;
}

export interface RcOffering {
  monthly: RcPackage | null;
  annual: RcPackage | null;
}

export type PurchaseStatus = 'purchased' | 'cancelled' | 'error';
export interface PurchaseResult {
  status: PurchaseStatus;
  isProEntitled: boolean;
}

let configured = false;

function apiKey(): string {
  return Platform.OS === 'android' ? REVENUECAT_ANDROID_KEY : REVENUECAT_IOS_KEY;
}

/**
 * True only when the native SDK is linked, a publishable key is set, AND
 * configure() has succeeded. Callers use this to choose the real paywall screen
 * vs. the soft dialog. Conservative on purpose: if anything is off, we degrade.
 */
export function isAvailable(): boolean {
  return !!RNPurchases && !!apiKey() && configured;
}

function isProActive(customerInfo: AnyObj | null | undefined): boolean {
  return !!customerInfo?.entitlements?.active?.[PRO_ENTITLEMENT];
}

/**
 * Configure the SDK once with the backend user id as the RevenueCat appUserID —
 * critical so the RevenueCat→backend webhook can map the purchase to the user.
 * No-op (and leaves isAvailable() false) if the SDK is unlinked or configure
 * throws (native module missing).
 */
export function configure(appUserID: string): void {
  if (!RNPurchases || !apiKey() || configured) return;
  try {
    RNPurchases.configure({ apiKey: apiKey(), appUserID });
    if (__DEV__ && RNPurchases.setLogLevel && RNPurchases.LOG_LEVEL) {
      RNPurchases.setLogLevel(RNPurchases.LOG_LEVEL.DEBUG);
    }
    configured = true;
  } catch {
    configured = false;
  }
}

/** Configure (first time) or logIn (id change) with the backend user id. */
export async function syncIdentity(appUserID: string): Promise<void> {
  if (!RNPurchases || !apiKey()) return;
  try {
    if (!configured) {
      configure(appUserID);
      return;
    }
    await RNPurchases.logIn(appUserID);
  } catch {
    // Identity best-effort; never crash auth flows.
  }
}

/** Detach the RevenueCat identity on sign-out. */
export async function logOut(): Promise<void> {
  if (!RNPurchases || !configured) return;
  try {
    await RNPurchases.logOut();
  } catch {
    // RC throws if already anonymous — harmless.
  }
}

function toPackage(p: AnyObj | null | undefined): RcPackage | null {
  if (!p) return null;
  return {
    identifier: p.identifier,
    priceString: p.product?.priceString ?? '',
    price: typeof p.product?.price === 'number' ? p.product.price : 0,
    native: p,
  };
}

/** The current offering's monthly + annual packages (null when unavailable). */
export async function getOfferings(): Promise<RcOffering | null> {
  if (!isAvailable() || !RNPurchases) return null;
  try {
    const offerings = await RNPurchases.getOfferings();
    const current = offerings?.current;
    if (!current) return null;
    const all: AnyObj[] = current.availablePackages ?? [];
    return {
      monthly: toPackage(
        current.monthly ?? all.find((p) => p.packageType === 'MONTHLY'),
      ),
      annual: toPackage(
        current.annual ?? all.find((p) => p.packageType === 'ANNUAL'),
      ),
    };
  } catch {
    return null;
  }
}

/** Run the StoreKit purchase for a package. Never throws. */
export async function purchasePackage(pkg: RcPackage): Promise<PurchaseResult> {
  if (!isAvailable() || !RNPurchases) {
    return { status: 'error', isProEntitled: false };
  }
  try {
    const { customerInfo } = await RNPurchases.purchasePackage(pkg.native);
    return { status: 'purchased', isProEntitled: isProActive(customerInfo) };
  } catch (e) {
    if ((e as AnyObj)?.userCancelled) {
      return { status: 'cancelled', isProEntitled: false };
    }
    return { status: 'error', isProEntitled: false };
  }
}

/** Restore prior purchases; reports whether Pro is now entitled. */
export async function restorePurchases(): Promise<{ isProEntitled: boolean }> {
  if (!isAvailable() || !RNPurchases) return { isProEntitled: false };
  try {
    const customerInfo = await RNPurchases.restorePurchases();
    return { isProEntitled: isProActive(customerInfo) };
  } catch {
    return { isProEntitled: false };
  }
}

/** Whether the device currently holds the Pro entitlement (optimistic check). */
export async function isProEntitled(): Promise<boolean> {
  if (!isAvailable() || !RNPurchases) return false;
  try {
    return isProActive(await RNPurchases.getCustomerInfo());
  } catch {
    return false;
  }
}

/**
 * Open the native "manage subscriptions" sheet. Throws if the SDK lacks it, so
 * callers fall back to Linking(MANAGE_SUBSCRIPTION_URL).
 */
export async function showManageSubscriptions(): Promise<void> {
  if (!RNPurchases?.showManageSubscriptions) {
    throw new Error('showManageSubscriptions unavailable');
  }
  await RNPurchases.showManageSubscriptions();
}
