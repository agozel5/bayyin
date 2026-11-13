// Appels au boycott : Bayyin signale, sans prendre position, les produits des entreprises nommées
// par le mouvement BDS sur sa page de cibles, et les produits d'Israël que cette page vise aussi.
// Liste recopiée à la main depuis la source ci-dessous ; seules les entreprises qui vendent des
// aliments, des boissons, des cosmétiques ou des médicaments sont reprises (pas Intel, HP, AXA…).
// Les marques ajoutées sous une entreprise sont celles qu'elle possède (marques de distributeur de
// Carrefour, boissons du groupe Coca-Cola).

export const BOYCOTT_SOURCE = {
  name: "Mouvement BDS",
  url: "https://bdsmovement.net/Act-Now-Against-These-Companies-Profiting-From-Genocide",
  checked: "2026-11-13", // date à laquelle la liste a été relue
};
// Campagnes de BDS France (page « Que boycotter ? ») : marques de dattes, eau, cosmétiques
export const BOYCOTT_SOURCE_FR = {
  name: "BDS France",
  url: "https://www.bdsfrance.org/que-boycotter/",
  checked: "2026-11-13",
};
/** Source d'une entrée (ou d'un résultat de boycottOf) : { url, checked, key } — key = texte « Source : … » */
export const sourceOf = (e) => (e && (e.level === "bdsfr" || e.kind === "bdsfr") ? { ...BOYCOTT_SOURCE_FR, key: "boycott.source_fr" } : { ...BOYCOTT_SOURCE, key: "boycott.source" });

// level : « bds » = cible prioritaire de l'appel du mouvement BDS ;
//         « organic » = boycott citoyen né en dehors de BDS, que BDS dit soutenir
export const BOYCOTT = [
  { id: "carrefour", company: "Carrefour", level: "bds", shown: ["Carrefour", "Reflets de France", "Simpl"], prefixes: ["carrefour"], brands: ["reflets-de-france", "simpl", "bio-carrefour"] },
  { id: "sodastream", company: "SodaStream", level: "bds", shown: ["SodaStream"], prefixes: ["sodastream"] },
  { id: "teva", company: "Teva", level: "bds", shown: ["Teva"], prefixes: ["teva"] },
  { id: "israel", company: null, level: "bds", origin: "israel" },
  { id: "coca-cola", company: "The Coca-Cola Company", level: "organic", shown: ["Coca-Cola", "Fanta", "Sprite", "Tropico", "Hawai", "Minute Maid", "Powerade", "Fuze Tea", "Chaudfontaine", "Smartwater", "Glacéau Vitaminwater", "Costa Coffee", "Innocent", "Topo Chico"], prefixes: ["coca-cola", "cocacola"],
    brands: ["coke", "fanta", "sprite", "tropico", "hawai", "minute-maid", "powerade", "fuze-tea", "fuzetea", "chaudfontaine", "smartwater", "glaceau", "vitaminwater", "glaceau-vitaminwater", "costa-coffee", "innocent", "topo-chico"] },
  { id: "mcdonalds", company: "McDonald's", level: "organic", shown: ["McDonald's"], prefixes: ["mcdonald-s", "mcdonalds", "mc-donald-s", "mc-donalds"] },
  { id: "burger-king", company: "Burger King", level: "organic", shown: ["Burger King"], prefixes: ["burger-king"] },
  { id: "pizza-hut", company: "Pizza Hut", level: "organic", shown: ["Pizza Hut"], prefixes: ["pizza-hut"] },
  { id: "dominos", company: "Domino's Pizza", level: "organic", shown: ["Domino's"], prefixes: ["domino-s", "dominos"] },
  // level « bdsfr » : campagnes de BDS France. only = le produit doit aussi être dans une de ces catégories
  // (pour les noms de marque trop courants : « Carmel », « Jaffa »…). why = clé du texte de la raison.
  { id: "mehadrin", company: "Mehadrin", level: "bdsfr", why: "dates", shown: ["Mehadrin"], prefixes: ["mehadrin"] },
  { id: "hadiklaim", company: "Hadiklaim", level: "bdsfr", why: "dates", shown: ["Hadiklaim", "Jordan River", "King Solomon"], prefixes: ["hadiklaim"], brands: ["jordan-river", "king-solomon"] },
  { id: "dattes", company: "Jaffa, Carmel, Edom, Kedem", level: "bdsfr", why: "dates", shown: ["Jaffa (dattes)", "Carmel (dattes)", "Edom (dattes)", "Kedem (dattes)"], brands: ["jaffa", "carmel", "edom", "kedem"], only: ["en:dates", "en:medjool-dates", "en:dried-dates"] },
  { id: "eden", company: "Eden Springs (Château d'Eau)", level: "bdsfr", shown: ["Eden Springs", "Château d'Eau"], prefixes: ["eden-springs", "eden-spring"], brands: ["chateau-d-eau"] },
  { id: "ahava", company: "Ahava", level: "bdsfr", shown: ["Ahava"], prefixes: ["ahava"] },
  { id: "papa-johns", company: "Papa John's", level: "organic", shown: ["Papa John's"], prefixes: ["papa-john-s", "papa-johns"] },
];

