// Analyse santé, dans l'esprit de Yuka, à partir des données Open Food Facts.
//
// Note santé sur 100 :
//   60 pts  qualité nutritionnelle (Nutri-Score A→E)
//   30 pts  additifs (retrait selon le niveau de risque ; un additif à risque élevé plafonne la note à 49)
//   10 pts  agriculture biologique
// Pas de Nutri-Score => pas de note (on n'invente pas de chiffre).
//
// Seuils nutritionnels : ceux des feux tricolores de la Food Standards Agency (pour 100 g ou 100 ml).
// Niveaux de risque des additifs : synthèse indicative d'avis publics (EFSA, ANSES, CIRC),
// à lire comme un signal et pas comme un diagnostic.

const GRADE_POINTS = { a: 60, b: 45, c: 30, d: 15, e: 0 };

export const HEALTH_GRADES = [
  { min: 75, id: "excellent", label: "Excellent" },
  { min: 50, id: "bon", label: "Bon" },
  { min: 25, id: "mediocre", label: "Médiocre" },
  { min: 0, id: "mauvais", label: "Mauvais" },
];

export const RISK_LABELS = { eleve: "Risque élevé", modere: "Risque modéré", limite: "Risque limité" };

const NITRITES = { key: "nitrites", level: "eleve", reason: "Nitrites et nitrates forment des composés nitrosés ; l'ANSES (2022) recommande d'en réduire l'exposition, en lien avec le cancer colorectal." };
const SOUTHAMPTON = { key: "southampton", level: "modere", reason: "Colorant soumis à un avertissement obligatoire dans l'UE : « peut avoir des effets indésirables sur l'activité et l'attention chez les enfants »." };
const SWEETENER = { key: "sweetener", level: "modere", reason: "Édulcorant de synthèse. Des études observationnelles (cohorte NutriNet-Santé, 2022) associent leur consommation à un risque cardiovasculaire accru." };
const EMULSIFIER = { key: "emulsifier", level: "modere", reason: "Émulsifiant ou épaississant associé, dans des études récentes (NutriNet-Santé 2023-2024), à une inflammation intestinale et un risque cardiovasculaire." };
const PHOSPHATE = { key: "phosphate", level: "modere", reason: "Phosphate ajouté : un apport excessif est associé à des risques cardiovasculaires et rénaux (EFSA, 2019)." };
const SULFITE = { key: "sulfite", level: "modere", reason: "Sulfite : allergène, peut provoquer des réactions chez les personnes sensibles, en particulier asthmatiques." };

export const ADDITIVE_RISK = {
  e249: { key: "e249", name: "Nitrite de potassium", ...NITRITES },
  e250: { key: "e250", name: "Nitrite de sodium", ...NITRITES },
  e251: { key: "e251", name: "Nitrate de sodium", ...NITRITES },
  e252: { key: "e252", name: "Nitrate de potassium", ...NITRITES },
  e171: { key: "e171", name: "Dioxyde de titane", level: "eleve", reason: "Interdit comme additif alimentaire dans l'UE depuis 2022 : l'EFSA ne peut exclure un effet génotoxique." },
  e102: { key: "e102", name: "Tartrazine", ...SOUTHAMPTON },
  e104: { key: "e104", name: "Jaune de quinoléine", ...SOUTHAMPTON },
  e110: { key: "e110", name: "Jaune orangé S", ...SOUTHAMPTON },
  e122: { key: "e122", name: "Azorubine", ...SOUTHAMPTON },
  e124: { key: "e124", name: "Rouge cochenille A", ...SOUTHAMPTON },
  e129: { key: "e129", name: "Rouge allura AC", ...SOUTHAMPTON },
  e150c: { key: "e150c", name: "Caramel ammoniacal", level: "modere", reason: "Peut contenir du 4-MEI, classé cancérogène possible par le CIRC (groupe 2B)." },
  e150d: { key: "e150d", name: "Caramel au sulfite d'ammonium", level: "modere", reason: "Peut contenir du 4-MEI, classé cancérogène possible par le CIRC (groupe 2B)." },
  e320: { key: "e320", name: "BHA", level: "modere", reason: "Antioxydant classé cancérogène possible par le CIRC (groupe 2B)." },
  e321: { key: "e321", name: "BHT", level: "modere", reason: "Antioxydant suspecté de perturber le système endocrinien." },
  e951: { name: "Aspartame", ...SWEETENER, key: "e951", reason: "Classé cancérogène possible par le CIRC en 2023 (groupe 2B). Édulcorant associé à un risque cardiovasculaire dans la cohorte NutriNet-Santé." },
  e950: { key: "e950", name: "Acésulfame K", ...SWEETENER },
  e952: { key: "e952", name: "Cyclamate", ...SWEETENER },
  e954: { key: "e954", name: "Saccharine", ...SWEETENER },
  e955: { key: "e955", name: "Sucralose", ...SWEETENER },
  e407: { key: "e407", name: "Carraghénanes", ...EMULSIFIER },
  e407a: { key: "e407a", name: "Algues Eucheuma transformées", ...EMULSIFIER },
  e433: { key: "e433", name: "Polysorbate 80", ...EMULSIFIER },
  e466: { key: "e466", name: "Carboxyméthylcellulose", ...EMULSIFIER },
  e471: { key: "e471", name: "Mono- et diglycérides d'acides gras", level: "limite", reason: "Émulsifiant très courant ; des études observationnelles récentes l'associent à un risque cardiovasculaire légèrement accru." },
  e211: { key: "e211", name: "Benzoate de sodium", level: "modere", reason: "Peut former du benzène, cancérogène, en présence de vitamine C." },
  e220: { key: "e220", name: "Dioxyde de soufre", ...SULFITE },
  e221: { key: "e221", name: "Sulfite de sodium", ...SULFITE },
  e222: { key: "e222", name: "Bisulfite de sodium", ...SULFITE },
  e223: { key: "e223", name: "Disulfite de sodium", ...SULFITE },
  e224: { key: "e224", name: "Disulfite de potassium", ...SULFITE },
  e228: { key: "e228", name: "Bisulfite de potassium", ...SULFITE },
  e338: { key: "e338", name: "Acide phosphorique", ...PHOSPHATE },
  e339: { key: "e339", name: "Phosphates de sodium", ...PHOSPHATE },
  e340: { key: "e340", name: "Phosphates de potassium", ...PHOSPHATE },
  e341: { key: "e341", name: "Phosphates de calcium", ...PHOSPHATE },
  e450: { key: "e450", name: "Diphosphates", ...PHOSPHATE },
  e451: { key: "e451", name: "Triphosphates", ...PHOSPHATE },
  e452: { key: "e452", name: "Polyphosphates", ...PHOSPHATE },
  e621: { key: "e621", name: "Glutamate monosodique", level: "limite", reason: "Exhausteur de goût ; l'EFSA a fixé en 2017 une dose journalière admissible que certains gros consommateurs dépassent." },
};

