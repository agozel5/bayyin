// Sonde temporaire (2) : sources de données des listes AVS, Achahada, HMC
const UA = { "User-Agent": "Mozilla/5.0 (compatible; Bayyin/1.0; +https://github.com/agozel5/bayyin)" };
async function get(url) {
  try {
    const r = await fetch(url, { headers: UA, signal: AbortSignal.timeout(25000) });
    return { status: r.status, url: r.url, type: r.headers.get("content-type"), text: await r.text() };
  } catch (e) { return { status: "ERR " + e.message, text: "" }; }
}
const ctx = (text, re, n = 260) => { const out = []; for (const m of text.matchAll(re)) { out.push(text.slice(Math.max(0, m.index - n), m.index + n).replace(/\s+/g, " ")); if (out.length > 6) break; } return out; };
const js = await get("https://avs.fr/etablissements/script.js?v=20251004");
console.log("== AVS script.js", js.status);
for (const c of ctx(js.text, /fetch\(|API|apiUrl|const\s+\w*(?:URL|Url|url)\w*\s*=|\.json|https?:\/\//g, 220)) console.log(" …", c);
// Achahada : page des marques (Elementor) : images, textes, appels ajax
const ach = await get("https://achahada.com/marques/");
console.log("\n== Achahada /marques", ach.status, ach.text.length);
const imgs = [...ach.text.matchAll(/<img[^>]+(?:alt|title)=["']([^"']{2,80})["'][^>]*src=["']([^"']+)["']|<img[^>]+src=["']([^"']+)["'][^>]*alt=["']([^"']{2,80})["']/g)].map((m) => (m[1] || m[4]) + " | " + (m[2] || m[3]));
console.log("images (alt):", imgs.slice(0, 80).join("\n  "));
const heads = [...ach.text.matchAll(/<h[1-6][^>]*>([\s\S]{1,120}?)<\/h[1-6]>/g)].map((m) => m[1].replace(/<[^>]+>/g, "").trim()).filter(Boolean);
console.log("titres:", heads.slice(0, 80).join(" | "));
console.log("ajax:", ctx(ach.text, /admin-ajax|wp-json|jet-engine|loop/g, 120).slice(0, 4).join("\n"));
const ver = await get("https://achahada.com/verifiez-un-agrement/");
console.log("\n== Achahada /verifiez-un-agrement", ver.status);
console.log([...ver.text.matchAll(/<h[1-6][^>]*>([\s\S]{1,140}?)<\/h[1-6]>|<p[^>]*>([\s\S]{1,300}?)<\/p>/g)].map((m) => (m[1] || m[2]).replace(/<[^>]+>/g, "").trim()).filter(Boolean).slice(0, 40).join(" | "));
console.log("forms:", ctx(ver.text, /<form|admin-ajax|wp-json/g, 200).slice(0, 4).join("\n"));
// HMC : marques
for (const u of ["https://halalhmc.org/suppliers/brands/", "https://halalhmc.org/brands/", "https://halalhmc.org/wp-json/wp/v2/types"]) {
  const r = await get(u);
  console.log("\n==", u, r.status, r.text.length);
  console.log(ctx(r.text, /wp-json|admin-ajax|data-|brand/gi, 150).slice(0, 5).join("\n"));
}
