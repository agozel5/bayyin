// Sonde temporaire (3)
const UA = { "User-Agent": "Mozilla/5.0 (compatible; Bayyin/1.0; +https://github.com/agozel5/bayyin)" };
async function get(url) {
  try { const r = await fetch(url, { headers: UA, signal: AbortSignal.timeout(25000) });
    return { status: r.status, type: r.headers.get("content-type"), text: await r.text() };
  } catch (e) { return { status: "ERR " + e.message, text: "" }; }
}
const js = await get("https://avs.fr/etablissements/script.js?v=20251004");
console.log("== AVS script.js", js.status, js.text.length);
const i = js.text.indexOf("fetch(");
console.log(js.text.slice(Math.max(0, i - 1500), i + 400));
for (const m of js.text.matchAll(/["'`]([^"'`\s]*\.(?:json|php)[^"'`\s]*)["'`]/g)) console.log("  url:", m[1]);
const urls = [...js.text.matchAll(/["'`]((?:\.\.?\/|\/|https?:)[^"'`\s]{3,120})["'`]/g)].map((m) => m[1]);
console.log("  chemins:", [...new Set(urls)].slice(0, 40).join(" , "));
const a = await get("https://achahada.com/wp-json/wp/v2/pages/6244");
console.log("\n== Achahada page marques", a.status);
try { const h = JSON.parse(a.text).content.rendered; console.log("len", h.length);
  console.log([...h.matchAll(/<img[^>]*>/g)].map((m) => m[0].slice(0, 220)).slice(0, 60).join("\n"));
  console.log("texte:", h.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").slice(0, 2500));
} catch (e) { console.log(a.text.slice(0, 500)); }
const t = await get("https://halalhmc.org/wp-json/wp/v2/types");
console.log("\n== HMC types", t.status);
try { const o = JSON.parse(t.text); for (const k in o) console.log(" ", k, o[k].rest_base, o[k].name); } catch { console.log(t.text.slice(0, 300)); }
const b = await get("https://halalhmc.org/brands/");
console.log("\n== HMC brands", b.status);
console.log([...b.text.matchAll(/<h[1-4][^>]*>([\s\S]{1,160}?)<\/h[1-4]>/g)].map((m) => m[1].replace(/<[^>]+>/g, "").trim()).filter(Boolean).slice(0, 60).join(" | "));
const avsJ = await get("https://avs.fr/etablissements/data.json");
console.log("\n== AVS data.json guess", avsJ.status, avsJ.text.slice(0, 200));
