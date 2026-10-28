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

// ---------------------------------------------------------------------------
// Traitement de l'image (fonctions pures, testées hors navigateur)
// ---------------------------------------------------------------------------

/** RVBA -> niveaux de gris, contraste étiré (1 % - 99 %), et inversé quand le fond est foncé. */
export function grayStretch(px) {
  const n = px.length / 4;
  const gray = new Uint8ClampedArray(n);
  const hist = new Uint32Array(256);
  for (let i = 0, j = 0; i < px.length; i += 4, j++) {
    const g = (px[i] * 299 + px[i + 1] * 587 + px[i + 2] * 114) / 1000;
    gray[j] = g;
    hist[gray[j]]++;
  }
  let lo = 0, hi = 255, acc = 0;
  while (lo < 255 && (acc += hist[lo]) < n * 0.01) lo++;
  acc = 0;
  while (hi > 0 && (acc += hist[hi]) < n * 0.01) hi--;
  // Fond foncé (la valeur médiane est sombre) : texte clair, on inverse
  let median = 0;
  acc = 0;
  while (median < 255 && (acc += hist[median]) < n / 2) median++;
  const invert = median < 110;
  const range = Math.max(1, hi - lo);
  for (let j = 0; j < n; j++) {
    const v = Math.max(0, Math.min(255, ((gray[j] - lo) * 255) / range));
    gray[j] = invert ? 255 - v : v;
  }
  return gray;
}

/**
 * Seuillage local (méthode de Sauvola) : chaque point est comparé à son voisinage, et non à toute l'image.
 * Une ombre, un reflet ou un dégradé de l'emballage ne font plus disparaître le texte, comme le fait
 * le seuillage global de Tesseract. Entrée : niveaux de gris (texte foncé sur fond clair).
 */
export function binarize(gray, w, h, { k = 0.2, R = 128 } = {}) {
  const r = Math.max(7, Math.round(Math.min(w, h) / 40)); // demi-fenêtre : quelques hauteurs de lettre
  const W1 = w + 1;
  const sum = new Float64Array(W1 * (h + 1));
  const sq = new Float64Array(W1 * (h + 1));
  for (let y = 0; y < h; y++) {
    let rs = 0, rq = 0;
    for (let x = 0; x < w; x++) {
      const v = gray[y * w + x];
      rs += v; rq += v * v;
      sum[(y + 1) * W1 + x + 1] = sum[y * W1 + x + 1] + rs;
      sq[(y + 1) * W1 + x + 1] = sq[y * W1 + x + 1] + rq;
    }
  }
  const out = new Uint8ClampedArray(w * h);
  for (let y = 0; y < h; y++) {
    const y0 = Math.max(0, y - r), y1 = Math.min(h, y + r + 1);
    for (let x = 0; x < w; x++) {
      const x0 = Math.max(0, x - r), x1 = Math.min(w, x + r + 1);
      const a = (x1 - x0) * (y1 - y0);
      const s = sum[y1 * W1 + x1] - sum[y0 * W1 + x1] - sum[y1 * W1 + x0] + sum[y0 * W1 + x0];
      const q = sq[y1 * W1 + x1] - sq[y0 * W1 + x1] - sq[y1 * W1 + x0] + sq[y0 * W1 + x0];
      const m = s / a;
      const sd = Math.sqrt(Math.max(0, q / a - m * m));
      // Zone presque uniforme (fond, aplat de couleur) : blanc, sans bruit
      const t = sd < 6 ? -1 : m * (1 + k * (sd / R - 1));
      out[y * w + x] = gray[y * w + x] <= t ? 0 : 255;
    }
  }
  return out;
}

/**
 * Seuillage local qui choisit lui-même le sens du texte : du texte occupe une petite part de l'image.
 * Si le résultat est surtout noir, c'est que le texte était clair sur fond foncé (sac rouge, étagère blanche
 * à côté) : on inverse et on garde la version la plus claire.
 */
export function binarizeAuto(gray, w, h) {
  const darkShare = (b) => { let n = 0; for (let i = 0; i < b.length; i++) if (!b[i]) n++; return n / b.length; };
  const a = binarize(gray, w, h);
  const da = darkShare(a);
  if (da < 0.22) return a;
  const inv = new Uint8ClampedArray(gray.length);
  for (let i = 0; i < gray.length; i++) inv[i] = 255 - gray[i];
  const b = binarize(inv, w, h);
  return darkShare(b) < da ? b : a;
}

/** Taille de travail : agrandie quand le texte est petit, réduite quand la photo est énorme. */
export const workScale = (sw, sh) => {
  const longest = Math.max(sw, sh);
  return longest > 2400 ? 2400 / longest : longest < 1600 ? Math.min(3, 1600 / longest) : 1;
};

