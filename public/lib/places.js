// Commerces halal autour de soi, d'après OpenStreetMap (carte collaborative, licence ODbL).
// Les commerces sont repérés par l'étiquette diet:halal=only (100 % halal) ou diet:halal=yes
// (propose du halal), et par cuisine=halal sur les restaurants.
// Données : pré-téléchargées chaque semaine (data/places/, pays couverts), sinon API Overpass en direct ;
// recherche de ville : Nominatim.
// La position est arrondie à environ 100 m avant d'être envoyée.

export const OVERPASS = ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter", "https://overpass.private.coffee/api/interpreter"];
export const NOMINATIM = "https://nominatim.openstreetmap.org/search";
export const RADII = [1000, 3000, 10000];
export const CATEGORIES = ["butcher", "restaurant", "grocery", "bakery", "other"];

const round = (x) => Math.round(x * 1000) / 1000; // ≈ 100 m

export function buildQuery(lat, lon, radius) {
  const a = `(around:${Math.round(radius)},${round(lat)},${round(lon)})`;
  return `[out:json][timeout:25];(nwr${a}["diet:halal"~"^(yes|only)$"];nwr${a}["cuisine"~"halal",i];);out tags center qt 200;`;
}

export function categoryOf(tags) {
  const shop = tags.shop || "";
  const amenity = tags.amenity || "";
  if (shop === "butcher") return "butcher";
  if (["restaurant", "fast_food", "cafe", "food_court", "ice_cream", "bar"].includes(amenity)) return "restaurant";
  if (["bakery", "pastry", "confectionery"].includes(shop)) return "bakery";
  if (["supermarket", "convenience", "greengrocer", "deli", "grocery", "general", "frozen_food", "health_food", "variety_store", "kiosk", "seafood", "spices", "wholesale"].includes(shop)) return "grocery";
  return "other";
}

