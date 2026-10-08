// Accès à Open Food Facts depuis le navigateur.
// L'API d'Open Food Facts autorise les appels cross-origin (CORS), ce qui permet
// à l'app de fonctionner sans serveur : un simple hébergement statique suffit.
//
// Requêtes GET simples, sans en-tête personnalisé, pour éviter tout pré-vol CORS.

import { classify, ingredientsText, DEFAULT_PREFS } from "./rules.js";
import { analyzeHealth } from "./health.js";
import { analyzeCosmetic } from "./cosmetic.js";
import { classifyBeauty } from "./beauty.js";
import { classifyMedicine, medNoticeUrl, isMedicineCode, medShard, medicineRaw, MED_DATA_BASE } from "./medicine.js";
import { FIXTURES } from "./fixtures.js";

export const OFF_BASE = "https://world.openfoodfacts.org";
export const FIELDS = [
  "code", "product_name", "product_name_fr", "product_name_en", "product_name_ar", "product_name_tr",
  "brands", "quantity",
  "ingredients_text", "ingredients_text_fr", "ingredients_text_en",
  "additives_tags", "ingredients_analysis_tags", "labels", "labels_tags",
  "image_front_small_url", "image_front_url",
  "nutriscore_grade", "nutriments", "nova_group", "allergens_tags", "traces_tags", "categories_tags",
  "compared_to_category",
].join(",");

export const productUrl = (code) => `${OFF_BASE}/api/v2/product/${code}.json?fields=${FIELDS}`;
export const OBF_BASE = "https://world.openbeautyfacts.org";
export const beautyUrl = (code) => `${OBF_BASE}/api/v2/product/${code}.json?fields=${FIELDS}`;

// Champs nécessaires pour recalculer le verdict quand l'utilisateur change de réglage.
const RAW_KEYS = ["code", "product_name", "product_name_fr", "ingredients_text", "ingredients_text_fr", "ingredients_text_en",
  "additives_tags", "ingredients_analysis_tags", "labels", "labels_fr", "labels_tags", "categories_tags",
  "allergens_tags", "traces_tags", "kind", "brands", "med_form", "med_cis"];

// Type de produit : alimentaire (Open Food Facts), cosmétique (Open Beauty Facts) ou médicament (base publique).
// Le verdict halal suit des règles différentes pour chacun.
export function classifyAny(p, prefs = DEFAULT_PREFS) {
  if (p && p.kind === "beauty") return classifyBeauty(p, prefs);
  if (p && p.kind === "medicine") return classifyMedicine(p, prefs);
  return classify(p, prefs);
}

// Mise en forme commune (navigateur et serveur)
export function present(p, prefs = DEFAULT_PREFS) {
  const raw = {};
  for (const k of RAW_KEYS) if (p[k] !== undefined) raw[k] = p[k];
  const kind = p.kind || "food";
  if (kind === "medicine") {
    return {
      code: p.code, kind, name: p.product_name || "", names: { any: p.product_name }, brand: p.brands || "",
      quantity: null, image: null, ingredients: "", categories: [], form: p.med_form || "", cis: p.med_cis || "",
      offUrl: p.med_cis ? medNoticeUrl(p.med_cis) : "", verdict: classifyMedicine(p, prefs), health: null, raw, local: false,
    };
  }
  return {
    kind,
    code: p.code,
    name: p.product_name_fr || p.product_name || p.product_name_en || "",
    names: { fr: p.product_name_fr, en: p.product_name_en, ar: p.product_name_ar, tr: p.product_name_tr, any: p.product_name },
    brand: (p.brands || "").split(",")[0].trim(),
    quantity: p.quantity || null,
    image: p.image_front_small_url || p.image_front_url || null,
    ingredients: ingredientsText(p),
    categories: p.categories_tags || [],
    compared: p.compared_to_category || null, // catégorie de référence d'Open Food Facts (la plus précise)
    offUrl: kind === "beauty" ? `https://world.openbeautyfacts.org/product/${p.code}` : `https://world.openfoodfacts.org/product/${p.code}`,
    verdict: classifyAny(p, prefs),
    health: kind === "beauty" ? analyzeCosmetic(p) : analyzeHealth(p),
    raw,
    local: !!p.local, // ingrédients saisis ou photographiés par l'utilisateur
  };
}

