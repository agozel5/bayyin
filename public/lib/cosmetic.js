// Note des cosmétiques sur 100, dans l'esprit de Yuka : elle repose uniquement sur la liste
// des ingrédients (nomenclature INCI). Chaque ingrédient controversé reçoit un niveau de risque,
// établi à partir d'avis publics (CSSC/SCCS de la Commission européenne, règlement cosmétique
// (CE) 1223/2009, ECHA, CIRC, ANSES, ANSM). C'est un signal, pas un diagnostic.
//
// Calcul :
//   départ à 100
//   risque élevé  : −35 par ingrédient, et la note ne dépasse pas 40
//   risque modéré : −15 par ingrédient, et la note ne dépasse pas 70
//   risque limité :  −6 par ingrédient (−30 au plus en tout)
// Pas de liste d'ingrédients => pas de note (on n'invente pas de chiffre).
//
// Les explications sont traduites par l'interface (clés cosm.<key>.t et cosm.<key>.p).

import { normalize, segments, ingredientsText } from "./rules.js";
import { HEALTH_GRADES } from "./health.js";

export const COSMETIC_PENALTY = { eleve: 35, modere: 15, limite: 6 };
export const COSMETIC_CAP = { eleve: 40, modere: 70 };
const LIMITED_MAX = 30;

// Ordre : du plus grave au moins grave ; un ingrédient n'est compté qu'une fois (première règle trouvée).
// inci : nom affiché quand le segment ne suffit pas à reconnaître l'ingrédient.
export const COSMETIC_RULES = [
  // --- Risque élevé ---
  { key: "banned", level: "eleve", sources: ["eu_cosmetics"],
    match: /\b(butylphenyl methylpropional|lilial|hydroxyisohexyl 3-cyclohexene carboxaldehyde|lyral|zinc pyrithione|hydroquinone|dibutyl phthalate|isopropylparaben|isobutylparaben|phenylparaben|benzylparaben|pentylparaben|4-methylbenzylidene camphor|enzacamene)\b/ },
  { key: "paraben_long", level: "eleve", sources: ["sccs", "eu_cosmetics"],
    match: /\b(sodium |potassium )?(propyl|butyl) ?paraben\b|\b(propyl|butyl) (4-)?hydroxybenzoate\b/ },
  { key: "formaldehyde", level: "eleve", sources: ["iarc", "eu_cosmetics"],
    match: /\b(formaldehyde|paraformaldehyde|methylene glycol|dmdm hydantoin|imidazolidinyl urea|diazolidinyl urea|quaternium-15|bromo-2-nitropropane|bronopol|sodium hydroxymethylglycinate|bromo-5-nitro|methenamine)\b/ },
  { key: "isothiazolinone", level: "eleve", sources: ["sccs", "eu_cosmetics"],
    match: /\b(methylchloroisothiazolinone|methylisothiazolinone|benzisothiazolinone|octylisothiazolinone)\b/ },
  { key: "triclosan", level: "eleve", sources: ["sccs", "echa"],
    match: /\b(triclosan|triclocarban)\b/ },
  { key: "bha", level: "eleve", sources: ["iarc", "echa"],
    match: /\b(bha|butylated hydroxyanisole)\b/ },
  { key: "benzophenone", level: "eleve", sources: ["sccs", "eu_cosmetics"],
    match: /\b(benzophenone-[123]|oxybenzone)\b/ },

  // --- Risque modéré ---
  { key: "uv_filter", level: "modere", sources: ["sccs", "eu_cosmetics"],
    match: /\b(homosalate|octocrylene|ethylhexyl methoxycinnamate|octinoxate|octyl methoxycinnamate)\b/ },
  { key: "siloxane", level: "modere", sources: ["echa"],
    match: /\b(cyclotetrasiloxane|cyclopentasiloxane|cyclohexasiloxane|cyclomethicone)\b/ },
  { key: "aluminium", level: "modere", sources: ["sccs", "ansm"],
    match: /\b(alumin(i)?um (chlorohydrate|sesquichlorohydrate|chloride|zirconium[\w -]*)|alumin(i)?um zirconium|aluminum chlorohydrex|alumin(i)?um chlorohydrex)\b/ },
  { key: "talc", level: "modere", sources: ["iarc"],
    match: /\b(talc|talcum)\b/ },
  { key: "resorcinol", level: "modere", sources: ["anses"],
    match: /\bresorcinol\b/, exclude: /\b(methylresorcinol|hexylresorcinol|phenylethyl resorcinol|butylresorcinol)\b/ },
  { key: "ppd", level: "modere", sources: ["sccs"],
    match: /\b(p-phenylenediamine|paraphenylenediamine|toluene-2,?5-diamine)\b/ },
  { key: "dea", level: "modere", sources: ["iarc"],
    match: /\b(cocamide dea|lauramide dea|oleamide dea|diethanolamine)\b/ },

  // --- Risque limité ---
  { key: "paraben_short", level: "limite", sources: ["sccs"],
    match: /\b(sodium )?(methyl|ethyl) ?paraben\b|\b(methyl|ethyl) (4-)?hydroxybenzoate\b/ },
  { key: "bht", level: "limite", sources: ["sccs"],
    match: /\b(bht|butylated hydroxytoluene)\b/ },
  { key: "phenoxyethanol", level: "limite", sources: ["ansm"],
    match: /\bphenoxyethanol\b/ },
  { key: "sulfate", level: "limite", sources: ["cir"],
    match: /\b(sodium|ammonium|tea|mea|magnesium) lauryl sulfate\b|\bsodium coco-?sulfate\b/ },
  { key: "ethoxylated", level: "limite", sources: ["iarc"],
    match: /\b(peg|ppg)-\d+|\b\w*eth-\d+\b|\blaureth sulfate\b|\bpolysorbate[ -]?\d+|\bpolyethylene glycol\b/ },
  { key: "mineral_oil", level: "limite", sources: ["efsa", "anses"],
    match: /\b(paraffinum liquidum|mineral oil|petrolatum|vaseline|paraffin|cera microcristallina|microcrystalline wax|ozokerite|ceresin)\b/ },
  { key: "microplastic", level: "limite", sources: ["echa"],
    match: /\b(polyethylene|nylon-\d+|polymethyl methacrylate|polypropylene|polyethylene terephthalate)\b/, exclude: /\bglycol\b/ },
  { key: "fragrance_allergen", level: "limite", sources: ["eu_cosmetics", "sccs"],
    match: /\b(limonene|linalool|citronellol|geraniol|citral|coumarin|eugenol|isoeugenol|cinnamal|cinnamyl alcohol|hydroxycitronellal|amyl cinnamal|amylcinnamyl alcohol|hexyl cinnamal|benzyl salicylate|benzyl benzoate|benzyl cinnamate|benzyl alcohol|farnesol|anise alcohol|alpha-isomethyl ionone|evernia prunastri|evernia furfuracea|methyl 2-octynoate)\b/ },
  { key: "fragrance", level: "limite", sources: ["sccs"],
    match: /^(parfum|fragrance|perfume|parfum \/ fragrance|fragrance \/ parfum)$/ },
];

