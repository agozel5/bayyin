// Encyclopédie des additifs -> public/data/additives.json
// Source : taxonomie des additifs d'Open Food Facts (licence ODbL) : nom en 4 langues, fonction,
// origine végétale ou animale (végan / végétarien), évaluation de l'EFSA (risque de surexposition).
// Le verdict halal et le risque santé de Bayyin (lib/rules.js, lib/health.js) sont ajoutés par l'app.

import { writeFile, mkdir } from "node:fs/promises";

const BASE = "https://static.openfoodfacts.org/data/taxonomies/";
const LANGS = ["fr", "en", "ar", "tr"];
const OUT = new URL("../public/data/additives.json", import.meta.url);

async function get(name) {
  for (let i = 1; ; i++) {
    try {
      const res = await fetch(BASE + name, { headers: { "User-Agent": "Bayyin/1.0 (github.com/agozel5/bayyin)" } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      if (i >= 4) throw e;
      await new Promise((r) => setTimeout(r, 2000 * i));
    }
  }
}
const en = (v) => (v && (v.en ?? v.xx)) || "";
const clean = (s, code) => String(s || "").replace(new RegExp(`^E\\s?${code}\\s*[-–:]\\s*`, "i"), "").trim();
const yn = (v) => ({ yes: "y", no: "n", maybe: "m" })[String(en(v)).toLowerCase()] || null;

const [adds, classes] = await Promise.all([get("additives.json"), get("additives_classes.json")]);

const cls = {};
for (const [id, c] of Object.entries(classes)) {
  const key = id.replace(/^en:/, "");
  cls[key] = Object.fromEntries(LANGS.map((l) => [l, (c.name && (c.name[l] || c.name.en)) || key]));
}

const items = [];
for (const [id, a] of Object.entries(adds)) {
  const m = id.match(/^en:e(\d{3,4}[a-f]?)$/);
  if (!m) continue; // variantes (E100i…) et entrées sans numéro E ignorées
  const code = m[1];
  const names = {};
  for (const l of LANGS) {
    const n = clean(a.name && a.name[l], code);
    if (n && n.toUpperCase() !== `E${code.toUpperCase()}`) names[l] = n;
  }
  if (!names.en && !names.fr) continue;
  const risk = String(en(a.efsa_evaluation_overexposure_risk)).replace(/^en:/, "") || null;
  items.push({
    e: `E${code.toUpperCase()}`,
    n: names,
    k: String(en(a.additives_classes)).split(",").map((s) => s.trim().replace(/^en:/, "")).filter(Boolean),
    v: yn(a.vegan),
    g: yn(a.vegetarian),
    r: ["high", "moderate", "no"].includes(risk) ? risk : null,
    a: en(a.anses_additives_of_interest) === "yes" ? 1 : 0,
    u: String(en(a.efsa_evaluation_url) || ""),
    d: String(en(a.efsa_evaluation_date) || ""),
  });
}
items.sort((x, y) => parseInt(x.e.slice(1)) - parseInt(y.e.slice(1)) || x.e.localeCompare(y.e));
if (items.length < 200) throw new Error(`Trop peu d'additifs (${items.length}) : rien n'est écrit.`);
const used = new Set(items.flatMap((i) => i.k));
const classesUsed = Object.fromEntries(Object.entries(cls).filter(([k]) => used.has(k)));
await mkdir(new URL("../public/data/", import.meta.url), { recursive: true });
await writeFile(OUT, JSON.stringify({ updated: new Date().toISOString().slice(0, 10), source: "Open Food Facts (ODbL)", classes: classesUsed, items }));
console.log(`${items.length} additifs, ${Object.keys(classesUsed).length} fonctions`);
console.log(JSON.stringify(items.filter((i) => ["E120", "E330", "E471", "E250", "E951"].includes(i.e))));
