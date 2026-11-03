// Mode voyage : liste d'ingrédients écrite dans une autre langue (allemand, espagnol, italien,
// néerlandais, portugais, polonais, turc, anglais). Les mots qui comptent pour le verdict halal
// (porc, gélatine, alcool, présure, sang, viande…) et les allergènes courants sont traduits en
// français ; le texte traduit passe ensuite par les mêmes règles que les produits vendus en France.
import { normalize } from "./rules.js";

export const TRAVEL_LANGS = ["de", "es", "it", "nl", "pt", "pl", "tr", "en"];

// Mots fréquents des listes d'ingrédients, pour reconnaître la langue
const STOP = {
  de: ["zutaten", "und", "mit", "zucker", "kann", "spuren", "enthalt", "von", "aus", "weizenmehl", "salz", "wasser"],
  es: ["ingredientes", "con", "azucar", "puede", "contener", "trazas", "sal", "agua", "harina", "aceite", "leche", "y"],
  it: ["ingredienti", "zucchero", "puo", "contenere", "tracce", "sale", "acqua", "farina", "olio", "latte", "di", "e"],
  nl: ["ingredienten", "suiker", "kan", "sporen", "bevatten", "zout", "water", "tarwebloem", "en", "van", "melk", "olie"],
  pt: ["ingredientes", "acucar", "pode", "conter", "vestigios", "sal", "agua", "farinha", "oleo", "leite", "e", "de"],
  pl: ["skladniki", "cukier", "moze", "zawierac", "sol", "woda", "maka", "mleko", "olej", "i", "z"],
  tr: ["icindekiler", "seker", "tuz", "su", "un", "sut", "icerebilir", "eser", "miktarda", "ve", "yag"],
  en: ["ingredients", "sugar", "may", "contain", "traces", "salt", "water", "flour", "milk", "and", "oil", "of"],
  fr: ["ingredients", "sucre", "peut", "contenir", "traces", "sel", "eau", "farine", "lait", "et", "huile", "de"],
};

/** Langue la plus probable d'une liste d'ingrédients (code à deux lettres). */
const norm = (s) => normalize(s).replace(/ł/g, "l").replace(/ß/g, "ss");

export function detectLang(text) {
  const words = norm(text).split(/[^a-z]+/).filter(Boolean);
  const score = {};
  for (const [lang, list] of Object.entries(STOP)) {
    const set = new Set(list);
    // les mots courts (« e », « de », « y ») comptent moins : ils se retrouvent dans plusieurs langues
    score[lang] = words.reduce((n, w) => n + (set.has(w) ? (w.length <= 2 ? 0.3 : 1) : 0), 0);
  }
  const best = Object.entries(score).sort((a, b) => b[1] - a[1])[0];
  return best && best[1] >= 1 ? best[0] : "en";
}

