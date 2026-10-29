#!/usr/bin/env python3
"""Vidéo d'aperçu pour l'App Store et Google Play (une par langue).

Règle Apple 2.3.4 : la vidéo ne montre que l'app elle-même, filmée en fonctionnement. On filme donc l'app
réelle (servie en local) avec de vrais produits Open Food Facts, et on ajoute seulement un titre au-dessus.

Sortie : docs/store/preview/preview-<lang>.mp4 — 886×1920 (iPhone 6,5"/6,9" portrait), H.264, 30 i/s,
piste audio stéréo silencieuse, environ 25 s.
Prérequis : serveur local sur le port 3123 (PORT=3123 node src/server.js), Playwright (Chromium), ffmpeg.
"""
import base64, json, re, shutil, subprocess, sys, tempfile, time
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
PUB = ROOT / "public"
OUT = ROOT / "docs" / "store" / "preview"
BASE = "http://localhost:3123/"
W, H = 443, 960          # en points CSS ; ×2 = 886×1920
BAND = 150               # bandeau du titre, au-dessus de l'app

# Mêmes vrais produits que les captures des stores (copie gardée par l'app dans public/data/rankings)
CODES = {"halal": "3291980533795", "health": "6111250471695", "doubt": "3256224124870"}
def ranked():
    out = {}
    for f in (PUB / "data" / "rankings").glob("*.json"):
        d = json.loads(f.read_text())
        if isinstance(d, list):
            for x in d:
                if isinstance(x, dict) and x.get("code") in CODES.values(): out[x["code"]] = x
    return out
PRODUCTS = ranked()
assert len(PRODUCTS) == len(CODES), "produits introuvables dans public/data/rankings"

CAPTIONS = {
    "fr": ["Halal, santé, additifs : tout en un scan", "Le label halal, lu et expliqué", "Ce qui est douteux, et pourquoi",
           "Votre santé, notée sur 100", "Les meilleurs produits, rayon par rayon", "534 additifs expliqués", "Gratuit · sans pub · sans pistage"],
    "en": ["Halal, health, additives: all in one scan", "The halal label, read and explained", "What is doubtful, and why",
           "Your health, scored out of 100", "The best products, aisle by aisle", "534 additives explained", "Free · no ads · no tracking"],
    "ar": ["حلال، صحة، مضافات: كل ذلك في مسح واحد", "علامة الحلال، مقروءة ومشروحة", "ما المشكوك فيه، ولماذا",
           "صحتك، بتقييم من 100", "أفضل المنتجات، قسمًا بقسم", "534 مادة مضافة مشروحة", "مجاني · بلا إعلانات · بلا تتبّع"],
    "tr": ["Helal, sağlık, katkı maddeleri: hepsi tek taramada", "Helal etiketi okunur ve açıklanır", "Şüpheli olan ve nedeni",
           "Sağlığınız 100 üzerinden", "En iyi ürünler, reyon reyon", "534 katkı maddesi açıklandı", "Ücretsiz · reklamsız · takipsiz"],
}

# Page « plateau » : un bandeau de titre et l'app réelle dans un cadre, sur la même origine que l'app
def stage_html(lang):
    rtl = lang == "ar"
    return f"""<!doctype html><html lang="{lang}" dir="{'rtl' if rtl else 'ltr'}"><head><meta charset="utf-8">
<link rel="stylesheet" href="/fonts/fonts.css">
<style>
html,body{{margin:0;height:100%;background:#0B3B2A;overflow:hidden}}
.band{{position:absolute;inset:0 0 auto 0;height:{BAND}px;display:flex;align-items:center;justify-content:center;padding:0 26px;box-sizing:border-box;
  background:radial-gradient(120% 140% at 20% 0%,#1E8F5E 0%,#0F5C3E 55%,#0B3B2A 100%);color:#fff;text-align:center}}
.cap{{font:800 30px/1.18 'IBM Plex Sans','IBM Plex Sans Arabic',system-ui,sans-serif;letter-spacing:-.01em;transition:opacity .35s ease,transform .35s ease}}
.cap.out{{opacity:0;transform:translateY(-8px)}}
.app{{position:absolute;left:0;right:0;top:{BAND}px;bottom:0;border-radius:34px 34px 0 0;overflow:hidden;background:#0B100D;box-shadow:0 -10px 30px rgb(0 0 0 / .35)}}
iframe{{border:0;width:100%;height:100%;display:block}}
</style></head><body>
<div class="band"><div class="cap" id="cap"></div></div>
<div class="app"><iframe id="app" src="about:blank"></iframe></div>
<script>
window.setCap = (t) => {{ const c = document.getElementById('cap'); c.classList.add('out'); setTimeout(() => {{ c.textContent = t; c.classList.remove('out'); }}, 300); }};
</script></body></html>"""

