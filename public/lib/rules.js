// Moteur de classification halal.
// Entrée : un produit au format Open Food Facts (API v2).
// Sortie : { status, flags, certification, notes, ... }
//
// Statuts :
//   "haram"          ingrédient explicitement interdit détecté
//   "halal_certifie" label de certification halal présent, rien d'interdit détecté
//   "mashbouh"       ingrédient douteux (origine inconnue ou statut débattu)
//   "halal_probable" aucun ingrédient problématique détecté, mais pas de certification
//   "inconnu"        pas assez de données pour juger
//
// Sévérité d'un signalement :
//   "haram" > "mashbouh" > "info" (point d'attention, ne change pas le verdict)

export const STATUS_LABELS = {
  haram: "Haram",
  halal_certifie: "Halal certifié",
  mashbouh: "Douteux",
  halal_probable: "Halal probable",
  inconnu: "Non déterminé",
};

// ---------------------------------------------------------------------------
// Utilitaires texte
// ---------------------------------------------------------------------------

export function normalize(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/œ/g, "oe")
    .replace(/æ/g, "ae")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[_*]/g, " ") // OFF met les allergènes entre _underscores_
    .replace(/\s+/g, " ")
    .trim();
}

// Découpe la liste d'ingrédients en segments courts pour que les exclusions
// ("vinaigre de vin", "jambon de dinde", "sans alcool") s'appliquent localement.
export function segments(text) {
  return normalize(text)
    .split(/[,;()\[\]{}•·\n]|\.\s|\s-\s|:\s/)
    .map((s) => s.trim())
    .filter(Boolean);
}

// ---------------------------------------------------------------------------
// Règles sur le texte des ingrédients (français + anglais)
// L'ordre compte : une règle plus spécifique placée avant "consomme" le segment.
// ---------------------------------------------------------------------------

const TEXT_RULES = [
  {
    id: "porc",
    severity: "haram",
    label: "Porc / dérivé porcin",
    reason: "Porc ou dérivé porcin : interdit quelle que soit la quantité.",
    match: /\b(porc|porcine?s?|pork|lard|lardons?|saindoux|bacon|jambons?|ham|pancetta|coppa|rillettes|chorizo|pig|swine|cochon)\b/,
    exclude: /\b(dinde|poulet|volaille|boeuf|turkey|chicken|beef|halal)\b/,
  },
  {
    id: "sang",
    severity: "haram",
    label: "Sang",
    reason: "Le sang est explicitement interdit (Coran 5:3).",
    match: /\b(sang|blood)\b/,
    exclude: /orange sanguine|blood orange/,
  },
  {
    id: "arome_alcool",
    severity: "mashbouh",
    label: "Arôme alcoolisé",
    reason: "Arôme à base d'alcool (rhum, vin, liqueur…). Le support peut contenir de l'alcool ; avis divergents selon la quantité résiduelle.",
    match: /\b(arome|aroma|flavou?r)s?\b.{0,20}\b(rhum|rum|vin|wine|cognac|whisky|liqueur|kirsch|amaretto|brandy|calvados|marsala|porto)\b/,
  },
  {
    id: "alcool",
    severity: "haram",
    label: "Alcool",
    reason: "Boisson alcoolisée ou alcool ajouté comme ingrédient.",
    match: /\b(alcool|alcohol|vins?|wine|bieres?|beer|rhum|rum|liqueurs?|cognac|whisky|whiskey|vodka|kirsch|calvados|brandy|armagnac|porto|marsala|cidre|cider|champagne|gin|amaretto|cointreau|grand marnier)\b/,
    exclude: /vinaigre|vinegar|sans alcool|alcohol.?free|non.?alcoolis|desalcoolis|teneur en alcool|alcool\s*:?\s*0|0[.,]0\s*%|sucres?.?alcools?|polyols?|arome|aroma|flavou?r/,
  },
  {
    id: "gelatine",
    severity: "mashbouh",
    label: "Gélatine",
    reason: "Gélatine d'origine non précisée : bœuf, porc ou poisson selon le fournisseur. Le porc est la source la plus courante en Europe.",
    match: /\b(gelatine|gelatin)\b/,
    exclude: /halal|poisson|fish|vegetal|vegan|agar/,
  },
  {
    id: "presure",
    severity: "mashbouh",
    label: "Présure",
    reason: "Présure d'origine non précisée. Si elle est animale, sa licéité dépend de l'animal et de son abattage (avis divergents, les hanafites l'acceptent).",
    match: /\b(presure|rennet|caille animale)\b/,
    exclude: /microbien|microbial|vegetal|vegetable|non animal|fongique/,
  },
  {
    id: "viande",
    severity: "mashbouh",
    label: "Viande non certifiée",
    reason: "Viande ou volaille sans mention d'abattage halal : l'animal est licite mais le mode d'abattage est inconnu.",
    match: /\b(viandes?|boeuf|veau|agneau|mouton|poulet|dinde|volailles?|canard|lapin|chevre|beef|chicken|turkey|lamb|mutton|veal|duck|meat)\b/,
    exclude: /halal|bouillon de legumes|vegetal|vegan|sans viande|lait de chevre|fromage de chevre|chevre frais|goat milk|goat cheese/,
  },
  {
    id: "extrait_viande",
    severity: "mashbouh",
    label: "Bouillon / extrait animal",
    reason: "Bouillon, extrait ou graisse animale dont l'espèce et l'abattage ne sont pas précisés.",
    match: /\b(extrait de viande|bouillon|fond de (veau|volaille)|graisses? animales?|matieres? grasses? animales?|suif|tallow|animal fat|stock)\b/,
    exclude: /legumes|vegetal|vegetable|halal|poisson|fish/,
  },
  {
    id: "enzymes_animales",
    severity: "mashbouh",
    label: "Enzyme animale",
    reason: "Enzyme (pepsine, lipase animale) extraite d'estomac ou de pancréas d'animal, abattage inconnu.",
    match: /\b(pepsine|pepsin|lipase animale|trypsine|pancreatine)\b/,
  },
  {
    id: "vinaigre_vin",
    severity: "info",
    label: "Vinaigre de vin",
    reason: "Issu du vin, mais la transformation complète (istihala) le rend licite pour la majorité des savants. Signalé pour information.",
    match: /\b(vinaigre de (vin|cidre|xeres|champagne)|vinaigre balsamique|wine vinegar|balsamic)\b/,
  },
  {
    id: "ethanol_support",
    severity: "info",
    label: "Traces d'alcool possibles",
    reason: "Les arômes peuvent utiliser de l'alcool comme solvant en quantité infime. La plupart des avis le tolèrent.",
    match: /\b(extrait de vanille|vanilla extract)\b/,
  },
];