function riskKey(tag) {
  const m = String(tag).toLowerCase().match(/e(\d{3,4})([a-z]*)/);
  if (!m) return null;
  const full = "e" + m[1] + m[2];
  if (ADDITIVE_RISK[full]) return full;
  const base = "e" + m[1];
  return ADDITIVE_RISK[base] ? base : null;
}

export function additiveRisks(product) {
  const seen = new Set();
  const out = [];
  for (const tag of product.additives_tags || []) {
    const k = riskKey(tag);
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push({ code: k.toUpperCase(), ...ADDITIVE_RISK[k] });
  }
  const order = { eleve: 0, modere: 1, limite: 2 };
  return out.sort((a, b) => order[a.level] - order[b.level]);
}

// ---------------------------------------------------------------------------
// Nutrition
// ---------------------------------------------------------------------------
const num = (v) => (v === undefined || v === null || v === "" || isNaN(Number(v)) ? null : Number(v));

export function isDrink(product) {
  const cats = product.categories_tags || [];
  return cats.includes("en:beverages") && !cats.includes("en:dairies");
}

// [faible max, élevé min] pour 100 g / 100 ml
const LIMITS = {
  food: { energy: [160, 360], sugars: [5, 22.5], "saturated-fat": [1.5, 5], salt: [0.3, 1.5] },
  drink: { energy: [14, 35], sugars: [2.5, 11.25], "saturated-fat": [0.75, 2.5], salt: [0.3, 0.75] },
};

const NUTRIENTS = [
  { id: "energy", key: "energy-kcal_100g", unit: "kcal", name: "Calories",
    text: { faible: "Peu calorique", modere: "Un peu trop calorique", eleve: "Trop calorique" } },
  { id: "sugars", key: "sugars_100g", unit: "g", name: "Sucres",
    text: { faible: "Peu de sucre", modere: "Un peu trop sucré", eleve: "Trop sucré" } },
  { id: "saturated-fat", key: "saturated-fat_100g", unit: "g", name: "Graisses saturées",
    text: { faible: "Peu de graisses saturées", modere: "Un peu trop de graisses saturées", eleve: "Trop de graisses saturées" } },
  { id: "salt", key: "salt_100g", unit: "g", name: "Sel",
    text: { faible: "Peu de sel", modere: "Un peu trop salé", eleve: "Trop salé" } },
];

