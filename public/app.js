import { createClient, OffError, present, classifyAny } from "./lib/off.js";
import { createCamera, decodeImageFile, getDetector, detectorEngine } from "./lib/camera.js";
import { store, localProducts } from "./lib/store.js";
import { settings, LANGS, THEMES, TEXT_SIZES } from "./lib/settings.js";
import { classify, ADDITIVES, TEXT_RULES, TOPICS, SCHOOLS, DECISIONS, TOPIC_OF, SEVERITY_OF, SCHOOL_TOPICS } from "./lib/rules.js";
import { ADDITIVE_RISK, HEALTH_GRADES, HEALTH_VERSION, analyzeHealth } from "./lib/health.js";
import { t, tn, has as hasT, setLang, getLang, locale, applyStatic, LANG_NAMES, dictBuilds } from "./lib/i18n.js";
// Numéro de version : le même que dans sw.js et les fichiers de traduction (vérifié par les tests).
const APP_BUILD = "2026-10-28-7";
// Réseau lent pendant une mise à jour : le téléphone a pu prendre la nouvelle app avec d'anciennes
// traductions gardées en cache (des textes s'afficheraient sous forme de code). On recharge une fois.
if (typeof sessionStorage !== "undefined" && dictBuilds().some((b) => b !== APP_BUILD)) {
  try {
    if (sessionStorage.getItem("bayyin_build_reload") !== APP_BUILD) {
      sessionStorage.setItem("bayyin_build_reload", APP_BUILD);
      setTimeout(() => location.reload(), 400);
    }
  } catch { /* stockage bloqué : on continue */ }
}
import { readIngredients, additivesFromText, OCR_GOOD } from "./lib/ocr.js";
import { SOURCES, SOURCE_BY_ID, RISK_SOURCES, FLAG_SOURCES } from "./lib/sources.js";
import { checkProfile, hasProfile, PROFILE_ALLERGENS, DIETS } from "./lib/profile.js";
import { BEAUTY_RULES } from "./lib/beauty.js";
import { isMedicineCode } from "./lib/medicine.js";
import { drawShareCard } from "./lib/sharecard.js";
import { setCosmeticDb, cosmeticDbVersion, analyzeCosmetic, COSMETIC_RULES } from "./lib/cosmetic.js";
import { createAisle } from "./lib/aisle.js";
import { mascot } from "./lib/mascot.js";
import { readLabel } from "./lib/highlight.js";
import { ramadanDay, fastTimes } from "./lib/ramadan.js";
import { loadWorld, resolveOrigin, flagOf, countryName, mapSvg } from "./lib/world.js";
import { RANK_CATEGORIES, RANK_BY_ID, RANK_ICONS, rankIndex, rankProducts, rankList, rankTab } from "./lib/rankings.js";
import { fetchPlaces, livePlaces, geocode, directionsUrl, osmUrl, RADII, CATEGORIES } from "./lib/places.js";
import { rankByRelevance } from "./lib/search.js";
import { recallsFor, recentRecalls, matchRecent, isActive } from "./lib/recalls.js";
import { loadCertified, verifyCertification } from "./lib/certcheck.js";
import { CERTIFIER_INFO, searchUrl } from "./lib/certifiers.js";
import { verdictConfidence } from "./lib/confidence.js";
import { contribute, contributed, offAccountReady, addUrl } from "./lib/contribute.js";
import { APP } from "./app-config.js";
import { isPremium, premiumEnabled, premiumConfig, premiumState, activate as activatePremium, refresh as refreshPremium, deactivate as deactivatePremium, onPremiumChange, maskKey, FREE_HISTORY_DAYS, PREMIUM_HISTORY_DAYS } from "./lib/premium.js";

// Mode démo (produits d'exemple, sans connexion) : ajouter ?demo à l'adresse.
const DEMO = new URLSearchParams(location.search).has("demo");

// Tout premier lancement : le nom بيّن se trace à l'encre, une seule fois (touchez pour passer).
(function playIntro() {
  const qs = new URLSearchParams(location.search);
  let seen = false;
  try { seen = localStorage.getItem("bayyin_intro") === "1"; } catch { /* stockage indisponible */ }
  if (!qs.has("intro") && (seen || DEMO || matchMedia("(prefers-reduced-motion: reduce)").matches)) return;
  try { localStorage.setItem("bayyin_intro", "1"); } catch { /* stockage indisponible */ }
  const el = document.createElement("div");
  el.className = "intro";
  el.setAttribute("aria-hidden", "true");
  el.innerHTML = `<svg viewBox="0 0 400 230"><text x="200" y="160" text-anchor="middle" class="intro-ar">بيّن</text></svg><p class="intro-latin">Bayyin</p>`;
  document.body.appendChild(el);
  const done = () => { el.classList.add("out"); setTimeout(() => el.remove(), 500); };
  el.addEventListener("click", done);
  const ready = document.fonts && document.fonts.load ? document.fonts.load("700 140px 'IBM Plex Sans Arabic'", "بيّن").catch(() => {}) : Promise.resolve();
  Promise.race([ready, new Promise((r) => setTimeout(r, 700))]).then(() => {
    el.classList.add("go");
    setTimeout(done, 2300);
  });
})();
const prefs = () => settings.get();
// La base des médicaments est servie avec l'app (dossier data/med), donc aussi hors connexion.
const off = createClient({ demo: DEMO, prefs, medBase: new URL("data/med/", location.href).href });

const $ = (id) => document.getElementById(id);
const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const svg = (paths, cls = "") => `<svg viewBox="0 0 24 24" class="${cls}" aria-hidden="true">${paths}</svg>`;
const fmt = (v) => Number(v).toLocaleString(locale(), { maximumFractionDigits: v < 10 ? 1 : 0 });

// ===========================================================================
// Icônes et statuts
// ===========================================================================
const I = {
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  question: '<path d="M9.2 9a3 3 0 1 1 4.3 2.7c-.9.4-1.5 1.2-1.5 2.2v.6M12 18v.1"/>',
  cross: '<path d="M7 7l10 10M17 7L7 17"/>',
  dash: '<path d="M7 12h10"/>',
  star: '<path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8L3.5 9.7l5.9-.9z"/>',
  box: '<path d="M4 7l8-4 8 4v10l-8 4-8-4zM4 7l8 4 8-4M12 11v10"/>',
  chev: '<path d="M9 6l6 6-6 6"/>',
  shield: '<path d="M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6z"/><path d="M8.5 12l2.5 2.5 4.5-5"/>',
  flask: '<path d="M9 3h6M10 3v6.2L4.8 18a2 2 0 0 0 1.7 3h11a2 2 0 0 0 1.7-3L14 9.2V3"/>',
  doc: '<path d="M7 3h7l5 5v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM14 3v5h5M9 12h6M9 15.5h6M9 19h4"/>',
  energy: '<path d="M12 3c1 3.5 5 5.5 5 10a5 5 0 0 1-10 0c0-2.3 1.2-3.6 2.3-4.6.3 1.6 1 2.6 2 3.1C11 9 11.2 5.8 12 3z"/>',
  sugars: '<path d="M4 8l8-4 8 4v8l-8 4-8-4zM4 8l8 4 8-4M12 12v8"/>',
  "saturated-fat": '<path d="M12 3.5c3 4 6 7.4 6 10.5a6 6 0 0 1-12 0c0-3.1 3-6.5 6-10.5z"/>',
  salt: '<path d="M8 9h8l-1 11H9zM9 9c0-3 1.3-5 3-5s3 2 3 5M11 6h.01M13 6.5h.01"/>',
  proteins: '<path d="M12 4c3.3 0 6 3.4 6 8s-2.7 8-6 8-6-3.4-6-8 2.7-8 6-8z"/>',
  fiber: '<path d="M5 19c0-8 5-13 14-14-1 9-6 14-14 14zM5 19l7-7"/>',
  fruits: '<path d="M12 7c-4-2-8 1-7 6 .8 4 3.5 7 7 7s6.2-3 7-7c1-5-3-8-7-6zM12 7c0-2 1-3.5 3-4"/>',
  pill: '<path d="M10.5 20.5a5 5 0 0 1-7-7l6-6a5 5 0 0 1 7 7zM7 10.5l6.5 6.5"/>',
  drop: '<path d="M12 3.5c3.3 4.2 6 7.5 6 10.8a6 6 0 0 1-12 0c0-3.3 2.7-6.6 6-10.8z"/><path d="M9.5 15a2.6 2.6 0 0 0 2.5 2.4"/>',
  alert: '<path d="M12 4l9 16H3z"/><path d="M12 10v4.5M12 17.5v.1"/>',
  user: '<circle cx="12" cy="8.5" r="4"/><path d="M4.5 20.5c1.2-3.8 4-5.5 7.5-5.5s6.3 1.7 7.5 5.5"/>',
  bulb: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2V16h5v-.1c0-.8.4-1.5 1-2A6 6 0 0 0 12 3z"/>',
  crown: '<path d="M3.5 8l4.2 3.6L12 5l4.3 6.6L20.5 8l-1.8 10H5.3z"/><path d="M5.5 21h13"/>',
  lock: '<rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/>',
  family: '<circle cx="8" cy="8" r="3"/><circle cx="16.5" cy="9.5" r="2.4"/><path d="M2.5 20c.6-3.6 2.8-5.5 5.5-5.5s4.9 1.9 5.5 5.5M13.6 14.6c.9-.6 1.8-.9 2.9-.9 2.3 0 4.1 1.6 4.6 4.8"/>',
};
const STATUS_ICON = { halal_certifie: I.check, halal_probable: I.check, mashbouh: I.question, haram: I.cross, inconnu: I.dash };
const STATUS_ORDER = ["haram", "mashbouh", "halal_certifie", "halal_probable", "inconnu"];
const LEGEND_ORDER = ["halal_certifie", "halal_probable", "mashbouh", "haram", "inconnu"];
const S = (st, part) => t(`status.${st}.${part}`);

// Le verdict est recalculé à l'affichage : il suit toujours les réglages actuels.
// Verdict gardé en mémoire tant que la fiche et les réglages n'ont pas changé : l'historique
// en affiche des centaines, et le recalcul (règles sur toute la liste d'ingrédients) est coûteux.
const verdictMemo = new WeakMap();
const verdictOf = (p) => {
  if (!p.raw) return p.verdict;
  const s = prefs();
  const m = verdictMemo.get(p.raw);
  if (m && m.s === s) return m.v;
  const v = classifyAny(p.raw, s);
  verdictMemo.set(p.raw, { s, v });
  return v;
};
const nameOf = (p) => {
  const n = p.names || {};
  return n[getLang()] || p.name || n.any || n.en || t("product.unnamed");
};
// Type de produit et comparaison avec le profil (allergies, régime)
const kindOf = (p) => p.kind || (p.raw && p.raw.kind) || "food";
// Effets des ingrédients cosmétiques (légende de la méthode)
const KIND_ICONS = {
  illegal: '<circle cx="12" cy="12" r="8.5"/><path d="M6 6l12 12"/>',
  cmr: '<circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/>',
  ed: '<path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4a2 2 0 0 0 1.8-3l-5-9V3"/><path d="M7.5 15h9"/>',
  allergen: '<circle cx="12" cy="9" r="4"/><path d="M12 13v8M12 5V3M8 9H6M18 9h-2M9.2 6.2L8 5M14.8 6.2L16 5"/>',
  irritant: '<path d="M12 3l9 16H3z"/><path d="M12 10v4M12 17h.01"/>',
  env: '<path d="M4 14c3-4 6-4 9 0s6 4 7 0"/><path d="M4 19c3-4 6-4 9 0s6 4 7 0"/><path d="M12 9V3M9 6l3-3 3 3"/>',
  contaminant: '<path d="M7 3h10M8 3v5l-3 11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1L16 8V3"/><circle cx="10" cy="15" r="1"/><circle cx="14" cy="13" r="1"/>',
  precaution: '<circle cx="12" cy="12" r="8.5"/><path d="M12 8v5M12 16h.01"/>',
};
const KIND_ICON = { food: I.box, beauty: I.drop, medicine: I.pill };
// Profil : le vôtre, et ceux de la famille (Premium). L'alerte la plus forte passe en premier,
// avec le prénom de la personne concernée.
const familyOn = () => prefs().members.length > 0 && isPremium();
const profileMemo = new WeakMap();
const profileOf = (p) => {
  const key = p.raw || p;
  const s = prefs();
  const m = profileMemo.get(key);
  if (m && m.s === s && m.fam === familyOn()) return m.r;
  const r = profileCalc(p);
  profileMemo.set(key, { s, fam: familyOn(), r });
  return r;
};
const profileCalc = (p) => {
  const v = verdictOf(p);
  const mine = checkProfile(p.raw, v, prefs().profile);
  if (!familyOn()) return mine;
  const people = [{ name: null, r: mine }, ...prefs().members.map((m) => ({ name: m.name, r: checkProfile(p.raw, v, m) }))].filter((x) => x.r.alert);
  if (!people.length) return mine;
  people.sort((a, b) => (a.r.alert === "no" ? 0 : 1) - (b.r.alert === "no" ? 0 : 1));
  return { ...people[0].r, who: people[0].name, people: people.map((x) => ({ name: x.name, ...x.r })) };
};
const alertPill = (p) => alertTag(p); // allergène ou régime en toutes lettres
const statusPill = (st) => `<span class="pill s-${st}"><span class="dot"></span>${S(st, "short")}</span>`;
// Cosmétiques : la note est recalculée quand la base CosIng arrive (chargée après l'ouverture de l'app)
// Aliments : une note calculée avec une ancienne méthode est recalculée (si la fiche gardée le permet)
const healthStale = (p) => p && kindOf(p) === "food" && !p.local && p.health && p.health.v !== HEALTH_VERSION;
function healthOf(p) {
  if (healthStale(p) && p.raw && p.raw.nutriments) p.health = analyzeHealth(p.raw);
  if (p && p.raw && kindOf(p) === "beauty" && cosmeticDbVersion() && (!p.health || p.health.dbVersion !== cosmeticDbVersion())) {
    p.health = analyzeCosmetic(p.raw);
  }
  return p && p.health;
}
const scoreOf = (p) => { const h = healthOf(p); return (h && h.score) || null; };
const miniScore = (p) => {
  const s = scoreOf(p);
  return s ? `<span class="mini-score g-${s.grade}" dir="ltr"><span class="dot"></span>${s.score}/100</span>` : "";
};

// Libellés des signalements (traduits à partir de leur identifiant)
// Ingrédient couvert par la certification : on ne l'appelle plus « non certifié »
const coveredText = (f, part) => {
  const k = `flag.${f.id}.covered_${part}`;
  return f.covered && hasT(k) ? t(k) : null;
};
function flagLabel(f) {
  if (f.group === "gras") return `${f.code} · ${t("flag.fatty.label")}`;
  const label = coveredText(f, "label") || t(`flag.${f.id}.label`);
  return f.code ? `${f.code} · ${label}` : label;
}
function flagReason(f) {
  if (coveredText(f, "reason")) return coveredText(f, "reason");
  if (f.variant) return t(`flag.variant.${f.variant}`);
  if (f.group === "gras") return t("flag.fatty.reason");
  return t(`flag.${f.id}.reason`);
}
// « Source : EFSA, CIRC » avec liens
function sourceLine(ids) {
  const links = (ids || []).map((id) => SOURCE_BY_ID[id]).filter(Boolean)
    .map((src) => `<a href="${esc(src.url)}" target="_blank" rel="noopener">${esc(src.name)}</a>`);
  return links.length ? `<span class="src-line">${t("detail.source")} : ${links.join(", ")}</span>` : "";
}
const noteText = (n) => (/\s/.test(n) ? n : t(`note.${n}`)); // anciennes entrées : texte déjà rédigé

// ===========================================================================
// Fiche produit
// ===========================================================================
// Produit sans photo : une illustration selon la catégorie plutôt qu'une boîte grise
const CAT_ART = [
  { id: "meat", re: /meats|sausages|poultr|charcuter|hams|beef|chicken|lamb|kebab|merguez/, path: '<path d="M15 3a6 6 0 0 1 0 12c-1 0-2-.2-2.8-.6L9 17.6a2.5 2.5 0 1 1-2.6 2.9 2.5 2.5 0 1 1-2.9-2.6l3.2-3.2A6 6 0 0 1 15 3z"/>' },
  { id: "fish", re: /fish|seafood|tuna|salmon|sardine|shrimp|crustacean/, path: '<path d="M3 12c3.2-4.8 9.4-6 14-2l4-3v10l-4-3c-4.6 4-10.8 2.8-14-2z"/><circle cx="8" cy="11" r=".9" fill="currentColor"/>' },
  { id: "dairy", re: /dair|chees|milk|yogurt|yoghurt|cream|butter/, path: '<path d="M8 3h8v3l2 3v12H6V9l2-3z"/><path d="M6 12h12M8 6h8"/>' },
  { id: "drink", re: /beverage|drink|juice|water|soda|coffee|tea/, path: '<path d="M6 4h12l-1.6 16H7.6z"/><path d="M6.6 9h10.8"/><path d="M13 4l2-2"/>' },
  { id: "sweet", re: /sweet|confection|chocolate|biscuit|candies|candy|dessert|cake|ice-cream/, path: '<circle cx="12" cy="12" r="4.5"/><path d="M8.2 9.5L4 7v10l4.2-2.5M15.8 9.5L20 7v10l-4.2-2.5"/>' },
  { id: "bakery", re: /bread|viennoiser|bakery|cereal|pastr|pasta|rice/, path: '<path d="M4 10a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4c0 1.2-.9 2-2 2v7H6v-7c-1.1 0-2-.8-2-2z"/><path d="M10 9.5l-1 2M14 9.5l-1 2"/>' },
  { id: "plant", re: /fruit|vegetable|legume|nuts|plant-based/, path: '<path d="M12 7.5c-3-2-7.8-.2-7 5.6.7 4.9 4 8 7 7 3 1 6.3-2.1 7-7 .8-5.8-4-7.6-7-5.6z"/><path d="M12 7.5c0-2 1-3.3 3-4"/>' },
  { id: "meal", re: /meal|pizza|sandwich|soup|prepared|frozen/, path: '<circle cx="12" cy="12" r="7.5"/><circle cx="12" cy="12" r="3.5"/>' },
  { id: "sauce", re: /condiment|sauce|spice|oil|vinegar|honey|spread|jam/, path: '<path d="M8 8h8v11a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2z"/><path d="M9 4h6v4H9z"/><path d="M8 13h8"/>' },
];
const catArt = (p) => {
  if (!p || p.local || kindOf(p) !== "food") return null;
  const tags = (p.categories || (p.raw && p.raw.categories_tags) || []).join(" ").toLowerCase();
  const name = String(nameOf(p) || "").toLowerCase();
  return tags ? CAT_ART.find((c) => c.re.test(tags)) : CAT_ART.find((c) => c.re.test(name));
};
// Vignette sans photo : illustration de catégorie (aliments), sinon icône du type de produit
function phArt(p, cls) {
  const art = catArt(p);
  return art
    ? `<span class="${cls} ph cat cat-${art.id}" aria-hidden="true">${svg(art.path)}</span>`
    : `<span class="${cls} ph" aria-hidden="true">${svg(p.local ? I.doc : KIND_ICON[kindOf(p)])}</span>`;
}
function productTop(p) {
  const nPhotos = productPhotos(p).length;
  const img = p.image
    ? `<button type="button" class="p-img-btn" data-zoom aria-label="${esc(t("zoom.open"))}"><img class="p-img" src="${esc(p.image)}" alt="" referrerpolicy="no-referrer">${
        nPhotos > 1 ? `<span class="p-img-count" dir="ltr">${svg('<rect x="4" y="6" width="13" height="13" rx="2"/><path d="M8 3h11a2 2 0 0 1 2 2v11"/>')}${nPhotos}</span>` : `<span class="p-img-zoom">${svg('<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4 4M11 8.5v5M8.5 11h5"/>')}</span>`}</button>`
    : phArt(p, "p-img");
  const meta = [p.brand, p.quantity].filter(Boolean).map(esc).join(" · ");
  const code = /^\d+$/.test(p.code) ? p.code : "";
  // Fiche publique sans photo : lien direct pour en ajouter une sur Open Food Facts / Open Beauty Facts
  const addPhoto = !p.image && !p.local && code && kindOf(p) !== "medicine"
    ? `<a class="p-addphoto" href="${esc(`https://world.open${kindOf(p) === "beauty" ? "beauty" : "food"}facts.org/cgi/product.pl?type=edit&code=${code}`)}" target="_blank" rel="noopener">${svg('<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>')}${t("detail.add_photo")}</a>`
    : "";
  return `<div class="p-top">${img}<div class="p-text">
    <span class="p-name">${esc(nameOf(p))}</span>
    ${meta ? `<span class="p-meta">${meta}</span>` : ""}
    ${code ? `<span class="p-code" dir="ltr">${esc(code)}</span>` : ""}
    ${addPhoto}
  </div></div>`;
}

// Verdict en grand : la réponse se lit en une demi-seconde, la note santé juste en dessous.
function verdictHero(p, v) {
  const s = scoreOf(p);
  const kind = kindOf(p);
  // Aliments : note santé ; cosmétiques : note des ingrédients ; médicaments : forme pharmaceutique
  const scoreLabel = t(kind === "beauty" ? "detail.cosmetic" : "detail.health");
  const foot = kind === "medicine"
    ? `<span class="kind-ico">${svg(KIND_ICON[kind])}</span>
       <span class="v-foot-text"><span>${t(`kind.${kind}`)}</span><strong>${esc(p.form || t("kind.medicine"))}</strong></span>`
    : s
      ? `<span class="ring" style="--p:${s.score}" dir="ltr"><span>${s.score}<small>/100</small></span></span>
         <span class="v-foot-text"><span>${scoreLabel}</span><strong>${t(`grade.${s.grade}`)}</strong></span>
         <span class="grade-dot g-${s.grade}" aria-hidden="true"></span>`
      : `<span class="ring" style="--p:0"><span>?</span></span>
         <span class="v-foot-text"><span>${scoreLabel}</span><strong>${t(kind === "beauty" ? "detail.cosmetic_none_short" : "detail.not_rated")}</strong></span>`;
  return `<div class="verdict v-${v.status}" role="status">
    <div class="v-main">
      <span class="v-ico">${svg(STATUS_ICON[v.status])}</span>
      <span class="v-text"><span class="v-kicker">${t("detail.halal")}</span><strong class="v-label">${S(v.status, "label")}</strong><span class="v-lead">${S(v.status, "lead")}</span></span>
    </div>
    <div class="v-foot">${foot}</div>
    <span class="v-sheen" aria-hidden="true"></span>
  </div>${confidenceHtml(p, v)}`;
}

// Fiabilité du verdict : niveau, puis le détail de ce qui a été vérifié
function confidenceHtml(p, v) {
  const c = verdictConfidence(p, v);
  const bars = { high: 3, medium: 2, low: 1 }[c.level];
  return `<details class="conf conf-${c.level}">
    <summary><span class="conf-bars" aria-hidden="true">${[1, 2, 3].map((i) => `<i class="${i <= bars ? "on" : ""}"></i>`).join("")}</span>
      <span class="conf-t">${t("conf.title")} : <strong>${t(`conf.${c.level}`)}</strong></span><span class="src-chev" aria-hidden="true">${svg(I.chev)}</span></summary>
    <ul>${c.reasons.map((r) => `<li class="${r.ok ? "ok" : "no"}">${svg(r.ok ? I.check : I.dash)}<span>${t(`conf.r.${r.id}${r.ok ? "" : "_no"}`)}</span></li>`).join("")}</ul>
    <p>${t(`conf.${c.level}.p`)}</p>
  </details>`;
}

// Alerte personnelle en haut de la fiche
function profileAlert(p) {
  const r = profileOf(p);
  if (!r.alert) return "";
  const names = (tags) => tags.map((a) => t(`allergen.${a}`)).join(", ");
  const linesOf = (x) => [
    x.contains.length ? t("alert.contains", { list: names(x.contains) }) : null,
    x.diet ? t(`alert.${x.diet.id}.${x.diet.level}`) : null,
    x.traces.length ? t("alert.traces", { list: names(x.traces) }) : null,
  ].filter(Boolean);
  const lines = r.people
    ? r.people.flatMap((x) => linesOf(x).map((l) => `${x.name || t("family.me")} : ${l}`))
    : linesOf(r);
  return `<div class="alert-card a-${r.alert}" role="alert">
    <span class="alert-top">${svg(I.alert)}${t(`alert.${r.alert}`)}</span>
    ${lines.map((l) => `<p>${esc(l)}</p>`).join("")}
    <small>${t("alert.note")}</small>
    <a href="#settings" data-goto-settings="profile">${t("alert.edit")}</a>
  </div>`;
}

// Médicament : forme, laboratoire, conseil
function medicineSection(p) {
  return `<section class="sec"><div class="sec-head"><h3>${t("kind.medicine")}</h3></div>
    <p class="lead">${t("detail.med_lead")}</p>
    <div class="kv"><div><span>${t("detail.med_form")}</span><strong>${esc(p.form || "—")}</strong></div>
    ${p.brand ? `<div><span>${t("detail.med_holder")}</span><strong>${esc(p.brand)}</strong></div>` : ""}</div>
    <p class="advice">${svg(I.bulb)}<span>${t("detail.med_ask")}</span></p>
    <p class="notes">${t("detail.med_source")}</p>
  </section>`;
}

// Chaîne de vérification : ce que Bayyin a contrôlé, étape par étape (ingrédients, origine, additifs, label).
// Une étape en défaut renvoie au point concerné plus bas.
const CHAIN_ICO = {
  ing: '<path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4M10 12h5M10 16h5"/>',
  origin: '<path d="M8 4c0 3 1 4 4 4s4-1 4-4"/><path d="M6 10c0 6 2.5 10 6 10s6-4 6-10"/><path d="M10 14h4"/>',
  add: '<path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3"/><path d="M7.5 15h9"/>',
  cert: '<path d="M12 3l7 3v5c0 4.5-3 8.2-7 10-4-1.8-7-5.5-7-10V6z"/><path d="M9 12l2 2 4-4"/>',
};
function chainSteps(p, v) {
  const hasList = !!(p.ingredients || (p.raw && (p.raw.additives_tags || []).length)) || v.flags.length > 0;
  const step = (id, list) => {
    if (!hasList && id !== "cert") return { id, state: "na", sub: t("chain.na") };
    const bad = list.filter((f) => f.severity === "haram"), doubt = list.filter((f) => f.severity === "mashbouh");
    const worst = bad.length ? bad : doubt;
    if (worst.length) return { id, state: bad.length ? "bad" : "warn", sub: flagLabel(worst[0]) + (worst.length > 1 ? ` +${worst.length - 1}` : ""), jump: worst[0].id };
    if (list.some((f) => f.covered)) return { id, state: "ok", sub: t("chain.covered") };
    return { id, state: "ok", sub: t("chain.ok") };
  };
  const cert = v.certification
    ? { id: "cert", state: "ok", sub: v.certification.organisme || t("detail.certified") }
    : v.certIgnored ? { id: "cert", state: "warn", sub: t("chain.cert_ignored") } : { id: "cert", state: "none", sub: t("chain.cert_none") };
  return [
    hasList ? { id: "ing", state: "ok", sub: t("chain.ing_ok") } : { id: "ing", state: "na", sub: t("chain.ing_none") },
    step("origin", v.flags.filter((f) => !f.code)),
    step("add", v.flags.filter((f) => f.code)),
    cert,
  ];
}
const CHAIN_MARK = { ok: I.check, bad: I.cross, warn: '<path d="M12 7v6"/><path d="M12 17h.01"/>', na: I.dash, none: I.dash };
function chainHtml(p, v) {
  if (kindOf(p) === "medicine") return "";
  const steps = chainSteps(p, v);
  const label = steps.map((s) => `${t(`chain.s.${s.id}`)} : ${s.sub}`).join(" · ");
  return `<ol class="chain" aria-label="${esc(`${t("chain.title")} — ${label}`)}">${steps.map((s, i) => {
    const inner = `<span class="ch-dot">${svg(CHAIN_ICO[s.id])}<span class="ch-mark">${svg(CHAIN_MARK[s.state])}</span></span>
      <span class="ch-name">${esc(t(`chain.s.${s.id}`))}</span><span class="ch-sub" dir="auto">${esc(s.sub)}</span>`;
    return `<li class="ch-step ch-${s.state}" style="--i:${i}">${s.jump ? `<button type="button" class="ch-btn" data-jump-flag="${esc(s.jump)}">${inner}</button>` : `<span class="ch-btn">${inner}</span>`}</li>`;
  }).join("")}</ol>`;
}

function flagSetting(f) {
  return f.covered
    ? `<span class="flag-setting">${t("detail.covered")}</span>`
    : f.topic && f.decision
      ? `<span class="flag-setting">${esc(t("detail.by_setting", { topic: t(`topic.${f.topic}`), d: t(`decision.${f.decision}`).toLowerCase() }))} <a href="#settings" data-goto-settings>${t("detail.change_setting")}</a></span>`
      : "";
}
const pillOf = (sev) => (sev === "haram" ? "s-haram" : sev === "mashbouh" ? "s-mashbouh" : "r-info");

// ---------------------------------------------------------------------------
// Ce que dit l'étiquette : la vraie liste, les passages en cause surlignés à leur place.
// On touche un passage : l'explication s'ouvre juste en dessous (selon l'école choisie).
// ---------------------------------------------------------------------------
function labelReader(p, v) {
  if (!p.ingredients || kindOf(p) === "beauty") return "";
  const parts = readLabel(p.ingredients, { flags: v.flags, risks: (p.health && p.health.additives) || [] });
  const marks = parts.filter((x) => x.t === "hl");
  const notes = [];
  let k = 0;
  const body = parts.map((x) => {
    if (x.t === "text") return esc(x.text);
    if (x.t === "allergen") return `<b class="lb-al">${esc(x.text)}</b>`;
    const i = k++;
    notes.push(readerNote(x, i));
    return `<button type="button" class="hl hl-${x.kind}" data-hl="${i}" aria-expanded="false" aria-controls="hln-${i}">${esc(x.text)}</button>`;
  }).join("");
  const kinds = ["haram", "mashbouh", "risk", "info"].filter((kd) => marks.some((m) => m.kind === kd));
  const legend = [...kinds.map((kd) => `<span class="lg lg-${kd}">${esc(t(`reader.k.${kd}`))}</span>`),
    parts.some((x) => x.t === "allergen") ? `<span class="lg lg-al">${esc(t("reader.k.allergen"))}</span>` : ""].join("");
  const long = p.ingredients.length > 380;
  return `<div class="reader${long ? " long" : ""}">
    <div class="reader-head"><strong>${t("reader.title")}</strong><small>${esc(marks.length ? tn("reader.sum", marks.length) : t("reader.none"))}</small></div>
    <p class="reader-text" dir="auto">${body}</p>
    ${long ? `<button type="button" class="reader-more" data-reader-more>${t("reader.more")}</button>` : ""}
    ${notes.join("")}
    ${legend ? `<div class="reader-legend">${legend}</div>` : ""}
  </div>`;
}
function readerNote(x, i) {
  const rows = x.flags.map((f) => `<div class="hn-row"><div class="flag-top"><span class="flag-term">${esc(flagLabel(f))}</span><span class="pill ${pillOf(f.severity)}">${t(`sev.${f.severity}`)}</span></div>
    <span class="flag-why">${esc(flagReason(f))}</span>${flagSetting(f)}</div>`);
  if (x.risk) {
    const c = String(x.risk.code);
    rows.push(`<div class="hn-row"><div class="flag-top"><span class="flag-term">${esc(c.toUpperCase())} · ${esc(t(`addname.${c.toLowerCase()}`))}</span><span class="pill r-${x.risk.level}">${t(`risk.${x.risk.level}`)}</span></div>
      <span class="flag-why">${esc(t(`risk.reason.${x.risk.key}`))}</span></div>`);
  }
  return `<div class="hl-note hl-note-${x.kind}" id="hln-${i}" hidden>${rows.join("")}</div>`;
}

function halalSection(p, v) {
  // Label lu sur la fiche Open Food Facts. Quand l'organisme publie une liste (AVS, Achahada, HMC),
  // loadCertCheck remplace la note par le résultat de la vérification ; sinon on donne un moyen de vérifier.
  const org = v.certification && v.certification.organisme;
  const verifyUrl = org
    ? CERT_LINKS[org] || `https://duckduckgo.com/?q=${encodeURIComponent(`${org} halal ${p.brand || ""}`)}`
    : `https://duckduckgo.com/?q=${encodeURIComponent(`${p.brand || nameOf(p)} halal certification organisme`)}`;
  // Un seul bloc : le label, puis (si l'organisme publie une liste) le résultat de la vérification
  const checkable = v.certification && v.certification.organismeId && CERT_LISTED.includes(v.certification.organismeId);
  const cert = v.certification
    ? `<div class="cert-card" id="certCard"${checkable ? ' data-state="checking"' : ""}>
         <div class="cert-head">${svg(I.shield)}<strong>${t("detail.certified")}${org ? " · " + esc(org) : ""}</strong><span class="cert-badge" id="certBadge">${checkable ? `<span class="spinner"></span>` : ""}</span></div>
         <div id="certCheck" class="cert-body"><p class="cert-note">${t(checkable ? "certv.checking" : "cert.unverified")} <a href="${esc(verifyUrl)}" target="_blank" rel="noopener">${esc(org ? t("cert.verify", { org }) : t("cert.verify_any"))} ↗</a></p></div>
       </div>`
    : "";
  const ignored = v.certIgnored
    ? `<div class="cert cert-off">${svg(I.shield)}${esc(t("certs.ignored", { org: v.certIgnored.organisme }))}</div>`
    : "";
  const notes = [...(p.local ? [t(p.raw && p.raw.ocr_from === "off" ? "offocr.note" : "detail.local")] : []), ...v.notes.map(noteText)];
  const flags = v.flags.length
    ? `<div class="flags">${v.flags
        .map((f) => {
          const pillCls = pillOf(f.severity);
          const setting = flagSetting(f);
          return `<div class="flag ${f.severity}" data-fid="${esc(f.id)}">
            <div class="flag-top"><span class="flag-term">${esc(flagLabel(f))}</span><span class="pill ${pillCls}">${t(`sev.${f.severity}`)}</span></div>
            <span class="flag-why">${esc(flagReason(f))}</span>
            ${setting}
            ${f.source && !f.code ? `<span class="flag-src">${esc(t("detail.found_in", { s: f.source }))}</span>` : ""}
            ${sourceLine(FLAG_SOURCES[f.id])}
          </div>`;
        })
        .join("")}</div>`
    : "";
  // Liste absente mais photo des ingrédients publiée sur Open Food Facts : Bayyin peut la lire
  const offPhoto = v.status === "inconnu" && /^\d+$/.test(p.code) && kindOf(p) === "food" && ingredientsPhoto(p);
  const ocrCta =
    v.status === "inconnu" && /^\d+$/.test(p.code) && kindOf(p) === "food"
      ? (offPhoto ? `<div class="off-photo">
          <img src="${esc(offPhoto)}" alt="" referrerpolicy="no-referrer">
          <span><strong>${esc(t("offocr.t"))}</strong><small>${esc(t("offocr.p"))}</small></span>
          <button class="btn btn-primary" type="button" data-off-ocr="${esc(p.code)}">${svg(I.doc)}${esc(t("offocr.btn"))}</button></div>` : "") +
        `<label class="btn ${offPhoto ? "btn-soft" : "btn-primary"}" for="ocrInput" data-ocr-code="${esc(p.code)}">${svg(I.doc)}${t("detail.photo_ingredients")}</label>`
      : "";
  // Fiche sans ingrédients : on cherche une fiche plus complète du même produit (autre format, autre pays)
  const twins = !p.ingredients && !p.local && /^\d+$/.test(p.code) && kindOf(p) === "food" && nameOf(p)
    ? `<div id="twinBox" class="twins" hidden></div>` : "";
  return `<section class="sec"><div class="sec-head"><h3>${t("detail.halal")}</h3></div>
    ${chainHtml(p, v)}${cert}${ignored}
    ${notes.length ? `<div class="notes">${notes.map((n) => `<p>${esc(n)}</p>`).join("")}</div>` : ""}
    ${labelReader(p, v)}${flags}${askBrand(p, v)}${ocrCta}${twins}</section>`;
}