/**
 * Image -> canvas prêt pour la lecture : seulement la zone encadrée par l'utilisateur (crop en
 * fractions 0..1), à la bonne taille, en niveaux de gris contrastés ; mode « local » : seuillage local.
 */
async function preprocess(file, crop, mode = "local", rot = 0) {
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
    const scale = workScale(sw, sh);
    const dw = Math.round(sw * scale), dh = Math.round(sh * scale);
    // Liste imprimée sur le côté de l'emballage : on fait tourner l'image d'un quart de tour (ou plus)
    const side = rot === 90 || rot === 270;
    const canvas = document.createElement("canvas");
    canvas.width = side ? dh : dw;
    canvas.height = side ? dw : dh;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.imageSmoothingQuality = "high";
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((rot * Math.PI) / 180);
    ctx.drawImage(img, sx, sy, sw, sh, -dw / 2, -dh / 2, dw, dh);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let g = grayStretch(data.data);
    if (mode === "local") g = binarizeAuto(g, canvas.width, canvas.height);
    const px = data.data;
    for (let i = 0, j = 0; i < px.length; i += 4, j++) px[i] = px[i + 1] = px[i + 2] = g[j];
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

// ---------------------------------------------------------------------------
// Le texte lu ressemble-t-il à une liste d'ingrédients ? (sinon : photo à reprendre, pas de texte bizarre)
// ---------------------------------------------------------------------------
const LEXICON = new Set(`
ingredients ingredient composition contient peut traces trace origine
eau sucre sucres sel farine ble froment seigle orge avoine riz mais soja colza tournesol palme palmiste olive coco
huile huiles graisse graisses beurre creme lait laits lactose lactoserum fromage yaourt ferments lactiques oeuf oeufs
cacao chocolat noisette noisettes amande amandes arachide arachides noix sesame lupin moutarde celeri
amidon amidons modifie modifiee fecule sirop glucose fructose dextrose maltodextrine miel caramel
gelatine porc boeuf poulet dinde veau agneau viande viandes poisson saumon thon crevette
emulsifiant emulsifiants lecithine lecithines epaississant epaississants gelifiant gelifiants stabilisant stabilisants
conservateur conservateurs antioxydant antioxydants colorant colorants correcteur acidite acidifiant acidifiants
arome aromes naturel naturels naturelle naturelles artificiel vanille vanilline extrait extraits levure levures
poudre lever levain gluten fibres proteines proteine vegetale vegetales vegetal animale entier entiere ecreme ecremee
demi concentre concentree jus fruit fruits fraise fraises pomme pommes citron orange tomate tomates oignon ail epices
epice herbes poivre paprika curcuma cannelle gingembre persil basilic legumes carotte pomme terre pommes
sodium potassium calcium magnesium fer zinc vitamine vitamines carbonate carbonates bicarbonate phosphate phosphates
citrate citrates ascorbate acide acides lactique citrique ascorbique sorbique benzoate nitrite nitrate sulfite sulfites
carraghenanes carraghenane gomme guar xanthane pectine agar alginate cellulose glycerol mono diglycerides gras
alcool vin rhum biere vinaigre malt orge enzymes presure carmin cochenille shellac
sans avec dont total teneur minimum maximum issu issus issue
avoine epeautre sarrasin quinoa millet complete complet certifie certifiee durable morceaux morceau pepites eclats
pate matiere matieres sechee seche seches deshydrate deshydratee proportions proportion variables variable
karite mangue melasse noix coco datte dattes raisin raisins figue abricot banane cerise framboise myrtille
allergenes allergene contenir provenant autres coque coques consommer preference conserver endroit frais sec
recette nature cuit cuite fume fumee pasteurise pasteurisee sale salee sucre sucree cru crue bio biologique
water sugar salt flour wheat milk cream butter eggs egg oil palm sunflower rapeseed starch syrup cocoa chocolate
emulsifier emulsifiers lecithin lecithins flavouring flavourings flavoring natural colour color preservative
antioxidant stabiliser stabilizer thickener raising agent agents acid powder whole skimmed vegetable fat
yeast extract spices pork beef chicken gelatin gelatine glucose fructose dextrose contains may
su seker tuz un bugday sut tereyagi yag yumurta nisasta kakao aroma emulgator koruyucu renklendirici icindekiler
wasser zucker salz mehl weizen milch sahne butter eier pflanzliches fett starke kakao emulgator aroma zutaten
`.trim().split(/\s+/));
const fold = (s) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/œ/g, "oe").replace(/æ/g, "ae").replace(/ı/g, "i");
const known = (w) => {
  if (LEXICON.has(w)) return true;
  if (w.length > 4 && LEXICON.has(w.replace(/s$/, ""))) return true;
  if (/^e\d{3,4}[a-f]?$/.test(w)) return true;
  // Début de mot connu (« emulsifiant » coupé, « poudres »…)
  if (w.length >= 6) for (let n = w.length - 1; n >= 5; n--) if (LEXICON.has(w.slice(0, n))) return true;
  return false;
};
/**
 * Note de 0 à 1 : part des mots reconnus comme vocabulaire d'ingrédients (et codes E).
 * Un texte d'étiquette réel dépasse 0,4 ; du « bruit » d'image reste presque à 0.
 */
