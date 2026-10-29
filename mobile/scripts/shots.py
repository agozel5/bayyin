#!/usr/bin/env python3
"""Captures de contrôle de l'app React Native, rendue en version web (expo export -p web).

Usage : python scripts/shots.py dist-web sortie/   (en CI : workflow « App mobile — captures »)
Les fiches utilisent de vrais produits Open Food Facts (copie gardée dans public/data/rankings).
"""
import json, re, sys, threading, http.server, functools, socketserver
from pathlib import Path
from playwright.sync_api import sync_playwright

DIST, OUT = Path(sys.argv[1]), Path(sys.argv[2])
OUT.mkdir(parents=True, exist_ok=True)
PUB = Path(__file__).resolve().parents[2] / "public"
CODES = ["3291980533795", "6111250471695", "3256224124870"]
PRODUCTS = {}
for f in (PUB / "data" / "rankings").glob("*.json"):
    d = json.loads(f.read_text())
    if isinstance(d, list):
        for x in d:
            if isinstance(x, dict) and x.get("code") in CODES: PRODUCTS[x["code"]] = x

class H(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = socketserver.TCPServer(("127.0.0.1", 8765), functools.partial(H, directory=str(DIST)))
threading.Thread(target=srv.serve_forever, daemon=True).start()

def run(lang, scheme):
    errs = []
    with sync_playwright() as pw:
        b = pw.chromium.launch()
        ctx = b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, color_scheme=scheme)
        ctx.add_init_script("try{localStorage.setItem('bayyin:settings', %s)}catch(e){}" % json.dumps(json.dumps({"lang": lang, "theme": scheme, "onboarded": True})))
        def prod(r):
            code = next((c for c in PRODUCTS if c in r.request.url), None)
            r.fulfill(status=200, content_type="application/json", headers={"Access-Control-Allow-Origin": "*"},
                      body=json.dumps({"status": 1, "product": {"code": code, **PRODUCTS[code]}} if code else {"status": 0}))
        ctx.route(re.compile(r".*openfoodfacts\.org/api/v[0-9]/product/.*"), prod)
        ctx.route(re.compile(r".*openbeautyfacts.*"), lambda r: r.fulfill(status=200, content_type="application/json", body='{"status":0}'))
        p = ctx.new_page()
        p.on("pageerror", lambda e: errs.append(str(e)))
        p.goto("http://127.0.0.1:8765/"); p.wait_for_function("!!window.__bayyin", timeout=30000); p.wait_for_timeout(1500)
        tag = f"{lang}-{scheme}"
        def shot(name, full=False): p.screenshot(path=str(OUT / f"{tag}-{name}.png"), full_page=full)
        shot("home-first")
        for c in CODES:
            p.evaluate(f"window.__bayyin.openProduct('{c}')"); p.wait_for_timeout(2500)
            shot(f"sheet-{c}")
            p.evaluate("window.__bayyin.pop()"); p.wait_for_timeout(700)
        # Fiche complète, onglet par onglet (fenêtre haute : la fiche défile dans son propre cadre)
        p.set_viewport_size({"width": 390, "height": 2600})
        for c, tabs in [(CODES[2], ["halal", "health", "compo"]), (CODES[0], ["halal"])]:
            p.evaluate(f"window.__bayyin.openProduct('{c}')"); p.wait_for_timeout(2200)
            for tb in tabs:
                p.evaluate(f"window.__bayyin.sheetTab && window.__bayyin.sheetTab('{tb}')"); p.wait_for_timeout(900)
                shot(f"full-{c}-{tb}")
            p.evaluate("window.__bayyin.sheetTab && window.__bayyin.sheetTab('halal')")
            p.evaluate("window.__bayyin.pop()"); p.wait_for_timeout(700)
        p.set_viewport_size({"width": 390, "height": 844})
        p.evaluate("window.__bayyin.setTab('history')"); p.wait_for_timeout(500)
        p.evaluate("window.__bayyin.setTab('scan')"); p.wait_for_timeout(1200); shot("home")
        for tab in ["search", "history", "additives", "settings"]:
            p.evaluate(f"window.__bayyin.setTab('{tab}')"); p.wait_for_timeout(1200); shot(tab)
        p.set_viewport_size({"width": 390, "height": 1700})
        for pg in ["lang", "profile", "religion", "appearance", "offline", "data", "notes", "how", "sources", "privacy", "limits"]:
            p.evaluate(f"window.__bayyin.settingsPage && window.__bayyin.settingsPage('{pg}')"); p.wait_for_timeout(900); shot(f"set-{pg}")
        p.evaluate("window.__bayyin.settingsPage && window.__bayyin.settingsPage(null)")
        p.set_viewport_size({"width": 390, "height": 844})
        b.close()
    return errs

if __name__ == "__main__":
    report = {}
    for lang, scheme in [("fr", "light"), ("fr", "dark"), ("ar", "light")]:
        report[f"{lang}-{scheme}"] = run(lang, scheme)
    (OUT / "errors.json").write_text(json.dumps(report, ensure_ascii=False, indent=1))
    print(json.dumps(report, ensure_ascii=False)[:2000])