// Recalcule le verdict d'un produit déjà présenté avec d'autres réglages.
export function reclassify(p, prefs) {
  return p && p.raw ? { ...p, verdict: classifyAny(p.raw, prefs) } : p;
}

const isHalal = (p) => p.verdict.status === "halal_certifie" || p.verdict.status === "halal_probable";

// ---------------------------------------------------------------------------
// Produits semblables
// Les catégories d'Open Food Facts vont de la plus générale à la plus précise
// (« Snacks › Biscuits › Biscuits au chocolat »). Une alternative doit être du même type :
// on cherche d'abord dans la catégorie la plus précise, puis dans la catégorie juste au-dessus,
// en gardant seulement les produits qui partagent l'essentiel des catégories.
// ---------------------------------------------------------------------------
const GENERIC_CATS = /^[a-z]{2}:(foods?|plant-based-foods(-and-beverages)?|beverages(-and-beverages-preparations)?|snacks|groceries|dairies|meats?(-and-their-products)?|fermented-foods|fermented-milk-products|frozen-foods|non-food-products|open-beauty-facts|cosmetics?|hygiene|body|face|hair|beauty)$/;

export function categoryPath(product) {
  const all = (product.categories || product.categories_tags || []).filter(Boolean);
  const en = all.filter((c) => c.startsWith("en:"));
  const cats = en.length ? en : all;
  // La catégorie de référence d'Open Food Facts est la plus précise ; à défaut, la dernière de la liste.
  const ref = product.compared && cats.includes(product.compared) ? product.compared : cats[cats.length - 1] || null;
  const specific = cats.filter((c) => !GENERIC_CATS.test(c));
  const idx = ref ? specific.indexOf(ref) : -1;
  // Catégorie parente : seulement si elle reste précise (pas « Snacks » ou « Hygiène »)
  const parent = idx > 0 ? specific[idx - 1] : specific.length > 1 && specific[specific.length - 1] === ref ? specific[specific.length - 2] : null;
  return { cats, ref, parent: parent && parent !== ref ? parent : null };
}

