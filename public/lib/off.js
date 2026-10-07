// Accès à Open Food Facts depuis le navigateur.
// L'API d'Open Food Facts autorise les appels cross-origin (CORS), ce qui permet
// à l'app de fonctionner sans serveur : un simple hébergement statique suffit.
//
// Requêtes GET simples, sans en-tête personnalisé, pour éviter tout pré-vol CORS.

import { classify, ingredientsText, DEFAULT_PREFS } from "./rules.js";
import { analyzeHealth } from "./health.js";
import { FIXTURES } from "./fixtures.js";

export const OFF_BASE = "https://world.openfoodfacts.org";
export const FIELDS = [
  "code", "product_name", "product_name_fr", "product_name_en", "product_name_ar", "product_name_tr",
  "brands", "quantity",
  "ingredients_text", "ingredients_text_fr", "ingredients_text_en",
  "additives_tags", "ingredients_analysis_tags", "labels", "labels_tags",
  "image_front_small_url", "image_front_url",
  "nutriscore_grade", "nutriments", "nova_group", "allergens_tags", "categories_tags",
].join(",");

export const productUrl = (code) => `${OFF_BASE}/api/v2/product/${code}.json?fields=${FIELDS}`;

// Champs nécessaires pour recalculer le verdict quand l'utilisateur change de réglage.
const RAW_KEYS = ["code", "product_name", "product_name_fr", "ingredients_text", "ingredients_text_fr", "ingredients_text_en",
  "additives_tags", "ingredients_analysis_tags", "labels", "labels_fr", "labels_tags", "categories_tags"];

// Mise en forme commune (navigateur et serveur)
export function present(p, prefs = DEFAULT_PREFS) {
  const raw = {};
  for (const k of RAW_KEYS) if (p[k] !== undefined) raw[k] = p[k];
  return {
    code: p.code,
    name: p.product_name_fr || p.product_name || p.product_name_en || "",
    names: { fr: p.product_name_fr, en: p.product_name_en, ar: p.product_name_ar, tr: p.product_name_tr, any: p.product_name },
    brand: (p.brands || "").split(",")[0].trim(),
    quantity: p.quantity || null,
    image: p.image_front_small_url || p.image_front_url || null,
    ingredients: ingredientsText(p),
    categories: p.categories_tags || [],
    offUrl: `https://world.openfoodfacts.org/product/${p.code}`,
    verdict: classify(p, prefs),
    health: analyzeHealth(p),
    raw,
    local: !!p.local, // ingrédients saisis ou photographiés par l'utilisateur
  };
}

// Recalcule le verdict d'un produit déjà présenté avec d'autres réglages.
export function reclassify(p, prefs) {
  return p && p.raw ? { ...p, verdict: classify(p.raw, prefs) } : p;
}

const isHalal = (p) => p.verdict.status === "halal_certifie" || p.verdict.status === "halal_probable";

// Choisit les meilleures alternatives : halal, mieux (ou aussi bien) notées pour la santé.
export function pickAlternatives(product, candidates, limit = 6) {
  const base = product.health?.score?.score ?? -1;
  const seen = new Set([product.code]);
  const names = new Set();
  return candidates
    .filter((c) => {
      if (seen.has(c.code)) return false;
      seen.add(c.code);
      const key = (c.name + c.brand).toLowerCase();
      if (names.has(key)) return false;
      names.add(key);
      const s = c.health?.score?.score;
      return isHalal(c) && s !== undefined && s !== null && s >= Math.max(base, 0) && (s > base || !isHalal(product));
    })
    .sort((a, b) =>
      b.health.score.score - a.health.score.score ||
      (b.verdict.status === "halal_certifie") - (a.verdict.status === "halal_certifie")
    )
    .slice(0, limit);
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

const rawCache = new Map(); // fiches brutes : le verdict est recalculé selon les réglages

export function createClient({ demo = false, prefs = () => DEFAULT_PREFS } = {}) {
  const show = (raw) => present(raw, prefs());
  return {
    demo,

    // -> produit présenté, ou null s'il n'existe pas
    async product(code) {
      if (demo) return FIXTURES[code] ? show(FIXTURES[code]) : null;
      if (rawCache.has(code)) return show(rawCache.get(code));
      const data = await getJson(productUrl(code));
      if (!(data && data.status === 1 && data.product)) return null;
      const raw = { code, ...data.product };
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
      const url = `${OFF_BASE}/cgi/search.pl?search_terms=${encodeURIComponent(q)}` +
        `&search_simple=1&action=process&json=1&page_size=20&fields=${FIELDS}`;
      const data = await getJson(url);
      return ((data && data.products) || []).filter((p) => p.code).map(show);
    },

    // -> alternatives halal mieux notées, dans la même catégorie (vendues en France)
    async alternatives(product) {
      const cats = (product.categories || []).filter((c) => c.startsWith("en:"));
      if (demo) {
        const pool = Object.values(FIXTURES)
          .filter((f) => (f.categories_tags || []).some((c) => cats.slice(-2).includes(c)))
          .map(show);
        return pickAlternatives(product, pool);
      }
      // Les catégories vont de la plus générale à la plus précise : on part de la plus précise.
      const tried = [];
      let found = [];
      for (const cat of cats.slice(-3).reverse()) {
        const url = `${OFF_BASE}/api/v2/search?categories_tags=${encodeURIComponent(cat)}` +
          `&countries_tags=en:france&nutrition_grades_tags=a|b|c|d&sort_by=unique_scans_n&page_size=50&fields=${FIELDS}`;
        const data = await getJson(url);
        tried.push(...((data && data.products) || []).filter((p) => p.code).map(show));
        found = pickAlternatives(product, tried);
        if (found.length >= 4) break;
      }
      return found;
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
      return count;
    },
  };
}
