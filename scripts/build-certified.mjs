// Listes publiées par les organismes de certification halal -> public/data/certified.json
//
// Bayyin compare le label lu sur l'emballage à ce que l'organisme publie lui-même :
//  - AVS : annuaire officiel des fournisseurs (abattoirs, ateliers de découpe), avec l'estampille sanitaire
//    (« FR 77 237 006 CE ») — la même estampille figure sur l'emballage et dans Open Food Facts (emb_codes).
//  - Achahada : carte officielle des établissements et marques contrôlés.
//  - HMC (Royaume-Uni) : liste officielle des marques approuvées.
// On ne garde que des noms et des estampilles (aucun téléphone, contact ni adresse e-mail).
// Si une source ne répond pas, on garde sa dernière version connue.

import { readFile, writeFile } from "node:fs/promises";

const OUT = new URL("../public/data/certified.json", import.meta.url);
const UA = { "User-Agent": "Mozilla/5.0 (compatible; Bayyin/1.0; +https://github.com/agozel5/bayyin)" };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function get(url, { json = true, tries = 3 } = {}) {
  for (let i = 1; ; i++) {
    try {
      const res = await fetch(url, { headers: UA, signal: AbortSignal.timeout(40000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return json ? await res.json() : await res.text();
    } catch (e) {
      if (i >= tries) throw e;
      await sleep(2000 * i);
    }
  }
}

const decode = (s) =>
  String(s ?? "")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
    .replace(/&rsquo;|&lsquo;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&[a-z]+;/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
const uniq = (a) => [...new Map(a.filter(Boolean).map((x) => [x.toLowerCase(), x])).values()].sort((a, b) => a.localeCompare(b, "fr"));
// Estampille sanitaire : lettres et chiffres seuls (« FR 77.237.006 CE » -> « FR77237006CE »)
export const normStamp = (s) => String(s ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");

async function avs() {
  // type 3 = fournisseurs (abattoirs, découpe) ; 1 = boucheries ; 2 = restaurants (non utiles pour un produit emballé)
  const list = await get("https://equinox.avs.fr/v1/common/partners?type=3");
  const ok = list.filter((x) => x.active !== false && x.displayInTheWebSite !== false);
  // Les lignes « Autre … » / « Etranger région … » sont des regroupements, pas des établissements
  const real = ok.filter((x) => !/^(autre|etranger|étranger)\b/i.test(String(x.name || "").trim()));
  const names = uniq(real.map((x) => decode(x.name)));
  const stamps = uniq(real.flatMap((x) => String(x.veterinaryStamp || "").split(/[;/,]| et /)).map(normStamp).filter((s) => s.length >= 6));
  if (names.length < 10) throw new Error(`AVS : trop peu de fournisseurs (${names.length})`);
  return { names, stamps, url: "https://avs.fr/etablissements/index.html?category=fournisseurs" };
}

async function achahada() {
  const url = "https://achahada.com/wp-admin/admin-ajax.php?action=store_search&lat=48.85&lng=2.35&max_results=1000&search_radius=5000&autoload=1";
  const list = await get(url);
  // « AVS *sauf produits … » : renvoi vers un autre organisme, pas une marque
  const names = uniq(list.map((x) => decode(x.store)).filter((n) => n && !/^avs\b/i.test(n)));
  if (names.length < 20) throw new Error(`Achahada : trop peu d'établissements (${names.length})`);
  return { names, url: "https://achahada.com/marques/" };
}

async function hmc() {
  const names = [];
  for (let p = 1; p <= 30; p++) {
    let html;
    try {
      html = await get(`https://halalhmc.org/brands/${p > 1 ? `page/${p}/` : ""}`, { json: false, tries: p > 1 ? 1 : 3 });
    } catch (e) {
      if (p === 1) throw e;
      break; // page suivante absente : fin de la liste
    }
    const found = [...html.matchAll(/<h2[^>]*>([\s\S]{1,200}?)<\/h2>/g)].map((m) => decode(m[1]));
    const fresh = found.filter((n) => !names.includes(n));
    if (!fresh.length) break;
    names.push(...fresh);
  }
  const clean = uniq(names.filter((n) => !/brands|where can|approved products/i.test(n)));
  if (clean.length < 5) throw new Error(`HMC : trop peu de marques (${clean.length})`);
  return { names: clean, url: "https://halalhmc.org/brands/" };
}

async function main() {
  let previous = { orgs: {} };
  try {
    previous = JSON.parse(await readFile(OUT, "utf8"));
  } catch { /* première construction */ }
  const today = new Date().toISOString().slice(0, 10);
  const orgs = {};
  for (const [id, fn] of Object.entries({ avs, achahada, hmc })) {
    try {
      const data = await fn();
      orgs[id] = { updated: today, ...data };
      console.log(`${id} : ${data.names.length} noms${data.stamps ? `, ${data.stamps.length} estampilles` : ""}`);
    } catch (e) {
      console.log(`${id} indisponible (${e.message})${previous.orgs[id] ? " → dernière version gardée" : ""}`);
      if (previous.orgs[id]) orgs[id] = previous.orgs[id];
    }
  }
  if (!Object.keys(orgs).length) throw new Error("Aucune liste disponible : rien n'est écrit.");
  await writeFile(OUT, JSON.stringify({ meta: { updated: today }, orgs }) + "\n");
  console.log(JSON.stringify({ updated: today, orgs: Object.fromEntries(Object.entries(orgs).map(([k, v]) => [k, v.names.length])) }));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
