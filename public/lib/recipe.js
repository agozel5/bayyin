// Alerte « la recette a changé » : compare la liste d'ingrédients gardée sur le téléphone à celle
// publiée aujourd'hui par Open Food Facts. Les petites différences d'écriture (majuscules,
// pourcentages, ponctuation) ne comptent pas ; seuls les ingrédients ajoutés ou retirés comptent.
import { normalize, segments, ingredientsText } from "./rules.js";

// Ingrédient -> forme comparable : sans pourcentage, sans « bio », sans quantité
function key(seg) {
  return normalize(seg)
    .replace(/\d+([.,]\d+)?\s*%?/g, " ")
    .replace(/\b(issus? de l.?agriculture biologique|bio|organic|origine \w+|ingredients?|contient|peut contenir des traces de?)\b/g, " ")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
function ingredientSet(p) {
  const text = ingredientsText(p) || "";
  const set = new Map();
  for (const seg of segments(text)) {
    const k = key(seg);
    if (k.length >= 3 && k.length <= 60) set.set(k, seg.trim());
  }
  return set;
}
const additives = (p) => new Set((p.additives_tags || []).map((a) => String(a).replace(/^en:/, "").toLowerCase()));

/** Signature courte d'une recette (pour savoir s'il faut comparer) */
export function recipeSignature(p) {
  return [...ingredientSet(p).keys()].sort().join("|") + "#" + [...additives(p)].sort().join(",");
}

/**
 * Différences entre deux versions d'un produit (fiches brutes d'Open Food Facts).
 * -> null si rien n'a changé (ou si une des deux listes manque), sinon { added, removed, addedE, removedE }
 */
export function diffRecipe(before, after) {
  const a = ingredientSet(before), b = ingredientSet(after);
  if (!a.size || !b.size) return null;
  const added = [...b.keys()].filter((k) => !a.has(k)).map((k) => b.get(k));
  const removed = [...a.keys()].filter((k) => !b.has(k)).map((k) => a.get(k));
  const ea = additives(before), eb = additives(after);
  const addedE = [...eb].filter((x) => !ea.has(x)).map((x) => x.toUpperCase());
  const removedE = [...ea].filter((x) => !eb.has(x)).map((x) => x.toUpperCase());
  // une liste réécrite en entier (autre langue, autre découpage) n'est pas un changement de recette
  const total = Math.max(a.size, b.size);
  if (added.length + removed.length > total * 1.2 && added.length > 6 && removed.length > 6) return null;
  if (!added.length && !removed.length && !addedE.length && !removedE.length) return null;
  return { added: added.slice(0, 12), removed: removed.slice(0, 12), addedE, removedE };
}

const RANK = { haram: 4, mashbouh: 3, inconnu: 2, halal_probable: 1, halal_certifie: 0 };
/** Le verdict est-il moins bon qu'avant ? */
export const worse = (before, after) => (RANK[after] ?? 2) > (RANK[before] ?? 2);
