#!/usr/bin/env python3
"""Rendu du motion design Bayyin (scripts/motion/motion.html) en vidéo MP4 pour les réseaux sociaux.

Usage : python3 scripts/motion/render.py [story|square|post] [sortie.mp4]
 - story  : 1080×1920 (Reels, TikTok, Stories, Shorts)
 - post   : 1080×1350 (publication Instagram, Facebook, LinkedIn)
 - square : 1080×1080
Musique : scripts/preview-music.py (composée par programme, sans droits tiers).
"""
import subprocess, sys, tempfile
from pathlib import Path
from playwright.sync_api import sync_playwright

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
FMT = sys.argv[1] if len(sys.argv) > 1 else "story"
OUT = Path(sys.argv[2]) if len(sys.argv) > 2 else ROOT / "docs" / "store" / "social" / f"motion-{FMT}-fr.mp4"
H = {"story": 1920, "post": 1350, "square": 1080}[FMT]
FPS = 30

tmp = Path(tempfile.mkdtemp())
with sync_playwright() as pw:
    b = pw.chromium.launch()
    p = b.new_page(viewport={"width": 1080, "height": H}, device_scale_factor=1)
    p.goto((HERE / "motion.html").as_uri() + f"?f={FMT}")
    p.wait_for_function("window.ready === true", timeout=20000)
    dur = p.evaluate("window.DUR")
    n = int(dur * FPS)
    for i in range(n):
        p.evaluate(f"window.render({i / FPS})")
        p.locator("canvas").screenshot(path=str(tmp / f"f{i:04d}.png"))
    b.close()

wav = tmp / "music.wav"
subprocess.run([sys.executable, str(ROOT / "scripts" / "preview-music.py"), str(wav), str(dur)], check=True)
OUT.parent.mkdir(parents=True, exist_ok=True)
subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-framerate", str(FPS), "-i", str(tmp / "f%04d.png"), "-i", str(wav),
                "-c:v", "libx264", "-preset", "veryfast", "-crf", "18", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k",
                "-shortest", "-movflags", "+faststart", str(OUT)], check=True)
print(OUT)
