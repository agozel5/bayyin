"""Icônes, écrans de démarrage et captures pour les stores, à partir de docs/store/icon-master.svg.

Usage (serveur local lancé : PORT=3123 node src/server.js) :
    python3 scripts/store-assets.py            # icônes + écrans de démarrage
    python3 scripts/store-assets.py --shots    # + captures App Store / Play Store
Nécessite Playwright (Chromium) et Pillow.
"""
import io, json, re, sys
from pathlib import Path
from PIL import Image
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
PUB, STORE = ROOT / "public", ROOT / "docs" / "store"
MASTER = (STORE / "icon-master.svg").read_text()

# iPhone : (largeur CSS, hauteur CSS, densité)
IPHONES = [(440, 956, 3), (430, 932, 3), (428, 926, 3), (402, 874, 3), (393, 852, 3), (390, 844, 3), (375, 812, 3), (414, 896, 2), (375, 667, 2)]

def svg_sized(n, uid="a"):
    s = MASTER.replace("<svg ", f'<svg width="{n}" height="{n}" ', 1)
    return s.replace('id="', f'id="{uid}').replace("url(#", f"url(#{uid}")

def shot(page, html, w, h, scale=1):
    page.set_viewport_size({"width": w, "height": h})
    page.set_content(f'<!doctype html><html><head><meta charset="utf-8"><style>html,body{{margin:0;width:{w}px;height:{h}px;overflow:hidden}}</style></head><body>{html}</body></html>')
    page.wait_for_timeout(150)
    return Image.open(io.BytesIO(page.screenshot()))

def splash_html(w, h):
    icon = min(w, h) * 0.30
    return f'''<div style="width:{w}px;height:{h}px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:{icon*0.16}px;
      background:radial-gradient(120% 70% at 50% 30%,#1FA371 0%,#14805A 55%,#0B5A3F 100%);font-family:Figtree,Inter,system-ui,sans-serif;color:#fff">
      <div style="width:{icon}px;height:{icon}px;border-radius:{icon*0.225}px;overflow:hidden;box-shadow:0 {icon*0.08}px {icon*0.25}px rgb(0 0 0 / .25)">{svg_sized(int(icon), "s")}</div>
      <div style="font-size:{icon*0.30}px;font-weight:800;letter-spacing:-.02em;margin-top:{icon*0.05}px">Bayyin</div>
      <div style="font-size:{icon*0.12}px;font-weight:600;opacity:.8">بيّن · Halal &amp; santé</div></div>'''

def icons(page):
    full = lambda n: shot(page, svg_sized(n), n, n).convert("RGB")
    full(1024).save(STORE / "icon-1024.png")                  # App Store (sans transparence)
    full(512).save(STORE / "play-icon-512.png")               # Play Store
    for n in (180, 192, 512): full(n).save(PUB / f"icon-{n}.png")  # contenu dans la zone sûre : « maskable »
    # Android adaptatif : premier plan transparent (lettre + cadre), fond vert à part
    fg = MASTER.replace('<rect width="1024" height="1024" fill="url(#bg)"/>', "").replace('<rect width="1024" height="1024" fill="url(#star)"/>', "").replace('<rect width="1024" height="1024" fill="url(#glow)"/>', "")
    page.set_viewport_size({"width": 1024, "height": 1024})
    page.set_content(f'<html><body style="margin:0;background:transparent">{fg.replace("<svg ", "<svg width=\'1024\' height=\'1024\' ", 1)}</body></html>')
    page.screenshot(path=str(STORE / "android-adaptive-foreground.png"), omit_background=True)
    # Icône web arrondie
    rounded = MASTER.replace("<defs>", '<defs><clipPath id="r"><rect width="1024" height="1024" rx="230"/></clipPath>', 1)
    rounded = re.sub(r"(</defs>)([\s\S]*)(</svg>)", r'\1<g clip-path="url(#r)">\2</g>\3', rounded)
    (PUB / "icon.svg").write_text(rounded)

