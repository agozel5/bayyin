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
BEAUTY = "3567730300185"  # shampooing (Open Beauty Facts)
PRODUCTS = {}
for f in (PUB / "data" / "rankings").glob("*.json"):
    d = json.loads(f.read_text())
    if isinstance(d, list):
        for x in d:
            if isinstance(x, dict) and x.get("code") in CODES + [BEAUTY]: PRODUCTS[x["code"]] = x

class H(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = socketserver.TCPServer(("127.0.0.1", 8765), functools.partial(H, directory=str(DIST)))
threading.Thread(target=srv.serve_forever, daemon=True).start()

def run(lang, scheme):
    errs = []
    with sync_playwright() as pw:
        b = pw.chromium.launch(args=["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"])
        ctx = b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, color_scheme=scheme, permissions=["camera"])
        ctx.add_init_script("try{localStorage.setItem('bayyin:settings', %s)}catch(e){}" % json.dumps(json.dumps({"lang": lang, "theme": scheme, "onboarded": True, "toured": True})))
        def prod(r):
            if "ecoscore" in r.request.url: return r.continue_()  # onglet Planète : vraies données d'Open Food Facts
            code = next((c for c in PRODUCTS if c in r.request.url and c != BEAUTY), None)
            r.fulfill(status=200, content_type="application/json", headers={"Access-Control-Allow-Origin": "*"},
                      body=json.dumps({"status": 1, "product": {"code": code, **PRODUCTS[code]}} if code else {"status": 0}))
        ctx.route(re.compile(r".*openfoodfacts\.org/api/v[0-9]/product/.*"), prod)
        def beauty(r):
            ok = BEAUTY in r.request.url and BEAUTY in PRODUCTS
            r.fulfill(status=200, content_type="application/json", headers={"Access-Control-Allow-Origin": "*"},
                      body=json.dumps({"status": 1, "product": {"code": BEAUTY, **PRODUCTS[BEAUTY]}} if ok else {"status": 0}))
        ctx.route(re.compile(r".*world\.openbeautyfacts\.org/api/.*"), beauty)
        def ranks(r):
            f = PUB / "data" / "rankings" / r.request.url.split("/data/rankings/")[1].split("?")[0]
            r.fulfill(status=200 if f.exists() else 404, content_type="application/json", headers={"Access-Control-Allow-Origin": "*"},
                      body=f.read_text() if f.exists() else "{}")
        ctx.route(re.compile(r".*/data/rankings/.*\.json.*"), ranks)
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
        for c, tabs in [(CODES[2], ["halal", "health", "compo", "planet"]), (CODES[0], ["halal", "planet"]), (BEAUTY, ["health", "compo"])]:
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
        # Alerte personnelle : lait et fruits à coque dans le profil (yaourt : contient du lait, traces de fruits à coque)
        p.evaluate("window.__bayyin.setSettings({ profile: { allergens: ['en:milk', 'en:nuts', 'en:eggs'], diet: null } })"); p.wait_for_timeout(400)
        p.evaluate(f"window.__bayyin.openProduct('{CODES[1]}')"); p.wait_for_timeout(2500); shot("alert")
        p.evaluate("window.__bayyin.pop()"); p.wait_for_timeout(700)
        p.evaluate("window.__bayyin.setSettings({ profile: { allergens: [], diet: null } })"); p.wait_for_timeout(400)
        # Caméra (flux de test de Chromium)
        p.evaluate("window.__bayyin.openCamera()"); p.wait_for_timeout(3000); shot("camera")
        p.evaluate("window.__bayyin.pop()"); p.wait_for_timeout(700)
        # Visite guidée : quelques étapes
        for n in [0, 1, 2, 4, 7]:
            p.evaluate(f"window.__bayyin.tour({n})"); p.wait_for_timeout(1200); shot(f"tour-{n}")
        p.evaluate("window.__bayyin.tour(null)"); p.wait_for_timeout(500)
        # Classements : liste des rayons, puis deux rayons
        p.set_viewport_size({"width": 390, "height": 2600})
        p.evaluate("window.__bayyin.setTab('scan')"); p.wait_for_timeout(600)
        p.evaluate("window.__bayyin.openRankings()"); p.wait_for_timeout(2000); shot("rank")
        for cat in ["spreads", "shampoos"]:
            p.evaluate(f"window.__bayyinRankCat('{cat}')"); p.wait_for_timeout(2200); shot(f"rank-{cat}")
        p.evaluate("window.__bayyinRankCat(null)"); p.evaluate("window.__bayyin.pop()"); p.wait_for_timeout(700)
        p.set_viewport_size({"width": 390, "height": 844})
        b.close()
    return errs

if __name__ == "__main__":
    report = {}
    for lang, scheme in [("fr", "light"), ("fr", "dark"), ("ar", "light")]:
        report[f"{lang}-{scheme}"] = run(lang, scheme)
    (OUT / "errors.json").write_text(json.dumps(report, ensure_ascii=False, indent=1))
    print(json.dumps(report, ensure_ascii=False)[:2000])
