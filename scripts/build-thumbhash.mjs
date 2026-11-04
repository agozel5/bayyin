// Aperçus flous des photos des classements (ThumbHash : ~25 caractères par photo).
// L'app les affiche tout de suite, avant la vraie photo. Aucune image n'est hébergée par Bayyin :
// seule cette courte chaîne est ajoutée à chaque produit (champ « th ») des fichiers public/data/rankings/.
// Les aperçus déjà calculés sont gardés (thumbs.json, clé : adresse de la photo) : seules les nouvelles photos sont lues.
// Dépendances (installées seulement pour ce script, dans l'automatisation) : sharp, thumbhash.
import { readdir, readFile, writeFile } from "node:fs/promises";
import sharp from "sharp";
import { rgbaToThumbHash } from "thumbhash";

const DIR = new URL("../public/data/rankings/", import.meta.url);
const CACHE = new URL("thumbs.json", DIR);
const OK_HOST = /^https:\/\/(images|static)\.open(food|beauty)facts\.org\//; // seulement les photos d'Open Food Facts
const MAX_BYTES = 2_000_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function hashOf(url) {
  const res = await fetch(url, { headers: { "User-Agent": "Bayyin/1.0 (classements, apercus)" }, signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length > MAX_BYTES) throw new Error("photo trop lourde");
  // Petite image (100 px au plus), fond blanc comme dans l'app
  const { data, info } = await sharp(buf, { limitInputPixels: 25_000_000 }).flatten({ background: "#ffffff" })
    .resize(100, 100, { fit: "inside" }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return Buffer.from(rgbaToThumbHash(info.width, info.height, data)).toString("base64");
}

async function main() {
  let cache = {};
  try { cache = JSON.parse(await readFile(CACHE, "utf8")); } catch { /* première fois */ }
  const files = (await readdir(DIR)).filter((f) => f.endsWith(".json") && f !== "index.json" && f !== "thumbs.json");
  const used = new Set();
  let fresh = 0, failed = 0;
  for (const f of files) {
    const list = JSON.parse(await readFile(new URL(f, DIR), "utf8"));
    if (!Array.isArray(list)) continue;
    let changed = false;
    for (const p of list) {
      const url = p.image_front_small_url || p.image_front_url;
      if (!url || !OK_HOST.test(url)) continue;
      used.add(url);
      if (!cache[url]) {
        try { cache[url] = await hashOf(url); fresh++; } catch (e) { failed++; console.log(`  ${p.code} : ${e.message}`); continue; }
        await sleep(150);
      }
      if (p.th !== cache[url]) { p.th = cache[url]; changed = true; }
    }
    if (changed) await writeFile(new URL(f, DIR), JSON.stringify(list));
    console.log(`${f} : ${list.length} produits`);
  }
  // Photos qui ne sont plus dans les classements : oubliées
  for (const k of Object.keys(cache)) if (!used.has(k)) delete cache[k];
  await writeFile(CACHE, JSON.stringify(cache));
  console.log(`Aperçus : ${fresh} nouveaux, ${failed} échecs, ${Object.keys(cache).length} au total`);
}
main().catch((e) => { console.error(e); process.exit(1); });
