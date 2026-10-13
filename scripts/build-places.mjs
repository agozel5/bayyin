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

async function overpass(query) {
  let last;
  for (let round = 0; round < 3; round++) {
    for (const url of SERVERS) {
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: { "User-Agent": "Bayyin/1.0 (github.com/agozel5/bayyin)" },
          body: new URLSearchParams({ data: query }),
          signal: AbortSignal.timeout(400000),
        });
        if (!res.ok) throw new Error(`${url} HTTP ${res.status}`);
        const json = await res.json();
        if (json.remark && /runtime error|timed out/i.test(json.remark)) throw new Error(`${url} ${json.remark}`);
        return json;
      } catch (e) {
        last = e;
        console.log("  essai échoué :", e.message);
        await sleep(15000);
      }
    }
  }
  throw last;
}

const r5 = (x) => Math.round(x * 1e5) / 1e5; // ≈ 1 m
export const tileOf = (lat, lon) => `${Math.floor(lat)}_${Math.floor(lon)}`;

async function main() {
  let previous = { countries: {} };
  try { previous = JSON.parse(await readFile(new URL("index.json", OUT), "utf8")); } catch { /* première fois */ }
  const all = new Map(); // id -> commerce
  const done = {};
  for (const [cc, bbox] of Object.entries(COUNTRIES)) {
    const q = `[out:json][timeout:360];area["ISO3166-1"="${cc}"][admin_level=2]->.a;` +
      `(nwr(area.a)["diet:halal"~"^(yes|only)$"];nwr(area.a)["cuisine"~"halal",i];);out tags center qt;`;
    try {
      const json = await overpass(q);
      const list = parsePlaces(json, 0, 0);
      for (const p of list) all.set(p.id, p);
      done[cc] = { n: list.length, bbox };
      console.log(`${cc} : ${list.length} commerces`);
    } catch (e) {
      console.log(`${cc} indisponible (${e.message})`);
    }
    await sleep(5000);
  }
  // Pays qui n'ont pas répondu : on garde leurs commerces de la semaine précédente
  const missing = Object.keys(COUNTRIES).filter((cc) => !done[cc] && previous.countries && previous.countries[cc]);
  if (missing.length) {
    for (const key of previous.tiles || []) {
      const old = JSON.parse(await readFile(new URL(`${key}.json`, OUT), "utf8"));
      for (const p of old) {
        const cc = missing.find((c) => { const [s, w, n, e] = COUNTRIES[c]; return p.lat >= s && p.lat <= n && p.lon >= w && p.lon <= e; });
        if (cc && !all.has(p.id)) all.set(p.id, p);
      }
    }
    for (const cc of missing) done[cc] = { ...previous.countries[cc], kept: true };
    console.log("gardés de la semaine précédente :", missing.join(", "));
  }
  if (all.size < 500) throw new Error(`Trop peu de commerces (${all.size}) : rien n'est écrit.`);

  const tiles = new Map();
  for (const p of all.values()) {
    const key = tileOf(p.lat, p.lon);
    const { distance, ...rest } = p;
    const item = { ...rest, lat: r5(p.lat), lon: r5(p.lon) };
    for (const k of Object.keys(item)) if (item[k] === "" || item[k] === null) delete item[k];
    (tiles.get(key) || tiles.set(key, []).get(key)).push(item);
  }
  await rm(OUT, { recursive: true, force: true });
  await mkdir(OUT, { recursive: true });
  for (const [key, list] of tiles) await writeFile(new URL(`${key}.json`, OUT), JSON.stringify(list));
  const index = { updated: new Date().toISOString().slice(0, 10), count: all.size, countries: done, tiles: [...tiles.keys()].sort() };
  await writeFile(new URL("index.json", OUT), JSON.stringify(index));
  await writeFile(new URL("README.md", OUT),
    "# Commerces halal\n\nDonnées © contributeurs OpenStreetMap, licence ODbL (https://www.openstreetmap.org/copyright).\n" +
    "Construit chaque semaine par scripts/build-places.mjs. Un fichier par carreau de 1° × 1° (« lat_lon »).\n");
  console.log(JSON.stringify({ updated: index.updated, count: index.count, tiles: index.tiles.length, countries: Object.fromEntries(Object.entries(done).map(([k, v]) => [k, v.n])) }));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
