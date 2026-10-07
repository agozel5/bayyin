// Accès à Open Food Facts depuis le navigateur.
// L'API d'Open Food Facts autorise les appels cross-origin (CORS), ce qui permet
// à l'app de fonctionner sans serveur : un simple hébergement statique suffit.
//
// Requêtes GET simples, sans en-tête personnalisé, pour éviter tout pré-vol CORS.

import { classify, ingredientsText } from "./rules.js";
import { FIXTURES } from "./fixtures.js";

const OFF_BASE = "https://world.openfoodfacts.org";
export const FIELDS = [
  "code", "product_name", "product_name_fr", "brands", "quantity",
  "ingredients_text", "ingredients_text_fr", "ingredients_text_en",
  "additives_tags", "ingredients_analysis_tags", "labels", "labels_tags",
  "image_front_small_url", "image_front_url",
].join(",");

// Mise en forme commune (navigateur et serveur)
export function present(p) {
  return {
    code: p.code,
    name: p.product_name_fr || p.product_name || "Produit sans nom",
    brand: (p.brands || "").split(",")[0].trim(),
    quantity: p.quantity || null,
    image: p.image_front_small_url || p.image_front_url || null,
    ingredients: ingredientsText(p),
    offUrl: `https://fr.openfoodfacts.org/produit/${p.code}`,
    verdict: classify(p),
  };
}

export class OffError extends Error {}

async function getJson(url) {
  let res;
  try {
    res = await fetch(url, { signal: AbortSignal.timeout(10000) });
  } catch {
    throw new OffError("Open Food Facts ne répond pas. Vérifiez votre connexion puis réessayez.");
  }
  if (res.status === 404) return null;
  if (!res.ok) throw new OffError(`Open Food Facts est indisponible (erreur ${res.status}). Réessayez dans un instant.`);
  return res.json();
}

const cache = new Map();

export function createClient({ demo = false } = {}) {
  return {
    demo,

    // -> produit présenté, ou null s'il n'existe pas
    async product(code) {
      if (demo) return FIXTURES[code] ? present(FIXTURES[code]) : null;
      if (cache.has(code)) return cache.get(code);
      const data = await getJson(`${OFF_BASE}/api/v2/product/${code}.json?fields=${FIELDS}`);
      const p = data && data.status === 1 && data.product ? present({ code, ...data.product }) : null;
      if (p) cache.set(code, p);
      return p;
    },

    // -> liste de produits présentés
    async search(q) {
      if (demo) {
        const n = q.toLowerCase();
        return Object.values(FIXTURES)
          .filter((p) => [p.product_name_fr, p.brands].join(" ").toLowerCase().includes(n))
          .map(present);
      }
      const url = `${OFF_BASE}/cgi/search.pl?search_terms=${encodeURIComponent(q)}` +
        `&search_simple=1&action=process&json=1&page_size=12&fields=${FIELDS}`;
      const data = await getJson(url);
      return ((data && data.products) || []).filter((p) => p.code).map(present);
    },
  };
}
