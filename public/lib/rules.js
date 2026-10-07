// Moteur de classification halal.
// Entrée : un produit au format Open Food Facts (API v2) + les réglages de l'utilisateur.
// Sortie : { status, flags, certification, notes, ... }
//
// Statuts :
//   "haram"          ingrédient interdit détecté
//   "halal_certifie" label de certification halal présent, rien d'interdit détecté
//   "mashbouh"       ingrédient douteux (origine inconnue ou statut débattu)
//   "halal_probable" aucun ingrédient problématique détecté, mais pas de certification
//   "inconnu"        pas assez de données pour juger
//
// Sévérité d'un signalement : "haram" > "mashbouh" > "info" (ne change pas le verdict).
//
// Les points débattus entre écoles (insectes, présure, vinaigre de vin, alcool…) sont
// regroupés en « sujets ». Pour chaque sujet, l'utilisateur choisit : permis, douteux ou
// interdit, directement ou via un préréglage d'école. Les textes affichés sont traduits par
// l'interface à partir des identifiants ; les libellés français ci-dessous servent de repli.

// ---------------------------------------------------------------------------
// Sujets débattus et préréglages
// ---------------------------------------------------------------------------
export const TOPICS = ["insectes", "presure", "vinaigre", "arome_alcool", "traces_alcool", "gelatine", "viande", "derives"];
export const DECISIONS = ["permis", "douteux", "interdit"];

const D = "douteux", P = "permis", X = "interdit";
// Tendances générales des écoles, à confirmer auprès d'un savant de confiance.
// Gélatine, viande et dérivés d'origine inconnue relèvent d'un manque d'information
// sur l'origine, pas d'une divergence d'école : ils restent « douteux » partout.
export const SCHOOLS = {
  standard: { insectes: D, presure: D, vinaigre: P, arome_alcool: D, traces_alcool: P, gelatine: D, viande: D, derives: D },
  prudent:  { insectes: D, presure: D, vinaigre: D, arome_alcool: D, traces_alcool: D, gelatine: D, viande: D, derives: D },
  hanafi:   { insectes: X, presure: P, vinaigre: P, arome_alcool: D, traces_alcool: P, gelatine: D, viande: D, derives: D },
  maliki:   { insectes: P, presure: P, vinaigre: P, arome_alcool: D, traces_alcool: D, gelatine: D, viande: D, derives: D },
  shafii:   { insectes: X, presure: D, vinaigre: D, arome_alcool: D, traces_alcool: D, gelatine: D, viande: D, derives: D },
  hanbali:  { insectes: X, presure: D, vinaigre: D, arome_alcool: D, traces_alcool: D, gelatine: D, viande: D, derives: D },
};
export const DEFAULT_PREFS = { school: "standard", topics: { ...SCHOOLS.standard } };

export const SEVERITY_OF = { permis: "info", douteux: "mashbouh", interdit: "haram" };

// Signalement -> sujet débattu
export const TOPIC_OF = {
  e120: "insectes", e904: "insectes",
  presure: "presure",
  vinaigre_vin: "vinaigre",
  arome_alcool: "arome_alcool", e1510: "arome_alcool",
  ethanol_support: "traces_alcool",
  gelatine: "gelatine", e441: "gelatine",
  viande: "viande", extrait_viande: "viande", enzymes_animales: "viande", e542: "viande",
  e920: "derives", e921: "derives", e631: "derives", e635: "derives",
};

// ---------------------------------------------------------------------------
// Utilitaires texte
// ---------------------------------------------------------------------------
export function normalize(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/œ/g, "oe")
    .replace(/æ/g, "ae")
    .replace(/ı/g, "i") // i sans point turc
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[ً-ْـ]/g, "") // voyelles courtes et tatweel arabes
    .replace(/[_*]/g, " ") // OFF met les allergènes entre _underscores_
    .replace(/\s+/g, " ")
    .trim();
}

