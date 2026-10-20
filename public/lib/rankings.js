// Classements : les meilleurs produits halal d'un rayon, triés par note santé.
// Les produits de chaque rayon (les plus scannés en France, avec leurs ingrédients) sont préparés chaque
// semaine par scripts/build-rankings.mjs dans data/rankings/<id>.json. Le verdict halal et la note sont
// recalculés sur le téléphone, avec les réglages de l'utilisateur (école, organismes suivis, allergies).

// free : rayons ouverts à tous ; les autres font partie de Premium
export const RANK_CATEGORIES = [
  // Alimentation
  { id: "mueslis", kind: "food", tags: ["en:mueslis", "en:granola"], free: true },
  { id: "cereal_bars", kind: "food", tags: ["en:cereal-bars"], free: true },
  { id: "choco_biscuits", kind: "food", tags: ["en:chocolate-biscuits"], free: true },
  { id: "candies", kind: "food", tags: ["en:candies", "en:gummies"] },
  { id: "biscuits", kind: "food", tags: ["en:dry-biscuits", "en:shortbread-cookies"] },
  { id: "breakfast_cereals", kind: "food", tags: ["en:breakfast-cereals"] },
  { id: "chocolates", kind: "food", tags: ["en:chocolates"] },
  { id: "spreads", kind: "food", tags: ["en:hazelnut-spreads", "en:cocoa-and-hazelnuts-spreads"] },
  { id: "jams", kind: "food", tags: ["en:jams"] },
  { id: "yogurts", kind: "food", tags: ["en:yogurts"] },
  { id: "desserts", kind: "food", tags: ["en:dairy-desserts"] },
  { id: "cheeses", kind: "food", tags: ["en:cheeses"] },
  { id: "ice_creams", kind: "food", tags: ["en:ice-creams"] },
  { id: "crisps", kind: "food", tags: ["en:potato-crisps", "en:tortilla-chips"] },
  { id: "sodas", kind: "food", tags: ["en:sodas"] },
  { id: "juices", kind: "food", tags: ["en:fruit-juices"] },
  { id: "breads", kind: "food", tags: ["en:sandwich-breads", "en:breads"] },
  { id: "meals", kind: "food", tags: ["en:meals"] },
  { id: "pizzas", kind: "food", tags: ["en:pizzas"] },
  { id: "sausages", kind: "food", tags: ["en:sausages", "en:prepared-meats"] },
  { id: "sauces", kind: "food", tags: ["en:ketchup", "en:mayonnaises", "en:sauces"] },
  // Cosmétiques et hygiène
  { id: "toothpastes", kind: "beauty", tags: ["en:toothpastes"], free: true },
  { id: "deodorants", kind: "beauty", tags: ["en:deodorants"], free: true },
  { id: "shower_gels", kind: "beauty", tags: ["en:shower-gels"], free: true },
  { id: "shampoos", kind: "beauty", tags: ["en:shampoos"] },
  { id: "conditioners", kind: "beauty", tags: ["en:hair-conditioners", "en:conditioners"] },
  { id: "body_creams", kind: "beauty", tags: ["en:body-lotions", "en:body-milks", "en:body-creams"] },
  { id: "face_creams", kind: "beauty", tags: ["en:face-creams", "en:day-creams", "en:night-creams"] },
  { id: "cleansers", kind: "beauty", tags: ["en:make-up-removers", "en:micellar-waters", "en:face-cleansers", "en:cleansers"] },
  { id: "lip_balms", kind: "beauty", tags: ["en:lip-balms"], world: true },
  { id: "hand_creams", kind: "beauty", tags: ["en:hand-creams"] },
  { id: "sunscreens", kind: "beauty", tags: ["en:sunscreens", "en:sun-protection"] },
  // Maquillage : peu de fiches indiquent le pays de vente, le classement est fait sur tous les pays (world)
  { id: "lipsticks", kind: "beauty", group: "makeup", tags: ["en:lipsticks"], free: true, world: true },
  { id: "mascaras", kind: "beauty", group: "makeup", tags: ["en:mascaras"], free: true, world: true },
  { id: "nail_polishes", kind: "beauty", group: "makeup", tags: ["en:nail-polishes"], free: true, world: true },
  { id: "eye_makeup", kind: "beauty", group: "makeup", tags: ["en:eyeliners", "en:eye-shadows"], world: true },
  { id: "complexion", kind: "beauty", group: "makeup", tags: ["en:foundations", "en:bb-creams", "en:blushes"], world: true },
  { id: "makeup_other", kind: "beauty", group: "makeup", tags: ["en:makeup"], world: true },
];
/** Onglet d'un rayon dans l'écran des classements : alimentation, soins et hygiène, maquillage */
export const rankTab = (c) => c.group || c.kind;
export const RANK_BY_ID = Object.fromEntries(RANK_CATEGORIES.map((c) => [c.id, c]));

