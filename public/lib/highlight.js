// Lecture de l'étiquette : la vraie liste d'ingrédients, avec les passages qui posent question
// surlignés à l'endroit exact où ils apparaissent (comme un correcteur d'orthographe).
//
// Entrée : le texte tel qu'imprimé (Open Food Facts met les allergènes entre _underscores_),
// les signalements du verdict halal (rules.js) et les additifs à risque santé (health.js).
// Sortie : une suite de morceaux à afficher :
//   { t: "text", text }                         texte ordinaire
//   { t: "allergen", text }                     allergène marqué par le fabricant
//   { t: "hl", text, kind, flags, risk }        passage surligné ; kind : haram | mashbouh | info | risk
import { normalize, TEXT_RULES } from "./rules.js";

// Mêmes séparateurs que segments() dans rules.js : un passage surligné = un ingrédient
const SEP = /([,;()[\]{}•·\n،؛]|\.\s|\s-\s|:\s)/;
const RANK = { haram: 3, mashbouh: 2, risk: 1, info: 0 };
const CODE = /\b[Ee] ?-?(\d{3,4}[a-fA-F]?)\b/g;

const base = (k) => (k.match(/^e\d+/) || [k])[0];

export function readLabel(text, { flags = [], risks = [] } = {}) {
  const out = [];
  if (!text) return out;
  // Signalements trouvés dans le texte (pas ceux venant seulement des codes d'additifs)
  const textFlags = flags.filter((f) => f.source && !f.code);
  const pieces = String(text).split(SEP);
  for (let i = 0; i < pieces.length; i++) {
    const piece = pieces[i];
    if (!piece) continue;
    if (i % 2 === 1) { out.push({ t: "text", text: piece }); continue; } // séparateur
    const n = normalize(piece);
    // Même lecture que le verdict : la première règle qui reconnaît l'ingrédient. Ainsi un même
    // signalement (porc) est surligné partout où il apparaît (« viande de porc », « boyau de porc »).
    const rule = n && TEXT_RULES.find((r) => r.match.test(n) && !(r.exclude && r.exclude.test(n)));
    const hits = rule ? textFlags.filter((f) => f.id === rule.id || f.id === rule.also) : [];
    if (hits.length) {
      // L'ingrédient entier est surligné ; les espaces autour restent du texte ordinaire
      const m = piece.match(/^(\s*)([\s\S]*?)([\s.]*)$/);
      if (m[1]) out.push({ t: "text", text: m[1] });
      const kind = hits.reduce((k, f) => (RANK[f.severity] > RANK[k] ? f.severity : k), "info");
      out.push({ t: "hl", text: m[2].replace(/_/g, ""), kind, flags: hits, risk: null });
      if (m[3]) out.push({ t: "text", text: m[3] });
      continue;
    }
    pushCodes(out, piece, flags, risks);
  }
  return merge(out);
}

// Codes E dans un ingrédient : surlignés seuls (« émulsifiant : E471 »)
function pushCodes(out, piece, flags, risks) {
  let last = 0;
  for (const m of piece.matchAll(CODE)) {
    const key = "e" + m[1].toLowerCase();
    const flag = flags.find((f) => f.code && (f.id === key || f.id === base(key)));
    const risk = risks.find((r) => { const c = String(r.code).toLowerCase(); return c === key || c === base(key); });
    const riskOn = risk && risk.level && risk.level !== "none";
    if (!flag && !riskOn) continue;
    pushAllergens(out, piece.slice(last, m.index));
    const kind = flag && RANK[flag.severity] > RANK.risk ? flag.severity : riskOn ? "risk" : "info";
    out.push({ t: "hl", text: m[0], kind, flags: flag ? [flag] : [], risk: riskOn ? risk : null });
    last = m.index + m[0].length;
  }
  pushAllergens(out, piece.slice(last));
}

// _lait_ -> allergène, comme sur l'emballage (en gras)
function pushAllergens(out, s) {
  if (!s) return;
  const parts = s.split(/_([^_]+)_/);
  parts.forEach((p, i) => {
    if (!p) return;
    out.push(i % 2 ? { t: "allergen", text: p } : { t: "text", text: p.replace(/_/g, "") });
  });
}

// Morceaux de texte voisins regroupés : moins d'éléments à afficher
function merge(list) {
  const res = [];
  for (const x of list) {
    const prev = res[res.length - 1];
    if (x.t === "text" && prev && prev.t === "text") prev.text += x.text;
    else res.push({ ...x });
  }
  return res;
}
