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
export const TOPICS = [
  // origine inconnue : une certification lève le doute
  "gelatine", "viande", "extraits_animaux", "derives", "presure", "arome_alcool", "traces_alcool",
  // divergences d'école : une certification ne tranche pas
  "insectes", "vinaigre", "fruits_de_mer", "crevettes", "insectes_alimentaires", "grenouille", "escargot", "cheval",
  "boissons_desalcoolisees", "alcool_cosmetique", "graisse_cosmetique",
];
export const DECISIONS = ["permis", "douteux", "interdit"];
// Sujets qui relèvent d'une divergence entre écoles (espèce, vinaigre, alcool…) et non d'une origine inconnue :
// un label halal ne les couvre pas, car un certificateur ne tranche pas entre les écoles.
export const SCHOOL_TOPICS = ["insectes", "vinaigre", "fruits_de_mer", "crevettes", "insectes_alimentaires", "grenouille",
  "escargot", "cheval", "boissons_desalcoolisees", "alcool_cosmetique", "graisse_cosmetique"];

const D = "douteux", P = "permis", X = "interdit";
// Préréglages par école, établis d'après la recherche documentée dans le dépôt
// (docs/avis-des-ecoles.md, oct. 2026). À confirmer auprès d'un savant de confiance.
//  - Gélatine, viande, extraits et dérivés : divergence à la fois doctrinale (istihala acceptée par les hanafites
//    et les malékites, rejetée par les chaféites et l'avis courant hanbalite) et factuelle (le procédé est-il une
//    vraie transformation ?). L'origine n'étant pas écrite, ils restent « douteux », sauf la viande : sans
//    certification, l'abattage n'est pas garanti (Conseil européen de la fatwa).
//  - Vinaigre obtenu volontairement du vin : licite (hanafites, malékites selon l'avis retenu), interdit (chaféites, hanbalites).
//  - Présure d'animal non sacrifié : pure pour Abu Hanifa, impure pour ses deux disciples, les chaféites et l'avis
//    courant hanbalite ; sources malékites contradictoires.
//  - Carmin : interdit à la consommation pour hanafites et hanbalites ; malékites : mise à mort rituelle exigée ;
//    autorisé par les fatwas officielles de Malaisie (2012) et d'Indonésie (2011), de tradition chaféite.
//  - Alcool non issu d'une boisson (solvant d'arôme, cosmétique) : toléré par l'OCI (2015), la Malaisie, le MUIS, la Diyanet.
//  - Produits de la mer : seul le poisson pour les hanafites (crevette débattue) ; tout pour les autres écoles.
//  - Grenouille : permise pour les seuls malékites. Escargot : malékites, si tué rituellement. Cheval : réprouvé
//    par Abu Hanifa, permis pour les chaféites et hanbalites.
//  - Bière et vin « sans alcool » : la Malaisie les interdit (1984) ; le MUI refuse de les certifier.
const BASE = {
  gelatine: D, viande: X, extraits_animaux: D, derives: D, presure: D, arome_alcool: D, traces_alcool: P,
  insectes: D, vinaigre: P, fruits_de_mer: P, crevettes: P, insectes_alimentaires: D, grenouille: D, escargot: D, cheval: D,
  boissons_desalcoolisees: D, alcool_cosmetique: P, graisse_cosmetique: P,
};
export const SCHOOLS = {
  standard: { ...BASE },
  // Le plus strict des quatre écoles sur chaque point
  prudent: {
    gelatine: D, viande: X, extraits_animaux: D, derives: D, presure: D, arome_alcool: D, traces_alcool: D,
    insectes: X, vinaigre: X, fruits_de_mer: X, crevettes: D, insectes_alimentaires: X, grenouille: X, escargot: X, cheval: D,
    boissons_desalcoolisees: X, alcool_cosmetique: D, graisse_cosmetique: D,
  },
  hanafi:  { ...BASE, insectes: X, vinaigre: P, fruits_de_mer: X, crevettes: P, insectes_alimentaires: X, grenouille: X, escargot: X, cheval: D, alcool_cosmetique: P, graisse_cosmetique: P },
  maliki:  { ...BASE, insectes: D, vinaigre: P, fruits_de_mer: P, crevettes: P, insectes_alimentaires: D, grenouille: P, escargot: D, cheval: D, alcool_cosmetique: D, graisse_cosmetique: P },
  shafii:  { ...BASE, insectes: D, vinaigre: X, fruits_de_mer: P, crevettes: P, insectes_alimentaires: X, grenouille: X, escargot: X, cheval: P, boissons_desalcoolisees: X, alcool_cosmetique: P, graisse_cosmetique: D },
  hanbali: { ...BASE, insectes: X, vinaigre: X, fruits_de_mer: P, crevettes: P, insectes_alimentaires: X, grenouille: X, escargot: X, cheval: P, alcool_cosmetique: D, graisse_cosmetique: D },
};
export const DEFAULT_PREFS = { school: "standard", topics: { ...SCHOOLS.standard } };