// Icônes (traits, 24 × 24)
export const RANK_ICONS = {
  mueslis: '<path d="M4 11h16a8 8 0 0 1-16 0z"/><path d="M8 8c0-1.5 1-2.5 2-3M12 8c0-2 1-3 2.5-3.5M16 8c0-1 .6-1.8 1.5-2.2"/>',
  cereal_bars: '<rect x="3" y="9" width="18" height="6" rx="2" transform="rotate(-20 12 12)"/><path d="M9 10.5l1 3M13 9l1 3"/>',
  choco_biscuits: '<circle cx="12" cy="12" r="8"/><circle cx="9" cy="10" r="1" fill="currentColor"/><circle cx="14" cy="9" r="1" fill="currentColor"/><circle cx="13" cy="14" r="1" fill="currentColor"/><circle cx="9" cy="14.5" r=".8" fill="currentColor"/>',
  candies: '<circle cx="12" cy="12" r="4.5"/><path d="M8.2 9.5L4 7v10l4.2-2.5M15.8 9.5L20 7v10l-4.2-2.5"/>',
  biscuits: '<rect x="4" y="6" width="16" height="12" rx="3"/><path d="M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M16 14h.01"/>',
  breakfast_cereals: '<path d="M6 3h12v18H6z"/><path d="M6 8h12"/><path d="M10 12c1 1 3 1 4 0M10 15.5c1 1 3 1 4 0"/>',
  chocolates: '<rect x="6" y="3" width="12" height="18" rx="1.5"/><path d="M6 9h12M6 15h12M12 3v18"/>',
  spreads: '<path d="M7 7h10v12a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2z"/><path d="M8 3h8v4H8z"/><path d="M7 12h10"/>',
  jams: '<path d="M7 8h10v11a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2z"/><path d="M6 5h12v3H6z"/><circle cx="12" cy="14" r="2"/>',
  yogurts: '<path d="M6 7h12l-1.5 13h-9z"/><path d="M5 4h14v3H5z"/>',
  desserts: '<path d="M5 11h14l-2 9H7z"/><path d="M7 11c0-3 2-5 5-5s5 2 5 5"/><path d="M12 6V3"/>',
  cheeses: '<path d="M3 17l9-11 9 6v5z"/><path d="M3 17h18"/><circle cx="11" cy="13.5" r="1.3"/><circle cx="16" cy="14.5" r="1"/>',
  ice_creams: '<path d="M8 11l4 10 4-10"/><path d="M7 11a5 5 0 0 1 10 0z"/>',
  crisps: '<path d="M6 3h12l-1 4 1 13H6l1-13z"/><path d="M9 11c1.5 1 4.5 1 6 0"/>',
  sodas: '<path d="M8 3h8M9 3v3l-2 3v11a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V9l-2-3V3"/><path d="M7 13h10"/>',
  juices: '<path d="M7 4h10l-1 16H8z"/><path d="M7.5 9h9"/><path d="M14 4l2-2"/>',
  breads: '<path d="M4 10a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4c0 1.2-.9 2-2 2v7H6v-7c-1.1 0-2-.8-2-2z"/>',
  meals: '<circle cx="12" cy="12" r="7.5"/><circle cx="12" cy="12" r="3.5"/>',
  pizzas: '<path d="M12 3L3 20h18z"/><circle cx="12" cy="11" r="1.2"/><circle cx="9.5" cy="16" r="1.2"/><circle cx="14.5" cy="16" r="1.2"/>',
  sausages: '<path d="M5 15c-2-2-1-6 2-6h10c3 0 4 4 2 6-1 1-2 1.5-3 1.5H8c-1 0-2-.5-3-1.5z"/>',
  sauces: '<path d="M10 3h4v4l2 3v10a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V10l2-3z"/><path d="M8 14h8"/>',
  toothpastes: '<path d="M4 8h12l4 4-4 4H4z"/><path d="M8 8v8"/>',
  deodorants: '<rect x="8" y="7" width="8" height="14" rx="2"/><path d="M9 7V4h6v3"/>',
  shower_gels: '<path d="M8 8h8v12a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1z"/><path d="M10 8V5h4v3M14 5h3"/>',
  shampoos: '<path d="M7 9a3 3 0 0 1 3-3h4a3 3 0 0 1 3 3v11a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1z"/><path d="M10 6V3h4v3"/>',
  conditioners: '<path d="M7 9a3 3 0 0 1 3-3h4a3 3 0 0 1 3 3v11a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1z"/><circle cx="12" cy="14" r="2.5"/>',
  body_creams: '<path d="M8 10h8v10a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1z"/><path d="M11 10V6h2v4M13 6h3"/>',
  face_creams: '<path d="M5 12h14v6a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2z"/><path d="M6 12V9h12v3"/>',
  cleansers: '<circle cx="9" cy="13" r="5"/><circle cx="15" cy="11" r="5"/>',
  lip_balms: '<rect x="9" y="9" width="6" height="12" rx="1"/><path d="M10 9V5l4-2v6"/>',
  hand_creams: '<path d="M9 3h6l-1 4h-4z"/><path d="M8 7h8v13a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1z"/>',
  lipsticks: '<rect x="9" y="12" width="6" height="9" rx="1"/><path d="M10 12V7l4-3v8"/>',
  mascaras: '<rect x="10" y="10" width="4" height="11" rx="1"/><path d="M12 10V3M9 4h6M9 6h6M9 8h6"/>',
  nail_polishes: '<rect x="7" y="11" width="10" height="10" rx="2"/><path d="M10 11V7h4v4M11 7V3h2v4"/>',
  eye_makeup: '<path d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6S2 12 2 12z"/><circle cx="12" cy="12" r="2.5"/><path d="M5 7l-1-2M9 5.5L8.5 3M15 5.5l.5-2.5M19 7l1-2"/>',
  complexion: '<circle cx="12" cy="13" r="8"/><circle cx="12" cy="13" r="4.5"/><path d="M9 4h6"/>',
  makeup_other: '<path d="M4 20l6-6M10 14l7-7 3 3-7 7z"/><path d="M15 9l3-3"/>',
  sunscreens: '<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4"/>',
};