// [motif (texte normalisé, sans accents), traduction française, nature]
// nature : "halal" (compte pour le verdict), "allergen" (profil), "word" (lecture plus facile)
// L'ordre compte : les formes précises (« gélatine de poisson », « vinaigre de vin ») passent avant les mots seuls.
const H = "halal", A = "allergen", W = "word";
const LEX = {
  de: [
    [/\bschwein\w*gelatine\b/, "gélatine de porc", H], [/\brind\w*gelatine\b/, "gélatine de bœuf", H], [/\bfischgelatine\b/, "gélatine de poisson", H],
    [/\bweinessig\b/, "vinaigre de vin", H], [/\bbranntweinessig\b/, "vinaigre d'alcool", W], [/\bweinstein\w*|\bweinsaeure\b|\bweinsaure\b/, "acide tartrique", W],
    [/\balkoholfrei\w*|\bohne alkohol\b/, "sans alcool", H],
    [/\bschweine?\w*|\bschwein\b/, "porc", H], [/\bspeck\b/, "lardons", H], [/\bschmalz\b/, "saindoux", H], [/\bschinken\b/, "jambon", H],
    [/\bblutorange\w*/, "orange sanguine", W], [/\bblut\w*/, "sang", H],
    [/\bwein\b|\bweine\b/, "vin", H], [/\bbier\b/, "bière", H], [/\blikoer\b|\blikor\b/, "liqueur", H], [/\bweinbrand\b/, "brandy", H],
    [/\bmikrobielles lab\b|\bmikrobielle[sn]? labaustauschstoff\b/, "présure microbienne", H], [/\blab\b/, "présure", H],
    [/\bechtes karmin\b|\bkarmin\b|\bkarminsaeure\b/, "carmin E120", H],
    [/\brindfleisch\b/, "viande de bœuf", H], [/\bhahnchen\w*|\bhuhn\w*|\bhuhnerfleisch\b/, "poulet", H], [/\bpute\b|\bputen\w*|\btruthahn\b/, "dinde", H],
    [/\bgeflugel\w*/, "volaille", H], [/\bfleisch\w*/, "viande", H], [/\bbruhe\b|\bbruehe\b/, "bouillon", H],
    [/\bgarnelen\b|\bkrabben\b/, "crevettes", H], [/\bmuscheln\b/, "moules", H],
    [/\bmilch\w*/, "lait", A], [/\beier\b|\bei\b|\bvollei\w*/, "œuf", A], [/\bweizen\w*/, "blé", A], [/\berdnuss\w*/, "arachide", A],
    [/\bhaselnuss\w*/, "noisette", A], [/\bmandel\w*/, "amande", A], [/\bsellerie\b/, "céleri", A], [/\bsenf\b/, "moutarde", A], [/\bsesam\b/, "sésame", A],
    [/\bzucker\b/, "sucre", W], [/\bsalz\b/, "sel", W], [/\bwasser\b/, "eau", W], [/\bmehl\b/, "farine", W], [/\bpflanzlich\w*/, "végétal", W], [/\bfett\b/, "graisse", W],
    [/\baroma\b/, "arôme", W], [/\bzutaten\b/, "ingrédients", W], [/\bkann spuren von\b/, "peut contenir des traces de", W],
  ],
  es: [
    [/\bgelatina de (cerdo|porcino)\b/, "gélatine de porc", H], [/\bgelatina de pescado\b/, "gélatine de poisson", H], [/\bgelatina (de )?(bovino|vacuno|bovina)\b/, "gélatine de bœuf", H],
    [/\bgelatina\b/, "gélatine", H], [/\bvinagre de vino\b/, "vinaigre de vin", H], [/\bsin alcohol\b/, "sans alcool", H],
    [/\bmanteca de cerdo\b/, "saindoux", H], [/\bcerdo\b|\bporcino\b|\bporcina\b/, "porc", H], [/\btocino\b/, "lard", H], [/\bpanceta\b/, "pancetta", H], [/\bjamon\b/, "jambon", H],
    [/\bsangre\b/, "sang", H], [/\bvino\b|\bvinos\b/, "vin", H], [/\bcerveza\b/, "bière", H], [/\bron\b/, "rhum", H], [/\blicor\b/, "liqueur", H],
    [/\bcuajo microbiano\b/, "présure microbienne", H], [/\bcuajo\b/, "présure", H], [/\bcarmin\b|\bcochinilla\b/, "carmin E120", H],
    [/\bpollo\b/, "poulet", H], [/\bpavo\b/, "dinde", H], [/\bternera\b|\bvacuno\b/, "viande de bœuf", H], [/\bcarne\b/, "viande", H], [/\bcaldo\b/, "bouillon", H],
    [/\bcamarones\b|\bgambas\b/, "crevettes", H], [/\bmariscos\b/, "fruits de mer", H],
    [/\bleche\b/, "lait", A], [/\bhuevos?\b/, "œuf", A], [/\btrigo\b/, "blé", A], [/\bcacahuetes?\b|\bmani\b/, "arachide", A], [/\bavellanas?\b/, "noisette", A], [/\balmendras?\b/, "amande", A], [/\bsoja\b/, "soja", A],
    [/\bazucar\b/, "sucre", W], [/\bsal\b/, "sel", W], [/\bagua\b/, "eau", W], [/\bharina\b/, "farine", W], [/\baceite\b/, "huile", W], [/\bingredientes\b/, "ingrédients", W],
  ],
  it: [
    [/\bgelatina (di )?(maiale|suina)\b/, "gélatine de porc", H], [/\bgelatina (di )?pesce\b/, "gélatine de poisson", H], [/\bgelatina (di )?(bovino|manzo|bovina)\b/, "gélatine de bœuf", H],
    [/\bgelatina\b/, "gélatine", H], [/\baceto di vino\b/, "vinaigre de vin", H], [/\bsenza alcool\b|\banalcolic\w*/, "sans alcool", H],
    [/\bmaiale\b|\bsuin[oa]\b/, "porc", H], [/\bstrutto\b/, "saindoux", H], [/\bprosciutto\b/, "jambon", H], [/\bguanciale\b|\blardo\b/, "lard de porc", H], [/\bpancetta\b/, "pancetta", H],
    [/\bsangue\b/, "sang", H], [/\bvino\b/, "vin", H], [/\bbirra\b/, "bière", H], [/\bliquore\b/, "liqueur", H],
    [/\bcaglio microbico\b|\bcaglio vegetale\b/, "présure microbienne", H], [/\bcaglio\b/, "présure", H], [/\bcarminio\b|\bcocciniglia\b/, "carmin E120", H],
    [/\bpollo\b/, "poulet", H], [/\btacchino\b/, "dinde", H], [/\bmanzo\b|\bbovino\b/, "viande de bœuf", H], [/\bcarne\b/, "viande", H], [/\bbrodo\b/, "bouillon", H],
    [/\bgamberi\w*/, "crevettes", H], [/\bfrutti di mare\b/, "fruits de mer", H],
    [/\blatte\b/, "lait", A], [/\buov[oa]\b/, "œuf", A], [/\bfrumento\b|\bgrano tenero\b/, "blé", A], [/\barachidi\b/, "arachide", A], [/\bnocciole\b/, "noisette", A], [/\bmandorle\b/, "amande", A], [/\bsoia\b/, "soja", A],
    [/\bzucchero\b/, "sucre", W], [/\bsale\b/, "sel", W], [/\bacqua\b/, "eau", W], [/\bfarina\b/, "farine", W], [/\bolio\b/, "huile", W], [/\bingredienti\b/, "ingrédients", W],
  ],
  nl: [
    [/\bvarkensgelatine\b/, "gélatine de porc", H], [/\brundergelatine\b/, "gélatine de bœuf", H], [/\bvisgelatine\b/, "gélatine de poisson", H],
    [/\bwijnazijn\b/, "vinaigre de vin", H], [/\balcoholvrij\w*/, "sans alcool", H],
    [/\bvarkens\w*|\bvarken\b/, "porc", H], [/\breuzel\b/, "saindoux", H], [/\bspek\b/, "lardons", H],
    [/\bbloed\b/, "sang", H], [/\bwijn\b/, "vin", H], [/\bbier\b/, "bière", H], [/\blikeur\b/, "liqueur", H],
    [/\bmicrobieel stremsel\b/, "présure microbienne", H], [/\bstremsel\b/, "présure", H], [/\bkarmijn\b|\bkarmijnzuur\b/, "carmin E120", H],
    [/\bkip\w*/, "poulet", H], [/\bkalkoen\b/, "dinde", H], [/\brundvlees\b/, "viande de bœuf", H], [/\bvlees\b/, "viande", H],
    [/\bgarnalen\b/, "crevettes", H], [/\bmosselen\b/, "moules", H],
    [/\bmelk\w*/, "lait", A], [/\beieren\b|\bei\b/, "œuf", A], [/\btarwe\w*/, "blé", A], [/\bpinda\w*/, "arachide", A], [/\bhazelno\w*/, "noisette", A], [/\bamandel\w*/, "amande", A],
    [/\bsuiker\b/, "sucre", W], [/\bzout\b/, "sel", W], [/\bwater\b/, "eau", W], [/\bmeel\b|\bbloem\b/, "farine", W], [/\bolie\b/, "huile", W], [/\bingredienten\b/, "ingrédients", W],
  ],
  pt: [
    [/\bgelatina de porco\b/, "gélatine de porc", H], [/\bgelatina de peixe\b/, "gélatine de poisson", H], [/\bgelatina (de )?(bovino|bovina|vaca)\b/, "gélatine de bœuf", H],
    [/\bgelatina\b/, "gélatine", H], [/\bvinagre de vinho\b/, "vinaigre de vin", H], [/\bsem alcool\b/, "sans alcool", H],
    [/\bporco\b|\bsuin[oa]\b/, "porc", H], [/\bbanha\b/, "saindoux", H], [/\btoucinho\b/, "lard", H], [/\bpresunto\b|\bfiambre\b/, "jambon", H],
    [/\bsangue\b/, "sang", H], [/\bvinho\b/, "vin", H], [/\bcerveja\b/, "bière", H], [/\blicor\b/, "liqueur", H],
    [/\bcoalho microbiano\b/, "présure microbienne", H], [/\bcoalho\b/, "présure", H], [/\bcarmim\b|\bcochonilha\b/, "carmin E120", H],
    [/\bfrango\b/, "poulet", H], [/\bperu\b/, "dinde", H], [/\bcarne de vaca\b|\bbovino\b/, "viande de bœuf", H], [/\bcarne\b/, "viande", H], [/\bcaldo\b/, "bouillon", H],
    [/\bcamarao\b|\bcamaroes\b/, "crevettes", H], [/\bmariscos\b/, "fruits de mer", H],
    [/\bleite\b/, "lait", A], [/\bovos?\b/, "œuf", A], [/\btrigo\b/, "blé", A], [/\bamendoim\b/, "arachide", A], [/\bavelas?\b/, "noisette", A], [/\bamendoas?\b/, "amande", A],
    [/\bacucar\b/, "sucre", W], [/\bsal\b/, "sel", W], [/\bagua\b/, "eau", W], [/\bfarinha\b/, "farine", W], [/\boleo\b/, "huile", W], [/\bingredientes\b/, "ingrédients", W],
  ],
  pl: [
    [/\bzelatyna wieprzowa\b/, "gélatine de porc", H], [/\bzelatyna wolowa\b/, "gélatine de bœuf", H], [/\bzelatyna rybia\b/, "gélatine de poisson", H],
    [/\bzelatyn\w*/, "gélatine", H], [/\bocet winny\b/, "vinaigre de vin", H], [/\bbezalkoholow\w*/, "sans alcool", H],
    [/\bwieprzow\w*/, "porc", H], [/\bsmalec\b/, "saindoux", H], [/\bboczek\b|\bslonina\b/, "lardons", H], [/\bszynka\b/, "jambon", H],
    [/\bkrew\b|\bkrwi\b/, "sang", H], [/\bwino\b/, "vin", H], [/\bpiwo\b/, "bière", H], [/\blikier\b/, "liqueur", H],
    [/\bpodpuszczka mikrobiologiczna\b/, "présure microbienne", H], [/\bpodpuszczk\w*/, "présure", H], [/\bkarmin\b|\bkoszenila\b/, "carmin E120", H],
    [/\bkurczak\w*|\bkurczecy\b/, "poulet", H], [/\bindyk\w*/, "dinde", H], [/\bwolowin\w*/, "viande de bœuf", H], [/\bmieso\b|\bmiesa\b/, "viande", H], [/\bbulion\b/, "bouillon", H],
    [/\bkrewetki\b/, "crevettes", H],
    [/\bmlek\w*/, "lait", A], [/\bjaj\w*/, "œuf", A], [/\bpszen\w*/, "blé", A], [/\borzeszki ziemne\b|\borzeszk\w* arachidow\w*/, "arachide", A], [/\borzech\w* laskow\w*/, "noisette", A],
    [/\bcukier\b/, "sucre", W], [/\bsol\b/, "sel", W], [/\bwoda\b/, "eau", W], [/\bmaka\b/, "farine", W], [/\bolej\b/, "huile", W], [/\bskladniki\b/, "ingrédients", W],
  ],
  tr: [
    [/\bdomuz jelatini\b/, "gélatine de porc", H], [/\bsigir jelatini\b/, "gélatine de bœuf", H], [/\bbalik jelatini\b/, "gélatine de poisson", H],
    [/\bjelatin\w*/, "gélatine", H], [/\bdomuz\w*/, "porc", H], [/\bsarap\b/, "vin", H], [/\bbira\b/, "bière", H], [/\balkol\b/, "alcool", H], [/\bkan\b/, "sang", H],
    [/\bmikrobiyal maya\b/, "présure microbienne", H], [/\bpeynir mayasi\b/, "présure", H], [/\bkarmin\b/, "carmin E120", H],
    [/\btavuk\w*/, "poulet", H], [/\bhindi\b/, "dinde", H], [/\bsigir eti\b|\bdana eti\b/, "viande de bœuf", H],
    [/\bsut\w*/, "lait", A], [/\byumurta\w*/, "œuf", A], [/\bbugday\w*/, "blé", A], [/\byer fistigi\b/, "arachide", A], [/\bfindik\w*/, "noisette", A],
    [/\bseker\b/, "sucre", W], [/\btuz\b/, "sel", W], [/\bsu\b/, "eau", W], [/\bun\b/, "farine", W], [/\bicindekiler\b/, "ingrédients", W],
  ],
  en: [
    [/\bpork gelatine?\b/, "gélatine de porc", H], [/\bbeef gelatine?\b|\bbovine gelatine?\b/, "gélatine de bœuf", H], [/\bfish gelatine?\b/, "gélatine de poisson", H],
    [/\bwine vinegar\b/, "vinaigre de vin", H], [/\balcohol.?free\b|\bnon.?alcoholic\b/, "sans alcool", H],
    [/\bmicrobial rennet\b|\bvegetarian rennet\b/, "présure microbienne", H], [/\bcarmine\b|\bcochineal\b/, "carmin E120", H],
    [/\bmilk\b/, "lait", A], [/\beggs?\b/, "œuf", A], [/\bwheat\b/, "blé", A], [/\bpeanuts?\b/, "arachide", A], [/\bhazelnuts?\b/, "noisette", A], [/\balmonds?\b/, "amande", A],
    [/\bsugar\b/, "sucre", W], [/\bsalt\b/, "sel", W], [/\bwater\b/, "eau", W], [/\bflour\b/, "farine", W], [/\boil\b/, "huile", W],
  ],
};

