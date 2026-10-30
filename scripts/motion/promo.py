#!/usr/bin/env python3
"""Vidéo promotionnelle Bayyin avec voix off, filmée dans l'app réelle (réseaux sociaux, 1080×1920).

Déroulé : ouverture animée (motion.html) -> l'app réelle dans un téléphone, avec le texte de la voix
en grand au-dessus -> écran de fin animé. La voix est synthétisée avec Piper (voix française « Siwis »,
licence CC BY 4.0 : citer « Voix : Siwis, Université d'Édimbourg, CC BY 4.0 »), la musique est celle
des vidéos d'aperçu (scripts/preview-music.py), baissée sous la voix.

Prérequis : serveur local (PORT=3123 node src/server.js), Playwright (Chromium), ffmpeg,
Piper dans PIPER_DIR (dossier contenant piper/ et voice/fr-siwis-medium.onnx).
Usage : PIPER_DIR=... python3 scripts/motion/promo.py sortie.mp4
"""
import base64, json, os, re, subprocess, sys, tempfile, time, wave
from pathlib import Path
from playwright.sync_api import sync_playwright

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
PUB = ROOT / "public"
BASE = "http://localhost:3123/"
OUT = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "docs" / "store" / "social" / "promo-fr.mp4"
PIPER = Path(os.environ.get("PIPER_DIR", ""))
FPS = 30
W, H = 540, 960  # points CSS ; ×2 = 1080×1920

# Texte de la voix (« Bayine » : écrit comme il se prononce) et sous-titre affiché au-dessus du téléphone
VOICE = {
    "intro": ("Bayine. Le halal, en clair.", None),
    "scan": ("Scannez le code-barres d'un produit. En une seconde, Bayine vous dit s'il est halal, douteux ou haram.",
             "Scannez un produit\u00a0: halal, douteux ou haram, en une seconde."),
    "cert": ("Quand le produit est certifié, vous voyez le label et l'organisme qui l'a délivré.",
             "Le label halal, lu et vérifié."),
    "doubt": ("S'il est douteux, Bayine vous explique pourquoi, ingrédient par ingrédient, selon votre avis religieux.",
              "Ce qui est douteux, et pourquoi."),
    "health": ("Vous avez aussi sa note santé sur cent : Nutri-Score, additifs, transformation.",
               "Votre santé, notée sur 100."),
    "rank": ("Pour mieux choisir, les classements montrent les meilleurs produits halal de chaque rayon.",
             "Les meilleurs produits, rayon par rayon."),
    "add": ("Et cinq cent trente-quatre additifs sont expliqués : origine, statut halal, avis des autorités sanitaires.",
            "534 additifs expliqués."),
    "end": ("Bayine. Gratuit, sans publicité, sans pistage. Bientôt sur l'App Store et Google Play.", None),
}

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

def tts(text, path):
    subprocess.run([str(PIPER / "piper" / "piper"), "--model", str(PIPER / "voice" / "fr-siwis-medium.onnx"), "--length_scale", "0.96",
                    "--sentence_silence", "0.18", "--output_file", str(path)], input=text.encode(), check=True, capture_output=True)
    with wave.open(str(path)) as w: return w.getnframes() / w.getframerate()