// Distance en mètres (formule de haversine)
export function distance(lat1, lon1, lat2, lon2) {
  const R = 6371000, rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad, dLon = (lon2 - lon1) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function addressOf(t) {
  const street = [t["addr:housenumber"], t["addr:street"]].filter(Boolean).join(" ");
  return [street, t["addr:city"] || t["addr:place"]].filter(Boolean).join(", ");
}

// Certification indiquée par les contributeurs (plusieurs écritures existent dans OpenStreetMap)
function certificationOf(t) {
  for (const [k, v] of Object.entries(t)) if (/halal/.test(k) && /cert/.test(k) && v) return String(v);
  return null;
}

/** Réponse Overpass -> liste de commerces triés par distance */
export function parsePlaces(json, lat, lon) {
  const seen = new Set();
  const out = [];
  for (const el of (json && json.elements) || []) {
    const t = el.tags || {};
    const plat = el.lat ?? (el.center && el.center.lat);
    const plon = el.lon ?? (el.center && el.center.lon);
    if (plat == null || plon == null) continue;
    const name = t.name || t.brand || "";
    const key = `${el.type}/${el.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const halal = t["diet:halal"] === "only" ? "only" : "yes";
    out.push({
      id: key,
      name,
      lat: plat,
      lon: plon,
      cat: categoryOf(t),
      halal,
      cert: certificationOf(t),
      address: addressOf(t),
      hours: t.opening_hours || "",
      phone: t.phone || t["contact:phone"] || "",
      website: t.website || t["contact:website"] || "",
      distance: distance(lat, lon, plat, plon),
    });
  }
  return out.sort((a, b) => a.distance - b.distance);
}

// ---------------------------------------------------------------------------
// 1) Données pré-téléchargées (data/places/, mises à jour chaque semaine) : instantané
// ---------------------------------------------------------------------------
const ABS = "https://agozel5.github.io/bayyin/data/places/";
export const PLACES_BASE =
  typeof location !== "undefined" && /^https?:/.test(location.protocol) ? new URL("data/places/", location.href).href : ABS;
const cache = new Map();
function getJson(url, timeout = 8000) {
  if (!cache.has(url)) {
    const job = fetch(url, { signal: AbortSignal.timeout(timeout) })
      .then((r) => (r.ok ? r.json() : r.status === 404 ? null : Promise.reject(new Error(`HTTP ${r.status}`))))
      .catch((e) => { cache.delete(url); throw e; });
    cache.set(url, job);
  }
  return cache.get(url);
}
/** Le point est-il dans un pays dont les commerces sont pré-téléchargés ? */
export function coveredBy(index, lat, lon) {
  if (!index || !index.countries) return false;
  return Object.values(index.countries).some(({ bbox }) => bbox && lat >= bbox[0] && lat <= bbox[2] && lon >= bbox[1] && lon <= bbox[3]);
}
/** Carreaux de 1° qui touchent le cercle de recherche */
export function tilesAround(lat, lon, radius) {
  const dLat = radius / 111000, dLon = radius / (111000 * Math.max(0.2, Math.cos((lat * Math.PI) / 180)));
  const out = [];
  for (let a = Math.floor(lat - dLat); a <= Math.floor(lat + dLat); a++)
    for (let o = Math.floor(lon - dLon); o <= Math.floor(lon + dLon); o++) out.push(`${a}_${o}`);
  return out;
}
export async function localPlaces(lat, lon, radius, base = PLACES_BASE) {
  const index = await getJson(`${base}index.json`);
  if (!coveredBy(index, lat, lon)) return null;
  const have = new Set(index.tiles || []);
  const tiles = await Promise.all(tilesAround(lat, lon, radius).filter((k) => have.has(k)).map((k) => getJson(`${base}${k}.json`)));
  const list = tiles.flat().filter(Boolean)
    .map((p) => ({ address: "", hours: "", phone: "", website: "", cert: null, ...p, distance: distance(lat, lon, p.lat, p.lon) }))
    .filter((p) => p.distance <= radius)
    .sort((a, b) => a.distance - b.distance);
  return { list, source: "local", updated: index.updated };
}

// ---------------------------------------------------------------------------
// 2) En direct (Overpass), hors des pays couverts : les serveurs sont interrogés en même temps,
//    le premier qui répond l'emporte (au lieu d'attendre 30 s qu'un serveur lent abandonne).
// ---------------------------------------------------------------------------
const live = new Map();
export async function livePlaces(lat, lon, radius) {
  const q = buildQuery(lat, lon, radius);
  if (live.has(q)) return live.get(q);
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 25000);
  try {
    const json = await Promise.any(OVERPASS.map(async (url) => {
      const res = await fetch(url, { method: "POST", body: new URLSearchParams({ data: q }), signal: ctl.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    }));
    const out = { list: parsePlaces(json, lat, lon), source: "live" };
    live.set(q, out);
    return out;
  } catch {
    throw new Error("overpass");
  } finally {
    clearTimeout(timer);
    ctl.abort(); // arrête les requêtes encore en cours
  }
}

/** Commerces halal dans un rayon donné (en mètres) : données locales si possible, sinon en direct */
export async function fetchPlaces(lat, lon, radius = 3000) {
  try {
    const local = await localPlaces(lat, lon, radius);
    if (local) return local;
  } catch { /* données locales indisponibles : en direct */ }
  return livePlaces(lat, lon, radius);
}

/** Ville ou adresse -> coordonnées (premier résultat) */
export async function geocode(text, lang = "fr") {
  const url = `${NOMINATIM}?format=jsonv2&limit=1&accept-language=${encodeURIComponent(lang)}&q=${encodeURIComponent(text)}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const list = await res.json();
  if (!list.length) return null;
  return { lat: Number(list[0].lat), lon: Number(list[0].lon), label: list[0].display_name };
}

// Itinéraire : Plans sur iPhone, Google Maps ailleurs
export function directionsUrl(p, ios) {
  return ios
    ? `https://maps.apple.com/?daddr=${p.lat},${p.lon}&q=${encodeURIComponent(p.name || "")}`
    : `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lon}`;
}
export const osmUrl = (p) => `https://www.openstreetmap.org/${p.id}`;
