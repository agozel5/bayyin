"""Icônes, écrans de démarrage et captures pour les stores, à partir de docs/store/icon-master.svg.

Usage (serveur local lancé : PORT=3123 node src/server.js) :
    python3 scripts/store-assets.py            # icônes + écrans de démarrage
    python3 scripts/store-assets.py --shots    # + captures App Store / Play Store
Nécessite Playwright (Chromium) et Pillow.
"""
import io, json, os, re, sys
from pathlib import Path
from PIL import Image
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
PUB, STORE = ROOT / "public", ROOT / "docs" / "store"
MASTER = (STORE / "icon-master.svg").read_text()
# Sur GitHub Actions, Google Fonts est joignable : vraies polices de l'app (IBM Plex Sans et Plex Sans Arabic).
# En local hors ligne, on bloque ces requêtes (Inter à défaut).
ONLINE = bool(os.environ.get("CI"))
FONTS = ('<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700'
         '&family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&display=block">') if ONLINE else ""
FAMILY = "'IBM Plex Sans','IBM Plex Sans Arabic',Inter,system-ui,sans-serif"
# Couleurs de l'app (direction « clinique et précise »)
GREEN, GREEN_DARK, INK, MUTED, PAPER = "#14805A", "#0E5F43", "#10251B", "#4D6157", "#F2F5F3"

# iPhone : (largeur CSS, hauteur CSS, densité)
IPHONES = [(440, 956, 3), (430, 932, 3), (428, 926, 3), (402, 874, 3), (393, 852, 3), (390, 844, 3), (375, 812, 3), (414, 896, 2), (375, 667, 2)]

def svg_sized(n, uid="a"):
    s = MASTER.replace("<svg ", f'<svg width="{n}" height="{n}" ', 1)
    return s.replace('id="', f'id="{uid}').replace("url(#", f"url(#{uid}")

def shot(page, html, w, h, scale=1):
    page.set_viewport_size({"width": w, "height": h})
    page.set_content(f'<!doctype html><html><head><meta charset="utf-8">{FONTS}<style>html,body{{margin:0;width:{w}px;height:{h}px;overflow:hidden}}</style></head><body>{html}</body></html>')
    page.evaluate("document.fonts.ready.then(() => true)")
    page.wait_for_timeout(250 if ONLINE else 150)
    return Image.open(io.BytesIO(page.screenshot()))