// Découpe la liste d'ingrédients en segments courts pour que les exclusions
// ("vinaigre de vin", "jambon de dinde", "sans alcool") s'appliquent localement.
export function segments(text) {
  return normalize(text)
    .split(/[,;()\[\]{}•·\n،؛]|\.\s|\s-\s|:\s/)
    .map((s) => s.trim())
    .filter(Boolean);
}

// ---------------------------------------------------------------------------
// Règles sur le texte des ingrédients (français, anglais, turc, arabe)
// L'ordre compte : une règle plus spécifique placée avant "consomme" le segment.
// Le mot arabe est cherché tel quel (\b ne fonctionne pas sur l'alphabet arabe).
// ---------------------------------------------------------------------------
export const TEXT_RULES = [
  {
    id: "porc", severity: "haram",
    label: "Porc / dérivé porcin",
    reason: "Porc ou dérivé porcin : interdit quelle que soit la quantité.",
    match: /\b(porc|porcine?s?|pork|lard|lardons?|saindoux|bacon|jambons?|ham|pancetta|coppa|rillettes|chorizo|pig|swine|cochon|domuz)\b|خنزير/,
    exclude: /\b(dinde|poulet|volaille|boeuf|turkey|chicken|beef|halal|helal|hindi|tavuk|sigir|dana)\b/,
  },
  {
    id: "sang", severity: "haram",
    label: "Sang",
    reason: "Le sang est explicitement interdit (Coran 5:3).",
    match: /\b(sang|blood)\b/,
    exclude: /orange sanguine|blood orange/,
  },
  {
    id: "arome_alcool", severity: "mashbouh",
    label: "Arôme alcoolisé",
    reason: "Arôme à base d'alcool (rhum, vin, liqueur…). Le support peut contenir de l'alcool ; avis divergents selon la quantité résiduelle.",
    match: /\b(arome|aroma|flavou?r|aromasi|aroma verici)s?\b.{0,20}\b(rhum|rum|vin|wine|cognac|whisky|liqueur|kirsch|amaretto|brandy|calvados|marsala|porto|likor|sarap)\b/,
  },
  {
    id: "alcool", severity: "haram",
    label: "Alcool",
    reason: "Boisson alcoolisée ou alcool ajouté comme ingrédient.",
    match: /\b(alcool|alcohol|vins?|wine|bieres?|beer|rhum|rum|liqueurs?|cognac|whisky|whiskey|vodka|kirsch|calvados|brandy|armagnac|porto|marsala|cidre|cider|champagne|gin|amaretto|cointreau|grand marnier|alkol|etil alkol|sarap|bira|likor|raki)\b|كحول|نبيذ|خمر/,
    exclude: /vinaigre|vinegar|sirke|sans alcool|alcohol.?free|non.?alcoolis|desalcoolis|alkolsuz|alkol icermez|teneur en alcool|alcool\s*:?\s*0|0[.,]0\s*%|sucres?.?alcools?|polyols?|arome|aroma|flavou?r|خال من الكحول|بدون كحول/,
  },
  {
    id: "gelatine", severity: "mashbouh",
    label: "Gélatine",
    reason: "Gélatine d'origine non précisée : bœuf, porc ou poisson selon le fournisseur. Le porc est la source la plus courante en Europe.",
    match: /\b(gelatine|gelatin|jelatin|jelatini)\b|جيلاتين/,
    exclude: /halal|helal|poisson|fish|balik|vegetal|vegan|bitkisel|agar|حلال|سمك|نباتي/,
  },
  {
    id: "presure", severity: "mashbouh",
    label: "Présure",
    reason: "Présure d'origine non précisée. Si elle est animale, sa licéité dépend de l'animal et de son abattage ; les écoles divergent.",
    match: /\b(presure|rennet|caille animale|peynir mayasi|sirdan mayasi)\b|منفحة/,
    exclude: /microbien|microbial|mikrobiyal|vegetal|vegetable|bitkisel|non animal|fongique|ميكروبية|نباتية/,
  },
  {
    id: "viande", severity: "mashbouh",
    label: "Viande non certifiée",
    reason: "Viande ou volaille sans mention d'abattage halal : l'animal est licite mais le mode d'abattage est inconnu.",
    match: /\b(viandes?|boeuf|veau|agneau|mouton|poulet|dinde|volailles?|canard|lapin|chevre|beef|chicken|turkey|lamb|mutton|veal|duck|meat|tavuk eti|sigir eti|dana eti|kuzu eti|hindi eti|kirmizi et)\b/,
    exclude: /halal|helal|bouillon de legumes|vegetal|vegan|bitkisel|sans viande|lait de chevre|fromage de chevre|chevre frais|goat milk|goat cheese/,
  },
  {
    id: "extrait_viande", severity: "mashbouh",
    label: "Bouillon / extrait animal",
    reason: "Bouillon, extrait ou graisse animale dont l'espèce et l'abattage ne sont pas précisés.",
    match: /\b(extrait de viande|bouillon|fond de (veau|volaille)|graisses? animales?|matieres? grasses? animales?|suif|tallow|animal fat|stock|hayvansal yag|et suyu)\b/,
    exclude: /legumes|vegetal|vegetable|halal|helal|poisson|fish|sebze/,
  },
  {
    id: "enzymes_animales", severity: "mashbouh",
    label: "Enzyme animale",
    reason: "Enzyme (pepsine, lipase animale) extraite d'estomac ou de pancréas d'animal, abattage inconnu.",
    match: /\b(pepsine|pepsin|lipase animale|trypsine|pancreatine)\b/,
  },
  {
    id: "vinaigre_vin", severity: "info",
    label: "Vinaigre de vin",
    reason: "Issu du vin. La majorité des savants le jugent licite une fois la transformation (istihala) complète ; certains chaféites et hanbalites le refusent s'il a été produit volontairement à partir du vin.",
    match: /\b(vinaigre de (vin|cidre|xeres|champagne)|vinaigre balsamique|wine vinegar|balsamic|sarap sirkesi)\b/,
  },
  {
    id: "ethanol_support", severity: "info",
    label: "Traces d'alcool possibles",
    reason: "Les extraits et arômes peuvent utiliser de l'alcool comme solvant, en quantité infime. Beaucoup d'avis le tolèrent, pas tous.",
    match: /\b(extrait de vanille|vanilla extract|vanilya ozu)\b/,
  },
];