export function ocrQuality(text) {
  const words = fold(String(text || "")).split(/[^a-z0-9]+/).filter((w) => w.length >= 3 || /^e\d/.test(w));
  if (!words.length) return { score: 0, words: 0, hits: 0 };
  const hits = words.filter(known).length;
  return { score: Math.round((hits / words.length) * 100) / 100, words: words.length, hits };
}
// Seuils : au-dessus de GOOD, on ne fait pas de deuxième lecture ; en dessous de MIN, on ne montre pas le texte
export const OCR_GOOD = 0.45, OCR_MIN = 0.22;

// Lignes et confiances d'un résultat Tesseract.js (selon la version : lines, ou blocks > paragraphs > lines)
function linesOf(data) {
  if (Array.isArray(data.lines) && data.lines.length) return data.lines;
  const out = [];
  for (const b of data.blocks || []) for (const p of b.paragraphs || []) for (const l of p.lines || []) out.push(l);
  if (out.length) return out;
  return String(data.text || "").split("\n").map((text) => ({ text }));
}

// Essais successifs, du plus courant au plus rare : on s'arrête dès qu'une lecture ressemble à une liste
// d'ingrédients. Les quarts de tour ne sont tentés que si rien de lisible n'a été trouvé à l'endroit.
export const OCR_ATTEMPTS = [
  { mode: "local", rot: 0 },
  { mode: "gray", rot: 0 },
  { mode: "local", rot: 90 },
  { mode: "local", rot: 270 },
  { mode: "local", rot: 180 },
];
/** Faut-il tenter l'essai suivant ? */
export function needsAnotherTry(best, next) {
  if (!best) return true;
  if (best.quality >= OCR_GOOD) return false;
  if (next.rot && isReadable(best)) return false; // lisible à l'endroit : inutile de tourner l'image
  return true;
}
/** Lisible : une part suffisante de vocabulaire d'ingrédients, et au moins trois mots reconnus. */
export const isReadable = (r) => !!r && r.quality >= OCR_MIN && (r.hits ?? 0) >= 3;
/** Le meilleur de deux essais : la note de vocabulaire d'abord, puis la longueur du texte. */
export const betterRead = (a, b) => (!a || b.quality > a.quality || (b.quality === a.quality && b.text.length > a.text.length) ? b : a);

/**
 * Lit le texte d'une photo. crop : zone à lire (fractions de l'image). onProgress(0..100, essai).
 * -> { text, confidence, quality (0..1), readable } ; readable faux : ne pas montrer ce texte, faire reprendre la photo.
 */
export async function readIngredients(file, { lang = "fr", langs = null, crop = null, onProgress } = {}) {
  const Tesseract = await loadTesseract();
  let attempt = 0;
  const worker = await Tesseract.createWorker(langs || OCR_LANGS[lang] || OCR_LANGS.fr, 1, {
    logger: (m) => {
      if (m && m.status === "recognizing text" && onProgress) onProgress(Math.round((m.progress || 0) * 100), attempt);
    },
  });
  try {
    if (worker.setParameters) {
      await worker.setParameters({
        // Zone encadrée : un bloc de texte ; photo presque entière : mise en page automatique
        tessedit_pageseg_mode: crop && crop.w * crop.h < 0.85 ? "6" : "3",
        tessedit_char_blacklist: BLACKLIST,
        preserve_interword_spaces: "1",
      });
    }
    let best = null;
    for (const a of OCR_ATTEMPTS) {
      if (!needsAnotherTry(best, a)) break;
      const canvas = await preprocess(file, crop, a.mode, a.rot);
      const { data } = await worker.recognize(canvas, {}, { text: true, blocks: true });
      const r = cleanOcrLines(linesOf(data || {}));
      const q = ocrQuality(r.text);
      best = betterRead(best, { ...r, quality: q.score, words: q.words, hits: q.hits, rot: a.rot });
      attempt++;
    }
    return { ...best, readable: isReadable(best) };
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
