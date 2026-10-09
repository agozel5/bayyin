#!/usr/bin/env bash
# Sonde temporaire : vitesse, CORS et pertinence des API de recherche
O="Origin: https://agozel5.github.io"
probe() { # $1 titre, $2 url
  echo "=================== $1"; echo "$2"
  curl -s -o /tmp/b.json -D /tmp/h.txt -w "HTTP %{http_code} en %{time_total}s\n" -H "$O" -H "User-Agent: Bayyin/1.0 (probe)" --max-time 40 "$2"
  grep -i '^access-control' /tmp/h.txt
  head -c 1500 /tmp/b.json | tr -d '\n' | cut -c1-1500; echo
  python3 - <<'PY'
import json
try:
  d=json.load(open("/tmp/b.json"))
except Exception as e:
  print("non JSON", e); raise SystemExit
hits=d.get("hits") or d.get("products") or []
print("total", d.get("count") or d.get("hits_total") or d.get("total"), "| keys", list(d.keys())[:12])
for h in hits[:10]:
  n=h.get("product_name")
  print(" -", h.get("code"), "|", json.dumps(n, ensure_ascii=False)[:120], "|", h.get("product_name_fr"), "|", h.get("brands"), "|", h.get("lang"))
PY
}
F="code,product_name,product_name_fr,product_name_en,product_name_ar,product_name_tr,brands,lang,lc,countries_tags"
S="https://search.openfoodfacts.org/search"
probe "SAL nutella fr" "$S?q=nutella&langs=fr&page_size=5"
probe "SAL nutella fields" "$S?q=nutella&langs=fr&page_size=5&fields=$F"
probe "SAL isla mondial poulet" "$S?q=isla%20mondial%20poulet&langs=fr&page_size=8&fields=$F"
probe "SAL chips paprika" "$S?q=chips%20paprika&langs=fr&page_size=8&fields=$F"
probe "SAL lait fr" "$S?q=lait&langs=fr&page_size=8&fields=$F"
probe "SAL cikolata tr" "$S?q=%C3%A7ikolata&langs=tr,fr,en&page_size=8&fields=$F"
probe "SAL ar chocolat" "$S?q=%D8%B4%D9%88%D9%83%D9%88%D9%84%D8%A7%D8%AA%D8%A9&langs=ar,fr,en&page_size=8&fields=$F"
probe "SAL chocolate en" "$S?q=chocolate%20milk&langs=en&page_size=8&fields=$F"
probe "SAL fr filtre pays" "$S?q=lait%20countries_tags:%22en:france%22&langs=fr&page_size=8&fields=$F"
probe "SAL sort popularity" "$S?q=lait&langs=fr&page_size=8&fields=$F&sort_by=-unique_scans_n"
probe "LEGACY isla mondial" "https://world.openfoodfacts.org/cgi/search.pl?search_terms=isla%20mondial%20poulet&search_simple=1&action=process&json=1&page_size=8&fields=$F"
probe "LEGACY lait" "https://world.openfoodfacts.org/cgi/search.pl?search_terms=lait&search_simple=1&action=process&json=1&page_size=8&fields=$F"
probe "LEGACY OBF savon" "https://world.openbeautyfacts.org/cgi/search.pl?search_terms=savon&search_simple=1&action=process&json=1&page_size=8&fields=$F"
probe "SAL OBF ?" "https://search.openbeautyfacts.org/search?q=savon&page_size=5"
probe "SAL OFF index beauty?" "$S?q=savon%20karite&langs=fr&page_size=5&index_id=obf&fields=$F"
probe "SAL autocomplete brands" "https://search.openfoodfacts.org/autocomplete?q=isla&taxonomy_names=brand&lang=fr&size=5"
