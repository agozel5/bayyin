// Classements -> public/data/rankings/<rayon>.json (+ index.json)
//
// Pour chaque rayon : les produits les plus scannés en France sur Open Food Facts (aliments) ou
// Open Beauty Facts (cosmétiques), avec leur liste d'ingrédients. On garde les meilleurs selon la note
// santé, sans ceux qui sont haram avec les réglages par défaut. L'app recalcule ensuite le verdict
// halal et la note avec les réglages de chaque utilisateur.
// Données : Open Food Facts / Open Beauty Facts, licence ODbL.

import { mkdir, writeFile, rm, readFile } from "node:fs/promises";
import { setCosmeticDb } from "../public/lib/cosmetic.js";
import { RANK_CATEGORIES } from "../public/lib/rankings.js";
import { FIELDS, present } from "../public/lib/off.js";
import { ingredientsText } from "../public/lib/rules.js";

const OUT = new URL("../public/data/rankings/", import.meta.url);
const BASE = { food: "https://world.openfoodfacts.org", beauty: "https://world.openbeautyfacts.org" };
const KEEP = 80; // produits gardés par rayon
const PAGES = 3; // 3 × 100 produits les plus scannés lus par étiquette
const UA = { "User-Agent": "Bayyin/1.0 (github.com/agozel5/bayyin)" };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getJson(url, tries = 3) {
  for (let i = 1; ; i++) {
    try {
      const res = await fetch(url, { headers: UA, signal: AbortSignal.timeout(60000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      if (i >= tries) throw e;
      await sleep(3000 * i);
    }
  }
}

// Champs gardés (le reste n'est pas utile au classement) ; valeurs nutritionnelles pour 100 g seulement
const KEYS = FIELDS.split(",").filter((k) => !/^image_(front_url|ingredients_url|nutrition_url)$|^states_tags$|^emb_codes/.test(k));
function slim(p, kind) {
  const out = { kind };
  for (const k of KEYS) if (p[k] !== undefined && p[k] !== "" && p[k] !== null) out[k] = p[k];
  if (p.nutriments) {
    out.nutriments = {};
    for (const [k, v] of Object.entries(p.nutriments)) if (/_100g$/.test(k) && typeof v === "number") out.nutriments[k] = v;
  }
  if (out.categories_tags) out.categories_tags = out.categories_tags.slice(-8);
  if (kind === "food") delete out.kind;
  return out;
}

async function main() {
  // Base des ingrédients cosmétiques (CosIng), comme dans l'app
  try { setCosmeticDb(JSON.parse(await readFile(new URL("../public/data/cosing.json", import.meta.url), "utf8"))); } catch { /* sans CosIng */ }
  await rm(OUT, { recursive: true, force: true });
  await mkdir(OUT, { recursive: true });
  const index = { updated: new Date().toISOString().slice(0, 10), categories: {} };
  for (const cat of RANK_CATEGORIES) {
    const seen = new Map();
    for (const tag of cat.tags) {
      for (let page = 1; page <= PAGES; page++) {
        const url = `${BASE[cat.kind]}/api/v2/search?categories_tags=${encodeURIComponent(tag)}&countries_tags=en:france` +
          `&sort_by=unique_scans_n&page_size=100&page=${page}&fields=${FIELDS},nutriments`;
        try {
          const data = await getJson(url);
          const list = (data && data.products) || [];
          for (const p of list) if (p.code && !seen.has(p.code)) seen.set(p.code, p);
          if (list.length < 100) break;
        } catch (e) {
          console.log(`  ${cat.id} ${tag} p${page} : ${e.message}`);
          break;
        }
        await sleep(1200);
      }
    }
    // Avec ingrédients, une note, et pas haram avec les réglages par défaut
    const ranked = [...seen.values()]
      .filter((p) => ingredientsText(p))
      .map((p) => ({ raw: slim(p, cat.kind), shown: present(cat.kind === "beauty" ? { ...p, kind: "beauty" } : p) }))
      .filter(({ shown }) => shown.verdict.status !== "haram" && shown.health && shown.health.score && typeof shown.health.score.score === "number")
      .sort((a, b) => b.shown.health.score.score - a.shown.health.score.score)
      .slice(0, KEEP)
      .map((x) => x.raw);
    console.log(`${cat.id} : ${seen.size} lus, ${ranked.length} gardés`);
    if (ranked.length < 5) continue; // rayon trop peu renseigné : pas affiché
    await writeFile(new URL(`${cat.id}.json`, OUT), JSON.stringify(ranked));
    index.categories[cat.id] = ranked.length;
  }
  if (Object.keys(index.categories).length < 5) throw new Error("Trop peu de rayons : rien n'est publié.");
  await writeFile(new URL("index.json", OUT), JSON.stringify(index));
  await writeFile(new URL("README.md", OUT),
    "# Classements\n\nProduits les plus scannés en France par rayon, avec ingrédients (Open Food Facts / Open Beauty Facts, licence ODbL).\n" +
    "Construit chaque semaine par scripts/build-rankings.mjs ; l'app recalcule verdict halal et note avec les réglages de l'utilisateur.\n");
  console.log(JSON.stringify(index));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
