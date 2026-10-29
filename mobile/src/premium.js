// Bayyin Premium dans l'app : abonnement par les achats intégrés d'Apple et de Google (RevenueCat).
// Les clés publiques RevenueCat se mettent dans app.json (expo.extra.revenuecat) par le propriétaire.
// Sans clé, Premium est désactivé et tout reste accessible : rien ne se bloque avant la mise en vente.
import { Platform } from "react-native";
import Constants from "expo-constants";

const RC = (Constants.expoConfig && Constants.expoConfig.extra && Constants.expoConfig.extra.revenuecat) || {};
const API_KEY = Platform.OS === "ios" ? RC.ios : Platform.OS === "android" ? RC.android : "";
const ENTITLEMENT = RC.entitlement || "premium";
export const FEATURES = ["rankings", "aisle", "basket", "compare", "offline", "history"];
export const FREE_HISTORY_DAYS = 30;
export const PREMIUM_HISTORY_DAYS = 365;
// Prix affichés seulement dans l'aperçu (captures de contrôle) : en vrai, ils viennent du store
const PREVIEW_PRICES = { year: "14,99 €", month: "2,49 €", trialDays: 7 };

let active = false;
let expires = null;
let ready = false;
let preview = false; // aperçu de la page (version web des captures)
const listeners = new Set();
const emit = () => listeners.forEach((fn) => fn());
export const onPremium = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };

const P = () => { try { return require("react-native-purchases").default; } catch { return null; } };
export const premiumEnabled = () => preview || (!!API_KEY && Platform.OS !== "web");
export const isPremium = () => !premiumEnabled() || active;
export const premiumState = () => ({ enabled: premiumEnabled(), active, expires, ready });
export function setPreview(on) { preview = !!on; emit(); }

function apply(info) {
  const e = info && info.entitlements && info.entitlements.active && info.entitlements.active[ENTITLEMENT];
  active = !!e;
  expires = e && e.expirationDate ? e.expirationDate : null;
  ready = true;
  emit();
}

export async function initPremium() {
  if (!premiumEnabled() || preview) return;
  const Purchases = P();
  if (!Purchases) return;
  try {
    Purchases.configure({ apiKey: API_KEY });
    Purchases.addCustomerInfoUpdateListener(apply);
    apply(await Purchases.getCustomerInfo());
  } catch { ready = true; emit(); }
}

/** Offres du store : [{ id: "year"|"month", price, perMonth, trialDays, pkg }] */
export async function getPlans() {
  if (preview) return [
    { id: "year", price: PREVIEW_PRICES.year, perMonth: "1,25 €", trialDays: PREVIEW_PRICES.trialDays },
    { id: "month", price: PREVIEW_PRICES.month, trialDays: 0 },
  ];
  const Purchases = P();
  if (!Purchases) return [];
  const off = await Purchases.getOfferings();
  const cur = off && off.current;
  if (!cur) return [];
  const out = [];
  const trial = (prod) => (prod.introPrice && prod.introPrice.price === 0 ? prod.introPrice.periodNumberOfUnits * (prod.introPrice.periodUnit === "WEEK" ? 7 : prod.introPrice.periodUnit === "MONTH" ? 30 : 1) : 0);
  if (cur.annual) out.push({ id: "year", price: cur.annual.product.priceString, perMonth: cur.annual.product.pricePerMonthString || null, trialDays: trial(cur.annual.product), pkg: cur.annual });
  if (cur.monthly) out.push({ id: "month", price: cur.monthly.product.priceString, trialDays: trial(cur.monthly.product), pkg: cur.monthly });
  return out;
}

export async function buy(plan) {
  const Purchases = P();
  if (!Purchases || !plan.pkg) throw new Error("store");
  try {
    const { customerInfo } = await Purchases.purchasePackage(plan.pkg);
    apply(customerInfo);
    return active;
  } catch (e) {
    if (e && e.userCancelled) return false;
    throw e;
  }
}
export async function restore() {
  const Purchases = P();
  if (!Purchases) return false;
  apply(await Purchases.restorePurchases());
  return active;
}
export async function manageUrl() {
  const Purchases = P();
  try { const info = await Purchases.getCustomerInfo(); if (info.managementURL) return info.managementURL; } catch { /* rien */ }
  return Platform.OS === "ios" ? "https://apps.apple.com/account/subscriptions" : "https://play.google.com/store/account/subscriptions";
}

// Fonctions réservées : ouvre la page Premium si besoin (gestionnaire fourni par l'app)
let ask = null;
export const setPremiumAsk = (fn) => { ask = fn; };
export function canUse(feature) {
  if (isPremium()) return true;
  if (ask) ask(feature);
  return false;
}
