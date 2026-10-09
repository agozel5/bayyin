// Lecture du texte d'une étiquette (liste d'ingrédients) par OCR, dans le navigateur.
// Tesseract.js est chargé à la demande depuis jsDelivr ; les modèles de langue
// sont téléchargés la première fois puis gardés en cache par le service worker.

const TESSERACT_URL = "https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js";
// Les listes d'ingrédients vendues en France sont en français : le français passe toujours en premier.
// (L'arabe n'est pas lu : mélangé au français, il fait apparaître des caractères parasites.)
const OCR_LANGS = { fr: "fra+eng", en: "eng+fra", tr: "fra+tur+eng", ar: "fra+eng" };
// Symboles qui n'apparaissent jamais dans une liste d'ingrédients : souvent du bruit (motifs, code-barres)
const BLACKLIST = "|~^¬§¶@#$<>{}\\_`=¦©™®«»•■□▪●";

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

/**
 * Image -> canvas prêt pour la lecture :
 * - seulement la zone encadrée par l'utilisateur (crop en fractions 0..1), pour ne pas lire le logo,
 *   le tableau nutritionnel ou le code-barres ;
 * - agrandie quand le texte est petit, réduite quand la photo est énorme ;
 * - niveaux de gris, contraste étiré, et couleurs inversées pour un texte clair sur fond foncé.
 */
async function preprocess(file, crop) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error("Image illisible"));
      i.src = url;
    });
    const c = crop || { x: 0, y: 0, w: 1, h: 1 };
    const sx = Math.round(c.x * img.naturalWidth), sy = Math.round(c.y * img.naturalHeight);
    const sw = Math.max(1, Math.round(c.w * img.naturalWidth)), sh = Math.max(1, Math.round(c.h * img.naturalHeight));
    const longest = Math.max(sw, sh);
    const scale = longest > 2400 ? 2400 / longest : longest < 1600 ? Math.min(3, 1600 / longest) : 1;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(sw * scale);
    canvas.height = Math.round(sh * scale);
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
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
    // Fond foncé (la valeur médiane est sombre) : texte clair, on inverse
    let median = 0;
    acc = 0;
    while (median < 255 && (acc += hist[median]) < total / 2) median++;
    const invert = median < 110;
    const range = Math.max(1, hi - lo);
    for (let i = 0; i < px.length; i += 4) {
      let v = Math.max(0, Math.min(255, ((px[i] - lo) * 255) / range));
      if (invert) v = 255 - v;
      px[i] = px[i + 1] = px[i + 2] = v;
    }
    ctx.putImageData(data, 0, 0);
    return canvas;
  } finally {
    URL.revokeObjectURL(url);
  }
}

// Corrections sûres des confusions classiques de l'OCR dans les additifs : « E33O » -> « E330 », « El20 » -> « E120 »
export function fixAdditiveCodes(s) {
  return s.replace(/\b[EÉ]\s?-?([0-9OoIlS]{3,4})([a-f]?)\b/g, (m, d, x) => {
    if (!/\d/.test(d)) return m;
    const digits = d.replace(/[Oo]/g, "0").replace(/[Il]/g, "1").replace(/S/g, "5");
    return `E${digits}${x}`;
  });
}

// Ligne crédible : assez de lettres, pas trop de symboles, confiance suffisante
function goodLine(text, confidence) {
  const t = text.trim();
  if (t.length < 3) return false;
  const chars = t.replace(/\s/g, "");
  const letters = (chars.match(/\p{L}/gu) || []).length;
  const digits = (chars.match(/\d/g) || []).length;
  const odd = chars.length - letters - digits - (chars.match(/[.,;:()%'’\-*/+&!?"]/g) || []).length;
  if (letters / chars.length < 0.45) return false;
  if (odd / chars.length > 0.12) return false;
  if (confidence !== undefined && confidence < 45) return false;
  return true;
}

// Mot isolé sans lettre ni chiffre, ou fait de symboles : bruit
const junkWord = (w) => !/[\p{L}\d]/u.test(w) && !/^[.,;:()%*\-–—]+$/.test(w);

/**
 * Lignes lues -> texte propre. lines : [{ text, confidence }] (confiance 0..100, facultative).
 * -> { text, confidence } : confiance moyenne des lignes gardées (pondérée par leur longueur).
 */
export function cleanOcrLines(lines) {
  const kept = lines.filter((l) => goodLine(l.text || "", l.confidence));
  // Mots très courts lus avec peu de confiance (bord du cadre, motif) : retirés
  const wordsOf = (l) => (Array.isArray(l.words) && l.words.length
    ? l.words.filter((w) => !(w.confidence < 40 && String(w.text).length <= 3)).map((w) => String(w.text))
    : l.text.trim().split(/\s+/));
  const text = kept.map((l) => wordsOf(l).filter((w) => w && !junkWord(w)).join(" ")).join("\n");
  const len = kept.reduce((n, l) => n + l.text.length, 0);
  const conf = len ? kept.reduce((n, l) => n + (l.confidence ?? 80) * l.text.length, 0) / len : 0;
  return { text: fixAdditiveCodes(cleanOcrText(text)), confidence: Math.round(conf) };
}

// Nettoie le texte brut : césures en fin de ligne, retours à la ligne, espaces.
export function cleanOcrText(text) {
  let s = String(text || "")
    .replace(/-\s*\n\s*/g, "")
    .replace(/\s*\n+\s*/g, " ")
    .replace(/\s+([,.;:)])/g, (m, p) => (p === ":" ? " :" : p))
    .replace(/\(\s+/g, "(")
    .replace(/\s{2,}/g, " ")
    .trim();
  // On garde à partir du mot « ingrédients » s'il apparaît (le reste est souvent du marketing).
  const m = s.match(/(ingr[ée]dients?|ingredients?|i̇çindekiler|içindekiler|icindekiler|المكونات|مكونات)\s*[:：]?\s*/i);
  if (m && m.index < s.length * 0.6) s = s.slice(m.index + m[0].length);
  return s;
}

// Lignes et confiances d'un résultat Tesseract.js (selon la version : lines, ou blocks > paragraphs > lines)
function linesOf(data) {
  if (Array.isArray(data.lines) && data.lines.length) return data.lines;
  const out = [];
  for (const b of data.blocks || []) for (const p of b.paragraphs || []) for (const l of p.lines || []) out.push(l);
  if (out.length) return out;
  return String(data.text || "").split("\n").map((text) => ({ text }));
}

/**
 * Lit le texte d'une photo. crop : zone à lire (fractions de l'image). onProgress(0..100).
 * -> { text, confidence }
 */
export async function readIngredients(file, { lang = "fr", crop = null, onProgress } = {}) {
  const [Tesseract, canvas] = await Promise.all([loadTesseract(), preprocess(file, crop)]);
  const worker = await Tesseract.createWorker(OCR_LANGS[lang] || OCR_LANGS.fr, 1, {
    logger: (m) => {
      if (m && m.status === "recognizing text" && onProgress) onProgress(Math.round((m.progress || 0) * 100));
    },
  });
  try {
    if (worker.setParameters) {
      await worker.setParameters({
        // Zone encadrée : un bloc de texte ; photo entière : mise en page automatique
        tessedit_pageseg_mode: crop ? "6" : "3",
        tessedit_char_blacklist: BLACKLIST,
        preserve_interword_spaces: "1",
      });
    }
    const { data } = await worker.recognize(canvas, {}, { text: true, blocks: true });
    return cleanOcrLines(linesOf(data || {}));
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
