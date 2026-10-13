// Certification vérifiée : le label halal lu sur le produit est comparé à la liste que l'organisme publie
// (data/certified.json, construit chaque semaine par scripts/build-certified.mjs).
//  - « stamp » : l'estampille sanitaire de l'emballage (emb_codes d'Open Food Facts) est celle d'un
//    établissement de la liste — la preuve la plus solide ;
//  - « brand » : la marque figure dans la liste ;
//  - « missing » : l'organisme publie une liste, mais le produit n'y est pas retrouvé ;
//  - null : l'organisme ne publie pas de liste exploitable.

const ABS = "https://agozel5.github.io/bayyin/data/certified.json";
export const CERTIFIED_URL =
  typeof location !== "undefined" && /^https?:/.test(location.protocol) ? new URL("data/certified.json", location.href).href : ABS;

export const normStamp = (s) => String(s ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
export const normName = (s) =>
  String(s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/&/g, " et ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\b(sas|sarl|sa|ltd|limited|gmbh|bv|sl)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();

let job = null;
/** Listes des organismes ; null si indisponibles (hors connexion, etc.). */
export function loadCertified(url = CERTIFIED_URL) {
  if (!job) {
    job = fetch(url, { signal: AbortSignal.timeout(8000) })
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null)
      .then((d) => {
        if (!d) job = null; // nouvel essai au prochain produit
        return d;
      });
  }
  return job;
}

// Estampilles d'un produit Open Food Facts : « FR 77.237.006 CE », « fr-77-237-006-ce »…
export function productStamps(raw = {}) {
  const list = [
    ...String(raw.emb_codes || "").split(","),
    ...(raw.emb_codes_tags || []),
  ];
  return [...new Set(list.map(normStamp).filter((s) => s.length >= 6))];
}
export function productBrands(raw = {}, brand = "") {
  const list = [...String(raw.brands || brand || "").split(","), ...(raw.brands_tags || []).map((b) => b.replace(/^[a-z]{2}:/, ""))];
  return [...new Set(list.map(normName).filter((b) => b.length >= 3))];
}

const brandMatches = (b, n) => n === b || n.startsWith(b + " ") || (n.length >= 5 && b.startsWith(n + " "));

/**
 * Vérifie le label d'un produit auprès de la liste de son organisme.
 * @returns {{status:"stamp"|"brand"|"missing", org:string, updated:string, url:string, match?:string} | null}
 */
export function verifyCertification(p, db, orgId) {
  const list = db && db.orgs && db.orgs[orgId];
  if (!list || !list.names) return null;
  const raw = p.raw || p;
  const base = { org: orgId, updated: list.updated || (db.meta && db.meta.updated) || "", url: list.url || "" };
  const stamps = new Set(list.stamps || []);
  const stamp = productStamps(raw).find((s) => stamps.has(s));
  if (stamp) return { ...base, status: "stamp", match: stamp.replace(/^([A-Z]{2})(\d{2,3})(\d{3})(\d{3})([A-Z]{2})$/, "$1 $2.$3.$4 $5") };
  const names = list.names.map((n) => [normName(n), n]);
  for (const b of productBrands(raw, p.brand)) {
    const hit = names.find(([n]) => brandMatches(b, n));
    if (hit) return { ...base, status: "brand", match: hit[1] };
  }
  return { ...base, status: "missing" };
}
