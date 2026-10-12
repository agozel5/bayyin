// Fiches des organismes de certification halal reconnus sur les étiquettes.
// Bayyin ne classe pas les organismes : la fiche donne des faits vérifiables, et l'utilisateur
// choisit ceux qu'il suit (réglage « distrust » : ceux qu'il ne suit pas).
// Textes : clés de traduction cert.<id>.d ; site : seulement les adresses vérifiées.

export const CERTIFIER_INFO = [
  { id: "avs", name: "AVS", country: "FR", site: "https://avs.fr/" },
  { id: "achahada", name: "Achahada", country: "FR" },
  { id: "paris", name: "Grande Mosquée de Paris", country: "FR" },
  { id: "argml", name: "Mosquée de Lyon (ARGML)", country: "FR" },
  { id: "evry", name: "Mosquée d'Évry", country: "FR" },
  { id: "hmc", name: "HMC", country: "GB" },
  { id: "hfa", name: "HFA", country: "GB" },
  { id: "halal_correct", name: "Halal Correct", country: "NL" },
  { id: "gimdes", name: "GİMDES", country: "TR" },
  { id: "tse", name: "TSE Helal", country: "TR" },
  { id: "jakim", name: "JAKIM", country: "MY" },
  { id: "muis", name: "MUIS", country: "SG" },
  { id: "ifanca", name: "IFANCA", country: "US" },
];

export const searchUrl = (c) => c.site || `https://duckduckgo.com/?q=${encodeURIComponent(`${c.name} certification halal`)}`;
