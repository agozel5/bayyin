// Outil de traduction : découpe les textes anglais (avec le français en référence) en lots, puis
// assemble les lots traduits d'une langue en fichiers de l'app et vérifie le résultat.
//   node scripts/i18n-tool.mjs dump <dossier>           → <dossier>/src/main-NN.json, extra-NN.json
//   node scripts/i18n-tool.mjs build <dossier> <langue>  → public/lib/i18n/<l>.js + mobile/src/i18n-extra-<l>.js
//   node scripts/i18n-tool.mjs check <langue>            → vérifie les clés, {variables} et balises
import { readFile, writeFile, readdir, mkdir } from "node:fs/promises";
import path from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const load = async (rel) => (await import(path.join(ROOT, rel) + `?t=${Date.now()}`)).default;
const extraOf = async (l) => {
  const src = await readFile(path.join(ROOT, "mobile/src/i18n-extra.js"), "utf8");
  // EXTRA.en / EXTRA.fr : on évalue le littéral objet de chaque langue
  const m = src.match(new RegExp(`\\n  ${l}: (\\{[\\s\\S]*?\\n  \\}),\\n`));
  return m ? Function(`return ${m[1]}`)() : {};
};
const NATIVE_KEYS = async (l) => {
  const src = await readFile(path.join(ROOT, "mobile/src/i18n.js"), "utf8");
  const m = src.match(new RegExp(`\\n  ${l}: (\\{[\\s\\S]*?\\n  \\}),\\n`));
  return m ? Function(`return ${m[1]}`)() : {};
};
const vars = (s) => (String(s).match(/\{\w+\}/g) || []).sort().join(",");
const tags = (s) => (String(s).match(/<\/?\w+[^>]*>/g) || []).map((x) => x.replace(/\s.*$/, ">").replace(/>>$/, ">")).sort().join("");
const chunk = (keys, n) => Array.from({ length: Math.ceil(keys.length / n) }, (_, i) => keys.slice(i * n, i * n + n));

const [cmd, a, b] = process.argv.slice(2);
if (cmd === "dump") {
  const en = await load("public/lib/i18n/en.js"), fr = await load("public/lib/i18n/fr.js");
  const exEn = { ...(await extraOf("en")), ...(await NATIVE_KEYS("en")) }, exFr = { ...(await extraOf("fr")), ...(await NATIVE_KEYS("fr")) };
  await mkdir(path.join(a, "src"), { recursive: true });
  const main = Object.keys(fr).filter((k) => k !== "_build");
  let i = 0;
  for (const part of chunk(main, 230)) await writeFile(path.join(a, "src", `main-${String(++i).padStart(2, "0")}.json`), JSON.stringify(Object.fromEntries(part.map((k) => [k, { en: en[k], fr: fr[k] }])), null, 1));
  let j = 0;
  for (const part of chunk(Object.keys(exFr), 230)) await writeFile(path.join(a, "src", `extra-${String(++j).padStart(2, "0")}.json`), JSON.stringify(Object.fromEntries(part.map((k) => [k, { en: exEn[k], fr: exFr[k] }])), null, 1));
  console.log(`${i} lots principaux, ${j} lots de l'app native`);
} else if (cmd === "build") {
  const l = b, dir = path.join(a, l), fr = await load("public/lib/i18n/fr.js");
  const files = (await readdir(dir)).sort();
  const main = {}, extra = {};
  for (const f of files) {
    const obj = JSON.parse(await readFile(path.join(dir, f), "utf8"));
    Object.assign(f.startsWith("extra") ? extra : main, obj);
  }
  const out = ["export default {", `  "_build": ${JSON.stringify(fr._build)}, // même numéro que sw.js et app.js (vérifié par les tests)`];
  for (const k of Object.keys(fr)) if (k !== "_build" && main[k] !== undefined) out.push(`  ${JSON.stringify(k)}: ${JSON.stringify(main[k])},`);
  out.push("};", "");
  await writeFile(path.join(ROOT, `public/lib/i18n/${l}.js`), out.join("\n"));
  const exFr = { ...(await extraOf("fr")), ...(await NATIVE_KEYS("fr")) };
  const ex = ["// Textes propres à l'app native : voir i18n-extra.js", "export default {"];
  for (const k of Object.keys(exFr)) if (extra[k] !== undefined) ex.push(`  ${JSON.stringify(k)}: ${JSON.stringify(extra[k])},`);
  ex.push("};", "");
  await writeFile(path.join(ROOT, `mobile/src/i18n-extra-${l}.js`), ex.join("\n"));
  console.log(`${l} : ${Object.keys(main).length} textes principaux, ${Object.keys(extra).length} textes de l'app`);
} else if (cmd === "check") {
  const l = a, fr = await load("public/lib/i18n/fr.js"), d = await load(`public/lib/i18n/${l}.js`);
  const exFr = { ...(await extraOf("fr")), ...(await NATIVE_KEYS("fr")) };
  const exSrc = await readFile(path.join(ROOT, `mobile/src/i18n-extra-${l}.js`), "utf8");
  const ex = Function(`return ${exSrc.slice(exSrc.indexOf("{"), exSrc.lastIndexOf("}") + 1)}`)();
  const problems = [];
  const cmp = (src, dst, where) => {
    for (const k of Object.keys(src)) {
      if (k === "_build") continue;
      if (dst[k] === undefined) { problems.push(`${where} manquant : ${k}`); continue; }
      if (!(k.endsWith("_one")) && vars(dst[k]) !== vars(src[k])) problems.push(`${where} variables différentes : ${k}`);
      if (tags(dst[k]) !== tags(src[k])) problems.push(`${where} balises différentes : ${k}`);
      if (typeof dst[k] !== "string" || !dst[k].trim()) problems.push(`${where} vide : ${k}`);
    }
    for (const k of Object.keys(dst)) if (!(k in src)) problems.push(`${where} en trop : ${k}`);
  };
  cmp(fr, d, "principal");
  cmp(exFr, ex, "app");
  console.log(problems.length ? problems.slice(0, 60).join("\n") + (problems.length > 60 ? `\n… ${problems.length} problèmes` : "") : `${l} : tout est bon`);
  process.exit(problems.length ? 1 : 0);
}