// ---------------------------------------------------------------------------
// Environnement (Green-Score d'Open Food Facts)
// ---------------------------------------------------------------------------
const GS_GRADES = ["a-plus", "a", "b", "c", "d", "e", "f"];
const envCache = new Map();
function envRow(ico, title, sub, right, extra = "") {
  return `<div class="env-row"><span class="nut-ico">${svg(ico)}</span><span class="nut-text"><strong>${esc(title)}</strong><small>${sub}</small></span><span class="env-right">${right}</span>${extra}</div>`;
}
const ENV_ICO = {
  prod: '<path d="M4 20h16"/><path d="M6 20v-6l4-3 4 3v6"/><path d="M14 11l3-2 3 2v9"/><circle cx="8" cy="6" r="2"/>',
  bio: '<path d="M5 19c0-8 6-14 14-14 0 8-6 14-14 14z"/><path d="M5 19l8-8"/>',
  palm: '<path d="M12 21V11"/><path d="M12 11c-3-3-7-3-9-1M12 11c3-3 7-3 9-1M12 11c-1-4-4-6-7-6M12 11c1-4 4-6 7-6"/>',
  origin: '<path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.4"/>',
  pack: '<path d="M4 8l8-4 8 4v8l-8 4-8-4z"/><path d="M4 8l8 4 8-4M12 12v8"/>',
};
// Matériaux et formes d'emballage (étiquettes Open Food Facts) : traduits quand on les connaît
const envWord = (kind, w) => {
  if (!w) return "";
  const base = w.replace(/^(pp|pet|pe|hdpe|ldpe|ps|pvc)-/, "$1:").split(":")[0];
  for (const k of [w, base]) { const key = `env.${kind}.${k}`; if (hasT(key)) return t(key); }
  return w.replace(/-/g, " ");
};
const okIco = (ok) => ok === null ? `<span class="env-na">—</span>` : `<span class="env-ok ${ok ? "yes" : "no"}">${svg(ok ? I.check : I.cross)}</span>`;
// Repères sous la jauge de production : où se situent quelques aliments connus (ordre de grandeur)
const BENCH = [
  [4, '<path d="M5.5 10.5C6.5 6 12 3.5 16.5 6s4 9.5-1 11.5-11 1.5-11-2.5c0-1.6.5-3 1-4.5z"/><circle cx="14" cy="11" r="2"/>'],
  [22, '<rect x="6" y="3" width="12" height="18" rx="1.5"/><path d="M6 9h12M6 15h12M12 3v18"/>'],
  [41, '<path d="M14.5 3.5a5.5 5.5 0 0 1 2.8 10.3L13 15l-3.2 3.2"/><path d="M14.5 3.5A5.5 5.5 0 0 0 9 9l-.5 5"/><path d="M8.5 14L6 16.5a2 2 0 1 0 1.5 1.5L10 15.5"/>'],
  [60, '<path d="M12 21L3.5 6.5c5.5-3 11.5-3 17 0z"/><path d="M5 9c4.5-2 9.5-2 14 0"/><circle cx="12" cy="12" r="1.2"/><circle cx="10" cy="15.5" r="1"/>'],
  [80, '<path d="M12 21v-7"/><path d="M8 14.5a4 4 0 1 1 2.3-7.3 4 4 0 0 1 7.2 1.3 3.5 3.5 0 0 1-1.5 6z"/>'],
  [96, '<path d="M12 7.5c-3-2-7 0-7 4.8 0 4.5 3 8.7 5 8.7.9 0 1.4-.5 2-.5s1.1.5 2 .5c2 0 5-4.2 5-8.7 0-4.8-4-6.8-7-4.8z"/><path d="M12 7.5c0-2 1-3.3 3-4"/>'],
];
const benchHtml = () => `<div class="env-bench" dir="ltr" aria-hidden="true">${BENCH.map(([x, ico]) => `<span style="left:${x}%">${svg(ico)}</span>`).join("")}</div>
  <p class="env-bench-t">${esc(t("env.bench"))}</p>`;
// Nom d'une origine dans la langue choisie : pays (Intl), région, ou le mot tel quel
function originName(o) {
  if (!o) return "";
  if (o.region) return t(`env.region.${o.region}`);
  if (o.iso) return countryName(o.iso, getLang());
  const k = `env.origin.${o.tag}`;
  return hasT(k) ? t(k) : o.tag.replace(/-/g, " ");
}
function originBlock(e, world) {
  const R = (tag) => resolveOrigin(tag, world);
  const agg = e.origins.map((o) => ({ o: R(o.origin), percent: o.percent })).filter((x) => x.o);
  const ingr = e.byIngredient.map((x) => ({ name: x.name, list: x.origins.map(R).filter(Boolean) })).filter((x) => x.list.length);
  const prod = e.productOrigins.map(R).filter(Boolean);
  const all = [...agg.map((x) => x.o), ...ingr.flatMap((x) => x.list), ...prod];
  if (!all.length) return envRow(ENV_ICO.origin, t("env.origins"), esc(t("env.origin_none")), okIco(null));
  const uniq = [...new Map(all.map((o) => [o.tag, o])).values()];
  const isos = [...new Set(all.flatMap((o) => (o.iso ? [o.iso] : o.isos || [])))];
  const summary = esc(uniq.map(originName).join(", "));
  const flags = `<span class="env-flags" aria-hidden="true">${uniq.slice(0, 3).map(flagOf).join("")}${uniq.length > 3 ? "…" : ""}</span>`;
  const rows = ingr.length
    ? ingr.map((x) => `<li><span class="env-flag" aria-hidden="true">${flagOf(x.list[0])}</span><span><strong dir="auto">${esc(x.name.charAt(0).toUpperCase() + x.name.slice(1))}</strong><small>${esc(x.list.map(originName).join(", "))}</small></span></li>`)
    : (agg.length ? agg : prod.map((o) => ({ o, percent: null }))).map((x) => `<li><span class="env-flag" aria-hidden="true">${flagOf(x.o)}</span><span><strong>${esc(originName(x.o))}</strong>${x.percent ? `<small>${esc(t("env.pct", { p: x.percent }))}</small>` : ""}</span></li>`);
  return `<details class="nut-d env-origin" open><summary>${envRow(ENV_ICO.origin, t("env.origins"), summary, flags)}</summary>
    ${isos.length ? mapSvg(world, isos, t("env.map_label")) : ""}
    <ul class="env-olist">${rows.join("")}</ul>
    ${e.originText ? `<p class="env-note">${esc(t("env.maker_says"))} « ${esc(e.originText)} »</p>` : ""}
  </details>`;
}
async function loadEnv(p) {
  const box = $("envBox");
  if (!box || box.dataset.done) return;
  box.dataset.done = "1";
  let e = envCache.get(p.code);
  if (!e) {
    try { e = await off.environment(p.code); } catch { e = undefined; }
    if (e) envCache.set(p.code, e);
  }
  if (!sheetProduct || sheetProduct.code !== p.code || !$("envBox")) return;
  if (e === undefined) { box.dataset.done = ""; box.innerHTML = `<p class="notes">${esc(t("env.error"))}</p>`; return; }
  if (!e || (!e.known && e.production === null)) { box.innerHTML = `<p class="notes">${esc(t("env.none"))}</p>`; return; }
  const g = e.grade;
  const gsScale = e.known ? scaleHtml(GS_STEPS, GS_GRADES.indexOf(g), { label: `Green-Score ${g}`, cls: "scale-gs" }) : "";
  const head = e.known
    ? `<div class="gs-head"><span class="gs-badge gs-${g}">${g === "a-plus" ? "A+" : g.toUpperCase()}</span>
        <span><strong>Green-Score</strong><small>${esc(t(`env.grade.${g}`))}${e.score !== null ? ` · <span dir="ltr">${e.score}/100</span>` : ""}</small></span></div>`
    : "";
  const prodGauge = e.production !== null
    ? `<div class="gauge env-gauge" dir="ltr"><div class="gauge-bar">${[20, 20, 20, 20, 20].map((w, i) => `<i class="eg-${i}" style="width:${w}%"></i>`).join("")}<b class="gauge-mark" style="--x:${e.production}%"></b></div>
       <div class="gauge-labels">${[0, 20, 40, 60, 80, 100].map((x) => `<span style="left:${x}%">${x}</span>`).join("")}</div></div>` : "";
  // Origines : carte, drapeaux et origine de chaque ingrédient quand l'étiquette la donne
  const hasOrigin = e.origins.length || e.byIngredient.length || e.productOrigins.length;
  const world = hasOrigin ? await loadWorld() : null;
  if (!sheetProduct || sheetProduct.code !== p.code || !$("envBox")) return;
  const originsHtml = originBlock(e, world);
  const pack = e.packaging.length
    ? e.packaging.map((x) => esc([envWord("shape", x.shape), envWord("mat", x.material)].filter(Boolean).join(" · "))).join(", ")
    : esc(t("env.unknown"));
  box.innerHTML = `${head}${gsScale}
    <div class="env-rows">
      ${e.production !== null ? `<details class="nut-d" open><summary>${envRow(ENV_ICO.prod, t("env.production"), esc(t(e.production >= 60 ? "env.prod.low" : e.production >= 40 ? "env.prod.mid" : "env.prod.high")), `<span dir="ltr">${e.production}/100</span>`)}</summary>${prodGauge}
        ${benchHtml()}<p class="env-note">${esc(t("env.prod_note", { co2: fmt(e.co2 ?? 0), ref: e.reference || "—" }))}</p></details>` : ""}
      ${envRow(ENV_ICO.bio, t("env.organic"), esc(t(e.organic ? "env.organic.yes" : "env.organic.no")), okIco(e.organic))}
      ${envRow(ENV_ICO.palm, t("env.palm"), esc(t(`env.palm.${e.palm || "unknown"}`)), okIco(e.palm === "free" ? true : e.palm === "yes" ? false : null))}
      ${originsHtml}
      ${envRow(ENV_ICO.pack, t("env.packaging"), pack + (e.nonRecyclable ? ` · ${esc(t("env.non_recyclable"))}` : ""), e.packaging.length ? okIco(!e.nonRecyclable) : okIco(null))}
    </div>
    <p class="notes">${esc(t("env.source"))}</p>`;
  requestAnimationFrame(animateGauges);
}

async function loadTwins(p) {
  const box = $("twinBox");
  if (!box) return;
  box.hidden = false;
  box.innerHTML = `<p class="twins-t">${esc(t("twins.searching"))}</p>${altsSkeleton()}`;
  let list = [];
  try { list = await off.twins(p); } catch { /* recherche indisponible */ }
  if (!sheetProduct || sheetProduct.code !== p.code || !$("twinBox")) return;
  if (!list.length) { box.hidden = true; box.innerHTML = ""; return; }
  list.forEach((a) => memo.set(a.code, a));
  box.innerHTML = `<p class="twins-t">${esc(t("twins.t"))}</p><p class="twins-p">${esc(t("twins.p"))}</p><div class="alts">${list.map((a) => altCard(a)).join("")}</div>`;
}

// Pages des organismes où l'on peut vérifier un partenaire (seulement celles qui ont été vérifiées)
const CERT_LINKS = { AVS: "https://avs.fr/etablissements/index.html?category=fournisseurs" };
// Organismes dont la liste est comparée automatiquement (data/certified.json)
const CERT_LISTED = ["avs", "achahada", "hmc"];

// « Demander à la marque » : un message prêt à envoyer sur les ingrédients douteux
function askBrandMessage(p, v) {
  const doubts = v.flags.filter((f) => f.severity === "mashbouh" || f.severity === "haram").map((f) => flagLabel(f));
  return {
    subject: t("ask.subject", { name: nameOf(p) }),
    body: t("ask.body", { name: nameOf(p), brand: p.brand || "", code: p.code, list: doubts.map((d) => "- " + d).join("\n") }),
  };
}
function askBrand(p, v) {
  if (kindOf(p) === "medicine" || !/^\d+$/.test(p.code)) return "";
  if (!v.flags.some((f) => f.severity === "mashbouh" && !f.covered)) return "";
  const m = askBrandMessage(p, v);
  const mail = `mailto:?subject=${encodeURIComponent(m.subject)}&body=${encodeURIComponent(m.body)}`;
  const find = `https://duckduckgo.com/?q=${encodeURIComponent(`${p.brand || nameOf(p)} service consommateurs contact`)}`;
  return `<div class="ask">
    <strong>${t("ask.t")}</strong><p>${t("ask.p")}</p>
    <div class="ask-actions">
      <a class="btn btn-primary" href="${esc(mail)}">${svg('<path d="M4 6h16v12H4z"/><path d="M4 7l8 6 8-6"/>')}${t("ask.write")}</a>
      <button class="btn btn-soft" type="button" data-ask-copy>${t("ask.copy")}</button>
      <a class="btn btn-soft" href="${esc(find)}" target="_blank" rel="noopener">${t("ask.find")}</a>
    </div>
  </div>`;
}

// Jauge d'un nutriment : seuils officiels (feux tricolores de la FSA) et position du produit
function gaugeHtml(n) {
  if (!n.t) return "";
  const [a, b] = n.t;
  const top = Math.max(n.kind === "neg" ? b * 1.6 : b * 1.5, n.value * 1.05);
  const pct = (x) => Math.max(0, Math.min(100, (x / top) * 100));
  const segs = n.kind === "neg" ? ["g-good", "g-mid", "g-bad"] : ["g-low", "g-good", "g-best"];
  const r = (x) => fmt(x < 10 ? Math.round(x * 10) / 10 : Math.round(x));
  return `<div class="gauge" dir="ltr" role="img" aria-label="${esc(`${fmt(n.value)} ${n.unit} · ${r(a)} / ${r(b)}`)}">
    <div class="gauge-bar"><i class="${segs[0]}" style="width:${pct(a)}%"></i><i class="${segs[1]}" style="width:${pct(b) - pct(a)}%"></i><i class="${segs[2]}" style="width:${100 - pct(b)}%"></i>
      <b class="gauge-mark" style="--x:${pct(n.value)}%"></b></div>
    <div class="gauge-labels"><span style="left:0">0</span><span style="left:${pct(a)}%">${r(a)}</span><span style="left:${pct(b)}%">${r(b)}</span><span style="left:100%">${r(top)}</span></div>
  </div>`;
}
// Échelle officielle (Nutri-Score, NOVA, Green-Score, risque) : la case du produit est agrandie,
// et le même curseur que les jauges glisse jusqu'à elle
function scaleHtml(steps, index, { label = "", cls = "" } = {}) {
  if (index < 0) return "";
  const w = 100 / steps.length;
  return `<div class="gauge scale ${cls}" dir="ltr" role="img" aria-label="${esc(label)}">
    <div class="scale-row">${steps.map((st, i) => `<span class="scale-step${i === index ? " on" : ""}" style="--sc:${st.color}">${esc(st.label)}</span>`).join("")}</div>
    <b class="gauge-mark" style="--x:${w * index + w / 2}%"></b></div>`;
}
const NS_STEPS = [["A", "#038141"], ["B", "#85BB2F"], ["C", "#F6B800"], ["D", "#EE8100"], ["E", "#E63E11"]].map(([label, color]) => ({ label, color }));
const NOVA_STEPS = [["1", "#00AA00"], ["2", "#C8A800"], ["3", "#FF6600"], ["4", "#E60000"]].map(([label, color]) => ({ label, color }));
const GS_STEPS = [["A+", "#00703A"], ["A", "#1E8F4E"], ["B", "#4E9A0E"], ["C", "#D4A000"], ["D", "#E07020"], ["E", "#D3261F"], ["F", "#9E1A1A"]].map(([label, color]) => ({ label, color }));
// « Pourquoi cette note ? » : les 4 critères côte à côte, chacun rempli selon les points obtenus
function breakdownHtml(s) {
  const parts = [
    { id: "nutrition", got: s.parts.nutrition, max: 55, label: t("bd.nutrition") },
    { id: "additives", got: s.parts.additives, max: 25, label: t("bd.additives") },
    { id: "nova", got: s.parts.nova, max: 10, label: t("bd.nova") },
    { id: "bio", got: s.parts.bio, max: 10, label: t("bd.bio") },
  ];
  return `<div class="gauge breakdown" dir="ltr">
    <div class="bd-bar">${parts.map((x) => `<span class="bd-seg bd-${x.id}" style="flex:${x.max}"><i style="--f:${x.max ? x.got / x.max : 0}"></i></span>`).join("")}</div>
    <div class="bd-legend">${parts.map((x) => `<span class="bd-key bd-${x.id}"><b></b>${esc(x.label)} <strong>${x.got}</strong><small>/${x.max}</small></span>`).join("")}</div>
  </div>`;
}

function nutRow(n) {
  const textKey = n.id === "fiber" && n.value >= 6 ? "excellent" : n.level;
  return `<details class="nut-d lv-${n.level}"${n.t ? " open" : ""}><summary class="nut lv-${n.level}">
    <span class="nut-ico">${svg(I[n.id] || I.box)}</span>
    <span class="nut-text"><strong>${t(`nut.${n.id}`)}</strong><small>${t(`nut.${n.id}.${textKey}`)}</small></span>
    <span class="nut-val" dir="ltr">${fmt(n.value)} ${esc(n.unit)}<span class="dot"></span>${n.t ? svg(I.chev, "nut-chev") : ""}</span>
  </summary>${gaugeHtml(n)}</details>`;
}

function healthSection(p) {
  const h = healthOf(p);
  if (!h) return "";
  const s = h.score;
  const risky = h.additives.length;
  const neg = h.nutrition.negatives;
  const pos = h.nutrition.positives;
  const lead = s
    ? t(s.parts.novaKnown ? "detail.health_lead_html" : "detail.health_lead_nonova_html", { n: s.score, g: s.nutriscore.toUpperCase(), a: s.parts.nutrition, b: s.parts.additives, c: s.parts.bio, d: s.parts.nova })
    : esc(t("detail.health_none"));
  const list = (items) => `<div class="nut-list">${items.map(nutRow).join("")}</div>`;
  const addRow = (bad) =>
    `<div class="nut ${bad ? "lv-eleve" : "lv-bon"}"><span class="nut-ico">${svg(I.flask)}</span><span class="nut-text"><strong>${t("detail.additives")}</strong><small>${bad ? tn("detail.additives_risky", risky) : t("detail.additives_none")}</small></span><span class="nut-val">${bad ? risky : ""}<span class="dot"></span></span></div>`;
  const hasNut = neg.length || pos.length;
  return `<section class="sec"><div class="sec-head"><h3>${t("detail.health")}</h3><small>${t("detail.per", { u: t(h.nutrition.drink ? "unit.100ml" : "unit.100g") })}</small></div>
    <p class="lead">${lead}</p>
    ${s && s.parts.nutrition !== undefined ? breakdownHtml(s) : ""}
    ${s ? `<p class="scale-t">Nutri-Score</p>${scaleHtml(NS_STEPS, "abcde".indexOf(s.nutriscore), { label: `Nutri-Score ${s.nutriscore.toUpperCase()}`, cls: "scale-ns" })}` : ""}
    ${s && s.estimated ? `<p class="ns-est">${svg(I.bulb)}<span>${esc(t(s.estimated.saltMissing ? "detail.ns_estimated_nosalt" : "detail.ns_estimated"))}</span></p>` : ""}
    ${s && !p.ingredients && !(p.raw && (p.raw.additives_tags || []).length) ? `<p class="ns-est">${svg(I.bulb)}<span>${esc(t("detail.additives_unchecked"))}</span></p>` : ""}
    ${neg.length || risky ? `<p class="sub-label">${t("detail.defects")}</p>${list(neg)}${risky ? addRow(true) : ""}` : ""}
    ${pos.length || !risky ? `<p class="sub-label">${t("detail.qualities")}</p>${list(pos)}${!risky ? addRow(false) : ""}` : ""}
    ${!hasNut ? `<p class="notes">${t("detail.nut_missing")}</p>` : ""}
    ${s || hasNut ? sourceLine(["nutriscore", "fsa"]) : ""}
  </section>`;
}

// Cosmétiques : la note croise le danger de chaque ingrédient et l'exposition (type de produit)
const CTX_ORDER = ["rinse", "spray", "powder", "lip", "child"];
function cosmeticSection(p) {
  const h = healthOf(p);
  if (!h || !h.cosmetic) return "";
  const s = h.score;
  if (!s) return `<section class="sec"><div class="sec-head"><h3>${t("detail.cosmetic")}</h3></div><p class="notes">${t("detail.cosmetic_none")}</p></section>`;
  const all = h.risks || [];
  const risks = all.filter((r) => r.level);
  const safeHere = all.filter((r) => !r.level);
  const ctx = h.context || {};
  const ctxTags = [ctx.rinse ? "rinse" : "leave", ...CTX_ORDER.slice(1).filter((k) => ctx[k])]
    .map((k) => `<span class="ctx-tag">${esc(t(`cosm.ctx.${k}`))}</span>`).join("");
  const lead = risks.length
    ? t("detail.cosmetic_lead", { n: s.score, k: h.analyzed, e: s.parts.eleve, m: s.parts.modere, l: s.parts.limite })
    : t("detail.cosmetic_clean", { n: s.score, k: h.analyzed });
  const title = (r) => t(`cosm.${r.key}.t`);
  const rows = risks
    .map((r) => `<details class="risk"><summary><span class="risk-name"><span dir="ltr">${esc(r.name)}</span>${r.name.toLowerCase() === title(r).toLowerCase() ? "" : `<small>${esc(title(r))}</small>`}<span class="kind-tags">${r.kinds.map((k) => `<span class="kind-tag k-${k}">${esc(t(`cosm.kind.${k}`))}</span>`).join("")}</span></span><span class="pill r-${r.level}">${t(`risk.${r.level}`)}</span></summary>
      <p>${esc(t(`cosm.${r.key}.p`))}</p>
      ${r.dose ? `<p class="risk-dose">${esc(t(`cosm.dose.${r.dose}`))}</p>` : ""}
      <p class="risk-src">${sourceLine(r.sources)}</p></details>`)
    .join("");
  const safe = safeHere.length
    ? `<details class="risk risk-safe"><summary><span class="risk-name"><span>${esc(t("detail.cosmetic_safe_here", { n: safeHere.length }))}</span><small dir="ltr">${esc(safeHere.map((r) => r.name).join(", "))}</small></span></summary><p>${esc(t("detail.cosmetic_safe_here_p"))}</p></details>`
    : "";
  return `<section class="sec"><div class="sec-head"><h3>${t("detail.cosmetic")}</h3><small>${t("detail.cosmetic_sub")}</small></div>
    <p class="lead">${esc(lead)}</p>
    <div class="ctx-line"><span>${t("detail.cosmetic_ctx")}</span>${ctxTags}</div>
    ${risks.length ? `<p class="sub-label">${t("detail.cosmetic_watch")}</p><div class="risks">${rows}${safe}</div>` : `<div class="nut lv-bon"><span class="nut-ico">${svg(I.flask)}</span><span class="nut-text"><strong>${t("detail.cosmetic_ok_t")}</strong><small>${t("detail.cosmetic_ok_p")}</small></span><span class="nut-val"><span class="dot"></span></span></div>${safe ? `<div class="risks">${safe}</div>` : ""}`}
    <p class="notes">${t("detail.cosmetic_method")}</p>
  </section>`;
}

// Liste complète des ingrédients d'un cosmétique : rôle (CosIng) et niveau de risque dans ce produit
const fnLabel = (f) => {
  const k = "fn." + f.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
  return hasT(k) ? t(k) : f.charAt(0) + f.slice(1).toLowerCase();
};
// Rôles les plus parlants d'abord (CosIng les liste sans ordre) ; rôles secondaires à la fin
const FN_FIRST = ["PRESERVATIVE", "UV FILTER", "UV ABSORBER", "COLORANT", "HAIR DYEING", "SURFACTANT - CLEANSING", "SURFACTANT - EMULSIFYING",
  "SKIN CONDITIONING - EMOLLIENT", "SKIN CONDITIONING - HUMECTANT", "HUMECTANT", "PERFUMING", "ANTIOXIDANT", "ANTIPERSPIRANT", "DEODORANT",
  "EXFOLIATING", "SOLVENT", "VISCOSITY CONTROLLING", "FILM FORMING", "HAIR CONDITIONING", "SKIN CONDITIONING", "SKIN PROTECTING"];
const FN_LAST = ["DENATURANT", "FRAGRANCE", "ANTIFOAMING", "BUFFERING", "ORAL CARE", "ANTISTATIC", "BINDING", "BULKING", "NOT REPORTED"];
const fnRank = (f) => { const i = FN_FIRST.indexOf(f); return i >= 0 ? i : FN_LAST.includes(f) ? 900 + FN_LAST.indexOf(f) : 100; };
const sortFunctions = (list) => {
  const main = list.filter((f) => !FN_LAST.includes(f));
  return [...(main.length ? main : list)].sort((a, b) => fnRank(a) - fnRank(b));
};
function ingredientListSection(p) {
  const h = healthOf(p);
  const list = (h && h.ingredients) || [];
  if (!list.length || !h.coverage) return "";
  const rows = list.map((x) => {
    const cls = x.level ? `lv-${x.level}` : x.known ? "lv-ok" : "lv-unk";
    const fns = [...new Set(sortFunctions(x.functions).map(fnLabel))].slice(0, 3).join(" · ");
    const sub = fns || (x.known ? t("detail.ing_ok") : t("detail.ing_unknown"));
    const pill = x.level ? `<span class="pill r-${x.level}">${t(`risk.short.${x.level}`)}</span>` : "";
    return `<li class="ing ${cls}"><span class="ing-dot" aria-hidden="true"></span><span class="ing-text"><strong dir="ltr">${esc(x.name)}</strong><small>${esc(sub)}</small></span>${pill}</li>`;
  }).join("");
  const c = h.coverage;
  const low = c.total >= 4 && c.known / c.total < 0.7;
  return `<section class="sec"><details class="ingr-all"><summary><span>${t("detail.all_ingredients")}</span><small>${list.length}</small></summary>
    <p class="notes">${esc(t("detail.coverage", { k: c.known, n: c.total }))}${low ? ` ${esc(t("detail.coverage_low"))}` : ""}</p>
    <ul class="ing-list">${rows}</ul>
    <p class="notes">${t("detail.ing_legend")} ${sourceLine(["cosing"])}</p>
    ${p.ingredients ? `<details class="ingr ingr-raw"><summary>${t("detail.ingredients")}</summary><p>${esc(p.ingredients.replace(/_/g, ""))}</p></details>` : ""}
  </details></section>`;
}

const RISK_STEPS = () => [["none", "#3FB46B"], ["limite", "#D9B600"], ["modere", "#F0A23A"], ["eleve", "#E2533F"]].map(([k, color]) => ({ label: t(`risk.short.${k}`), color }));
const riskScale = (level) => scaleHtml(RISK_STEPS(), ["none", "limite", "modere", "eleve"].indexOf(level), { label: t(`risk.${level}`), cls: "scale-risk" });
function additivesSection(p) {
  const h = p.health;
  if (!h || !h.additives.length) return "";
  return `<section class="sec"><div class="sec-head"><h3>${t("detail.watch")}</h3><small>${h.additives.length}</small></div>
    <div class="risks">${h.additives
      .map(
        (a) => `<details class="risk"><summary><span>${esc(a.code)} · ${esc(t(`addname.${a.code.toLowerCase()}`))}</span><span class="pill r-${a.level}">${t(`risk.${a.level}`)}</span></summary>${riskScale(a.level)}<p>${esc(t(`risk.reason.${a.key}`))}</p><p class="risk-src">${sourceLine(RISK_SOURCES[a.key])}</p></details>`
      )
      .join("")}</div></section>`;
}

// Tous les additifs déclarés, avec leur statut halal (selon le réglage) et leur risque santé.
function allAdditivesSection(p, v) {
  if (!p.raw || p.local) return "";
  const keys = [...new Set((p.raw.additives_tags || []).map((tag) => String(tag).replace(/^\w+:/, "").toLowerCase()))]
    .filter((k) => /^e\d{3,4}[a-z]*$/.test(k));
  if (!keys.length) return `<section class="sec"><div class="sec-head"><h3>${t("detail.all_additives")}</h3></div><p class="notes">${t("detail.add_none")}</p></section>`;
  const baseOf = (k) => k.match(/^e\d+/)[0];
  // OFF donne aussi les sous-codes (E322 et E322i) : on garde le plus précis seulement s'il est seul
  const shown = keys.filter((k) => !(k === baseOf(k) && keys.some((o) => o !== k && baseOf(o) === k)));
  const rows = shown.map((k) => {
    const flag = v.flags.find((f) => f.id === k || f.id === baseOf(k));
    const risk = (p.health && p.health.additives || []).find((a) => a.code.toLowerCase() === k || a.code.toLowerCase() === baseOf(k));
    const pills = [
      flag ? `<span class="pill ${flag.severity === "haram" ? "s-haram" : flag.severity === "mashbouh" ? "s-mashbouh" : "r-info"}">${t("detail.halal")} · ${t(`sev.${flag.severity}`)}</span>` : "",
      risk ? `<span class="pill r-${risk.level}">${t(`risk.short.${risk.level}`)}</span>` : "",
    ].join("");
    const name = risk ? t(`addname.${risk.code.toLowerCase()}`) : flag ? flagLabel(flag).replace(/^E\w+ · /, "") : "";
    return `<div class="add-row"><span class="add-code" dir="ltr">${esc(k.toUpperCase())}</span><span class="add-row-name">${esc(name)}</span>${pills || `<span class="add-ok">${t("detail.add_ok")}</span>`}</div>`;
  });
  return `<section class="sec"><div class="sec-head"><h3>${t("detail.all_additives")}</h3><small>${shown.length}</small></div><div class="add-rows">${rows.join("")}</div></section>`;
}

// Lien de signalement prérempli (ticket GitHub du projet)
function reportLink(p, v) {
  if (!/^\d+$/.test(p.code)) return "";
  const st = prefs();
  const vars = { name: nameOf(p), code: p.code, status: S(v.status, "label"), school: t(`school.${st.school}`), url: p.offUrl || "" };
  const url = "https://github.com/agozel5/bayyin/issues/new?title=" + encodeURIComponent(t("report.title", vars)) + "&body=" + encodeURIComponent(t("report.body", vars));
  return `<a class="off-link muted-link" href="${esc(url)}" target="_blank" rel="noopener">${t("detail.report")}</a>`;
}

function extraSection(p) {
  const h = p.health;
  if (!h || p.local || h.cosmetic) return "";
  const tags = h.allergenTags || [];
  const allergens = tags.length
    ? `<div class="tags">${tags.map((a) => `<span class="tag">${esc(t(`allergen.${a}`))}</span>`).join("")}</div>`
    : (h.allergens || []).length
      ? `<div class="tags">${h.allergens.map((a) => `<span class="tag">${esc(a)}</span>`).join("")}</div>`
      : `<p class="notes">${t("detail.allergens_none")}</p>`;
  const nova = h.nova
    ? `${scaleHtml(NOVA_STEPS, h.nova.group - 1, { label: `NOVA ${h.nova.group}`, cls: "scale-nova" })}<div class="nova"><span class="nova-num nova-${h.nova.group}">${h.nova.group}</span><p><strong>${t(`nova.${h.nova.group}.t`)}</strong>${t(`nova.${h.nova.group}.p`)}</p></div>`
    : "";
  return `<section class="sec"><div class="sec-head"><h3>${t("detail.allergens")}</h3></div>${allergens}</section>
    ${nova ? `<section class="sec"><div class="sec-head"><h3>${t("detail.nova")}</h3><small>${t("detail.nova_sub")}</small></div>${nova}</section>` : ""}`;
}

function productDetail(p) {
  const v = verdictOf(p);
  const kind = kindOf(p);
  const ingrList = kind === "beauty" ? ingredientListSection(p) : "";
  // Aliments et médicaments : la liste est lue dans l'onglet Halal (« Ce que dit l'étiquette »)
  const ingr = ingrList || (kind === "beauty" && p.ingredients
    ? `<section class="sec"><details class="ingr"><summary>${t("detail.ingredients")}</summary><p>${esc(p.ingredients.replace(/_/g, ""))}</p></details></section>`
    : "");
  const isBarcode = /^\d+$/.test(p.code);
  const alt = p.local || kind === "medicine"
    ? ""
    : `<section class="sec" id="altSection"><div class="sec-head"><h3>${t("detail.alternatives")}</h3><small>${t(kind === "beauty" ? "detail.alt_sub_beauty" : "detail.alt_sub")}</small></div>
      <div id="altBox">${altsSkeleton()}</div></section>`;
  const offLink = p.local
    ? isBarcode
      ? `<section class="sec"><a class="off-link" href="https://world.openfoodfacts.org/cgi/product.pl?type=add&code=${esc(p.code)}" target="_blank" rel="noopener">${t("msg.add_off")}</a></section>`
      : ""
    : p.offUrl
      ? `<section class="sec"><a class="off-link" href="${esc(p.offUrl)}" target="_blank" rel="noopener">${t(kind === "medicine" ? "detail.med_link" : kind === "beauty" ? "detail.obf_link" : "detail.off_link")}</a></section>`
      : `<section class="sec"></section>`;
  const food = kind === "food";
  const top = `${productTop(p)}${contributeCard(p)}<div id="recallBox"></div>${verdictHero(p, v)}${profileAlert(p)}`;
  const foot = `${alt}${offLink.replace("</section>", reportLink(p, v) + "</section>")}`;
  if (kind === "medicine") return `${top}${halalSection(p, v)}${medicineSection(p)}${foot}`;
  // Le reste est rangé en onglets : on ne fait plus défiler toute la fiche pour trouver une information
  const s = scoreOf(p);
  const tabs = [
    { id: "halal", label: t("detail.halal"), mark: `<i class="tab-dot s-${v.status}"></i>`, html: halalSection(p, v) },
    { id: "health", label: t(food ? "detail.health" : "detail.cosmetic_tab"), mark: s ? `<i class="tab-score g-${s.grade}" dir="ltr">${s.score}</i>` : "",
      html: food ? healthSection(p) + additivesSection(p) + extraSection(p) : cosmeticSection(p) },
    { id: "compo", label: t("detail.compo_tab"), mark: "", html: (food ? allAdditivesSection(p, v) : "") + ingr },
    // Environnement : chargé à l'ouverture de l'onglet (aliments d'Open Food Facts seulement)
    ...(food && !p.local && isBarcode ? [{ id: "planet", label: t("env.tab"), mark: "", html: `<section class="sec" id="envBox">${rowsSkeleton(4)}</section>` }] : []),
  ].filter((x) => x.html.trim());
  const cur = tabs.some((x) => x.id === sheetTab) ? sheetTab : "halal";
  const bar = `<div class="ptabs" role="tablist">${tabs.map((x) =>
    `<button type="button" role="tab" class="ptab" data-ptab="${x.id}" aria-selected="${x.id === cur}" aria-controls="pp-${x.id}">${x.mark}<span>${esc(x.label)}</span></button>`).join("")}</div>`;
  const panels = tabs.map((x) => `<div class="ppanel" id="pp-${x.id}" role="tabpanel"${x.id === cur ? "" : " hidden"}>${x.html}</div>`).join("");
  return `${top}${bar}${panels}${foot}`;
}
// Onglet ouvert dans la fiche (gardé d'un produit à l'autre pendant la session)
let sheetTab = "halal";

// Mot clair à la place d'un « ! » : l'allergène en cause, ou le régime non respecté
function alertTag(p) {
  const pr = profileOf(p);
  if (!pr.alert) return "";
  const al = (x) => t(`allergen.${x}`);
  const word = pr.contains.length
    ? al(pr.contains[0]) + (pr.contains.length > 1 ? ` +${pr.contains.length - 1}` : "")
    : pr.diet
      ? t(`alert.tag.${pr.diet.id}.${pr.diet.level}`)
      : t("alert.tag.traces", { x: al(pr.traces[0]) });
  const full = pr.contains.length ? t("alert.contains", { list: pr.contains.map(al).join(", ") }) : t(`alert.${pr.alert}`);
  const who = pr.who ? ` · ${pr.who}` : "";
  return `<span class="alert-tag a-${pr.alert}" title="${esc(full + who)}">${svg(I.alert)}<span>${esc(word + who)}</span></span>`;
}

function altCard(a, { fav = false } = {}) {
  const img = a.image
    ? `<img src="${esc(a.image)}" alt="" loading="lazy" referrerpolicy="no-referrer">`
    : phArt(a, "alt-ph");
  const st = verdictOf(a).status;
  return `<button type="button" class="alt" data-open="${esc(a.code)}">
    <span class="alt-band s-${st}">${svg(STATUS_ICON[st])}<span>${esc(S(st, "label"))}</span>${fav ? svg(I.star, "alt-fav") : ""}</span>${img}
    <strong>${esc(nameOf(a))}</strong><small>${esc(a.brand || "")}</small>
    <span class="alt-tags">${miniScore(a)}${alertTag(a)}</span></button>`;
}