# Plateau : fond de la marque, sous-titre en grand, l'app réelle dans un téléphone
STAGE = f"""<!doctype html><html lang="fr"><head><meta charset="utf-8"><link rel="stylesheet" href="/fonts/fonts.css">
<style>
html,body{{margin:0;height:100%;overflow:hidden;background:#0A2A1F}}
body{{background:radial-gradient(120% 70% at 20% 0%,#1E8F5E 0%,#0F6545 40%,#0A2A1F 100%)}}
.cap{{position:absolute;left:28px;right:28px;top:56px;height:170px;display:flex;align-items:center;justify-content:center;text-align:center;
  font:800 31px/1.18 'IBM Plex Sans',system-ui,sans-serif;color:#fff;letter-spacing:-.01em;text-wrap:balance;transition:opacity .3s ease,transform .3s ease}}
.cap.out{{opacity:0;transform:translateY(-10px)}}
.phone{{position:absolute;left:50%;top:250px;width:316px;height:668px;margin-left:-158px;border-radius:52px;background:#0B0F0D;
  box-shadow:0 0 0 2px #2B3A33,0 30px 60px rgb(0 0 0 / .55)}}
.screen{{position:absolute;inset:10px;border-radius:43px;overflow:hidden;background:#0B100D}}
.screen iframe{{border:0;width:390px;height:844px;transform:scale(.758);transform-origin:0 0;display:block}}
.island{{position:absolute;left:50%;top:18px;width:86px;height:24px;margin-left:-43px;border-radius:14px;background:#000;z-index:2}}
.pat{{position:absolute;inset:0;opacity:.08;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80'%3E%3Cg fill='none' stroke='%23fff' stroke-width='1.5' transform='translate(40 40)'%3E%3Crect x='-20' y='-20' width='40' height='40'/%3E%3Crect x='-20' y='-20' width='40' height='40' transform='rotate(45)'/%3E%3C/g%3E%3C/svg%3E")}}
</style></head><body><div class="pat"></div>
<div class="cap" id="cap"></div>
<div class="phone"><div class="island"></div><div class="screen"><iframe id="app" src="about:blank"></iframe></div></div>
<script>window.setCap=(t)=>{{const c=document.getElementById('cap');c.classList.add('out');setTimeout(()=>{{c.textContent=t;c.classList.remove('out')}},280)}};</script>
</body></html>"""

def render_motion(tmp, name, t0, t1, hold=0.0):
    """Images de motion.html entre t0 et t1 (puis l'image finale tenue `hold` secondes)."""
    d = tmp / name; d.mkdir()
    with sync_playwright() as pw:
        b = pw.chromium.launch(); p = b.new_page(viewport={"width": 1080, "height": 1920})
        p.goto((HERE / "motion.html").as_uri() + "?f=story"); p.wait_for_function("window.ready === true", timeout=20000)
        n = int((t1 - t0 + hold) * FPS)
        for i in range(n):
            p.evaluate(f"window.render({min(t0 + i / FPS, t1)})")
            p.locator("canvas").screenshot(path=str(d / f"f{i:04d}.png"))
        b.close()
    out = tmp / f"{name}.mp4"
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-framerate", str(FPS), "-i", str(d / "f%04d.png"), "-c:v", "libx264", "-preset", "veryfast",
                    "-crf", "16", "-pix_fmt", "yuv420p", str(out)], check=True)
    return out, n / FPS