const NAME_STOP = new Set(["avec", "sans", "pour", "the", "and", "with", "from", "aux", "des", "les", "une", "100", "bio", "organic"]);
const nameWords = (p) => {
  const brand = new Set(String(p.brand || "").toLowerCase().split(/[^\p{L}\p{N}]+/u));
  return new Set(String(p.name || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .split(/[^\p{L}\p{N}]+/u).filter((w) => w.length >= 4 && !NAME_STOP.has(w) && !brand.has(w)));
};

/** Ressemblance entre deux produits (0 à 1) : catégories en commun, et un mot du nom en commun. */
export function similarity(a, b) {
  const A = new Set(categoryPath(a).cats.filter((c) => !GENERIC_CATS.test(c)));
  const B = new Set(categoryPath(b).cats.filter((c) => !GENERIC_CATS.test(c)));
  if (!A.size || !B.size) return 0;
  let inter = 0;
  for (const c of A) if (B.has(c)) inter++;
  const jaccard = inter / (A.size + B.size - inter);
  const wa = nameWords(a), wb = nameWords(b);
  const word = [...wa].some((w) => wb.has(w));
  return Math.min(1, jaccard + (word ? 0.2 : 0));
}

// Choisit les meilleures alternatives : du même type, halal, mieux (ou aussi bien) notées.
// minSim : ressemblance minimale exigée (plus élevée quand on élargit à la catégorie parente).
export function pickAlternatives(product, candidates, limit = 6, { minSim = 0, need = null } = {}) {
  const base = product.health?.score?.score ?? -1;
  const seen = new Set([product.code]);
  const names = new Set([(product.name + product.brand).toLowerCase()]);
  return candidates
    .filter((c) => {
      if (seen.has(c.code)) return false;
      seen.add(c.code);
      const key = (c.name + c.brand).toLowerCase();
      if (names.has(key)) return false;
      names.add(key);
      if ((c.kind || "food") !== (product.kind || "food")) return false; // un aliment pour un aliment
      if (need && !(c.categories || []).includes(need)) return false;
      c.similarity = similarity(product, c);
      if (c.similarity < minSim) return false;
      const s = c.health?.score?.score;
      return isHalal(c) && s !== undefined && s !== null && s >= Math.max(base, 0) && (s > base || !isHalal(product));
    })
    .sort((a, b) =>
      b.health.score.score - a.health.score.score ||
      b.similarity - a.similarity ||
      (b.verdict.status === "halal_certifie") - (a.verdict.status === "halal_certifie")
    )
    .slice(0, limit);
}

// Deux passes : catégorie la plus précise, puis (si trop peu de résultats) la catégorie parente,
// avec une ressemblance exigée plus forte. Les produits de la première passe restent en tête.
export async function similarAlternatives(product, fetchCategory, limit = 6) {
  const { ref, parent } = categoryPath(product);
  if (!ref) return [];
  const first = pickAlternatives(product, await fetchCategory(ref), limit, { minSim: 0.25, need: ref });
  if (first.length >= 3 || !parent) return first;
  const more = pickAlternatives(product, await fetchCategory(parent), limit, { minSim: 0.5, need: parent })
    .filter((c) => !first.some((f) => f.code === c.code));
  return [...first, ...more].slice(0, limit);
}

// code : "network" (pas de réponse) ou "server" (erreur HTTP) ; message traduit par l'interface.
export class OffError extends Error {
  constructor(code, status) {
    super(code === "network" ? "Open Food Facts ne répond pas." : `Open Food Facts : erreur ${status}`);
    this.code = code;
    this.status = status;
  }
}

async function getJson(url, timeout = 12000) {
  let res;
  try {
    res = await fetch(url, { signal: AbortSignal.timeout(timeout) });
  } catch {
    throw new OffError("network");
  }
  if (res.status === 404) return null;
  if (!res.ok) throw new OffError("server", res.status);
  return res.json();
}

// Cache partagé avec le service worker (sw.js) : fiches produits disponibles hors connexion.
export const PRODUCT_CACHE = "hs-products-v1";
export const MED_CACHE = "hs-med-v1"; // base des médicaments (voir sw.js)

const rawCache = new Map(); // fiches brutes : le verdict est recalculé selon les réglages

export function createClient({ demo = false, prefs = () => DEFAULT_PREFS, medBase = MED_DATA_BASE } = {}) {
  const show = (raw) => present(raw, prefs());
  // Recherche des produits d'une catégorie (aliments : Open Food Facts ; cosmétiques : Open Beauty Facts)
  async function categoryProducts(cat, kind) {
    const beauty = kind === "beauty";
    const url = `${beauty ? OBF_BASE : OFF_BASE}/api/v2/search?categories_tags=${encodeURIComponent(cat)}&countries_tags=en:france` +
      `${beauty ? "" : "&nutrition_grades_tags=a|b|c|d"}&sort_by=unique_scans_n&page_size=${beauty ? 60 : 80}&fields=${FIELDS}`;
    const data = await getJson(url);
    return ((data && data.products) || []).filter((p) => p.code).map((p) => show(beauty ? { ...p, kind: "beauty" } : p));
  }
  const medShards = new Map();
  // Médicament : un seul petit fichier de la base publique est téléchargé (≈ 1/100)
  async function medicine(code) {
    const url = `${medBase}${medShard(code)}.json`;
    if (!medShards.has(url)) {
      const p = getJson(url, 15000);
      medShards.set(url, p);
      p.catch(() => medShards.delete(url));
    }
    const shard = (await medShards.get(url)) || {};
    return shard[code] ? medicineRaw(code, shard[code]) : null;
  }
  return {
    demo,

    // -> produit présenté, ou null s'il n'existe pas
    async product(code) {
      if (rawCache.has(code)) return show(rawCache.get(code));
      let raw = null;
      if (isMedicineCode(code)) {
        raw = await medicine(code); // fichiers servis avec l'app : disponibles aussi en démo
      } else if (demo) {
        raw = FIXTURES[code] || null;
      } else {
        const data = await getJson(productUrl(code));
        if (data && data.status === 1 && data.product) raw = { code, ...data.product };
        else {
          // Pas un aliment : on cherche dans Open Beauty Facts (cosmétiques, hygiène)
          const beauty = await getJson(beautyUrl(code)).catch(() => null);
          if (beauty && beauty.status === 1 && beauty.product) raw = { code, kind: "beauty", ...beauty.product };
        }
      }
      if (!raw) return null;
      rawCache.set(code, raw);
      return show(raw);
    },

    // -> liste de produits présentés
    async search(q) {
      if (demo) {
        const n = q.toLowerCase();
        return Object.values(FIXTURES)
          .filter((p) => [p.product_name_fr, p.brands].join(" ").toLowerCase().includes(n))
          .map(show);
      }
      // Aliments et cosmétiques en parallèle ; une base qui ne répond pas n'empêche pas l'autre
      const qs = `/cgi/search.pl?search_terms=${encodeURIComponent(q)}&search_simple=1&action=process&json=1&page_size=20&fields=${FIELDS}`;
      const [food, beauty] = await Promise.allSettled([getJson(OFF_BASE + qs), getJson(OBF_BASE + qs.replace("page_size=20", "page_size=10"))]);
      if (food.status === "rejected" && beauty.status === "rejected") throw food.reason;
      const list = (r, kind) => (r.status === "fulfilled" && r.value && r.value.products ? r.value.products : [])
        .filter((p) => p.code)
        .map((p) => (kind ? { ...p, kind } : p));
      const seen = new Set();
      return [...list(food), ...list(beauty, "beauty")]
        .filter((p) => (seen.has(p.code) ? false : seen.add(p.code)))
        .map((p) => {
          rawCache.set(p.code, p);
          return show(p);
        });
    },

    // -> alternatives du même type de produit, halal et mieux notées (vendues en France)
    async alternatives(product) {
      const kind = product.kind === "beauty" ? "beauty" : "food";
      if (demo) {
        const pool = Object.values(FIXTURES).map(show).filter((f) => (f.kind || "food") === kind);
        return similarAlternatives(product, async (cat) => pool.filter((f) => f.categories.includes(cat)));
      }
      return similarAlternatives(product, (cat) => categoryProducts(cat, kind));
    },

    // Télécharge les produits les plus scannés en France pour les consulter hors connexion.
    // Chaque fiche est rangée dans le cache sous l'adresse exacte qu'utilisera product().
    async offlinePack({ pages = 5, pageSize = 100, onProgress } = {}) {
      if (!("caches" in globalThis)) throw new OffError("network");
      const cache = await caches.open(PRODUCT_CACHE);
      let count = 0;
      for (let page = 1; page <= pages; page++) {
        const url = `${OFF_BASE}/api/v2/search?countries_tags=en:france&sort_by=unique_scans_n` +
          `&page_size=${pageSize}&page=${page}&fields=${FIELDS}`;
        const data = await getJson(url, 30000);
        const products = ((data && data.products) || []).filter((p) => p.code);
        await Promise.all(
          products.map((p) =>
            cache.put(
              productUrl(p.code),
              new Response(JSON.stringify({ status: 1, code: p.code, product: p }), {
                headers: { "Content-Type": "application/json", "X-HS-Pack": "1" },
              })
            )
          )
        );
        count += products.length;
        onProgress && onProgress(count, pages * pageSize);
        if (products.length < pageSize) break;
      }
      // Base des médicaments : les 100 petits fichiers, rangés dans un cache qui survit aux mises à jour de l'app
      const med = await caches.open(MED_CACHE);
      let medCount = 0;
      const keys = Array.from({ length: 100 }, (_, i) => String(i).padStart(2, "0"));
      for (let i = 0; i < keys.length; i += 10) {
        await Promise.all(
          keys.slice(i, i + 10).map(async (k) => {
            const url = `${medBase}${k}.json`;
            try {
              const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
              if (!res.ok) return;
              const copy = res.clone();
              medCount += Object.keys(await res.json()).length;
              await med.put(url, copy);
            } catch {
              /* fichier manquant : ignoré */
            }
          })
        );
        onProgress && onProgress(count, pages * pageSize, medCount);
      }
      return { count, medCount };
    },
  };
}
