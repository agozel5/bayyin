// Accès à Open Food Facts depuis l'app, avec repli hors connexion.
import { present, pickAlternatives, FIELDS, productUrl, OFF_BASE, OffError, isMedicineCode, medShardUrl, medicineRaw, checkProfile, classifyAny } from "./core";
import { getSettings, getCachedRaw, cacheRaw, getLocal, setPack, getEntry } from "./storage";

const HEADERS = { "User-Agent": "Bayyin/1.0 (https://github.com/agozel5/bayyin)", Accept: "application/json" };

async function getJson(url, ms = 12000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  let res;
  try {
    res = await fetch(url, { headers: HEADERS, signal: ctrl.signal });
  } catch {
    throw new OffError("network");
  } finally {
    clearTimeout(timer);
  }
  if (res.status === 404) return null;
  if (!res.ok) throw new OffError("server", res.status);
  return res.json();
}

// Fiche allégée pour le stockage : seuls les nutriments utilisés par la note santé.
const OBF_BASE = "https://world.openbeautyfacts.org";
const NUT_KEYS = ["energy-kcal_100g", "energy_100g", "sugars_100g", "saturated-fat_100g", "salt_100g", "proteins_100g",
  "fiber_100g", "fruits-vegetables-nuts-estimate-from-ingredients_100g", "fruits-vegetables-legumes-estimate-from-ingredients_100g"];
function compact(raw) {
  const out = raw.kind ? { kind: raw.kind } : {};
  for (const k of FIELDS.split(",")) if (raw[k] !== undefined && raw[k] !== "") out[k] = raw[k];
  if (raw.nutriments) {
    out.nutriments = {};
    for (const k of NUT_KEYS) if (raw.nutriments[k] !== undefined) out.nutriments[k] = raw.nutriments[k];
  }
  return out;
}

const show = (raw) => present(raw, getSettings());
const memo = new Map();

// Médicament : petit fichier de la base publique (≈ 1/100), gardé en mémoire.
const medShards = new Map();
async function fetchMedicine(code) {
  const url = medShardUrl(code);
  if (!medShards.has(url)) medShards.set(url, getJson(url, 15000).catch((e) => (medShards.delete(url), Promise.reject(e))));
  const shard = (await medShards.get(url)) || {};
  return shard[code] ? medicineRaw(code, shard[code]) : null;
}

// Cherche dans Open Food Facts, puis dans Open Beauty Facts (cosmétiques, hygiène).
async function fetchRemote(code) {
  if (isMedicineCode(code)) return fetchMedicine(code);
  const data = await getJson(productUrl(code));
  if (data && data.status === 1 && data.product) return compact({ code, ...data.product });
  const beauty = await getJson(`${OBF_BASE}/api/v2/product/${code}.json?fields=${FIELDS}`).catch(() => null);
  if (beauty && beauty.status === 1 && beauty.product) return compact({ code, kind: "beauty", ...beauty.product });
  return null;
}

export async function fetchProduct(code) {
  let raw = memo.get(code) || null;
  let error = null;
  if (!raw) {
    try {
      raw = await fetchRemote(code);
      if (raw) {
        cacheRaw(code, raw);
        memo.set(code, raw);
      }
    } catch (err) {
      error = err;
      raw = await getCachedRaw(code); // hors connexion : fiche déjà vue ou du pack
    }
  }
  // Fiche sans ingrédients complétée par une photo de l'étiquette
  const localRaw = getLocal(code);
  if (localRaw && (!raw || (raw.kind !== "medicine" && !(raw.ingredients_text || raw.ingredients_text_fr)))) raw = localRaw;
  if (!raw) {
    if (error) {
      const saved = getEntry(code);
      if (saved) return saved.p;
      throw error;
    }
    return null;
  }
  return show(raw);
}

export const remember = (raw) => memo.set(raw.code, raw);

export async function searchProducts(q) {
  const url = `${OFF_BASE}/cgi/search.pl?search_terms=${encodeURIComponent(q)}&search_simple=1&action=process&json=1&page_size=20&fields=${FIELDS}`;
  const data = await getJson(url);
  return ((data && data.products) || []).filter((p) => p.code).map((p) => {
    const raw = compact(p);
    memo.set(p.code, raw);
    return show(raw);
  });
}

export async function fetchAlternatives(product) {
  const cats = (product.categories || []).filter((c) => c.startsWith("en:"));
  const tried = [];
  let found = [];
  for (const cat of cats.slice(-3).reverse()) {
    const url = `${OFF_BASE}/api/v2/search?categories_tags=${encodeURIComponent(cat)}&countries_tags=en:france` +
      `&nutrition_grades_tags=a|b|c|d&sort_by=unique_scans_n&page_size=50&fields=${FIELDS}`;
    const data = await getJson(url);
    for (const p of (data && data.products) || []) {
      if (!p.code) continue;
      const raw = compact(p);
      memo.set(p.code, raw);
      tried.push(show(raw));
    }
    // Les alternatives respectent aussi le profil (allergies, régime)
    const profile = getSettings().profile;
    found = pickAlternatives(product, tried.filter((c) => !checkProfile(c.raw, classifyAny(c.raw, getSettings()), profile).alert));
    if (found.length >= 4) break;
  }
  return found;
}

// Les produits les plus scannés en France, gardés pour le hors connexion.
export async function downloadPack(onProgress, pages = 5, pageSize = 100) {
  const all = {};
  for (let page = 1; page <= pages; page++) {
    const url = `${OFF_BASE}/api/v2/search?countries_tags=en:france&sort_by=unique_scans_n&page_size=${pageSize}&page=${page}&fields=${FIELDS}`;
    const data = await getJson(url, 30000);
    const products = ((data && data.products) || []).filter((p) => p.code);
    for (const p of products) all[p.code] = compact(p);
    onProgress && onProgress(Object.keys(all).length);
    if (products.length < pageSize) break;
  }
  setPack(all);
  return Object.keys(all).length;
}
