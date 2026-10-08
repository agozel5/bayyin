// Sources publiques sur lesquelles s'appuie chaque verdict.
// Le rôle de chaque source est traduit (clé src.<id>) ; les noms propres ne le sont pas.

export const SOURCES = [
  // Données produits
  { id: "off", group: "data", kind: "database", name: "Open Food Facts", url: "https://world.openfoodfacts.org" },
  { id: "obf", group: "data", kind: "database", name: "Open Beauty Facts", url: "https://world.openbeautyfacts.org" },
  { id: "bdpm", group: "data", kind: "database", name: "Base de données publique des médicaments", url: "https://base-donnees-publique.medicaments.gouv.fr" },
  // Santé et additifs
  { id: "efsa", group: "health", kind: "agency", name: "EFSA", url: "https://www.efsa.europa.eu" },
  { id: "anses", group: "health", kind: "agency", name: "ANSES", url: "https://www.anses.fr" },
  { id: "iarc", group: "health", kind: "agency", name: "CIRC / IARC (OMS)", url: "https://monographs.iarc.who.int/agents-classified-by-the-iarc/" },
  { id: "jecfa", group: "health", kind: "agency", name: "JECFA (FAO / OMS)", url: "https://apps.who.int/food-additives-contaminants-jecfa-database/" },
  { id: "eu_additives", group: "health", kind: "law", name: "Règlement (CE) 1333/2008", url: "https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:32008R1333" },
  { id: "eu_labelling", group: "health", kind: "law", name: "Règlement (UE) 1169/2011", url: "https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:32011R1169" },
  { id: "fda", group: "health", kind: "agency", name: "FDA", url: "https://www.fda.gov" },
  { id: "nutriscore", group: "health", kind: "study", name: "Nutri-Score (Santé publique France)", url: "https://www.santepubliquefrance.fr/determinants-de-sante/nutrition-et-activite-physique/articles/nutri-score" },
  { id: "fsa", group: "health", kind: "agency", name: "Food Standards Agency", url: "https://www.food.gov.uk" },
  { id: "nova", group: "health", kind: "study", name: "NOVA", url: "https://world.openfoodfacts.org/nova" },
  { id: "nutrinet", group: "health", kind: "study", name: "NutriNet-Santé", url: "https://etude-nutrinet-sante.fr" },
  // Halal
  { id: "quran", group: "halal", kind: "text", name: "Coran 2:173, 5:3, 5:90", url: "https://quran.com/5/3" },
];

export const SOURCE_BY_ID = Object.fromEntries(SOURCES.map((s) => [s.id, s]));

// Explication d'un additif à risque (clé de health.js) -> sources
export const RISK_SOURCES = {
  nitrites: ["anses", "iarc"],
  e171: ["efsa"],
  southampton: ["eu_additives", "efsa"],
  e150c: ["iarc"],
  e150d: ["iarc"],
  e320: ["iarc"],
  e321: ["efsa"],
  e951: ["iarc", "jecfa"],
  sweetener: ["nutrinet"],
  emulsifier: ["nutrinet"],
  e471: ["nutrinet"],
  e211: ["fda"],
  sulfite: ["eu_labelling"],
  phosphate: ["efsa"],
  e621: ["efsa"],
};

// Signalement halal -> sources (seuls les interdits explicites ont un texte de référence)
export const FLAG_SOURCES = {
  porc: ["quran"],
  sang: ["quran"],
  alcool: ["quran"],
};