// ---------------------------------------------------------------------------
// Additifs (codes E) — via additives_tags d'Open Food Facts et le texte
// ---------------------------------------------------------------------------
const FATTY = {
  severity: "mashbouh",
  group: "gras",
  label: "Dérivé d'acides gras",
  reason: "Dérivé d'acides gras : peut être d'origine végétale ou animale (parfois porcine). L'origine est rarement indiquée sur l'étiquette.",
};
const fatty = (codes) => Object.fromEntries(codes.map((c) => [c, FATTY]));

export const ADDITIVES = {
  e120: { severity: "mashbouh", label: "Carmin", reason: "Colorant extrait de la cochenille (insecte). Licite pour les malékites, refusé par les autres écoles qui interdisent les insectes ; beaucoup d'avis contemporains le tolèrent." },
  e441: { severity: "mashbouh", group: "gelatine", label: "Gélatine", reason: "Gélatine d'origine animale non précisée, souvent porcine en Europe." },
  e542: { severity: "mashbouh", label: "Phosphate d'os", reason: "Extrait d'os d'animaux, espèce et abattage inconnus." },
  e904: { severity: "mashbouh", label: "Gomme laque", reason: "Résine sécrétée par un insecte (cochenille à laque). Même divergence que pour le carmin." },
  e920: { severity: "mashbouh", label: "L-cystéine", reason: "Acide aminé souvent extrait de plumes ou de poils, parfois de soies de porc ; aussi produit par synthèse." },
  e921: { severity: "mashbouh", label: "L-cystine", reason: "Même origine possible que la L-cystéine (plumes, poils)." },
  e1510: { severity: "mashbouh", label: "Éthanol", reason: "Alcool utilisé comme support ou solvant. Toléré en trace par beaucoup de savants, pas par tous." },
  e631: { severity: "mashbouh", label: "Inosinate de sodium", reason: "Exhausteur de goût parfois extrait de viande ou de poisson, souvent obtenu par fermentation." },
  e627: { severity: "info", label: "Guanylate de sodium", reason: "Généralement produit par fermentation ; parfois d'origine animale." },
  e635: { severity: "mashbouh", label: "Ribonucléotides", reason: "Mélange contenant de l'E631, même incertitude d'origine." },
  ...fatty(["e422", "e430", "e431", "e432", "e433", "e434", "e435", "e436", "e470a", "e470b", "e471", "e472a", "e472b",
    "e472c", "e472d", "e472e", "e472f", "e473", "e474", "e475", "e476", "e477", "e478", "e479b", "e481", "e482", "e483",
    "e491", "e492", "e493", "e494", "e495", "e570", "e572"]),
};