export function nutrition(product) {
  const n = product.nutriments || {};
  const drink = isDrink(product);
  const limits = drink ? LIMITS.drink : LIMITS.food;
  const negatives = [];
  const positives = [];

  for (const nut of NUTRIENTS) {
    let v = num(n[nut.key]);
    if (nut.id === "energy" && v === null && num(n["energy_100g"]) !== null) v = num(n["energy_100g"]) / 4.184; // kJ -> kcal
    if (v === null) continue;
    const [lo, hi] = limits[nut.id];
    const level = v <= lo ? "faible" : v > hi ? "eleve" : "modere";
    const item = { id: nut.id, name: nut.name, value: v, unit: nut.unit, level, text: nut.text[level], max: hi * 1.6 };
    (level === "faible" ? positives : negatives).push(item);
  }

  const protein = num(n["proteins_100g"]);
  if (protein !== null && protein >= 8 && !drink)
    positives.push({ id: "proteins", name: "Protéines", value: protein, unit: "g", level: "bon", text: "Excellente quantité de protéines", max: 20 });
  const fiber = num(n["fiber_100g"]);
  if (fiber !== null && fiber >= 3)
    positives.push({ id: "fiber", name: "Fibres", value: fiber, unit: "g", level: "bon", text: fiber >= 6 ? "Excellente quantité de fibres" : "Bonne quantité de fibres", max: 10 });
  const fv = num(n["fruits-vegetables-nuts-estimate-from-ingredients_100g"]) ?? num(n["fruits-vegetables-legumes-estimate-from-ingredients_100g"]);
  if (fv !== null && fv >= 40)
    positives.push({ id: "fruits", name: "Fruits et légumes", value: fv, unit: "%", level: "bon", text: "Riche en fruits ou légumes", max: 100 });

  const sev = { eleve: 0, modere: 1 };
  negatives.sort((a, b) => sev[a.level] - sev[b.level]);
  return { drink, negatives, positives, per: drink ? "100 ml" : "100 g" };
}

// ---------------------------------------------------------------------------
// Allergènes, transformation, bio
// ---------------------------------------------------------------------------
const ALLERGENS = {
  "en:gluten": "Gluten", "en:milk": "Lait", "en:eggs": "Œufs", "en:nuts": "Fruits à coque",
  "en:peanuts": "Arachides", "en:soybeans": "Soja", "en:fish": "Poisson", "en:crustaceans": "Crustacés",
  "en:molluscs": "Mollusques", "en:celery": "Céleri", "en:mustard": "Moutarde", "en:sesame-seeds": "Sésame",
  "en:sulphur-dioxide-and-sulphites": "Sulfites", "en:lupin": "Lupin",
};
export function allergens(product) {
  return [...new Set((product.allergens_tags || []).map((t) => ALLERGENS[t]).filter(Boolean))];
}
export function allergenTags(product) {
  return [...new Set((product.allergens_tags || []).filter((t) => ALLERGENS[t]))];
}

const NOVA = {
  1: { label: "Brut ou peu transformé", text: "Aliment non transformé ou très peu (fruits, légumes, lait, viande fraîche…)." },
  2: { label: "Ingrédient culinaire", text: "Ingrédient transformé utilisé en cuisine (huile, beurre, sucre, sel…)." },
  3: { label: "Transformé", text: "Aliment transformé avec quelques ingrédients (conserves, fromages, pain…)." },
  4: { label: "Ultra-transformé", text: "Formulation industrielle avec additifs ou ingrédients rarement utilisés en cuisine. À limiter." },
};
export function nova(product) {
  const g = num(product.nova_group);
  return g && NOVA[g] ? { group: g, ...NOVA[g] } : null;
}

export function isOrganic(product) {
  const tags = product.labels_tags || [];
  return tags.some((t) => /^(en:organic|en:eu-organic|fr:ab-agriculture-biologique|en:ab-agriculture-biologique)$/.test(t));
}

// ---------------------------------------------------------------------------
// Note globale
// ---------------------------------------------------------------------------
export function healthScore(product) {
  const grade = String(product.nutriscore_grade || product.nutrition_grades || "").toLowerCase();
  if (!(grade in GRADE_POINTS)) return null;

  const risks = additiveRisks(product);
  const high = risks.some((r) => r.level === "eleve");
  let additivesPts = 30;
  for (const r of risks) additivesPts -= r.level === "eleve" ? 30 : r.level === "modere" ? 10 : 4;
  additivesPts = Math.max(0, additivesPts);
  const bioPts = isOrganic(product) ? 10 : 0;

  let score = GRADE_POINTS[grade] + additivesPts + bioPts;
  if (high) score = Math.min(score, 49);
  score = Math.max(0, Math.min(100, Math.round(score)));
  const g = HEALTH_GRADES.find((x) => score >= x.min);
  return {
    score,
    grade: g.id,
    label: g.label,
    nutriscore: grade,
    parts: { nutrition: GRADE_POINTS[grade], additives: additivesPts, bio: bioPts },
  };
}

export function analyzeHealth(product) {
  return {
    score: healthScore(product),
    nutrition: nutrition(product),
    additives: additiveRisks(product),
    allergens: allergens(product),
    allergenTags: allergenTags(product),
    nova: nova(product),
    organic: isOrganic(product),
  };
}
