// Carte d'une marque : ses produits les plus scannés sur Open Food Facts et Open Beauty Facts,
// classés par verdict halal, et les certifications rencontrées.
import { normalize } from "./rules.js";

/** Nom de marque -> identifiant Open Food Facts (« Saint Michel » -> « saint-michel ») */
export function brandTag(name) {
  return normalize(name).replace(/&/g, " ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
/** Première marque d'une fiche (Open Food Facts en liste plusieurs, séparées par des virgules) */
export const mainBrand = (brands) => String(brands || "").split(",")[0].trim();

export const BRAND_GROUPS = ["halal_certifie", "halal_probable", "mashbouh", "haram", "inconnu"];

/** Produits présentés -> { total, groups: { status: [produits] }, certs: [{ name, n }], share } */
export function summarizeBrand(products) {
  const groups = Object.fromEntries(BRAND_GROUPS.map((k) => [k, []]));
  const certs = new Map();
  const seen = new Set();
  for (const p of products || []) {
    if (!p || seen.has(p.code)) continue;
    seen.add(p.code);
    const st = (p.verdict && p.verdict.status) || "inconnu";
    (groups[st] || groups.inconnu).push(p);
    const c = p.verdict && p.verdict.certification;
    if (c && (c.organisme || c.brand)) {
      const name = c.organisme || c.brand;
      certs.set(name, (certs.get(name) || 0) + 1);
    }
  }
  const total = seen.size;
  const ok = groups.halal_certifie.length + groups.halal_probable.length;
  return {
    total,
    groups,
    certs: [...certs.entries()].map(([name, n]) => ({ name, n })).sort((a, b) => b.n - a.n),
    share: total ? Math.round((ok / total) * 100) : 0,
  };
}