// Nom d'ingrédient lisible à partir du segment trouvé (« sodium lauryl sulfate » -> « Sodium Lauryl Sulfate »)
function inciName(seg) {
  return seg.replace(/\s*\*+$/, "")
    .replace(/(^|[\s/-])([a-z])/g, (m, a, b) => a + b.toUpperCase())
    .replace(/\b(Peg|Ppg|Bht|Bha|Dea|Mea|Tea|Dmdm)\b/g, (m) => m.toUpperCase())
    .slice(0, 60);
}

/** Ingrédients controversés trouvés dans la liste, du plus grave au moins grave. */
export function cosmeticRisks(product) {
  const out = [];
  const seenSeg = new Set();
  for (const seg of segments(ingredientsText(product))) {
    if (seenSeg.has(seg)) continue;
    for (const rule of COSMETIC_RULES) {
      if (!rule.match.test(seg) || (rule.exclude && rule.exclude.test(seg))) continue;
      seenSeg.add(seg);
      if (rule.key === "fragrance" && out.some((r) => r.key === "fragrance")) break; // « Parfum (Fragrance) »
      out.push({ key: rule.key, level: rule.level, name: inciName(seg), sources: rule.sources });
      break;
    }
  }
  const order = { eleve: 0, modere: 1, limite: 2 };
  return out.sort((a, b) => order[a.level] - order[b.level]);
}

export function cosmeticScore(product, risks = cosmeticRisks(product)) {
  if (!normalize(ingredientsText(product)).trim()) return null;
  let penalty = 0, limited = 0;
  for (const r of risks) {
    if (r.level === "limite") limited += COSMETIC_PENALTY.limite;
    else penalty += COSMETIC_PENALTY[r.level];
  }
  let score = 100 - penalty - Math.min(limited, LIMITED_MAX);
  if (risks.some((r) => r.level === "eleve")) score = Math.min(score, COSMETIC_CAP.eleve);
  else if (risks.some((r) => r.level === "modere")) score = Math.min(score, COSMETIC_CAP.modere);
  score = Math.max(0, Math.min(100, Math.round(score)));
  const g = HEALTH_GRADES.find((x) => score >= x.min);
  const count = (lv) => risks.filter((r) => r.level === lv).length;
  return { score, grade: g.id, label: g.label, parts: { eleve: count("eleve"), modere: count("modere"), limite: count("limite") } };
}

// Même forme que analyzeHealth (champ score) : listes, comparaison et alternatives en profitent sans rien changer.
export function analyzeCosmetic(product) {
  const risks = cosmeticRisks(product);
  return {
    cosmetic: true,
    score: cosmeticScore(product, risks),
    risks,
    analyzed: segments(ingredientsText(product)).length,
  };
}
