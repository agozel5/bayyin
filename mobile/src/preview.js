// Aperçu d'un produit pendant le chargement de sa fiche : nom, marque et photo déjà connus
// (résultat de recherche, historique, liste de courses). La fiche s'affiche ainsi « tout de suite ».
const seen = new Map();
export function rememberPreview(list) {
  for (const p of list || []) if (p && p.code && (p.name || p.image)) seen.set(p.code, { code: p.code, name: p.name, brand: p.brand, image: p.image, quantity: p.quantity, kind: p.kind, raw: p.raw && p.raw.th ? { th: p.raw.th } : undefined });
  if (seen.size > 400) for (const k of [...seen.keys()].slice(0, 100)) seen.delete(k);
}
export const previewOf = (code) => seen.get(code) || null;
