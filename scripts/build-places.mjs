// Commerces halal d'OpenStreetMap (licence ODbL), pré-téléchargés -> public/data/places/
//
// Interroger Overpass depuis le téléphone prend souvent 10 à 30 secondes : ses serveurs publics sont
// saturés (erreurs 504 fréquentes). Ici, GitHub Actions télécharge une fois par semaine les extraits
// OpenStreetMap de Geofabrik, n'en garde que les commerces halal (osmium), et les range en carreaux
// de 1° × 1°. L'app ne charge que le ou les carreaux autour de l'utilisateur (quelques ko, depuis le
// même site) et trie par distance sur le téléphone : la réponse est instantanée.
// Hors des pays couverts, l'app interroge Overpass en direct, comme avant.
//
// Nécessite osmium-tool et curl (installés par le workflow).

import { mkdir, writeFile, readFile, rm } from "node:fs/promises";
import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";
import { execSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { parsePlaces } from "../public/lib/places.js";

const OUT = new URL("../public/data/places/", import.meta.url);
const GEOFABRIK = "https://download.geofabrik.de/europe/";
// Pays couverts : extrait Geofabrik et cadre (sud, ouest, nord, est) utilisé par l'app
export const COUNTRIES = {
  FR: ["france", [41.3, -5.2, 51.1, 9.6]],
  BE: ["belgium", [49.5, 2.5, 51.5, 6.4]],
  LU: ["luxembourg", [49.4, 5.7, 50.2, 6.6]],
  CH: ["switzerland", [45.8, 5.9, 47.8, 10.5]],
  NL: ["netherlands", [50.7, 3.3, 53.6, 7.3]],
  DE: ["germany", [47.2, 5.8, 55.1, 15.1]],
  GB: ["great-britain", [49.9, -8.7, 60.9, 1.8]],
  ES: ["spain", [36.0, -9.4, 43.8, 3.4]],
  IT: ["italy", [36.6, 6.6, 47.1, 18.6]],
  AT: ["austria", [46.4, 9.5, 49.0, 17.2]],
};

const r5 = (x) => Math.round(x * 1e5) / 1e5; // ≈ 1 m
export const tileOf = (lat, lon) => `${Math.floor(lat)}_${Math.floor(lon)}`;
export const isHalal = (t) => /^(yes|only)$/.test(t["diet:halal"] || "") || /halal/i.test(t.cuisine || "");

// Centre d'une géométrie GeoJSON (point, ou milieu du cadre d'un bâtiment)
export function centerOf(g) {
  if (!g || !g.coordinates) return null;
  if (g.type === "Point") return { lon: g.coordinates[0], lat: g.coordinates[1] };
  let s = 90, w = 180, n = -90, e = -180;
  const walk = (c) => {
    if (typeof c[0] === "number") { s = Math.min(s, c[1]); n = Math.max(n, c[1]); w = Math.min(w, c[0]); e = Math.max(e, c[0]); }
    else c.forEach(walk);
  };
  walk(g.coordinates);
  return n >= s ? { lat: (s + n) / 2, lon: (w + e) / 2 } : null;
}

// Une ligne GeoJSON (sortie « geojsonseq » d'osmium) -> élément au format Overpass
export function featureToElement(line) {
  const f = JSON.parse(line.replace(/^\x1e/, ""));
  const { "@type": type, "@id": id, ...tags } = f.properties || {};
  if (!isHalal(tags)) return null;
  const c = centerOf(f.geometry);
  if (!c) return null;
  // Un « area » d'osmium vient d'un chemin (id pair) ou d'une relation (id impair)
  const real = type === "area" ? (id % 2 ? { type: "relation", id: (id - 1) / 2 } : { type: "way", id: id / 2 }) : { type: type || "node", id };
  return { ...real, lat: c.lat, lon: c.lon, tags };
}

async function readFeatures(file) {
  const elements = [];
  const rl = createInterface({ input: createReadStream(file), crlfDelay: Infinity });
  for await (const raw of rl) {
    if (!raw.trim()) continue;
    const el = featureToElement(raw.trim());
    if (el) elements.push(el);
  }
  return elements;
}

async function main() {
  const work = join(tmpdir(), "bayyin-places");
  execSync(`rm -rf ${work} && mkdir -p ${work}`);
  const all = new Map();
  const countries = {};
  for (const [cc, [region, bbox]] of Object.entries(COUNTRIES)) {
    const t0 = Date.now();
    const pbf = join(work, `${cc}.pbf`), geo = join(work, `${cc}.geojsonseq`);
    try {
      // Téléchargement de l'extrait (osmium a besoin d'un fichier pour retrouver la position des bâtiments),
      // puis on ne garde que les objets avec diet:halal ou cuisine, et l'extrait est supprimé aussitôt.
      const src = join(work, `${cc}-src.pbf`);
      execSync(`curl -sSfL --retry 3 -A "Bayyin/1.0 (github.com/agozel5/bayyin)" -o ${src} "${GEOFABRIK}${region}-latest.osm.pbf"` +
        ` && osmium tags-filter ${src} nwr/diet:halal nwr/cuisine -o ${pbf} --overwrite; status=$?; rm -f ${src}; exit $status`,
        { stdio: ["ignore", "inherit", "inherit"], shell: "/bin/bash", timeout: 40 * 60000 });
      execSync(`osmium export ${pbf} -f geojsonseq -a type,id --geometry-types=point,polygon -o ${geo} --overwrite`, { stdio: ["ignore", "inherit", "inherit"] });
      const list = parsePlaces({ elements: await readFeatures(geo) }, 0, 0);
      for (const p of list) all.set(p.id, p);
      countries[cc] = { n: list.length, bbox };
      console.log(`${cc} : ${list.length} commerces (${Math.round((Date.now() - t0) / 1000)} s)`);
    } catch (e) {
      console.log(`${cc} indisponible : ${String(e.message).slice(0, 400)}`);
    } finally {
      execSync(`rm -f ${pbf} ${geo}`);
    }
  }
  // Pays en échec : on garde leurs commerces de la semaine précédente
  let previous = null;
  try { previous = JSON.parse(await readFile(new URL("index.json", OUT), "utf8")); } catch { /* première fois */ }
  const missing = Object.keys(COUNTRIES).filter((cc) => !countries[cc] && previous && previous.countries && previous.countries[cc]);
  if (missing.length) {
    for (const key of previous.tiles || []) {
      for (const p of JSON.parse(await readFile(new URL(`${key}.json`, OUT), "utf8"))) {
        const cc = missing.find((c) => { const [s, w, n, e] = COUNTRIES[c][1]; return p.lat >= s && p.lat <= n && p.lon >= w && p.lon <= e; });
        if (cc && !all.has(p.id)) all.set(p.id, p);
      }
    }
    for (const cc of missing) countries[cc] = { ...previous.countries[cc], kept: true };
    console.log("gardés de la semaine précédente :", missing.join(", "));
  }
  if (all.size < 500) throw new Error(`Trop peu de commerces (${all.size}) : rien n'est écrit.`);

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
  const index = { updated: new Date().toISOString().slice(0, 10), count: all.size, countries, tiles: [...tiles.keys()].sort() };
  await writeFile(new URL("index.json", OUT), JSON.stringify(index));
  await writeFile(new URL("README.md", OUT),
    "# Commerces halal\n\nDonnées © contributeurs OpenStreetMap, licence ODbL (https://www.openstreetmap.org/copyright), " +
    "extraits Geofabrik.\nConstruit chaque semaine par scripts/build-places.mjs. Un fichier par carreau de 1° × 1° (« lat_lon »).\n");
  console.log(JSON.stringify({ updated: index.updated, count: index.count, tiles: index.tiles.length, countries: Object.fromEntries(Object.entries(countries).map(([k, v]) => [k, v.n])) }));
}

// Lancé directement (et pas importé par les tests)
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