// « Coca-Cola Zéro » → « coca-cola-zero » (comme les brands_tags d'Open Food Facts)
export const slug = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
  .replace(/[’']/g, "-").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

// Marques du produit : forme « slug » → nom tel qu'écrit sur la fiche (quand on l'a)
function brandSlugs(raw) {
  const out = new Map();
  String(raw.brands || "").split(",").forEach((b) => { const x = slug(b); if (x && !out.has(x)) out.set(x, b.trim()); });
  (raw.brands_tags || []).forEach((b) => { const x = slug(String(b).replace(/^[a-z]{2}:/, "")); if (x && !out.has(x)) out.set(x, ""); });
  return out;
}

// Catégorie de chaque entrée, pour les réglages : cibles BDS, boycotts citoyens, produits d'Israël
export const kindOfEntry = (e) => (e.id === "israel" ? "israel" : e.level === "organic" ? "organic" : e.level === "bdsfr" ? "bdsfr" : "bds");
export const DEFAULT_KINDS = { bds: true, bdsfr: true, organic: true, israel: true };
export const KIND_ORDER = ["bds", "bdsfr", "israel", "organic"];

/**
 * Entrée de la liste qui concerne ce produit (ou null) :
 * { id, company, level, kind, via: "brand" | "origin" | "barcode", brand?, owned? }
 * owned = la marque trouvée appartient à l'entreprise sans porter son nom (Fanta → Coca-Cola).
 * kinds : catégories à signaler (toutes par défaut).
 */
export function boycottOf(raw, kinds = DEFAULT_KINDS) {
  if (!raw) return null;
  const names = brandSlugs(raw);
  const tags = [...names.keys()];
  for (const e of BOYCOTT) {
    if (e.origin || kinds[kindOfEntry(e)] === false) continue;
    if (e.only && !(raw.categories_tags || []).some((c) => e.only.includes(c))) continue;
    const byName = tags.find((tg) => (e.prefixes || []).some((p) => tg === p || tg.startsWith(p + "-")));
    const owned = byName ? null : tags.find((tg) => (e.brands || []).includes(tg));
    const hit = byName || owned;
    if (hit) return { id: e.id, company: e.company, level: e.level, kind: kindOfEntry(e), why: e.why || e.id, via: "brand", brand: hit, brandName: names.get(hit) || brandLabel(hit), owned: !!owned };
  }
  if (kinds.israel === false) return null;
  // Produit d'Israël : origine déclarée sur Open Food Facts, ou code-barres attribué par GS1 Israël (préfixe 729)
  const origins = [...(raw.origins_tags || []), ...(raw.manufacturing_places_tags || [])].map((x) => String(x).replace(/^[a-z]{2}:/, ""));
  if (origins.includes("israel")) return { id: "israel", company: null, level: "bds", kind: "israel", via: "origin" };
  if (raw.kind !== "medicine" && /^729\d{10}$/.test(String(raw.code || ""))) return { id: "israel", company: null, level: "bds", kind: "israel", via: "barcode" };
  return null;
}

// Nom de marque lisible à partir de la forme « fuze-tea » : « Fuze Tea »
export const brandLabel = (tag) => String(tag || "").split("-").filter(Boolean).map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");
