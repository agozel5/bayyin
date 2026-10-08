// Construit public/data/med/NN.json à partir de la Base de données publique des médicaments.
//   node scripts/build-medicaments.mjs
// Chaque fichier contient les présentations dont le code CIP13 a les mêmes deux chiffres
// avant la clé de contrôle : { "<CIP13>": [nom, forme, titulaire, CIS] }.
// L'app ne télécharge que le petit fichier dont elle a besoin (≈ 1/100 de la base).

import { mkdir, writeFile, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const BASE = "https://base-donnees-publique.medicaments.gouv.fr/download/file/";
const OUT = fileURLToPath(new URL("../public/data/med/", import.meta.url));

async function download(name) {
  const res = await fetch(BASE + name, { headers: { "User-Agent": "Bayyin (https://github.com/agozel5/bayyin)" } });
  if (!res.ok) throw new Error(`${name} : HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  // Les fichiers ont longtemps été en Windows-1252 ; on bascule si l'UTF-8 n'est pas valide.
  const utf8 = buf.toString("utf8");
  const text = utf8.includes("�") ? new TextDecoder("windows-1252").decode(buf) : utf8;
  return text.split(/\r?\n/).filter(Boolean).map((l) => l.split("\t").map((c) => c.trim()));
}

const clean = (s) => String(s || "").replace(/\s+/g, " ").trim();

const specs = await download("CIS_bdpm.txt");
const byCis = new Map();
for (const c of specs) {
  // CIS, dénomination, forme, voies, statut AMM, procédure, état commercialisation, date AMM, statut BDM, n° UE, titulaire(s), surveillance
  if (!/^\d{8}$/.test(c[0])) continue;
  byCis.set(c[0], { name: clean(c[1]), form: clean(c[2]), holder: clean(c[10]).split(";")[0] });
}
console.log("spécialités :", byCis.size);

const pres = await download("CIS_CIP_bdpm.txt");
const shards = {};
let n = 0;
for (const c of pres) {
  const cis = c[0];
  const cip13 = /^34009\d{8}$/.test(c[6]) ? c[6] : c.find((x) => /^34009\d{8}$/.test(x)); // colonne 7, avec repli
  const s = byCis.get(cis);
  if (!cip13 || !s) continue;
  const key = cip13.slice(-3, -1);
  (shards[key] ||= {})[cip13] = [s.name, s.form, s.holder, cis];
  n++;
}
console.log("présentations :", n);
if (n < 5000) throw new Error("Trop peu de présentations : format de fichier inattendu ?");

await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });
for (const [key, rows] of Object.entries(shards)) {
  const sorted = Object.fromEntries(Object.entries(rows).sort(([a], [b]) => a.localeCompare(b)));
  await writeFile(OUT + key + ".json", JSON.stringify(sorted));
}
await writeFile(OUT + "README.md", `Données : Base de données publique des médicaments (ANSM, HAS, CNAM), ${new Date().toISOString().slice(0, 10)}.\nGénéré par scripts/build-medicaments.mjs. Ne pas modifier à la main.\n`);
console.log("fichiers :", Object.keys(shards).length);