async function loadAlternatives(p, code) {
  if (!$("altBox")) return;
  try {
    const found = await off.alternatives(p);
    const alts = found.filter((a) => !profileOf(a).alert); // respecte le profil
    if (sheetCode !== code || !$("altBox")) return;
    alts.forEach((a) => memo.set(a.code, a));
    $("altBox").innerHTML = alts.length
      ? `<div class="alts">${alts.map(altCard).join("")}</div>`
      : found.best
        ? `<p class="alt-best">${svg(I.check)}<span>${t("detail.alt_best")}</span></p>`
        : "";
    // Rien à proposer : on n'affiche pas une section vide
    if (!alts.length && !found.best) $("altSection")?.remove();
  } catch {
    if (sheetCode === code) $("altSection")?.remove();
  }
}

// Squelettes pendant le chargement : la forme de ce qui arrive, plutôt qu'une roue qui tourne
const skeletonHtml = () => `<div class="skel" aria-busy="true" aria-label="${esc(t("msg.loading"))}">
  <div class="sk-row"><i style="width:118px;height:118px;border-radius:22px"></i><div style="flex:1;display:flex;flex-direction:column;gap:10px"><i style="height:22px;width:85%"></i><i style="height:16px;width:50%"></i><i style="height:12px;width:40%"></i></div></div>
  <i style="height:190px;border-radius:28px"></i>
  <i style="height:44px;border-radius:18px"></i>
  <i style="height:52px;border-radius:999px"></i>
  <i style="height:120px;border-radius:20px"></i></div>`;
const rowsSkeleton = (n = 4, label = t("msg.loading")) => `<div class="skel skel-rows" aria-busy="true" aria-label="${esc(label)}">${
  Array.from({ length: n }, () => `<div class="sk-row"><i style="width:56px;height:56px;border-radius:14px"></i><div style="flex:1;display:flex;flex-direction:column;gap:8px"><i style="height:15px;width:75%"></i><i style="height:12px;width:45%"></i></div></div>`).join("")}</div>`;
const altsSkeleton = () => `<div class="alts skel-alts" aria-busy="true" aria-label="${esc(t("detail.alt_loading"))}">${
  Array.from({ length: 3 }, () => `<div class="alt skel"><i style="height:22px;border-radius:8px"></i><i style="height:84px;border-radius:12px"></i><i style="height:14px;width:85%"></i><i style="height:12px;width:55%"></i></div>`).join("")}</div>`;
// Remplace le contenu d'un élément seulement s'il a changé ; la première fois, les lignes apparaissent
// en cascade, ensuite elles restent immobiles (class « settled »).
function setHtml(el, html) {
  if (!el || el.dataset.html === html) return;
  const first = el.dataset.html === undefined;
  el.dataset.html = html;
  el.innerHTML = html;
  el.classList.toggle("settled", !first);
}
// Pages vides : la mascotte de Bayyin, dans l'attitude qui convient
const emptyArt = (pose = "empty") => `<span class="empty-mascot">${mascot(pose, { size: 112 })}</span>`;
const loadingHtml = (text) => `<div class="loading"><span class="spinner"></span>${esc(text)}</div>`;
const messageHtml = (title, text, actions = "") =>
  `<div class="card-msg"><strong>${esc(title)}</strong><p>${esc(text)}</p>${actions ? `<div class="msg-actions">${actions}</div>` : ""}</div>`;
function errorText(err) {
  if (err instanceof OffError) {
    if (err.code === "network") return t(navigator.onLine === false ? "msg.offline_missing" : "msg.network");
    return t("msg.server");
  }
  return t("msg.unexpected");
}
const ocrButton = (code = "") =>
  `<label class="btn btn-primary" for="ocrInput" data-ocr-code="${esc(code)}">${svg(I.doc)}${t("detail.photo_ingredients")}</label>`;
const notFoundHtml = (code) => `<div class="nf-mascot">${mascot("search", { size: 104 })}</div>` + (
  isMedicineCode(code)
    ? messageHtml(t("msg.notfound.t"), t("msg.med_notfound", { code }))
    : messageHtml(t("msg.notfound.t"), t("msg.notfound.p", { code }), ocrButton(code) +
        `<a class="btn btn-soft" href="${esc(addUrl(code))}" target="_blank" rel="noopener">${t("contrib.web")}</a>`));

function rowHtml(p, { fav = false, when = "" } = {}) {
  const img = p.image
    ? `<img class="row-img" src="${esc(p.image)}" alt="" loading="lazy" referrerpolicy="no-referrer">`
    : phArt(p, "row-img");
  const meta = [kindOf(p) !== "food" ? t(`kind.${kindOf(p)}`) : "", p.brand, when].filter(Boolean).map(esc).join(" · ");
  return `<button type="button" class="row" data-open="${esc(p.code)}">${img}
    <span class="row-text"><span class="row-name">${esc(nameOf(p))}</span>
      ${meta ? `<span class="row-meta">${meta}</span>` : ""}
      <span class="row-tags">${statusPill(verdictOf(p).status)}${miniScore(p)}${alertPill(p)}${fav ? svg(I.star, "row-fav") : ""}</span>
    </span>${svg(I.chev, "row-chev flip")}</button>`;
}

// ===========================================================================
// Données : Open Food Facts, puis fiche complétée par photo, puis historique (hors ligne)
// ===========================================================================
const memo = new Map();
async function fetchProduct(code) {
  if (memo.has(code)) return memo.get(code);
  let p = null;
  let error = null;
  try {
    p = await off.product(code);
  } catch (err) {
    error = err;
  }
  const local = localProducts.get(code);
  if (local && (!p || !p.ingredients)) p = present(local, prefs());
  if (!p && error) {
    const saved = store.get(code);
    if (saved) p = saved.p;
    else throw error;
  }
  if (p) memo.set(code, p);
  return p;
}

// ===========================================================================
// Fiche produit (panneau plein écran)
// ===========================================================================
const sheet = $("sheet");
const cameraEl = $("camera");
let sheetCode = null;
let sheetProduct = null;

function refreshFav() {
  const e = sheetCode && store.get(sheetCode);
  const on = !!(e && e.fav);
  $("sheetFav").hidden = !sheetProduct;
  $("sheetFav").setAttribute("aria-pressed", String(on));
  $("sheetFav").setAttribute("aria-label", t(on ? "sheet.fav_remove" : "sheet.fav_add"));
}
const lockScroll = () => document.body.classList.toggle("no-scroll", !sheet.hidden || !cameraEl.hidden || !$("aisle").hidden);

let sheetCloseTimer = 0;
function showSheet({ replace = false, fromScan = false } = {}) {
  $("sheetFoot").hidden = !fromScan;
  clearTimeout(sheetCloseTimer);
  sheet.classList.remove("closing", "compact");
  sheet.style.transform = "";
  $("sheetMini").innerHTML = "";
  sheet.hidden = false;
  $("sheetBody").scrollTop = 0;
  if (replace) history.replaceState({ sheet: true }, "");
  else if (!(history.state && history.state.sheet)) history.pushState({ sheet: true }, "");
  lockScroll();
}

// Jauges animées à l'arrivée à l'écran : les segments se remplissent, puis le repère glisse jusqu'à la valeur
// (fiche : la fiche défile ; écrans : la page défile). Même chose pour les anneaux et barres (.viz).
const gaugeObservers = new Map();
function animateGauges(container) {
  if (!(container instanceof Element)) container = $("sheetBody"); // appelé aussi par requestAnimationFrame
  if (!container) return;
  const gauges = container.querySelectorAll(".gauge:not(.in), .viz:not(.in)");
  if (!gauges.length) return;
  if (!("IntersectionObserver" in window) || matchMedia("(prefers-reduced-motion: reduce)").matches) {
    gauges.forEach((g) => g.classList.add("in"));
    return;
  }
  const root = container.closest("#sheetBody") ? $("sheetBody") : null;
  const key = root ? "sheet" : "page";
  if (!gaugeObservers.has(key)) {
    const obs = new IntersectionObserver((entries) => {
      for (const en of entries) if (en.isIntersecting) { en.target.classList.add("in"); obs.unobserve(en.target); }
    }, { root, threshold: 0.5 });
    gaugeObservers.set(key, obs);
  }
  gauges.forEach((g) => gaugeObservers.get(key).observe(g));
}
// Photo de produit qui ne se charge pas. Réseau instable (4G qui décroche) : on réessaie tout seul
// (après 1,5 s puis 5 s), avec un fond animé en attendant ; ensuite un pictogramme discret remplace
// l'icône d'image cassée, et les photos manquantes sont rechargées dès que la connexion revient.
const IMG_FALLBACK = "data:image/svg+xml," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect width="24" height="24" fill="#EEF1EE"/><path d="M7 9l5-2.5L17 9v6l-5 2.5L7 15z M7 9l5 2.5L17 9 M12 11.5v6" fill="none" stroke="#9AA59F" stroke-width="1.2" stroke-linejoin="round"/></svg>');
const IMG_RETRY = [1500, 5000];
const IMG_BLANK = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
const withTry = (url, n) => url + (url.includes("?") ? "&" : "?") + "r=" + n;
function reloadImg(img) {
  if (!img.isConnected || !img.dataset.orig) return;
  const n = Number(img.dataset.tries || 0) + 1;
  img.dataset.tries = String(n);
  img.classList.add("img-wait");
  img.src = withTry(img.dataset.orig, n);
}
document.addEventListener("error", (e) => {
  const img = e.target;
  if (!(img instanceof HTMLImageElement) || img.id === "lbImg" || img.src.startsWith("data:") || img.src.startsWith("blob:")) return;
  if (!img.dataset.orig) img.dataset.orig = img.src;
  const n = Number(img.dataset.tries || 0);
  if (n < IMG_RETRY.length && navigator.onLine !== false) {
    img.classList.add("img-wait");
    img.src = IMG_BLANK; // pas d'icône d'image cassée pendant l'attente : un fond animé à la place
    setTimeout(() => reloadImg(img), IMG_RETRY[n]);
    return;
  }
  img.classList.remove("img-wait");
  img.dataset.fallback = "1";
  img.src = IMG_FALLBACK;
}, true);
document.addEventListener("load", (e) => {
  const img = e.target;
  if (img instanceof HTMLImageElement && img.classList.contains("img-wait") && !img.src.startsWith("data:")) img.classList.remove("img-wait");
}, true);
// Connexion retrouvée (ou retour dans l'app) : nouvel essai pour les photos restées manquantes
function retryMissingImages() {
  if (navigator.onLine === false) return;
  document.querySelectorAll("img[data-fallback][data-orig]").forEach((img) => {
    const rounds = Number(img.dataset.rounds || 0) + 1;
    if (rounds > 6) return; // photo vraiment introuvable : on arrête d'insister
    img.dataset.rounds = String(rounds);
    delete img.dataset.fallback;
    img.dataset.tries = String(IMG_RETRY.length - 1); // un seul essai de plus, sans boucle
    reloadImg(img);
  });
}
window.addEventListener("online", retryMissingImages);
document.addEventListener("visibilitychange", () => { if (!document.hidden) retryMissingImages(); });
setInterval(() => { if (!document.hidden) retryMissingImages(); }, 30000);

// Une rangée qu'on déplie rejoue l'animation de sa jauge
document.addEventListener("toggle", (e) => {
  const d = e.target;
  if (!(d instanceof HTMLDetailsElement) || !(d.closest("#sheetBody") || d.classList.contains("ae"))) return;
  // Le premier « toggle » vient de l'affichage d'une rangée déjà ouverte : rien à rejouer
  if (!d.dataset.seen && !d.classList.contains("ae")) { d.dataset.seen = "1"; if (d.hasAttribute("open")) return; }
  if (!d.open) return;
  const g = d.querySelector(".gauge");
  if (!g) return;
  g.classList.remove("in");
  requestAnimationFrame(() => requestAnimationFrame(() => g.classList.add("in")));
}, true);

// En-tête compact : quand le grand bandeau du verdict sort de l'écran, la réponse reste visible en haut
let heroObserver = null;
function sheetMiniHtml(p) {
  const st = verdictOf(p).status;
  const s = scoreOf(p);
  const img = p.image ? `<img src="${esc(p.image)}" alt="" referrerpolicy="no-referrer">` : "";
  return `${img}<span class="mini-st s-${st}">${svg(STATUS_ICON[st])}</span>${s ? `<span class="mini-sc g-${s.grade}" dir="ltr">${s.score}</span>` : ""}`;
}
// Écrans de la fiche qui ne sont pas un produit (comparaison, Premium, panier) : pas d'en-tête compact
function resetSheetHeader() {
  if (heroObserver) heroObserver.disconnect();
  sheet.classList.remove("compact");
  $("sheetMini").innerHTML = "";
}
function watchHero() {
  const hero = $("sheetBody").querySelector(".verdict");
  if (!("IntersectionObserver" in window)) return;
  if (!heroObserver) {
    heroObserver = new IntersectionObserver(([en]) => sheet.classList.toggle("compact", !en.isIntersecting && en.boundingClientRect.top < 80),
      { root: $("sheetBody"), threshold: 0, rootMargin: "-40px 0px 0px 0px" });
  }
  heroObserver.disconnect();
  sheet.classList.remove("compact");
  if (hero) heroObserver.observe(hero);
}

// La note du bandeau compte de 0 jusqu'à sa valeur, au rythme de l'anneau qui se remplit
function countUp(el, to, ms = 900) {
  if (!el || REDUCED()) return;
  const t0 = performance.now() + 250; // même départ que l'anneau
  const tick = (now) => {
    const k = Math.min(1, Math.max(0, (now - t0) / ms));
    el.firstChild.nodeValue = String(Math.round(to * (1 - Math.pow(1 - k, 3))));
    if (k < 1) requestAnimationFrame(tick);
  };
  el.firstChild.nodeValue = "0";
  requestAnimationFrame(tick);
}
function renderSheetProduct(p) {
  sheetProduct = p;
  $("sheetTitle").textContent = nameOf(p);
  $("sheetBody").innerHTML = productDetail(p);
  $("sheetMini").innerHTML = sheetMiniHtml(p);
  watchHero();
  const sc = scoreOf(p);
  if (sc) countUp($("sheetBody").querySelector(".v-foot .ring > span"), sc.score);
  $("sheetCompare").hidden = kindOf(p) === "medicine";
  $("sheetShare").hidden = false;
  refreshFav();
  loadRecalls(p);
  loadCertCheck(p);
  loadTwins(p);
  requestAnimationFrame(animateGauges);
  if (sheetTab === "planet") loadEnv(p);
  if (!prefs().sheetTourDone && !DEMO) setTimeout(startSheetTour, 900);
}

// ===========================================================================
// Visionneuse de photos : en grand, zoom (pincer, double-toucher, molette), glisser pour changer ou fermer
// ===========================================================================
// Version la plus grande d'une photo Open Food Facts (…/front_fr.12.200.jpg -> …/front_fr.12.full.jpg)
const fullPhoto = (u) => String(u || "").replace(/\.(100|200|400)\.jpg$/, ".full.jpg");
function productPhotos(p) {
  const list = (p.photos && p.photos.length ? p.photos : p.image ? [{ k: "front", u: p.image }] : []);
  return list.map((x) => ({ k: x.k, small: x.u, big: fullPhoto(x.u) }));
}
const lb = { el: null, photos: [], i: 0, s: 1, x: 0, y: 0, pts: new Map(), start: null };
function lbBuild() {
  if (lb.el) return lb.el;
  const el = document.createElement("div");
  el.className = "lightbox";
  el.id = "lightbox";
  el.hidden = true;
  el.setAttribute("role", "dialog");
  el.setAttribute("aria-modal", "true");
  el.innerHTML = `<div class="lb-top"><span class="lb-title" id="lbTitle"></span>
      <button type="button" class="lb-close" id="lbClose">${svg(I.cross)}</button></div>
    <div class="lb-stage" id="lbStage"><img id="lbImg" alt="" referrerpolicy="no-referrer" draggable="false"><span class="spinner lb-spin" id="lbSpin"></span></div>
    <button type="button" class="lb-nav lb-prev" id="lbPrev">${svg('<path d="M15 6l-6 6 6 6"/>', "flip")}</button>
    <button type="button" class="lb-nav lb-next" id="lbNext">${svg(I.chev, "flip")}</button>
    <div class="lb-foot"><div class="lb-dots" id="lbDots"></div><p class="lb-hint">${esc(t("zoom.hint"))}</p></div>`;
  document.body.appendChild(el);
  lb.el = el;
  $("lbClose").addEventListener("click", () => closeLightbox());
  $("lbPrev").addEventListener("click", () => lbGo(lb.i - 1));
  $("lbNext").addEventListener("click", () => lbGo(lb.i + 1));
  $("lbDots").addEventListener("click", (e) => { const b = e.target.closest("[data-i]"); if (b) lbGo(+b.dataset.i); });
  const stage = $("lbStage");
  stage.addEventListener("pointerdown", lbDown);
  stage.addEventListener("pointermove", lbMove);
  stage.addEventListener("pointerup", lbUp);
  stage.addEventListener("pointercancel", lbUp);
  stage.addEventListener("dblclick", (e) => lbZoomAt(e.clientX, e.clientY, lb.s > 1 ? 1 : 2.5));
  stage.addEventListener("wheel", (e) => { e.preventDefault(); lbZoomAt(e.clientX, e.clientY, lb.s * (e.deltaY < 0 ? 1.15 : 1 / 1.15)); }, { passive: false });
  return el;
}
function lbApply(anim = false) {
  const img = $("lbImg");
  img.style.transition = anim ? "transform .25s ease" : "none";
  img.style.transform = `translate(${lb.x}px, ${lb.y}px) scale(${lb.s})`;
  lb.el.classList.toggle("zoomed", lb.s > 1.01);
}
// Garde l'image dans le cadre : pas de bords vides quand on a zoomé
function lbClamp() {
  lb.s = Math.min(5, Math.max(1, lb.s));
  const img = $("lbImg");
  const mx = Math.max(0, (img.offsetWidth * lb.s - img.offsetWidth) / 2);
  const my = Math.max(0, (img.offsetHeight * lb.s - img.offsetHeight) / 2);
  lb.x = Math.min(mx, Math.max(-mx, lb.x));
  lb.y = Math.min(my, Math.max(-my, lb.y));
  if (lb.s === 1) lb.x = lb.y = 0;
}
function lbZoomAt(cx, cy, s) {
  const r = $("lbStage").getBoundingClientRect();
  const ox = cx - (r.left + r.width / 2), oy = cy - (r.top + r.height / 2);
  const k = Math.min(5, Math.max(1, s)) / lb.s;
  lb.x = ox - (ox - lb.x) * k;
  lb.y = oy - (oy - lb.y) * k;
  lb.s *= k;
  lbClamp();
  lbApply(true);
}
let lbTap = 0;
function lbDown(e) {
  $("lbStage").setPointerCapture(e.pointerId);
  lb.pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (lb.pts.size === 1) {
    // Double toucher (doigt) : zoom / dézoom à l'endroit touché
    if (e.pointerType !== "mouse" && Date.now() - lbTap < 300) { lbZoomAt(e.clientX, e.clientY, lb.s > 1 ? 1 : 2.5); lbTap = 0; lb.start = null; return; }
    lbTap = Date.now();
  }
  const [a, b] = [...lb.pts.values()];
  lb.start = { x: lb.x, y: lb.y, s: lb.s, ax: a.x, ay: a.y, d: b ? Math.hypot(b.x - a.x, b.y - a.y) : 0, mx: b ? (a.x + b.x) / 2 : a.x, my: b ? (a.y + b.y) / 2 : a.y };
}
function lbMove(e) {
  if (!lb.pts.has(e.pointerId) || !lb.start) return;
  lb.pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
  const [a, b] = [...lb.pts.values()];
  const st = lb.start;
  if (b && st.d) { // pincer
    const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    lb.s = Math.min(5, Math.max(1, st.s * Math.hypot(b.x - a.x, b.y - a.y) / st.d));
    lb.x = st.x + (mx - st.mx);
    lb.y = st.y + (my - st.my);
    lbClamp();
    return lbApply();
  }
  const dx = a.x - st.ax, dy = a.y - st.ay;
  if (lb.s > 1) { lb.x = st.x + dx; lb.y = st.y + dy; lbClamp(); return lbApply(); }
  // Pas de zoom : glisser sur le côté (photo suivante) ou vers le bas (fermer)
  $("lbImg").style.transition = "none";
  $("lbImg").style.transform = Math.abs(dy) > Math.abs(dx) && dy > 0 ? `translateY(${dy}px)` : `translateX(${dx}px)`;
  lb.el.style.setProperty("--lb-fade", Math.abs(dy) > Math.abs(dx) && dy > 0 ? String(Math.max(0.3, 1 - dy / 400)) : "1");
}
function lbUp(e) {
  if (!lb.pts.has(e.pointerId)) return;
  const p = lb.pts.get(e.pointerId);
  lb.pts.delete(e.pointerId);
  const st = lb.start;
  if (lb.pts.size) { const [a] = [...lb.pts.values()]; lb.start = { x: lb.x, y: lb.y, s: lb.s, ax: a.x, ay: a.y, d: 0 }; return; }
  lb.start = null;
  lb.el.style.setProperty("--lb-fade", "1");
  if (!st || lb.s > 1.01 || st.d) { if (lb.s < 1.01) { lb.s = 1; lbClamp(); } return lbApply(true); }
  const dx = p.x - st.ax, dy = p.y - st.ay;
  if (dy > 110 && Math.abs(dy) > Math.abs(dx)) return closeLightbox();
  const rtl = document.documentElement.dir === "rtl";
  if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy)) return lbGo(lb.i + ((dx < 0) !== rtl ? 1 : -1));
  lbApply(true);
}
function lbGo(i) {
  if (!lb.photos.length) return;
  lb.i = (i + lb.photos.length) % lb.photos.length;
  lb.s = 1; lb.x = lb.y = 0;
  const ph = lb.photos[lb.i];
  const img = $("lbImg");
  img.src = ph.small; // affichée tout de suite, remplacée par la grande dès qu'elle est chargée
  $("lbSpin").hidden = false;
  const big = new Image();
  big.referrerPolicy = "no-referrer";
  big.onload = () => { if (lb.photos[lb.i] === ph) { img.src = ph.big; $("lbSpin").hidden = true; } };
  big.onerror = () => { $("lbSpin").hidden = true; };
  big.src = ph.big;
  $("lbTitle").textContent = t(`zoom.${ph.k}`);
  const many = lb.photos.length > 1;
  $("lbPrev").hidden = $("lbNext").hidden = !many;
  $("lbDots").innerHTML = many ? lb.photos.map((x, j) => `<button type="button" data-i="${j}" class="${j === lb.i ? "on" : ""}" aria-label="${esc(t(`zoom.${x.k}`))}"></button>`).join("") : "";
  lbApply(true);
}
function openLightbox(p, i = 0) {
  const photos = productPhotos(p);
  if (!photos.length) return;
  lbBuild();
  lb.photos = photos;
  lb.el.hidden = false;
  $("lbClose").setAttribute("aria-label", t("zoom.close"));
  $("lbPrev").setAttribute("aria-label", t("zoom.prev"));
  $("lbNext").setAttribute("aria-label", t("zoom.next"));
  lbGo(i);
  history.pushState({ ...(history.state || {}), lb: true }, "");
  $("lbClose").focus();
}
function closeLightbox({ fromPop = false } = {}) {
  if (!lb.el || lb.el.hidden) return;
  lb.el.hidden = true;
  lb.pts.clear();
  $("lbImg").removeAttribute("src");
  if (!fromPop && history.state && history.state.lb) history.back();
}
$("sheetBody").addEventListener("click", (e) => {
  if (e.target.closest("[data-zoom]") && sheetProduct) return openLightbox(sheetProduct);
  const z = e.target.closest("[data-zoom-code]");
  if (z && cmpProducts[z.dataset.zoomCode]) openLightbox(cmpProducts[z.dataset.zoomCode]);
});

// ===========================================================================
// Rappels de produits (RappelConso)
// ===========================================================================
const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : "");
const longDate = (d) => new Date(d + "T12:00:00").toLocaleDateString(locale(), { day: "numeric", month: "long", year: "numeric" });
function recallHtml(list) {
  const f = list[0];
  const on = isActive(f);
  const row = (k, v) => (v ? `<div><dt>${t(k)}</dt><dd>${esc(cap(v))}</dd></div>` : "");
  return `<section class="recall ${on ? "on" : "off"}" role="alert">
    <div class="recall-top">${svg(I.alert)}<div><strong>${t(on ? "recall.t" : "recall.t_old")}</strong><small>${esc(t("recall.date", { d: longDate(f.d) }))}</small></div></div>
    <p class="recall-name">${esc(cap(f.n))}${f.b ? ` · ${esc(cap(f.b))}` : ""}</p>
    <dl>${row("recall.motif", f.m)}${row("recall.risk", f.r)}${row("recall.todo", f.a)}</dl>
    <p class="recall-lot">${t("recall.lot")}</p>
    ${f.u ? `<a class="recall-link" href="${esc(f.u)}" target="_blank" rel="noopener">${t("recall.link")} ↗</a>` : ""}
    ${list.length > 1 ? `<p class="recall-more">${esc(tn("recall.more", list.length - 1))}</p>` : ""}
  </section>`;
}
// Certification vérifiée : le label est comparé à la liste publiée par l'organisme
async function loadCertCheck(p) {
  const c = p.verdict && p.verdict.certification;
  if (!c || !c.organismeId || p.verdict.certIgnored || !CERT_LISTED.includes(c.organismeId)) return;
  const db = await loadCertified();
  if (!sheetProduct || sheetProduct.code !== p.code || !$("certCard")) return;
  const r = verifyCertification(p, db, c.organismeId);
  const card = $("certCard");
  if (!r) { // liste indisponible (hors connexion) : on garde le lien de vérification manuelle
    card.removeAttribute("data-state");
    $("certBadge").innerHTML = "";
    $("certCheck").querySelector(".cert-note").firstChild.textContent = t("cert.unverified") + " ";
    return;
  }
  const date = r.updated ? longDate(r.updated) : "";
  const vars = { org: c.organisme, date, match: r.match ? `\u2066${r.match}\u2069` : "" }; // isolé : lisible aussi en arabe
  const link = r.url ? ` <a href="${esc(r.url)}" target="_blank" rel="noopener">${t("certv.list", { org: c.organisme })} ↗</a>` : "";
  const state = r.status === "stamp" ? "verified" : r.status === "brand" ? "listed" : "missing";
  card.dataset.state = state;
  $("certBadge").innerHTML = `${state === "missing" ? "" : svg(I.check)}${esc(t(`certv.badge.${state}`))}`;
  const text = r.status === "missing" ? t("certv.missing", vars) : t(r.status === "stamp" ? "certv.ok_stamp" : "certv.ok_brand", vars);
  $("certCheck").innerHTML = `<p class="cert-note">${esc(text)}${link}</p>`;
}

async function loadRecalls(p) {
  if (kindOf(p) === "medicine" || !/^\d{8,14}$/.test(p.code)) return;
  const list = await recallsFor(p.code);
  if (!list.length || !sheetProduct || sheetProduct.code !== p.code || !$("recallBox")) return;
  $("recallBox").innerHTML = recallHtml(list);
  if (isActive(list[0]) && navigator.vibrate) navigator.vibrate([80, 60, 80]);
}

// Surveillance de l'historique : les rappels des 90 derniers jours comparés aux produits déjà scannés
const RECALL_SEEN = "bayyin_recall_seen";
const RECALL_CHECK = "bayyin_recall_check";
let recallHits = [];
const readJson = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const writeJson = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* stockage indisponible */ } };
async function checkRecallWatch({ force = false } = {}) {
  const codes = store.all().map((e) => e.code).filter((c) => /^\d{8,14}$/.test(c));
  if (!codes.length) return;
  // Au plus une vérification toutes les 6 heures ; entre deux, on garde le dernier résultat
  const last = readJson(RECALL_CHECK, null);
  let hits = last && last.hits;
  if (force || !last || Date.now() - last.at > 6 * 3600e3 || last.n !== codes.length) {
    try {
      hits = matchRecent(await recentRecalls(), codes).map((h) => ({ code: h.code, fiche: h.fiche }));
      writeJson(RECALL_CHECK, { at: Date.now(), n: codes.length, hits });
    } catch { /* hors connexion : dernier résultat connu */ }
  }
  const seen = new Set(readJson(RECALL_SEEN, []));
  // Un produit peut avoir plusieurs fiches de rappel : on garde la plus récente
  const byCode = new Map();
  for (const h of hits || []) if (isActive(h.fiche) && !seen.has(`${h.code}:${h.fiche.id}`) && !byCode.has(h.code)) byCode.set(h.code, h);
  recallHits = [...byCode.values()];
  renderRecallBanner();
}
function renderRecallBanner() {
  const box = $("homeRecall");
  if (!box) return;
  box.hidden = !recallHits.length;
  if (!recallHits.length) return;
  const h = recallHits[0];
  const e = store.get(h.code);
  const name = e ? nameOf(e.p) : cap(h.fiche.n);
  box.innerHTML = `<button type="button" class="recall-banner-main" data-open="${esc(h.code)}">${svg(I.alert)}
      <span><strong>${esc(tn("recall.home", recallHits.length))}</strong><small>${esc(t("recall.home_p", { name, d: longDate(h.fiche.d) }))}</small></span>${svg(I.chev, "flip")}</button>
    <button type="button" class="tip-close" data-recall-dismiss aria-label="${esc(t("recall.dismiss"))}">${svg(I.cross)}</button>`;
}
$("homeRecall").addEventListener("click", (e) => {
  if (!e.target.closest("[data-recall-dismiss]")) return;
  const seen = readJson(RECALL_SEEN, []);
  const codes = new Set(recallHits.map((h) => h.code));
  (readJson(RECALL_CHECK, {}).hits || []).filter((h) => codes.has(h.code)).forEach((h) => seen.push(`${h.code}:${h.fiche.id}`));
  writeJson(RECALL_SEEN, seen.slice(-300));
  recallHits = [];
  renderRecallBanner();
});

// Petit retour au toucher, comme sur les applis natives (Android ; Safari l'ignore)
function tapHaptic(ms = 8) {
  try { if (navigator.vibrate) navigator.vibrate(ms); } catch { /* refusé par le navigateur */ }
}
// Vibration différente selon le verdict : on « sent » la réponse avant de la lire
const HAPTIC = { halal_certifie: [35], halal_probable: [35], mashbouh: [50, 70, 50], haram: [140, 70, 140], inconnu: [20] };
function verdictHaptic(p) {
  if (!navigator.vibrate) return;
  const al = profileOf(p).alert;
  navigator.vibrate(al === "no" ? HAPTIC.haram : HAPTIC[verdictOf(p).status] || [30]);
}
// Fiche sans liste d'ingrédients, gardée avant que l'app lise les listes en d'autres langues
// (allemand, espagnol…) : rechargée, la liste existe peut-être dans une autre langue
const listStale = (p) => !!p && !p.ingredients && !p.local && kindOf(p) === "food" && /^\d+$/.test(p.code) && !!p.raw && !("lang" in p.raw);
// Fiches de l'historique notées avec une ancienne méthode : rechargées discrètement, une par une
async function refreshStaleHistory() {
  if (navigator.onLine === false) return;
  const stale = store.all().filter((e) => (healthStale(e.p) && !(e.p.raw && e.p.raw.nutriments)) || listStale(e.p)).slice(0, 40);
  const fresh = [];
  for (const e of stale) {
    try {
      const p = await off.product(e.code);
      if (p) { memo.set(p.code, p); fresh.push(p); }
    } catch { break; } // réseau indisponible : on garde ce qui est déjà rechargé
    await new Promise((r) => setTimeout(r, 400));
  }
  // Une seule mise à jour de l'historique, donc un seul nouvel affichage
  if (fresh.length) store.refreshMany(fresh);
}
setTimeout(refreshStaleHistory, 4000);

async function openSheet(code, { fromScan = false, replace = false, revealed = false } = {}) {
  if (fromScan) sheetTab = "halal";
  sheetCode = code;
  sheetProduct = null;
  const cached = memo.get(code) || (store.get(code) && store.get(code).p);
  // Les très anciennes entrées n'ont pas de données santé ; une note d'une ancienne méthode est rechargée
  if (cached) healthOf(cached); // recalcul sur place quand la fiche gardée le permet
  const fresh = cached && cached.health && ((!healthStale(cached) && !listStale(cached)) || navigator.onLine === false);
  $("sheetTitle").textContent = cached ? nameOf(cached) : t("sheet.title");
  $("sheetBody").innerHTML = skeletonHtml();
  showSheet({ replace, fromScan });
  refreshFav();

  if (fresh) {
    renderSheetProduct(cached);
    if (fromScan) { if (!revealed) verdictHaptic(cached); verdictBurst(); }
    if (fromScan || !store.get(code)) store.add(cached);
    refreshFav();
    if (!cached.local) loadAlternatives(cached, code);
    return;
  }
  try {
    const p = await fetchProduct(code);
    if (sheetCode !== code) return;
    if (!p) {
      $("sheetTitle").textContent = t("msg.notfound.t");
      $("sheetBody").innerHTML = notFoundHtml(code);
      return;
    }
    renderSheetProduct(p);
    if (fromScan) { if (!revealed) verdictHaptic(p); verdictBurst(); }
    store.add(p);
    refreshFav();
    if (!p.local) loadAlternatives(p, code);
  } catch (err) {
    if (sheetCode !== code) return;
    $("sheetBody").innerHTML = messageHtml(t("msg.load_error.t"), errorText(err),
      `<button class="btn btn-primary" type="button" data-open="${esc(code)}">${t("msg.retry")}</button>${ocrButton(code)}`);
  }
}

const REDUCED = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
// Fiche ouverte juste après un scan : le verdict « s'allume » d'une onde à sa couleur
function verdictBurst() {
  if (REDUCED()) return;
  const v = $("sheetBody").querySelector(".verdict");
  if (v) v.classList.add("scanned");
}
function closeSheet({ fromPop = false } = {}) {
  if (sheet.hidden || sheet.classList.contains("closing")) return;
  if (isSheetTour() && tourStep >= 0) endTour();
  if (REDUCED()) sheet.hidden = true;
  else {
    sheet.classList.add("closing");
    sheetCloseTimer = setTimeout(() => { sheet.hidden = true; sheet.classList.remove("closing"); sheet.style.transform = ""; lockScroll(); }, 230);
  }
  sheetCode = null;
  sheetProduct = null;
  lockScroll();
  if (!fromPop && history.state && history.state.sheet) history.back();
}

