#!/usr/bin/env bash
F="code,product_name,product_name_fr,product_name_ar,product_name_tr,brands,countries_tags,categories_tags"
L="https://world.openfoodfacts.org/cgi/search.pl"
probe() {
  echo "=================== $1"
  curl -s -o /tmp/b.json -w "HTTP %{http_code} en %{time_total}s\n" -H "User-Agent: Bayyin/1.0 (probe)" --max-time 40 "$2"
  python3 - <<'PY'
import json
try: d=json.load(open("/tmp/b.json"))
except Exception as e: print("non JSON", e); raise SystemExit
print("total", d.get("count"))
for h in (d.get("products") or [])[:12]:
  fr = "FR" if "en:france" in (h.get("countries_tags") or []) else "--"
  print(" -", fr, h.get("code"), "|", h.get("product_name"), "|", h.get("product_name_ar") or "", "|", h.get("product_name_tr") or "", "|", h.get("brands"), "|", ",".join((h.get("categories_tags") or [])[-2:]))
PY
}
q() { python3 -c "import urllib.parse,sys;print(urllib.parse.quote(sys.argv[1]))" "$1"; }
for s in "حليب" "شوكولاتة" "دجاج" "süt" "tavuk" "çikolata" "coca cola zero" "kinder bueno" "danone yaourt" "merguez" "nutela" "shampoing" "chocolat" "biscuit" "jus d'orange" "chicken" "fromage" "pain de mie"; do
  probe "$s" "$L?search_terms=$(q "$s")&search_simple=1&action=process&json=1&page_size=12&fields=$F"
done
probe "lait lc=fr" "$L?search_terms=lait&search_simple=1&action=process&json=1&page_size=12&lc=fr&cc=fr&fields=$F"
probe "lait france filter" "$L?search_terms=lait&search_simple=1&action=process&json=1&page_size=12&tagtype_0=countries&tag_contains_0=contains&tag_0=en:france&fields=$F"
probe "chocolat france filter" "$L?search_terms=chocolat&search_simple=1&action=process&json=1&page_size=12&tagtype_0=countries&tag_contains_0=contains&tag_0=en:france&fields=$F"
probe "fr.openfoodfacts lait" "https://fr.openfoodfacts.org/cgi/search.pl?search_terms=lait&search_simple=1&action=process&json=1&page_size=12&fields=$F"
probe "fr.openfoodfacts chocolat" "https://fr.openfoodfacts.org/cgi/search.pl?search_terms=chocolat&search_simple=1&action=process&json=1&page_size=12&fields=$F"
probe "tr.openfoodfacts süt" "https://tr.openfoodfacts.org/cgi/search.pl?search_terms=$(q süt)&search_simple=1&action=process&json=1&page_size=12&fields=$F"
probe "OBF shampoing" "https://world.openbeautyfacts.org/cgi/search.pl?search_terms=shampoing&search_simple=1&action=process&json=1&page_size=10&fields=$F"
probe "OBF fr savon" "https://fr.openbeautyfacts.org/cgi/search.pl?search_terms=savon&search_simple=1&action=process&json=1&page_size=10&fields=$F"
probe "OBF nutella (doit etre vide)" "https://world.openbeautyfacts.org/cgi/search.pl?search_terms=nutella&search_simple=1&action=process&json=1&page_size=10&fields=$F"
echo "=== CORS fr.openfoodfacts"
curl -s -D - -o /dev/null -H "Origin: https://agozel5.github.io" "https://fr.openfoodfacts.org/cgi/search.pl?search_terms=lait&json=1&page_size=1" | grep -i 'access-control-allow-origin\|^HTTP'
echo "=== CORS SAL preflight"
curl -s -D - -o /dev/null -X OPTIONS -H "Origin: https://agozel5.github.io" -H "Access-Control-Request-Method: GET" "https://search.openfoodfacts.org/search?q=lait" | grep -i 'access-control\|^HTTP'
curl -s -D - -o /dev/null -H "Origin: https://world.openfoodfacts.org" "https://search.openfoodfacts.org/search?q=lait" | grep -i 'access-control\|^HTTP'
