// Origines des ingrédients : des étiquettes d'Open Food Facts (« en:france », « en:european-union »,
// « en:africa »…) aux pays à colorier sur la carte, avec leur drapeau et leur nom dans la langue choisie.
// Carte : Natural Earth 1:110m (domaine public), projetée une fois pour toutes (data/world.json).

export const EU = new Set("AT BE BG HR CY CZ DK EE FI FR DE GR HU IE IT LV LT LU MT NL PL PT RO SK SI ES SE".split(" "));
const CONTINENTS = { europe: "europe", africa: "africa", asia: "asia", oceania: "oceania", "north-america": "north-america", "south-america": "south-america" };
const ALIASES = { "united-states": "US", usa: "US", "united-kingdom": "GB", uk: "GB", "ivory-coast": "CI", "cote-d-ivoire": "CI", czechia: "CZ", "czech-republic": "CZ",
  russia: "RU", "south-korea": "KR", "north-korea": "KP", vietnam: "VN", "viet-nam": "VN", turkiye: "TR", "the-netherlands": "NL", holland: "NL" };

let world = null;
let loading = null;
/** Charge la carte (une fois). */
export function loadWorld(url = "data/world.json") {
  if (world) return Promise.resolve(world);
  if (!loading) {
    loading = fetch(url).then((r) => (r.ok ? r.json() : null)).then((d) => { world = d; return d; }).catch(() => { loading = null; return null; });
  }
  return loading;
}

const slug = (tag) => String(tag || "").replace(/^\w\w:/, "").toLowerCase();

/**
 * Une origine -> { tag, iso (pays) | isos (région), region (clé de région) }
 * Les codes ISO servent au drapeau, au nom traduit et à la carte.
 */
export function resolveOrigin(tag, w = world) {
  const s = slug(tag);
  if (!s || s === "unknown") return null;
  if (s === "european-union" || s === "eu") return { tag: s, region: "european-union", isos: [...EU] };
  if (s === "world") return { tag: s, region: "world", isos: [] };
  if (s === "european-union-and-non-european-union") return { tag: s, region: "europe", isos: isosOf(w, (c) => c.c === "europe") };
  if (s === "non-european-union") return { tag: s, region: "non-european-union", isos: [] };
  if (CONTINENTS[s]) return { tag: s, region: s, isos: isosOf(w, (c) => c.c === CONTINENTS[s]) };
  if (ALIASES[s]) return { tag: s, iso: ALIASES[s] };
  const hit = w && w.c.find((c) => c.k.includes(s));
  if (hit && hit.i) return { tag: s, iso: hit.i };
  return { tag: s }; // inconnu de la carte : affiché en toutes lettres
}
const isosOf = (w, fn) => (w ? w.c.filter((c) => c.i && fn(c)).map((c) => c.i) : []);

/** Drapeau (emoji) d'un pays, ou d'une région. */
export function flagOf(o) {
  if (!o) return "";
  if (o.iso && /^[A-Z]{2}$/.test(o.iso)) return String.fromCodePoint(...[...o.iso].map((ch) => 0x1f1e6 + ch.charCodeAt(0) - 65));
  if (o.region === "european-union") return "🇪🇺";
  if (o.region === "africa" || o.region === "europe") return "🌍";
  if (o.region === "north-america" || o.region === "south-america") return "🌎";
  if (o.region === "asia" || o.region === "oceania") return "🌏";
  return "🌐";
}

/** Nom d'un pays dans la langue de l'interface (Intl), sinon le nom fourni. */
export function countryName(iso, lang) {
  try { return new Intl.DisplayNames([lang], { type: "region" }).of(iso) || iso; } catch { return iso; }
}

/** SVG de la carte, les pays d'origine en couleur. */
export function mapSvg(w, isos, label = "") {
  if (!w) return "";
  const on = new Set(isos);
  const paths = w.c.map((c) => `<path d="${c.d}"${c.i && on.has(c.i) ? ' class="on"' : ""}/>`).join("");
  return `<svg class="env-map" viewBox="0 0 ${w.w} ${w.h}" role="img" aria-label="${label.replace(/"/g, "&quot;")}">${paths}</svg>`;
}