// "en:e322i" -> "e322i" ; on essaie le code complet puis le numéro seul.
function additiveKey(tag) {
  const m = String(tag).toLowerCase().match(/e(\d{3,4})([a-z]*)/);
  if (!m) return null;
  const full = "e" + m[1] + m[2];
  if (ADDITIVES[full]) return full;
  const base = "e" + m[1];
  return ADDITIVES[base] ? base : null;
}

// L'étiquette précise-t-elle une origine végétale pour cet additif ?
const VEGETAL = "vegetal\\w*|plant|colza|tournesol|soja|palme|sunflower|rapeseed|soy|palm|vegan|bitkisel";
function declaredVegetal(text, code) {
  const num = code.replace(/^e/, "");
  const after = new RegExp("\\be\\s?-?" + num + "\\b[^,;]{0,40}?(" + VEGETAL + ")");
  const before = new RegExp("(" + VEGETAL + ")[^,;]{0,15}\\(?\\s*e\\s?-?" + num + "\\b");
  return after.test(text) || before.test(text);
}

// ---------------------------------------------------------------------------
// Certification
// ---------------------------------------------------------------------------
const CERTIFIERS = [
  { re: /\bavs\b|a votre service/, name: "AVS" },
  { re: /achahada/, name: "Achahada" },
  { re: /argml|mosquee de lyon/, name: "Mosquée de Lyon (ARGML)" },
  { re: /mosquee de paris|grande mosquee/, name: "Grande Mosquée de Paris" },
  { re: /mosquee d.?evry/, name: "Mosquée d'Évry" },
  { re: /\bhmc\b|halal monitoring/, name: "HMC" },
  { re: /\bhfa\b|halal food authority/, name: "HFA" },
  { re: /jakim/, name: "JAKIM" },
  { re: /\bmuis\b/, name: "MUIS" },
  { re: /\bifanca\b/, name: "IFANCA" },
  { re: /halal correct/, name: "Halal Correct" },
  { re: /\bgimdes\b/, name: "GİMDES" },
  { re: /\btse\b.*helal|helal.*\btse\b/, name: "TSE Helal" },
];

export function detectCertification(product) {
  const tags = (product.labels_tags || []).map(normalize).join(" ");
  const text = normalize([product.labels, product.labels_fr, product.product_name, product.product_name_fr].filter(Boolean).join(" "));
  const all = tags.replace(/[-:]/g, " ") + " " + text;
  if (!/\bhalal\b|\bhelal\b|حلال/.test(all)) return null;
  const org = CERTIFIERS.find((c) => c.re.test(all));
  return { certified: true, organisme: org ? org.name : null };
}

// ---------------------------------------------------------------------------
// Classification
// ---------------------------------------------------------------------------
export function ingredientsText(product) {
  return product.ingredients_text_fr || product.ingredients_text || product.ingredients_text_en || "";
}

