// Illustration en couleur d'un produit sans photo : le rayon des classements s'il correspond,
// sinon la famille d'aliments (devinée par les catégories, ou à défaut par le nom).
// Partagé entre la version web et l'app mobile.
import { RANK_CATEGORIES } from "./rankings.js";
import { RANK_ART, FAMILY_ART } from "./rank-art.js";

const FAMILIES = [
  ["poultry", /poultr|chicken|turkey|volaille|poulet|dinde|nugget/],
  ["meat", /meats|sausages|charcuter|hams|beef|lamb|kebab|merguez|boeuf|bœuf|agneau|viande/],
  ["fish", /fish|seafood|tuna|salmon|sardine|shrimp|crustacean/],
  ["dairy", /dair|chees|milk|yogurt|yoghurt|cream|butter/],
  ["drink", /beverage|drink|juice|water|soda|coffee|tea/],
  ["sweet", /sweet|confection|chocolate|biscuit|candies|candy|dessert|cake|ice-cream/],
  ["bakery", /bread|viennoiser|bakery|cereal|pastr|pasta|rice/],
  ["plant", /fruit|vegetable|legume|nuts|plant-based/],
  ["meal", /meal|pizza|sandwich|soup|prepared|frozen/],
  ["sauce", /condiment|sauce|spice|oil|vinegar|honey|spread|jam/],
];
const FAMILY_TO_RANK = { sweet: "candies", bakery: "breads", meal: "meals", sauce: "sauces" };

/** Clé d'illustration : "r:<rayon>", "f:<famille>" ou "" (médicaments, fiches photo). */
export function productArtKey({ kind = "food", tags = [], name = "", local = false } = {}) {
  if (local || kind === "medicine") return "";
  if (tags.length) {
    const cat = RANK_CATEGORIES.find((c) => c.kind === kind && c.tags.some((tg) => tags.includes(tg)));
    if (cat && RANK_ART[cat.id]) return "r:" + cat.id;
  }
  if (kind !== "food") return "";
  const hay = (tags.length ? tags.join(" ") : String(name)).toLowerCase();
  const fam = FAMILIES.find(([, re]) => re.test(hay));
  if (!fam) return "";
  return FAMILY_ART[fam[0]] ? "f:" + fam[0] : FAMILY_TO_RANK[fam[0]] ? "r:" + FAMILY_TO_RANK[fam[0]] : "";
}
export const artByKey = (k) => (k && k.startsWith("r:") ? RANK_ART[k.slice(2)] : k && k.startsWith("f:") ? FAMILY_ART[k.slice(2)] : "") || "";
