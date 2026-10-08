// Sonde temporaire : vérifie depuis GitHub Actions les adresses des bases officielles
// (CosIng, CLP) et écrit un rapport. À supprimer une fois l'import en place.
import { writeFile } from "node:fs/promises";
const UA = { "User-Agent": "Mozilla/5.0 (Bayyin probe)", Accept: "*/*" };
const URL_ = "https://webgate.ec.europa.eu/es/search-api/rest/search", KEY = "285a77fd-1257-4271-8507-f0c6b2961203";
let out = "";
async function search(q, text = "*", size = 5) {
  const fd = new FormData();
  fd.append("query", new Blob([JSON.stringify(q)], { type: "application/json" }));
  const r = await fetch(`${URL_}?apiKey=${KEY}&text=${encodeURIComponent(text)}&pageSize=${size}&pageNumber=1`, { method: "POST", body: fd, headers: UA });
  return r.json();
}
const pick = (m) => Object.fromEntries(["itemType", "inciName", "casNo", "functionName", "cosmeticRestriction", "annexNo", "refNo", "perfuming", "status", "classificationInformation", "identifiedIngredient", "substanceId", "wordingOfConditions", "maximumConcentration", "productTypeBodyParts"].map((k) => [k, m[k]]));
for (const name of ["PROPYLPARABEN", "LIMONENE", "TALC", "PHENOXYETHANOL", "RETINOL", "ZINC PYRITHIONE", "CI 77891", "AQUA", "SODIUM HYDROXIDE", "TRICLOSAN"]) {
  const j = await search({ bool: { must: [{ terms: { itemType: ["ingredient", "substance"] } }, { text: { query: name, fields: ["inciName.exact"] } }] } }, "*", 6);
  out += `\n===== ${name} (${j.totalResults})\n` + (j.results || []).map((r) => JSON.stringify(pick(r.metadata))).join("\n") + "\n";
}
// Lignes d'exemple des annexes II et III (CSV)
for (const a of ["II", "III"]) {
  const t = await (await fetch(`https://api.tech.ec.europa.eu/cosing20/1.0/api/annexes/${a}/export-csv`, { headers: UA })).text();
  const lines = t.split("\n");
  out += `\n===== ANNEXE ${a} (${lines.length} lignes)\n` + lines.slice(0, 12).join("\n") + "\n...\n" + lines.filter((l) => /CMR|Carc|Repr|Muta|1B|1A/.test(l)).slice(0, 6).join("\n") + "\n" + lines.filter((l) => /Limonene|LIMONENE|0[.,]001/.test(l)).slice(0, 4).join("\n") + "\n";
}
await writeFile(new URL("../docs/probe-report.txt", import.meta.url), out);
console.log(out.slice(0, 3000));