export function classify(product, prefs = DEFAULT_PREFS) {
  const topics = { ...SCHOOLS.standard, ...((prefs && prefs.topics) || {}) };
  const text = ingredientsText(product);
  const segs = segments(text);
  const analysis = product.ingredients_analysis_tags || [];
  const isVegan = analysis.includes("en:vegan");
  const isVegetarian = isVegan || analysis.includes("en:vegetarian");

  const flags = [];
  const seen = new Set();
  const add = (f) => {
    if (seen.has(f.id)) return;
    seen.add(f.id);
    // Sujet débattu : la sévérité suit le réglage de l'utilisateur
    const topic = TOPIC_OF[f.id];
    if (topic && f.variant !== "vegetal" && f.variant !== "vegan") {
      f.topic = topic;
      f.decision = topics[topic];
      f.severity = SEVERITY_OF[f.decision];
    }
    flags.push(f);
  };

  // 1. Texte, segment par segment
  for (const seg of segs) {
    for (const rule of TEXT_RULES) {
      if (!rule.match.test(seg)) continue;
      if (rule.exclude && rule.exclude.test(seg)) continue;
      add({ id: rule.id, severity: rule.severity, label: rule.label, reason: rule.reason, source: seg });
      break; // un segment = une règle (la plus spécifique)
    }
  }

  // 2. Additifs reconnus par Open Food Facts + codes E trouvés dans le texte
  const codes = new Set();
  for (const tag of product.additives_tags || []) {
    const k = additiveKey(tag);
    if (k) codes.add(k);
  }
  const ntext = normalize(text);
  for (const m of ntext.matchAll(/\be\s?-?(\d{3,4}[a-f]?)\b/g)) {
    const k = additiveKey("e" + m[1]);
    if (k) codes.add(k);
  }
  for (const code of codes) {
    const a = ADDITIVES[code];
    if (a.group === "gelatine" && seen.has("gelatine")) continue; // déjà signalée via le texte
    const f = { id: code, code: code.toUpperCase(), severity: a.severity, label: a.label, reason: a.reason, source: code.toUpperCase(), group: a.group || null };
    if (a.group === "gras") {
      f.topic = "derives";
      if (isVegan || declaredVegetal(ntext, code)) {
        f.severity = "info";
        f.variant = isVegan ? "vegan" : "vegetal";
        f.reason = isVegan
          ? "Produit identifié comme végétalien par Open Food Facts : origine végétale probable."
          : "Origine végétale indiquée sur l'étiquette.";
      } else {
        f.decision = topics.derives;
        f.severity = SEVERITY_OF[f.decision];
      }
      seen.add(code);
      flags.push(f);
    } else {
      add(f);
    }
  }

  // 3. Un produit végétarien ne peut pas contenir de viande : on retire ces faux positifs
  //    (ex. "arôme poulet" de synthèse dans des chips végétariennes).
  const cleaned = isVegetarian
    ? flags.filter((f) => !["viande", "extrait_viande", "porc", "sang", "gelatine", "e441", "e542", "enzymes_animales"].includes(f.id))
    : flags;

  const certification = detectCertification(product);
  const haram = cleaned.filter((f) => f.severity === "haram");
  const mashbouh = cleaned.filter((f) => f.severity === "mashbouh");
  const notes = []; // identifiants, traduits par l'interface

  let status;
  if (haram.length) {
    status = "haram";
    if (certification) notes.push("cert_conflict");
  } else if (certification) {
    status = "halal_certifie";
    if (mashbouh.length) notes.push("cert_covers");
  } else if (mashbouh.length) {
    status = "mashbouh";
  } else if (!text && !codes.size && (product.categories_tags || []).includes("en:waters")) {
    status = "halal_probable";
    notes.push("water");
  } else if (!text && !codes.size) {
    status = "inconnu";
    notes.push("no_ingredients");
  } else {
    status = "halal_probable";
    if (isVegan) notes.push("vegan");
    notes.push("no_cert");
  }

  // Les ingrédients couverts par une certification passent en "info"
  const finalFlags = cleaned.map((f) =>
    status === "halal_certifie" && f.severity === "mashbouh" ? { ...f, severity: "info", covered: true } : f
  );
  const order = { haram: 0, mashbouh: 1, info: 2 };
  finalFlags.sort((a, b) => order[a.severity] - order[b.severity]);

  return { status, certification, flags: finalFlags, notes, vegan: isVegan, vegetarian: isVegetarian };
}