/**
 * Traduit les mots importants d'une liste d'ingrédients étrangère.
 * -> { lang, text (liste traduite, lisible en français), terms: [{ from, to, kind }] }
 */
export function translateIngredients(text, lang = detectLang(text)) {
  const rules = LEX[lang] || [];
  let out = norm(text);
  const terms = [];
  const seen = new Set();
  const slots = [];
  for (const [re, to, kind] of rules) {
    const g = new RegExp(re.source, "g");
    out = out.replace(g, (m) => {
      const key = `${m}>${to}`;
      if (!seen.has(key)) { seen.add(key); terms.push({ from: m, to, kind }); }
      slots.push(to);
      return `\u0001${slots.length - 1}\u0002`; // marque provisoire : la traduction n'est pas retraduite
    });
  }
  out = out.replace(/\u0001(\d+)\u0002/g, (_, i) => slots[+i]);
  return { lang, text: out, terms };
}

/** Fiche « produit » à analyser à partir d'une étiquette étrangère (texte traduit + texte d'origine). */
export function travelRaw(original, { lang, code, name } = {}) {
  const tr = translateIngredients(original, lang || detectLang(original));
  return {
    raw: {
      code: code || `travel-${Date.now()}`,
      product_name: name || "",
      ingredients_text: tr.text,
      ingredients_text_orig: original,
      travel_lang: tr.lang,
      categories_tags: [],
      local: true,
    },
    ...tr,
  };
}
