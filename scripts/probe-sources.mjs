// Sonde temporaire : vérifie depuis GitHub Actions les adresses des bases officielles
// (CosIng, CLP) et écrit un rapport. À supprimer une fois l'import en place.
import { writeFile } from "node:fs/promises";
const UA = { "User-Agent": "Mozilla/5.0 (Bayyin probe)", Accept: "*/*" };
let out = "";
const base = "https://ec.europa.eu/growth/tools-databases/cosing/";
const cfgRes = await fetch(base + "assets/env-json-config.json", { headers: UA });
const cfgText = await cfgRes.text();
out += "CONFIG " + cfgRes.status + "\n" + cfgText.slice(0, 3000) + "\n";
let cfg = {};
try { cfg = JSON.parse(cfgText); } catch {}
const find = (o, k) => (o && typeof o === "object" ? (k in o ? o[k] : Object.values(o).map((v) => find(v, k)).find((v) => v !== undefined)) : undefined);
const url = find(cfg, "euSearchApiUrl"), key = find(cfg, "euSearchApiKey");
out += `\nURL=${url} KEY=${key}\n`;
if (url && key) {
  for (const [label, q, size] of [["ingredient", { bool: { must: [{ term: { itemType: "ingredient" } }] } }, 3], ["substance annexe II", { bool: { must: [{ term: { itemType: "substance" } }, { term: { annexNo: "II" } }] } }, 2]]) {
    const fd = new FormData();
    fd.append("query", new Blob([JSON.stringify(q)], { type: "application/json" }));
    const t0 = Date.now();
    const r = await fetch(`${url}?apiKey=${key}&text=*&pageSize=${size}&pageNumber=1`, { method: "POST", body: fd, headers: UA });
    const tx = await r.text();
    out += `\n===== ${label} HTTP ${r.status} ${Date.now() - t0} ms\n${tx.slice(0, 6000)}\n`;
  }
  // Taille de page maximale
  const fd = new FormData();
  fd.append("query", new Blob([JSON.stringify({ bool: { must: [{ term: { itemType: "ingredient" } }] } })], { type: "application/json" }));
  const r = await fetch(`${url}?apiKey=${key}&text=*&pageSize=2000&pageNumber=1`, { method: "POST", body: fd, headers: UA });
  const j = await r.json().catch(() => ({}));
  out += `\n===== pageSize 2000 : HTTP ${r.status}, résultats ${j.results ? j.results.length : "?"}, total ${j.totalResults}\n`;
}
await writeFile(new URL("../docs/probe-report.txt", import.meta.url), out);
console.log(out.slice(0, 3000));