def splash_html(w, h):
    icon = min(w, h) * 0.28
    return f'''<div style="width:{w}px;height:{h}px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:{icon*0.14}px;
      background:{GREEN};font-family:{FAMILY};color:#fff">
      <div style="width:{icon}px;height:{icon}px;border-radius:{icon*0.225}px;overflow:hidden;box-shadow:0 0 0 {max(1, icon*0.006)}px rgb(255 255 255 / .18)">{svg_sized(int(icon), "s")}</div>
      <div style="font-size:{icon*0.28}px;font-weight:700;letter-spacing:-.01em;margin-top:{icon*0.06}px">Bayyin</div>
      <div style="font-size:{icon*0.11}px;font-weight:500;opacity:.78">بيّن · Halal &amp; santé</div></div>'''

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
  "fr": ["Scannez, sachez en une seconde", "Halal vérifié sur la liste officielle", "Votre santé, notée sur 100", "L'étiquette surlignée, mot par mot", "534 additifs expliqués"],
  "en": ["Scan it, know in a second", "Halal checked against the official list", "Your health, scored out of 100", "The label, highlighted word by word", "534 additives explained"],
  "ar": ["امسح المنتج واعرف في ثانية", "حلال موثَّق من القائمة الرسمية", "صحتك، بتقييم من 100", "الملصق مُظلَّل كلمةً بكلمة", "534 مادة مضافة مشروحة"],
  "tr": ["Tara, bir saniyede öğren", "Resmî listeden doğrulanmış helal", "Sağlığınız 100 üzerinden", "Etiket kelime kelime işaretlenir", "534 katkı maddesi açıklandı"],
}
SUBS = {
  "fr": ["Halal, santé, allergies — gratuit et sans pub", "AVS · Achahada · HMC", "Nutri-Score, additifs, bio", "Ce qui est douteux, et pourquoi, selon votre école", "Origine, risques, sources officielles"],
  "en": ["Halal, health, allergies — free, no ads", "AVS · Achahada · HMC", "Nutri-Score, additives, organic", "What is doubtful and why, by your school", "Origin, risks, official sources"],
  "ar": ["حلال، صحة، حساسية — مجاني وبلا إعلانات", "AVS · Achahada · HMC", "Nutri-Score، المضافات، العضوي", "ما المشكوك فيه ولماذا، حسب مذهبك", "المصدر والمخاطر والمراجع الرسمية"],
  "tr": ["Helal, sağlık, alerji — ücretsiz ve reklamsız", "AVS · Achahada · HMC", "Nutri-Score, katkı maddeleri, organik", "Şüpheli olan ve nedeni, mezhebinize göre", "Köken, riskler, resmî kaynaklar"],
}
TAGLINE = {
  "fr": ("Halal, santé, additifs.", "Tout en un scan."),
  "en": ("Halal, health, additives.", "All in one scan."),
  "ar": ("حلال، صحة، مضافات.", "كل ذلك في مسح واحد."),
  "tr": ("Helal, sağlık, katkı maddeleri.", "Hepsi tek taramada."),
}
PROMISE = {"fr": "Gratuit · sans pub · sans pistage", "en": "Free · no ads · no tracking", "ar": "مجاني · بلا إعلانات · بلا تتبّع", "tr": "Ücretsiz · reklamsız · takipsiz"}

def app_screens(b, lang):
    ctx = b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=3, service_workers="block")
    ctx.add_init_script(f'localStorage.setItem("halalscan_settings_v1", {json.dumps(json.dumps({"lang": lang, "onboarded": True, "tourDone": True, "sheetTourDone": True}))})')
    ctx.add_init_script('localStorage.setItem("bayyin_intro", "1")')  # sans l'animation d'ouverture
    if not ONLINE:
        ctx.route(re.compile(r"https://fonts\..*"), lambda r: r.abort())  # hors ligne : Inter à défaut d'IBM Plex
    ctx.route(re.compile(r".*/data/certified\.json"), lambda r: r.fulfill(status=200, content_type="application/json", body=json.dumps(DB)))
    def prod(r):
        code = next((c for c in DEMO if c in r.request.url), None)
        r.fulfill(status=200, content_type="application/json", headers={"Access-Control-Allow-Origin": "*"},
                  body=json.dumps({"status": 1, "product": {"code": code, **DEMO[code]}} if code else {"status": 0}))
    ctx.route(re.compile(r".*world\.openfoodfacts\.org/api/v2/product/.*"), prod)
    ctx.route(re.compile(r".*world\.openfoodfacts\.org/(cgi|api/v2/search).*"), lambda r: r.fulfill(status=200, content_type="application/json", headers={"Access-Control-Allow-Origin": "*"}, body='{"products":[],"count":0}'))
    ctx.route(re.compile(r".*openbeautyfacts.*"), lambda r: r.fulfill(status=200, content_type="application/json", body='{"status":0}'))
    p = ctx.new_page()
    p.goto("http://localhost:3123/", wait_until="load"); p.evaluate("document.fonts.ready.then(() => true)"); p.wait_for_timeout(1200)
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
    p.evaluate("(() => { const r = document.querySelector('#sheetBody .reader') || document.querySelector('.ptabs'); document.getElementById('sheetBody').scrollTop = r.offsetTop - 150; })()"); p.wait_for_timeout(400)
    out.append(p.screenshot())
    p.click("#sheetClose"); p.wait_for_timeout(300)
    p.goto("http://localhost:3123/#additives"); p.wait_for_timeout(1500)
    out.append(p.screenshot())
    ctx.close()
    return out

