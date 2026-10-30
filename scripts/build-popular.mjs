// Produits populaires pour le hors connexion -> public/data/popular.json
//
// Les 500 produits les plus scannés en France sur Open Food Facts, avec ce qu'il faut pour le verdict
// halal et la note santé. L'app télécharge ce seul fichier (rapide, toujours disponible) au lieu de
// lancer cinq recherches sur Open Food Facts, dont le moteur de recherche est souvent saturé.
// Données : Open Food Facts, licence ODbL.

import { writeFile, mkdir } from "node:fs/promises";
import { FIELDS } from "../public/lib/off.js";

const OUT = new URL("../public/data/popular.json", import.meta.url);
const UA = { "User-Agent": "Bayyin/1.0 (github.com/agozel5/bayyin)" };
const PAGES = 5, SIZE = 100;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getJson(url, tries = 6) {
  for (let i = 1; ; i++) {
    try {
      const res = await fetch(url, { headers: UA, signal: AbortSignal.timeout(60000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      if (i >= tries) throw e;
      console.log(`  nouvel essai (${e.message})`);
      await sleep(10000 * i);
    }
  }
}

// Champs gardés ; valeurs nutritionnelles pour 100 g seulement
const KEYS = FIELDS.split(",");
function slim(p) {
  const out = {};
  for (const k of KEYS) if (k !== "nutriments" && p[k] !== undefined && p[k] !== "" && p[k] !== null) out[k] = p[k];
  if (p.nutriments) {
    out.nutriments = {};
    for (const [k, v] of Object.entries(p.nutriments)) if (/_100g$/.test(k) && typeof v === "number") out.nutriments[k] = v;
  }
  if (out.categories_tags) out.categories_tags = out.categories_tags.slice(-8);
  return out;
}

const seen = new Map();
for (let page = 1; page <= PAGES; page++) {
  const url = `https://world.openfoodfacts.org/api/v2/search?countries_tags=en:france&sort_by=unique_scans_n` +
    `&page_size=${SIZE}&page=${page}&fields=${FIELDS},nutriments`;
  console.log(`Page ${page}…`);
  const data = await getJson(url);
  for (const p of (data && data.products) || []) if (p.code && !seen.has(p.code)) seen.set(p.code, slim(p));
  await sleep(6000);
}
if (seen.size < 100) throw new Error(`Trop peu de produits (${seen.size}) : fichier précédent gardé.`);
await mkdir(new URL("./", OUT), { recursive: true });
await writeFile(OUT, JSON.stringify({ updated: new Date().toISOString().slice(0, 10), products: [...seen.values()] }));
console.log(`${seen.size} produits enregistrés.`);
