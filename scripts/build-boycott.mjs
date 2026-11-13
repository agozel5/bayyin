// Appels au boycott -> public/data/boycott.json
//
// Pour chaque entreprise de public/lib/boycott.js : de vrais produits de ses marques tirés d'Open Food
// Facts (photo, nom, marque), pour illustrer la page « Appels au boycott » de l'app. Pour les produits
// d'Israël : des produits dont l'origine indiquée est Israël. La liste des entreprises elle-même reste
// dans le code (relue à la main) ; ce fichier ne contient que des exemples de produits.
// Données : Open Food Facts, licence ODbL ; photos sous licence CC BY-SA.

import { writeFile } from "node:fs/promises";
import { BOYCOTT, boycottOf } from "../public/lib/boycott.js";

const OUT = new URL("../public/data/boycott.json", import.meta.url);
const OFF = "https://world.openfoodfacts.org";
const UA = { "User-Agent": "Bayyin/1.0 (bayyin app; data refresh)" };
const FIELDS = "code,product_name,product_name_fr,brands,brands_tags,origins_tags,image_front_small_url,categories_tags";
const PER_COMPANY = 12;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Open Food Facts limite les recherches (environ 10 par minute) : une requête toutes les 7 s, et on
// attend plus longtemps en cas de refus
async function getJson(url, tries = 5) {
  for (let i = 1; ; i++) {
    try {
      const res = await fetch(url, { headers: UA, signal: AbortSignal.timeout(60000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      if (i >= tries) throw e;
      await sleep(15000 * i);
    }
  }
}

// Requêtes par entreprise : la marque principale, puis quelques marques qu'elle possède
const QUERIES = {
  carrefour: ["brands_tags=carrefour", "brands_tags=carrefour-bio", "brands_tags=reflets-de-france", "brands_tags=simpl"],
  sodastream: ["brands_tags=sodastream"],
  "coca-cola": ["brands_tags=coca-cola", "brands_tags=fanta", "brands_tags=sprite", "brands_tags=minute-maid", "brands_tags=fuze-tea"],
  mcdonalds: ["brands_tags=mcdonald-s"],
  "burger-king": ["brands_tags=burger-king"],
  "pizza-hut": ["brands_tags=pizza-hut"],
  dominos: ["brands_tags=domino-s"],
  "papa-johns": ["brands_tags=papa-john-s"],
  israel: ["origins_tags=en:israel"],
  mehadrin: ["brands_tags=mehadrin"],
  hadiklaim: ["brands_tags=hadiklaim", "brands_tags=jordan-river", "brands_tags=king-solomon"],
};
// Marques de distributeur et boissons vendues en France ; restauration rapide et produits d'Israël : tous pays
const FRANCE_ONLY = new Set(["carrefour", "sodastream", "coca-cola"]);

async function main() {
  const out = { updated: new Date().toISOString().slice(0, 10), companies: {} };
  for (const e of BOYCOTT) {
    const qs = QUERIES[e.id];
    if (!qs) continue; // Teva : médicaments, pas dans Open Food Facts
    const seen = new Map();
    const per = Math.ceil(PER_COMPANY / qs.length) + 2;
    for (const q of qs) {
      const url = `${OFF}/api/v2/search?${q}${FRANCE_ONLY.has(e.id) ? "&countries_tags=en:france" : ""}&sort_by=unique_scans_n&page_size=40&fields=${FIELDS}`;
      let data;
      try { data = await getJson(url); } catch (err) { console.log(`${e.id} ${q} : ${err.message}`); await sleep(7000); continue; }
      let added = 0;
      for (const p of (data && data.products) || []) {
        if (!p.code || !p.image_front_small_url || seen.has(p.code) || !(p.product_name_fr || p.product_name)) continue;
        // Le produit doit être reconnu par la même règle que dans l'app (pas de faux exemple)
        const b = boycottOf(p);
        if (!b || b.id !== e.id) continue;
        seen.set(p.code, { code: p.code, name: p.product_name_fr || p.product_name, brands: p.brands || "", image: p.image_front_small_url });
        if (++added >= per) break;
      }
      console.log(`${e.id} ${q} : ${added} produits`);
      await sleep(7000);
    }
    out.companies[e.id] = { products: [...seen.values()].slice(0, PER_COMPANY) };
  }
  await writeFile(OUT, JSON.stringify(out) + "\n");
  console.log("Écrit :", Object.entries(out.companies).map(([k, v]) => `${k}=${v.products.length}`).join(" "));
}

main().catch((e) => { console.error(e); process.exit(1); });