// ---------------------------------------------------------------------------
// Additifs (codes E) — utilisés via additives_tags d'Open Food Facts,
// plus fiable que le texte (OFF reconnaît aussi les noms en toutes lettres).
// ---------------------------------------------------------------------------

const FATTY = {
  severity: "mashbouh",
  group: "gras",
  reason: "Dérivé d'acides gras : peut être d'origine végétale ou animale (parfois porcine). L'origine est rarement indiquée sur l'étiquette.",
};

export const ADDITIVES = {
  e120: { severity: "mashbouh", label: "E120 (carmin)", reason: "Colorant extrait de la cochenille (insecte). Licite pour la majorité, déconseillé par l'école hanafite." },
  e441: { severity: "mashbouh", group: "gelatine", label: "E441 (gélatine)", reason: "Gélatine d'origine animale non précisée, souvent porcine en Europe." },
  e542: { severity: "mashbouh", label: "E542 (phosphate d'os)", reason: "Extrait d'os d'animaux, espèce et abattage inconnus." },
  e904: { severity: "mashbouh", label: "E904 (gomme laque)", reason: "Résine sécrétée par un insecte (cochenille à laque). Statut débattu, comme le carmin." },
  e920: { severity: "mashbouh", label: "E920 (L-cystéine)", reason: "Acide aminé souvent extrait de plumes ou de poils, parfois de soies de porc ; aussi produit par synthèse." },
  e921: { severity: "mashbouh", label: "E921 (L-cystine)", reason: "Même origine possible que la L-cystéine (plumes, poils)." },
  e1510: { severity: "mashbouh", label: "E1510 (éthanol)", reason: "Alcool utilisé comme support ou solvant. Toléré en trace par beaucoup de savants, pas par tous." },
  e631: { severity: "mashbouh", label: "E631 (inosinate de sodium)", reason: "Exhausteur de goût parfois extrait de viande ou de poisson, souvent fermentation." },
  e627: { severity: "info", label: "E627 (guanylate de sodium)", reason: "Généralement produit par fermentation ; parfois d'origine animale." },
  e635: { severity: "mashbouh", label: "E635 (ribonucléotides)", reason: "Mélange contenant de l'E631, même incertitude d'origine." },
  e422: { ...FATTY, label: "E422 (glycérol)" },
  e430: { ...FATTY, label: "E430" },
  e431: { ...FATTY, label: "E431" },
  e432: { ...FATTY, label: "E432 (polysorbate 20)" },
  e433: { ...FATTY, label: "E433 (polysorbate 80)" },
  e434: { ...FATTY, label: "E434" },
  e435: { ...FATTY, label: "E435" },
  e436: { ...FATTY, label: "E436" },
  e470a: { ...FATTY, label: "E470a (sels d'acides gras)" },
  e470b: { ...FATTY, label: "E470b (sels de magnésium d'acides gras)" },
  e471: { ...FATTY, label: "E471 (mono- et diglycérides)" },
  e472a: { ...FATTY, label: "E472a" },
  e472b: { ...FATTY, label: "E472b" },
  e472c: { ...FATTY, label: "E472c" },
  e472d: { ...FATTY, label: "E472d" },
  e472e: { ...FATTY, label: "E472e" },
  e472f: { ...FATTY, label: "E472f" },
  e473: { ...FATTY, label: "E473" },
  e474: { ...FATTY, label: "E474" },
  e475: { ...FATTY, label: "E475" },
  e476: { ...FATTY, label: "E476" },
  e477: { ...FATTY, label: "E477" },
  e478: { ...FATTY, label: "E478" },
  e479b: { ...FATTY, label: "E479b" },
  e481: { ...FATTY, label: "E481 (stéaroyl-lactylate de sodium)" },
  e482: { ...FATTY, label: "E482 (stéaroyl-lactylate de calcium)" },
  e483: { ...FATTY, label: "E483" },
  e491: { ...FATTY, label: "E491 (monostéarate de sorbitane)" },
  e492: { ...FATTY, label: "E492" },
  e493: { ...FATTY, label: "E493" },
  e494: { ...FATTY, label: "E494" },
  e495: { ...FATTY, label: "E495" },
  e570: { ...FATTY, label: "E570 (acides gras)" },
  e572: { ...FATTY, label: "E572 (stéarate de magnésium)" },
};

