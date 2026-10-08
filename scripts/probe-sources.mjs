// Sonde temporaire : vérifie depuis GitHub Actions les adresses des bases officielles
// (CosIng, CLP) et écrit un rapport. À supprimer une fois l'import en place.
import { writeFile } from "node:fs/promises";
const UA = { "User-Agent": "Mozilla/5.0 (Bayyin probe)", Accept: "*/*" };
let out = "";
const get = async (u, opt = {}) => {
  const res = await fetch(u, { headers: { ...UA, ...(opt.headers || {}) }, method: opt.method || "GET", body: opt.body, signal: AbortSignal.timeout(90000) });
  return { res, text: await res.text() };
};
const base = "https://ec.europa.eu/growth/tools-databases/cosing/";
const seen = new Set();
const queue = ["main-ZZ2GRLSL.js"];
while (queue.length && seen.size < 60) {
  const f = queue.shift();
  if (seen.has(f)) continue;
  seen.add(f);
  try {
    const { text } = await get(base + f);
    for (const m of text.matchAll(/["'`(]\.?\/?(chunk-[A-Z0-9]+\.js)/g)) if (!seen.has(m[1])) queue.push(m[1]);
    const hits = [...new Set(text.match(/.{0,300}(euSearchApiUrl|exportToFileUrl|euSearchApiKey|descrFileUrl|config\.json|assets\/[a-z\/]*\.json|exportFile|ingredientsSearch|itemType|getSubIngList).{0,600}/g) || [])].slice(0, 30);
    if (hits.length) out += `\n===== ${f}\n` + hits.join("\n---\n") + "\n";
  } catch (e) { out += `\n===== ${f} ERREUR ${e.message}\n`; }
}
for (const c of ["assets/config/env-json-config.json", "assets/env-json-config.json", "assets/config.json", "assets/config/config.json", "assets/env.json"]) {
  try { const { res, text } = await get(base + c); out += `\n===== ${c} HTTP ${res.status}\n${text.slice(0, 2000)}\n`; } catch (e) { out += `\n${c} ERREUR\n`; }
}
out = "FICHIERS: " + [...seen].join(", ") + "\n" + out;
await writeFile(new URL("../docs/probe-report.txt", import.meta.url), out);
console.log(out.slice(0, 3000));
