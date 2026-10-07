// Lecture de code-barres par la caméra, sans bibliothèque de scan tierce.
//
// - Flux vidéo obtenu directement (getUserMedia), affiché en plein écran.
// - Plusieurs fois par seconde, la zone du cadre est copiée dans un canvas puis décodée.
// - Décodeur : l'API BarcodeDetector du téléphone quand elle existe (Android/Chrome),
//   sinon ZXing compilé en WebAssembly via le paquet « barcode-detector » (iPhone, Firefox).
// - Une détection n'est traitée qu'une fois ; la caméra est rendue au système à chaque arrêt.

import { normalizeScan } from "./barcode.js";

const POLYFILL_URL = "https://cdn.jsdelivr.net/npm/barcode-detector@2.3.1/pure/+esm";
const FORMATS = ["ean_13", "ean_8", "upc_a", "upc_e"];

let detectorPromise = null;
let engine = null;

// Charge (une seule fois) le meilleur décodeur disponible.
export function getDetector() {
  if (!detectorPromise) {
    detectorPromise = (async () => {
      if ("BarcodeDetector" in window) {
        try {
          const supported = await window.BarcodeDetector.getSupportedFormats();
          if (supported.includes("ean_13")) {
            engine = "natif";
            return new window.BarcodeDetector({ formats: FORMATS.filter((f) => supported.includes(f)) });
          }
        } catch {
          /* API présente mais inutilisable : on passe à ZXing */
        }
      }
      const mod = await import(POLYFILL_URL);
      engine = "ZXing";
      return new mod.BarcodeDetector({ formats: FORMATS });
    })().catch((err) => {
      detectorPromise = null; // nouvel essai possible plus tard
      throw err;
    });
  }
  return detectorPromise;
}

export const detectorEngine = () => engine;

async function decode(detector, source) {
  const results = await detector.detect(source);
  for (const r of results || []) {
    const code = normalizeScan(r.rawValue);
    if (code) return code;
  }
  return null;
}

// Décodage d'une photo (secours quand la caméra en direct ne marche pas).
export async function decodeImageFile(file) {
  const detector = await getDetector();
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error("Image illisible"));
      i.src = url;
    });
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    // Plusieurs tailles : les photos de téléphone sont énormes, les codes parfois petits.
    for (const max of [1600, 2400, 1000]) {
      const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
      canvas.width = Math.round(img.naturalWidth * scale);
      canvas.height = Math.round(img.naturalHeight * scale);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const code = await decode(detector, canvas);
      if (code) return code;
    }
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
}