def splashes(page):
    links = []
    for w, h, d in IPHONES:
        img = shot(page, splash_html(w * d, h * d), w * d, h * d).convert("RGB")
        name = f"splash-{w*d}x{h*d}.jpg"
        img.save(PUB / "splash" / name, quality=85, optimize=True)
        links.append(f'<link rel="apple-touch-startup-image" media="(device-width: {w}px) and (device-height: {h}px) and (-webkit-device-pixel-ratio: {d}) and (orientation: portrait)" href="splash/{name}">')
    shot(page, splash_html(1284, 2778), 1284, 2778).convert("RGB").save(STORE / "splash.png", optimize=True)
    return links

# ---------------------------------------------------------------------------
# Captures des stores : l'app réelle (données d'exemple) dans un cadre avec un titre
# ---------------------------------------------------------------------------
NUT = {"energy-kcal_100g": 120, "sugars_100g": 4, "saturated-fat_100g": 1.2, "salt_100g": 0.3, "proteins_100g": 6, "fiber_100g": 3}
DEMO = {
 "3000000000017": {"product_name": "Merguez de bœuf", "brands": "Socopa", "quantity": "400 g", "labels": "Halal, AVS", "labels_tags": ["en:halal", "fr:avs"], "emb_codes": "FR 22.070.001 CE", "categories_tags": ["en:meats", "en:sausages"], "ingredients_text_fr": "viande de bœuf 85 %, eau, sel, épices, ail", "nutriscore_grade": "c", "nutriments": {**NUT, "saturated-fat_100g": 7, "salt_100g": 1.8, "proteins_100g": 16}, "nova_group": 3},
 "3000000000024": {"product_name": "Biscuits fourrés chocolat", "brands": "Exemple", "categories_tags": ["en:biscuits", "en:sweet-snacks"], "ingredients_text_fr": "farine de blé, sucre, huile de palme, cacao, émulsifiant E471, E322, arôme", "additives_tags": ["en:e471", "en:e322"], "nutriscore_grade": "e", "nutriments": {**NUT, "sugars_100g": 38, "saturated-fat_100g": 9}},
}
DB = {"meta": {"updated": "2026-10-12"}, "orgs": {"avs": {"updated": "2026-10-12", "names": ["SOCOPA GUINGAMP"], "stamps": ["FR22070001CE"], "url": "https://avs.fr/"}}}
TITLES = {
  "fr": ["Scannez, sachez en une seconde", "Halal vérifié sur la liste officielle", "Votre santé, notée sur 100", "Douteux ? On vous dit pourquoi", "534 additifs expliqués"],
  "en": ["Scan it, know in a second", "Halal checked against the official list", "Your health, scored out of 100", "Doubtful? We tell you why", "534 additives explained"],
}
SUBS = {
  "fr": ["Halal, santé, allergies — gratuit et sans pub", "AVS, Achahada, HMC", "Nutri-Score, additifs, bio", "Selon votre école et vos réglages", "Origine, risques, sources officielles"],
  "en": ["Halal, health, allergies — free, no ads", "AVS, Achahada, HMC", "Nutri-Score, additives, organic", "Based on your school and settings", "Origin, risks, official sources"],
}