$("sheetBody").addEventListener("click", (e) => {
  const b = e.target.closest("[data-ptab]");
  if (!b) return;
  // Le contenu glisse dans le sens de l'onglet choisi
  const order = [...b.parentElement.children].map((x) => x.dataset.ptab);
  const dir = order.indexOf(b.dataset.ptab) > order.indexOf(sheetTab) ? "next" : "prev";
  sheetTab = b.dataset.ptab;
  const panel = document.getElementById(`pp-${sheetTab}`);
  if (panel) { panel.classList.remove("from-next", "from-prev"); void panel.offsetWidth; panel.classList.add(`from-${dir}`); }
  if (sheetTab === "planet" && sheetProduct) loadEnv(sheetProduct);
  requestAnimationFrame(animateGauges);
  document.querySelectorAll("#sheetBody .ptab").forEach((x) => x.setAttribute("aria-selected", String(x === b)));
  document.querySelectorAll("#sheetBody .ppanel").forEach((x) => (x.hidden = x.id !== `pp-${sheetTab}`));
  // Garde la barre d'onglets visible en haut si on avait défilé plus bas
  const body = $("sheetBody");
  const barTop = b.parentElement.offsetTop - 8;
  if (body.scrollTop > barTop) body.scrollTop = barTop;
});
$("sheetClose").addEventListener("click", () => closeSheet());
// Tirer la fiche vers le bas (depuis l'en-tête, ou depuis le haut du contenu) la ferme
(() => {
  let y0 = null, x0 = 0, dy = 0, t0 = 0, active = false;
  sheet.addEventListener("touchstart", (e) => {
    if (e.touches.length !== 1 || sheet.classList.contains("closing")) return;
    const inBar = e.target.closest(".sheet-bar, .sheet-grab");
    const atTop = $("sheetBody").scrollTop <= 0 && e.target.closest("#sheetBody") && !e.target.closest(".alts, .ptabs, .gauge, input, textarea");
    if (!inBar && !atTop) return;
    y0 = e.touches[0].clientY; x0 = e.touches[0].clientX; dy = 0; t0 = Date.now(); active = false;
  }, { passive: true });
  sheet.addEventListener("touchmove", (e) => {
    if (y0 === null) return;
    const ny = e.touches[0].clientY - y0, nx = e.touches[0].clientX - x0;
    if (!active) {
      if (Math.abs(ny) < 8) return;
      if (ny < 0 || Math.abs(nx) > Math.abs(ny)) { y0 = null; return; } // vers le haut ou de côté : défilement normal
      active = true;
      sheet.classList.add("dragging");
    }
    dy = Math.max(0, ny);
    sheet.style.transform = `translateY(${dy}px)`;
    if (e.cancelable) e.preventDefault();
  }, { passive: false });
  const end = () => {
    if (y0 === null) return;
    y0 = null;
    sheet.classList.remove("dragging");
    if (!active) return;
    const fast = dy / Math.max(1, Date.now() - t0) > 0.6;
    if (dy > 120 || (fast && dy > 40)) { sheet.style.transform = `translateY(${dy}px)`; closeSheet(); }
    else sheet.style.transform = "";
  };
  sheet.addEventListener("touchend", end);
  sheet.addEventListener("touchcancel", end);
})();
$("sheetFav").addEventListener("click", () => {
  if (!sheetCode || !sheetProduct) return;
  if (!store.get(sheetCode)) store.add(sheetProduct);
  const on = store.toggleFav(sheetCode);
  refreshFav();
  // Petit « pop » de l'étoile
  const fav = $("sheetFav");
  fav.classList.remove("pop");
  void fav.offsetWidth;
  if (on) fav.classList.add("pop");
  if (on && navigator.vibrate) navigator.vibrate(12);
  toast(t(on ? "sheet.fav_added" : "sheet.fav_removed"));
});
$("scanAgain").addEventListener("click", () => {
  sheet.hidden = true;
  sheetCode = null;
  openCamera({ replace: true });
});
// Partage : une carte image du verdict (ou le texte si le partage d'image n'est pas possible)
$("sheetShare").hidden = false;
$("sheetShare").addEventListener("click", async () => {
  const p = sheetProduct;
  if (!p) return;
  const v = verdictOf(p);
  const s = scoreOf(p);
  const text = t("sheet.share_text", { name: nameOf(p), status: S(v.status, "label"), health: s ? t(kindOf(p) === "beauty" ? "sheet.share_cosmetic" : "sheet.share_health", { n: s.score }) : "" });
  // Lien direct vers la fiche : ouvre le produit dans Bayyin (aussi encodé dans le QR de la carte)
  const url = location.origin + location.pathname + "?p=" + encodeURIComponent(p.code);
  try {
    const blob = await drawShareCard({
      name: nameOf(p), brand: p.brand, image: p.image, status: v.status, statusLabel: S(v.status, "label"),
      kicker: t("detail.halal"), lead: S(v.status, "lead"), score: s ? s.score : null, grade: s && s.grade,
      gradeLabel: s ? t(`grade.${s.grade}`) : "", healthLabel: t(kindOf(p) === "beauty" ? "detail.cosmetic" : "detail.health"), footer: t("share.footer"), rtl: getLang() === "ar",
      scanLine: t("share.scan_line"), url, urlLabel: (location.host + location.pathname).replace(/\/$/, ""),
    });
    const file = new File([blob], `bayyin-${p.code}.png`, { type: "image/png" });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: nameOf(p), text: `${text}\n${url}` });
    } else if (navigator.share) {
      await navigator.share({ title: nameOf(p), text, url });
    } else {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = file.name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      toast(t("share.saved"));
    }
  } catch {
    /* partage annulé */
  }
});

// Délégation : ouvrir une fiche, aller aux réglages, préparer une photo d'ingrédients
let pendingOcrCode = null;
document.addEventListener("click", (e) => {
  if (e.target.closest("[data-ask-copy]") && sheetProduct) {
    const m = askBrandMessage(sheetProduct, verdictOf(sheetProduct));
    navigator.clipboard?.writeText(`${m.subject}\n\n${m.body}`).then(() => toast(t("ask.copied")), () => {});
    return;
  }
  const prem = e.target.closest("[data-premium]");
  if (prem) return openPremium(prem.dataset.premium || "");
  const base = e.target.closest("[data-compare-base]");
  if (base) {
    const p = (store.get(base.dataset.compareBase) || {}).p;
    if (p) pickCompareSecond(p);
    return;
  }
  const cmp = e.target.closest("[data-compare]");
  if (cmp) return showCompare(cmp.dataset.compare);
  if (e.target.closest("[data-basket-clear]")) {
    basket.clear();
    toast(t("basket.cleared"));
    return renderBasket();
  }
  if (e.target.closest("[data-scan-now]")) {
    closeSheet();
    return setTimeout(() => openCamera(), 60);
  }
  if (e.target.closest("[data-basket-scan]")) {
    if (!requirePremium("basket")) return;
    basketMode = true;
    closeSheet();
    return setTimeout(() => openCamera(), 60);
  }
  const open = e.target.closest("[data-open]");
  if (open) return openSheet(open.dataset.open, { replace: !sheet.hidden });
  const offOcr = e.target.closest("[data-off-ocr]");
  if (offOcr) return readOffPhoto(offOcr.dataset.offOcr, offOcr);
  // Ce que dit l'étiquette : un passage touché ouvre son explication (un seul à la fois)
  const hlBtn = e.target.closest("[data-hl]");
  if (hlBtn) {
    const box = hlBtn.closest(".reader");
    const wasOpen = hlBtn.getAttribute("aria-expanded") === "true";
    box.querySelectorAll("[data-hl]").forEach((b) => b.setAttribute("aria-expanded", "false"));
    box.querySelectorAll(".hl-note").forEach((n) => { n.hidden = true; });
    if (!wasOpen) {
      hlBtn.setAttribute("aria-expanded", "true");
      const note = box.querySelector(`#hln-${hlBtn.dataset.hl}`);
      note.hidden = false;
      tapHaptic();
    }
    return;
  }
  const more = e.target.closest("[data-reader-more]");
  if (more) {
    more.closest(".reader").classList.add("open");
    more.remove();
    return;
  }
  const jump = e.target.closest("[data-jump-flag]");
  if (jump) {
    const target = $("sheetBody").querySelector(`.flag[data-fid="${CSS.escape(jump.dataset.jumpFlag)}"]`);
    if (target) {
      target.scrollIntoView({ behavior: REDUCED() ? "auto" : "smooth", block: "center" });
      target.classList.remove("ping");
      void target.offsetWidth;
      target.classList.add("ping");
    }
    return;
  }
  const ocr = e.target.closest("[data-ocr-code], label[for=ocrInput]");
  if (ocr) pendingOcrCode = ocr.dataset.ocrCode || null;
  const go = e.target.closest("[data-goto-settings]");
  if (go) {
    e.preventDefault();
    closeSheet();
    // Page des réglages concernée : profil (allergies, régime) ou avis religieux
    const page = go.dataset.gotoSettings === "profile" ? "profile" : "religion";
    setTimeout(() => (location.hash = `#settings/${page}`), 50);
  }
});

// ===========================================================================
// Photo de la liste d'ingrédients (OCR)
// ===========================================================================
let ocrTicket = 0;
// Photo de la liste d'ingrédients publiée sur Open Food Facts (petite version pour l'aperçu)
function ingredientsPhoto(p) {
  const ph = (p.photos || []).find((x) => (x.k || x[0]) === "ingredients");
  const u = ph && (ph.u || ph[1]);
  return u || (p.raw && p.raw.image_ingredients_url) || null;
}
// Lecture de cette photo : téléchargée en grand, puis même parcours qu'une photo prise par l'utilisateur
async function readOffPhoto(code, btn) {
  const p = memo.get(code) || (store.get(code) && store.get(code).p);
  const url = p && ingredientsPhoto(p);
  if (!url) return;
  if (btn) { btn.disabled = true; btn.innerHTML = `<span class="spinner"></span>${esc(t("offocr.loading"))}`; }
  let blob = null;
  for (const u of [fullPhoto(url), url]) {
    try {
      const res = await fetch(u, { mode: "cors", signal: AbortSignal.timeout(20000) });
      if (res.ok) { blob = await res.blob(); break; }
    } catch { /* essai suivant */ }
  }
  if (!blob) {
    if (btn) { btn.disabled = false; btn.innerHTML = `${svg(I.doc)}${esc(t("offocr.btn"))}`; }
    return toast(t("offocr.error"));
  }
  startOcr(blob, code, { fromOff: true, name: nameOf(p) });
}

// Étape 1 : la photo s'affiche avec un cadre à ajuster sur la liste d'ingrédients
function startOcr(file, code, opts = {}) {
  ++ocrTicket;
  sheetCode = code ? `ocr:${code}` : "ocr";
  sheetProduct = null;
  $("sheetTitle").textContent = t("ocr.title");
  $("sheetShare").hidden = true;
  $("sheetCompare").hidden = true;
  const url = URL.createObjectURL(file);
  $("sheetBody").innerHTML = `<div class="ocr-crop">
      <h3>${t("ocr.crop_t")}</h3><p class="muted">${opts.fromOff ? esc(t("offocr.crop_hint")) : t("ocr.crop_hint")}</p>
      <div class="crop-stage" id="cropStage">
        <img id="cropImg" src="${url}" alt="">
        <div class="crop-box" id="cropBox"><i data-h="nw"></i><i data-h="ne"></i><i data-h="sw"></i><i data-h="se"></i></div>
      </div>
      <p class="ocr-tip">${svg('<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2V16h5v-.1c0-.8.4-1.5 1-2A6 6 0 0 0 12 3z"/>')}<span>${esc(t("ocr.crop_tip"))}</span></p>
      <div class="ocr-actions">
      <button class="btn btn-primary btn-block" type="button" id="ocrRead">${t("ocr.crop_read")}</button>
      <label class="btn btn-soft btn-block" for="ocrInput" data-ocr-code="${esc(code || "")}">${t("ocr.retake")}</label>
      </div>
    </div>`;
  showSheet({ replace: !sheet.hidden });
  refreshFav();
  // Photo d'Open Food Facts : déjà recadrée sur la liste, le cadre prend toute l'image
  const box = opts.fromOff ? { x: 0.02, y: 0.02, w: 0.96, h: 0.96 } : { x: 0.03, y: 0.18, w: 0.94, h: 0.6 };
  const el = $("cropBox");
  const draw = () => Object.assign(el.style, { left: box.x * 100 + "%", top: box.y * 100 + "%", width: box.w * 100 + "%", height: box.h * 100 + "%" });
  draw();
  // Glisser le cadre, ou un de ses coins pour le redimensionner (doigt ou souris)
  const stage = $("cropStage");
  let drag = null;
  stage.addEventListener("pointerdown", (e) => {
    if (!e.target.closest("#cropBox")) return;
    e.preventDefault();
    const r = stage.getBoundingClientRect();
    drag = { h: e.target.dataset.h || "move", x: e.clientX, y: e.clientY, w: r.width, hgt: r.height, start: { ...box } };
    stage.setPointerCapture(e.pointerId);
  });
  stage.addEventListener("pointermove", (e) => {
    if (!drag) return;
    const dx = (e.clientX - drag.x) / drag.w, dy = (e.clientY - drag.y) / drag.hgt;
    const s0 = drag.start, MIN = 0.12;
    const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
    if (drag.h === "move") {
      box.x = clamp(s0.x + dx, 0, 1 - s0.w);
      box.y = clamp(s0.y + dy, 0, 1 - s0.h);
    } else {
      let x0 = s0.x, y0 = s0.y, x1 = s0.x + s0.w, y1 = s0.y + s0.h;
      if (drag.h.includes("w")) x0 = clamp(x0 + dx, 0, x1 - MIN);
      if (drag.h.includes("e")) x1 = clamp(x1 + dx, x0 + MIN, 1);
      if (drag.h.includes("n")) y0 = clamp(y0 + dy, 0, y1 - MIN);
      if (drag.h.includes("s")) y1 = clamp(y1 + dy, y0 + MIN, 1);
      Object.assign(box, { x: x0, y: y0, w: x1 - x0, h: y1 - y0 });
    }
    draw();
  });
  const stop = () => (drag = null);
  stage.addEventListener("pointerup", stop);
  stage.addEventListener("pointercancel", stop);
  $("ocrRead").addEventListener("click", () => {
    URL.revokeObjectURL(url);
    readOcr(file, code, { ...box }, opts);
  });
}

// Étape 2 : lecture de la zone encadrée, puis texte à vérifier
const ocrPhotos = new Map(); // photo des ingrédients par code-barres (mémoire seulement), pour Open Food Facts
async function readOcr(file, code, crop, opts = {}) {
  const ticket = ++ocrTicket;
  if (code && !opts.fromOff) ocrPhotos.set(code, file); // (photo déjà sur Open Food Facts : rien à renvoyer)
  $("sheetBody").innerHTML = `<div class="ocr-progress"><span class="spinner"></span><p id="ocrStep">${t("ocr.loading")}</p><small>${t("ocr.loading_note")}</small><div class="progress"><i id="ocrBar"></i></div></div>`;
  try {
    const { text, confidence, quality, readable } = await readIngredients(file, {
      lang: getLang(),
      // Photo d'Open Food Facts : souvent un produit importé, l'allemand est lu en plus
      langs: opts.fromOff ? "fra+deu+eng" : null,
      crop,
      onProgress: (n, attempt) => {
        if (ticket !== ocrTicket || !$("ocrStep")) return;
        // Deuxième essai et suivants : autre traitement de l'image, puis photo tournée d'un quart de tour
        $("ocrStep").textContent = attempt ? t("ocr.retrying", { n }) : t("ocr.reading", { n });
        $("ocrBar").style.width = n + "%";
      },
    });
    if (ticket !== ocrTicket) return;
    // Rien qui ressemble à une liste d'ingrédients : on ne montre pas de caractères au hasard
    if (!readable) return ocrUnreadable(file, code, opts);
    ocrReview(text, code, opts, quality < OCR_GOOD || confidence < 70);
  } catch {
    if (ticket === ocrTicket) $("sheetBody").innerHTML = messageHtml(t("msg.reader_error.t"), t("ocr.error.p"));
  }
}

// Texte à vérifier (ou à taper soi-même), puis analyse
function ocrReview(text, code, opts = {}, warn = false) {
  $("sheetBody").innerHTML = `<div class="ocr-review">
      <h3>${t(text ? "ocr.review" : "ocr.manual_t")}</h3><p class="muted">${t(text ? "ocr.review_hint" : "ocr.manual_hint")}</p>
      ${warn ? `<p class="ocr-warn">${svg(I.alert)}<span>${t("ocr.low_conf")}</span></p>` : ""}
      <textarea id="ocrText" class="field area" rows="8" spellcheck="${text ? "false" : "true"}" placeholder="${esc(t("ocr.manual_ph"))}">${esc(text)}</textarea>
      <label class="muted small" for="ocrName">${t("ocr.name")}</label>
      <input id="ocrName" class="field" type="text" autocomplete="off" value="${esc(opts.name || "")}">
      <button class="btn btn-primary btn-block" type="button" id="ocrAnalyze">${t("ocr.analyze")}</button>
      <label class="btn btn-soft btn-block" for="ocrInput" data-ocr-code="${esc(code || "")}">${t("ocr.retake")}</label>
    </div>`;
  $("ocrAnalyze").addEventListener("click", () => analyzeOcr(code, opts));
  if (!text) $("ocrText").focus();
}

// Photo illisible : ce qui s'est passé, comment réussir la suivante, et deux autres chemins
function ocrUnreadable(file, code, opts = {}) {
  const tips = ["ocr.tip_light", "ocr.tip_flat", "ocr.tip_close", "ocr.tip_frame"];
  $("sheetBody").innerHTML = `<div class="ocr-bad">
      ${emptyArt()}
      <h3>${t("ocr.bad.t")}</h3><p class="muted">${t("ocr.bad.p")}</p>
      <ul class="ocr-tips">${tips.map((k) => `<li>${svg(I.check)}<span>${esc(t(k))}</span></li>`).join("")}</ul>
      <label class="btn btn-primary btn-block" for="ocrInput" data-ocr-code="${esc(code || "")}">${t("ocr.retake")}</label>
      <button class="btn btn-soft btn-block" type="button" id="ocrReframe">${t("ocr.reframe")}</button>
      <button class="btn btn-soft btn-block" type="button" id="ocrManual">${t("ocr.manual")}</button>
    </div>`;
  $("ocrReframe").addEventListener("click", () => startOcr(file, code, opts));
  $("ocrManual").addEventListener("click", () => ocrReview("", code, opts));
}

function analyzeOcr(code, opts = {}) {
  const text = $("ocrText").value.trim();
  if (!text) return;
  const name = $("ocrName").value.trim();
  // Produit déjà connu (Open Food Facts) : on garde sa fiche (photo, marque, valeurs nutritionnelles…)
  // et on y ajoute seulement la liste lue
  const known = code && (memo.get(code) || (store.get(code) && store.get(code).p));
  const base = known && known.raw && !known.raw.local ? { ...known.raw } : {};
  if (known) {
    // Fiches gardées avant que les photos fassent partie des données conservées
    const ph = Object.fromEntries((known.photos || []).map((x) => [x.k, x.u]));
    base.image_front_small_url ||= known.image || undefined;
    base.image_front_url ||= ph.front;
    base.image_ingredients_url ||= ph.ingredients;
    base.image_nutrition_url ||= ph.nutrition;
    base.brands ||= known.brand || undefined;
    base.quantity ||= known.quantity || undefined;
  }
  const raw = {
    ...base,
    code: code || `local-${Date.now()}`,
    product_name: name || base.product_name || t("ocr.unnamed"),
    ingredients_text: text,
    ingredients_text_fr: "",
    lang: "",
    additives_tags: [...new Set([...(base.additives_tags || []), ...additivesFromText(text)])],
    categories_tags: base.categories_tags || [],
    local: true,
    ...(opts.fromOff ? { ocr_from: "off" } : {}),
  };
  if (code) localProducts.set(code, raw);
  const p = present(raw, prefs());
  memo.set(p.code, p);
  store.add(p);
  sheetCode = p.code;
  renderSheetProduct(p);
  if (code) toast(t("ocr.saved"));
}

$("ocrInput").addEventListener("change", (e) => {
  const file = e.target.files && e.target.files[0];
  e.target.value = "";
  if (!file) return;
  const code = pendingOcrCode;
  pendingOcrCode = null;
  if (!cameraEl.hidden) closeCamera({ keepHistory: true });
  startOcr(file, code);
});

// ===========================================================================
// Caméra plein écran
// ===========================================================================
let torchOn = false;
let slowTimer = null;
const camera = createCamera({
  video: $("camVideo"),
  frame: $("camFrame"),
  onState(state, detail) {
    cameraEl.dataset.state = state;
    if (state === "starting") $("camBusyText").textContent = t("cam.opening");
    clearTimeout(slowTimer);
    $("camHint").classList.remove("slow");
    $("camHint").textContent = t("cam.hint");
    if (state === "scanning") {
      // Rien de lu au bout de 8 s : un conseil, et la saisie manuelle reste à portée de main
      slowTimer = setTimeout(() => {
        $("camHint").textContent = t("cam.slow");
        $("camHint").classList.add("slow");
      }, 8000);
      $("torchBtn").hidden = !detail.torch;
      $("engineInfo").textContent = detail.engine || detectorEngine() || "—";
    }
    if (state === "error") {
      const kind = ["https", "unsupported", "denied", "nocamera", "busy", "decoder"].includes(detail.kind) ? detail.kind : "camera";
      $("camErrorTitle").textContent = t(`cam.err.${kind}.t`);
      $("camErrorText").textContent = t(`cam.err.${kind}.p`) + (detail.message && !["denied", "https"].includes(kind) ? ` (${detail.message})` : "");
    }
  },
  onCode(code) {
    clearTimeout(slowTimer);
    if (basketMode) return basketScan(code); // mode courses : on reste dans la caméra
    morphScan(code);
  },
});

// ---------------------------------------------------------------------------
// Le moment du scan : les barres du code se resserrent en un point, qui s'ouvre
// sur le verdict (coche, point d'exclamation, croix) à sa couleur, avec sa vibration.
// Si la fiche tarde (réseau lent), on n'attend pas : elle s'ouvre comme avant.
// ---------------------------------------------------------------------------
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const MORPH_SYMBOL = {
  ok: "M127 61l15 15 31-32",
  warn: "M150 40v26M150 82v.5",
  no: "M134 44l32 32M166 44l-32 32",
  question: "M139 47a11 11 0 1 1 16 10c-4 2-5 5-5 9M150 82v.5",
  dash: "M132 60h36",
};
function morphSvg() {
  // Barres d'épaisseurs variées, comme un vrai code-barres (motif fixe : pas de hasard à l'écran)
  const widths = [3, 2, 5, 2, 3, 6, 2, 2, 4, 3, 2, 5, 3, 2, 6, 2, 3, 4, 2, 3, 5, 2];
  const gap = 4.4;
  const total = widths.reduce((a, w) => a + w, 0) + gap * (widths.length - 1);
  let x = 150 - total / 2;
  const bars = widths.map((w, i) => {
    const cx = x + w / 2;
    const r = `<rect x="${x.toFixed(1)}" y="26" width="${w}" height="68" rx="${Math.min(w, 2) / 2}" style="--dx:${(150 - cx).toFixed(1)}px;--d:${Math.abs(150 - cx) * 1.6}ms"/>`;
    x += w + gap;
    return r;
  });
  return `<svg viewBox="0 0 300 120" aria-hidden="true"><g class="mb">${bars.join("")}</g>
    <circle class="md" cx="150" cy="60" r="42"/><path class="ms" pathLength="100" d=""/></svg><p class="cam-morph-label" id="camMorphLabel"></p>`;
}
let morphRun = 0;
function morphReset() {
  cameraEl.classList.remove("found", "m-read", "m-v");
  const m = $("camMorph");
  m.hidden = true;
  m.innerHTML = "";
}
// Mode démo : permet de rejouer le moment du scan sans caméra (tests et présentations)
if (DEMO) window.__bayyinScan = (code) => { cameraEl.hidden = false; cameraEl.dataset.state = "scanning"; morphScan(code); };
async function morphScan(code) {
  const run = ++morphRun;
  cameraEl.classList.add("found");
  scanBurst("#3DDC84");
  const open = (revealed) => {
    if (run !== morphRun) return;
    morphReset();
    closeCamera({ keepHistory: true });
    openSheet(code, { fromScan: true, replace: true, revealed });
  };
  if (REDUCED()) { // pas d'animation : le verdict s'affiche directement sur la fiche
    setTimeout(() => open(false), 0);
    return;
  }
  const m = $("camMorph");
  m.innerHTML = morphSvg();
  m.hidden = false;
  requestAnimationFrame(() => cameraEl.classList.add("m-read"));
  let p;
  try {
    [p] = await Promise.all([Promise.race([fetchProduct(code), sleep(1500).then(() => undefined)]), sleep(320)]);
  } catch { p = undefined; }
  if (run !== morphRun || cameraEl.hidden) return;
  if (!p) return open(false); // lent, introuvable ou erreur : la fiche s'en charge
  // La photo se télécharge pendant l'animation du verdict : elle est prête quand la fiche s'ouvre
  if (p.image) { const im = new Image(); im.referrerPolicy = "no-referrer"; im.decoding = "async"; im.src = p.image; }
  const st = verdictOf(p).status;
  const al = profileOf(p).alert;
  const look = al === "no" ? ["no", BURST_COLOR.haram, t(`alert.${al}`)]
    : st === "haram" ? ["no", BURST_COLOR.haram, S(st, "label")]
    : st === "mashbouh" ? ["question", BURST_COLOR.mashbouh, S(st, "label")]
    : al === "maybe" ? ["warn", BURST_COLOR.mashbouh, t(`alert.${al}`)]
    : st === "inconnu" ? ["dash", "#8A9790", S(st, "label")]
    : ["ok", BURST_COLOR[st], S(st, "label")];
  m.style.setProperty("--mc", look[1]);
  m.querySelector(".ms").setAttribute("d", MORPH_SYMBOL[look[0]]);
  $("camMorphLabel").textContent = look[2];
  cameraEl.style.setProperty("--mc", look[1]);
  cameraEl.classList.add("m-v");
  verdictHaptic(p);
  await sleep(820);
  open(true);
}

// Onde de confirmation autour du cadre de visée (couleur : vert à la lecture, puis celle du verdict en mode courses)
function scanBurst(color) {
  if (REDUCED()) return;
  const frame = $("camFrame");
  frame.querySelectorAll(".burst").forEach((b) => b.remove());
  for (let i = 0; i < 2; i++) {
    const b = document.createElement("span");
    b.className = "burst";
    b.style.setProperty("--bc", color);
    b.style.animationDelay = `${i * 120}ms`;
    b.addEventListener("animationend", () => b.remove());
    frame.appendChild(b);
  }
}

function openCamera({ replace = false } = {}) {
  cameraEl.hidden = false;
  $("camFlash").hidden = true;
  renderBasketButtons();
  cameraEl.dataset.state = "starting";
  torchOn = false;
  $("torchBtn").setAttribute("aria-pressed", "false");
  if (replace) history.replaceState({ cam: true }, "");
  else history.pushState({ cam: true }, "");
  lockScroll();
  camera.start();
}

function closeCamera({ fromPop = false, keepHistory = false } = {}) {
  if (cameraEl.hidden) return;
  basketMode = false; // le mode courses ne dure que le temps d'une session de caméra
  morphRun++; // une animation de verdict en cours s'arrête avec la caméra
  morphReset();
  camera.stop();
  cameraEl.hidden = true;
  lockScroll();
  if (!fromPop && !keepHistory && history.state && history.state.cam) history.back();
}

$("openCamera").addEventListener("click", () => openCamera());
$("closeCamera").addEventListener("click", () => closeCamera());
$("camRetry").addEventListener("click", () => camera.start());
$("torchBtn").addEventListener("click", async () => {
  torchOn = await camera.setTorch(!torchOn);
  $("torchBtn").setAttribute("aria-pressed", String(torchOn));
});
$("camManual").addEventListener("click", () => {
  closeCamera();
  showManual();
});

// ===========================================================================
// Photo du code-barres et saisie manuelle
// ===========================================================================
async function handleBarcodePhoto(input) {
  const file = input.files && input.files[0];
  input.value = "";
  if (!file) return;
  const fromCamera = !cameraEl.hidden;
  if (fromCamera) {
    camera.stop();
    cameraEl.dataset.state = "decoding";
    $("camBusyText").textContent = t("cam.reading");
  } else {
    $("homeStatus").innerHTML = loadingHtml(t("cam.reading"));
  }
  try {
    const code = await decodeImageFile(file);
    if (fromCamera) closeCamera({ keepHistory: true });
    $("homeStatus").innerHTML = "";
    if (code) return openSheet(code, { fromScan: true, replace: fromCamera });
    if (fromCamera && history.state && history.state.cam) history.back();
    $("homeStatus").innerHTML = messageHtml(t("msg.photo_unreadable.t"), t("msg.photo_unreadable.p"));
  } catch {
    if (fromCamera) closeCamera();
    $("homeStatus").innerHTML = messageHtml(t("msg.reader_error.t"), t("msg.reader_error.p"));
  }
}
$("photoInput").addEventListener("change", (e) => handleBarcodePhoto(e.target));
$("photoInputCam").addEventListener("change", (e) => handleBarcodePhoto(e.target));

function showManual() {
  $("manualForm").hidden = false;
  $("focusManual").setAttribute("aria-expanded", "true");
  $("manualInput").focus();
}
$("focusManual").addEventListener("click", () => {
  if ($("manualForm").hidden) showManual();
  else {
    $("manualForm").hidden = true;
    $("focusManual").setAttribute("aria-expanded", "false");
  }
});
$("manualForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const code = $("manualInput").value.replace(/\D/g, "");
  if (code.length < 8 || code.length > 14) {
    $("homeStatus").innerHTML = messageHtml(t("msg.code_short.t"), t("msg.code_short.p"));
    return;
  }
  $("homeStatus").innerHTML = "";
  $("manualInput").blur();
  $("manualInput").value = "";
  $("manualForm").hidden = true;
  $("focusManual").setAttribute("aria-expanded", "false");
  openSheet(code, { fromScan: true });
});

// ===========================================================================
// Accueil
// ===========================================================================
const TIP_COUNT = 8;
const TIP_KEY = "bayyin_tip_hidden";
const today = () => Math.floor(Date.now() / 864e5);
function tipHiddenToday() {
  try {
    return Number(localStorage.getItem(TIP_KEY)) === today();
  } catch {
    return false;
  }
}
$("homeTipClose").addEventListener("click", () => {
  try {
    localStorage.setItem(TIP_KEY, String(today())); // revient demain, avec une autre astuce
  } catch { /* stockage indisponible */ }
  $("homeTipBox").classList.add("closing");
  setTimeout(() => ($("homeTipBox").hidden = true), 220);
});

// Petit bilan des 7 derniers jours : une barre proportionnelle et sa légende
function weekSummary(all) {
  const week = all.filter((e) => e.at > Date.now() - 7 * 864e5);
  if (!week.length) return `<p class="wk-title">${esc(t("home.week_none"))}</p>`;
  const c = { ok: 0, doubt: 0, bad: 0, other: 0 };
  week.forEach((e) => {
    const st = verdictOf(e.p).status;
    if (st === "haram" || profileOf(e.p).alert === "no") c.bad++;
    else if (st === "mashbouh") c.doubt++;
    else if (st === "halal_certifie" || st === "halal_probable") c.ok++;
    else c.other++;
  });
  const seg = (k) => (c[k] ? `<i class="wk-${k}" style="flex:${c[k]}"></i>` : "");
  const leg = (k) => (c[k] ? `<span class="wk-${k}"><i></i>${esc(t(`home.wk_${k}`, { n: c[k] }))}</span>` : "");
  return `<p class="wk-title">${esc(tn("home.week", week.length))}</p>
    <div class="wk-bar" aria-hidden="true">${seg("ok")}${seg("doubt")}${seg("bad")}${seg("other")}</div>
    <p class="wk-legend">${leg("ok")}${leg("doubt")}${leg("bad")}</p>`;
}

function renderHome() {
  const all = store.all();
  $("view-scan").classList.toggle("returning", all.length > 0); // accueil court pour qui revient
  // Premier passage : ce que fait l'app ; ensuite : bonjour et bilan de la semaine
  if (all.length) $("h-home").textContent = t("home.greet");
  else $("h-home").innerHTML = t("home.h1_html");
  $("homeLead").hidden = !!all.length;
  $("homeWeek").hidden = !all.length;
  if (all.length) $("homeWeek").innerHTML = weekSummary(all);
  renderBasketButtons();
  const recent = all.slice(0, 10);
  const favs = all.filter((e) => e.fav).slice(0, 10);
  $("homeRecent").hidden = !recent.length;
  $("homeFavs").hidden = !favs.length;
  $("homeExplain").hidden = all.length >= 3;
  // Ne réécrit une liste que si son contenu a changé : pas de photos rechargées ni d'animation rejouée
  setHtml($("homeRecentList"), recent.map((e) => altCard(e.p, { fav: e.fav })).join(""));
  setHtml($("homeFavList"), favs.map((e) => altCard(e.p, { fav: true })).join(""));
  // Pastilles : école et profil, qui mènent aux Réglages
  const st = prefs();
  const prof = st.profile;
  const profText = hasProfile(prof)
    ? [prof.diet ? t(`diet.${prof.diet}`) : null, ...prof.allergens.slice(0, 2).map((x) => t(`allergen.${x}`)), prof.allergens.length > 2 ? `+${prof.allergens.length - 2}` : null]
        .filter(Boolean).join(" · ")
    : null;
  $("homeChips").innerHTML =
    `<a class="set-chip" href="#settings" data-goto-settings="school">${svg(I.shield)}<span>${esc(t("home.school_chip", { s: t(`school.${st.school}`) }))}</span></a>` +
    `<a class="set-chip${profText ? "" : " accent"}" href="#settings" data-goto-settings="profile">${svg(I.user)}<span>${esc(profText ? t("home.profile_chip", { p: profText }) : t("home.profile_add"))}</span></a>`;
  $("homeTip").textContent = t(`home.tip.${1 + (today() % TIP_COUNT)}`); // une astuce par jour
  $("homeTipBox").hidden = tipHiddenToday();
  $("homeTipBox").classList.remove("closing");
  renderRamadan();
}

// ---------------------------------------------------------------------------
// Mode Ramadan : pendant le mois, l'accueil prend des tons de nuit et donne le jour,
// l'heure de l'iftar et la fin du suhoor (calculées sur le téléphone, position arrondie).
// ---------------------------------------------------------------------------
const RAM_KEY = "bayyin_ramadan";
const FORCE_RAMADAN = new URLSearchParams(location.search).has("ramadan"); // aperçu
const ramDayNow = () => (FORCE_RAMADAN ? 13 : ramadanDay());
let ramTimer = null;
let ramLocating = false;
let ramError = "";
function ramPrefs() {
  const saved = readJson(RAM_KEY, {});
  return { angle: getLang() === "fr" ? 12 : 18, ...saved };
}
function untilText(ms) {
  const mins = Math.max(1, Math.round(ms / 60000));
  const h = Math.floor(mins / 60), m = mins % 60;
  return h ? t("ram.hm", { h, m: String(m).padStart(2, "0") }) : t("ram.m", { m });
}
function renderRamadan() {
  const box = $("ramadanBox");
  const day = ramDayNow();
  document.documentElement.toggleAttribute("data-ramadan", !!day);
  clearTimeout(ramTimer);
  box.hidden = !day;
  if (!day) return;
  const rp = ramPrefs();
  const hm = (d) => d.toLocaleTimeString(locale(), { hour: "2-digit", minute: "2-digit" });
  let times = "";
  if (rp.lat != null) {
    const now = new Date();
    const td = fastTimes(now, rp.lat, rp.lng, { fajrAngle: rp.angle });
    if (td.fajr && td.maghrib) {
      const next = fastTimes(new Date(now.getTime() + 864e5), rp.lat, rp.lng, { fajrAngle: rp.angle });
      const count = now < td.fajr ? t("ram.until_suhoor", { d: untilText(td.fajr - now) })
        : now < td.maghrib ? t("ram.until_iftar", { d: untilText(td.maghrib - now) })
        : next.fajr ? t("ram.until_suhoor", { d: untilText(next.fajr - now) }) : "";
      times = `<div class="ram-times">
          <div class="ram-time"><small>${esc(t("ram.suhoor"))}</small><b dir="ltr">${hm(td.fajr)}</b></div>
          <div class="ram-time"><small>${esc(t("ram.iftar"))}</small><b dir="ltr">${hm(td.maghrib)}</b></div>
        </div>
        ${count ? `<p class="ram-count">${esc(count)}</p>` : ""}
        <div class="ram-foot">
          <label class="ram-method">${esc(t("ram.method"))}
            <select data-ram-angle>${[12, 15, 18].map((a) => `<option value="${a}"${a === rp.angle ? " selected" : ""}>${esc(t(`ram.m${a}`))}</option>`).join("")}</select>
          </label>
          <button type="button" class="link-btn" data-ram-locate>${esc(t("ram.relocate"))}</button>
        </div>
        <p class="ram-note">${esc(t("ram.note"))}</p>`;
      // Mise à jour du compte à rebours à la minute
      ramTimer = setTimeout(() => { if (current === "scan") renderRamadan(); }, 60000 - (Date.now() % 60000) + 50);
    } else {
      times = `<p class="ram-note">${esc(t("ram.unavailable"))}</p>`;
    }
  } else {
    times = `<button type="button" class="btn btn-white ram-locate" data-ram-locate${ramLocating ? " disabled" : ""}>${ramLocating ? '<span class="spinner"></span>' : svg('<path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.4"/>')}<span>${esc(t(ramLocating ? "ram.locating" : "ram.locate"))}</span></button>
      ${ramError ? `<p class="ram-note">${esc(ramError)}</p>` : `<p class="ram-note">${esc(t("ram.privacy"))}</p>`}`;
  }
  box.innerHTML = `<div class="ram-head">
      <svg class="ram-moon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z"/></svg>
      <div><h2 id="h-ram">${esc(t("ram.title"))}</h2><p>${esc(t("ram.day", { n: day }))}</p></div>
    </div>${times}`;
}
function ramLocate() {
  if (!navigator.geolocation) { ramError = t("ram.denied"); return renderRamadan(); }
  ramLocating = true;
  ramError = "";
  renderRamadan();
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      // Position arrondie (environ 1 km) et gardée sur le téléphone seulement
      const r = (x) => Math.round(x * 100) / 100;
      writeJson(RAM_KEY, { ...readJson(RAM_KEY, {}), lat: r(pos.coords.latitude), lng: r(pos.coords.longitude) });
      ramLocating = false;
      renderRamadan();
    },
    () => { ramLocating = false; ramError = t("ram.denied"); renderRamadan(); },
    { enableHighAccuracy: false, maximumAge: 6 * 3600e3, timeout: 15000 },
  );
}
$("ramadanBox").addEventListener("click", (e) => {
  if (e.target.closest("[data-ram-locate]")) ramLocate();
});
$("ramadanBox").addEventListener("change", (e) => {
  const sel = e.target.closest("[data-ram-angle]");
  if (!sel) return;
  writeJson(RAM_KEY, { ...readJson(RAM_KEY, {}), angle: Number(sel.value) });
  renderRamadan();
});