export const SEVERITY_OF = { permis: "info", douteux: "mashbouh", interdit: "haram" };

// Signalement -> sujet débattu
export const TOPIC_OF = {
  e120: "insectes",
  presure: "presure", enzymes_animales: "presure",
  vinaigre_vin: "vinaigre",
  arome_alcool: "arome_alcool",
  ethanol_support: "traces_alcool", e1510: "traces_alcool",
  gelatine: "gelatine", e441: "gelatine",
  viande: "viande",
  extrait_viande: "extraits_animaux",
  e542: "derives", e920: "derives", e921: "derives", e631: "derives", e635: "derives", plasma: "derives",
  fruits_de_mer: "fruits_de_mer", crevettes: "crevettes", insectes_alimentaires: "insectes_alimentaires",
  grenouille: "grenouille", escargot: "escargot", cheval: "cheval", boissons_desalcoolisees: "boissons_desalcoolisees",
  // cosmétiques (beauty.js) et médicaments (medicine.js)
  cosm_alcool: "alcool_cosmetique", cosm_gelatine: "gelatine", cosm_suif: "graisse_cosmetique", cosm_carmin: "insectes", cosm_animal: "derives",
  med_gelule: "gelatine", med_alcool: "traces_alcool",
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
    match: /\b(porc|porcine?s?|pork|lard|lardons?|saindoux|bacon|jambons?|ham|pancetta|coppa|rillettes|chorizo|pig|swine|cochon|sanglier|marcassin|couenne|wild boar|domuz)\b|خنزير/,
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
    // Âne domestique : interdit par consensus (le lait d'ânesse des savons n'est pas visé, faute de source)
    id: "ane", severity: "haram",
    label: "Viande d'âne",
    reason: "La viande d'âne domestique est interdite (consensus, hadith rapporté par Muslim).",
    match: /\b(viande d.?ane|ane|anes|donkey|esek eti)\b/,
    exclude: /lait|milk|sut|savon|soap/,
  },
  {
    id: "criquet", severity: "info",
    label: "Criquet",
    reason: "Le criquet (sauterelle) est licite pour les quatre écoles.",
    match: /\b(criquets?|sauterelles?|locusta migratoria|locusts?|cekirge)\b/,
  },
  {
    id: "insectes_alimentaires", severity: "mashbouh",
    label: "Insectes (farine, poudre)",
    reason: "Grillon ou ver de farine, autorisés en Europe depuis 2023. Interdits pour les hanafites, chaféites et hanbalites ; les malékites exigent une mise à mort rituelle.",
    match: /\b(grillons?|acheta domesticus|tenebrion\w*|tenebrio molitor|alphitobius diaperinus|vers? de farine|poudre d.?insectes?|farine d.?insectes?|insect (flour|powder)|crickets?|mealworms?|bocek unu)\b/,
  },
  {
    id: "crevettes", severity: "mashbouh",
    label: "Crevettes",
    reason: "Licites pour les malékites, chaféites et hanbalites. Débattues chez les hanafites : beaucoup les assimilent au poisson, d'autres s'en abstiennent.",
    match: /\b(crevettes?|gambas|shrimps?|prawns?|karides)\b/,
  },
  {
    id: "fruits_de_mer", severity: "mashbouh",
    label: "Fruits de mer",
    reason: "Crustacés et mollusques : licites pour les malékites, chaféites et hanbalites ; les hanafites n'autorisent que le poisson.",
    match: /\b(crabes?|homards?|langoustes?|langoustines?|ecrevisses?|moules?|huitres?|saint.?jacques|petoncles?|calamars?|encornets?|seiches?|poulpes?|palourdes?|bulots?|bisque|krill|fruits de mer|crab|lobster|mussels?|oysters?|squid|octopus|scallops?|clams?|seafood|midye|istiridye|kalamar|ahtapot|yengec|istakoz|deniz urunleri)\b/,
  },
  {
    id: "grenouille", severity: "mashbouh",
    label: "Grenouille",
    reason: "Permise pour les seuls malékites ; interdite pour les hanafites, chaféites et hanbalites.",
    match: /\b(grenouilles?|cuisses de grenouille|frogs?|frog legs|kurbaga)\b/,
  },
  {
    id: "escargot", severity: "mashbouh",
    label: "Escargot",
    reason: "Interdit pour les hanafites, chaféites et hanbalites ; permis pour les malékites s'il est tué rituellement.",
    match: /\b(escargots?|snails?|salyangoz)\b/,
    exclude: /bave|mucin|secretion|filtrate/,
  },
  {
    id: "cheval", severity: "mashbouh", also: "viande",
    label: "Viande de cheval",
    reason: "Permise pour les chaféites, les hanbalites et les deux disciples d'Abu Hanifa ; réprouvée par Abu Hanifa. L'abattage doit aussi être halal.",
    match: /\b(cheval|chevaux|chevaline|horse ?meat|horse|at eti)\b/,
  },
  {
    id: "alcool_naturel", severity: "info",
    label: "Fermentation naturelle",
    reason: "Traces d'alcool issues d'une fermentation naturelle (kéfir, kombucha) : admises par la Malaisie, le MUI et l'OCI tant que la boisson n'enivre pas.",
    match: /\b(kombucha|kefir|traces? d.?alcool|alcool\s*<\s*0[.,]5|alcohol\s*<\s*0[.,]5|fermentation naturelle)\b/,
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
    reason: "Vin, bière ou alcool ajouté comme ingrédient : interdit même en petite quantité. La cuisson n'élimine pas tout l'alcool.",
    match: /\b(alcool|alcohol|vins?|wine|bieres?|beer|rhum|rum|liqueurs?|cognac|whisky|whiskey|vodka|kirsch|calvados|brandy|armagnac|porto|marsala|cidre|cider|champagne|gin|amaretto|cointreau|grand marnier|alkol|etil alkol|sarap|bira|likor|raki)\b|كحول|نبيذ|خمر/,
    exclude: /vinaigre|vinegar|sirke|sans alcool|alcohol.?free|non.?alcoolis|desalcoolis|alkolsuz|alkol icermez|teneur en alcool|alcool\s*:?\s*0|0[.,]0\s*%|sucres?.?alcools?|polyols?|arome|aroma|flavou?r|خال من الكحول|بدون كحول/,
  },
  {
    id: "gelatine", severity: "mashbouh",
    label: "Gélatine",
    reason: "Gélatine d'origine non précisée : bœuf, porc ou poisson selon le fournisseur.",
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
    match: /\b(viandes?|boeuf|veau|agneau|mouton|poulet|dinde|volailles?|canard|oie|foie gras|magret|caille|pintade|gibier|cerf|chevreuil|autruche|lapin|chevre|beef|chicken|turkey|lamb|mutton|veal|duck|goose|venison|meat|tavuk eti|sigir eti|dana eti|kuzu eti|hindi eti|kirmizi et)\b/,
    exclude: /halal|helal|bouillon de legumes|vegetal|vegan|bitkisel|sans viande|lait de chevre|fromage de chevre|chevre frais|goat milk|goat cheese|\barome|\baroma|saveur|gout|flavou?r|\bbouillon|fond de|graisse/,
  },
  {
    id: "extrait_viande", severity: "mashbouh",
    label: "Bouillon / extrait animal",
    reason: "Bouillon, extrait ou graisse animale dont l'espèce et l'abattage ne sont pas précisés.",
    match: /\b(extrait de viande|jus de viande|bouillon|fond de (veau|volaille|boeuf)|graisses? animales?|graisse de (canard|oie|boeuf)|matieres? grasses? animales?|suif|gelee de viande|gelee au madere|aspic|tallow|animal fat|stock|hayvansal yag|et suyu)\b/,
    exclude: /legumes|vegetal|vegetable|halal|helal|poisson|fish|sebze/,
  },
  {
    id: "enzymes_animales", severity: "mashbouh",
    label: "Enzyme animale",
    reason: "Enzyme (pepsine, lipase animale) extraite d'estomac ou de pancréas d'animal, abattage inconnu.",
    match: /\b(pepsine|pepsin|lipase animale|trypsine|pancreatine)\b/,
  },
  {
    id: "plasma", severity: "mashbouh",
    label: "Plasma sanguin",
    reason: "Protéine extraite du sang d'animal. L'OCI (2013) le juge « différent du sang », sans trancher ; espèce et abattage inconnus.",
    match: /\b(plasma|proteines? de sang|blood plasma)\b/,
  },
  {
    id: "vinaigre_vin", severity: "info",
    label: "Vinaigre issu d'une boisson alcoolisée",
    reason: "Vinaigre obtenu volontairement à partir du vin ou du cidre. Licite pour les hanafites et, selon l'avis retenu, les malékites ; impur et interdit pour les écoles chaféite et hanbalite. Ibn 'Uthaymin autorise le vinaigre fabriqué par des chrétiens ou des juifs.",
    match: /\b(vinaigre de (vin|cidre|xeres|champagne)|vinaigre balsamique|wine vinegar|balsamic|sarap sirkesi)\b/,
  },
  {
    id: "ethanol_support", severity: "info",
    label: "Traces d'alcool possibles",
    reason: "Alcool servant de solvant à un arôme ou un extrait. Toléré par l'OCI (2015), la Malaisie (au plus 0,5 %) et le MUIS de Singapour s'il ne provient pas d'une boisson alcoolisée. L'étiquette n'indique ni la dose ni l'origine.",
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
  e904: { severity: "mashbouh", label: "Gomme laque", reason: "Résine sécrétée par un insecte. Aucune fatwa vérifiée sur cet ingrédient : signalé par précaution." },
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
      // Certaines règles en entraînent une autre : la viande de cheval pose aussi la question de l'abattage
      const also = rule.also && TEXT_RULES.find((r) => r.id === rule.also);
      if (also) add({ id: also.id, severity: also.severity, label: also.label, reason: also.reason, source: seg });
      break; // un segment = une règle (la plus spécifique)
    }
  }

  // 1 bis. Bière ou vin « sans alcool » : le nom ou la catégorie le dit, rarement la liste d'ingrédients
  const nameCats = normalize([product.product_name, product.product_name_fr, ...(product.categories_tags || [])].join(" "));
  if (
    /(non|alcohol|alcool)-?(alcoholic|free)-?(beers?|wines?)|(bieres?|vins?|beers?|wines?|bira|sarap)\b.{0,20}\b(sans alcool|desalcoolise\w*|alcohol.?free|non.?alcoholic|0[.,]0 ?%|alkolsuz)|\b(sans alcool|alkolsuz)\b.{0,12}\b(biere|vin|bira|sarap)/.test(nameCats)
  ) {
    add({ id: "boissons_desalcoolisees", severity: "mashbouh", label: "Bière ou vin sans alcool", source: "" });
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
    ? flags.filter((f) => !["viande", "extrait_viande", "porc", "sang", "gelatine", "e441", "e542", "enzymes_animales", "cheval", "ane", "plasma"].includes(f.id))
    : flags;

  const certification = detectCertification(product);
  const notes = []; // identifiants, traduits par l'interface

  // Un label halal lève le doute sur l'origine (gélatine, viande, dérivés…), qui passe en simple information.
  // Il ne tranche ni une divergence d'école (carmin, fruits de mer, vinaigre…) ni un interdit fixe (porc, sang).
  const isSchool = (f) => f.topic && SCHOOL_TOPICS.includes(f.topic);
  const coverable = (f) => f.topic && !isSchool(f) && f.severity !== "info";
  const finalFlags = cleaned.map((f) => (certification && coverable(f) ? { ...f, severity: "info", covered: true } : f));
  const haram = finalFlags.filter((f) => f.severity === "haram");
  const mashbouh = finalFlags.filter((f) => f.severity === "mashbouh");
  const covered = finalFlags.some((f) => f.covered);

  let status;
  if (haram.length) {
    status = "haram";
    if (certification) notes.push(haram.every(isSchool) ? "cert_school" : "cert_conflict");
  } else if (certification && mashbouh.length) {
    status = "mashbouh";
    notes.push(mashbouh.every(isSchool) ? "cert_school" : "cert_covers");
  } else if (certification) {
    status = "halal_certifie";
    if (covered) notes.push("cert_covers");
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

  const order = { haram: 0, mashbouh: 1, info: 2 };
  finalFlags.sort((a, b) => order[a.severity] - order[b.severity]);

  return { status, certification, flags: finalFlags, notes, vegan: isVegan, vegetarian: isVegetarian };
}