def app_screens(b, lang):
    ctx = b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=3, service_workers="block")
    ctx.add_init_script(f'localStorage.setItem("halalscan_settings_v1", {json.dumps(json.dumps({"lang": lang, "onboarded": True, "tourDone": True}))})')
    ctx.route(re.compile(r"https://fonts\..*"), lambda r: r.abort())  # hors ligne : Inter à défaut de Figtree
    ctx.route(re.compile(r".*/data/certified\.json"), lambda r: r.fulfill(status=200, content_type="application/json", body=json.dumps(DB)))
    def prod(r):
        code = next((c for c in DEMO if c in r.request.url), None)
        r.fulfill(status=200, content_type="application/json", headers={"Access-Control-Allow-Origin": "*"},
                  body=json.dumps({"status": 1, "product": {"code": code, **DEMO[code]}} if code else {"status": 0}))
    ctx.route(re.compile(r".*world\.openfoodfacts\.org/api/v2/product/.*"), prod)
    ctx.route(re.compile(r".*world\.openfoodfacts\.org/(cgi|api/v2/search).*"), lambda r: r.fulfill(status=200, content_type="application/json", headers={"Access-Control-Allow-Origin": "*"}, body='{"products":[],"count":0}'))
    ctx.route(re.compile(r".*openbeautyfacts.*"), lambda r: r.fulfill(status=200, content_type="application/json", body='{"status":0}'))
    p = ctx.new_page()
    p.goto("http://localhost:3123/", wait_until="load"); p.wait_for_timeout(1200)
    out = [p.screenshot()]
    def open_code(code):
        p.click("#focusManual"); p.fill("#manualInput", code); p.press("#manualInput", "Enter")
        p.wait_for_selector(".ptabs", timeout=8000); p.wait_for_timeout(1800)
    open_code("3000000000017")
    p.evaluate("document.getElementById('sheetBody').scrollTop = document.querySelector('.ptabs').offsetTop - 330"); p.wait_for_timeout(300)
    out.append(p.screenshot())
    p.click('[data-ptab="health"]'); p.wait_for_timeout(500)
    p.evaluate("document.getElementById('sheetBody').scrollTop = 0"); p.wait_for_timeout(200)
    out.append(p.screenshot())
    p.click('[data-ptab="halal"]'); p.click("#sheetClose"); p.wait_for_timeout(300)
    open_code("3000000000024")
    p.evaluate("document.getElementById('sheetBody').scrollTop = document.querySelector('.ptabs').offsetTop - 330"); p.wait_for_timeout(300)
    out.append(p.screenshot())
    p.click("#sheetClose"); p.wait_for_timeout(300)
    p.goto("http://localhost:3123/#additives"); p.wait_for_timeout(1500)
    out.append(p.screenshot())
    ctx.close()
    return out

def frame_html(png_b64, title, sub, W, H):
    phone_h = H * 0.70
    phone_w = phone_h * 390 / 844
    return f'''<div style="width:{W}px;height:{H}px;box-sizing:border-box;display:flex;flex-direction:column;align-items:center;
      padding-top:{H*0.06}px;background:radial-gradient(120% 60% at 50% 0%,#1FA371,#14805A 55%,#0B5A3F);font-family:Figtree,Inter,system-ui,sans-serif;color:#fff;text-align:center">
      <div style="font-size:{W*0.068}px;font-weight:800;line-height:1.12;letter-spacing:-.02em;max-width:{W*0.86}px">{title}</div>
      <div style="font-size:{W*0.036}px;font-weight:600;opacity:.85;margin-top:{H*0.014}px">{sub}</div>
      <div style="margin-top:{H*0.045}px;width:{phone_w}px;height:{phone_h}px;border-radius:{phone_w*0.13}px;padding:{phone_w*0.028}px;background:#0A1F17;box-shadow:0 {H*0.02}px {H*0.05}px rgb(0 0 0 / .35)">
        <img src="data:image/png;base64,{png_b64}" style="width:100%;height:100%;object-fit:cover;object-position:top;border-radius:{phone_w*0.105}px;display:block"></div></div>'''

def store_shots(b, page):
    import base64
    for lang in TITLES:
        d = STORE / "screenshots" / lang
        d.mkdir(parents=True, exist_ok=True)
        for i, raw in enumerate(app_screens(b, lang)):
            b64 = base64.b64encode(raw).decode()
            for tag, (W, H) in {"ios-6.9": (1290, 2796), "android": (1080, 1920)}.items():
                img = shot(page, frame_html(b64, TITLES[lang][i], SUBS[lang][i], W, H), W, H).convert("RGB")
                img.save(d / f"{i+1}-{tag}.jpg", quality=86, optimize=True)
        print("captures", lang, "ok")

if __name__ == "__main__":
    with sync_playwright() as pw:
        b = pw.chromium.launch()
        page = b.new_page()
        icons(page)
        links = splashes(page)
        (STORE / "splash-links.html").write_text("\n".join(links) + "\n")
        if "--shots" in sys.argv:
            store_shots(b, page)
        b.close()
    print("ok")