def phone(png_b64, pw, ph, crop_top=True):
    return f'''<div style="width:{pw}px;height:{ph}px;border-radius:{pw*0.13}px;padding:{pw*0.026}px;background:{INK};box-sizing:border-box;flex:none">
      <img src="data:image/png;base64,{png_b64}" style="width:100%;height:100%;object-fit:cover;object-position:{"top" if crop_top else "center"};border-radius:{pw*0.105}px;display:block"></div>'''

def frame_html(png_b64, title, sub, W, H, rtl=False):
    phone_h = H * 0.70
    phone_w = phone_h * 390 / 844
    return f'''<div dir="{"rtl" if rtl else "ltr"}" style="width:{W}px;height:{H}px;box-sizing:border-box;display:flex;flex-direction:column;align-items:center;
      padding-top:{H*0.065}px;background:{PAPER};font-family:{FAMILY};color:{INK};text-align:center">
      <div style="font-size:{W*0.066}px;font-weight:700;line-height:1.14;letter-spacing:-.015em;max-width:{W*0.86}px">{title}</div>
      <div style="font-size:{W*0.034}px;font-weight:500;color:{MUTED};margin-top:{H*0.014}px;max-width:{W*0.86}px">{sub}</div>
      <div style="margin-top:{H*0.045}px">{phone(png_b64, phone_w, phone_h)}</div></div>'''

def banner_html(png_b64, lang, W, H, phone_scale=0.92):
    """Bannière horizontale (Google Play, aperçu de partage, réseaux) : marque à gauche, l'app à droite."""
    rtl = lang == "ar"
    a, b = TAGLINE[lang]
    icon = H * 0.20
    ph = H * phone_scale * 1.35
    pw = ph * 390 / 844
    return f'''<div dir="{"rtl" if rtl else "ltr"}" style="width:{W}px;height:{H}px;box-sizing:border-box;overflow:hidden;position:relative;background:{GREEN};font-family:{FAMILY};color:#fff">
      <div style="position:absolute;inset-block:0;inset-inline-start:{W*0.06}px;width:{W*0.52}px;display:flex;flex-direction:column;justify-content:center;gap:{H*0.035}px">
        <div style="display:flex;align-items:center;gap:{icon*0.32}px">
          <div style="width:{icon}px;height:{icon}px;border-radius:{icon*0.225}px;overflow:hidden;box-shadow:0 0 0 {max(1, icon*0.012)}px rgb(255 255 255 / .2)">{svg_sized(int(icon), "b")}</div>
          <div style="font-size:{icon*0.62}px;font-weight:700;letter-spacing:-.01em">Bayyin <span style="font-weight:500;opacity:.75;font-family:'IBM Plex Sans Arabic',sans-serif">بيّن</span></div></div>
        <div style="font-size:{H*0.095}px;font-weight:700;line-height:1.12;letter-spacing:-.015em">{a}<br>{b}</div>
        <div style="font-size:{H*0.045}px;font-weight:500;opacity:.82">{PROMISE[lang]}</div></div>
      <div style="position:absolute;top:{H*0.16}px;inset-inline-end:{W*0.07}px">{phone(png_b64, pw, ph)}</div></div>'''

