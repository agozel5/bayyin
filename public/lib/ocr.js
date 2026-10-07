// Lecture du texte d'une étiquette (liste d'ingrédients) par OCR, dans le navigateur.
// Tesseract.js est chargé à la demande depuis jsDelivr ; les modèles de langue
// sont téléchargés la première fois puis gardés en cache par le service worker.

const TESSERACT_URL = "https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js";
const OCR_LANGS = { fr: "fra+eng", en: "eng+fra", tr: "tur+eng", ar: "ara+eng" };

let loading = null;
function loadTesseract() {
  if (window.Tesseract) return Promise.resolve(window.Tesseract);
  if (!loading) {
    loading = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = TESSERACT_URL;
      s.async = true;
      s.crossOrigin = "anonymous";
      s.onload = () => (window.Tesseract ? resolve(window.Tesseract) : reject(new Error("Tesseract absent")));
      s.onerror = () => {
        loading = null;
        reject(new Error("Chargement de Tesseract impossible"));
      };
      document.head.appendChild(s);
    });
  }
  return loading;
}

// Image -> canvas en niveaux de gris, contraste étiré, taille adaptée à l'OCR.
async function preprocess(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error("Image illisible"));
      i.src = url;
    });
    const longest = Math.max(img.naturalWidth, img.naturalHeight);
    const scale = longest > 2200 ? 2200 / longest : longest < 1000 ? 1000 / longest : 1;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const px = data.data;
    // Niveaux de gris + histogramme pour étirer le contraste (1 % - 99 %)
    const hist = new Uint32Array(256);
    for (let i = 0; i < px.length; i += 4) {
      const g = (px[i] * 299 + px[i + 1] * 587 + px[i + 2] * 114) / 1000;
      px[i] = px[i + 1] = px[i + 2] = g;
      hist[g | 0]++;
    }
    const total = px.length / 4;
    let lo = 0, hi = 255, acc = 0;
    while (lo < 255 && (acc += hist[lo]) < total * 0.01) lo++;
    acc = 0;
    while (hi > 0 && (acc += hist[hi]) < total * 0.01) hi--;
    const range = Math.max(1, hi - lo);
    for (let i = 0; i < px.length; i += 4) {
      const v = Math.max(0, Math.min(255, ((px[i] - lo) * 255) / range));
      px[i] = px[i + 1] = px[i + 2] = v;
    }
    ctx.putImageData(data, 0, 0);
    return canvas;
  } finally {
    URL.revokeObjectURL(url);
  }
}

// Nettoie le texte brut : césures en fin de ligne, retours à la ligne, espaces.
export function cleanOcrText(text) {
  let s = String(text || "")
    .replace(/-\s*\n\s*/g, "")
    .replace(/\s*\n+\s*/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
  // On garde à partir du mot « ingrédients » s'il apparaît (le reste est souvent du marketing).
  const m = s.match(/(ingr[ée]dients?|ingredients?|i̇çindekiler|içindekiler|icindekiler|المكونات|مكونات)\s*[:：]?\s*/i);
  if (m && m.index < s.length * 0.6) s = s.slice(m.index + m[0].length);
  return s;
}

// Lit le texte d'une photo. onProgress(0..100) pendant la reconnaissance.
export async function readIngredients(file, { lang = "fr", onProgress } = {}) {
  const [Tesseract, canvas] = await Promise.all([loadTesseract(), preprocess(file)]);
  const worker = await Tesseract.createWorker(OCR_LANGS[lang] || OCR_LANGS.fr, 1, {
    logger: (m) => {
      if (m && m.status === "recognizing text" && onProgress) onProgress(Math.round((m.progress || 0) * 100));
    },
  });
  try {
    const { data } = await worker.recognize(canvas);
    return cleanOcrText(data && data.text);
  } finally {
    worker.terminate().catch(() => {});
  }
}

// Codes E repérés dans un texte libre -> tags au format Open Food Facts.
export function additivesFromText(text) {
  const tags = new Set();
  const norm = String(text || "").toLowerCase().replace(/\s+/g, " ");
  for (const m of norm.matchAll(/\be\s?-?(\d{3,4}[a-f]?)\b/g)) tags.add("en:e" + m[1]);
  return [...tags];
}
