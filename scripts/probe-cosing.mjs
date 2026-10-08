// Sonde temporaire : comment découper la requête d'inventaire (limite de 10 000 résultats).
import { writeFile } from "node:fs/promises";
const SEARCH = "https://webgate.ec.europa.eu/es/search-api/rest/search", KEY = "285a77fd-1257-4271-8507-f0c6b2961203";
const UA = { "User-Agent": "Bayyin (https://github.com/agozel5/bayyin)" };
let out = "";
async function total(must, extra = {}) {
  const fd = new FormData();
  fd.append("query", new Blob([JSON.stringify({ bool: { must, ...extra } })], { type: "application/json" }));
  const r = await fetch(`${SEARCH}?apiKey=${KEY}&text=*&pageSize=1&pageNumber=1`, { method: "POST", body: fd, headers: UA });
  const t = await r.text();
  try { return JSON.parse(t).totalResults; } catch { return `HTTP ${r.status} ${t.slice(0, 200)}`; }
}
const I = { term: { itemType: "ingredient" } };
out += "total " + (await total([I])) + "\n";
out += "Active " + (await total([I, { term: { status: "Active" } }])) + "\n";
out += "perfuming Y " + (await total([I, { term: { perfuming: "Y" } }])) + "\n";
for (const q of [
  { range: { substanceId: { gte: 0, lt: 40000 } } },
  { range: { "substanceId": { gte: "0", lt: "4" } } },
  { prefix: { "inciName.exact": "A" } },
  { wildcard: { "inciName.exact": "A*" } },
  { text: { query: "A*", fields: ["inciName.exact"], analyzeWildcard: true } },
  { text: { query: "SODIUM*", fields: ["inciName.exact"], analyzeWildcard: true } },
  { text: { query: "*EXTRACT*", fields: ["inciName.exact"], analyzeWildcard: true } },
]) out += JSON.stringify(q) + " -> " + (await total([I, q])) + "\n";
out += "sans fonction " + (await total([I], { must_not: [{ exists: { field: "functionName" } }] })) + "\n";
// Fonctions : référentiel
const fd = new FormData();
fd.append("query", new Blob([JSON.stringify({ bool: { must: [{ term: { itemType: "function" } }] } })], { type: "application/json" }));
const fr = await (await fetch(`${SEARCH}?apiKey=${KEY}&text=*&pageSize=500`, { method: "POST", body: fd, headers: UA })).json();
const fns = (fr.results || []).map((r) => (r.metadata.functionName || [])[0]).filter(Boolean);
out += `\nFONCTIONS (${fns.length})\n`;
for (const f of fns) out += f + " -> " + (await total([I, { term: { functionName: f } }])) + "\n";
await writeFile(new URL("../docs/probe-cosing.txt", import.meta.url), out);
