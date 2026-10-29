// Rappels de produits (RappelConso) : l'historique est comparé aux rappels des 90 derniers jours,
// au démarrage, au retour dans l'app et en arrière-plan ; un nouveau rappel envoie une notification.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { recentRecalls, matchRecent, isActive } from "../../public/lib/recalls.js";
import { getHistory, getEntry, getSettings, setSettings } from "./storage";
import { t, tn, locale } from "./i18n";
import { nameOf } from "./view";

const K = { check: "bayyin:recall_check", seen: "bayyin:recall_seen", notified: "bayyin:recall_notified" };
const readJson = async (k, d) => { try { const s = await AsyncStorage.getItem(k); return s ? JSON.parse(s) : d; } catch { return d; } };
const writeJson = (k, v) => AsyncStorage.setItem(k, JSON.stringify(v)).catch(() => {});

export const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : "");
export const longDate = (d) => { try { return new Date(d + "T12:00:00").toLocaleDateString(locale(), { day: "numeric", month: "long", year: "numeric" }); } catch { return d; } };

/** Produits de l'historique visés par un rappel en cours, pas encore masqués (un par produit). */
export async function checkRecalls({ force = false } = {}) {
  const codes = getHistory().map((e) => e.code).filter((c) => /^\d{8,14}$/.test(c));
  if (!codes.length) return [];
  const last = await readJson(K.check, null);
  let hits = last && last.hits;
  if (force || !last || Date.now() - last.at > 6 * 3600e3 || last.n !== codes.length) {
    try {
      hits = matchRecent(await recentRecalls(), codes).map((h) => ({ code: h.code, fiche: h.fiche }));
      writeJson(K.check, { at: Date.now(), n: codes.length, hits });
    } catch { /* hors connexion : dernier résultat connu */ }
  }
  const seen = new Set(await readJson(K.seen, []));
  const byCode = new Map();
  for (const h of hits || []) if (isActive(h.fiche) && !seen.has(`${h.code}:${h.fiche.id}`) && !byCode.has(h.code)) byCode.set(h.code, h);
  return [...byCode.values()];
}

export async function dismissRecalls(hits) {
  const seen = await readJson(K.seen, []);
  hits.forEach((h) => seen.push(`${h.code}:${h.fiche.id}`));
  writeJson(K.seen, seen.slice(-300));
}

// ---------- notifications ----------
let N = null;
const notif = () => {
  if (Platform.OS === "web") return null;
  if (!N) { try { N = require("expo-notifications"); } catch { N = null; } }
  return N;
};

export function setupNotifications() {
  const n = notif();
  if (!n) return;
  n.setNotificationHandler({ handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }) });
  if (Platform.OS === "android") {
    n.setNotificationChannelAsync("recalls", { name: t("recall.t"), importance: n.AndroidImportance.HIGH, vibrationPattern: [0, 80, 60, 80] }).catch(() => {});
  }
}

/** Autorisation : demandée une seule fois, quand l'historique contient déjà quelques produits. */
export async function askNotifications({ force = false } = {}) {
  const n = notif();
  if (!n) return false;
  try {
    const cur = await n.getPermissionsAsync();
    if (cur.granted) return true;
    if (!force && getSettings().notifAsked) return false;
    setSettings({ notifAsked: true });
    if (!cur.canAskAgain) return false;
    const res = await n.requestPermissionsAsync();
    return !!res.granted;
  } catch {
    return false;
  }
}
export async function notificationsGranted() {
  const n = notif();
  if (!n) return false;
  try { return (await n.getPermissionsAsync()).granted; } catch { return false; }
}

/** Notifie les rappels qui ne l'ont pas encore été. */
export async function notifyRecalls(hits, { send = true } = {}) {
  const n = notif();
  if (!n || !hits.length) return 0;
  const done = new Set(await readJson(K.notified, []));
  const fresh = hits.filter((h) => !done.has(`${h.code}:${h.fiche.id}`));
  if (!fresh.length) return 0;
  // App ouverte : le bandeau de l'accueil suffit, on note seulement que l'alerte a été vue
  if (send && getSettings().notif && (await notificationsGranted())) for (const h of fresh.slice(0, 3)) {
    const e = getEntry(h.code);
    await n.scheduleNotificationAsync({
      content: { title: t("recall.t"), body: t("recall.home_p", { name: e ? nameOf(e.p) : cap(h.fiche.n), d: longDate(h.fiche.d) }), data: { code: h.code } },
      trigger: Platform.OS === "android" ? { channelId: "recalls" } : null,
    }).catch(() => {});
  }
  fresh.forEach((h) => done.add(`${h.code}:${h.fiche.id}`));
  writeJson(K.notified, [...done].slice(-300));
  return fresh.length;
}

/** Fiche ouverte depuis une notification : rappelle `fn(code)`. */
export function onNotificationOpen(fn) {
  const n = notif();
  if (!n) return () => {};
  n.getLastNotificationResponseAsync().then((r) => { const c = r && r.notification.request.content.data && r.notification.request.content.data.code; if (c) fn(c); }).catch(() => {});
  const sub = n.addNotificationResponseReceivedListener((r) => { const c = r.notification.request.content.data && r.notification.request.content.data.code; if (c) fn(c); });
  return () => sub.remove();
}
