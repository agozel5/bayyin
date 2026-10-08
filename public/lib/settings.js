// Réglages de l'utilisateur, gardés sur l'appareil : langue, école, avis par sujet débattu.
import { DEFAULT_PREFS, SCHOOLS, TOPICS } from "./rules.js";
import { PROFILE_ALLERGENS, DIETS } from "./profile.js";

const KEY = "halalscan_settings_v1";
export const LANGS = ["fr", "en", "ar", "tr"];

function detectLang() {
  const langs = (typeof navigator !== "undefined" && (navigator.languages || [navigator.language])) || [];
  for (const l of langs) {
    const short = String(l || "").slice(0, 2).toLowerCase();
    if (LANGS.includes(short)) return short;
  }
  return "fr";
}

function load() {
  let saved = {};
  try {
    saved = JSON.parse(localStorage.getItem(KEY)) || {};
  } catch {
    saved = {};
  }
  const school = SCHOOLS[saved.school] || saved.school === "custom" ? saved.school : DEFAULT_PREFS.school;
  const topics = { ...SCHOOLS.standard, ...(SCHOOLS[school] || {}), ...(saved.topics || {}) };
  for (const t of Object.keys(topics)) if (!TOPICS.includes(t)) delete topics[t];
  return {
    lang: LANGS.includes(saved.lang) ? saved.lang : detectLang(),
    school,
    topics,
    offlinePackAt: saved.offlinePackAt || null,
    offlinePackCount: saved.offlinePackCount || 0,
    offlineMedCount: saved.offlineMedCount || 0,
    onboarded: !!saved.onboarded || Object.keys(saved).length > 0, // déjà utilisé avant l'accueil guidé
    // Profil personnel : allergies et régime
    profile: {
      allergens: ((saved.profile && saved.profile.allergens) || []).filter((a) => PROFILE_ALLERGENS.includes(a)),
      diet: saved.profile && DIETS.includes(saved.profile.diet) ? saved.profile.diet : null,
    },
  };
}

let current = load();
const listeners = new Set();

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(current));
  } catch {
    /* stockage indisponible : réglages valables pour cette session seulement */
  }
}

export const settings = {
  get() {
    return current;
  },
  set(patch) {
    current = { ...current, ...patch };
    save();
    listeners.forEach((fn) => fn(current, patch));
  },
  // Choisir une école remplace tous les avis par ceux de l'école.
  setSchool(school) {
    if (!SCHOOLS[school]) return;
    this.set({ school, topics: { ...SCHOOLS[school] } });
  },
  // Modifier un seul sujet fait passer en réglage personnalisé.
  setTopic(topic, decision) {
    if (!TOPICS.includes(topic)) return;
    const topics = { ...current.topics, [topic]: decision };
    const match = Object.keys(SCHOOLS).find((s) => TOPICS.every((t) => SCHOOLS[s][t] === topics[t]));
    this.set({ topics, school: match || "custom" });
  },
  toggleAllergen(tag) {
    if (!PROFILE_ALLERGENS.includes(tag)) return;
    const list = current.profile.allergens;
    const allergens = list.includes(tag) ? list.filter((a) => a !== tag) : [...list, tag];
    this.set({ profile: { ...current.profile, allergens } });
  },
  setDiet(diet) {
    this.set({ profile: { ...current.profile, diet: DIETS.includes(diet) ? diet : null } });
  },
  subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};
