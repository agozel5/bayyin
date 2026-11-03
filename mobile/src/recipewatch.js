// Alerte « la recette a changé » : les favoris et les produits récents de l'historique sont revérifiés
// de temps en temps (au plus une fois tous les trois jours par produit, vingt produits par passage).
// Quand la liste d'ingrédients publiée n'est plus celle gardée sur le téléphone, la différence est
// notée, la fiche est mise à jour et une notification part si le verdict devient moins bon ou si
// un ingrédient sensible apparaît.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { getHistory, getSettings, updateEntry } from "./storage";
import { present, classifyAny } from "./core";
import { fetchFresh } from "./api";
import { isPremium } from "./premium";
import { t } from "./i18n";
import { nameOf, S } from "./view";
import { diffRecipe, worse } from "../../public/lib/recipe.js";

const K = { checked: "bayyin:recipe_checked", changes: "bayyin:recipe_changes", last: "bayyin:recipe_last", notified: "bayyin:recipe_notified" };
const readJson = async (k, d) => { try { const s = await AsyncStorage.getItem(k); return s ? JSON.parse(s) : d; } catch { return d; } };
const writeJson = (k, v) => AsyncStorage.setItem(k, JSON.stringify(v)).catch(() => {});
const PER_PRODUCT = 3 * 864e5;
const listeners = new Set();
let changes = []; // [{ code, at, name, before, after, added, removed, addedE, removedE, seen }]
let loaded = false;

export async function loadChanges() {
  if (!loaded) { changes = await readJson(K.changes, []); loaded = true; }
  return changes;
}
const emit = () => listeners.forEach((fn) => fn(changes));
export function onChanges(fn) { listeners.add(fn); return () => listeners.delete(fn); }
/** Changement de recette connu pour ce code (gardé 60 jours), ou null */
export const changeFor = (code) => changes.find((c) => c.code === code && Date.now() - c.at < 60 * 864e5) || null;
export const unseenChanges = () => changes.filter((c) => !c.seen);
export function markSeen(codes) {
  const set = new Set(codes || changes.map((c) => c.code));
  changes = changes.map((c) => (set.has(c.code) ? { ...c, seen: true } : c));
  writeJson(K.changes, changes);
  emit();
}

// Produits suivis : favoris d'abord, puis l'historique récent (aliments et cosmétiques avec code-barres)
function candidates() {
  const list = getHistory().filter((e) => /^\d{8,14}$/.test(e.code) && e.p && !e.p.local && (e.p.kind || "food") !== "medicine");
  return [...list.filter((e) => e.fav), ...list.filter((e) => !e.fav)];
}

/** Revérifie les produits suivis ; renvoie les nouveaux changements trouvés */
export async function checkRecipes({ force = false, max = 20 } = {}) {
  await loadChanges();
  if (!getSettings().recipeAlerts || !isPremium()) return [];
  const last = await readJson(K.last, 0);
  if (!force && Date.now() - last < 6 * 3600e3) return [];
  writeJson(K.last, Date.now());
  const checked = await readJson(K.checked, {});
  const found = [];
  let n = 0;
  for (const e of candidates()) {
    if (n >= max) break;
    if (!force && checked[e.code] && Date.now() - checked[e.code] < PER_PRODUCT) continue;
    n++;
    let fresh = null;
    try { fresh = await fetchFresh(e.code); } catch { break; } // pas de réseau : on réessaiera plus tard
    checked[e.code] = Date.now();
    if (!fresh) continue;
    const old = e.p.raw || {};
    const d = diffRecipe(old, fresh);
    const st = getSettings();
    if (d) {
      const before = classifyAny(old, st).status, after = classifyAny(fresh, st).status;
      const c = { code: e.code, at: Date.now(), name: nameOf(e.p), before, after, ...d, seen: false };
      changes = [c, ...changes.filter((x) => x.code !== e.code)].slice(0, 50);
      found.push(c);
      updateEntry(e.code, present(fresh, st));
    } else if (!(old.ingredients_text || old.ingredients_text_fr) && (fresh.ingredients_text || fresh.ingredients_text_fr)) {
      updateEntry(e.code, present(fresh, st)); // liste arrivée depuis : la fiche gardée est complétée
    }
    await new Promise((r) => setTimeout(r, 250)); // Open Food Facts : pas de rafale
  }
  const keep = Object.fromEntries(Object.entries(checked).filter(([, at]) => Date.now() - at < 30 * 864e5));
  writeJson(K.checked, keep);
  if (found.length) { writeJson(K.changes, changes); emit(); }
  return found;
}

/** Résumé d'un changement en une ligne (« Ajouté : gélatine · Halal → Douteux ») */
export function changeLine(c) {
  const parts = [];
  if (c.before !== c.after) parts.push(`${S(c.before, "short")} → ${S(c.after, "short")}`);
  const add = [...c.added, ...c.addedE];
  if (add.length) parts.push(`${t("recipe.added")} : ${add.slice(0, 3).join(", ")}${add.length > 3 ? "…" : ""}`);
  else if (c.removed.length || c.removedE.length) parts.push(`${t("recipe.removed")} : ${[...c.removed, ...c.removedE].slice(0, 3).join(", ")}`);
  return parts.join(" · ");
}

/** Notification pour les changements qui comptent (verdict moins bon ou ingrédient sensible ajouté) */
export async function notifyChanges(list) {
  if (!list.length || Platform.OS === "web" || !getSettings().notif) return;
  let N;
  try { N = require("expo-notifications"); } catch { return; }
  try { if (!(await N.getPermissionsAsync()).granted) return; } catch { return; }
  const done = new Set(await readJson(K.notified, []));
  const st = getSettings();
  const sensitive = (c) => c.added.some((x) => classifyAny({ ingredients_text: x, categories_tags: [] }, st).flags.some((f) => f.severity !== "info"));
  for (const c of list.filter((x) => (worse(x.before, x.after) || sensitive(x)) && !done.has(`${x.code}:${x.at}`)).slice(0, 3)) {
    await N.scheduleNotificationAsync({
      content: { title: t("recipe.notif_t", { name: c.name }), body: changeLine(c), data: { code: c.code } },
      trigger: Platform.OS === "android" ? { channelId: "recalls" } : null,
    }).catch(() => {});
    done.add(`${c.code}:${c.at}`);
  }
  writeJson(K.notified, [...done].slice(-200));
}

/** Aperçu (captures automatiques de la version web) : ajoute un changement fictif, jamais enregistré */
export function injectChange(c) {
  changes = [{ at: Date.now(), added: [], removed: [], addedE: [], removedE: [], seen: false, ...c }, ...changes.filter((x) => x.code !== c.code)];
  emit();
}
