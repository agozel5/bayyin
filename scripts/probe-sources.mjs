// Sonde temporaire : vérifie depuis GitHub Actions les adresses des bases officielles
// (CosIng, CLP) et écrit un rapport. À supprimer une fois l'import en place.
import { writeFile } from "node:fs/promises";
const UA = { "User-Agent": "Mozilla/5.0 (Bayyin probe)", Accept: "*/*" };
let out = "";
const get = async (u) => {
  const res = await fetch(u, { headers: UA, signal: AbortSignal.timeout(60000) });
  return { res, text: await res.text() };
};
const base = "https://ec.europa.eu/growth/tools-databases/cosing/";
const { text: html } = await get(base);
const scripts = [...html.matchAll(/src="([^"]+\.js)"/g)].map((m) => new URL(m[1], base).href);
out += "SCRIPTS:\n" + scripts.join("\n") + "\n";
for (const s of scripts) {
  try {
    const { text } = await get(s);
    const hits = [...new Set(text.match(/https?:\/\/[a-z.]*europa\.eu[^"'`\s]*|[a-zA-Z0-9_\/.-]*export[a-zA-Z0-9_\/.-]*|apiKey[^,;]{0,80}|"\/api\/[^"]+"|`[^`]*api[^`]*`/g) || [])].slice(0, 200);
    out += `\n===== ${s} (${text.length})\n` + hits.join("\n") + "\n";
  } catch (e) { out += `\n===== ${s} ERREUR ${e.message}\n`; }
}
// Essais directs
for (const u of [
  "https://api.tech.ec.europa.eu/cosing20/1.0/api/annexes/IV/export-csv",
  "https://api.tech.ec.europa.eu/cosing20/1.0/api/annexes/V/export-csv",
  "https://api.tech.ec.europa.eu/cosing20/1.0/api/annexes/VI/export-csv",
  "https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:02008R1272-20250801",
]) {
  try { const { res, text } = await get(u); out += `\n===== ${u}\nHTTP ${res.status} ${text.length}\n${text.slice(0, 800).replace(/\s+/g, " ")}\n`; }
  catch (e) { out += `\n===== ${u} ERREUR ${e.message}\n`; }
}
await writeFile(new URL("../docs/probe-report.txt", import.meta.url), out);
console.log(out.slice(0, 5000));
