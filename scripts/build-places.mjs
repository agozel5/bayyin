// Commerces halal d'OpenStreetMap (licence ODbL), pré-téléchargés -> public/data/places/
//
// Interroger Overpass depuis le téléphone prend souvent 10 à 30 secondes (serveurs publics chargés).
// Ici, GitHub Actions télécharge une fois par semaine tous les commerces halal des pays couverts,
// rangés en carreaux de 1° × 1° : l'app ne charge que le ou les carreaux autour de l'utilisateur
// (quelques ko, depuis le même site), et trie par distance sur le téléphone. Instantané.
// Hors des pays couverts, l'app interroge Overpass en direct, comme avant.

import { mkdir, writeFile, readFile, rm } from "node:fs/promises";
import { parsePlaces } from "../public/lib/places.js";

const OUT = new URL("../public/data/places/", import.meta.url);
const SERVERS = ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter", "https://overpass.private.coffee/api/interpreter"];
// Pays couverts, avec leur cadre (sud, ouest, nord, est) : la France et ses voisins, et les pays
// d'Europe où vivent beaucoup d'utilisateurs potentiels.
export const COUNTRIES = {
  FR: [41.3, -5.2, 51.1, 9.6],
  BE: [49.5, 2.5, 51.5, 6.4],
  LU: [49.4, 5.7, 50.2, 6.6],
  CH: [45.8, 5.9, 47.8, 10.5],
  NL: [50.7, 3.3, 53.6, 7.3],
  DE: [47.2, 5.8, 55.1, 15.1],
  GB: [49.9, -8.7, 60.9, 1.8],
  ES: [36.0, -9.4, 43.8, 3.4],
  IT: [36.6, 6.6, 47.1, 18.6],
  AT: [46.4, 9.5, 49.0, 17.2],
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Un essai par serveur (3 au total), chacun limité à 2 minutes
async function overpass(query) {
  let last;
  for (const url of SERVERS) {
    const t0 = Date.now();
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "User-Agent": "Bayyin/1.0 (github.com/agozel5/bayyin)" },
        body: new URLSearchParams({ data: query }),
        signal: AbortSignal.timeout(120000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json.remark && /runtime error|timed out|out of memory/i.test(json.remark)) throw new Error(json.remark.slice(0, 120));
      return json;
    } catch (e) {
      last = e;
      console.log(`  ${new URL(url).host} : échec après ${Math.round((Date.now() - t0) / 1000)} s (${e.message})`);
      await sleep(4000);
    }
  }
  throw last;
}

const r5 = (x) => Math.round(x * 1e5) / 1e5; // ≈ 1 m
export const tileOf = (lat, lon) => `${Math.floor(lat)}_${Math.floor(lon)}`;

// Grille alignée de 2° × 2° : petites requêtes rapides (quelques secondes), aucun doublon entre pays,
// et une case qui échoue n'empêche pas les autres.
const STEP = 2;
function chunks() {
  const set = new Map();
  for (const [s, w, n, e] of Object.values(COUNTRIES))
    for (let a = Math.floor(s / STEP) * STEP; a < n; a += STEP)
      for (let o = Math.floor(w / STEP) * STEP; o < e; o += STEP) set.set(`${a}_${o}`, [a, o, a + STEP, o + STEP]);
  return [...set.entries()];
}
const inBox = (p, [s, w, n, e]) => p.lat >= s && p.lat < n && p.lon >= w && p.lon < e;

async function readPrevious() {
  try {
    const index = JSON.parse(await readFile(new URL("index.json", OUT), "utf8"));
    const list = [];
    for (const key of index.tiles || []) list.push(...JSON.parse(await readFile(new URL(`${key}.json`, OUT), "utf8")));
    return list;
  } catch { return []; }
}

async function save(all, failed) {
  const tiles = new Map();
  for (const p of all.values()) {
    const key = tileOf(p.lat, p.lon);
    const { distance, ...rest } = p;
    const item = { ...rest, lat: r5(p.lat), lon: r5(p.lon) };
    for (const k of Object.keys(item)) if (item[k] === "" || item[k] === null || item[k] === undefined) delete item[k];
    (tiles.get(key) || tiles.set(key, []).get(key)).push(item);
  }
  await rm(OUT, { recursive: true, force: true });
  await mkdir(OUT, { recursive: true });
  for (const [key, list] of tiles) await writeFile(new URL(`${key}.json`, OUT), JSON.stringify(list));
  const countries = Object.fromEntries(Object.entries(COUNTRIES).map(([cc, bbox]) => [cc, { bbox }]));
  const index = { updated: new Date().toISOString().slice(0, 10), count: all.size, countries, failed, tiles: [...tiles.keys()].sort() };
  await writeFile(new URL("index.json", OUT), JSON.stringify(index));
  await writeFile(new URL("README.md", OUT),
    "# Commerces halal\n\nDonnées © contributeurs OpenStreetMap, licence ODbL (https://www.openstreetmap.org/copyright).\n" +
    "Construit chaque semaine par scripts/build-places.mjs. Un fichier par carreau de 1° × 1° (« lat_lon »).\n");
  return index;
}

async function main() {
  const previous = await readPrevious();
  const all = new Map(); // id -> commerce
  const failed = [];
  const list = chunks();
  const T = Date.now();
  console.log(`${list.length} cases de ${STEP}° à interroger`);
  for (const [i, [key, box]] of list.entries()) {
    const b = `(${box.join(",")})`;
    const q = `[out:json][timeout:90];(nwr["diet:halal"~"^(yes|only)$"]${b};nwr["cuisine"~"halal"]${b};nwr["cuisine"~"Halal"]${b};);out tags center qt;`;
    try {
      const found = parsePlaces(await overpass(q), 0, 0).filter((p) => inBox(p, box));
      for (const p of found) all.set(p.id, p);
      console.log(`[${Math.round((Date.now() - T) / 1000)} s] ${i + 1}/${list.length} case ${key} : ${found.length}`);
    } catch (e) {
      // Case indisponible : on garde ses commerces de la semaine précédente
      failed.push(key);
      const kept = previous.filter((p) => inBox(p, box));
      for (const p of kept) all.set(p.id, p);
      console.log(`[${Math.round((Date.now() - T) / 1000)} s] ${i + 1}/${list.length} case ${key} indisponible (${e.message}) : ${kept.length} gardés`);
    }
    await sleep(1500);
  }
  if (all.size < 500) throw new Error(`Trop peu de commerces (${all.size}) : rien n'est écrit.`);
  const index = await save(all, failed);
  console.log(JSON.stringify({ updated: index.updated, count: index.count, tiles: index.tiles.length, failed: failed.length }));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
