// Appels au boycott : Bayyin signale, sans prendre position, les produits des entreprises nommées
// par le mouvement BDS sur sa page de cibles, et les produits d'Israël que cette page vise aussi.
// Liste recopiée à la main depuis la source ci-dessous ; seules les entreprises qui vendent des
// aliments, des boissons, des cosmétiques ou des médicaments sont reprises (pas Intel, HP, AXA…).
// Les marques ajoutées sous une entreprise sont celles qu'elle possède (marques de distributeur de
// Carrefour, boissons du groupe Coca-Cola).

export const BOYCOTT_SOURCE = {
  name: "Mouvement BDS",
  url: "https://bdsmovement.net/Act-Now-Against-These-Companies-Profiting-From-Genocide",
  checked: "2026-11-09", // date à laquelle la liste a été relue
};

// level : « bds » = cible prioritaire de l'appel du mouvement BDS ;
//         « organic » = boycott citoyen né en dehors de BDS, que BDS dit soutenir
export const BOYCOTT = [
  { id: "carrefour", company: "Carrefour", level: "bds", prefixes: ["carrefour"], brands: ["reflets-de-france", "simpl", "bio-carrefour"] },
  { id: "sodastream", company: "SodaStream", level: "bds", prefixes: ["sodastream"] },
  { id: "teva", company: "Teva", level: "bds", prefixes: ["teva"] },
  { id: "israel", company: null, level: "bds", origin: "israel" },
  { id: "coca-cola", company: "The Coca-Cola Company", level: "organic", prefixes: ["coca-cola", "cocacola"],
    brands: ["coke", "fanta", "sprite", "minute-maid", "powerade", "fuze-tea", "fuzetea", "chaudfontaine", "smartwater", "glaceau", "vitaminwater", "glaceau-vitaminwater", "costa-coffee", "innocent", "topo-chico"] },
  { id: "mcdonalds", company: "McDonald's", level: "organic", prefixes: ["mcdonald-s", "mcdonalds", "mc-donald-s", "mc-donalds"] },
  { id: "burger-king", company: "Burger King", level: "organic", prefixes: ["burger-king"] },
  { id: "pizza-hut", company: "Pizza Hut", level: "organic", prefixes: ["pizza-hut"] },
  { id: "dominos", company: "Domino's Pizza", level: "organic", prefixes: ["domino-s", "dominos"] },
  { id: "papa-johns", company: "Papa John's", level: "organic", prefixes: ["papa-john-s", "papa-johns"] },
];

// « Coca-Cola Zéro » → « coca-cola-zero » (comme les brands_tags d'Open Food Facts)
export const slug = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
  .replace(/[’']/g, "-").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

function brandSlugs(raw) {
  const out = new Set();
  (raw.brands_tags || []).forEach((b) => out.add(slug(String(b).replace(/^[a-z]{2}:/, ""))));
  String(raw.brands || "").split(",").forEach((b) => { const x = slug(b); if (x) out.add(x); });
  return [...out];
}

/**
 * Entrée de la liste qui concerne ce produit (ou null) :
 * { id, company, level, via: "brand" | "origin" | "barcode", brand? }
 */
export function boycottOf(raw) {
  if (!raw) return null;
  const tags = brandSlugs(raw);
  for (const e of BOYCOTT) {
    if (e.origin) continue;
    const hit = tags.find((tg) => (e.prefixes || []).some((p) => tg === p || tg.startsWith(p + "-")) || (e.brands || []).includes(tg));
    if (hit) return { id: e.id, company: e.company, level: e.level, via: "brand", brand: hit };
  }
  // Produit d'Israël : origine déclarée sur Open Food Facts, ou code-barres attribué par GS1 Israël (préfixe 729)
  const origins = [...(raw.origins_tags || []), ...(raw.manufacturing_places_tags || [])].map((x) => String(x).replace(/^[a-z]{2}:/, ""));
  if (origins.includes("israel")) return { id: "israel", company: null, level: "bds", via: "origin" };
  if (raw.kind !== "medicine" && /^729\d{10}$/.test(String(raw.code || ""))) return { id: "israel", company: null, level: "bds", via: "barcode" };
  return null;
}
