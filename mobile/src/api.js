// Accès à Open Food Facts depuis l'app, avec repli hors connexion.
import { present, pickAlternatives, FIELDS, productUrl, OFF_BASE, OffError, isMedicineCode, medShardUrl, medicineRaw, checkProfile, classifyAny, greenScore } from "./core";
import { setCosmeticDb, cosmeticDbVersion } from "../../public/lib/cosmetic.js";
import { createClient } from "../../public/lib/off.js";
import { getLang } from "./i18n";
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

// Client de la version web (recherche, alternatives, fiches jumelles) : mêmes résultats que sur le site
export const offClient = createClient({ prefs: () => getSettings() });

/** Recherche par nom -> { food, beauty, alt, foodFailed, beautyFailed } (kind : all | food | beauty) */
export async function searchAll(q, kind = "all") {
  return offClient.search(q, { lang: getLang(), kind });
}
// Compatibilité : liste simple
export async function searchProducts(q) {
  const r = await searchAll(q);
  return [...r.food, ...r.beauty];
}

/** Alternatives du même type, halal et mieux notées, qui respectent le profil */
export async function fetchAlternatives(product) {
  const found = await offClient.alternatives(product);
  const profile = getSettings().profile;
  const alts = found.filter((c) => !checkProfile(c.raw, classifyAny(c.raw, getSettings()), profile).alert);
  alts.best = !!found.best;
  return alts;
}

/** Fiches plus complètes du même produit (même nom, même marque) */
export const fetchTwins = (product) => offClient.twins(product).catch(() => []);

// Les produits les plus scannés en France, gardés pour le hors connexion.
export const POPULAR_URL = "https://agozel5.github.io/bayyin/data/popular.json";
export async function downloadPack(onProgress, pages = 5, pageSize = 100) {
  const all = {};
  // 1) Fichier préparé chaque semaine sur le site (un seul téléchargement, rapide et fiable)
  try {
    const data = await getJson(POPULAR_URL, 45000);
    for (const p of (data && data.products) || []) if (p.code) all[p.code] = compact(p);
    onProgress && onProgress(Object.keys(all).length);
  } catch { /* site indisponible : repli sur Open Food Facts */ }
  // 2) Repli : la recherche d'Open Food Facts, avec de nouveaux essais (elle est souvent saturée)
  if (Object.keys(all).length < 100) {
    for (let page = 1; page <= pages; page++) {
      const url = `${OFF_BASE}/api/v2/search?countries_tags=en:france&sort_by=unique_scans_n&page_size=${pageSize}&page=${page}&fields=${FIELDS}`;
      let data = null;
      for (let i = 0; i < 3 && !data; i++) {
        try { data = await getJson(url, 30000); } catch (e) { if (i === 2) { if (Object.keys(all).length) break; throw e; } await new Promise((r) => setTimeout(r, 2500 * (i + 1))); }
      }
      const products = ((data && data.products) || []).filter((p) => p.code);
      for (const p of products) all[p.code] = compact(p);
      onProgress && onProgress(Object.keys(all).length);
      if (products.length < pageSize) break;
    }
  }
  if (!Object.keys(all).length) throw new OffError("network");
  setPack(all);
  return Object.keys(all).length;
}

// Impact environnemental (Green-Score d'Open Food Facts), chargé seulement à l'ouverture de l'onglet Planète.
const envMemo = new Map();
export async function fetchEnvironment(code) {
  if (!/^\d+$/.test(String(code))) return null;
  if (envMemo.has(code)) return envMemo.get(code);
  const fields = "ecoscore_grade,ecoscore_score,ecoscore_data,environmental_score_grade,environmental_score_score,environmental_score_data," +
    "labels_tags,ingredients_analysis_tags,origins_tags,origin_fr,origin,ingredients,manufacturing_places,packaging_materials_tags,packaging_recycling_tags";
  const data = await getJson(`${OFF_BASE}/api/v2/product/${code}.json?fields=${fields}`, 15000);
  const e = data && data.product ? greenScore(data.product) : null;
  envMemo.set(code, e);
  return e;
}

// Base des ingrédients cosmétiques (CosIng, ≈ 1,5 Mo) : chargée une fois, à la première fiche de cosmétique.
let cosingLoading = null;
export function loadCosing() {
  if (cosmeticDbVersion()) return Promise.resolve(true);
  if (!cosingLoading) {
    cosingLoading = getJson("https://agozel5.github.io/bayyin/data/cosing.json", 30000)
      .then((d) => { if (!d || !d.i) throw new Error("cosing"); setCosmeticDb(d); return true; })
      .catch(() => { cosingLoading = null; return false; });
  }
  return cosingLoading;
}
