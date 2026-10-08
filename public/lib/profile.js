// Profil personnel : allergies et régime. Comparé à chaque produit pour afficher une alerte.
// Les allergènes viennent d'Open Food Facts (allergens_tags = contient, traces_tags = traces possibles).

export const PROFILE_ALLERGENS = [
  "en:gluten", "en:milk", "en:eggs", "en:nuts", "en:peanuts", "en:soybeans", "en:fish", "en:crustaceans",
  "en:molluscs", "en:celery", "en:mustard", "en:sesame-seeds", "en:sulphur-dioxide-and-sulphites", "en:lupin",
];
export const DIETS = ["vegetarian", "vegan"];
export const EMPTY_PROFILE = { allergens: [], diet: null };

const MEAT_FLAGS = ["porc", "viande", "extrait_viande", "sang", "gelatine", "e441", "e542", "enzymes_animales", "e120", "e904",
  "cosm_porc", "cosm_gelatine", "cosm_suif", "cosm_carmin", "cosm_animal"];

export const hasProfile = (profile) => !!(profile && ((profile.allergens && profile.allergens.length) || profile.diet));

// raw : fiche brute (allergens_tags, traces_tags, ingredients_analysis_tags) ; verdict : sortie de classify.
// Résultat : { contains, traces, diet: null | { id, level: "no" | "maybe" }, alert: "no" | "maybe" | null }
export function checkProfile(raw, verdict, profile) {
  const out = { contains: [], traces: [], diet: null, alert: null };
  if (!hasProfile(profile) || !raw || raw.kind === "medicine") return out;
  const mine = new Set(profile.allergens || []);
  const contains = new Set((raw.allergens_tags || []).filter((t) => mine.has(t)));
  out.contains = [...contains];
  out.traces = [...new Set((raw.traces_tags || []).filter((t) => mine.has(t) && !contains.has(t)))];

  if (profile.diet) {
    const a = raw.ingredients_analysis_tags || [];
    const animal = ((verdict && verdict.flags) || []).some((f) => MEAT_FLAGS.includes(f.id) && f.severity !== "info");
    if (profile.diet === "vegetarian") {
      if (a.includes("en:non-vegetarian") || animal) out.diet = { id: "vegetarian", level: "no" };
      else if (a.includes("en:maybe-vegetarian")) out.diet = { id: "vegetarian", level: "maybe" };
    } else if (profile.diet === "vegan") {
      if (a.includes("en:non-vegan") || a.includes("en:non-vegetarian") || animal) out.diet = { id: "vegan", level: "no" };
      else if (a.includes("en:maybe-vegan")) out.diet = { id: "vegan", level: "maybe" };
    }
  }
  if (out.contains.length || (out.diet && out.diet.level === "no")) out.alert = "no";
  else if (out.traces.length || out.diet) out.alert = "maybe";
  return out;
}
