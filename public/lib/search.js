// Recherche par nom : tri par pertinence et recherche multilingue.
//
// Open Food Facts renvoie parfois des produits qui ne correspondent qu'à un mot des ingrédients
// ou d'une autre langue. On recalcule donc une note de pertinence à partir du nom, de la marque
// et des catégories, et on écarte ce qui ne correspond pas à la recherche.
//
// La base est surtout remplie en français : une recherche faite en arabe, en turc ou en anglais
// est aussi lancée avec les mots français correspondants (« حليب » → « lait »).

/** Texte comparable : minuscules, sans accents ni signes, arabe et turc simplifiés */
export function normalize(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/ı/g, "i").replace(/ß/g, "ss").replace(/œ/g, "oe").replace(/æ/g, "ae")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[ً-ٰٟـ]/g, "") // voyelles et tatwil arabes
    .replace(/[أإآٱ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي").replace(/ؤ/g, "و").replace(/ئ/g, "ي")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

const STOP = new Set([
  "de", "du", "des", "la", "le", "les", "l", "d", "au", "aux", "a", "et", "en", "un", "une", "pour", "avec",
  "the", "of", "and", "with", "for", "ve", "ile", "icin", "bir", "و", "في", "من", "مع",
]);

// L'article arabe « ال » (et « بال », « وال ») est collé au mot
const stripAr = (w) => (/^[؀-ۿ]/.test(w) && w.length > 4 ? w.replace(/^(وال|بال|لل|ال)/, "") : w);

export function tokens(s) {
  return normalize(s).split(" ").filter((w) => w && !STOP.has(w)).map(stripAr);
}

// Distance d'édition limitée à 1 (fautes de frappe : « nutela » ≈ « nutella »)
function near(a, b) {
  if (a === b) return true;
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0, j = 0, diff = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue; }
    if (++diff > 1) return false;
    if (a.length > b.length) i++;
    else if (b.length > a.length) j++;
    else { i++; j++; }
  }
  return diff + (a.length - i) + (b.length - j) <= 1;
}

function wordMatch(tok, words) {
  for (const w of words) {
    if (w.startsWith(tok)) return true;
    // faute de frappe : mots assez longs, même première lettre
    if (tok.length >= 5 && w[0] === tok[0] && near(tok, w)) return true;
  }
  return false;
}

// Champs utiles d'un produit, qu'il vienne brut d'Open Food Facts ou déjà mis en forme par l'app
function fieldsOf(p) {
  const names = p.names
    ? Object.values(p.names)
    : [p.product_name, p.product_name_fr, p.product_name_en, p.product_name_ar, p.product_name_tr, p.generic_name];
  const brand = p.brands || p.brand || "";
  const cats = (p.categories_tags || p.categories || []).map((c) => String(c).replace(/^[a-z]{2}:/, "").replace(/-/g, " "));
  return {
    name: names.filter(Boolean).join(" "),
    brand: Array.isArray(brand) ? brand.join(" ") : String(brand),
    cats: cats.join(" "),
    france: (p.countries_tags || []).includes("en:france"),
  };
}

const wordsOf = (s) => tokens(s);

/**
 * Pertinence d'un produit pour une recherche (0 = aucun rapport).
 * Chaque mot cherché trouvé dans le nom ou la marque compte 1, dans les catégories 0,5.
 */
export function relevance(product, query) {
  const q = Array.isArray(query) ? query : tokens(query);
  if (!q.length) return 0;
  const f = fieldsOf(product);
  const nameW = wordsOf(f.name), brandW = wordsOf(f.brand), catW = wordsOf(f.cats);
  let sum = 0;
  for (const tok of q) {
    if (wordMatch(tok, nameW) || wordMatch(tok, brandW)) sum += 1;
    else if (wordMatch(tok, catW)) sum += 0.5;
  }
  let score = sum / q.length;
  if (score && q.length > 1 && normalize(f.name).includes(q.join(" "))) score += 0.3; // expression exacte
  if (score && f.france) score += 0.1; // vendu en France
  return Math.round(score * 100) / 100;
}

