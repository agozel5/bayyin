// Sonde temporaire : vérifie depuis GitHub Actions les adresses des bases officielles
// (CosIng, CLP) et écrit un rapport. À supprimer une fois l'import en place.
import { writeFile } from "node:fs/promises";

const urls = [
  "https://api.tech.ec.europa.eu/cosing20/1.0/api/annexes/II/export-csv",
  "https://api.tech.ec.europa.eu/cosing20/1.0/api/annexes/III/export-csv",
  "https://api.tech.ec.europa.eu/cosing20/1.0/api/ingredients/export-csv",
  "https://api.tech.ec.europa.eu/cosing20/1.0/api/inventory/export-csv",
  "https://api.tech.ec.europa.eu/cosing20/1.0/api/substances/export-csv",
  "https://data.europa.eu/api/hub/search/datasets/cosmetic-ingredient-database-ingredients-and-fragrance-inventory",
  "https://data.europa.eu/api/hub/search/search?q=cosing&filter=dataset&limit=10",
  "https://ec.europa.eu/growth/tools-databases/cosing/",
  "https://echa.europa.eu/information-on-chemicals/annex-vi-to-clp",
  "https://echa.europa.eu/fr/information-on-chemicals/annex-vi-to-clp",
];
let out = "";
for (const u of urls) {
  try {
    const res = await fetch(u, { headers: { "User-Agent": "Mozilla/5.0 (Bayyin probe)", Accept: "*/*" }, signal: AbortSignal.timeout(60000) });
    const buf = Buffer.from(await res.arrayBuffer());
    const text = buf.toString("utf8");
    out += `\n===== ${u}\nHTTP ${res.status} ${res.headers.get("content-type")} ${buf.length} octets\n`;
    const links = [...new Set(text.match(/https?:[^"'\s<>]+?\.(xlsx|csv|zip|xls)(\?[^"'\s<>]*)?|\/documents\/[^"'\s<>]+|"(download_?url|access_?url)"\s*:\s*\[?"[^"]+"/gi) || [])].slice(0, 60);
    if (links.length) out += "LIENS :\n" + links.join("\n") + "\n";
    out += "DÉBUT :\n" + text.slice(0, 1500).replace(/\s+/g, " ") + "\n";
  } catch (e) {
    out += `\n===== ${u}\nERREUR ${e.message}\n`;
  }
}
await writeFile(new URL("../docs/probe-report.txt", import.meta.url), out);
console.log(out);
