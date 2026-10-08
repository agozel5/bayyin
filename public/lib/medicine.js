// Médicaments vendus en France : code-barres CIP13 (commence par 34009).
// Données : Base de données publique des médicaments (ANSM / HAS), réduite par
// scripts/build-medicaments.mjs en petits fichiers JSON (data/med/NN.json) :
//   { "<CIP13>": [nom, forme pharmaceutique, titulaire, CIS] }
// La base publique ne donne pas la liste des excipients : le verdict s'appuie sur la forme
// (une gélule a presque toujours une enveloppe en gélatine), et renvoie vers la notice officielle.

import { normalize, SCHOOLS, DEFAULT_PREFS, TOPIC_OF, SEVERITY_OF } from "./rules.js";

export const MED_DATA_BASE = "https://raw.githubusercontent.com/agozel5/bayyin/main/public/data/med/";
export const isMedicineCode = (code) => /^34009\d{8}$/.test(String(code || ""));
export const medShard = (code) => String(code).slice(-3, -1); // deux chiffres avant la clé de contrôle
export const medShardUrl = (code) => `${MED_DATA_BASE}${medShard(code)}.json`;
export const medNoticeUrl = (cis) => `https://base-donnees-publique.medicaments.gouv.fr/medicament/${cis}/extrait`;

// Fiche « brute » au même format que les autres produits, pour l'historique et les réglages.
export function medicineRaw(code, row) {
  const [name, form, holder, cis] = row;
  return { code, kind: "medicine", product_name: name, brands: holder || "", med_form: form || "", med_cis: cis || "" };
}

const FORM_RULES = [
  // Enveloppe en gélatine, sauf mention végétale (hypromellose, « végétale »)
  { id: "med_gelule", severity: "mashbouh", match: /\b(gelules?|capsules? molles?|capsules?)\b/, exclude: /\b(vegetale|hypromellose|hpmc|pullulan)\b/ },
  // Formes liquides à boire : l'éthanol est un excipient fréquent
  { id: "med_alcool", severity: "info", match: /\b(sirop|solution buvable|suspension buvable|gouttes buvables|elixir|teinture|solution pour pulverisation buccale)\b/ },
];

export function classifyMedicine(product, prefs = DEFAULT_PREFS) {
  const topics = { ...SCHOOLS.standard, ...((prefs && prefs.topics) || {}) };
  const form = normalize(product.med_form);
  const flags = [];
  for (const rule of FORM_RULES) {
    if (!rule.match.test(form) || (rule.exclude && rule.exclude.test(form))) continue;
    const f = { id: rule.id, severity: rule.severity, source: product.med_form };
    const topic = TOPIC_OF[rule.id];
    if (topic) {
      f.topic = topic;
      f.decision = topics[topic];
      // L'alcool d'un médicament reste une information : il ne change pas le verdict à lui seul.
      f.severity = rule.severity === "info" && f.decision !== "interdit" ? "info" : SEVERITY_OF[f.decision];
    }
    flags.push(f);
  }
  const status = flags.some((f) => f.severity === "haram") ? "haram" : flags.some((f) => f.severity === "mashbouh") ? "mashbouh" : "inconnu";
  const notes = [status === "inconnu" ? "med_excipients" : "med_notice", "med_necessity"];
  return { status, certification: null, flags, notes, vegan: false, vegetarian: false };
}