// "en:e322i" -> "e322i" ; on essaie le code complet puis le numéro seul.
function additiveKey(tag) {
  const m = String(tag).toLowerCase().match(/e(\d{3,4})([a-z]*)/);
  if (!m) return null;
  const full = "e" + m[1] + m[2];
  if (ADDITIVES[full]) return full;
  const base = "e" + m[1];
  if (ADDITIVES[base]) return base;
  return null;
}

// Cherche si l'étiquette précise une origine végétale pour cet additif,
// juste avant ou juste après son code : "E471 (origine végétale)", "E471 de colza",
// "mono- et diglycérides d'acides gras végétaux (E471)".
const VEGETAL = "vegetal\\w*|plant|colza|tournesol|soja|palme|sunflower|rapeseed|soy|palm|vegan";
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
];

export function detectCertification(product) {
  const tags = (product.labels_tags || []).map(normalize).join(" ");
  const text = normalize([product.labels, product.labels_fr, product.product_name, product.product_name_fr].filter(Boolean).join(" "));
  const all = tags.replace(/[-:]/g, " ") + " " + text;
  const halal = /\bhalal\b/.test(all);
  if (!halal) return null;
  const org = CERTIFIERS.find((c) => c.re.test(all));
  return { certified: true, organisme: org ? org.name : null };
}

// ---------------------------------------------------------------------------
// Classification
// ---------------------------------------------------------------------------

export function ingredientsText(product) {
  return product.ingredients_text_fr || product.ingredients_text || product.ingredients_text_en || "";
}

export function classify(product) {
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
  for (const m of normalize(text).matchAll(/\be\s?-?(\d{3,4}[a-f]?)\b/g)) {
    const k = additiveKey("e" + m[1]);
    if (k) codes.add(k);
  }
  for (const code of codes) {
    const a = ADDITIVES[code];
    if (a.group === "gelatine" && seen.has("gelatine")) continue; // déjà signalée via le texte
    let severity = a.severity;
    let reason = a.reason;
    if (a.group === "gras" && (declaredVegetal(normalize(text), code) || isVegan)) {
      severity = "info";
      reason = isVegan
        ? "Produit identifié comme végétalien par Open Food Facts : origine végétale probable."
        : "Origine végétale indiquée sur l'étiquette.";
    }
    add({ id: code, severity, label: a.label, reason, source: code.toUpperCase() });
  }

  // 3. Un produit végétarien ne peut pas contenir de viande : on retire ces faux positifs
  //    (ex. "arôme poulet" de synthèse dans des chips végétariennes).
  const cleaned = isVegetarian
    ? flags.filter((f) => !["viande", "extrait_viande", "porc", "sang", "gelatine", "e441", "e542", "enzymes_animales"].includes(f.id))
    : flags;

  const certification = detectCertification(product);
  const haram = cleaned.filter((f) => f.severity === "haram");
  const mashbouh = cleaned.filter((f) => f.severity === "mashbouh");
  const notes = [];

  let status;
  if (haram.length) {
    status = "haram";
    if (certification) notes.push("Un label halal est indiqué, mais un ingrédient interdit a été détecté. Vérifiez l'emballage : la fiche Open Food Facts peut être erronée.");
  } else if (certification) {
    status = "halal_certifie";
    if (mashbouh.length) notes.push("Les ingrédients signalés sont couverts par la certification, qui contrôle leur origine.");
  } else if (mashbouh.length) {
    status = "mashbouh";
  } else if (!text && !codes.size) {
    status = "inconnu";
    notes.push("La liste d'ingrédients n'est pas renseignée pour ce produit.");
  } else {
    status = "halal_probable";
    if (isVegan) notes.push("Produit identifié comme végétalien par Open Food Facts.");
    notes.push("Aucune certification : verdict basé uniquement sur les ingrédients déclarés.");
  }

  // Les ingrédients couverts par une certification passent en "info"
  const finalFlags = cleaned.map((f) =>
    status === "halal_certifie" && f.severity === "mashbouh" ? { ...f, severity: "info" } : f
  );

  const order = { haram: 0, mashbouh: 1, info: 2 };
  finalFlags.sort((a, b) => order[a.severity] - order[b.severity]);

  return {
    status,
    statusLabel: STATUS_LABELS[status],
    certification,
    flags: finalFlags,
    notes,
    vegan: isVegan,
    vegetarian: isVegetarian,
  };
}