def record(lang, workdir):
    caps = CAPTIONS[lang]
    frames = []
    with sync_playwright() as pw:
        b = pw.chromium.launch()
        ctx = b.new_context(viewport={"width": W, "height": H}, device_scale_factor=2, color_scheme="dark", service_workers="block")
        settings = {"lang": lang, "onboarded": True, "tourDone": True, "sheetTourDone": True, "theme": "dark"}
        ctx.add_init_script(f'try{{if(!localStorage.getItem("halalscan_settings_v1"))localStorage.setItem("halalscan_settings_v1", {json.dumps(json.dumps(settings))})}}catch(e){{}}')
        def prod(r):
            code = next((c for c in PRODUCTS if c in r.request.url), None)
            r.fulfill(status=200, content_type="application/json", headers={"Access-Control-Allow-Origin": "*"},
                      body=json.dumps({"status": 1, "product": {"code": code, **PRODUCTS[code]}} if code else {"status": 0}))
        ctx.route(re.compile(r".*world\.openfoodfacts\.org/api/v2/product/.*"), prod)
        ctx.route(re.compile(r".*world\.openfoodfacts\.org/(cgi|api/v2/search).*"), lambda r: r.fulfill(status=200, content_type="application/json", headers={"Access-Control-Allow-Origin": "*"}, body='{"products":[],"count":0}'))
        ctx.route(re.compile(r".*openbeautyfacts.*"), lambda r: r.fulfill(status=200, content_type="application/json", body='{"status":0}'))
        ctx.route(BASE + "__preview.html", lambda r: r.fulfill(status=200, content_type="text/html; charset=utf-8", body=stage_html(lang)))
        page = ctx.new_page()
        page.goto(BASE + "__preview.html"); page.evaluate("document.fonts.ready.then(() => true)")
        cdp = ctx.new_cdp_session(page)
        def on_frame(ev):
            frames.append((ev["metadata"]["timestamp"], ev["data"]))
            cdp.send("Page.screencastFrameAck", {"sessionId": ev["sessionId"]})
        cdp.on("Page.screencastFrame", on_frame)

        # 1. Ouverture : l'animation d'accueil de l'app, puis l'écran d'accueil
        page.evaluate("document.getElementById('app').src = '/?intro'")
        app = page.frame_locator("#app")
        frame = lambda: page.frames[1]
        page.wait_for_timeout(300)
        cdp.send("Page.startScreencast", {"format": "jpeg", "quality": 92, "maxWidth": W * 2, "maxHeight": H * 2, "everyNthFrame": 1})
        page.evaluate("setCap(%s)" % json.dumps(caps[0]))
        page.wait_for_timeout(2300)
        f = frame()
        f.evaluate("(() => { const t = document.getElementById('homeTipBox'); if (t) t.hidden = true; })()")
        page.wait_for_timeout(500)

        def open_code(code):
            f.click("#focusManual"); page.wait_for_timeout(300)
            f.type("#manualInput", code, delay=22); page.wait_for_timeout(120)
            f.press("#manualInput", "Enter")
            f.wait_for_selector("#sheetBody .ptabs", timeout=10000)
        def scroll_sheet(to, steps=18, ms=24):
            f.evaluate("""([to, steps, ms]) => new Promise((res) => { const b = document.getElementById('sheetBody'); const from = b.scrollTop; let i = 0;
              const id = setInterval(() => { i++; const k = i / steps; b.scrollTop = from + (to - from) * (1 - Math.pow(1 - k, 3)); if (i >= steps) { clearInterval(id); res(); } }, ms); })""", [to, steps, ms])
        def close():
            f.click("#sheetClose"); page.wait_for_timeout(500)

        # 2. Halal certifié : verdict, puis la certification
        open_code(CODES["halal"]); page.wait_for_timeout(1200)
        page.evaluate("setCap(%s)" % json.dumps(caps[1]))
        page.wait_for_timeout(500)
        top = f.evaluate("document.querySelector('#sheetBody .ptabs').offsetTop - 120")
        scroll_sheet(top); page.wait_for_timeout(1300)
        close()

        # 3. Douteux : l'étiquette surlignée, on touche le mot en cause
        open_code(CODES["doubt"]); page.wait_for_timeout(1000)
        page.evaluate("setCap(%s)" % json.dumps(caps[2]))
        rt = f.evaluate("(() => { const r = document.querySelector('#sheetBody .reader') || document.querySelector('#sheetBody .ptabs'); return r.offsetTop - 140; })()")
        scroll_sheet(rt); page.wait_for_timeout(400)
        hl = f.query_selector("#sheetBody .reader .hl")
        if hl: hl.click(); page.wait_for_timeout(1600)
        close()

        # 4. Santé : la note sur 100 et le détail
        open_code(CODES["health"]); page.wait_for_timeout(900)
        page.evaluate("setCap(%s)" % json.dumps(caps[3]))
        f.click('[data-ptab="health"]'); page.wait_for_timeout(500)
        ht = f.evaluate("document.querySelector('#sheetBody .ptabs').offsetTop - 90")
        scroll_sheet(ht); page.wait_for_timeout(1500)
        f.click('[data-ptab="halal"]'); close()

        # 5. Classements
        page.evaluate("setCap(%s)" % json.dumps(caps[4]))
        f.click(".rank-promo"); page.wait_for_timeout(1000)
        f.click('[data-rank-cat="mueslis"]'); page.wait_for_timeout(1600)

        # 6. Additifs
        page.evaluate("setCap(%s)" % json.dumps(caps[5]))
        f.click('.tab[data-tab="additives"]'); page.wait_for_timeout(900)
        f.evaluate("""() => new Promise((res) => { let i = 0; const id = setInterval(() => { i++; window.scrollTo(0, i * 22); if (i >= 26) { clearInterval(id); res(); } }, 24); })""")
        page.wait_for_timeout(300)
        e120 = f.query_selector('.ae summary:has(.ae-code:text-is("E120"))')
        if e120: e120.scroll_into_view_if_needed(); page.wait_for_timeout(300); e120.click(); page.wait_for_timeout(1400)

        # 7. Fin : retour à l'accueil de l'app
        page.evaluate("setCap(%s)" % json.dumps(caps[6]))
        f.click('.tab[data-tab="scan"]'); page.wait_for_timeout(300)
        f.evaluate("window.scrollTo(0,0)"); page.wait_for_timeout(1500)
        cdp.send("Page.stopScreencast")
        b.close()
    return frames

