// Réglages de l'utilisateur, gardés sur l'appareil : langue, école, avis par sujet débattu.
import { DEFAULT_PREFS, SCHOOLS, TOPICS, CERTIFIER_IDS } from "./rules.js";
import { PROFILE_ALLERGENS, DIETS } from "./profile.js";

const KEY = "halalscan_settings_v1";
export const LANGS = ["fr", "en", "ar", "tr"];
export const THEMES = ["auto", "light", "dark"];
export const TEXT_SIZES = ["normal", "large", "xlarge"];

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
  return normalize(saved);
}

// Réglages lus (stockage ou fichier importé) : chaque valeur est vérifiée
function normalize(saved) {
  saved = saved && typeof saved === "object" ? saved : {};
  const school = SCHOOLS[saved.school] || saved.school === "custom" ? saved.school : DEFAULT_PREFS.school;
  const topics = { ...SCHOOLS.standard, ...(SCHOOLS[school] || {}), ...(saved.topics || {}) };
  for (const t of Object.keys(topics)) if (!TOPICS.includes(t)) delete topics[t];
  return {
    lang: LANGS.includes(saved.lang) ? saved.lang : detectLang(),
    school,
    // École de départ d'un réglage personnalisé : sert à montrer les points modifiés
    baseSchool: SCHOOLS[saved.baseSchool] ? saved.baseSchool : SCHOOLS[school] ? school : "standard",
    topics,
    theme: THEMES.includes(saved.theme) ? saved.theme : "auto",
    textSize: TEXT_SIZES.includes(saved.textSize) ? saved.textSize : "normal",
    // Organismes de certification que l'utilisateur ne suit pas (par défaut : tous suivis)
    distrust: (Array.isArray(saved.distrust) ? saved.distrust : []).filter((id) => CERTIFIER_IDS.includes(id)),
    offlinePackAt: saved.offlinePackAt || null,
    offlinePackCount: saved.offlinePackCount || 0,
    offlineMedCount: saved.offlineMedCount || 0,
    onboarded: !!saved.onboarded || Object.keys(saved).length > 0, // déjà utilisé avant l'accueil guidé
    tourDone: !!saved.tourDone, // visite guidée de l'écran d'accueil vue
    sheetTourDone: !!saved.sheetTourDone, // explication de la fiche produit vue (au premier produit)
    // Profils de la famille (Premium) : prénom, allergies et régime de chacun
    members: (Array.isArray(saved.members) ? saved.members : []).slice(0, 8).filter((m) => m && m.id && m.name).map((m) => ({
      id: String(m.id).slice(0, 20),
      name: String(m.name).slice(0, 24),
      allergens: (m.allergens || []).filter((a) => PROFILE_ALLERGENS.includes(a)),
      diet: DIETS.includes(m.diet) ? m.diet : null,
    })),
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
    this.set({ school, baseSchool: school, topics: { ...SCHOOLS[school] } });
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
  addMember(name) {
    name = String(name || "").trim().slice(0, 24);
    if (!name || current.members.length >= 8) return null;
    const m = { id: "m" + Date.now().toString(36), name, allergens: [], diet: null };
    this.set({ members: [...current.members, m] });
    return m.id;
  },
  removeMember(id) {
    this.set({ members: current.members.filter((m) => m.id !== id) });
  },
  updateMember(id, fn) {
    this.set({ members: current.members.map((m) => (m.id === id ? { ...m, ...fn(m) } : m)) });
  },
  toggleMemberAllergen(id, tag) {
    if (!PROFILE_ALLERGENS.includes(tag)) return;
    this.updateMember(id, (m) => ({ allergens: m.allergens.includes(tag) ? m.allergens.filter((a) => a !== tag) : [...m.allergens, tag] }));
  },
  setMemberDiet(id, diet) {
    this.updateMember(id, () => ({ diet: DIETS.includes(diet) ? diet : null }));
  },
  toggleTrust(id) {
    if (!CERTIFIER_IDS.includes(id)) return;
    const distrust = current.distrust.includes(id) ? current.distrust.filter((x) => x !== id) : [...current.distrust, id];
    this.set({ distrust });
  },
  setDiet(diet) {
    this.set({ profile: { ...current.profile, diet: DIETS.includes(diet) ? diet : null } });
  },
  // Fichier importé : remplace les réglages (valeurs vérifiées), garde l'accueil déjà vu
  import(obj) {
    const next = normalize({ ...obj, onboarded: true });
    current = next;
    save();
    listeners.forEach((fn) => fn(current, { lang: next.lang, imported: true }));
  },
  // Revenir aux réglages d'origine, sans changer la langue ni revoir l'accueil
  reset() {
    const next = normalize({ lang: current.lang, onboarded: true });
    current = next;
    save();
    listeners.forEach((fn) => fn(current, { reset: true }));
  },
  subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};
