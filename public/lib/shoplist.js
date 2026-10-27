// Liste de courses : ce qu'on veut acheter (« biscuits », « yaourts »… ou un produit précis),
// des idées halal pour chaque ligne tirées des classements, et la ligne cochée toute seule
// quand on scanne en magasin le produit qui y répond. Tout reste sur le téléphone.

export const LIST_KEY = "bayyin_shoplist";

const norm = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
  .replace(/ı/g, "i").replace(/œ/g, "oe").replace(/[^\p{L}\p{N}]+/gu, " ").trim();

// Mots qui renvoient à un rayon des classements (français, anglais, turc, arabe).
// Les plus précis d'abord : « biscuits au chocolat » avant « biscuits », « après-shampoing » avant « shampoing ».
const WORDS = [
  ["choco_biscuits", ["biscuit au chocolat", "biscuits au chocolat", "biscuit chocolat", "cookie", "chocolate biscuit", "cikolatali biskuvi"]],
  ["cereal_bars", ["barre de cereales", "barres de cereales", "barre cereale", "cereal bar", "tahil bar"]],
  ["breakfast_cereals", ["cereales", "cereale", "corn flakes", "cereal", "misir gevregi", "حبوب"]],
  ["mueslis", ["muesli", "granola"]],
  ["spreads", ["pate a tartiner", "nutella", "spread", "surulebilir"]],
  ["chocolates", ["chocolat", "tablette", "chocolate", "cikolata", "شوكولات"]],
  ["biscuits", ["biscuit", "gateau sec", "gateaux", "sable", "petit beurre", "biskuvi", "بسكويت"]],
  ["candies", ["bonbon", "haribo", "candy", "sweets", "gummies", "sekerleme", "حلوى", "حلويات"]],
  ["jams", ["confiture", "jam", "recel", "مربى"]],
  ["yogurts", ["yaourt", "yogourt", "yogurt", "yoghurt", "زبادي", "لبن"]],
  ["desserts", ["creme dessert", "dessert", "flan", "mousse au chocolat", "puding"]],
  ["cheeses", ["fromage", "cheese", "peynir", "جبن"]],
  ["ice_creams", ["glace", "ice cream", "dondurma", "ايس كريم", "بوظة"]],
  ["crisps", ["chips", "crisps", "cips", "رقائق"]],
  ["sodas", ["soda", "coca", "cola", "limonade", "boisson gazeuse", "gazoz", "مشروب غازي"]],
  ["juices", ["jus", "juice", "meyve suyu", "عصير"]],
  ["breads", ["pain", "baguette", "brioche", "bread", "ekmek", "خبز"]],
  ["pizzas", ["pizza", "بيتزا"]],
  ["sausages", ["saucisse", "merguez", "charcuterie", "jambon de dinde", "jambon", "sausage", "sucuk", "sosis", "نقانق"]],
  ["sauces", ["sauce", "ketchup", "mayonnaise", "moutarde", "sos", "صلصة"]],
  ["meals", ["plat prepare", "plats prepares", "ready meal", "hazir yemek"]],
  ["conditioners", ["apres shampoing", "apres shampooing", "conditioner", "sac kremi", "بلسم"]],
  ["shampoos", ["shampoing", "shampooing", "shampoo", "sampuan", "شامبو"]],
  ["toothpastes", ["dentifrice", "toothpaste", "dis macunu", "معجون"]],
  ["deodorants", ["deodorant", "deo", "مزيل العرق"]],
  ["shower_gels", ["gel douche", "shower gel", "dus jeli", "جل الاستحمام"]],
  ["sunscreens", ["creme solaire", "sunscreen", "gunes kremi", "واقي الشمس"]],
  ["hand_creams", ["creme mains", "creme pour les mains", "hand cream", "el kremi"]],
  ["face_creams", ["creme visage", "face cream", "yuz kremi"]],
  ["body_creams", ["creme corps", "lait corps", "body lotion", "vucut losyonu", "لوشن"]],
  ["cleansers", ["demaquillant", "eau micellaire", "micellar", "cleanser"]],
  ["lip_balms", ["baume a levres", "lip balm", "dudak"]],
  ["lipsticks", ["rouge a levres", "lipstick", "ruj", "احمر الشفاه"]],
  ["mascaras", ["mascara", "maskara"]],
  ["nail_polishes", ["vernis", "nail polish", "oje"]],
  ["eye_makeup", ["eyeliner", "fard a paupieres", "eyeshadow"]],
  ["complexion", ["fond de teint", "foundation", "blush", "fondoten"]],
].map(([id, words]) => [id, words.map(norm)]);

// Mot entier, avec son pluriel (« biscuit » trouve « biscuits », mais « jam » ne trouve pas « jambon »)
const reCache = new Map();
const wordRe = (w) => {
  if (!reCache.has(w)) reCache.set(w, new RegExp(` ${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(s|x|es)? `));
  return reCache.get(w);
};

/** Rayon des classements qui correspond à une ligne (« Biscuits » -> "biscuits"), ou null. */
export function categoryOf(text) {
  const t = ` ${norm(text)} `;
  if (!t.trim()) return null;
  for (const [id, words] of WORDS) {
    // Début de mot : « biscuits » trouve « biscuit » ; l'arabe n'a pas d'espaces fiables, on cherche tel quel
    if (words.some((w) => (/[؀-ۿ]/.test(w) ? t.includes(w) : wordRe(w).test(t)))) return id;
  }
  return null;
}

let seq = 0;
const newId = () => `${Date.now().toString(36)}${(seq++).toString(36)}`;

/** Ligne libre (« biscuits ») */
export function textItem(text) {
  const clean = String(text || "").trim().replace(/\s+/g, " ").slice(0, 80);
  return clean ? { id: newId(), text: clean, cat: categoryOf(clean), done: false, at: Date.now() } : null;
}
/** Ligne pour un produit précis (ajouté depuis sa fiche, ou choisi parmi les idées) */
export function productItem(p, base = {}) {
  return {
    ...base,
    id: base.id || newId(),
    text: base.text || p.name || p.code,
    code: p.code,
    name: p.name || "",
    brand: p.brand || "",
    image: p.image || "",
    cat: base.cat || null,
    done: !!base.done,
    at: base.at || Date.now(),
  };
}

/**
 * Un produit vient d'être scanné : la ligne qui y répond est cochée.
 * D'abord le produit exact ; sinon une ligne libre du même rayon (seulement si le produit convient : ok).
 * -> la ligne cochée, ou null
 */
export function tickFor(items, product, { ok = true, catsOf = () => [] } = {}) {
  if (!product) return null;
  const open = items.filter((x) => !x.done);
  let hit = open.find((x) => x.code && x.code === product.code);
  if (!hit && ok) {
    const cats = new Set(catsOf(product));
    hit = open.find((x) => !x.code && x.cat && cats.has(x.cat));
  }
  if (hit) hit.done = true;
  return hit || null;
}

/** Texte à partager (WhatsApp, SMS…) */
export function shareText(items, title, label = (x) => x.name || x.text) {
  const open = items.filter((x) => !x.done), done = items.filter((x) => x.done);
  return [title, ...open.map((x) => `☐ ${label(x)}${x.brand ? ` (${x.brand})` : ""}`), ...done.map((x) => `☑ ${label(x)}`)].join("\n");
}