def record_app(tmp, dur):
    frames, marks = [], {}
    with sync_playwright() as pw:
        b = pw.chromium.launch()
        ctx = b.new_context(viewport={"width": W, "height": H}, device_scale_factor=2, color_scheme="dark", service_workers="block")
        st = {"lang": "fr", "onboarded": True, "tourDone": True, "sheetTourDone": True, "theme": "dark"}
        ctx.add_init_script(f'try{{if(!localStorage.getItem("halalscan_settings_v1"))localStorage.setItem("halalscan_settings_v1", {json.dumps(json.dumps(st))})}}catch(e){{}}')
        def prod(r):
            code = next((c for c in PRODUCTS if c in r.request.url), None)
            r.fulfill(status=200, content_type="application/json", headers={"Access-Control-Allow-Origin": "*"},
                      body=json.dumps({"status": 1, "product": {"code": code, **PRODUCTS[code]}} if code else {"status": 0}))
        ctx.route(re.compile(r".*world\.openfoodfacts\.org/api/v2/product/.*"), prod)
        ctx.route(re.compile(r".*world\.openfoodfacts\.org/(cgi|api/v2/search).*"), lambda r: r.fulfill(status=200, content_type="application/json", headers={"Access-Control-Allow-Origin": "*"}, body='{"products":[],"count":0}'))
        ctx.route(re.compile(r".*openbeautyfacts.*"), lambda r: r.fulfill(status=200, content_type="application/json", body='{"status":0}'))
        ctx.route(BASE + "__promo.html", lambda r: r.fulfill(status=200, content_type="text/html; charset=utf-8", body=STAGE))
        page = ctx.new_page()
        page.goto(BASE + "__promo.html"); page.evaluate("document.fonts.ready.then(() => true)")
        page.evaluate("document.getElementById('app').src = '/'")
        page.wait_for_timeout(2500)
        f = page.frames[1]
        f.evaluate("(() => { const t = document.getElementById('homeTipBox'); if (t) t.hidden = true; })()")
        cdp = ctx.new_cdp_session(page)
        def on_frame(ev):
            frames.append((ev["metadata"]["timestamp"], ev["data"]))
            cdp.send("Page.screencastFrameAck", {"sessionId": ev["sessionId"]})
        cdp.on("Page.screencastFrame", on_frame)
        cdp.send("Page.startScreencast", {"format": "jpeg", "quality": 92, "maxWidth": W * 2, "maxHeight": H * 2, "everyNthFrame": 1})
        page.wait_for_timeout(200)

        def step(key, actions):
            """Sous-titre + actions, puis on attend la fin de la phrase de la voix."""
            t0 = time.time(); marks[key] = t0
            page.evaluate("setCap(%s)" % json.dumps(VOICE[key][1]))
            actions()
            rest = dur[key] + 0.35 - (time.time() - t0)
            if rest > 0: page.wait_for_timeout(int(rest * 1000))

        def open_code(code):
            f.click("#focusManual"); page.wait_for_timeout(250)
            f.type("#manualInput", code, delay=45); page.wait_for_timeout(150)
            f.press("#manualInput", "Enter")
            f.wait_for_selector("#sheetBody .ptabs", timeout=10000)
        def scroll_sheet(to, steps=26, ms=26):
            f.evaluate("""([to, steps, ms]) => new Promise((res) => { const b = document.getElementById('sheetBody'); const from = b.scrollTop; let i = 0;
              const id = setInterval(() => { i++; const k = i / steps; b.scrollTop = from + (to - from) * (1 - Math.pow(1 - k, 3)); if (i >= steps) { clearInterval(id); res(); } }, ms); })""", [to, steps, ms])
        def close(): f.click("#sheetClose"); page.wait_for_timeout(450)

        step("scan", lambda: (page.wait_for_timeout(1500), open_code(CODES["halal"]), page.wait_for_timeout(1400)))
        def cert():
            top = f.evaluate("document.querySelector('#sheetBody .ptabs').offsetTop - 120")
            scroll_sheet(top); page.wait_for_timeout(600)
        step("cert", cert)
        close()
        def doubt():
            open_code(CODES["doubt"]); page.wait_for_timeout(1200)
            rt = f.evaluate("(() => { const r = document.querySelector('#sheetBody .reader') || document.querySelector('#sheetBody .ptabs'); return r.offsetTop - 140; })()")
            scroll_sheet(rt); page.wait_for_timeout(500)
            hl = f.query_selector("#sheetBody .reader .hl")
            if hl: hl.click()
        step("doubt", doubt)
        close()
        def health():
            open_code(CODES["health"]); page.wait_for_timeout(900)
            f.click('[data-ptab="health"]'); page.wait_for_timeout(500)
            ht = f.evaluate("document.querySelector('#sheetBody .ptabs').offsetTop - 90")
            scroll_sheet(ht)
        step("health", health)
        f.click('[data-ptab="halal"]'); close()
        def rank():
            f.click(".rank-promo"); page.wait_for_timeout(1100)
            f.click('[data-rank-cat="mueslis"]')
        step("rank", rank)
        def add():
            f.click('.tab[data-tab="additives"]'); page.wait_for_timeout(900)
            f.evaluate("""() => new Promise((res) => { let i = 0; const id = setInterval(() => { i++; window.scrollTo(0, i * 22); if (i >= 26) { clearInterval(id); res(); } }, 26); })""")
            e = f.query_selector('.ae summary:has(.ae-code:text-is("E120"))')
            if e: e.scroll_into_view_if_needed(); page.wait_for_timeout(300); e.click()
        step("add", add)
        marks["_end"] = time.time()
        cdp.send("Page.stopScreencast")
        b.close()
    # images horodatées -> vidéo à cadence fixe
    d = tmp / "app"; d.mkdir()
    t_first = frames[0][0]
    lst = []
    for i, (ts, data) in enumerate(frames):
        pth = d / f"f{i:05d}.jpg"; pth.write_bytes(base64.b64decode(data)); lst.append((ts, pth))
    concat = d / "list.txt"
    with concat.open("w") as fh:
        for i, (ts, pth) in enumerate(lst):
            nxt = lst[i + 1][0] if i + 1 < len(lst) else marks["_end"]
            fh.write(f"file '{pth}'\nduration {max(nxt - ts, 1 / 60):.4f}\n")
        fh.write(f"file '{lst[-1][1]}'\n")
    out = tmp / "app.mp4"
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", str(concat),
                    "-vf", "fps=30,scale=1080:1920:flags=lanczos,format=yuv420p", "-c:v", "libx264", "-preset", "veryfast", "-crf", "16", str(out)], check=True)
    length = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(out)], capture_output=True, text=True).stdout)
    # instants de début de chaque phrase, relatifs au début de cette partie
    return out, length, {k: v - t_first for k, v in marks.items() if not k.startswith("_")}

