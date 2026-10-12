// Base des rappels de produits (RappelConso, licence ouverte) -> public/data/rappels/
//
// Une fiche par rappel, rangées en 100 petits fichiers selon les 2 derniers chiffres du code-barres :
// l'app ne télécharge que le fichier du produit scanné (≈ 1/100 de la base), ce qui marche
// sans serveur et sans dépendre des autorisations CORS du site de l'État.
// recent.json : les rappels des 90 derniers jours (pour surveiller l'historique de l'utilisateur).
//
// Sources, dans l'ordre : API tabulaire de data.gouv.fr (une ligne par code-barres),
// puis export JSON de data.economie.gouv.fr si la première ne répond pas.

import { mkdir, writeFile, rm } from "node:fs/promises";

const OUT = new URL("../public/data/rappels/", import.meta.url);
const TABULAR = "https://tabular-api.data.gouv.fr/api/resources/4975c78c-55fb-43eb-a5d7-71c1d41e9ea5/data/";
const ODS = "https://data.economie.gouv.fr/api/explore/v2.1/catalog/datasets/rappelconso-v2-gtin-trie/exports/json";
const KEEP_MONTHS = 30; // rappels publiés depuis moins de 30 mois

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function getJson(url, tries = 4) {
  for (let i = 1; ; i++) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": "Bayyin/1.0 (github.com/agozel5/bayyin)" } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      if (i >= tries) throw e;
      await sleep(1500 * i);
    }
  }
}

// Champ dont le nom peut commencer par une marque d'ordre d'octets (﻿)
const field = (row, name) => row[name] ?? row["﻿" + name];

async function fromTabular() {
  const rows = [];
  let url = `${TABULAR}?page_size=200&page=1`;
  while (url) {
    const data = await getJson(url);
    rows.push(...(data.data || []));
    url = data.links && data.links.next;
    if (rows.length % 2000 < 200) console.log(`  … ${rows.length} lignes`);
  }
  return rows;
}
async function fromOds() {
  return getJson(ODS, 3);
}

// Code-barres normalisé : chiffres seuls, sans zéros de tête (un GTIN-14 « 0… » = EAN-13)
export const normGtin = (g) => String(g ?? "").replace(/\D/g, "").replace(/^0+/, "");

const clip = (s, n) => {
  s = String(s ?? "").replace(/\s+/g, " ").trim();
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
};

async function main() {
  let rows, source;
  try {
    rows = await fromTabular();
    source = "tabular-api.data.gouv.fr";
  } catch (e) {
    console.log("API tabulaire indisponible :", e.message, "→ export data.economie.gouv.fr");
    rows = await fromOds();
    source = "data.economie.gouv.fr";
  }
  console.log(`${rows.length} lignes lues depuis ${source}`);

  const limit = new Date();
  limit.setMonth(limit.getMonth() - KEEP_MONTHS);
  const fiches = new Map(); // id -> fiche
  const byGtin = new Map(); // gtin -> Set(id)
  for (const r of rows) {
    const date = String(field(r, "date_publication") || "").slice(0, 10);
    if (!date || new Date(date) < limit) continue;
    const id = String(field(r, "numero_fiche") || field(r, "id") || field(r, "rappel_guid") || "");
    const gtins = String(field(r, "gtin") ?? "").split(/[\s,;]+/).map(normGtin).filter((g) => g.length >= 8);
    if (!id || !gtins.length) continue;
    if (!fiches.has(id)) {
      const img = String(field(r, "liens_vers_les_images") || "").split(/\s|\|/).find((u) => /^https?:/.test(u)) || "";
      fiches.set(id, {
        id,
        d: date,
        n: clip(field(r, "libelle") || field(r, "modeles_ou_references"), 120),
        b: clip(field(r, "marque_produit"), 60),
        c: clip(field(r, "sous_categorie_produit") || field(r, "categorie_produit"), 60),
        m: clip(field(r, "motif_rappel"), 300),
        r: clip(field(r, "risques_encourus"), 200),
        a: clip(field(r, "conduites_a_tenir_par_le_consommateur"), 200),
        f: String(field(r, "date_de_fin_de_la_procedure_de_rappel") || "").slice(0, 10),
        u: String(field(r, "lien_vers_la_fiche_rappel") || ""),
        i: img,
      });
    }
    for (const g of gtins) {
      if (!byGtin.has(g)) byGtin.set(g, new Set());
      byGtin.get(g).add(id);
    }
  }
  if (fiches.size < 100) throw new Error(`Trop peu de rappels (${fiches.size}) : source suspecte, rien n'est écrit.`);

  // 100 fichiers : clé = 2 derniers chiffres du code-barres
  const shards = Array.from({ length: 100 }, () => ({}));
  for (const [g, ids] of byGtin) {
    const shard = shards[Number(g.slice(-2))];
    shard[g] = [...ids].map((id) => fiches.get(id)).sort((a, b) => (a.d < b.d ? 1 : -1));
  }
  await rm(OUT, { recursive: true, force: true });
  await mkdir(OUT, { recursive: true });
  for (let i = 0; i < 100; i++) await writeFile(new URL(`${String(i).padStart(2, "0")}.json`, OUT), JSON.stringify(shards[i]));

  // Rappels récents : code-barres -> identifiant, et les fiches correspondantes
  const since = new Date();
  since.setDate(since.getDate() - 90);
  const recent = { fiches: {}, gtins: {} };
  for (const [g, ids] of byGtin) {
    for (const id of ids) {
      const f = fiches.get(id);
      if (new Date(f.d) < since) continue;
      recent.fiches[id] = f;
      (recent.gtins[g] ||= []).push(id);
    }
  }
  const meta = { updated: new Date().toISOString().slice(0, 10), source, recalls: fiches.size, gtins: byGtin.size, recent: Object.keys(recent.fiches).length };
  await writeFile(new URL("recent.json", OUT), JSON.stringify({ meta, ...recent }));
  await writeFile(new URL("meta.json", OUT), JSON.stringify(meta));
  await writeFile(new URL("README.md", OUT),
    `# Rappels de produits\n\nDonnées RappelConso (DGCCRF / DGAL), licence ouverte 2.0, via ${source}.\n` +
    `Construit par scripts/build-rappels.mjs chaque nuit. Rappels publiés depuis moins de ${KEEP_MONTHS} mois.\n`);
  console.log(JSON.stringify(meta));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