// ===========================================================================
// Recherche
// ===========================================================================
const SUGGESTIONS = DEMO ? ["Haribo", "Nutella", "Saucisson", "Camembert", "Nuggets"] : ["Nutella", "Haribo", "Isla Délice", "Kinder", "Danone"];
// Recherches récentes (sur l'appareil)
const RECENT_Q = "bayyin_recent_searches";
const recentQueries = () => readJson(RECENT_Q, []);
function rememberQuery(q) {
  writeJson(RECENT_Q, [q, ...recentQueries().filter((x) => x.toLowerCase() !== q.toLowerCase())].slice(0, 8));
}
function renderRecentSearches() {
  const list = recentQueries();
  $("recentSearches").innerHTML = list.length
    ? `<div class="label-row"><p class="label">${t("search.recent")}</p><button type="button" class="link-btn" data-recent-clear>${t("search.recent_clear")}</button></div>
       <div class="chips">${list.map((q) => `<button type="button" class="chip recent" data-q="${esc(q)}">${svg('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>')}${esc(q)}</button>`).join("")}</div>`
    : "";
}
$("recentSearches").addEventListener("click", (e) => {
  if (e.target.closest("[data-recent-clear]")) {
    writeJson(RECENT_Q, []);
    return renderRecentSearches();
  }
  const b = e.target.closest("[data-q]");
  if (!b) return;
  $("searchInput").value = b.dataset.q;
  runSearch(b.dataset.q);
});
$("searchSuggest").addEventListener("click", (e) => {
  if (!e.target.closest("[data-scan-tip]")) return;
  e.preventDefault();
  location.hash = "#scan";
  setTimeout(() => openCamera(), 80);
});

// Type de recherche : tout, aliments seulement, cosmétiques seulement (maquillage, soins, hygiène)
let searchKind = "all";
const SEARCH_KIND_ICON = { all: '<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4-4"/>', food: I.box, beauty: I.drop };
function renderSearchKind() {
  $("searchKind").innerHTML = ["all", "food", "beauty"].map((k) =>
    `<button type="button" role="tab" aria-selected="${k === searchKind}" data-sk="${k}">${svg(SEARCH_KIND_ICON[k])}<span>${esc(t(`kindtab.${k}`))}</span></button>`).join("");
}
$("searchKind").addEventListener("click", (e) => {
  const b = e.target.closest("[data-sk]");
  if (!b || b.dataset.sk === searchKind) return;
  searchKind = b.dataset.sk;
  renderSearchKind();
  renderSuggestions();
  if ($("searchInput").value.trim()) runSearch($("searchInput").value, { force: true });
});

function renderSuggestions() {
  renderRecentSearches();
  renderSearchKind();
  // Des marques, et deux mots courants dans la langue de l'app (la recherche les comprend dans les 4 langues)
  const ideas = searchKind === "beauty"
    ? [t("sidea.mascara"), t("sidea.lipstick"), t("sidea.foundation"), "Nivea", "Garnier", t("sidea.nail"), "Maybelline"]
    : [...SUGGESTIONS.slice(0, 3), t("search.idea_milk"), t("search.idea_chicken"), ...SUGGESTIONS.slice(3)];
  $("suggestChips").innerHTML = ideas.map((s) => `<button type="button" class="chip" data-q="${esc(s)}">${esc(s)}</button>`).join("");
}
$("suggestChips").addEventListener("click", (e) => {
  const b = e.target.closest("[data-q]");
  if (!b) return;
  $("searchInput").value = b.dataset.q;
  runSearch(b.dataset.q);
});

let searchCtl = null;
let searchRunning = ""; // recherche en cours : un deuxième appui ne la relance pas
let lastResults = null;
// Résultats d'Open Food Facts gardés 10 minutes : retaper ou effacer une lettre ne relance pas la recherche
const searchCache = new Map();
async function runSearch(raw, { force = false, remember = true } = {}) {
  const q = raw.trim();
  const out = $("searchResults");
  $("searchSuggest").hidden = !!q;
  if (!q) {
    searchCtl?.abort();
    searchRunning = "";
    lastResults = null;
    renderRecentSearches();
    return (out.innerHTML = "");
  }
  if (q === searchRunning && !force) return;
  if (!lastResults || lastResults.q !== q) resultFilter = "all";
  const kind = searchKind;
  searchCtl?.abort();
  const ctl = (searchCtl = new AbortController());
  searchRunning = q;
  lastResults = null;
  const digits = q.replace(/\s+/g, "");
  try {
    if (/^\d{8,14}$/.test(digits)) {
      out.innerHTML = rowsSkeleton(5, t("search.searching"));
      const p = await fetchProduct(digits);
      if (ctl.signal.aborted) return;
      lastResults = p ? { q, local: [], food: [p], beauty: [], single: true } : null;
      if (!p) out.innerHTML = notFoundHtml(digits);
      else renderResults(q);
      return;
    }
    if (q.length < 2) return (out.innerHTML = messageHtml(t("search.short.t"), t("search.short.p")));
    // Tout de suite : les produits déjà scannés qui correspondent
    const local = rankByRelevance(store.all().map((e) => e.p).filter((p) => kind === "all" || kindOf(p) === kind), q).slice(0, 3);
    out.innerHTML = (local.length ? resultGroup(t("search.in_history"), local) : "") + rowsSkeleton(4, t("search.searching"));
    const ck = `${getLang()}|${kind}|${norm(q)}`;
    const hit = !force && searchCache.get(ck);
    const res = hit && Date.now() - hit.at < 600000 ? hit.res : await off.search(q, { lang: getLang(), signal: ctl.signal, kind });
    if (ctl.signal.aborted) return;
    if (!res.foodFailed && !res.beautyFailed) searchCache.set(ck, { res, at: Date.now() });
    const known = new Set(local.map((p) => p.code));
    const fresh = (list) => list.filter((p) => !known.has(p.code));
    [...res.food, ...res.beauty].forEach((p) => memo.set(p.code, p));
    lastResults = { q, local, food: fresh(res.food), beauty: fresh(res.beauty), alt: res.alt, foodFailed: res.foodFailed };
    if (remember) rememberQuery(q);
    renderResults(q);
  } catch (err) {
    if (ctl.signal.aborted) return;
    out.innerHTML = messageHtml(t("msg.error.t"), errorText(err), `<button class="btn btn-primary" type="button" data-search-retry>${esc(t("msg.retry"))}</button>`);
  } finally {
    if (searchCtl === ctl) searchRunning = "";
  }
}
const resultGroup = (title, list, count = false) =>
  `<section class="result-group"><p class="label">${esc(title)}${count ? ` · ${list.length}` : ""}</p><div class="list">${list.map((p) => rowHtml(p)).join("")}</div></section>`;
let resultFilter = "all";
const RESULT_FILTERS = {
  all: () => true,
  halal: (p) => ["halal_certifie", "halal_probable"].includes(verdictOf(p).status),
  safe: (p) => !profileOf(p).alert,
};
function renderResults(q) {
  const r0 = lastResults;
  if (!r0 || r0.q !== q) return;
  const withProfile = hasProfile(prefs().profile) || prefs().members.length > 0;
  if (resultFilter === "safe" && !withProfile) resultFilter = "all";
  const keep = RESULT_FILTERS[resultFilter];
  const r = { ...r0, local: r0.local.filter(keep), food: r0.food.filter(keep), beauty: r0.beauty.filter(keep) };
  const all0 = [...r0.local, ...r0.food, ...r0.beauty];
  const chips = !r0.single && all0.length > 1
    ? `<div class="chips filter" role="tablist">${Object.keys(RESULT_FILTERS).filter((id) => id !== "safe" || withProfile)
        .map((id) => `<button type="button" class="chip" role="tab" aria-selected="${id === resultFilter}" data-rf="${id}">${t(`search.f.${id}`)}<span class="n">${all0.filter(RESULT_FILTERS[id]).length}</span></button>`).join("")}</div>`
    : "";
  const total = r.local.length + r.food.length + r.beauty.length;
  let html = "";
  if (r.single) html = `<div class="list">${r.food.map((p) => rowHtml(p)).join("")}</div>`;
  else if (total) {
    html += `<p class="search-count">${esc(tn("search.results", total))}${r.alt ? ` · <span>${esc(t("search.alt", { q: r.alt }))}</span>` : ""}</p>`;
    if (r.local.length) html += resultGroup(t("search.in_history"), r.local);
    const both = r.food.length && r.beauty.length;
    if (r.food.length) html += both || r.local.length ? resultGroup(t("search.g_food"), r.food, true) : `<div class="list">${r.food.map((p) => rowHtml(p)).join("")}</div>`;
    if (r.beauty.length) html += resultGroup(t("search.g_beauty"), r.beauty, true);
  }
  // Les aliments n'ont pas répondu : on le dit, au lieu d'afficher seulement des cosmétiques
  if (r.foodFailed) html = messageHtml(t("search.food_failed.t"), t("search.food_failed.p"), `<button class="btn btn-primary" type="button" data-search-retry>${esc(t("msg.retry"))}</button>`) + html;
  else if (!total && all0.length) html = `<div class="empty"><p>${esc(t("search.f.none"))}</p></div>`;
  else if (!total) html = `<div class="empty">${emptyArt("search")}<strong>${esc(t("search.none.t"))}</strong><p>${esc(t("search.none.p", { q }))}</p></div>`;
  $("searchResults").innerHTML = chips + html;
}
$("searchResults").addEventListener("click", (e) => {
  const f = e.target.closest("[data-rf]");
  if (f) {
    resultFilter = f.dataset.rf;
    return renderResults($("searchInput").value.trim());
  }
  if (e.target.closest("[data-search-retry]")) runSearch($("searchInput").value, { force: true });
});
function submitSearch(e) {
  e?.preventDefault();
  clearTimeout(liveTimer);
  $("searchInput").blur();
  const q = $("searchInput").value.trim();
  if (q.length >= 2 && !/^\d+$/.test(q.replace(/\s+/g, ""))) rememberQuery(q);
  runSearch(q);
}
$("searchForm").addEventListener("submit", submitSearch);
// Certains claviers de téléphone envoient seulement la touche « Rechercher » sans valider le formulaire
$("searchInput").addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.isComposing) submitSearch(e);
});
// Recherche pendant la frappe :
// - tout de suite, les produits déjà scannés qui correspondent (rien n'est demandé à Open Food Facts) ;
// - après une courte pause, la recherche Open Food Facts part seule (qui limite les recherches :
//   on n'envoie donc pas une requête par lettre, et une frappe reprise annule la précédente).
let liveTimer = null;
const LIVE_PAUSE = 700;
function liveLocal(q) {
  const kind = searchKind;
  const local = rankByRelevance(store.all().map((e) => e.p).filter((p) => kind === "all" || kindOf(p) === kind), q).slice(0, 5);
  $("searchSuggest").hidden = true;
  $("searchResults").innerHTML = (local.length ? resultGroup(t("search.in_history"), local) : "") +
    (q.length >= 3 ? rowsSkeleton(3, t("search.searching")) : "");
}
$("searchInput").addEventListener("input", (e) => {
  clearTimeout(liveTimer);
  const q = e.target.value.trim();
  if (!q) return runSearch("");
  const digits = q.replace(/\s+/g, "");
  if (/^\d+$/.test(digits)) {
    // Code-barres : on attend qu'il soit complet
    if (/^\d{8,14}$/.test(digits)) liveTimer = setTimeout(() => runSearch(q, { remember: false }), 450);
    return;
  }
  if (q.length < 2) return;
  if (lastResults && lastResults.q === q) return; // déjà affiché
  searchCtl?.abort(); // la recherche précédente ne sert plus
  searchRunning = "";
  liveLocal(q);
  if (q.length >= 3) liveTimer = setTimeout(() => runSearch(q, { remember: false }), LIVE_PAUSE);
});
// Recherche gardée dans « Recherches récentes » quand on ouvre un des résultats
$("searchResults").addEventListener("click", (e) => {
  if (e.target.closest("[data-open]")) {
    const q = $("searchInput").value.trim();
    if (q.length >= 2 && !/^\d+$/.test(q.replace(/\s+/g, ""))) rememberQuery(q);
  }
}, true);

// ===========================================================================
// Historique
// ===========================================================================
let historyFilter = "all";
// Type de produit : aliments, cosmétiques, médicaments (rangée affichée dès qu'il y en a deux sortes)
let historyKind = "all";
const KIND_ORDER = ["food", "beauty", "medicine"];
function kindSegHtml(entries, current, attr) {
  const kinds = KIND_ORDER.filter((k) => entries.some((e) => kindOf(e.p || e) === k));
  if (kinds.length < 2) return "";
  return ["all", ...kinds].map((k) => {
    const n = k === "all" ? entries.length : entries.filter((e) => kindOf(e.p || e) === k).length;
    return `<button type="button" role="tab" aria-selected="${k === current}" ${attr}="${k}">${k === "all" ? "" : svg(KIND_ICON[k])}<span>${esc(t(`kindtab.${k}`))}</span><b>${n}</b></button>`;
  }).join("");
}
let confirmClear = false;

function relTime(ts) {
  const s = (Date.now() - ts) / 1000;
  if (s < 60) return t("when.now");
  if (s < 3600) return t("when.min", { n: Math.floor(s / 60) });
  const d = new Date(ts);
  const hm = d.toLocaleTimeString(locale(), { hour: "2-digit", minute: "2-digit" });
  if (d.toDateString() === new Date().toDateString()) return t("when.today", { t: hm });
  if (d.toDateString() === new Date(Date.now() - 864e5).toDateString()) return t("when.yesterday", { t: hm });
  return d.toLocaleDateString(locale(), { day: "numeric", month: "short" });
}

const HISTORY_FILTERS = [
  { id: "all", test: () => true },
  { id: "fav", test: (e) => e.fav },
  { id: "halal", test: (e) => verdictOf(e.p).status.startsWith("halal") },
  { id: "doubt", test: (e) => verdictOf(e.p).status === "mashbouh" },
  { id: "haram", test: (e) => verdictOf(e.p).status === "haram" },
];
const STATUS_COLOR = { halal_certifie: "var(--c-cert)", halal_probable: "var(--c-prob)", mashbouh: "var(--c-doubt)", haram: "var(--c-haram)", inconnu: "var(--c-none)" };

// Historique rangé par période : aujourd'hui, hier, cette semaine, plus ancien
function historyGroups(entries) {
  const day = (ts) => new Date(ts).setHours(0, 0, 0, 0);
  const today = day(Date.now());
  const bucket = (ts) => {
    const d = (today - day(ts)) / 864e5;
    return d < 1 ? "today" : d < 2 ? "yesterday" : d < 7 ? "week" : "older";
  };
  const order = ["today", "yesterday", "week", "older"];
  return order
    .map((g) => {
      const list = entries.filter((e) => bucket(e.at) === g);
      return list.length
        ? `<p class="hist-day">${t(`history.g.${g}`)}</p><div class="list">${list.map((e) => rowHtml(e.p, { fav: e.fav, when: relTime(e.at) })).join("")}</div>`
        : "";
    })
    .join("");
}

// ---------------------------------------------------------------------------
// Bilans en images : anneau des verdicts, 7 derniers jours, note moyenne
// ---------------------------------------------------------------------------
function statusCounts(products) {
  const counts = {};
  products.forEach((p) => { const st = verdictOf(p).status; counts[st] = (counts[st] || 0) + 1; });
  return counts;
}
const pct = (n, total) => Math.round((n / total) * 100);
// Anneau : un arc par verdict (périmètre 100 pour lire les pourcentages directement)
function donutHtml(counts, total, center) {
  let at = 0;
  const arcs = STATUS_ORDER.filter((s) => counts[s]).map((s, i) => {
    const d = (counts[s] / total) * 100;
    const gap = total > counts[s] ? 0.8 : 0; // fine séparation entre deux arcs
    const arc = `<circle class="dn-seg" cx="21" cy="21" r="15.915" pathLength="100" style="--c:${STATUS_COLOR[s]};--d:${Math.max(0, d - gap)};--o:${-at};--i:${i}"/>`;
    at += d;
    return arc;
  }).join("");
  return `<div class="donut viz" role="img" aria-label="${esc(STATUS_ORDER.filter((s) => counts[s]).map((s) => `${S(s, "label")} ${pct(counts[s], total)} %`).join(", "))}">
    <svg viewBox="0 0 42 42" aria-hidden="true"><circle class="dn-track" cx="21" cy="21" r="15.915"/>${arcs}</svg>
    <span class="dn-center">${center}</span></div>`;
}
function legendHtml(counts, total) {
  return `<ul class="dn-legend">${STATUS_ORDER.filter((s) => counts[s]).map((s) =>
    `<li><i class="dot" style="--c:${STATUS_COLOR[s]}"></i><span>${S(s, "label")}</span><b dir="ltr">${counts[s]}</b><small dir="ltr">${pct(counts[s], total)} %</small></li>`).join("")}</ul>`;
}
// Barres des 7 derniers jours, chaque barre partagée entre les verdicts
function daysHtml(entries, weeksAgo = 0) {
  const lang = getLang();
  const day0 = new Date(); day0.setHours(0, 0, 0, 0);
  day0.setDate(day0.getDate() - 7 * weeksAgo);
  const days = Array.from({ length: 7 }, (_, i) => {
    const start = day0.getTime() - (6 - i) * 864e5;
    const list = entries.filter((e) => e.at >= start && e.at < start + 864e5).map((e) => e.p);
    return { start, list, counts: statusCounts(list) };
  });
  const max = Math.max(1, ...days.map((d) => d.list.length));
  const wd = new Intl.DateTimeFormat(lang === "ar" ? "ar" : lang, { weekday: "short" });
  const full = new Intl.DateTimeFormat(lang === "ar" ? "ar" : lang, { weekday: "long" });
  return `<div class="days viz" dir="ltr">${days.map((d, i) => {
    const n = d.list.length;
    const segs = STATUS_ORDER.filter((s) => d.counts[s]).map((s) => `<i style="flex:${d.counts[s]};--c:${STATUS_COLOR[s]}"></i>`).join("");
    return `<div class="day${i === 6 && !weeksAgo ? " today" : ""}" style="--i:${i}" title="${esc(`${full.format(d.start)} : ${n}`)}">
      <span class="day-n">${n || ""}</span>
      <span class="day-bar"><span class="day-fill${n ? "" : " zero"}" style="--h:${n ? Math.max(8, (n / max) * 100) : 4}%">${segs}</span></span>
      <span class="day-l">${esc(wd.format(d.start).replace(/\.$/, ""))}</span></div>`;
  }).join("")}</div>`;
}
// Note moyenne sur une jauge à quatre niveaux, avec le curseur des autres jauges
function scoreGaugeHtml(avg, title) {
  const g = avg >= 75 ? "excellent" : avg >= 50 ? "bon" : avg >= 25 ? "mediocre" : "mauvais";
  return `<div class="avg-head"><span>${esc(title)}</span><strong class="g-${g}" dir="ltr">${avg}<small>/100</small></strong><em class="g-${g}">${esc(t(`grade.${g}`))}</em></div>
    <div class="gauge score-gauge" dir="ltr" role="img" aria-label="${esc(`${title} : ${avg}/100, ${t(`grade.${g}`)}`)}">
      <div class="gauge-bar"><i class="sg-0" style="width:25%"></i><i class="sg-1" style="width:25%"></i><i class="sg-2" style="width:25%"></i><i class="sg-3" style="width:25%"></i>
        <b class="gauge-mark" style="--x:${avg}%"></b></div>
      <div class="gauge-labels">${[0, 25, 50, 75, 100].map((x) => `<span style="left:${x}%">${x}</span>`).join("")}</div></div>`;
}
const avgScore = (products) => {
  const scores = products.map(scoreOf).filter(Boolean).map((x) => x.score);
  return scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
};

// « Mon bilan » en tête de l'historique
// Bloc « 7 jours » : on remonte d'une semaine en glissant vers la droite, on revient en glissant vers la gauche
let bilanWeek = 0;
let bilanEntries = [];
function weekBounds(weeksAgo) {
  const end = new Date(); end.setHours(0, 0, 0, 0);
  end.setDate(end.getDate() + 1 - 7 * weeksAgo); // fin (exclue) : lendemain du dernier jour affiché
  const start = new Date(end); start.setDate(start.getDate() - 7);
  return { start: start.getTime(), end: end.getTime() };
}
function weekSecHtml(all) {
  bilanEntries = all;
  const oldest = all.length ? Math.min(...all.map((e) => e.at)) : Date.now();
  const maxWeeks = Math.max(0, Math.ceil((weekBounds(0).start - oldest) / (7 * 864e5)));
  bilanWeek = Math.min(bilanWeek, maxWeeks);
  const { start, end } = weekBounds(bilanWeek);
  const n = all.filter((e) => e.at >= start && e.at < end).length;
  let title = t("bilan.week");
  if (bilanWeek) {
    const f = new Intl.DateTimeFormat(locale(), { day: "numeric", month: "short" });
    const range = f.formatRange ? f.formatRange(start, end - 864e5) : `${f.format(start)} – ${f.format(end - 864e5)}`;
    title = t("bilan.week_range", { range });
  }
  const nav = (dir, off, label) => `<button type="button" class="wk-btn" data-wk="${dir}" aria-label="${esc(label)}"${off ? " disabled" : ""}>${svg(dir === "prev" ? '<path d="M15 5l-7 7 7 7"/>' : '<path d="M9 5l7 7-7 7"/>')}</button>`;
  return `<div class="bilan-sec bilan-week" id="bilanWeek">
    <div class="bilan-sub"><span>${esc(title)}</span><b dir="ltr">${n}</b></div>
    <div class="wk-row" dir="ltr">${nav("prev", bilanWeek >= maxWeeks, t("bilan.prev_week"))}${daysHtml(all, bilanWeek)}${nav("next", bilanWeek === 0, t("bilan.next_week"))}</div>
  </div>`;
}
function setBilanWeek(n) {
  const el = $("bilanWeek");
  if (!el || n < 0 || n === bilanWeek) return;
  const back = n > bilanWeek;
  bilanWeek = n;
  const tmp = document.createElement("div");
  tmp.innerHTML = weekSecHtml(bilanEntries);
  const fresh = tmp.firstElementChild;
  el.replaceWith(fresh);
  tapHaptic(8);
  if (!REDUCED()) fresh.querySelector(".days").classList.add(back ? "wk-from-left" : "wk-from-right");
  requestAnimationFrame(() => fresh.querySelector(".viz")?.classList.add("in"));
}
$("historyStats").addEventListener("click", (e) => {
  const b = e.target.closest("[data-wk]");
  if (!b || b.disabled) return;
  setBilanWeek(bilanWeek + (b.dataset.wk === "prev" ? 1 : -1));
});
(() => {
  let sx = 0, sy = 0, on = false;
  $("historyStats").addEventListener("pointerdown", (e) => {
    if (!e.target.closest(".wk-row") || e.target.closest("[data-wk]")) return;
    on = true; sx = e.clientX; sy = e.clientY;
  }, { passive: true });
  const end = (e) => {
    if (!on) return;
    on = false;
    const dx = e.clientX - sx, dy = e.clientY - sy;
    if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy) * 1.4) return;
    const prev = $("bilanWeek")?.querySelector(dx > 0 ? "[data-wk=prev]" : "[data-wk=next]");
    if (prev && !prev.disabled) setBilanWeek(bilanWeek + (dx > 0 ? 1 : -1));
  };
  $("historyStats").addEventListener("pointerup", end, { passive: true });
  $("historyStats").addEventListener("pointercancel", () => { on = false; }, { passive: true });
})();

function bilanHtml(all, counts) {
  const avg = avgScore(all.map((e) => e.p));
  const week = all.filter((e) => e.at > Date.now() - 7 * 864e5).length;
  return `<div class="stats bilan">
    <h3 class="bilan-t">${esc(t("bilan.title"))}</h3>
    <div class="bilan-top">
      ${donutHtml(counts, all.length, `<b>${all.length}</b><small>${t(all.length === 1 ? "history.count_one" : "history.count_other")}</small>`)}
      ${legendHtml(counts, all.length)}
    </div>
    ${weekSecHtml(all)}
    ${avg !== null ? `<div class="bilan-sec">${scoreGaugeHtml(avg, t("bilan.avg"))}</div>` : ""}
  </div>`;
}

// Durée visible : 30 jours sans Premium, un an avec. Les favoris restent toujours visibles.
const historyDays = () => (premiumEnabled() && !isPremium() ? FREE_HISTORY_DAYS : PREMIUM_HISTORY_DAYS);
function renderHistory() {
  const stored = store.all();
  const since = Date.now() - historyDays() * 864e5;
  const everything = stored.filter((e) => e.fav || e.at >= since);
  const hiddenN = stored.length - everything.length; // plus anciens, gardés sur le téléphone
  const seg = kindSegHtml(everything, historyKind, "data-hk");
  if (!seg) historyKind = "all";
  $("historyKind").hidden = !seg;
  setHtml($("historyKind"), seg);
  const all = historyKind === "all" ? everything : everything.filter((e) => kindOf(e.p) === historyKind);
  const counts = {};
  all.forEach((e) => {
    const st = verdictOf(e.p).status;
    counts[st] = (counts[st] || 0) + 1;
  });
  setHtml($("historyStats"), !all.length
    ? `<div class="empty">${emptyArt("hello")}<strong>${t("history.empty.t")}</strong><p>${t("history.empty.p")}</p><a class="btn btn-primary" href="#scan">${t("home.scan")}</a></div>`
    : bilanHtml(all, counts));
  requestAnimationFrame(() => animateGauges($("historyStats")));

  $("historyFilter").hidden = !all.length;
  setHtml($("historyFilter"), HISTORY_FILTERS.map(
    (f) => `<button type="button" class="chip" role="tab" aria-selected="${f.id === historyFilter}" data-f="${f.id}">${t(`history.f.${f.id}`)}<span class="n">${all.filter(f.test).length}</span></button>`
  ).join(""));

  const shown = all.filter(HISTORY_FILTERS.find((f) => f.id === historyFilter).test);
  const more = hiddenN && historyKind === "all" && historyFilter === "all"
    ? `<button type="button" class="premium-more" data-premium="history">${svg(I.crown)}<span><strong>${esc(tn("premium.history_more", hiddenN))}</strong><small>${esc(t("premium.history_more_p", { days: FREE_HISTORY_DAYS }))}</small></span>${svg(I.chev, "flip")}</button>`
    : "";
  setHtml($("historyList"), !all.length
    ? more
    : shown.length
      ? historyGroups(shown) + more
      : `<div class="empty">${emptyArt()}<p>${t(historyFilter === "fav" ? "history.empty_fav" : "history.empty_cat")}</p></div>`);

  $("historyClear").innerHTML = !all.length
    ? ""
    : confirmClear
      ? `<span>${t("history.clear_q")}</span><button type="button" class="link-btn danger" data-clear="yes">${t("history.clear_yes")}</button><button type="button" class="link-btn" data-clear="no">${t("history.clear_no")}</button>`
      : `<button type="button" class="link-btn" data-clear="ask">${t("history.clear")}</button>`;
}
$("historyKind").addEventListener("click", (e) => {
  const b = e.target.closest("[data-hk]");
  if (!b || b.dataset.hk === historyKind) return;
  historyKind = b.dataset.hk;
  historyFilter = "all";
  bilanWeek = 0;
  renderHistory();
});
$("historyFilter").addEventListener("click", (e) => {
  const b = e.target.closest("[data-f]");
  if (!b) return;
  historyFilter = b.dataset.f;
  renderHistory();
});
$("historyClear").addEventListener("click", (e) => {
  const b = e.target.closest("[data-clear]");
  if (!b) return;
  confirmClear = b.dataset.clear === "ask";
  if (b.dataset.clear === "yes") {
    store.clear({ keepFavs: true });
    toast(t("history.cleared"));
  }
  renderHistory();
});
store.subscribe(() => {
  if (current === "history") renderHistory();
  if (current === "scan") renderHome();
});

// ===========================================================================
// Additifs (deux listes : halal selon vos réglages, et santé)
// ===========================================================================
let addMode = "ecodes";
const addOpen = new Set(); // groupes ouverts par l'utilisateur
let addFilter = "all";
const norm = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, "");

function halalItems() {
  const topics = prefs().topics;
  const level = (id, base) => (TOPIC_OF[id] ? SEVERITY_OF[topics[TOPIC_OF[id]]] : base);
  const items = TEXT_RULES.map((r) => ({
    group: t("add.group_ingredients"), name: t(`flag.${r.id}.label`), codes: [], reason: t(`flag.${r.id}.reason`),
    level: level(r.id, r.severity), topic: TOPIC_OF[r.id],
  }));
  const fattyCodes = [];
  for (const [code, a] of Object.entries(ADDITIVES)) {
    if (a.group === "gras") { fattyCodes.push(code.toUpperCase()); continue; }
    items.push({
      group: t("add.group_additives"), name: `${code.toUpperCase()} · ${t(`flag.${code}.label`)}`, codes: [],
      reason: t(`flag.${code}.reason`), level: level(code, a.severity), topic: TOPIC_OF[code],
    });
  }
  for (const r of BEAUTY_RULES) {
    items.push({
      group: t("kind.beauty"), name: t(`flag.${r.id}.label`), codes: [], reason: t(`flag.${r.id}.reason`),
      level: level(r.id, r.severity), topic: TOPIC_OF[r.id],
    });
  }
  items.push({
    group: t("add.group_additives"), name: t("add.fatty"), codes: fattyCodes, reason: t("flag.fatty.reason"),
    level: SEVERITY_OF[topics.derives], topic: "derives",
  });
  return items;
}

function healthItems() {
  const groups = new Map();
  for (const [code, a] of Object.entries(ADDITIVE_RISK)) {
    if (!groups.has(a.key)) groups.set(a.key, { level: a.level, key: a.key, members: [] });
    groups.get(a.key).members.push(code);
  }
  return [...groups.values()].map((g) => ({
    group: t(`risk.${g.level}`),
    name: g.members.map((c) => t(`addname.${c}`)).join(", "),
    codes: g.members.map((c) => c.toUpperCase()),
    reason: t(`risk.reason.${g.key}`),
    level: g.level,
  }));
}

const ADD_MODES = {
  halal: {
    // Ingrédients sensibles : les codes E ont leur propre encyclopédie
    items: () => halalItems().filter((i) => i.group !== t("add.group_additives")),
    filters: [["all", "add.f.all"], ["haram", "sev.haram"], ["mashbouh", "sev.mashbouh"], ["info", "sev.info"]],
    pill: (it) => `<span class="pill ${it.level === "haram" ? "s-haram" : it.level === "mashbouh" ? "s-mashbouh" : "r-info"}">${t(`sev.${it.level}`)}</span>`,
    order: { haram: 0, mashbouh: 1, info: 2 },
  },
  sante: {
    items: healthItems,
    filters: [["all", "add.f.all"], ["eleve", "risk.short.eleve"], ["modere", "risk.short.modere"], ["limite", "risk.short.limite"]],
    pill: (it) => `<span class="pill r-${it.level}">${t(`risk.short.${it.level}`)}</span>`,
    order: { eleve: 0, modere: 1, limite: 2 },
  },
};