const ABS = "https://agozel5.github.io/bayyin/data/rankings/";
export const RANK_BASE =
  typeof location !== "undefined" && /^https?:/.test(location.protocol) ? new URL("data/rankings/", location.href).href : ABS;

const cache = new Map();
function getJson(url) {
  if (!cache.has(url)) {
    const job = fetch(url, { signal: AbortSignal.timeout(12000) })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .catch((e) => { cache.delete(url); throw e; });
    cache.set(url, job);
  }
  return cache.get(url);
}
/** Rayons disponibles (et nombre de produits de chacun) */
export const rankIndex = (base = RANK_BASE) => getJson(`${base}index.json`);
/** Produits bruts d'un rayon (format Open Food Facts) */
export const rankProducts = (id, base = RANK_BASE) => getJson(`${base}${id}.json`);

const HALAL_OK = ["halal_certifie", "halal_probable"];
/**
 * Classement : seulement les produits halal (selon les réglages) et sans alerte de profil,
 * triés par note santé ; à note égale, les produits certifiés d'abord.
 * present : (raw) -> produit présenté ; scoreOf : (produit) -> { score } ; alertOf : (produit) -> alerte de profil
 */
export function rankList(raws, { present, scoreOf = (p) => p.health && p.health.score, alertOf = () => null, certifiedOnly = false }) {
  const score = (p) => scoreOf(p).score;
  return raws
    .map(present)
    .filter((p) => {
      if (!p.name) return false; // fiche sans nom : inutile dans un classement
      const st = p.verdict && p.verdict.status;
      if (!HALAL_OK.includes(st) || (certifiedOnly && st !== "halal_certifie")) return false;
      const h = scoreOf(p);
      return h && typeof h.score === "number" && !alertOf(p);
    })
    .sort((a, b) => score(b) - score(a) ||
      (a.verdict.status === "halal_certifie" ? -1 : 0) - (b.verdict.status === "halal_certifie" ? -1 : 0));
}
