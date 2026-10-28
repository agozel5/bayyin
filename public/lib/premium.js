// Bayyin Premium : abonnement vendu par Lemon Squeezy (vendeur officiel : TVA et factures gérées par lui).
// Après l'achat, l'utilisateur reçoit une clé de licence ; l'app l'active une fois sur l'appareil,
// puis la revérifie de temps en temps (avec un délai de grâce hors connexion).
// Aucune donnée personnelle n'est envoyée : seulement la clé et un nom d'appareil anonyme.

import { PREMIUM } from "../premium-config.js";

const KEY = "bayyin_premium_v1";
const PREVIEW_KEY = "bayyin_premium_preview"; // pour tester la page avant la mise en vente
const RECHECK = 3 * 864e5; // revérification tous les 3 jours
const GRACE = 45 * 864e5; // hors connexion : Premium gardé 45 jours sans vérification

export const FEATURES = ["rankings", "aisle", "basket", "compare", "offline", "history", "family"];
// Historique visible : 30 jours sans Premium, un an avec (tout reste gardé sur le téléphone)
export const FREE_HISTORY_DAYS = 30;
export const PREMIUM_HISTORY_DAYS = 365;

const read = () => {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || null;
  } catch {
    return null;
  }
};
const write = (v) => {
  try {
    if (v) localStorage.setItem(KEY, JSON.stringify(v));
    else localStorage.removeItem(KEY);
  } catch { /* stockage indisponible */ }
  listeners.forEach((fn) => fn());
};
const listeners = new Set();
export const onPremiumChange = (fn) => listeners.add(fn);

const preview = () => {
  try {
    return localStorage.getItem(PREVIEW_KEY) === "1";
  } catch {
    return false;
  }
};
/** La vente est configurée (boutique, liens de paiement, pages légales) */
export const premiumConfigured = () =>
  !!(PREMIUM.storeId && PREMIUM.productId && (PREMIUM.checkout.year || PREMIUM.checkout.month) && PREMIUM.legal.cgv && PREMIUM.legal.mentions);
/** L'abonnement est en place : certaines fonctions sont réservées aux abonnés */
export const premiumEnabled = () => premiumConfigured() || preview();
export const premiumConfig = () => PREMIUM;
export const premiumState = () => read();

/** Accès aux fonctions Premium */
export function isPremium(now = Date.now()) {
  if (!premiumEnabled()) return true;
  const s = read();
  if (!s || s.status !== "active") return false;
  if (s.expiresAt && Date.parse(s.expiresAt) < now) return false;
  return now - (s.checkedAt || 0) < GRACE;
}

async function call(action, params) {
  const res = await fetch(PREMIUM.api + action, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params),
    signal: AbortSignal.timeout(15000),
  });
  return res.json();
}

// La clé doit venir de cette boutique et de ce produit (sinon une clé d'un autre vendeur suffirait)
function sameProduct(meta) {
  return meta && Number(meta.store_id) === Number(PREMIUM.storeId) && Number(meta.product_id) === Number(PREMIUM.productId);
}

const instanceName = () => {
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const kind = /iPhone|iPad/.test(ua) ? "iPhone/iPad" : /Android/.test(ua) ? "Android" : "Navigateur";
  return `Bayyin · ${kind} · ${new Date().toISOString().slice(0, 10)}`;
};

/** Active une clé sur cet appareil -> { ok: true } ou { ok: false, error } (error : invalid | other_product | limit | network) */
export async function activate(licenseKey) {
  const key = String(licenseKey || "").trim();
  if (key.length < 8) return { ok: false, error: "invalid" };
  let data;
  try {
    data = await call("activate", { license_key: key, instance_name: instanceName() });
  } catch {
    return { ok: false, error: "network" };
  }
  if (!data || !data.activated) {
    const msg = String((data && data.error) || "");
    return { ok: false, error: /limit/i.test(msg) ? "limit" : "invalid" };
  }
  if (!sameProduct(data.meta)) {
    // Clé valable mais pour un autre produit : on libère l'activation
    call("deactivate", { license_key: key, instance_id: data.instance.id }).catch(() => {});
    return { ok: false, error: "other_product" };
  }
  write({
    key,
    instanceId: data.instance.id,
    status: data.license_key.status,
    expiresAt: data.license_key.expires_at || null,
    email: data.meta.customer_email ? String(data.meta.customer_email).replace(/^(.).*(@.*)$/, "$1…$2") : "",
    checkedAt: Date.now(),
    activatedAt: Date.now(),
  });
  return { ok: true };
}

/** Revérifie la clé (au démarrage, au plus tous les 3 jours) */
export async function refresh({ force = false } = {}) {
  const s = read();
  if (!s || !premiumEnabled()) return;
  if (!force && Date.now() - (s.checkedAt || 0) < RECHECK) return;
  let data;
  try {
    data = await call("validate", { license_key: s.key, instance_id: s.instanceId });
  } catch {
    return; // hors connexion : délai de grâce
  }
  if (data && data.valid && sameProduct(data.meta)) {
    write({ ...s, status: data.license_key.status, expiresAt: data.license_key.expires_at || null, checkedAt: Date.now() });
  } else if (data) {
    write({ ...s, status: (data.license_key && data.license_key.status) || "inactive", checkedAt: Date.now() });
  }
}

/** Retire la clé de cet appareil (libère une activation) */
export async function deactivate() {
  const s = read();
  if (s) call("deactivate", { license_key: s.key, instance_id: s.instanceId }).catch(() => {});
  write(null);
}

/** Masque une clé pour l'affichage : « 38B1…F4A2 » */
export const maskKey = (k) => (k && k.length > 10 ? `${k.slice(0, 4)}…${k.slice(-4)}` : "");