function renderAdditives() {
  document.querySelectorAll("#addModes button").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.mode === addMode)));
  $("addFn").hidden = addMode !== "ecodes";
  if (addMode === "ecodes") return renderECodes();
  const m = ADD_MODES[addMode];
  const all = m.items();
  const q = norm($("addInput").value || "");
  document.querySelectorAll("#addModes button").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.mode === addMode)));
  $("addFilter").innerHTML = m.filters
    .map(([id, key]) => {
      const n = id === "all" ? all.length : all.filter((i) => i.level === id).length;
      return `<button type="button" class="chip" role="tab" aria-selected="${id === addFilter}" data-f="${id}">${t(key)}<span class="n">${n}</span></button>`;
    })
    .join("");
  const items = all
    .filter((it) => (addFilter === "all" || it.level === addFilter) && (!q || norm([it.name, it.codes.join(" "), it.reason].join(" ")).includes(q)))
    .sort((a, b) => m.order[a.level] - m.order[b.level]);
  const groups = [...new Set(items.map((i) => i.group))];
  // Une recherche ou un filtre ouvre tout ; sinon les groupes restent repliés (sauf ceux ouverts à la main)
  const forceOpen = !!q || addFilter !== "all" || groups.length === 1;
  $("addList").innerHTML = items.length
    ? groups
        .map((g) => {
          const list = items.filter((i) => i.group === g);
          const counts = Object.keys(m.order)
            .map((lv) => [lv, list.filter((i) => i.level === lv).length])
            .filter(([, n]) => n);
          const open = forceOpen || addOpen.has(addMode + "|" + g);
          return `<details class="add-sec" data-g="${esc(addMode + "|" + g)}"${open ? " open" : ""}>
            <summary>
              <span class="add-sec-head"><strong>${esc(g)}</strong>
                <span class="add-sec-counts">${counts.map(([lv, n]) => m.pill({ level: lv }).replace("</span>", ` · ${n}</span>`)).join("")}</span></span>
              <span class="src-chev" aria-hidden="true">${svg(I.chev)}</span>
            </summary>
            <div class="add-rows2">${list
              .map(
                (it) => `<details class="add-entry"><summary><span class="add-name">${esc(it.name)}</span>${m.pill(it)}</summary>
                  ${it.codes.length ? `<div class="add-codes" dir="ltr">${it.codes.map((c) => `<span>${esc(c)}</span>`).join("")}</div>` : ""}
                  <p class="add-why">${esc(it.reason)}</p>
                  ${it.topic ? `<p class="add-setting">${esc(t("add.your_setting", { d: t(`decision.${prefs().topics[it.topic]}`).toLowerCase() }))} · <a href="#settings" data-goto-settings>${t("detail.change_setting")}</a></p>` : ""}
                </details>`
              )
              .join("")}</div>
          </details>`;
        })
        .join("")
    : `<div class="empty">${emptyArt()}<strong>${t("add.empty.t")}</strong><p>${t(addMode === "halal" ? "add.empty_halal" : "add.empty_health")}</p></div>`;
}
// ---------------------------------------------------------------------------
// Encyclopédie des codes E : nom, fonction, origine (Open Food Facts), verdict halal (vos réglages)
// et risque santé (règles de Bayyin + évaluation de l'EFSA)
// ---------------------------------------------------------------------------
let eDb = null;
let eDbLoading = null;
let eFn = "";
let eShown = 80;
function loadEDb() {
  if (eDb || eDbLoading) return eDbLoading;
  eDbLoading = fetch("data/additives.json")
    .then((r) => (r.ok ? r.json() : null))
    .then((d) => {
      eDb = d;
      if (current === "additives") renderAdditives();
    })
    .catch(() => { eDbLoading = null; });
  return eDbLoading;
}
function eHalal(code) {
  const a = ADDITIVES[code];
  if (!a) return { level: "ok" };
  const topics = prefs().topics;
  if (a.group === "gras") return { level: SEVERITY_OF[topics.derives], reason: t("flag.fatty.reason"), topic: "derives" };
  return { level: TOPIC_OF[code] ? SEVERITY_OF[topics[TOPIC_OF[code]]] : a.severity, reason: t(`flag.${code}.reason`), topic: TOPIC_OF[code] };
}
function eHealth(code, it) {
  const r = ADDITIVE_RISK[code];
  if (r) return { level: r.level, reason: t(`risk.reason.${r.key}`) };
  if (it.r === "high" || it.r === "moderate") return { level: "modere", reason: t("add.efsa_over") };
  return { level: null };
}
// Fonction absente de la fiche : déduite de la numérotation européenne des additifs
function eFunctions(it) {
  if (it.k.length) return it.k;
  const n = parseInt(it.e.slice(1), 10);
  if (n >= 100 && n < 200) return ["colour"];
  if (n >= 200 && n < 300) return ["preservative"];
  if (n >= 300 && n < 400) return ["antioxidant"];
  if (n >= 400 && n < 500) return ["thickener"];
  if (n >= 500 && n < 600) return ["acidity-regulator"];
  if (n >= 600 && n < 700) return ["flavour-enhancer"];
  if (n >= 950 && n < 970) return ["sweetener"];
  if (n >= 900 && n < 950) return ["glazing-agent"];
  return ["other"];
}
// Pictogrammes d'origine : feuille (végétale, minérale ou de synthèse), animal, produit animal, l'un ou l'autre, inconnue
const ORIGIN_ICO = {
  plant: '<path d="M5 19c0-8 6-14 14-14 0 8-6 14-14 14z"/><path d="M5 19l8-8"/>',
  animal: '<circle cx="7" cy="9" r="1.8"/><circle cx="11" cy="5.5" r="1.8"/><circle cx="15.5" cy="6" r="1.8"/><circle cx="18" cy="10" r="1.8"/><path d="M8 17c0-3 2-5.5 4.5-5.5S17 14 17 17c0 2-1.5 3-4.5 3S8 19 8 17z"/>',
  animal_product: '<path d="M12 3c3.5 0 6.5 5.5 6.5 10a6.5 6.5 0 0 1-13 0C5.5 8.5 8.5 3 12 3z"/>',
  maybe: '<path d="M4 18c0-6 4.5-10.5 10.5-10.5 0 6-4.5 10.5-10.5 10.5z"/><path d="M17 14.5a2.5 2.5 0 1 1 3 2.4V18"/><path d="M20 21h.01"/>',
  unknown: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .9-1 1.7"/><path d="M12 17h.01"/>',
};
const eOrigin = (it) => (it.g === "n" ? "animal" : it.v === "n" ? "animal_product" : it.v === "m" || it.g === "m" ? "maybe" : it.v === "y" ? "plant" : "unknown");
function myAdditiveCounts() {
  const counts = new Map();
  for (const e of store.all()) for (const tag of (e.p.raw && e.p.raw.additives_tags) || []) {
    const c = String(tag).replace(/^en:/, "").toLowerCase();
    counts.set(c, (counts.get(c) || 0) + 1);
  }
  return counts;
}
function renderECodes() {
  if (!eDb) {
    $("addFilter").innerHTML = "";
    $("addFn").innerHTML = "";
    $("addList").innerHTML = rowsSkeleton(6);
    loadEDb();
    return;
  }
  const lang = getLang();
  const mine = myAdditiveCounts();
  const rows = eDb.items.map((it) => {
    const code = it.e.toLowerCase();
    const raw = it.n[lang] || it.n.fr || it.n.en || "";
    it.k = eFunctions(it);
    return { it, code, label: it.e.replace(/[A-F]$/, (l) => l.toLowerCase()), name: raw.charAt(0).toUpperCase() + raw.slice(1),
      halal: eHalal(code), health: eHealth(code, it), origin: eOrigin(it), mine: mine.get(code) || 0 };
  });
  const FILTERS = {
    all: () => true,
    mine: (r) => r.mine > 0,
    halal: (r) => r.halal.level === "haram" || r.halal.level === "mashbouh",
    health: (r) => !!r.health.level,
    animal: (r) => r.origin === "animal" || r.origin === "animal_product" || r.origin === "maybe",
  };
  if (!FILTERS[addFilter]) addFilter = "all";
  $("addFilter").innerHTML = Object.keys(FILTERS)
    .filter((id) => id !== "mine" || mine.size)
    .map((id) => `<button type="button" class="chip" role="tab" aria-selected="${id === addFilter}" data-f="${id}">${t(`add.ef.${id}`)}<span class="n">${rows.filter(FILTERS[id]).length}</span></button>`)
    .join("");
  // Fonctions les plus courantes d'abord
  const fnCount = new Map();
  rows.forEach((r) => r.it.k.forEach((k) => fnCount.set(k, (fnCount.get(k) || 0) + 1)));
  const fns = [...fnCount].sort((a, b) => b[1] - a[1]).map(([k]) => k);
  const fnName = (k) => t(`fn.${k}`);
  $("addFn").innerHTML = [`<button type="button" class="chip mini" aria-selected="${!eFn}" data-fn="">${t("add.fn_all")}</button>`,
    ...fns.map((k) => `<button type="button" class="chip mini" aria-selected="${eFn === k}" data-fn="${esc(k)}">${esc(fnName(k))}</button>`)].join("");
  const q = norm($("addInput").value || "");
  const qCode = q.replace(/^e-?/, "");
  const list = rows.filter((r) => FILTERS[addFilter](r) && (!eFn || r.it.k.includes(eFn)) &&
    (!q || r.code === "e" + qCode || r.code.startsWith("e" + qCode) && /^\d/.test(qCode) || norm(r.name + " " + Object.values(r.it.n).join(" ")).includes(q)));
  if (addFilter === "mine") list.sort((a, b) => b.mine - a.mine);
  // Recherche par nom : le nom qui commence par les lettres tapées d'abord
  else if (q && !/^\d/.test(qCode)) {
    const rank = (r) => (norm(r.name) === q ? 2 : norm(r.name).startsWith(q) ? 1 : 0);
    list.sort((a, b) => rank(b) - rank(a));
  }
  const halalPill = (h) => (h.level === "haram" || h.level === "mashbouh" ? `<span class="pill ${h.level === "haram" ? "s-haram" : "s-mashbouh"}">${t(`sev.${h.level}`)}</span>` : "");
  const healthPill = (h) => (h.level ? `<span class="pill r-${h.level}">${t(`risk.short.${h.level}`)}</span>` : "");
  const row = (r) => {
    const fn = r.it.k.map(fnName).join(", ");
    const okAll = !halalPill(r.halal) && !healthPill(r.health);
    return `<details class="ae">
      <summary><span class="ae-code" dir="ltr">${esc(r.label)}</span><span class="ae-name"><strong dir="auto">${esc(r.name || r.label)}</strong>${fn ? `<small>${esc(fn)}</small>` : ""}</span>
        <span class="ae-badges">${halalPill(r.halal)}${healthPill(r.health)}${okAll ? `<span class="ae-ok" aria-label="${esc(t("add.no_concern"))}">${svg(I.check)}</span>` : ""}</span></summary>
      <dl class="ae-body">
        ${fn ? `<div><dt>${t("add.e_fn")}</dt><dd>${esc(fn)}</dd></div>` : ""}
        <div><dt>${t("add.e_origin")}</dt><dd class="ae-origin"><span class="origin-ico o-${r.origin}" aria-hidden="true">${svg(ORIGIN_ICO[r.origin])}</span><span>${t(`add.origin.${r.origin}`)}</span></dd></div>
        <div><dt>${t("add.e_halal")}</dt><dd>${r.halal.reason ? `${halalPill(r.halal) || `<span class="pill r-info">${t("sev.info")}</span>`} ${esc(r.halal.reason)}` : esc(t("add.halal_ok"))}
          ${r.halal.topic ? `<span class="add-setting">${esc(t("add.your_setting", { d: t(`decision.${prefs().topics[r.halal.topic]}`).toLowerCase() }))} · <a href="#settings" data-goto-settings>${t("detail.change_setting")}</a></span>` : ""}</dd></div>
        <div><dt>${t("add.e_health")}</dt><dd>${riskScale(r.health.level || "none")}${r.health.level ? esc(r.health.reason) : esc(t("add.health_ok"))}
          ${r.it.a ? `<span class="add-setting">${t("add.anses")}</span>` : ""}
          ${r.it.u ? `<a class="ae-src" href="${esc(r.it.u)}" target="_blank" rel="noopener">${esc(t("add.efsa_link", { d: (r.it.d || "").slice(0, 4) }))} ↗</a>` : ""}</dd></div>
        ${r.mine ? `<p class="ae-mine">${esc(tn("add.in_mine", r.mine))}</p>` : ""}
      </dl>
    </details>`;
  };
  $("addList").innerHTML = list.length
    ? `<p class="search-count">${esc(tn("add.count", list.length))}</p><div class="ae-list">${list.slice(0, eShown).map(row).join("")}</div>` +
      (list.length > eShown ? `<button class="btn btn-soft btn-block" type="button" data-e-more>${esc(t("add.more", { n: list.length - eShown }))}</button>` : "") +
      `<p class="fineprint">${t("add.e_source")}</p>`
    : `<div class="empty">${emptyArt()}<strong>${t("add.empty.t")}</strong><p>${t("add.e_none")}</p></div>`;
}
$("addFn").addEventListener("click", (e) => {
  const b = e.target.closest("[data-fn]");
  if (!b) return;
  eFn = b.dataset.fn;
  eShown = 80;
  renderAdditives();
});
$("addList").addEventListener("click", (e) => {
  if (!e.target.closest("[data-e-more]")) return;
  eShown += 120;
  renderAdditives();
});

$("addModes").addEventListener("click", (e) => {
  const b = e.target.closest("[data-mode]");
  if (!b) return;
  addMode = b.dataset.mode;
  addFilter = "all";
  renderAdditives();
});
$("addFilter").addEventListener("click", (e) => {
  const b = e.target.closest("[data-f]");
  if (!b) return;
  addFilter = b.dataset.f;
  renderAdditives();
});
$("addInput").addEventListener("input", () => {
  eShown = 80;
  renderAdditives();
});
$("addList").addEventListener("toggle", (e) => {
  const d = e.target;
  if (!d.matches || !d.matches("details.add-sec")) return;
  if (d.open) addOpen.add(d.dataset.g);
  else addOpen.delete(d.dataset.g);
}, true);

// ===========================================================================
// Réglages
// ===========================================================================
// Réglages : un menu court ; chaque ligne ouvre une sous-page (#settings/<page>)
const SET_PAGES = ["lang", "profile", "religion", "appearance", "offline", "data", "notes", "how", "sources", "privacy", "limits"];
let setPage = "menu";
let setPrev = "menu";
let setFromMenu = false;
const SI = {
  lang: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3z"/>',
  profile: I.user,
  religion: '<path d="M15.5 3.6A8.6 8.6 0 1 0 20.4 16a7 7 0 0 1-4.9-12.4z"/><path d="M17 7.5l.7 1.4 1.5.2-1.1 1 .3 1.5-1.4-.7-1.4.7.3-1.5-1.1-1 1.5-.2z"/>',
  appearance: '<circle cx="12" cy="12" r="9"/><path d="M12 3v18a9 9 0 0 0 0-18z" fill="currentColor" stroke="none"/>',
  offline: '<path d="M12 4v11M7.5 10.5L12 15l4.5-4.5M5 19.5h14"/>',
  data: '<ellipse cx="12" cy="6" rx="7" ry="3"/><path d="M5 6v12c0 1.7 3.1 3 7 3s7-1.3 7-3V6M5 12c0 1.7 3.1 3 7 3s7-1.3 7-3"/>',
  notes: '<path d="M5 20V11M10.5 20V5M16 20v-6M3 20.5h18"/>',
  how: I.bulb,
  sources: I.doc,
  privacy: '<rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>',
  limits: I.alert,
  off: I.box,
  report: '<path d="M5.5 21V4M5.5 4h11l-2.2 4 2.2 4h-11"/>',
  demo: '<path d="M8 5.5v13l10.5-6.5z"/>',
};
const schoolName = (s) => t(`school.${s}`);
const modifiedTopics = (st) => TOPICS.filter((x) => (SCHOOLS[st.baseSchool] || SCHOOLS.standard)[x] !== st.topics[x]);
const religionValue = (st) =>
  st.school === "custom" ? t("settings.custom_base", { s: schoolName(st.baseSchool) }) : schoolName(st.school);
const profileValue = (st) => {
  const parts = [];
  if (st.profile.diet) parts.push(t(`diet.${st.profile.diet}`));
  if (st.profile.allergens.length) parts.push(tn("settings.allergy_count", st.profile.allergens.length));
  return parts.join(" · ") || t("settings.profile_none");
};
const offlineValue = (st) => (st.offlinePackAt ? t("settings.offline_ready", { n: st.offlinePackCount }) : t("settings.offline_not"));
const appearanceValue = (st) => t(`theme.${st.theme}`) + (st.textSize !== "normal" ? " · " + t(`text.${st.textSize}`) : "");

function setRow(page, value, { href, external = false } = {}) {
  const url = href || `#settings/${page}`;
  return `<a class="set-row" href="${esc(url)}"${external ? ' target="_blank" rel="noopener"' : ` data-go="${page}"`}>
    <span class="set-ico si-${page}">${svg(SI[page])}</span>
    <span class="set-text"><strong>${esc(t(page === "off" ? "link.off.t" : page === "report" ? "link.report.t" : page === "demo" ? "link.demo_exit.t" : `settings.menu.${page}`))}</strong>${value ? `<small>${esc(value)}</small>` : ""}</span>
    <span class="set-chev" aria-hidden="true">${external ? "↗" : svg(I.chev, "flip")}</span>
  </a>`;
}
function renderSettingsMenu() {
  const st = prefs();
  const nHist = store.all().length;
  $("setSummary").innerHTML = `<div class="set-summary">
      <p class="ss-kicker">${t("settings.summary_t")}</p>
      <div class="ss-items">
        <a class="ss-item" href="#settings/religion" data-go="religion"><small>${t("settings.summary_school")}</small><strong>${esc(religionValue(st))}</strong></a>
        <a class="ss-item" href="#settings/profile" data-go="profile"><small>${t("settings.summary_profile")}</small><strong>${esc(profileValue(st))}</strong></a>
        <a class="ss-item" href="#settings/offline" data-go="offline"><small>${t("settings.summary_offline")}</small><strong>${esc(offlineValue(st))}</strong></a>
      </div>
    </div>`;
  const group = (title, rows) => `<section class="set-section"><h2 class="set-group-t">${t(title)}</h2><div class="set-group">${rows.join("")}</div></section>`;
  $("setMenu").innerHTML =
    premiumCard() +
    group("settings.g_prefs", [
      setRow("lang", LANG_NAMES[st.lang]),
      setRow("profile", profileValue(st)),
      setRow("religion", religionValue(st)),
      setRow("appearance", appearanceValue(st)),
    ]) +
    group("settings.g_data", [setRow("offline", offlineValue(st)), setRow("data", tn("settings.data_count", nHist))]) +
    group("settings.g_about", [setRow("notes"), setRow("how"), setRow("sources"), setRow("privacy"), setRow("limits")]) +
    group("settings.g_links", [
      `<a class="set-row" href="#" data-feedback><span class="set-ico si-feedback">${svg('<path d="M4 5.5A1.5 1.5 0 0 1 5.5 4h13A1.5 1.5 0 0 1 20 5.5v9a1.5 1.5 0 0 1-1.5 1.5H10l-4.5 4v-4h0A1.5 1.5 0 0 1 4 14.5z"/><path d="M8.5 9h7M8.5 12h4.5"/>')}</span>
        <span class="set-text"><strong>${t("fb.title")}</strong><small>${esc(t("fb.row"))}</small></span><span class="set-chev" aria-hidden="true">${svg(I.chev, "flip")}</span></a>`,
      setRow("off", t("link.off.d"), { href: "https://fr.openfoodfacts.org", external: true }),
      setRow("report", t("link.report.d"), { href: "https://github.com/agozel5/bayyin/issues", external: true }),
      ...(DEMO ? [setRow("demo", t("link.demo_exit.d"), { href: location.pathname + "#scan" }).replace(` data-go="demo"`, "")] : []),
    ]);
}
function showSetPage(page, { animate = true } = {}) {
  const changed = animate && page !== setPage;
  setPrev = setPage;
  setPage = page;
  document.querySelectorAll("#view-settings .set-page").forEach((el) => {
    const on = el.dataset.page === page;
    el.hidden = !on;
    if (on && changed) {
      el.classList.remove("enter-fwd", "enter-back");
      void el.offsetWidth; // relance l'animation
      el.classList.add(page === "menu" ? "enter-back" : "enter-fwd");
    }
  });
}
$("view-settings").addEventListener("click", (e) => {
  if (e.target.closest("[data-go]")) setFromMenu = true;
  if (e.target.closest("[data-back]")) {
    e.preventDefault();
    if (setFromMenu && history.length > 1) history.back();
    else location.hash = "#settings";
    setFromMenu = false;
  }
});

function renderSettings() {
  const st = prefs();
  renderSettingsMenu();
  $("langGrid").innerHTML = LANGS.map(
    (l) => `<button type="button" role="radio" class="lang-btn" aria-checked="${st.lang === l}" data-lang="${l}" lang="${l}">${LANG_NAMES[l]}</button>`
  ).join("");

  $("dietList").style.gridTemplateColumns = "repeat(3,1fr)";
  $("dietList").innerHTML = [null, ...DIETS].map(
    (d) => `<button type="button" role="radio" class="d-diet" aria-checked="${(st.profile.diet || null) === d}" data-diet="${d || ""}">${t(d ? `diet.${d}` : "diet.none")}</button>`
  ).join("");
  $("allergenList").innerHTML = PROFILE_ALLERGENS.map(
    (a) => `<button type="button" role="checkbox" class="chip allergen-chip" aria-checked="${st.profile.allergens.includes(a)}" data-allergen="${a}">${esc(t(`allergen.${a}`))}</button>`
  ).join("");

  renderFamily();

  // Écoles : cartes compactes ; un réglage personnalisé rappelle l'école de départ
  const schools = Object.keys(SCHOOLS);
  $("schoolList").innerHTML =
    (st.school === "custom"
      ? `<div class="school custom" aria-checked="true" role="radio"><span class="radio" aria-hidden="true"></span><span class="school-text"><strong>${t("school.custom")}</strong><small>${esc(t("settings.custom_from", { s: schoolName(st.baseSchool) }))}</small></span></div>`
      : "") +
    schools
      .map(
        (s) => `<button type="button" role="radio" class="school" aria-checked="${st.school === s}" data-school="${s}">
        <span class="radio" aria-hidden="true"></span>
        <span class="school-text"><strong>${t(`school.${s}`)}</strong><small>${t(`school.${s}.d`)}</small></span>
      </button>`
      )
      .join("");
  renderTopics();
  renderCertifiers();
  renderAppearance();
  renderOfflineStatus();
  renderDataPage();

  $("legendHalal").innerHTML = LEGEND_ORDER.map(
    (s) => `<div class="legend-row"><span class="pill s-${s}"><span class="dot"></span>${S(s, "label")}</span><p>${S(s, "legend")}</p></div>`
  ).join("");
  $("notesMascot").innerHTML = `${mascot("teach", { size: 84 })}<p>${esc(t("notes.mascot"))}</p>`;
  $("cosmKinds").innerHTML = Object.entries(KIND_ICONS).map(([k, ico]) =>
    `<div class="kl-row"><span class="kl-ico k-${k}">${svg(ico)}</span><span><strong>${esc(t(`cosm.kind.${k}`))}</strong><small>${esc(t(`cosm.kind.${k}.d`))}</small></span></div>`).join("");
  $("legendHealth").innerHTML = HEALTH_GRADES.map((g, i) => {
    const max = i === 0 ? 100 : HEALTH_GRADES[i - 1].min - 1;
    return `<div class="legend-row"><span class="pill g-${g.id}" style="--cbg:var(--tint)"><span class="dot"></span>${t(`grade.${g.id}`)}</span><p>${t("health.range", { a: g.min, b: max })}</p></div>`;
  }).join("");
  document.querySelectorAll(".se-pts[data-pts]").forEach((el) => (el.textContent = t("health.pts", { n: el.dataset.pts })));
  renderSources();
  showSetPage(setPage);
}

// ---------------------------------------------------------------------------
// Nos sources : des cartes par thème. Pas de logos officiels (ce serait laisser croire à un partenariat) :
// un sigle sur une pastille dont la couleur et le pictogramme disent le type de source.
// ---------------------------------------------------------------------------
const SRC_THEMES = ["halal", "food", "cosm", "data"];
const SRC_COSM = new Set(["sccs", "echa", "ansm", "eu_cosmetics", "cir", "essca", "ema", "cosmetics_europe", "afssaps_baby", "fr_pfas"]);
const srcTheme = (src) => (src.group === "halal" || /_list$/.test(src.id) ? "halal" : src.group === "data" ? "data" : SRC_COSM.has(src.id) ? "cosm" : "food");
const SRC_THEME_ICO = { halal: I.shield, food: I.flask, cosm: '<path d="M9 3h6v4H9z"/><path d="M8 7h8l1 4v9a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1v-9z"/><path d="M10 14h4"/>', data: I.box };
const SRC_KIND_ICO = {
  database: '<ellipse cx="12" cy="6" rx="7" ry="3"/><path d="M5 6v12c0 1.7 3.1 3 7 3s7-1.3 7-3V6M5 12c0 1.7 3.1 3 7 3s7-1.3 7-3"/>',
  agency: '<path d="M3 21h18M5 21V10M19 21V10M9 21v-7M15 21v-7M3 10l9-6 9 6z"/>',
  law: '<path d="M12 4v16M5 20h14M6 8h12M6 8l-3 6a3 3 0 0 0 6 0zM18 8l-3 6a3 3 0 0 0 6 0z"/>',
  study: '<path d="M4 20V10M10 20V4M16 20v-8M22 20H2"/>',
  text: '<path d="M4 5c3-1 6-1 8 1 2-2 5-2 8-1v14c-3-1-6-1-8 1-2-2-5-2-8-1z"/><path d="M12 6v14"/>',
  fatwa: '<path d="M12 3a6 6 0 0 0 0 12 5 5 0 0 1 0-10"/><path d="M5 21h14M7 21v-4h10v4"/>',
};
const SRC_SHORT = { off: "OFF", obf: "OBF", cosing: "CosIng", bdpm: "BDPM", rappelconso: "Rappel", osm: "OSM", avs_list: "AVS", achahada_list: "Achahada", hmc_list: "HMC",
  efsa: "EFSA", anses: "ANSES", iarc: "CIRC", jecfa: "JECFA", eu_additives: "1333", eu_labelling: "1169", fda: "FDA", nutriscore: "Nutri", fsa: "FSA", nova: "NOVA", nutrinet: "NutriNet",
  sccs: "SCCS", echa: "ECHA", ansm: "ANSM", eu_cosmetics: "1223", cir: "CIR", essca: "ESSCA", ema: "EMA", cosmetics_europe: "CE", afssaps_baby: "ANSM", fr_pfas: "PFAS",
  quran: "قرآن", iifa: "IIFA", ecfr: "ECFR", diyanet: "Diyanet", daralifta: "Ifta", muftiwp: "Mufti", mui: "MUI" };
// Nombre de points de l'app (signalements halal, additifs, ingrédients cosmétiques) qui citent chaque source
let srcUses = null;
function sourceUses() {
  if (srcUses) return srcUses;
  srcUses = new Map();
  const add = (ids) => (ids || []).forEach((id) => srcUses.set(id, (srcUses.get(id) || 0) + 1));
  Object.values(FLAG_SOURCES).forEach(add);
  Object.values(RISK_SOURCES).forEach(add);
  COSMETIC_RULES.forEach((r) => add(r.sources));
  return srcUses;
}
let srcFilter = "all";
function renderSources() {
  const uses = sourceUses();
  const count = (th) => SOURCES.filter((src) => th === "all" || srcTheme(src) === th).length;
  const chips = ["all", ...SRC_THEMES].map((th) =>
    `<button type="button" class="chip" role="tab" aria-selected="${th === srcFilter}" data-src-f="${th}">${th === "all" ? esc(t("sources.all")) : esc(t(`sources.t.${th}`))}<span class="n">${count(th)}</span></button>`).join("");
  const card = (src, i) => {
    const short = SRC_SHORT[src.id] || src.name.split(" ")[0];
    const n = uses.get(src.id) || 0;
    return `<a class="src-card sk-${src.kind}" href="${esc(src.url)}" target="_blank" rel="noopener" style="--i:${i}">
      <span class="src-mono${short.length > 5 ? " long" : ""}" dir="auto" aria-hidden="true">${esc(short)}<span class="src-kind-ico">${svg(SRC_KIND_ICO[src.kind] || I.box)}</span></span>
      <strong dir="auto">${esc(src.name)}</strong>
      <span class="src-k">${esc(t(`sources.k1.${src.kind}`))}</span>
      <small>${esc(t(`src.${src.id}`))}</small>
      <span class="src-foot">${n ? `<span class="src-uses" title="${esc(t("sources.uses_title"))}">${svg(I.check)}${esc(tn("sources.uses", n))}</span>` : "<span></span>"}<span aria-hidden="true">↗</span></span>
    </a>`;
  };
  const themes = srcFilter === "all" ? SRC_THEMES : [srcFilter];
  let i = 0;
  $("sourceList").innerHTML = `<div class="src-stats">${SRC_THEMES.map((th) =>
      `<button type="button" class="src-stat st-${th}" data-src-f="${th}"><span class="src-stat-ico">${svg(SRC_THEME_ICO[th])}</span><b>${count(th)}</b><small>${esc(t(`sources.t.${th}`))}</small></button>`).join("")}</div>
    <div class="chips filter src-chips" role="tablist">${chips}</div>
    ${themes.map((th) => `<section class="src-sec">
      <h3 class="src-sec-t"><span class="src-sec-ico st-${th}">${svg(SRC_THEME_ICO[th])}</span><span><strong>${esc(t(`sources.t.${th}`))}</strong><small>${esc(t(`sources.td.${th}`))}</small></span></h3>
      <div class="src-grid">${SOURCES.filter((src) => srcTheme(src) === th).map((src) => card(src, i++)).join("")}</div></section>`).join("")}
    <p class="src-how">${svg(I.bulb)}<span>${esc(t("sources.how"))}</span></p>`;
}
$("sourceList").addEventListener("click", (e) => {
  const f = e.target.closest("[data-src-f]");
  if (!f) return;
  srcFilter = srcFilter === f.dataset.srcF && f.classList.contains("src-stat") ? "all" : f.dataset.srcF;
  renderSources();
});

// Point par point : replié par défaut, avec recherche ; les points modifiés passent en tête
function renderTopics() {
  const st = prefs();
  const base = SCHOOLS[st.baseSchool] ? st.baseSchool : "standard";
  const modified = modifiedTopics(st);
  $("topicSummary").textContent = modified.length
    ? tn("settings.topics_modified", modified.length, { s: schoolName(base) })
    : t("settings.topics_none", { s: schoolName(base) });
  $("topicReset").hidden = !modified.length;
  $("topicReset").textContent = t("settings.topics_reset", { s: schoolName(base) });
  const q = normText($("topicSearch").value);
  const match = (topic) => !q || normText(t(`topic.${topic}`)).includes(q);
  const topicRow = (topic) => `<div class="topic${modified.includes(topic) ? " is-mod" : ""}">
      <span class="topic-name" id="tp-${topic}">${t(`topic.${topic}`)}${modified.includes(topic) ? `<span class="mod-tag">${t("settings.topic_modified")}</span>` : ""}</span>
      <div class="seg3 seg-sm" role="radiogroup" aria-labelledby="tp-${topic}">${DECISIONS.map(
        (d) => `<button type="button" role="radio" class="d-${d}" aria-checked="${st.topics[topic] === d}" data-topic="${topic}" data-decision="${d}">${t(`decision.${d}`)}</button>`
      ).join("")}</div>
    </div>`;
  const section = (title, list) => (list.length ? `<p class="topic-group">${title}</p>` + list.map(topicRow).join("") : "");
  const mods = modified.filter(match);
  const rest = TOPICS.filter((x) => match(x) && !modified.includes(x));
  const html =
    section(t("settings.topics_mod_group"), mods) +
    section(t("settings.topics_origin"), rest.filter((x) => !SCHOOL_TOPICS.includes(x))) +
    section(t("settings.topics_school"), rest.filter((x) => SCHOOL_TOPICS.includes(x)));
  $("topicList").innerHTML = html || `<p class="notes">${t("settings.topics_empty")}</p>`;
}
const normText = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
$("topicSearch").addEventListener("input", () => {
  $("topicDetails").open = true;
  renderTopics();
});
$("topicReset").addEventListener("click", () => settings.setSchool(prefs().baseSchool || "standard"));

// Organismes de certification : l'utilisateur choisit ceux qu'il suit
function renderCertifiers() {
  const off = new Set(prefs().distrust);
  $("certList").innerHTML = CERTIFIER_INFO.map((c) => `<div class="cert-row">
      <div class="cert-text"><strong>${esc(c.name)} <span class="cert-country">${c.country}</span></strong><small>${esc(t(`cert.${c.id}.d`))}</small>
        <a href="${esc(searchUrl(c))}" target="_blank" rel="noopener">${t("certs.more")} ↗</a></div>
      <button type="button" class="switch" role="switch" aria-checked="${!off.has(c.id)}" data-trust="${c.id}" aria-label="${esc(t("certs.follow", { org: c.name }))}"><i></i></button>
    </div>`).join("");
}
$("certList").addEventListener("click", (e) => {
  const b = e.target.closest("[data-trust]");
  if (b) settings.toggleTrust(b.dataset.trust);
});

