// Cosmétiques et hygiène (données Open Beauty Facts, même format qu'Open Food Facts).
// Les ingrédients suivent la nomenclature INCI (noms latins ou anglais), d'où des règles propres.
// Question halal pour un produit appliqué sur la peau : origine animale (porc, animal non sacrifié)
// et pureté (alcool, selon l'école). Les textes sont traduits par l'interface (clés flag.<id>.*).

import { normalize, segments, detectCertification, ingredientsText, SCHOOLS, DEFAULT_PREFS, TOPIC_OF, SEVERITY_OF } from "./rules.js";

export const BEAUTY_RULES = [
  {
    id: "cosm_porc", severity: "haram",
    label: "Dérivé de porc",
    match: /\b(porcine?|sus scrofa|adeps suillus|lard|pork|pig|swine|porc|domuz)\b|خنزير/,
  },
  {
    id: "cosm_gelatine", severity: "mashbouh",
    label: "Gélatine / collagène",
    match: /\b(gelatine?|gelatin|hydrolyzed collagen|collagen|collagene|soluble collagen|atelocollagen)\b/,
    exclude: /\b(marine|fish|poisson|vegan|vegetal|plant|algae|fungal)\b/,
  },
  {
    id: "cosm_suif", severity: "mashbouh",
    label: "Suif (graisse de bœuf)",
    match: /\b(tallow\w*|sodium tallowate|suif|adeps bovis|beef fat|tallowamide|tallow acid)\b/,
  },
  {
    id: "cosm_carmin", severity: "mashbouh",
    label: "Carmin (CI 75470)",
    match: /\b(ci ?75470|carmine?|cochineal|cochenille|carminic acid)\b/,
  },
  {
    id: "cosm_animal", severity: "mashbouh",
    label: "Ingrédient d'origine animale",
    match: /\b(keratin|keratine|hydrolyzed keratin|elastin|elastine|placenta\w*|squalene|shark liver|musk|civet|castoreum|animal fat|graisse animale)\b/,
    exclude: /\b(vegetal|plant|olive|amaranth|vegan|phyto)\b/,
  },
  {
    // « Alcohol » seul ou dénaturé, éthanol. Les alcools gras (cetyl, cetearyl, stearyl…) ne sont pas
    // de l'alcool éthylique : ce sont des cires, généralement végétales, sans question halal.
    id: "cosm_alcool", severity: "mashbouh",
    label: "Alcool (éthanol)",
    match: /\b(alcohol denat|alcool denature|sd alcohol|ethanol|ethyl alcohol|alcohol|alcool)\b/,
    exclude: /\b(cetyl|cetearyl|stearyl|behenyl|benzyl|lanolin|myristyl|lauryl|oleyl|isostearyl|arachidyl|phenethyl|polyvinyl|caprylyl|isopropyl|propyl|butyl|amyl|octyldodecanol|alcohol free|sans alcool|alkolsuz)\b/,
  },
];

const ANIMAL_IDS = ["cosm_porc", "cosm_gelatine", "cosm_suif", "cosm_carmin", "cosm_animal"];

export function isVeganBeauty(product) {
  const tags = [...(product.labels_tags || []), ...(product.ingredients_analysis_tags || [])].map(String);
  return tags.some((t) => /(^|:)vegan$/.test(t));
}

export function classifyBeauty(product, prefs = DEFAULT_PREFS) {
  const topics = { ...SCHOOLS.standard, ...((prefs && prefs.topics) || {}) };
  const text = ingredientsText(product);
  const vegan = isVeganBeauty(product);
  const flags = [];
  const seen = new Set();

  for (const seg of segments(text)) {
    for (const rule of BEAUTY_RULES) {
      if (seen.has(rule.id) || !rule.match.test(seg)) continue;
      if (rule.exclude && rule.exclude.test(seg)) continue;
      if (vegan && ANIMAL_IDS.includes(rule.id)) continue; // label végan : pas d'ingrédient animal
      seen.add(rule.id);
      const f = { id: rule.id, severity: rule.severity, label: rule.label, source: seg };
      const topic = TOPIC_OF[rule.id];
      if (topic) {
        f.topic = topic;
        f.decision = topics[topic];
        f.severity = SEVERITY_OF[f.decision];
      }
      flags.push(f);
    }
  }

  const certification = detectCertification(product);
  const notes = [];
  let status;
  if (flags.some((f) => f.severity === "haram")) {
    status = "haram";
    if (certification) notes.push("cert_conflict");
  } else if (certification) {
    status = "halal_certifie";
  } else if (flags.some((f) => f.severity === "mashbouh")) {
    status = "mashbouh";
  } else if (!normalize(text).trim()) {
    status = "inconnu";
    notes.push("no_ingredients");
  } else {
    status = "halal_probable";
    if (vegan) notes.push("vegan_beauty");
    notes.push("beauty_external");
  }
  const order = { haram: 0, mashbouh: 1, info: 2 };
  const final = flags
    .map((f) => (status === "halal_certifie" && f.severity === "mashbouh" ? { ...f, severity: "info", covered: true } : f))
    .sort((a, b) => order[a.severity] - order[b.severity]);
  return { status, certification, flags: final, notes, vegan, vegetarian: vegan };
}
