// Construit public/data/cosing.json à partir de CosIng, la base officielle des ingrédients
// cosmétiques de la Commission européenne (≈ 33 000 ingrédients) :
//   node scripts/build-cosing.mjs
// Sources (publiques, sans clé personnelle) :
//   - les annexes II à VI du règlement (CE) 1223/2009, exportées en CSV par CosIng ;
//   - l'inventaire des ingrédients, via l'API de recherche utilisée par le site CosIng.
// Pour chaque ingrédient (nom INCI en minuscules) on garde :
//   [fonctions (indices dans `fn`), annexes ("II,III"…), catégorie CMR ("1A"|"1B"|"2"|""), drapeaux]
// drapeaux : 1 allergène de parfum à étiqueter, 2 colorant capillaire, 4 interdit seulement
// dans certains usages, 8 ingrédient inactif.

import { writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const OUT = fileURLToPath(new URL("../public/data/cosing.json", import.meta.url));
const ANNEX_CSV = (a) => `https://api.tech.ec.europa.eu/cosing20/1.0/api/annexes/${a}/export-csv`;
const SEARCH = "https://webgate.ec.europa.eu/es/search-api/rest/search";
const KEY = "285a77fd-1257-4271-8507-f0c6b2961203"; // clé publique du site CosIng (assets/env-json-config.json)
const UA = { "User-Agent": "Bayyin (https://github.com/agozel5/bayyin)", Accept: "*/*" };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchRetry(url, opt = {}, tries = 4) {
  for (let i = 1; ; i++) {
    try {
      const res = await fetch(url, { ...opt, headers: { ...UA, ...(opt.headers || {}) }, signal: AbortSignal.timeout(120000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res;
    } catch (e) {
      if (i >= tries) throw new Error(`${url} : ${e.message}`);
      await sleep(2000 * i);
    }
  }
}

// CSV (guillemets, retours à la ligne dans les champs)
function parseCsv(text) {
  const rows = [];
  let row = [], field = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else q = false; }
      else field += c;
    } else if (c === '"') q = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field); rows.push(row); row = []; field = "";
    } else field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows;
}

// --- 1. Annexes ---
const CMR_RANK = { "": 0, "2": 1, "1B": 2, "1A": 3 };
const annex = new Map(); // "III/88" -> { cmr, allergen, hairDye }
for (const a of ["II", "III", "IV", "V", "VI"]) {
  const rows = parseCsv(await (await fetchRetry(ANNEX_CSV(a))).text());
  const h = rows.findIndex((r) => r[0] === "Reference Number");
  const head = rows[h];
  const col = (name) => head.findIndex((x) => x.trim().toLowerCase() === name.toLowerCase());
  const iRef = 0, iCmr = col("CMR"), iOther = col("Other"), iWord = col("Wording of conditions of use and warnings"), iType = col("Product Type, body parts");
  let n = 0;
  for (const r of rows.slice(h + 1)) {
    const ref = (r[iRef] || "").trim();
    if (!ref || ref === "Reference Number") continue;
    const key = `${a}/${ref}`;
    const e = annex.get(key) || { cmr: "", allergen: false, hairDye: false };
    const cmrText = iCmr >= 0 ? r[iCmr] || "" : "";
    for (const m of cmrText.matchAll(/Cat\.\s*(1A|1B|2)/g)) if (CMR_RANK[m[1]] > CMR_RANK[e.cmr]) e.cmr = m[1];
    const txt = [iOther, iWord, iType].map((i) => (i >= 0 ? r[i] || "" : "")).join(" ");
    if (/must be indicated in the list of ingredients|0[.,]001\s*%\s*in leave-on/i.test(txt)) e.allergen = true;
    if (/hair dye|hair colourant|oxidative hair/i.test(txt)) e.hairDye = true;
    annex.set(key, e);
    n++;
  }
  console.log(`annexe ${a} : ${n} lignes`);
  if (n < 10) throw new Error(`annexe ${a} : format inattendu`);
}