// Apparence : thème et taille du texte
const darkQuery = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;
function applyAppearance() {
  const st = prefs();
  const dark = st.theme === "dark" || (st.theme === "auto" && darkQuery && darkQuery.matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  document.documentElement.dataset.text = st.textSize;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = dark ? "#0F1512" : "#FFFFFF";
}
if (darkQuery) (darkQuery.addEventListener ? darkQuery.addEventListener("change", applyAppearance) : darkQuery.addListener(applyAppearance));
function renderAppearance() {
  const st = prefs();
  $("themeList").innerHTML = THEMES.map(
    (th) => `<button type="button" role="radio" class="theme-card th-${th}" aria-checked="${st.theme === th}" data-theme-choice="${th}">
      <span class="th-art" aria-hidden="true"><i></i><i></i><i></i></span>
      <strong>${t(`theme.${th}`)}</strong>${th === "auto" ? `<small>${t("theme.auto_d")}</small>` : ""}
    </button>`
  ).join("");
  $("textSizeList").style.gridTemplateColumns = "repeat(3,1fr)";
  $("textSizeList").innerHTML = TEXT_SIZES.map(
    (z) => `<button type="button" role="radio" class="ts-${z}" aria-checked="${st.textSize === z}" data-text-size="${z}"><span class="ts-a" aria-hidden="true">A</span>${t(`text.${z}`)}</button>`
  ).join("");
}
$("themeList").addEventListener("click", (e) => {
  const b = e.target.closest("[data-theme-choice]");
  if (b) settings.set({ theme: b.dataset.themeChoice });
});
$("textSizeList").addEventListener("click", (e) => {
  const b = e.target.closest("[data-text-size]");
  if (b) settings.set({ textSize: b.dataset.textSize });
});

// Mes données : chiffres, sauvegarde, effacement (confirmation par un second appui)
let confirmData = null;
function renderDataPage(msg) {
  const all = store.all();
  const stats = [
    [all.length, "data.history"],
    [all.filter((e) => e.fav).length, "data.favs"],
    [basket.all().length, "data.basket"],
    [Object.keys(localProductsAll()).length, "data.local"],
  ];
  $("dataStats").innerHTML = stats.map(([n, k]) => `<div class="data-stat"><strong>${n}</strong><small>${t(k)}</small></div>`).join("");
  $("clearHistoryBtn").textContent = t(confirmData === "history" ? "data.confirm" : "data.clear_history");
  $("resetBtn").textContent = t(confirmData === "reset" ? "data.confirm" : "data.reset");
  $("clearHistoryBtn").classList.toggle("is-confirm", confirmData === "history");
  $("resetBtn").classList.toggle("is-confirm", confirmData === "reset");
  if (msg !== undefined) $("dataStatus").textContent = msg;
}
const LOCAL_KEY_APP = "halalscan_local_v1";
function localProductsAll() {
  try { return JSON.parse(localStorage.getItem(LOCAL_KEY_APP)) || {}; } catch { return {}; }
}
$("clearHistoryBtn").addEventListener("click", () => {
  if (confirmData !== "history") { confirmData = "history"; return renderDataPage(""); }
  confirmData = null;
  store.clear({ keepFavs: true });
  renderDataPage(t("data.cleared"));
});
$("resetBtn").addEventListener("click", () => {
  if (confirmData !== "reset") { confirmData = "reset"; return renderDataPage(""); }
  confirmData = null;
  settings.reset();
  renderDataPage(t("data.reset_done"));
});
// Comprendre les notes : un onglet par type de note
$("notesTabs").addEventListener("click", (e) => {
  const b = e.target.closest("[data-notes]");
  if (!b) return;
  document.querySelectorAll("#notesTabs button").forEach((x) => x.setAttribute("aria-selected", String(x === b)));
  document.querySelectorAll("[data-notes-of]").forEach((el) => (el.hidden = el.dataset.notesOf !== b.dataset.notes));
});

$("langGrid").addEventListener("click", (e) => {
  const b = e.target.closest("[data-lang]");
  if (b) settings.set({ lang: b.dataset.lang });
});
// ---------------------------------------------------------------------------
// Réglage modifié : on montre qu'il a bien été pris en compte. Un court « mise à jour… »,
// puis ce qui a été enregistré.
// ---------------------------------------------------------------------------
let settingTimer = 0;
function toastState(state, text) {
  const el = $("toast");
  el.className = `toast ${state}`;
  el.innerHTML = `${state === "busy" ? '<span class="spinner light"></span>' : `<span class="t-ok">${svg(I.check)}</span>`}<span>${esc(text)}</span>`;
  el.hidden = false;
  clearTimeout(toastTimer);
  if (state !== "busy") toastTimer = setTimeout(() => { el.hidden = true; el.className = "toast"; }, 3200);
}
function applySetting(change, { saved, flash }) {
  change();
  // La commande touchée s'illumine (elle vient d'être redessinée)
  requestAnimationFrame(() => {
    const el = flash && document.querySelector(flash);
    if (el) { el.classList.remove("set-flash"); void el.offsetWidth; el.classList.add("set-flash"); }
  });
  tapHaptic(10);
  toastState("busy", t("set.applying"));
  clearTimeout(settingTimer);
  settingTimer = setTimeout(() => toastState("ok", saved), REDUCED() ? 0 : 650);
}
$("dietList").addEventListener("click", (e) => {
  const b = e.target.closest("[data-diet]");
  if (!b || b.getAttribute("aria-checked") === "true") return;
  const d = b.dataset.diet || null;
  applySetting(() => settings.setDiet(d), { saved: t("set.diet", { x: t(d ? `diet.${d}` : "diet.none") }), flash: `#dietList [data-diet="${d || ""}"]` });
});
$("allergenList").addEventListener("click", (e) => {
  const b = e.target.closest("[data-allergen]");
  if (!b) return;
  const a = b.dataset.allergen, on = b.getAttribute("aria-checked") !== "true";
  applySetting(() => settings.toggleAllergen(a), { saved: t(on ? "set.allergen_on" : "set.allergen_off", { x: t(`allergen.${a}`) }), flash: `#allergenList [data-allergen="${a}"]` });
});
// Profils de la famille
let familyOpen = null;
function renderFamily() {
  const st = prefs();
  $("familyBadge").hidden = !premiumEnabled() || isPremium();
  $("familyList").innerHTML = st.members.map((m) => {
    const sum = [m.diet ? t(`diet.${m.diet}`) : null, ...m.allergens.map((a) => t(`allergen.${a}`))].filter(Boolean).join(" · ") || t("family.none");
    return `<details class="fam" data-member="${esc(m.id)}"${familyOpen === m.id ? " open" : ""}>
      <summary><span class="fam-av" aria-hidden="true">${esc(m.name.charAt(0).toUpperCase())}</span><span class="fam-t"><strong>${esc(m.name)}</strong><small>${esc(sum)}</small></span><span class="src-chev" aria-hidden="true">${svg(I.chev)}</span></summary>
      <div class="fam-body">
        <h4 class="sub-label">${t("settings.diet")}</h4>
        <div class="seg3" role="radiogroup" style="grid-template-columns:repeat(3,1fr)">${[null, ...DIETS].map((d) => `<button type="button" role="radio" class="d-diet" aria-checked="${(m.diet || null) === d}" data-mdiet="${d || ""}">${t(d ? `diet.${d}` : "diet.none")}</button>`).join("")}</div>
        <h4 class="sub-label">${t("settings.allergens")}</h4>
        <div class="chips">${PROFILE_ALLERGENS.map((a) => `<button type="button" role="checkbox" class="chip allergen-chip" aria-checked="${m.allergens.includes(a)}" data-mallergen="${a}">${esc(t(`allergen.${a}`))}</button>`).join("")}</div>
        <button type="button" class="link-btn danger" data-mremove>${esc(t("family.remove", { name: m.name }))}</button>
      </div>
    </details>`;
  }).join("");
  $("familyAdd").hidden = st.members.length >= 8;
}
$("familyList").addEventListener("toggle", (e) => {
  const d = e.target.closest("[data-member]");
  if (d) familyOpen = d.open ? d.dataset.member : familyOpen === d.dataset.member ? null : familyOpen;
}, true);
$("familyList").addEventListener("click", (e) => {
  const box = e.target.closest("[data-member]");
  if (!box) return;
  const id = box.dataset.member;
  const name = (prefs().members.find((m) => m.id === id) || {}).name || "";
  const d = e.target.closest("[data-mdiet]");
  if (d) {
    if (d.getAttribute("aria-checked") === "true") return;
    const v = d.dataset.mdiet || null;
    return applySetting(() => settings.setMemberDiet(id, v), { saved: t("set.member", { name, x: t(v ? `diet.${v}` : "diet.none") }), flash: `[data-member="${id}"] [data-mdiet="${v || ""}"]` });
  }
  const a = e.target.closest("[data-mallergen]");
  if (a) {
    const al = a.dataset.mallergen, on = a.getAttribute("aria-checked") !== "true";
    return applySetting(() => settings.toggleMemberAllergen(id, al), { saved: t("set.member", { name, x: `${on ? "+" : "−"} ${t(`allergen.${al}`)}` }), flash: `[data-member="${id}"] [data-mallergen="${al}"]` });
  }
  if (e.target.closest("[data-mremove]")) settings.removeMember(id);
});
$("familyAdd").addEventListener("submit", (e) => {
  e.preventDefault();
  if (!requirePremium("family")) return;
  const id = settings.addMember($("familyName").value);
  if (id) {
    familyOpen = id;
    $("familyName").value = "";
    renderFamily();
  }
});

$("schoolList").addEventListener("click", (e) => {
  const b = e.target.closest("[data-school]");
  if (!b || b.dataset.school === "custom" || b.getAttribute("aria-checked") === "true") return;
  const sc = b.dataset.school;
  applySetting(() => settings.setSchool(sc), { saved: t("set.school", { x: schoolName(sc) }), flash: `#schoolList [data-school="${sc}"]` });
});
$("topicList").addEventListener("click", (e) => {
  const b = e.target.closest("[data-topic]");
  if (!b || b.getAttribute("aria-checked") === "true") return;
  const { topic, decision } = b.dataset;
  applySetting(() => settings.setTopic(topic, decision), { saved: t("set.topic", { x: `${t(`topic.${topic}`)} → ${t(`decision.${decision}`).toLowerCase()}` }),
    flash: `#topicList [data-topic="${topic}"][data-decision="${decision}"]` });
});

// Pack hors connexion
let packing = false;
function renderOfflineStatus(progress, med) {
  const st = prefs();
  const btn = $("offlineBtn");
  btn.disabled = packing;
  btn.textContent = t(st.offlinePackAt ? "settings.offline_update" : "settings.offline_btn");
  $("offlineStatus").textContent =
    progress !== undefined
      ? med !== undefined
        ? t("settings.offline_progress_med", { n: med })
        : t("settings.offline_progress", { n: progress })
      : st.offlinePackAt
        ? t("settings.offline_done", { n: st.offlinePackCount, d: new Date(st.offlinePackAt).toLocaleDateString(locale(), { day: "numeric", month: "long" }) }) +
          (st.offlineMedCount ? " " + t("settings.offline_meds", { n: st.offlineMedCount.toLocaleString(locale()) }) : "")
        : "";
}
$("offlineBtn").addEventListener("click", async () => {
  if (packing) return;
  if (!requirePremium("offline")) return;
  if (!("caches" in window) || !("serviceWorker" in navigator)) {
    $("offlineStatus").textContent = t("settings.offline_unsupported");
    return;
  }
  packing = true;
  renderOfflineStatus(0);
  try {
    getDetector().catch(() => {}); // garde aussi le lecteur de codes-barres en cache
    const { count: n, medCount } = await off.offlinePack({ onProgress: (count, _t, med) => renderOfflineStatus(count, med) });
    packing = false;
    settings.set({ offlinePackAt: Date.now(), offlinePackCount: n, offlineMedCount: medCount });
  } catch {
    packing = false;
    renderOfflineStatus();
    $("offlineStatus").textContent = t("settings.offline_error");
  }
});

// Changement de réglage : tout ce qui est affiché est recalculé
settings.subscribe((st, patch) => {
  if (patch.theme || patch.textSize || patch.reset || patch.imported) applyAppearance();
  if (patch.lang) {
    setLang(st.lang);
    applyStatic();
    renderSuggestions();
  }
  renderSettings();
  if (current === "scan") renderHome();
  if (current === "history") renderHistory();
  if (current === "additives") renderAdditives();
  if (current === "search") renderResults($("searchInput").value.trim());
  if (patch.lang && current === "search" && !$("searchInput").value.trim()) renderSuggestions();
  if (!sheet.hidden && sheetProduct) {
    const top = $("sheetBody").scrollTop;
    renderSheetProduct(sheetProduct);
    if (!sheetProduct.local) loadAlternatives(sheetProduct, sheetCode);
    $("sheetBody").scrollTop = top;
  }
});

// ===========================================================================
// Navigation
// ===========================================================================
const TABS = ["scan", "search", "history", "additives", "settings", "places", "rankings"];
let previousTab = null;
let current = null;

// Bouton central : depuis un autre onglet il ramène à l'accueil ; sur l'accueil il ouvre la caméra.
$("tabScan").addEventListener("click", (e) => {
  if (current !== "scan") return;
  e.preventDefault();
  if (navigator.vibrate) navigator.vibrate(15);
  openCamera();
});

function showTab(name) {
  const [main, sub] = String(name || "").split("/");
  name = main;
  if (name === "infos") name = "settings"; // ancienne adresse
  if (!TABS.includes(name)) name = "scan";
  const wasSettings = current === "settings";
  const prevName = current;
  // L'écran arrive du côté de l'onglet touché (de droite si on va vers la droite de la barre)
  const ORDER = ["search", "history", "scan", "additives", "settings"];
  const from = ORDER.indexOf(prevName), to = ORDER.indexOf(name);
  const dir = from < 0 || to < 0 ? "next" : to >= from ? "next" : "prev";
  document.querySelectorAll(".view").forEach((v) => {
    const show = v.dataset.view === name;
    if (show && v.hidden && previousTab !== null && !REDUCED()) {
      v.classList.remove("enter-next", "enter-prev");
      v.hidden = false;
      void v.offsetWidth; // relance l'animation
      v.classList.add(`enter-${dir}`);
    }
    v.hidden = !show;
  });
  previousTab = name;
  current = name;
  document.querySelectorAll(".tab").forEach((tab) =>
    tab.dataset.tab === name ? tab.setAttribute("aria-current", "page") : tab.removeAttribute("aria-current")
  );
  if (name === "scan") renderHome();
  if (name === "history") {
    confirmClear = false;
    renderHistory();
  }
  if (name === "additives") renderAdditives();
  if (name === "places") renderPlaces();
  if (name === "rankings") renderRankings(sub);
  if (name === "settings") {
    renderSettings();
    showSetPage(SET_PAGES.includes(sub) ? sub : "menu", { animate: wasSettings });
  }
  $("tabScan").setAttribute("aria-label", t(name === "scan" ? "home.scan" : "tab.scan"));
  window.scrollTo(0, 0);
}

window.addEventListener("hashchange", () => {
  closeAisle({ fromPop: true });
  closeCamera({ fromPop: true });
  closeSheet({ fromPop: true });
  showTab(location.hash.slice(1));
});
window.addEventListener("popstate", (e) => {
  const st = e.state || {};
  if (!st.lb) closeLightbox({ fromPop: true });
  if (st.lb) return;
  if (!st.cam) closeCamera({ fromPop: true });
  if (!st.aisle) closeAisle({ fromPop: true });
  if (!st.sheet) closeSheet({ fromPop: true });
});
document.addEventListener("keydown", (e) => {
  if (lb.el && !lb.el.hidden) {
    if (e.key === "ArrowRight") lbGo(lb.i + 1);
    else if (e.key === "ArrowLeft") lbGo(lb.i - 1);
    else if (e.key === "Escape") closeLightbox();
    return;
  }
  if (e.key !== "Escape") return;
  if (!$("aisle").hidden) closeAisle();
  else if (!cameraEl.hidden) closeCamera();
  else closeSheet();
});
// Caméra rendue au système quand l'app passe en arrière-plan ; relancée au retour.
document.addEventListener("visibilitychange", () => {
  if (!$("aisle").hidden) return document.hidden ? aisle.stop() : aisle.start();
  if (cameraEl.hidden) return;
  if (document.hidden) camera.stop();
  else camera.start();
});

// ===========================================================================
// Connexion et service worker
// ===========================================================================
function renderOnline() {
  $("offlineBadge").hidden = navigator.onLine !== false;
}
window.addEventListener("online", renderOnline);
window.addEventListener("offline", renderOnline);
if ("serviceWorker" in navigator) {
  // updateViaCache "none" : le navigateur ne garde jamais sw.js en mémoire, une nouvelle version est vue tout de suite
  window.addEventListener("load", () => navigator.serviceWorker.register("sw.js", { updateViaCache: "none" }).then((r) => r.update()).catch(() => {}));
  // Nouvelle version installée pendant que l'app est ouverte : on recharge une fois pour l'afficher
  let swReloaded = false;
  const hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!hadController || swReloaded || !sheet.hidden || !cameraEl.hidden) return;
    swReloaded = true;
    location.reload();
  });
}

// ===========================================================================
// Toast
// ===========================================================================
let toastTimer;
function toast(text) {
  const el = $("toast");
  el.className = "toast";
  el.textContent = text;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (el.hidden = true), 2200);
}

// ===========================================================================
// Mode rayon : pastilles en surimpression sur tous les codes-barres visibles
// ===========================================================================
const aisleEl = $("aisle");
const aisleInfo = new Map(); // code -> { status, alert, name, loading }
const aisleMarks = new Map(); // code -> { el, last }
let aisleQueue = [];
let aisleBusy = 0;
const AISLE_ICON = { halal_certifie: "✓", halal_probable: "✓", mashbouh: "?", haram: "✕", inconnu: "–" };

function aisleLookup(code) {
  if (aisleInfo.has(code)) return;
  aisleInfo.set(code, { loading: true });
  aisleQueue.push(code);
  aislePump();
}
// Trois recherches à la fois au plus, pour rester rapide sans surcharger Open Food Facts
function aislePump() {
  while (aisleBusy < 3 && aisleQueue.length) {
    const code = aisleQueue.shift();
    aisleBusy++;
    fetchProduct(code)
      .then((p) => {
        aisleInfo.set(code, p ? { status: verdictOf(p).status, alert: profileOf(p).alert, name: nameOf(p) } : { status: "inconnu", missing: true });
      })
      .catch(() => aisleInfo.delete(code)) // nouvel essai au prochain passage devant la caméra
      .finally(() => {
        aisleBusy--;
        renderAisleMark(code);
        renderAisleStats();
        aislePump();
      });
  }
}

function renderAisleMark(code) {
  const m = aisleMarks.get(code);
  if (!m) return;
  const info = aisleInfo.get(code) || { loading: true };
  const st = info.loading ? "loading" : info.status;
  m.el.className = `aisle-mark v-${st}${info.alert ? " has-alert" : ""}`;
  m.el.innerHTML = `<span class="am-dot">${info.loading ? '<span class="spinner light"></span>' : AISLE_ICON[st] || "–"}</span>${
    info.name ? `<span class="am-name">${esc(info.name)}</span>` : ""}${info.alert ? '<span class="am-alert">!</span>' : ""}`;
  m.el.setAttribute("aria-label", info.loading ? t("msg.loading") : `${info.name || code} : ${S(info.status, "label")}${info.alert ? ", " + t(`alert.${info.alert}`) : ""}`);
}

function renderAisleStats() {
  const counts = {};
  let alerts = 0;
  for (const [, info] of aisleInfo) {
    if (info.loading || info.missing) continue;
    counts[info.status] = (counts[info.status] || 0) + 1;
    if (info.alert) alerts++;
  }
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  $("aisleHint").hidden = total > 0;
  $("aisleStats").innerHTML = total
    ? `<span class="as-total">${esc(tn("aisle.seen", total))}</span>` +
      // Certifié et probable : une seule pastille verte
      [["halal_probable", (counts.halal_certifie || 0) + (counts.halal_probable || 0)], ["mashbouh", counts.mashbouh], ["haram", counts.haram], ["inconnu", counts.inconnu]]
        .filter(([, n]) => n)
        .map(([x, n]) => `<span class="as-chip v-${x}" aria-label="${n} ${esc(S(x, "short"))}">${AISLE_ICON[x]} ${n}</span>`)
        .join("") +
      (alerts ? `<span class="as-chip as-alert">! ${alerts}</span>` : "")
    : "";
}

const aisle = createAisle({
  video: $("aisleVideo"),
  onState(state, detail) {
    aisleEl.dataset.state = state;
    if (state === "error") {
      const kind = ["https", "unsupported", "denied", "nocamera", "decoder"].includes(detail.kind) ? detail.kind : "camera";
      $("aisleErrTitle").textContent = t(`cam.err.${kind}.t`);
      $("aisleErrText").textContent = t(`cam.err.${kind}.p`);
    }
  },
  onFrame(found) {
    const now = Date.now();
    for (const { code, rect } of found) {
      let m = aisleMarks.get(code);
      if (!m) {
        const el = document.createElement("button");
        el.type = "button";
        el.dataset.aisleOpen = code;
        $("aisleLayer").appendChild(el);
        m = { el };
        aisleMarks.set(code, m);
        aisleLookup(code);
        renderAisleMark(code);
        if (navigator.vibrate) navigator.vibrate(12);
      }
      m.last = now;
      // Pastille posée au-dessus du code-barres
      m.el.style.transform = `translate(${Math.round(rect.x + rect.w / 2)}px, ${Math.round(rect.y)}px) translate(-50%, -100%)`;
      m.el.classList.remove("gone");
    }
    // Un code qui n'est plus vu s'efface après un court délai (évite le clignotement)
    for (const [code, m] of aisleMarks) {
      if (now - m.last > 900) m.el.classList.add("gone");
      if (now - m.last > 2500) {
        m.el.remove();
        aisleMarks.delete(code);
      }
    }
  },
});

function openAisle({ replace = false } = {}) {
  if (!requirePremium("aisle")) return;
  if (!cameraEl.hidden) closeCamera({ keepHistory: true });
  aisleEl.hidden = false;
  $("aisleLayer").innerHTML = "";
  aisleMarks.clear();
  aisleInfo.clear();
  aisleQueue = [];
  renderAisleStats();
  if (replace) history.replaceState({ aisle: true }, "");
  else history.pushState({ aisle: true }, "");
  lockScroll();
  aisle.start();
}
function closeAisle({ fromPop = false } = {}) {
  if (aisleEl.hidden) return;
  aisle.stop();
  aisleEl.hidden = true;
  lockScroll();
  if (!fromPop && history.state && history.state.aisle) history.back();
}
$("openAisle").addEventListener("click", () => openAisle());
$("camAisle").addEventListener("click", () => openAisle({ replace: true }));
$("aisleClose").addEventListener("click", () => closeAisle());
$("aisleLayer").addEventListener("click", (e) => {
  const b = e.target.closest("[data-aisle-open]");
  if (!b) return;
  const code = b.dataset.aisleOpen;
  aisle.stop();
  aisleEl.hidden = true;
  openSheet(code, { fromScan: true, replace: true });
});

// ===========================================================================
// Mode courses : scan en rafale, panier et bilan
// ===========================================================================
const BASKET_KEY = "bayyin_basket_v1";
const basket = {
  all() {
    try {
      return JSON.parse(localStorage.getItem(BASKET_KEY)) || [];
    } catch {
      return [];
    }
  },
  save(list) {
    try {
      localStorage.setItem(BASKET_KEY, JSON.stringify(list));
    } catch { /* stockage indisponible */ }
  },
  add(p) {
    const list = this.all().filter((x) => x.code !== p.code);
    list.unshift({ code: p.code, at: Date.now() });
    this.save(list.slice(0, 80));
  },
  clear() {
    this.save([]);
  },
};
let basketMode = false;
const basketProducts = () => basket.all().map((x) => (store.get(x.code) || {}).p || memo.get(x.code)).filter(Boolean);

function renderBasketButtons() {
  const n = basket.all().length;
  $("camBasketMode").setAttribute("aria-pressed", String(basketMode));
  $("camBasketMode").textContent = t(basketMode ? "basket.mode_on" : "basket.mode");
  $("camBasketOpen").hidden = !basketMode || !n;
  $("camBasketOpen").textContent = t("basket.open", { n });
  const badge = $("toolBasketN");
  badge.hidden = !n;
  badge.textContent = n > 99 ? "99+" : String(n);
  $("toolBasket").setAttribute("aria-label", n ? `${t("basket.mode")} · ${tn("basket.count", n)}` : t("basket.mode"));
}

const BURST_COLOR = { halal_certifie: "#3DDC84", halal_probable: "#3DDC84", mashbouh: "#FFB547", haram: "#FF5A4E", inconnu: "#FFFFFF" };
async function basketScan(code) {
  cameraEl.classList.add("found");
  const flash = $("camFlash");
  flash.hidden = false;
  flash.className = "cam-flash";
  flash.textContent = t("msg.loading");
  try {
    const p = await fetchProduct(code);
    if (p) {
      store.add(p);
      basket.add(p);
      const st = verdictOf(p).status;
      const al = profileOf(p).alert;
      flash.className = `cam-flash v-${st}`;
      scanBurst(al === "no" ? BURST_COLOR.haram : BURST_COLOR[st] || BURST_COLOR.inconnu);
      flash.innerHTML = `<strong>${esc(S(st, "label"))}</strong><span>${esc(nameOf(p))}</span>${al ? `<em>${esc(t(`alert.${al}`))}</em>` : ""}`;
      if (navigator.vibrate) navigator.vibrate(st === "haram" || al === "no" ? [60, 60, 60] : 40);
    } else {
      flash.className = "cam-flash v-inconnu";
      flash.textContent = t("msg.notfound.t") + " · " + code;
    }
  } catch {
    flash.className = "cam-flash v-inconnu";
    flash.textContent = t("msg.load_error.t");
  }
  renderBasketButtons();
  // Reprise du scan après un court instant, pour laisser lire le résultat
  setTimeout(() => {
    cameraEl.classList.remove("found");
    if (!cameraEl.hidden && basketMode) camera.start();
  }, 1400);
}

$("camBasketMode").addEventListener("click", () => {
  if (!basketMode && !isPremium()) {
    closeCamera({ keepHistory: true });
    return openPremium("basket");
  }
  basketMode = !basketMode;
  $("camFlash").hidden = true;
  renderBasketButtons();
  toast(t(basketMode ? "basket.on_toast" : "basket.off_toast"));
});
$("camBasketOpen").addEventListener("click", () => {
  closeCamera({ keepHistory: true });
  openBasket({ replace: true });
});
// Panier déjà commencé : on l'ouvre ; sinon on lance la caméra en mode courses
$("toolBasket").addEventListener("click", () => {
  if (basket.all().length) return openBasket();
  if (!requirePremium("basket")) return;
  basketMode = true;
  openCamera();
});

function openBasket({ replace = false } = {}) {
  sheetCode = "basket";
  resetSheetHeader();
  sheetProduct = null;
  $("sheetTitle").textContent = t("basket.title");
  $("sheetCompare").hidden = true;
  $("sheetShare").hidden = true;
  showSheet({ replace });
  refreshFav();
  renderBasket();
}
function renderBasket() {
  const items = basketProducts();
  if (!items.length) {
    $("sheetBody").innerHTML = `<div class="empty">${emptyArt()}<strong>${t("basket.empty.t")}</strong><p>${t("basket.empty.p")}</p><button class="btn btn-primary" type="button" data-basket-scan>${t("basket.start")}</button></div>`;
    return;
  }
  const counts = statusCounts(items);
  const avg = avgScore(items);
  const alerts = items.filter((p) => profileOf(p).alert).length;
  const seen = STATUS_ORDER.filter((x) => counts[x]);
  // Barre empilée : chaque verdict prend sa part du panier, avec son pourcentage quand il y a la place
  const stack = `<div class="stack viz" dir="ltr" role="img" aria-label="${esc(seen.map((x) => `${S(x, "label")} ${pct(counts[x], items.length)} %`).join(", "))}">${seen.map((x, i) =>
    `<i style="flex:${counts[x]};--c:${STATUS_COLOR[x]};--i:${i}">${pct(counts[x], items.length) >= 14 ? `<span>${pct(counts[x], items.length)} %</span>` : ""}</i>`).join("")}</div>`;
  $("sheetBody").innerHTML = `<div class="stats basket-stats">
      <div class="stats-top"><span class="stats-num">${items.length}</span><span class="stats-unit">${esc(tn("basket.count", items.length).replace(/^\d+\s*/, ""))}</span></div>
      ${stack}
      <div class="bar-legend">${seen.map((x) => `<span><i class="dot" style="--c:${STATUS_COLOR[x]}"></i>${counts[x]} ${S(x, "label")}</span>`).join("")}</div>
      ${avg !== null ? `<div class="bilan-sec">${scoreGaugeHtml(avg, t("basket.avg_t"))}</div>` : ""}
      ${alerts ? `<p class="basket-alert">${esc(tn("basket.alerts", alerts))}</p>` : ""}
    </div>
    <div class="list">${items.map((p) => rowHtml(p)).join("")}</div>
    <div class="basket-actions">
      <button class="btn btn-primary" type="button" data-basket-scan>${t("basket.continue")}</button>
      <button class="link-btn danger" type="button" data-basket-clear>${t("basket.clear")}</button>
    </div>`;
  requestAnimationFrame(() => animateGauges());
}

// ===========================================================================
// Comparer deux produits
// ===========================================================================
let compareBase = null;
function pickCompareSecond(base) {
  compareBase = base;
  resetSheetHeader();
  const others = store.all().map((e) => e.p).filter((p) => p.code !== base.code && kindOf(p) === kindOf(base));
  $("sheetTitle").textContent = t("cmp.title");
  $("sheetCompare").hidden = true;
  $("sheetBody").innerHTML = `<p class="lead cmp-intro">${esc(t("cmp.pick", { name: nameOf(base) }))}</p>
    ${others.length ? `<div class="list">${others.map((p) => rowHtml(p).replace('data-open="', 'data-compare="')).join("")}</div>` : `<div class="empty">${emptyArt()}<p>${t("cmp.none")}</p></div>`}`;
  $("sheetBody").scrollTop = 0;
}
$("sheetCompare").addEventListener("click", () => {
  if (!requirePremium("compare")) return;
  if (sheetProduct) pickCompareSecond(sheetProduct);
});
// Depuis l'accueil : choisir d'abord le premier produit dans l'historique
$("toolCompare").addEventListener("click", () => {
  if (!requirePremium("compare")) return;
  sheetCode = "compare";
  sheetProduct = null;
  compareBase = null;
  $("sheetTitle").textContent = t("cmp.title");
  $("sheetCompare").hidden = true;
  $("sheetShare").hidden = true;
  showSheet();
  refreshFav();
  const items = store.all().map((e) => e.p).filter((p) => kindOf(p) !== "medicine");
  $("sheetBody").innerHTML = items.length >= 2
    ? `<p class="lead cmp-intro">${esc(t("cmp.pick_first"))}</p><div class="list">${items.map((p) => rowHtml(p).replace('data-open="', 'data-compare-base="')).join("")}</div>`
    : `<div class="empty">${emptyArt("search")}<strong>${esc(t("cmp.need_two.t"))}</strong><p>${esc(t("cmp.need_two.p"))}</p><button class="btn btn-primary" type="button" data-scan-now>${esc(t("home.scan"))}</button></div>`;
});

let cmpProducts = {};
function showCompare(code) {
  const a = compareBase;
  resetSheetHeader();
  const b = (store.get(code) || {}).p || memo.get(code);
  if (!a || !b) return;
  sheetCode = "compare";
  sheetProduct = null;
  refreshFav();
  $("sheetShare").hidden = true;
  const va = verdictOf(a), vb = verdictOf(b);
  const sa = scoreOf(a), sb = scoreOf(b);
  const nut = (p, id) => {
    const h = p.health;
    const n = h && h.nutrition && [...h.nutrition.negatives, ...h.nutrition.positives].find((x) => x.id === id);
    return n ? `<span class="lv-${n.level} cmp-nut" dir="ltr">${fmt(n.value)} ${esc(n.unit)}<i class="dot"></i></span>` : "—";
  };
  const better = (x, y, lowIsBetter) => (x === null || y === null || x === y ? ["", ""] : (lowIsBetter ? x < y : x > y) ? ["win", ""] : ["", "win"]);
  const val = (p, id) => {
    const h = p.health;
    const n = h && h.nutrition && [...h.nutrition.negatives, ...h.nutrition.positives].find((x) => x.id === id);
    return n ? n.value : null;
  };
  // Deux barres en miroir depuis le centre : on voit qui en a le plus, le meilleur est en vert
  const duel = (x, y, [wa, wb]) => {
    if (x === null || y === null) return "";
    const m = Math.max(x, y) || 1;
    return `<div class="duel" dir="ltr" aria-hidden="true"><span class="duel-l ${wa ? "win" : ""}"><i style="--w:${(x / m) * 100}%"></i></span><span class="duel-r ${wb ? "win" : ""}"><i style="--w:${(y / m) * 100}%"></i></span></div>`;
  };
  // Additifs à risque (aliments) ou ingrédients controversés (cosmétiques)
  const watchCount = (p) => { const h = healthOf(p); return ((h && (h.additives || (h.risks || []).filter((r) => r.level))) || []).length; };
  const rank = { halal_certifie: 4, halal_probable: 3, inconnu: 2, mashbouh: 1, haram: 0 };
  const rows = [
    [t("detail.halal"), `<span class="pill s-${va.status}"><span class="dot"></span>${S(va.status, "short")}</span>`, `<span class="pill s-${vb.status}"><span class="dot"></span>${S(vb.status, "short")}</span>`, better(rank[va.status], rank[vb.status])],
    [t(kindOf(a) === "beauty" ? "detail.cosmetic" : "detail.health"), sa ? `${sa.score}/100` : "—", sb ? `${sb.score}/100` : "—", better(sa && sa.score, sb && sb.score)],
    ...["sugars", "saturated-fat", "salt", "energy", "fiber", "proteins"].map((id) => [t(`nut.${id}`), nut(a, id), nut(b, id), better(val(a, id), val(b, id), !["fiber", "proteins"].includes(id)), duel(val(a, id), val(b, id), better(val(a, id), val(b, id), !["fiber", "proteins"].includes(id)))]),
    [t(kindOf(a) === "beauty" ? "detail.cosmetic_watch" : "detail.watch"), String(watchCount(a)), String(watchCount(b)), better(watchCount(a), watchCount(b), true)],
    [t("detail.nova"), a.health && a.health.nova ? String(a.health.nova.group) : "—", b.health && b.health.nova ? String(b.health.nova.group) : "—",
      better(a.health && a.health.nova && a.health.nova.group, b.health && b.health.nova && b.health.nova.group, true)],
  ];
  // Une ligne sans donnée des deux côtés n'apprend rien : on la retire
  for (let i = rows.length - 1; i >= 0; i--) if (rows[i][1] === "—" && rows[i][2] === "—") rows.splice(i, 1);
  const alA = profileOf(a).alert, alB = profileOf(b).alert;
  if (alA || alB) rows.push([t("settings.profile"), alA ? `<span class="pill a-${alA}">${t(`alert.short.${alA}`)}</span>` : "✓", alB ? `<span class="pill a-${alB}">${t(`alert.short.${alB}`)}</span>` : "✓", better(alA ? 0 : 1, alB ? 0 : 1)]);
  cmpProducts = { [a.code]: a, [b.code]: b };
  // En-tête de chaque produit : verdict en bandeau (comme les alternatives), photo agrandissable, nom qui ouvre la fiche
  const head = (p) => {
    const st = verdictOf(p).status;
    const img = p.image
      ? `<button type="button" class="cmp-img" data-zoom-code="${esc(p.code)}" aria-label="${esc(t("zoom.open"))}"><img src="${esc(p.image)}" alt="" referrerpolicy="no-referrer"><span class="p-img-zoom">${svg('<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4 4M11 8.5v5M8.5 11h5"/>')}</span></button>`
      : phArt(p, "cmp-img");
    return `<div class="cmp-head"><span class="alt-band s-${st}">${svg(STATUS_ICON[st])}<span>${esc(S(st, "label"))}</span></span>${img}
      <button type="button" class="cmp-name" data-open="${esc(p.code)}"><strong>${esc(nameOf(p))}</strong><small>${esc(p.brand || "")}</small><span class="cmp-see">${t("cmp.see")} ${svg(I.chev, "flip")}</span></button></div>`;
  };
  $("sheetTitle").textContent = t("cmp.title");
  $("sheetBody").innerHTML = `<div class="cmp">
    <div class="cmp-heads">${head(a)}${head(b)}</div>
    <div class="cmp-table">${rows
      .map(([label, x, y, [wa, wb], bars = ""]) => `<div class="cmp-row"><span class="cmp-label">${esc(label)}</span><span class="cmp-cell ${wa}">${x}</span><span class="cmp-cell ${wb}">${y}</span>${bars}</div>`)
      .join("")}</div>
    <p class="notes cmp-note">${t("cmp.note")}</p>
  </div>`;
  $("sheetBody").scrollTop = 0;
}

// ===========================================================================
// Accueil guidé : langue, école, profil (une seule fois, au premier lancement)
// ===========================================================================
let obStep = 0;
function renderOnboard() {
  const st = prefs();
  document.querySelectorAll("#obDots i").forEach((d, i) => d.classList.toggle("on", i === obStep));
  const head = (title, text) => `<span class="ob-mascot">${mascot(["hello", "teach", "bravo"][obStep] || "hello", { size: 96 })}</span><h2 id="obTitle">${title}</h2><p class="muted">${text}</p>`;
  if (obStep === 0) {
    $("obBody").innerHTML = head(t("ob.1.t"), t("ob.1.p")) +
      `<div class="lang-grid" role="radiogroup">${LANGS.map((l) => `<button type="button" role="radio" class="lang-btn" aria-checked="${st.lang === l}" data-ob-lang="${l}" lang="${l}">${LANG_NAMES[l]}</button>`).join("")}</div>`;
  } else if (obStep === 1) {
    $("obBody").innerHTML = head(t("ob.2.t"), t("ob.2.p")) +
      `<div class="school-list" role="radiogroup">${Object.keys(SCHOOLS).map((sc) => `<button type="button" role="radio" class="school" aria-checked="${st.school === sc}" data-ob-school="${sc}">
        <span class="radio" aria-hidden="true"></span><span class="school-text"><strong>${t(`school.${sc}`)}</strong><small>${t(`school.${sc}.d`)}</small></span></button>`).join("")}</div>`;
  } else {
    $("obBody").innerHTML = head(t("ob.3.t"), t("ob.3.p")) +
      `<h3 class="sub-label">${t("settings.diet")}</h3><div class="seg3" role="radiogroup">${[null, ...DIETS].map((d) => `<button type="button" role="radio" class="d-diet" aria-checked="${(st.profile.diet || null) === d}" data-ob-diet="${d || ""}">${t(d ? `diet.${d}` : "diet.none")}</button>`).join("")}</div>
      <h3 class="sub-label">${t("settings.allergens")}</h3><div class="chips">${PROFILE_ALLERGENS.map((a) => `<button type="button" role="checkbox" class="chip allergen-chip" aria-checked="${st.profile.allergens.includes(a)}" data-ob-allergen="${a}">${esc(t(`allergen.${a}`))}</button>`).join("")}</div>`;
  }
  $("obNext").textContent = t(obStep === 2 ? "ob.start" : "ob.next");
}
function openOnboard() {
  obStep = 0;
  $("onboard").hidden = false;
  renderOnboard();
}
function closeOnboard() {
  $("onboard").hidden = true;
  settings.set({ onboarded: true });
  if (!prefs().tourDone) setTimeout(startTour, 350);
}
$("obNext").addEventListener("click", () => {
  if (obStep < 2) {
    obStep++;
    renderOnboard();
    $("obBody").scrollTop = 0;
  } else closeOnboard();
});
$("obSkip").addEventListener("click", closeOnboard);
$("obBody").addEventListener("click", (e) => {
  const b = e.target.closest("[data-ob-lang],[data-ob-school],[data-ob-diet],[data-ob-allergen]");
  if (!b) return;
  if (b.dataset.obLang) settings.set({ lang: b.dataset.obLang });
  else if (b.dataset.obSchool) settings.setSchool(b.dataset.obSchool);
  else if (b.dataset.obAllergen) settings.toggleAllergen(b.dataset.obAllergen);
  else settings.setDiet(b.dataset.obDiet || null);
});
settings.subscribe(() => {
  if (!$("onboard").hidden) renderOnboard();
});


// ===========================================================================
// Commerces halal autour de moi (OpenStreetMap)
// ===========================================================================
const IOS = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const PLACE_ICON = {
  butcher: '<path d="M14.5 4.2c3 .6 5.3 3.4 4.9 6.6-.5 3.6-4 6.4-7.9 6.2l-3.1 3.1a1.6 1.6 0 1 1-2.3-2.3l3.1-3.1c-.4-3.4 1.4-7 4.4-8.9.3-.2.6-.4.9-.6z"/><circle cx="14.6" cy="10.4" r="1.6"/>',
  restaurant: '<path d="M7 3v7a2 2 0 0 0 4 0V3M9 12v9M16.5 3C14.8 3 13.5 5 13.5 8s1.3 4 3 4v9"/>',
  grocery: '<path d="M3.5 5.5h2.2l2 10.5h9.5l2.2-7.5H6.6"/><circle cx="9.5" cy="19.5" r="1.3"/><circle cx="16.5" cy="19.5" r="1.3"/>',
  bakery: '<path d="M4 15c0-4.4 3.6-8 8-8s8 3.6 8 8v2H4z"/><path d="M9 9.5l1 5M15 9.5l-1 5M12 8v6.5"/>',
  other: '<path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.4"/>',
};
const placesState = { center: null, label: "", radius: 3000, cat: "all", list: [], loading: false, error: "", selected: null };
let leafletReady = null;
let placesMap = null;
let placesLayer = null;

function loadLeaflet() {
  if (window.L) return Promise.resolve(window.L);
  if (leafletReady) return leafletReady;
  leafletReady = new Promise((resolve, reject) => {
    const css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(css);
    const js = document.createElement("script");
    js.src = "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js";
    js.onload = () => resolve(window.L);
    js.onerror = () => { leafletReady = null; reject(new Error("leaflet")); };
    document.head.appendChild(js);
  });
  return leafletReady;
}

const fmtDistance = (m) =>
  m < 950 ? `${Math.max(10, Math.round(m / 10) * 10)} m` : `${(m / 1000).toLocaleString(locale(), { maximumFractionDigits: m < 9950 ? 1 : 0 })} km`;
const placesVisible = () => placesState.list.filter((p) => placesState.cat === "all" || p.cat === placesState.cat);

