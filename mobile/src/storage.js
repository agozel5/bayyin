// Données gardées sur le téléphone (AsyncStorage) : réglages, historique, fiches
// complétées par photo, fiches produits pour le hors connexion.
// Tout est chargé en mémoire au démarrage ; les écritures partent en arrière-plan.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getLocales } from "expo-localization";
import { SCHOOLS, TOPICS, DEFAULT_PREFS, PROFILE_ALLERGENS, DIETS } from "./core";
import { LANGS } from "./i18n";

const K = { settings: "bayyin:settings", history: "bayyin:history", local: "bayyin:local", pack: "bayyin:pack" };
const MAX_RECENT = 60;

let settings = null;
let history = [];
let local = {};
let pack = {};
const listeners = new Set();
const emit = (what) => listeners.forEach((fn) => fn(what));
const save = (key, value) => AsyncStorage.setItem(key, JSON.stringify(value)).catch(() => {});

function deviceLang() {
  try {
    for (const l of getLocales()) if (LANGS.includes(l.languageCode)) return l.languageCode;
  } catch {
    /* pas d'information de langue */
  }
  return "fr";
}

export async function initStorage() {
  const pairs = await AsyncStorage.multiGet([K.settings, K.history, K.local, K.pack]).catch(() => []);
  const get = (k) => {
    const row = pairs.find((p) => p[0] === k);
    try {
      return row && row[1] ? JSON.parse(row[1]) : null;
    } catch {
      return null;
    }
  };
  const s = get(K.settings) || {};
  const school = SCHOOLS[s.school] || s.school === "custom" ? s.school : DEFAULT_PREFS.school;
  settings = {
    lang: LANGS.includes(s.lang) ? s.lang : deviceLang(),
    school,
    topics: { ...SCHOOLS.standard, ...(SCHOOLS[school] || {}), ...(s.topics || {}) },
    packAt: s.packAt || null,
    packCount: s.packCount || 0,
    profile: {
      allergens: ((s.profile && s.profile.allergens) || []).filter((a) => PROFILE_ALLERGENS.includes(a)),
      diet: s.profile && DIETS.includes(s.profile.diet) ? s.profile.diet : null,
    },
    onboarded: !!s.onboarded,
  };
  history = Array.isArray(get(K.history)) ? get(K.history) : [];
  local = get(K.local) || {};
  pack = get(K.pack) || {};
}

export const subscribe = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

// ---------- réglages ----------
export const getSettings = () => settings;
export function setSettings(patch) {
  settings = { ...settings, ...patch };
  save(K.settings, settings);
  emit("settings");
}
export function setSchool(school) {
  if (SCHOOLS[school]) setSettings({ school, topics: { ...SCHOOLS[school] } });
}
export function setTopic(topic, decision) {
  const topics = { ...settings.topics, [topic]: decision };
  const match = Object.keys(SCHOOLS).find((s) => TOPICS.every((tp) => SCHOOLS[s][tp] === topics[tp]));
  setSettings({ topics, school: match || "custom" });
}

export function toggleAllergen(tag) {
  const list = settings.profile.allergens;
  const allergens = list.includes(tag) ? list.filter((a) => a !== tag) : [...list, tag];
  setSettings({ profile: { ...settings.profile, allergens } });
}
export function setDiet(diet) {
  setSettings({ profile: { ...settings.profile, diet: DIETS.includes(diet) ? diet : null } });
}

// ---------- historique ----------
export const getHistory = () => history;
export const getEntry = (code) => history.find((e) => e.code === code) || null;
export function addToHistory(p) {
  const prev = getEntry(p.code);
  const entry = { code: p.code, at: Date.now(), fav: prev ? prev.fav : false, p };
  const rest = history.filter((e) => e.code !== p.code);
  const favs = rest.filter((e) => e.fav);
  const recent = rest.filter((e) => !e.fav).slice(0, MAX_RECENT - 1);
  history = [entry, ...favs, ...recent].sort((a, b) => b.at - a.at);
  save(K.history, history);
  emit("history");
}
export function toggleFav(code) {
  history = history.map((e) => (e.code === code ? { ...e, fav: !e.fav } : e));
  save(K.history, history);
  emit("history");
  const e = getEntry(code);
  return !!(e && e.fav);
}
export function clearHistory() {
  history = history.filter((e) => e.fav);
  save(K.history, history);
  emit("history");
}

// ---------- fiches complétées par photo ----------
export const getLocal = (code) => local[code] || null;
export function setLocal(code, raw) {
  local = { ...local, [code]: raw };
  save(K.local, local);
}

// ---------- fiches pour le hors connexion ----------
// Les fiches consultées sont gardées une à une ; le « pack » des produits populaires en un bloc.
export async function getCachedRaw(code) {
  if (pack[code]) return pack[code];
  try {
    const s = await AsyncStorage.getItem("bayyin:p:" + code);
    return s ? JSON.parse(s) : null;
  } catch {
    return null;
  }
}
export function cacheRaw(code, raw) {
  AsyncStorage.setItem("bayyin:p:" + code, JSON.stringify(raw)).catch(() => {});
}
export function setPack(products) {
  pack = products;
  save(K.pack, pack);
}