// ---------------------------------------------------------------------------
// Caméra en direct
// ---------------------------------------------------------------------------
export function createCamera({ video, frame, onCode, onState }) {
  let state = "idle"; // idle | starting | scanning | error
  let stream = null;
  let detector = null;
  let timer = null;
  let wanted = false;
  let handled = false;
  let tick = 0;
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { willReadFrequently: true });

  const set = (s, detail = {}) => {
    state = s;
    onState?.(s, detail);
  };

  function release() {
    clearTimeout(timer);
    timer = null;
    if (stream) stream.getTracks().forEach((t) => t.stop());
    stream = null;
    video.srcObject = null;
  }

  function track() {
    return stream ? stream.getVideoTracks()[0] : null;
  }

  function torchSupported() {
    const t = track();
    try {
      return !!(t && t.getCapabilities && t.getCapabilities().torch);
    } catch {
      return false;
    }
  }

  // Zone de la vidéo réellement visible sous le cadre (la vidéo est en object-fit: cover).
  function regions() {
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    const box = video.getBoundingClientRect();
    if (!vw || !vh || !box.width || !box.height) return [];
    const scale = Math.max(box.width / vw, box.height / vh); // écran px par px vidéo
    const visW = box.width / scale;
    const visH = box.height / scale;
    const offX = (vw - visW) / 2;
    const offY = (vh - visH) / 2;
    const visible = { x: offX, y: offY, w: visW, h: visH };
    const full = { x: 0, y: 0, w: vw, h: vh }; // image entière, y compris ce que l'écran rogne
    if (!frame) return [visible, visible, full];
    const f = frame.getBoundingClientRect();
    const framed = {
      x: offX + (f.left - box.left) / scale,
      y: offY + (f.top - box.top) / scale,
      w: f.width / scale,
      h: f.height / scale,
    };
    // Une marge autour du cadre : les gens ne visent pas parfaitement.
    const m = 0.15;
    const padded = {
      x: Math.max(0, framed.x - framed.w * m),
      y: Math.max(0, framed.y - framed.h * m),
      w: Math.min(vw, framed.w * (1 + 2 * m)),
      h: Math.min(vh, framed.h * (1 + 2 * m)),
    };
    return [padded, visible, full];
  }

  async function scanOnce() {
    timer = null;
    if (state !== "scanning" || handled) return;
    if (video.readyState >= 2) {
      const rs = regions();
      // Cycle de 4 : deux fois la zone du cadre, puis la partie visible, puis l'image entière.
      const step = tick % 4;
      const r = rs.length ? (step < 2 ? rs[0] : step === 2 ? rs[1] : rs[2]) : null;
      tick++;
      if (r) {
        const maxW = 1280;
        const s = Math.min(1, maxW / r.w);
        canvas.width = Math.max(1, Math.round(r.w * s));
        canvas.height = Math.max(1, Math.round(r.h * s));
        ctx.drawImage(video, r.x, r.y, r.w, r.h, 0, 0, canvas.width, canvas.height);
        try {
          const code = await decode(detector, canvas);
          if (code && !handled && state === "scanning") return found(code);
        } catch {
          /* image non décodable : on continue */
        }
      }
    }
    if (state === "scanning" && !handled) timer = setTimeout(scanOnce, 90);
  }

  function found(code) {
    handled = true;
    if (navigator.vibrate) navigator.vibrate(40);
    stop();
    onCode(code);
  }

  async function start() {
    wanted = true;
    if (state === "starting" || state === "scanning") return;
    handled = false;
    tick = 0;
    set("starting");

    if (!window.isSecureContext) return set("error", { kind: "https" });
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return set("error", { kind: "unsupported" });

    const detectorReady = getDetector(); // chargement en parallèle de l'ouverture caméra
    detectorReady.catch(() => {});

    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } },
      });
    } catch (err) {
      stream = null;
      const name = (err && err.name) || "";
      const kind =
        name === "NotAllowedError" || name === "SecurityError" ? "denied"
        : name === "NotFoundError" || name === "OverconstrainedError" ? "nocamera"
        : name === "NotReadableError" || name === "AbortError" ? "busy"
        : "camera";
      return set("error", { kind, message: name || String(err) });
    }
    if (!wanted) return release();

    video.setAttribute("playsinline", "");
    video.setAttribute("muted", "");
    video.muted = true;
    video.srcObject = stream;
    try {
      await video.play();
    } catch {
      /* lecture auto refusée : la vidéo démarrera au premier toucher, l'analyse fonctionne quand même */
    }

    try {
      detector = await detectorReady;
    } catch (err) {
      release();
      return set("error", { kind: "decoder", message: String((err && err.message) || err) });
    }
    if (!wanted) return release();

    set("scanning", { torch: torchSupported(), engine });
    timer = setTimeout(scanOnce, 250);
  }

  function stop() {
    wanted = false;
    release();
    if (state !== "idle") set("idle");
  }

  async function setTorch(on) {
    const t = track();
    if (!t) return false;
    try {
      await t.applyConstraints({ advanced: [{ torch: on }] });
      return on;
    } catch {
      return false;
    }
  }

  return {
    start,
    stop,
    setTorch,
    get state() {
      return state;
    },
  };
}