function placeCard(p) {
  const title = p.name || t(`places.cat.${p.cat}`);
  const tags = [
    `<span class="pill ${p.halal === "only" ? "s-halal_certifie" : "s-halal_probable"}"><span class="dot"></span>${t(p.halal === "only" ? "places.only" : "places.yes")}</span>`,
    p.cert ? `<span class="pill r-info">${esc(t("places.cert", { c: p.cert }))}</span>` : "",
  ].join("");
  return `<article class="place${placesState.selected === p.id ? " is-selected" : ""}" data-place="${esc(p.id)}">
    <span class="place-ico pc-${p.cat}">${svg(PLACE_ICON[p.cat])}</span>
    <div class="place-body">
      <button type="button" class="place-head" data-focus="${esc(p.id)}"><strong>${esc(title)}</strong><small>${t(`places.cat.${p.cat}`)} · <span dir="ltr">${fmtDistance(p.distance)}</span></small></button>
      <div class="place-tags">${tags}</div>
      ${p.address ? `<p class="place-line">${esc(p.address)}</p>` : ""}
      ${p.hours ? `<p class="place-line place-hours" dir="ltr">${esc(p.hours)}</p>` : ""}
      <div class="place-actions">
        <a class="btn btn-soft btn-sm" href="${esc(directionsUrl(p, IOS))}" target="_blank" rel="noopener">${t("places.directions")}</a>
        ${p.phone ? `<a class="btn btn-soft btn-sm" href="tel:${esc(p.phone.replace(/[^\d+]/g, ""))}">${t("places.call")}</a>` : ""}
        ${p.website ? `<a class="btn btn-soft btn-sm" href="${esc(/^https?:/.test(p.website) ? p.website : "https://" + p.website)}" target="_blank" rel="noopener">${t("places.website")}</a>` : ""}
        <a class="link-btn place-osm" href="${esc(osmUrl(p))}" target="_blank" rel="noopener">${t("places.osm")}</a>
      </div>
    </div>
  </article>`;
}

function renderPlaces() {
  const st = placesState;
  $("placesRadius").innerHTML = RADII.map(
    (r) => `<button type="button" role="radio" class="chip" aria-checked="${st.radius === r}" aria-selected="${st.radius === r}" data-radius="${r}">${r / 1000} km</button>`
  ).join("");
  const counts = Object.fromEntries(CATEGORIES.map((c) => [c, st.list.filter((p) => p.cat === c).length]));
  $("placesCats").innerHTML = st.list.length
    ? ["all", ...CATEGORIES.filter((c) => counts[c])]
        .map((c) => `<button type="button" class="chip" aria-selected="${st.cat === c}" data-pcat="${c}">${t(c === "all" ? "places.all" : `places.cats.${c}`)} <small>${c === "all" ? st.list.length : counts[c]}</small></button>`)
        .join("")
    : "";
  const vis = placesVisible();
  $("placesStatus").innerHTML = st.loading
    ? `<span class="spinner"></span> ${t("places.loading")}`
    : st.error
      ? esc(st.error)
      : st.center
        ? esc(tn("places.found", vis.length, { where: st.label, r: st.radius / 1000 }))
        : "";
  if (!st.center && !st.loading && !st.error) {
    $("placesList").innerHTML = `<div class="places-empty">${mascot("search", { size: 96 })}<p>${esc(t("places.intro"))}</p></div>`;
    $("placesLocate").disabled = false;
    return updatePlacesMap();
  }
  $("placesList").innerHTML = st.center && !st.loading && !st.error && !vis.length
    ? `<div class="empty"><strong>${t("places.empty_t")}</strong><p>${t("places.empty_p")}</p></div>`
    : st.loading && !vis.length ? rowsSkeleton(4, t("places.loading")) : vis.map(placeCard).join("");
  $("placesLocate").disabled = st.loading;
  updatePlacesMap();
}

async function updatePlacesMap() {
  const st = placesState;
  if (!st.center) { $("placesMap").hidden = true; return; }
  $("placesMap").hidden = false;
  let L;
  try { L = await loadLeaflet(); } catch { $("placesMap").hidden = true; return; }
  if (!placesMap) {
    placesMap = L.map("placesMap", { zoomControl: false, attributionControl: true }).setView([st.center.lat, st.center.lon], 14);
    L.control.zoom({ position: "bottomright" }).addTo(placesMap);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>',
    }).addTo(placesMap);
    placesLayer = L.layerGroup().addTo(placesMap);
  }
  placesLayer.clearLayers();
  L.marker([st.center.lat, st.center.lon], { icon: L.divIcon({ className: "pm-me", html: "<i></i>", iconSize: [18, 18] }), interactive: false }).addTo(placesLayer);
  const vis = placesVisible();
  const pts = [[st.center.lat, st.center.lon]];
  for (const p of vis) {
    const m = L.marker([p.lat, p.lon], {
      icon: L.divIcon({ className: "pm", html: `<span class="pm-pin pm-${p.halal}${st.selected === p.id ? " is-selected" : ""}">${svg(PLACE_ICON[p.cat])}</span>`, iconSize: [34, 34], iconAnchor: [17, 32] }),
      title: p.name || t(`places.cat.${p.cat}`),
    });
    m.on("click", () => selectPlace(p.id, { fromMap: true }));
    m.addTo(placesLayer);
    pts.push([p.lat, p.lon]);
  }
  setTimeout(() => {
    placesMap.invalidateSize();
    if (!st.selected) {
      if (pts.length > 1) placesMap.fitBounds(pts.slice(0, 40), { padding: [28, 28], maxZoom: 16 });
      else placesMap.setView([st.center.lat, st.center.lon], 14);
    }
  }, 60);
}

function selectPlace(id, { fromMap = false } = {}) {
  placesState.selected = id;
  const p = placesState.list.find((x) => x.id === id);
  renderPlaces();
  if (p && placesMap) placesMap.setView([p.lat, p.lon], Math.max(placesMap.getZoom(), 16), { animate: true });
  const card = document.querySelector(`.place[data-place="${CSS.escape(id)}"]`);
  if (card && fromMap) card.scrollIntoView({ behavior: "smooth", block: "center" });
  if (!fromMap) $("placesMap").scrollIntoView({ behavior: "smooth", block: "start" });
}

let placesJob = 0;
async function searchPlaces(lat, lon, label) {
  const job = ++placesJob;
  const radius = placesState.radius;
  Object.assign(placesState, { center: { lat, lon }, label, loading: true, error: "", selected: null, cat: "all" });
  renderPlaces();
  let res = null;
  try {
    res = await fetchPlaces(lat, lon, radius);
    if (job !== placesJob) return;
    placesState.list = res.list;
  } catch {
    if (job !== placesJob) return;
    placesState.list = [];
    placesState.error = t("places.error");
  }
  placesState.loading = false;
  renderPlaces();
  // Rien dans les données de la semaine : on vérifie quand même en direct, sans bloquer l'écran
  if (res && res.source === "local" && !res.list.length) {
    try {
      const fresh = await livePlaces(lat, lon, radius);
      if (job === placesJob && fresh.list.length) { placesState.list = fresh.list; renderPlaces(); }
    } catch { /* on garde le résultat local */ }
  }
}

$("placesLocate").addEventListener("click", () => {
  if (!navigator.geolocation) { placesState.error = t("places.geo_unsupported"); return renderPlaces(); }
  placesState.loading = true;
  placesState.error = "";
  renderPlaces();
  navigator.geolocation.getCurrentPosition(
    (pos) => searchPlaces(pos.coords.latitude, pos.coords.longitude, t("places.around_me")),
    (err) => {
      placesState.loading = false;
      placesState.error = t(err && err.code === 1 ? "places.geo_denied" : "places.geo_error");
      renderPlaces();
    },
    { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 }
  );
});
$("placesCityForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const q = $("placesCity").value.trim();
  if (!q) return;
  $("placesCity").blur();
  placesState.loading = true;
  placesState.error = "";
  renderPlaces();
  try {
    const g = await geocode(q, getLang());
    if (!g) throw new Error("none");
    await searchPlaces(g.lat, g.lon, q);
  } catch {
    placesState.loading = false;
    placesState.error = t("places.city_error", { q });
    renderPlaces();
  }
});
$("placesRadius").addEventListener("click", (e) => {
  const b = e.target.closest("[data-radius]");
  if (!b) return;
  placesState.radius = Number(b.dataset.radius);
  if (placesState.center) searchPlaces(placesState.center.lat, placesState.center.lon, placesState.label);
  else renderPlaces();
});
$("placesCats").addEventListener("click", (e) => {
  const b = e.target.closest("[data-pcat]");
  if (!b) return;
  placesState.cat = b.dataset.pcat;
  placesState.selected = null;
  renderPlaces();
});
$("placesList").addEventListener("click", (e) => {
  const b = e.target.closest("[data-focus]");
  if (b) selectPlace(b.dataset.focus);
});

// ===========================================================================
// Classements : les meilleurs produits halal de chaque rayon (#rankings, #rankings/<rayon>)
// ===========================================================================
let rankKind = "food";
let rankCertOnly = false;
let rankJob = 0;
const rankLocked = (c) => !c.free && premiumEnabled() && !isPremium();
const rankIco = (id) => `<span class="rank-ico ri-${RANK_BY_ID[id].kind}">${svg(RANK_ICONS[id] || I.box)}</span>`;

async function renderRankings(sub) {
  const box = $("rankBody");
  const job = ++rankJob;
  const cat = sub && RANK_BY_ID[sub];
  $("rankBack").setAttribute("href", cat ? "#rankings" : "#scan");
  $("h-rank").textContent = cat ? t(`rank.cat.${cat.id}`) : t("rank.title");
  if (cat && rankLocked(cat)) {
    // Lien direct vers un rayon Premium : on revient à la liste (sans événement de navigation) et on propose Premium
    history.replaceState(history.state, "", "#rankings");
    renderRankings("");
    return requirePremium("rankings");
  }
  if (!cat) {
    // Liste des rayons
    let index = null;
    try { index = await rankIndex(); } catch { /* hors connexion : liste complète, sans les nombres */ }
    if (job !== rankJob) return;
    const cats = RANK_CATEGORIES.filter((c) => rankTab(c) === rankKind && (!index || index.categories[c.id]));
    box.innerHTML = `<div class="rank-head">${mascot("bravo", { size: 72 })}<p>${esc(t("rank.intro"))}</p></div>
      <div class="segmented" id="rankKinds" role="tablist">${["food", "beauty", "makeup"].map((k) =>
        `<button type="button" role="tab" aria-selected="${k === rankKind}" data-rank-kind="${k}">${t(`rank.kind.${k}`)}</button>`).join("")}</div>
      ${rankKind === "makeup" ? `<p class="rank-note">${esc(t("rank.makeup_note"))}</p>` : ""}
      ${cats.length ? "" : `<div class="empty">${emptyArt("teach")}<p>${esc(t("rank.preparing"))}</p></div>`}
      <div class="rank-cats">${cats.map((c) => `<a class="rank-cat${rankLocked(c) ? " locked" : ""}" href="#rankings/${c.id}" data-rank-cat="${c.id}">${rankIco(c.id)}
        <span class="rank-cat-t"><strong>${esc(t(`rank.cat.${c.id}`))}</strong>${index ? `<small>${esc(tn("rank.n", index.categories[c.id]))}</small>` : ""}</span>
        ${rankLocked(c) ? `<span class="rank-lock" aria-label="${esc(t("premium.only"))}">${svg(I.crown)}</span>` : svg(I.chev, "flip rank-chev")}</a>`).join("")}</div>
      ${index ? `<p class="fineprint start">${esc(t("rank.source", { d: longDate(index.updated) }))}</p>` : ""}`;
    return;
  }
  // Classement d'un rayon
  box.innerHTML = rowsSkeleton(6);
  let raws;
  try { raws = await rankProducts(cat.id); } catch {
    if (job === rankJob) box.innerHTML = messageHtml(t("rank.error.t"), t("rank.error.p"), `<button class="btn btn-primary" type="button" data-rank-retry>${t("msg.retry")}</button>`);
    return;
  }
  if (job !== rankJob) return;
  const list = rankList(raws, {
    present: (raw) => {
      const p = present(raw, prefs());
      memo.set(p.code, p);
      return p;
    },
    scoreOf: (p) => scoreOf(p),
    alertOf: (p) => profileOf(p).alert,
    certifiedOnly: rankCertOnly,
  });
  const st = prefs();
  box.innerHTML = `<div class="chips filter rank-filter" role="tablist">${[false, true].map((on) =>
      `<button type="button" class="chip" role="tab" aria-selected="${rankCertOnly === on}" data-rank-cert="${on ? 1 : 0}">${t(on ? "rank.f.cert" : "rank.f.all")}</button>`).join("")}</div>
    <p class="rank-basis">${esc(t("rank.basis", { school: t(`school.${st.school}`) }))}</p>
    ${list.length
      ? `<ol class="rank-list">${list.slice(0, 50).map((p, i) => {
          const s = scoreOf(p);
          const v = verdictOf(p);
          const img = p.image ? `<img class="row-img" src="${esc(p.image)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : phArt(p, "row-img");
          return `<li><button type="button" class="rank-row" data-open="${esc(p.code)}"><span class="rank-n${i < 3 ? " top" : ""}">${i + 1}</span>${img}
            <span class="rank-t"><strong dir="auto">${esc(nameOf(p))}</strong><small dir="auto">${esc(p.brand || "")}</small>
            <span class="rank-bar g-${s.grade}" style="--w:${s.score}%" aria-hidden="true"><i></i></span>
            <span class="row-tags">${statusPill(v.status)}${alertTag(p)}</span></span>
            <span class="rank-score g-${s.grade}" dir="ltr"><b>${s.score}</b><small>/100</small><i>${esc(t(`grade.${s.grade}`))}</i></span></button></li>`;
        }).join("")}</ol>`
      : `<div class="empty">${emptyArt()}<strong>${esc(t("rank.empty.t"))}</strong><p>${esc(t(rankCertOnly ? "rank.empty.cert" : "rank.empty.p"))}</p></div>`}
    <p class="fineprint start">${esc(t("rank.note"))}</p>`;
}
$("rankBody").addEventListener("click", (e) => {
  const k = e.target.closest("[data-rank-kind]");
  if (k) { rankKind = k.dataset.rankKind; return renderRankings(""); }
  const c = e.target.closest("[data-rank-cat]");
  if (c && rankLocked(RANK_BY_ID[c.dataset.rankCat])) { e.preventDefault(); return requirePremium("rankings"); }
  const f = e.target.closest("[data-rank-cert]");
  if (f) { rankCertOnly = f.dataset.rankCert === "1"; return renderRankings(location.hash.split("/")[1]); }
  if (e.target.closest("[data-rank-retry]")) return renderRankings(location.hash.split("/")[1]);
});

// ===========================================================================
// Produit manquant : l'ajouter à Open Food Facts pour tout le monde
// ===========================================================================
function contributeCard(p) {
  if (!p.local || !/^\d{8,14}$/.test(p.code)) return "";
  if (contributed(p.code)) return `<div class="contrib done">${svg(I.check)}<p><strong>${t("contrib.done_t")}</strong> ${t("contrib.done_p")}</p></div>`;
  const direct = offAccountReady();
  return `<section class="contrib" id="contribBox">
    <div class="contrib-top"><span class="contrib-ico">${svg(I.box)}</span><div><strong>${t(p.raw && (p.raw.ocr_from === "off" || p.raw.nutriments) ? "contrib.t_list" : "contrib.t")}</strong><p>${t("contrib.p")}</p></div></div>
    ${direct
      ? `<label class="contrib-ok"><input type="checkbox" id="contribConsent"><span>${t("contrib.consent")}</span></label>
         <button class="btn btn-primary btn-block" type="button" data-contrib="${esc(p.code)}" disabled>${t("contrib.send")}</button>`
      : `<button class="btn btn-primary btn-block" type="button" data-contrib-web="${esc(p.code)}">${t("contrib.web")}</button>
         <p class="contrib-hint">${t("contrib.web_hint")}</p>`}
    <p class="contrib-msg" id="contribMsg" hidden></p>
  </section>`;
}
$("sheetBody").addEventListener("change", (e) => {
  if (e.target.id === "contribConsent") $("sheetBody").querySelector("[data-contrib]").disabled = !e.target.checked;
});
$("sheetBody").addEventListener("click", async (e) => {
  const web = e.target.closest("[data-contrib-web]");
  if (web) {
    const p = sheetProduct;
    if (p && p.raw && p.raw.ingredients_text) navigator.clipboard?.writeText(p.raw.ingredients_text).then(() => toast(t("contrib.copied")), () => {});
    window.open(addUrl(web.dataset.contribWeb), "_blank", "noopener");
    return;
  }
  const btn = e.target.closest("[data-contrib]");
  if (!btn || !sheetProduct) return;
  const p = sheetProduct;
  btn.disabled = true;
  btn.textContent = t("contrib.sending");
  const name = p.raw.product_name && p.raw.product_name !== t("ocr.unnamed") ? p.raw.product_name : "";
  const r = await contribute({ code: p.code, name, ingredients: p.raw.ingredients_text, photo: ocrPhotos.get(p.code) || null });
  if (r.ok) {
    toast(t("contrib.thanks"));
    if (sheetProduct && sheetProduct.code === p.code) renderSheetProduct(p);
  } else {
    btn.disabled = false;
    btn.textContent = t("contrib.send");
    $("contribMsg").hidden = false;
    $("contribMsg").textContent = t(r.error === "network" ? "contrib.err_network" : "contrib.err");
  }
});

// ===========================================================================
// Donner mon avis : envoyé par e-mail (adresse dans app-config.js) ou déposé sur GitHub
// ===========================================================================
const FEEDBACK_TYPES = ["idea", "bug", "product", "other"];
let fbType = "idea";
let fbRating = 0;
function openFeedback() {
  sheetCode = "feedback";
  sheetProduct = null;
  $("sheetTitle").textContent = t("fb.title");
  $("sheetCompare").hidden = true;
  $("sheetShare").hidden = true;
  showSheet({ replace: !sheet.hidden });
  refreshFav();
  renderFeedback();
}
function renderFeedback() {
  const keep = $("fbText") ? $("fbText").value : "";
  $("sheetBody").innerHTML = `<div class="fb">
    <p class="lead">${t("fb.lead")}</p>
    <div class="fb-stars" role="radiogroup" aria-label="${esc(t("fb.rate"))}">${[1, 2, 3, 4, 5].map((n) => `<button type="button" role="radio" aria-checked="${fbRating === n}" aria-label="${n}/5" data-fb-rate="${n}" class="${n <= fbRating ? "on" : ""}">${svg(I.star)}</button>`).join("")}</div>
    <div class="chips" role="radiogroup">${FEEDBACK_TYPES.map((k) => `<button type="button" role="radio" class="chip" aria-checked="${fbType === k}" aria-selected="${fbType === k}" data-fb-type="${k}">${t(`fb.type.${k}`)}</button>`).join("")}</div>
    <textarea id="fbText" class="field area" rows="6" placeholder="${esc(t(`fb.ph.${fbType}`))}">${esc(keep)}</textarea>
    <button class="btn btn-primary btn-block" type="button" data-fb-send>${t("fb.send")}</button>
    <p class="fineprint">${t(APP.feedbackEmail ? "fb.via_mail" : "fb.via_github")}</p>
  </div>`;
}
$("sheetBody").addEventListener("click", (e) => {
  if (sheetCode !== "feedback") return;
  const r = e.target.closest("[data-fb-rate]");
  if (r) { fbRating = Number(r.dataset.fbRate); return renderFeedback(); }
  const ty = e.target.closest("[data-fb-type]");
  if (ty) { fbType = ty.dataset.fbType; return renderFeedback(); }
  if (!e.target.closest("[data-fb-send]")) return;
  const text = $("fbText").value.trim();
  if (!text && !fbRating) return $("fbText").focus();
  const ua = /iPhone|iPad/.test(navigator.userAgent) ? "iPhone/iPad" : /Android/.test(navigator.userAgent) ? "Android" : "Ordinateur";
  const subject = `Bayyin · ${t(`fb.type.${fbType}`)}${fbRating ? ` · ${fbRating}/5` : ""}`;
  const body = `${text}\n\n—\n${t("fb.type." + fbType)} · ${fbRating ? fbRating + "/5" : "-"} · ${getLang()} · ${ua} · v${APP.version}`;
  const url = APP.feedbackEmail
    ? `mailto:${APP.feedbackEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    : `https://github.com/agozel5/bayyin/issues/new?title=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  window.open(url, "_blank", "noopener");
  toast(t("fb.thanks"));
});
document.addEventListener("click", (e) => {
  if (!e.target.closest("[data-feedback]")) return;
  e.preventDefault();
  openFeedback();
});

// ===========================================================================
// Visite guidée : une bulle par élément important de l'écran d'accueil
// ===========================================================================
const TOUR = [
  { id: "scan", el: () => $("openCamera") },
  { id: "photo", el: () => document.querySelector(".hero-links") },
  { id: "tools", el: () => document.querySelector(".tool-row") },
  { id: "search", el: () => document.querySelector('.tab[data-tab="search"]') },
  { id: "history", el: () => document.querySelector('.tab[data-tab="history"]') },
  { id: "settings", el: () => document.querySelector(".home-top .round-btn") },
  { id: "end", el: () => null },
];
// Au premier produit ouvert : le verdict, les onglets et la photo qu'on peut agrandir
const SHEET_TOUR = [
  { id: "sheet_verdict", el: () => document.querySelector("#sheetBody .verdict") },
  { id: "sheet_tabs", el: () => document.querySelector("#sheetBody .ptabs") },
  { id: "sheet_photo", el: () => document.querySelector("#sheetBody [data-zoom]"), when: () => !!document.querySelector("#sheetBody [data-zoom]") },
];
let tourStep = -1;
let tourSteps = TOUR;
const isSheetTour = () => tourSteps !== TOUR;
function startTour() {
  if (current !== "scan") location.hash = "#scan";
  closeSheet();
  tourSteps = TOUR;
  tourStep = 0;
  $("tour").hidden = false;
  document.body.classList.add("touring");
  $("tourDots").innerHTML = TOUR.map(() => "<i></i>").join("");
  setTimeout(renderTour, 60);
}
function startSheetTour() {
  if (tourStep >= 0 || prefs().sheetTourDone || sheet.hidden || !document.querySelector("#sheetBody .ptabs")) return;
  tourSteps = SHEET_TOUR.filter((s) => !s.when || s.when());
  tourStep = 0;
  $("tour").hidden = false;
  document.body.classList.add("touring");
  $("tourDots").innerHTML = tourSteps.map(() => "<i></i>").join("");
  renderTour();
}
function endTour() {
  const wasSheet = isSheetTour();
  tourStep = -1;
  tourSteps = TOUR;
  $("tour").hidden = true;
  document.body.classList.remove("touring");
  if (wasSheet) { if (!prefs().sheetTourDone) settings.set({ sheetTourDone: true }); return; }
  if (!prefs().tourDone) settings.set({ tourDone: true });
}
// L'élément visé est dans la fiche produit (panneau qui défile) ou dans la page
function scrollIntoTour(el) {
  const r0 = el.getBoundingClientRect();
  if (r0.top >= 70 && r0.bottom <= innerHeight - 90) return;
  const box = el.closest("#sheetBody");
  if (box) box.scrollTop += r0.top - innerHeight / 4;
  else if (!el.closest(".tabbar")) window.scrollBy({ top: r0.top - innerHeight / 3, behavior: "instant" });
}
function renderTour() {
  if (tourStep < 0) return;
  const TOUR = tourSteps;
  const step = TOUR[tourStep];
  const el = step.el();
  const spot = $("tourSpot"), card = $("tourCard");
  $("tourTitle").textContent = t(`tour.${step.id}.t`);
  $("tourText").textContent = t(`tour.${step.id}.p`);
  const last = tourStep === TOUR.length - 1;
  $("tourNext").textContent = t(last ? (isSheetTour() ? "tour.got_it" : "tour.go") : "tour.next");
  $("tourSkip").textContent = t(last ? "tour.close" : "tour.skip");
  $("tourSkip").hidden = last && isSheetTour();
  $("tourDots").querySelectorAll("i").forEach((d, i) => d.classList.toggle("on", i === tourStep));
  card.classList.remove("center");
  if (!el) {
    spot.classList.add("none");
    card.classList.add("center");
    card.style.top = "";
    return;
  }
  spot.classList.remove("none");
  // L'élément visé reste visible : on fait défiler la page si besoin
  scrollIntoTour(el);
  const r = el.getBoundingClientRect();
  const pad = 8;
  Object.assign(spot.style, { top: `${r.top - pad}px`, left: `${r.left - pad}px`, width: `${r.width + pad * 2}px`, height: `${r.height + pad * 2}px` });
  // La bulle se place sous l'élément, ou au-dessus s'il n'y a pas la place
  const h = card.offsetHeight;
  const below = r.bottom + pad + 14;
  card.style.top = below + h < innerHeight - 12 ? `${below}px` : `${Math.max(12, r.top - pad - 14 - h)}px`;
}
$("tourNext").addEventListener("click", () => {
  if (tourStep >= tourSteps.length - 1) {
    const sheetTour = isSheetTour();
    endTour();
    return sheetTour ? null : openCamera();
  }
  tourStep++;
  renderTour();
});
$("tourSkip").addEventListener("click", endTour);
$("tour").addEventListener("click", (e) => {
  if (e.target === $("tour") || e.target === $("tourSpot")) {
    tourStep < tourSteps.length - 1 ? (tourStep++, renderTour()) : endTour();
  }
});
window.addEventListener("resize", () => renderTour());
$("tourReplay").addEventListener("click", startTour);
document.addEventListener("keydown", (e) => {
  if (tourStep >= 0 && e.key === "Escape") endTour();
});

// ===========================================================================
// Bayyin Premium : abonnement (Lemon Squeezy), fonctions réservées, page d'abonnement
// ===========================================================================
// L'essentiel reste gratuit pour tous : verdict halal, notes, rappels, allergies, photo des ingrédients.
const PREMIUM_LIST = [
  ["rankings", '<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M9 20h6M10 17h4"/>'],
  ["aisle", '<path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2"/><circle cx="8.5" cy="10" r="2.2"/><circle cx="15.5" cy="10" r="2.2"/><circle cx="12" cy="16" r="2.2"/>'],
  ["basket", '<path d="M5 8h14l-1.5 11a1 1 0 0 1-1 .9H7.5a1 1 0 0 1-1-.9z"/><path d="M9 8l3-4 3 4"/>'],
  ["compare", '<path d="M7 4L3 8l4 4M3 8h13M17 12l4 4-4 4M21 16H8"/>'],
  ["family", I.family],
  ["offline", '<path d="M12 4v11M7.5 10.5L12 15l4.5-4.5M5 19.5h14"/>'],
  ["history", '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>'],
];
let premiumPlan = "year";
let premiumFocus = "";

function requirePremium(feature) {
  if (isPremium()) return true;
  openPremium(feature);
  return false;
}
function openPremium(feature = "") {
  premiumFocus = feature;
  resetSheetHeader();
  if (!cameraEl.hidden) closeCamera({ keepHistory: true });
  sheetCode = "premium";
  sheetProduct = null;
  $("sheetTitle").textContent = "Bayyin Premium";
  $("sheetCompare").hidden = true;
  $("sheetShare").hidden = true;
  showSheet({ replace: !sheet.hidden });
  refreshFav();
  renderPremiumSheet();
}
function renderPremiumSheet(msg = "") {
  if (sheetCode !== "premium") return;
  const cfg = premiumConfig();
  const st = premiumState();
  const active = premiumEnabled() && isPremium() && st;
  const ready = premiumEnabled();
  const features = `<ul class="pm-features">${PREMIUM_LIST.map(([id, ico]) => `<li class="${premiumFocus === id ? "focus" : ""}"><span class="pm-ico">${svg(ico)}</span><span><strong>${t(`premium.f.${id}`)}</strong><small>${t(`premium.f.${id}.d`)}</small></span></li>`).join("")}</ul>`;
  const free = `<div class="pm-free">${svg(I.shield)}<p><strong>${t("premium.free_t")}</strong> ${t("premium.free_p")}</p></div>`;
  const legal = [cfg.legal.cgv && `<a href="${esc(cfg.legal.cgv)}" target="_blank" rel="noopener">${t("premium.cgv")}</a>`, cfg.legal.mentions && `<a href="${esc(cfg.legal.mentions)}" target="_blank" rel="noopener">${t("premium.mentions")}</a>`].filter(Boolean).join(" · ");
  const manage = cfg.portal ? `<a class="btn btn-soft btn-block" href="${esc(cfg.portal)}" target="_blank" rel="noopener">${t("premium.manage")}</a>` : "";
  if (active) {
    $("sheetBody").innerHTML = `<div class="pm">
      <div class="pm-hero on"><span class="pm-mascot">${mascot("bravo", { size: 84 })}</span>${svg(I.crown)}<h2>${t("premium.active_t")}</h2><p>${t("premium.thanks")}</p></div>
      <dl class="pm-info"><div><dt>${t("premium.key")}</dt><dd dir="ltr">${esc(maskKey(st.key))}</dd></div>
        ${st.email ? `<div><dt>${t("premium.account")}</dt><dd dir="ltr">${esc(st.email)}</dd></div>` : ""}
        ${st.expiresAt ? `<div><dt>${t("premium.until")}</dt><dd>${esc(longDate(st.expiresAt.slice(0, 10)))}</dd></div>` : ""}</dl>
      ${features}
      ${manage}
      <button class="link-btn danger" type="button" data-pm-deactivate>${t("premium.deactivate")}</button>
      ${legal ? `<p class="fineprint">${legal}</p>` : ""}
    </div>`;
    return;
  }
  const can = !!(cfg.checkout.year || cfg.checkout.month);
  const plan = (id, price, sub, badge = "") => (cfg.checkout[id] || !can)
    ? `<button type="button" class="pm-plan" role="radio" aria-checked="${premiumPlan === id}" data-pm-plan="${id}">
        <span class="radio" aria-hidden="true"></span><span class="pm-plan-t"><strong>${t(`premium.plan.${id}`)}</strong><small>${esc(sub)}</small></span>
        <span class="pm-price">${esc(price)}</span>${badge ? `<em>${esc(badge)}</em>` : ""}</button>` : "";
  $("sheetBody").innerHTML = `<div class="pm">
    <div class="pm-hero"><span class="pm-mascot">${mascot("star", { size: 84 })}</span>${svg(I.crown)}<h2>${t("premium.title")}</h2><p>${t("premium.lead")}</p></div>
    ${premiumFocus && ready ? `<p class="pm-focus">${svg(I.lock)}<span>${t(`premium.need.${premiumFocus}`)}</span></p>` : ""}
    ${features}
    <div class="pm-plans" role="radiogroup">
      ${plan("year", cfg.prices.year + t("premium.per_year"), t("premium.year_sub", { p: cfg.prices.yearPerMonth }), t("premium.best"))}
      ${plan("month", cfg.prices.month + t("premium.per_month"), t("premium.month_sub"))}
    </div>
    ${can
      ? `<a class="btn btn-primary btn-block pm-cta" href="${esc(cfg.checkout[premiumPlan] || cfg.checkout.year || cfg.checkout.month)}" target="_blank" rel="noopener">${cfg.trialDays ? esc(t("premium.cta_trial", { n: cfg.trialDays })) : t("premium.cta")}</a>
         <p class="pm-renew">${esc(t(premiumPlan === "month" ? "premium.renew_month" : "premium.renew_year"))}</p>`
      : `<p class="pm-soon">${t("premium.soon")}</p>`}
    ${ready ? `<details class="pm-key"${msg ? " open" : ""}><summary>${t("premium.have_key")}</summary>
      <p class="muted">${t("premium.key_hint")}</p>
      <form class="field-row" id="pmKeyForm" autocomplete="off"><input class="field" id="pmKey" type="text" dir="ltr" spellcheck="false" autocapitalize="characters" placeholder="XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"><button class="btn btn-primary" type="submit">${t("premium.activate")}</button></form>
      ${msg ? `<p class="pm-msg">${esc(msg)}</p>` : ""}
    </details>` : ""}
    ${free}
    ${manage}
    ${legal ? `<p class="fineprint">${legal}</p>` : ""}
  </div>`;
}
function premiumCard() {
  // Avant la mise en vente : la carte est visible, avec « Bientôt disponible », et rien n'est bloqué
  if (!premiumEnabled()) {
    return `<button type="button" class="pm-card" data-premium>${svg(I.crown)}<span><strong>${t("premium.card_t")} <em class="pm-soon-badge">${t("premium.soon_badge")}</em></strong><small>${t("premium.card_p")}</small></span>${svg(I.chev, "flip")}</button>`;
  }
  const on = isPremium();
  return `<button type="button" class="pm-card${on ? " on" : ""}" data-premium>${svg(I.crown)}<span><strong>${on ? t("premium.active_t") : t("premium.card_t")}</strong><small>${on ? t("premium.card_on") : t("premium.card_p")}</small></span>${svg(I.chev, "flip")}</button>`;
}
// Petites couronnes sur les outils réservés
function renderPremiumLocks() {
  const locked = premiumEnabled() && !isPremium();
  [["openAisle", "aisle"], ["toolBasket", "basket"], ["toolCompare", "compare"]].forEach(([id]) => {
    const el = $(id);
    let b = el.querySelector(".tool-lock");
    if (locked && !b) {
      b = document.createElement("span");
      b.className = "tool-lock";
      b.innerHTML = svg(I.crown);
      el.appendChild(b);
    }
    if (b) b.hidden = !locked;
  });
}
$("sheetBody").addEventListener("click", async (e) => {
  const planBtn = e.target.closest("[data-pm-plan]");
  if (planBtn) {
    premiumPlan = planBtn.dataset.pmPlan;
    return renderPremiumSheet();
  }
  if (e.target.closest("[data-pm-deactivate]")) {
    await deactivatePremium();
    toast(t("premium.deactivated"));
    renderPremiumSheet();
  }
});
$("sheetBody").addEventListener("submit", async (e) => {
  if (e.target.id !== "pmKeyForm") return;
  e.preventDefault();
  const btn = e.target.querySelector("button");
  btn.disabled = true;
  btn.textContent = t("premium.checking");
  const r = await activatePremium($("pmKey").value);
  if (r.ok) {
    toast(t("premium.welcome"));
    renderPremiumSheet();
  } else renderPremiumSheet(t(`premium.err.${r.error}`));
});
const applyHistoryLimit = () => store.setMaxRecent(800); // un an gardé pour tous ; l'affichage dépend de Premium
applyHistoryLimit();
onPremiumChange(() => {
  applyHistoryLimit();
  renderPremiumLocks();
  if (current === "settings") renderSettingsMenu();
  if (current === "history") renderHistory();
});
// Lien reçu après l'achat : #premium=CLÉ active directement l'abonnement
function premiumFromHash() {
  const m = location.hash.match(/^#premium(?:=([\w-]{8,}))?$/);
  if (!m) return false;
  history.replaceState(null, "", location.pathname + location.search + "#scan");
  openPremium();
  if (m[1]) {
    setTimeout(() => {
      if ($("pmKey")) {
        $("pmKey").value = m[1];
        $("pmKeyForm").requestSubmit();
      }
    }, 50);
  }
  return true;
}
window.addEventListener("hashchange", premiumFromHash);

// ===========================================================================
// Démarrage
// ===========================================================================
applyAppearance();
setLang(prefs().lang);
applyStatic();
renderSuggestions();
renderOnline();
if (DEMO) $("demoBadge").hidden = false;
showTab(location.hash.slice(1) || "scan");
if (!prefs().onboarded && !DEMO) openOnboard();
else if (!prefs().tourDone && !DEMO && current === "scan") setTimeout(startTour, 700);
renderPremiumLocks();
premiumFromHash();
refreshPremium().catch(() => {});
// Lien partagé (?p=code, aussi dans le QR des cartes) : la fiche du produit s'ouvre directement
{
  const shared = new URLSearchParams(location.search).get("p");
  if (shared && /^[\w-]{4,20}$/.test(shared)) {
    history.replaceState(history.state, "", location.pathname + (DEMO ? "?demo" : "") + location.hash);
    openSheet(shared);
  }
}
// Raccourcis de l'icône (appui long sur l'icône de l'app) : « Scanner » ouvre directement la caméra
{
  const action = new URLSearchParams(location.search).get("action");
  if (action && prefs().onboarded) {
    history.replaceState(history.state, "", location.pathname + location.hash);
    if (action === "scan") openCamera();
    else if (action === "basket") $("toolBasket").click();
  }
}
// Retour au toucher sur les commandes (onglets, filtres, interrupteurs), comme dans les applis natives
document.addEventListener("click", (e) => {
  if (e.target.closest('.tab, .ptab, [role="tab"], [role="switch"], .switch, .chip, .seg3 button, .set-chip')) tapHaptic(6);
}, { capture: true, passive: true });
// Prépare le lecteur en arrière-plan pour que le premier scan soit immédiat.
const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 1500));
idle(() => getDetector().then(() => ($("engineInfo").textContent = detectorEngine())).catch(() => {}));
// Base des ingrédients cosmétiques (CosIng) : chargée une fois, puis gardée hors connexion
let cosingLoading = null;
function loadCosing() {
  if (cosingLoading) return cosingLoading;
  cosingLoading = fetch("data/cosing.json")
    .then((r) => (r.ok ? r.json() : null))
    .then((d) => {
      if (!d || !d.i) return;
      setCosmeticDb(d);
      if (sheetProduct && kindOf(sheetProduct) === "beauty") { renderSheetProduct(sheetProduct); if (!sheetProduct.local) loadAlternatives(sheetProduct, sheetCode); }
    })
    .catch(() => { cosingLoading = null; });
  return cosingLoading;
}
idle(loadCosing);
// Rappels : l'historique est comparé aux rappels récents au démarrage et au retour dans l'app
idle(() => checkRecallWatch());
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) checkRecallWatch();
});
