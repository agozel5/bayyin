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
  // Cosmétiques
  { id: "sccs", group: "health", kind: "agency", name: "CSSC / SCCS (Commission européenne)", url: "https://health.ec.europa.eu/scientific-committees/scientific-committee-consumer-safety-sccs_en" },
  { id: "echa", group: "health", kind: "agency", name: "ECHA", url: "https://echa.europa.eu/fr/candidate-list-table" },
  { id: "ansm", group: "health", kind: "agency", name: "ANSM", url: "https://ansm.sante.fr" },
  { id: "eu_cosmetics", group: "health", kind: "law", name: "Règlement (CE) 1223/2009", url: "https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:02009R1223-20250501" },
  { id: "cir", group: "health", kind: "study", name: "Cosmetic Ingredient Review", url: "https://www.cir-safety.org" },
  // Halal
  { id: "quran", group: "halal", kind: "text", name: "Coran 2:173, 5:3, 5:90", url: "https://quran.com/5/3" },
  { id: "iifa", group: "halal", kind: "fatwa", name: "Académie internationale de fiqh (OCI)", url: "https://iifa-aifi.org/en/33099.html" },
  { id: "ecfr", group: "halal", kind: "fatwa", name: "Conseil européen de la fatwa et de la recherche", url: "https://www.e-cfr.org" },
  { id: "diyanet", group: "halal", kind: "fatwa", name: "Diyanet (Turquie)", url: "https://kurul.diyanet.gov.tr" },
  { id: "daralifta", group: "halal", kind: "fatwa", name: "Dar al-Ifta (Égypte)", url: "https://www.dar-alifta.org" },
  { id: "muftiwp", group: "halal", kind: "fatwa", name: "Mufti du Territoire fédéral (Malaisie)", url: "https://muftiwp.gov.my" },
  { id: "mui", group: "halal", kind: "fatwa", name: "Majelis Ulama Indonesia (MUI)", url: "https://halalmui.org" },
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
  alcool: ["quran", "iifa"],
  gelatine: ["iifa", "diyanet", "muftiwp"],
  e441: ["iifa", "diyanet", "muftiwp"],
  viande: ["ecfr", "iifa"],
  e120: ["muftiwp", "mui"],
  cosm_carmin: ["muftiwp", "mui"],
  ethanol_support: ["iifa", "muftiwp"],
  e1510: ["iifa", "muftiwp"],
  alcool_naturel: ["muftiwp", "mui"],
  boissons_desalcoolisees: ["muftiwp", "mui"],
  cosm_alcool: ["iifa", "daralifta", "muftiwp"],
  cosm_suif: ["iifa", "muftiwp"],
  plasma: ["iifa"],
  med_porcin: ["iifa"],
  med_gelule: ["iifa", "daralifta"],
  e920: ["ecfr"],
  fruits_de_mer: ["muftiwp"],
  grenouille: ["muftiwp"],
  cheval: ["muftiwp"],
  ane: ["quran"],
};
