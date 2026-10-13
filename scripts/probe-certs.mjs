// Sonde temporaire : ce que publient les organismes de certification
const UA = { "User-Agent": "Mozilla/5.0 (compatible; Bayyin/1.0; +https://github.com/agozel5/bayyin)" };
async function get(url) {
  try {
    const r = await fetch(url, { headers: UA, redirect: "follow", signal: AbortSignal.timeout(20000) });
    const t = await r.text();
    return { status: r.status, url: r.url, type: r.headers.get("content-type"), text: t };
  } catch (e) { return { status: "ERR " + e.message, text: "" }; }
}
const show = (label, r) => console.log(`\n===== ${label} → ${r.status} ${r.url || ""} ${r.type || ""} (${r.text.length} o)`);
const links = (html, base) => [...html.matchAll(/(?:href|src)=["']([^"'#]+)["']/g)].map((m) => { try { return new URL(m[1], base).href; } catch { return null; } }).filter(Boolean);
// AVS : annuaire chargé par script
const avs = await get("https://avs.fr/etablissements/index.html?category=fournisseurs");
show("AVS annuaire", avs);
const scripts = links(avs.text, avs.url || "https://avs.fr/etablissements/").filter((u) => /\.js(\?|$)/.test(u));
console.log("scripts:", scripts.join("\n  "));
console.log("inline fetch:", (avs.text.match(/fetch\([^)]{0,200}\)|[\w\/.-]+\.json[^"' ]*/g) || []).slice(0, 20).join("\n  "));
for (const s of scripts.filter((u) => u.includes("avs.fr")).slice(0, 8)) {
  const r = await get(s);
  const hits = (r.text.match(/fetch\([^)]{0,200}\)|["'`][^"'`]*(?:\.json|\/api\/|ajax|wp-json)[^"'`]*["'`]/g) || []).slice(0, 15);
  console.log(` - ${s} (${r.text.length} o):\n    ${hits.join("\n    ")}`);
}
console.log("extrait HTML:", avs.text.replace(/\s+/g, " ").slice(0, 2500));
// Autres organismes : pages d'accueil et liens pertinents
for (const u of ["https://www.achahada.fr", "https://achahada.com", "https://www.argml.fr", "https://www.sfcvh.fr", "https://www.halalhmc.org", "https://www.halalfoodauthority.com", "https://avs.fr/produits", "https://avs.fr"]) {
  const r = await get(u);
  show(u, r);
  const rel = [...new Set(links(r.text, r.url || u).filter((l) => /produit|product|marque|brand|fournisseur|supplier|liste|list|certif|agre|approved|membre|member/i.test(l)))].slice(0, 25);
  console.log(rel.join("\n  "));
}
