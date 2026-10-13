// Sonde temporaire (4)
const UA = { "User-Agent": "Mozilla/5.0 (compatible; Bayyin/1.0; +https://github.com/agozel5/bayyin)", Origin: "https://avs.fr", Referer: "https://avs.fr/etablissements/" };
async function get(url) {
  try { const r = await fetch(url, { headers: UA, signal: AbortSignal.timeout(30000) });
    return { status: r.status, cors: r.headers.get("access-control-allow-origin"), text: await r.text() };
  } catch (e) { return { status: "ERR " + e.message, text: "" }; }
}
for (const t of [1, 2, 3]) {
  const r = await get(`https://equinox.avs.fr/v1/common/partners?type=${t}`);
  console.log(`\n== AVS type=${t}`, r.status, "cors:", r.cors, r.text.length);
  try { const d = JSON.parse(r.text); const arr = Array.isArray(d) ? d : d.data || d.partners || d.items || [];
    console.log("n =", arr.length, "clés:", Object.keys(arr[0] || d).join(","));
    console.log(JSON.stringify(arr.slice(0, 2)).slice(0, 1500));
    if (t === 3) console.log("noms:", arr.slice(0, 200).map((x) => x.name || x.nom || x.title || x.raison_sociale || x.enseigne).join(" ; "));
  } catch { console.log(r.text.slice(0, 400)); }
}
const s = await get("https://achahada.com/wp-admin/admin-ajax.php?action=store_search&lat=48.85&lng=2.35&max_results=500&search_radius=2000&autoload=1");
console.log("\n== Achahada wpsl", s.status, s.text.length);
try { const d = JSON.parse(s.text); console.log("n =", d.length, "clés:", Object.keys(d[0] || {}).join(","));
  console.log(d.slice(0, 120).map((x) => (x.store || "").replace(/&#8217;/g, "'") + " [" + (x.city || "") + "]").join(" ; "));
} catch { console.log(s.text.slice(0, 400)); }
let n = 0, names = [];
for (let p = 1; p <= 15; p++) {
  const r = await get(`https://halalhmc.org/brands/${p > 1 ? `page/${p}/` : ""}`);
  if (r.status !== 200) break;
  const hs = [...r.text.matchAll(/<h2[^>]*>([\s\S]{1,160}?)<\/h2>/g)].map((m) => m[1].replace(/<[^>]+>/g, "").trim());
  names.push(...hs); n = p;
}
console.log("\n== HMC pages", n, "marques:", [...new Set(names)].length, [...new Set(names)].join(" ; "));