if __name__ == "__main__":
    tmp = Path(tempfile.mkdtemp())
    dur = {k: tts(v[0], tmp / f"v-{k}.wav") for k, v in VOICE.items()}
    print({k: round(v, 2) for k, v in dur.items()})
    intro, li = render_motion(tmp, "intro", 0, 2.75, hold=max(0, dur["intro"] + 0.9 - 2.75))
    app, la, marks = record_app(tmp, dur)
    end, le = render_motion(tmp, "end", 20.0, 22.5, hold=max(0.6, dur["end"] + 1.2 - 2.5))
    total = li + la + le
    # Voix placées à leur instant ; musique en dessous, baissée pendant la voix
    starts = {"intro": 0.5, **{k: li + v + 0.15 for k, v in marks.items()}, "end": li + la + 0.4}
    music = tmp / "music.wav"
    subprocess.run([sys.executable, str(ROOT / "scripts" / "preview-music.py"), str(music), f"{total:.2f}"], check=True, capture_output=True)
    keys = list(VOICE)
    args = ["ffmpeg", "-y", "-loglevel", "error", "-i", str(intro), "-i", str(app), "-i", str(end), "-i", str(music)]
    for k in keys: args += ["-i", str(tmp / f"v-{k}.wav")]
    fl = "[0:v][1:v][2:v]concat=n=3:v=1:a=0[v];"
    for i, k in enumerate(keys):
        ms = int(starts[k] * 1000)
        fl += f"[{4 + i}:a]aresample=48000,pan=stereo|c0=c0|c1=c0,adelay={ms}|{ms},volume=1.7[a{i}];"
    fl += "".join(f"[a{i}]" for i in range(len(keys))) + f"amix=inputs={len(keys)}:normalize=0[voice];"
    fl += "[voice]asplit[vo][sc];[3:a]aresample=48000,volume=0.55[mu];[mu][sc]sidechaincompress=threshold=0.02:ratio=8:attack=20:release=400[duck];"
    fl += "[duck][vo]amix=inputs=2:normalize=0,loudnorm=I=-14:TP=-1.5:LRA=9[a]"
    args += ["-filter_complex", fl, "-map", "[v]", "-map", "[a]", "-c:v", "libx264", "-preset", "veryfast", "-crf", "18", "-pix_fmt", "yuv420p",
             "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", "-t", f"{total:.2f}", str(OUT)]
    subprocess.run(args, check=True)
    print(OUT, f"{total:.1f} s")
