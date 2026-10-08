// Mode rayon : la caméra lit plusieurs codes-barres à la fois et renvoie, à chaque image,
// leur position à l'écran. L'app y pose des pastilles (vert, orange, rouge) en surimpression.

import { getDetector, detectorEngine } from "./camera.js";
import { normalizeScan } from "./barcode.js";

export function createAisle({ video, onFrame, onState }) {
  let stream = null;
  let detector = null;
  let timer = null;
  let running = false;
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { willReadFrequently: true });

  const set = (state, detail = {}) => onState && onState(state, detail);

  // Position d'un rectangle de l'image vidéo à l'écran (la vidéo remplit l'écran en « cover »)
  function toScreen(box, k) {
    const W = video.clientWidth, H = video.clientHeight;
    const vw = video.videoWidth, vh = video.videoHeight;
    const s = Math.max(W / vw, H / vh);
    const ox = (W - vw * s) / 2, oy = (H - vh * s) / 2;
    return {
      x: (box.x / k) * s + ox,
      y: (box.y / k) * s + oy,
      w: (box.width / k) * s,
      h: (box.height / k) * s,
    };
  }

  async function loop() {
    if (!running) return;
    const vw = video.videoWidth, vh = video.videoHeight;
    if (vw && vh && detector) {
      // Image réduite à 1280 px au plus : assez pour lire plusieurs codes, assez léger pour rester fluide
      const k = Math.min(1, 1280 / Math.max(vw, vh));
      canvas.width = Math.round(vw * k);
      canvas.height = Math.round(vh * k);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      try {
        const results = await detector.detect(canvas);
        const seen = new Map();
        for (const r of results || []) {
          const code = normalizeScan(r.rawValue);
          if (!code || seen.has(code) || !r.boundingBox) continue;
          seen.set(code, toScreen(r.boundingBox, k));
        }
        if (running) onFrame([...seen].map(([code, rect]) => ({ code, rect })));
      } catch {
        /* image illisible : on passe à la suivante */
      }
    }
    if (running) timer = setTimeout(loop, 120);
  }

  async function start() {
    if (running) return;
    running = true;
    set("starting");
    if (!window.isSecureContext || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      running = false;
      return set("error", { kind: !window.isSecureContext ? "https" : "unsupported" });
    }
    const ready = getDetector();
    ready.catch(() => {});
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } },
      });
    } catch (err) {
      running = false;
      const name = (err && err.name) || "";
      return set("error", { kind: name === "NotAllowedError" || name === "SecurityError" ? "denied" : name === "NotFoundError" ? "nocamera" : "camera" });
    }
    if (!running) return release();
    video.setAttribute("playsinline", "");
    video.muted = true;
    video.srcObject = stream;
    video.play().catch(() => {});
    try {
      detector = await ready;
    } catch {
      release();
      running = false;
      return set("error", { kind: "decoder" });
    }
    if (!running) return release();
    set("scanning", { engine: detectorEngine() });
    loop();
  }

  function release() {
    if (stream) stream.getTracks().forEach((tr) => tr.stop());
    stream = null;
    video.srcObject = null;
  }

  function stop() {
    running = false;
    clearTimeout(timer);
    release();
    set("idle");
  }

  return { start, stop };
}