def square_html(png_b64, lang, W, H):
    """Publication carrée ou story : titre en haut, l'app en dessous, coupée par le bas."""
    rtl = lang == "ar"
    a, b = TAGLINE[lang]
    icon = W * 0.10
    ph = H * (0.80 if H > W * 1.4 else 0.95)
    pw = ph * 390 / 844
    return f'''<div dir="{"rtl" if rtl else "ltr"}" style="width:{W}px;height:{H}px;box-sizing:border-box;overflow:hidden;position:relative;background:{GREEN};font-family:{FAMILY};color:#fff;text-align:center">
      <div style="padding-top:{W*0.08}px;display:flex;flex-direction:column;align-items:center;gap:{W*0.025}px">
        <div style="display:flex;align-items:center;gap:{icon*0.3}px"><div style="width:{icon}px;height:{icon}px;border-radius:{icon*0.225}px;overflow:hidden">{svg_sized(int(icon), "q")}</div>
          <div style="font-size:{icon*0.6}px;font-weight:700">Bayyin</div></div>
        <div style="font-size:{W*0.075}px;font-weight:700;line-height:1.12;letter-spacing:-.015em">{a}<br>{b}</div>
        <div style="font-size:{W*0.034}px;font-weight:500;opacity:.82">{PROMISE[lang]}</div></div>
      <div style="position:absolute;left:50%;transform:translateX(-50%);top:{H*(0.36 if H > W * 1.4 else 0.44)}px">{phone(png_b64, pw, ph)}</div></div>'''

def store_shots(b, page):
    import base64
    homes = {}
    for lang in TITLES:
        d = STORE / "screenshots" / lang
        d.mkdir(parents=True, exist_ok=True)
        raws = app_screens(b, lang)
        homes[lang] = raws
        for i, raw in enumerate(raws):
            b64 = base64.b64encode(raw).decode()
            for tag, (W, H) in {"ios-6.9": (1290, 2796), "android": (1080, 1920)}.items():
                img = shot(page, frame_html(b64, TITLES[lang][i], SUBS[lang][i], W, H, rtl=lang == "ar"), W, H).convert("RGB")
                img.save(d / f"{i+1}-{tag}.jpg", quality=86, optimize=True)
        print("captures", lang, "ok")
    return homes

def banners(page, homes):
    """Google Play (bannière obligatoire), aperçu de partage du site, réseaux sociaux, captures du manifeste."""
    import base64
    social = STORE / "social"
    social.mkdir(exist_ok=True)
    for lang, raws in homes.items():
        home = base64.b64encode(raws[0]).decode()
        shot(page, banner_html(home, lang, 1024, 500), 1024, 500).convert("RGB").save(STORE / f"play-feature-{lang}.png", optimize=True)
        shot(page, square_html(home, lang, 1080, 1080), 1080, 1080).convert("RGB").save(social / f"post-{lang}.jpg", quality=88, optimize=True)
        shot(page, square_html(home, lang, 1080, 1920), 1080, 1920).convert("RGB").save(social / f"story-{lang}.jpg", quality=88, optimize=True)
        if lang in ("fr", "en"):
            shot(page, banner_html(home, lang, 1500, 500, 0.95), 1500, 500).convert("RGB").save(social / f"header-x-{lang}.jpg", quality=88, optimize=True)
            shot(page, banner_html(home, lang, 1584, 396, 0.95), 1584, 396).convert("RGB").save(social / f"header-linkedin-{lang}.jpg", quality=88, optimize=True)
    # Aperçu quand on partage le lien du site (WhatsApp, Messages, réseaux)
    shot(page, banner_html(base64.b64encode(homes["fr"][0]).decode(), "fr", 1200, 630), 1200, 630).convert("RGB").save(PUB / "og.jpg", quality=86, optimize=True)
    # Captures montrées par Android et Chrome au moment d'installer la version web
    (PUB / "screenshots").mkdir(exist_ok=True)
    for i, name in ((0, "home"), (1, "halal"), (2, "health")):
        im = Image.open(io.BytesIO(homes["fr"][i])).convert("RGB").resize((780, 1688))
        im.save(PUB / "screenshots" / f"{name}.jpg", quality=80, optimize=True)
    print("bannières ok")

if __name__ == "__main__":
    with sync_playwright() as pw:
        b = pw.chromium.launch()
        page = b.new_page()
        icons(page)
        links = splashes(page)
        (STORE / "splash-links.html").write_text("\n".join(links) + "\n")
        if "--shots" in sys.argv:
            banners(page, store_shots(b, page))
        b.close()
    print("ok")