/**
 * Trie une liste par pertinence, en gardant l'ordre d'Open Food Facts (popularité) à pertinence égale,
 * et écarte les produits sans rapport. queries : une ou plusieurs formulations de la recherche.
 */
export function rankByRelevance(list, queries) {
  const qs = (Array.isArray(queries) ? queries : [queries]).map((q) => (Array.isArray(q) ? q : tokens(q))).filter((q) => q.length);
  // Un mot cherché : il doit être trouvé (au moins dans les catégories). Plusieurs mots : la majorité.
  const keep = (q, s) => (s >= (q.length > 1 ? 0.6 : 0.5) ? s : 0);
  return list
    .map((p, i) => ({ p, i, s: Math.max(0, ...qs.map((q) => keep(q, relevance(p, q)))) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => Math.round(b.s * 10) - Math.round(a.s * 10) || a.i - b.i)
    .map((x) => x.p);
}

// ---------------------------------------------------------------------------
// Lexique des produits courants : le premier mot de chaque langue est la forme principale.
// ---------------------------------------------------------------------------
export const LEXICON = [
  { fr: ["lait"], en: ["milk"], ar: ["حليب", "لبن"], tr: ["süt"] },
  { fr: ["chocolat"], en: ["chocolate"], ar: ["شوكولاتة", "شوكولاته", "شيكولاتة", "شكولاتة"], tr: ["çikolata"] },
  { fr: ["poulet"], en: ["chicken"], ar: ["دجاج", "فراخ"], tr: ["tavuk"] },
  { fr: ["dinde"], en: ["turkey"], ar: ["ديك رومي"], tr: ["hindi"] },
  { fr: ["boeuf"], en: ["beef"], ar: ["لحم بقر", "بقر"], tr: ["dana", "sığır"] },
  { fr: ["agneau"], en: ["lamb"], ar: ["خروف", "لحم غنم"], tr: ["kuzu"] },
  { fr: ["viande"], en: ["meat"], ar: ["لحم", "لحوم"], tr: ["et"] },
  { fr: ["saucisse"], en: ["sausage"], ar: ["نقانق", "سجق"], tr: ["sosis", "sucuk"] },
  { fr: ["merguez"], en: ["merguez"], ar: ["مرقاز", "مركاز"], tr: ["merguez"] },
  { fr: ["poisson"], en: ["fish"], ar: ["سمك"], tr: ["balık"] },
  { fr: ["thon"], en: ["tuna"], ar: ["تونة", "تونه"], tr: ["ton balığı"] },
  { fr: ["sardines"], en: ["sardines"], ar: ["سردين"], tr: ["sardalya"] },
  { fr: ["fromage"], en: ["cheese"], ar: ["جبن", "جبنة", "جبنه"], tr: ["peynir"] },
  { fr: ["yaourt"], en: ["yogurt", "yoghurt"], ar: ["زبادي", "ياغورت", "روب"], tr: ["yoğurt"] },
  { fr: ["beurre"], en: ["butter"], ar: ["زبدة", "زبده"], tr: ["tereyağı"] },
  { fr: ["oeufs"], en: ["eggs", "egg"], ar: ["بيض"], tr: ["yumurta"] },
  { fr: ["biscuits"], en: ["biscuits", "cookies"], ar: ["بسكويت"], tr: ["bisküvi"] },
  { fr: ["gâteau"], en: ["cake"], ar: ["كعك", "كيك", "كعكة"], tr: ["kek", "pasta"] },
  { fr: ["pain"], en: ["bread"], ar: ["خبز"], tr: ["ekmek"] },
  { fr: ["farine"], en: ["flour"], ar: ["دقيق", "طحين"], tr: ["un"] },
  { fr: ["semoule"], en: ["semolina"], ar: ["سميد", "سميدة"], tr: ["irmik"] },
  { fr: ["couscous"], en: ["couscous"], ar: ["كسكس", "كسكسي"], tr: ["kuskus"] },
  { fr: ["riz"], en: ["rice"], ar: ["أرز", "رز"], tr: ["pirinç"] },
  { fr: ["pâtes"], en: ["pasta"], ar: ["معكرونة", "مكرونة"], tr: ["makarna"] },
  { fr: ["lentilles"], en: ["lentils"], ar: ["عدس"], tr: ["mercimek"] },
  { fr: ["pois chiches"], en: ["chickpeas"], ar: ["حمص"], tr: ["nohut"] },
  { fr: ["jus"], en: ["juice"], ar: ["عصير"], tr: ["meyve suyu", "suyu"] },
  { fr: ["eau"], en: ["water"], ar: ["ماء", "مياه"], tr: ["su"] },
  { fr: ["boisson"], en: ["drink", "beverage"], ar: ["مشروب"], tr: ["içecek"] },
  { fr: ["café"], en: ["coffee"], ar: ["قهوة"], tr: ["kahve"] },
  { fr: ["thé"], en: ["tea"], ar: ["شاي"], tr: ["çay"] },
  { fr: ["sucre"], en: ["sugar"], ar: ["سكر"], tr: ["şeker"] },
  { fr: ["sel"], en: ["salt"], ar: ["ملح"], tr: ["tuz"] },
  { fr: ["huile"], en: ["oil"], ar: ["زيت"], tr: ["yağ"] },
  { fr: ["huile d'olive"], en: ["olive oil"], ar: ["زيت زيتون", "زيت الزيتون"], tr: ["zeytinyağı"] },
  { fr: ["olives"], en: ["olives"], ar: ["زيتون"], tr: ["zeytin"] },
  { fr: ["vinaigre"], en: ["vinegar"], ar: ["خل"], tr: ["sirke"] },
  { fr: ["miel"], en: ["honey"], ar: ["عسل"], tr: ["bal"] },
  { fr: ["confiture"], en: ["jam"], ar: ["مربى", "مربي"], tr: ["reçel"] },
  { fr: ["dattes"], en: ["dates"], ar: ["تمر", "تمور"], tr: ["hurma"] },
  { fr: ["amandes"], en: ["almonds"], ar: ["لوز"], tr: ["badem"] },
  { fr: ["noisettes"], en: ["hazelnuts"], ar: ["بندق"], tr: ["fındık"] },
  { fr: ["pistaches"], en: ["pistachios"], ar: ["فستق"], tr: ["antep fıstığı"] },
  { fr: ["cacahuètes"], en: ["peanuts"], ar: ["فول سوداني"], tr: ["yer fıstığı"] },
  { fr: ["bonbons"], en: ["candy", "sweets"], ar: ["حلوى", "حلويات"], tr: ["şekerleme"] },
  { fr: ["glace"], en: ["ice cream"], ar: ["آيس كريم", "بوظة", "مثلجات"], tr: ["dondurma"] },
  { fr: ["chips"], en: ["crisps", "chips"], ar: ["شيبس", "رقائق"], tr: ["cips"] },
  { fr: ["céréales"], en: ["cereals", "cereal"], ar: ["حبوب الإفطار", "كورن فليكس"], tr: ["mısır gevreği", "tahıl"] },
  { fr: ["soupe"], en: ["soup"], ar: ["شوربة", "شوربه"], tr: ["çorba"] },
  { fr: ["épices"], en: ["spices"], ar: ["بهارات", "توابل"], tr: ["baharat"] },
  { fr: ["tomate"], en: ["tomato"], ar: ["طماطم", "بندورة"], tr: ["domates"] },
  { fr: ["mayonnaise"], en: ["mayonnaise"], ar: ["مايونيز"], tr: ["mayonez"] },
  { fr: ["moutarde"], en: ["mustard"], ar: ["خردل", "مسطردة"], tr: ["hardal"] },
  { fr: ["harissa"], en: ["harissa"], ar: ["هريسة"], tr: ["harissa"] },
  { fr: ["levure"], en: ["yeast"], ar: ["خميرة"], tr: ["maya"] },
  { fr: ["gélatine"], en: ["gelatin", "gelatine"], ar: ["جيلاتين"], tr: ["jelatin"] },
  { fr: ["bébé"], en: ["baby"], ar: ["رضع", "أطفال"], tr: ["bebek"] },
  { fr: ["sans sucre"], en: ["sugar free"], ar: ["بدون سكر"], tr: ["şekersiz"] },
  { fr: ["savon"], en: ["soap"], ar: ["صابون"], tr: ["sabun"] },
  { fr: ["shampooing"], en: ["shampoo"], ar: ["شامبو"], tr: ["şampuan"] },
  { fr: ["gel douche"], en: ["shower gel"], ar: ["جل الاستحمام", "شاور جل"], tr: ["duş jeli"] },
  { fr: ["dentifrice"], en: ["toothpaste"], ar: ["معجون أسنان", "معجون الأسنان"], tr: ["diş macunu"] },
  { fr: ["déodorant"], en: ["deodorant"], ar: ["مزيل العرق", "مزيل عرق"], tr: ["deodorant"] },
  { fr: ["parfum"], en: ["perfume"], ar: ["عطر"], tr: ["parfüm"] },
  { fr: ["crème"], en: ["cream"], ar: ["كريم"], tr: ["krem"] },
  { fr: ["rouge à lèvres"], en: ["lipstick"], ar: ["أحمر شفاه", "احمر الشفاه"], tr: ["ruj"] },
];

// Index : forme normalisée (une ou plusieurs mots) -> entrée du lexique, par langue
const INDEX = { fr: new Map(), en: new Map(), ar: new Map(), tr: new Map() };
for (const e of LEXICON) for (const lang of Object.keys(INDEX)) for (const w of e[lang] || []) INDEX[lang].set(tokens(w).join(" "), e);

// Langue probable d'une recherche : l'écriture arabe et les lettres turques se reconnaissent seules
export function guessLang(q, uiLang = "fr") {
  if (/[؀-ۿ]/.test(q)) return "ar";
  if (/[ğışİĞŞ]/.test(q)) return "tr";
  return uiLang;
}

/**
 * Formulation de la recherche dans une autre langue (par défaut le français, la langue de la base
 * pour les produits vendus en France). Les mots inconnus (marques, noms propres) sont gardés.
 * -> null si rien n'a été traduit.
 */
export function translateQuery(q, uiLang = "fr", target = "fr") {
  const toks = tokens(q);
  if (!toks.length) return null;
  // Langues essayées : celle de la recherche, celle de l'app, puis l'anglais (l'arabe et le turc
  // seulement si la recherche ou l'app est dans cette langue : « su » ou « bal » sont aussi des mots français)
  const langs = [...new Set([guessLang(q, uiLang), uiLang, "en", "tr"])].filter((l) => l !== target && INDEX[l]);
  const weakTr = guessLang(q, uiLang) !== "tr" && uiLang !== "tr"; // turc essayé en dernier : mots courts écartés
  for (const lang of langs) {
    const out = [];
    let changed = false;
    for (let i = 0; i < toks.length; ) {
      let hit = null;
      for (let n = Math.min(3, toks.length - i); n >= 1 && !hit; n--) {
        const key = toks.slice(i, i + n).join(" ");
        const e = INDEX[lang].get(key);
        if (e && !(lang === "tr" && weakTr && (key.length < 3 || key === "bal" || key === "pasta"))) hit = { e, n };
      }
      if (hit) {
        out.push(hit.e[target][0]);
        changed = true;
        i += hit.n;
      } else {
        out.push(toks[i]);
        i++;
      }
    }
    if (changed && normalize(out.join(" ")) !== normalize(q)) return out.join(" ");
  }
  return null;
}
