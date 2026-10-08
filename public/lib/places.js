// Commerces halal autour de soi, d'après OpenStreetMap (carte collaborative, licence ODbL).
// Les commerces sont repérés par l'étiquette diet:halal=only (100 % halal) ou diet:halal=yes
// (propose du halal), et par cuisine=halal sur les restaurants.
// Requêtes : API Overpass (lecture d'OpenStreetMap) ; recherche de ville : Nominatim.
// La position est arrondie à environ 100 m avant d'être envoyée.

export const OVERPASS = ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter"];
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

async function post(url, body, timeout) {
  const res = await fetch(url, { method: "POST", body: new URLSearchParams({ data: body }), signal: AbortSignal.timeout(timeout) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/** Commerces halal dans un rayon donné (en mètres) */
export async function fetchPlaces(lat, lon, radius = 3000) {
  const q = buildQuery(lat, lon, radius);
  let lastErr;
  for (const url of OVERPASS) {
    try {
      return parsePlaces(await post(url, q, 30000), lat, lon);
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error("overpass");
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