// --- 2. Inventaire des ingrédients (API de recherche, 200 par page) ---
let SORT = [{ field: "substanceId", order: "ASC" }]; // ordre stable entre les pages
async function searchPage(query, page, size = 200) {
  const send = async (sort) => {
    const fd = new FormData();
    fd.append("query", new Blob([JSON.stringify(query)], { type: "application/json" }));
    if (sort) fd.append("sort", new Blob([JSON.stringify(sort)], { type: "application/json" }));
    const res = await fetchRetry(`${SEARCH}?apiKey=${KEY}&text=*&pageSize=${size}&pageNumber=${page}`, { method: "POST", body: fd }, 2);
    return res.json();
  };
  try { return await send(SORT); }
  catch (e) {
    if (!SORT) throw e;
    console.log("tri refusé, requête sans tri :", e.message);
    SORT = null;
    return send(null);
  }
}
const items = new Map(); // substanceId -> metadata
const BASE_Q = { term: { itemType: "ingredient" } };
// L'API ne renvoie pas plus de 10 000 résultats par requête : on découpe par tranches
// d'identifiant (substanceId), en coupant en deux toute tranche trop grande.
async function countOf(must) {
  const j = await searchPage({ bool: { must } }, 1, 1);
  return j.totalResults || 0;
}
async function collectRange(lo, hi) {
  const must = [BASE_Q, { range: { substanceId: { gte: lo, lt: hi } } }];
  const n = await countOf(must);
  if (!n) return;
  if (n > 9500 && hi - lo > 1) {
    const mid = Math.floor((lo + hi) / 2);
    await collectRange(lo, mid);
    await collectRange(mid, hi);
    return;
  }
  let got = 0;
  for (let page = 1; (page - 1) * 200 < n; page++) {
    const j = await searchPage({ bool: { must } }, page);
    for (const r of j.results || []) { const m = r.metadata || {}; items.set((m.substanceId || [r.reference])[0], m); got++; }
    await sleep(100);
  }
  console.log(`tranche ${lo}-${hi} : ${got} / ${n}`);
}
const TOTAL = await countOf([BASE_Q]);
console.log("inventaire annoncé :", TOTAL);
// Les identifiants sont dispersés (jusqu'à plusieurs millions) : on part d'une très grande tranche
await collectRange(0, 2 ** 31);
console.log("ingrédients récupérés :", items.size);
if (items.size < Math.max(20000, TOTAL * 0.97)) throw new Error(`Inventaire incomplet : ${items.size} sur ${TOTAL}`);

// --- 3. Fusion ---
const norm = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();
const fnIndex = new Map();
const fnOf = (f) => { if (!fnIndex.has(f)) fnIndex.set(f, fnIndex.size); return fnIndex.get(f); };
const out = {};
let banned = 0, cmr = 0, allergens = 0;
for (const m of items.values()) {
  const name = norm((m.inciName || [])[0]);
  if (!name) continue;
  const fns = [...new Set((m.functionName || []).map((f) => f.trim()).filter(Boolean))].map(fnOf);
  const refs = [];
  let partial = false;
  for (const line of (m.cosmeticRestriction || []).join("\n").split(/\r?\n/)) {
    for (const x of line.matchAll(/(?:Annex\s+)?\b(VI|IV|V|III|II)\s*\/\s*(\d+[a-z]?)(?:\s*\(([^)]*)\))?/g)) {
      refs.push(`${x[1]}/${x[2]}`);
      if (x[1] === "II" && x[3] && /\bwhen\b|\bexcept\b|\bin hair dye\b|\bas a substance in\b/i.test(x[3])) partial = true;
    }
  }
  const annexes = [...new Set(refs.map((r) => r.split("/")[0]))];
  // Interdit seulement dans certains usages s'il est aussi autorisé dans une autre annexe
  if (annexes.includes("II") && annexes.some((x) => x !== "II")) partial = true;
  let c = "", flags = 0;
  for (const r of refs) {
    const e = annex.get(r);
    if (!e) continue;
    if (CMR_RANK[e.cmr] > CMR_RANK[c]) c = e.cmr;
    if (e.allergen) flags |= 1;
    if (e.hairDye) flags |= 2;
  }
  if (partial) flags |= 4;
  if ((m.status || [])[0] && m.status[0] !== "Active") flags |= 8;
  if (annexes.includes("II") && !partial) banned++;
  if (c) cmr++;
  if (flags & 1) allergens++;
  const rec = [fns];
  if (annexes.length || c || flags) rec.push(annexes.join(","));
  if (c || flags) rec.push(c);
  if (flags) rec.push(flags);
  // Doublon de nom : on garde la fiche active la plus restrictive
  const prev = out[name];
  if (!prev || ((prev[3] || 0) & 8 && !(flags & 8)) || (rec.length > prev.length && !(flags & 8))) out[name] = rec;
}
const data = {
  source: "CosIng (Commission européenne) — annexes du règlement (CE) 1223/2009 et inventaire des ingrédients",
  updated: new Date().toISOString().slice(0, 10),
  count: Object.keys(out).length,
  fn: [...fnIndex.keys()],
  i: out,
};
console.log(`noms : ${data.count}, fonctions : ${data.fn.length}, interdits : ${banned}, CMR : ${cmr}, allergènes : ${allergens}`);
await mkdir(fileURLToPath(new URL("../public/data/", import.meta.url)), { recursive: true });
await writeFile(OUT, JSON.stringify(data));
console.log("écrit :", OUT);