def encode(frames, lang, workdir):
    # Images horodatées -> vidéo à cadence fixe (30 i/s), 886×1920, piste stéréo silencieuse
    d = Path(workdir) / lang; d.mkdir(parents=True, exist_ok=True)
    lst = []
    for i, (ts, data) in enumerate(frames):
        p = d / f"f{i:05d}.jpg"; p.write_bytes(base64.b64decode(data)); lst.append((ts, p))
    concat = d / "list.txt"
    with concat.open("w") as fh:
        for i, (ts, p) in enumerate(lst):
            nxt = lst[i + 1][0] if i + 1 < len(lst) else ts + 0.5
            fh.write(f"file '{p}'\nduration {max(nxt - ts, 1 / 60):.4f}\n")
        fh.write(f"file '{lst[-1][1]}'\n")
    # Limite Apple : 30 s. Au-delà de 28,5 s, la vidéo est très légèrement accélérée
    span = lst[-1][0] - lst[0][0] + 0.5
    speed = f"setpts=PTS*{28.5 / span:.4f}," if span > 28.5 else ""
    OUT.mkdir(parents=True, exist_ok=True)
    out = OUT / f"preview-{lang}.mp4"
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", str(concat),
                    "-f", "lavfi", "-i", "anullsrc=channel_layout=stereo:sample_rate=48000",
                    "-vf", f"{speed}fps=30,scale=886:1920:flags=lanczos,format=yuv420p",
                    "-c:v", "libx264", "-preset", "slow", "-profile:v", "high", "-level", "4.0", "-b:v", "11M", "-minrate", "10M", "-maxrate", "12M", "-bufsize", "12M",
                    "-c:a", "aac", "-b:a", "256k", "-shortest", "-movflags", "+faststart", str(out)], check=True)
    return out

if __name__ == "__main__":
    langs = sys.argv[1:] or ["fr", "en", "ar", "tr"]
    tmp = tempfile.mkdtemp()
    try:
        for lang in langs:
            fr = record(lang, tmp)
            out = encode(fr, lang, tmp)
            dur = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(out)], capture_output=True, text=True).stdout.strip()
            print(f"{out.relative_to(ROOT)} : {len(fr)} images, {dur} s")
            assert 15 <= float(dur) <= 30, f"durée hors limites Apple (15 à 30 s) : {dur}"
    finally:
        shutil.rmtree(tmp, ignore_errors=True)
