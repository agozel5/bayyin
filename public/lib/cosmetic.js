// Note des cosmétiques sur 100, à partir de la liste des ingrédients (INCI) et du type de produit.
//
// Principe des toxicologues (CSSC, Notes of Guidance, 12e révision, 2023) : le risque, c'est
// le danger d'une substance multiplié par l'exposition. À concentration égale, un lait corporel
// non rincé expose environ 80 fois plus qu'un shampooing rincé (facteur de rétention 1 contre 0,01).
// La note tient donc compte de :
//   1. le danger de chaque ingrédient (classement CMR, perturbateur endocrinien reconnu,
//      allergène fréquent, statut dans le règlement cosmétique européen…) ;
//   2. le contexte d'exposition : produit rincé ou non, spray ou poudre libre (inhalation),
//      produit pour les lèvres, produit pour enfant ;
//   3. la position dans la liste : les ingrédients à plus de 1 % sont listés par ordre décroissant ;
//      tout ce qui suit un conservateur plafonné à 1 % (phénoxyéthanol, parabens…) est à 1 % au plus.
//
// Calcul (inspiré de la méthode publiée par Yuka) :
//   - l'ingrédient le plus à risque fixe la fourchette :
//       risque élevé  -> 0 à 24     risque modéré -> 25 à 49     sinon -> 50 à 100
//   - chaque autre ingrédient à risque retire des points, davantage s'il agit sur tout l'organisme
//     (cancérogène, perturbateur endocrinien, interdit) que s'il agit localement (allergie, irritation)
//     ou sur l'environnement ; moitié moins pour un irritant ou un contaminant présent à moins de 1 %.
// Les quantités exactes ne sont pas publiées par les fabricants : c'est un signal, pas un diagnostic.
// Les textes sont traduits par l'interface (cosm.<key>.t / .p, cosm.kind.<kind>, cosm.ctx.<ctx>).

import { normalize, segments, ingredientsText } from "./rules.js";
import { HEALTH_GRADES } from "./health.js";

export const LEVELS = ["eleve", "modere", "limite"];
const RANK = { eleve: 3, modere: 2, limite: 1 };
const higher = (a, b) => (!a ? b : !b ? a : RANK[a] >= RANK[b] ? a : b);

// Fourchette de la note selon l'ingrédient le plus à risque
export const COSMETIC_RANGES = { eleve: [0, 24], modere: [25, 49], limite: [50, 100] };
// Points retirés par les autres ingrédients : [effet sur l'organisme, effet local ou environnement]
export const COSMETIC_PENALTY = { eleve: [12, 8], modere: [6, 4], limite: [3, 2] };
const LIMITED_RANGE_PENALTY = [6, 2]; // produit sans risque modéré ni élevé
const SYSTEMIC = new Set(["illegal", "cmr", "ed"]);
const DOSE_SENSITIVE = new Set(["irritant", "contaminant", "env", "precaution"]); // effet qui dépend de la dose

// Règles. level : { lo: produit non rincé, ro: produit rincé } (null = pas de risque dans ce contexte) ;
// child / spray / aerosol / powder / lip : niveau au moins égal à celui-ci dans ce contexte ;
// childLo : idem, pour un produit pour enfant non rincé seulement.
// kinds : illegal, cmr (cancérogène, mutagène, reprotoxique), ed (perturbateur endocrinien),
// allergen, irritant, env (environnement), contaminant, precaution.
const L = (lo, ro = lo) => ({ lo, ro });
export const COSMETIC_RULES = [
  // --- Interdits dans l'UE (ou en France) ---
  { key: "banned_cmr", kinds: ["illegal", "cmr"], level: L("eleve"), sources: ["eu_cosmetics", "echa"],
    match: /\b(formaldehyde|paraformaldehyde|methylene glycol|formalin|quaternium-15|zinc pyrithione|butylphenyl methylpropional|lilial|dibutyl phthalate|sodium perborate|lead acetate|coal tar)\b/, exclude: /\bformaldehyde resin\b/ },
  { key: "banned", kinds: ["illegal"], level: L("eleve"), sources: ["eu_cosmetics"],
    match: /\b(hydroxyisohexyl 3-cyclohexene carboxaldehyde|lyral|atranol|chloroatranol|methyldibromo glutaronitrile|isopropylparaben|isobutylparaben|phenylparaben|benzylparaben|pentylparaben|4-methylbenzylidene camphor|enzacamene)\b/ },
  { key: "skin_lightener", kinds: ["illegal"], level: L("eleve"), sources: ["eu_cosmetics", "ansm"],
    match: /\b(hydroquinone|mercury|mercuric|mercurous|hydrargyr\w*|calomel|clobetasol\w*|betamethasone\w*|dexamethasone|hydrocortisone)\b/,
    exclude: /\b(phenylmercur\w*|thimerosal|thiomersal)\b/ }, // sels de phénylmercure : autorisés dans les produits pour les yeux
  { key: "pfas", kinds: ["illegal", "env"], level: L("eleve"), sources: ["fr_pfas", "echa"],
    match: /\b(ptfe|polytetrafluoroethylene|perfluoro\w*|polyperfluoro\w*|fluoroalcohol phosphate|octafluoropentyl\w*|perfluorononyl dimethicone|trifluoropropyl\w*|trifluoroacetyl\w*|tetrafluoroethane)\b/ },
  { key: "banned_soon", kinds: ["ed", "cmr"], level: L("eleve"), sources: ["eu_cosmetics", "sccs"],
    match: /\b(triphenyl phosphate|benzophenone-[12])\b/ },

  // --- Conservateurs ---
  { key: "formaldehyde_releaser", kinds: ["cmr", "allergen"], level: L("eleve", "modere"), sources: ["iarc", "eu_cosmetics"],
    match: /\b(dmdm hydantoin|imidazolidinyl urea|diazolidinyl urea|bromo-2-nitropropane|bronopol|sodium hydroxymethylglycinate|methenamine|bromo-5-nitro)\b/ },
  { key: "isothiazolinone", kinds: ["allergen"], level: L("eleve", "modere"), sources: ["sccs", "eu_cosmetics", "essca"],
    match: /\b(methylchloroisothiazolinone|methylisothiazolinone|benzisothiazolinone|octylisothiazolinone)\b/ },
  { key: "butylparaben", kinds: ["ed"], level: L("eleve", "modere"), child: "eleve", sources: ["echa", "sccs"],
    match: /\b(sodium |potassium )?butyl ?paraben\b|\bbutyl (4-)?hydroxybenzoate\b/ },
  { key: "propylparaben", kinds: ["ed"], level: L("modere", "limite"), childLo: "eleve", sources: ["sccs", "eu_cosmetics"],
    match: /\b(sodium |potassium )?propyl ?paraben\b|\bpropyl (4-)?hydroxybenzoate\b/ },
  { key: "paraben_short", kinds: ["precaution"], level: L("limite"), sources: ["sccs"],
    match: /\b(sodium )?(methyl|ethyl) ?paraben\b|\b(methyl|ethyl) (4-)?hydroxybenzoate\b/ },
  { key: "triclosan", kinds: ["ed", "env"], level: L("modere"), child: "eleve", sources: ["eu_cosmetics", "sccs"],
    match: /\b(triclosan|triclocarban)\b/ },
  { key: "phmb", kinds: ["cmr"], level: L("modere"), spray: "eleve", sources: ["eu_cosmetics", "echa"],
    match: /\b(polyaminopropyl biguanide|polyhexamethylene biguanide|polyhexanide|phmb)\b/ },
  { key: "phenoxyethanol", kinds: ["precaution"], level: L("limite", null), sources: ["sccs", "ansm"],
    match: /\bphenoxyethanol\b/ },
  { key: "climbazole", kinds: ["env"], level: L("limite"), sources: ["echa"],
    match: /\bclimbazole\b/ },

  // --- Antioxydants ---
  { key: "bha", kinds: ["cmr", "ed"], level: L("modere"), sources: ["iarc", "sccs"],
    match: /\b(bha|butylated hydroxyanisole)\b/ },
  { key: "bht", kinds: ["precaution"], level: L("limite"), sources: ["sccs"],
    match: /\b(bht|butylated hydroxytoluene)\b/ },

  // --- Filtres UV ---
  { key: "benzophenone3", kinds: ["ed"], level: L("modere", "limite"), sources: ["sccs", "eu_cosmetics"],
    match: /\b(benzophenone-3|oxybenzone)\b/ },
  { key: "homosalate", kinds: ["ed"], level: L("modere"), aerosol: "eleve", sources: ["sccs", "eu_cosmetics"],
    match: /\bhomosalate\b/ },
  { key: "octocrylene", kinds: ["ed", "allergen"], level: L("modere", "limite"), sources: ["sccs", "eu_cosmetics"],
    match: /\boctocrylene\b/ },
  { key: "ehmc", kinds: ["ed"], level: L("limite"), sources: ["sccs"],
    match: /\b(ethylhexyl methoxycinnamate|octinoxate|octyl methoxycinnamate)\b/ },
  { key: "nano_inhaled", kinds: ["precaution"], level: L(null), spray: "modere", powder: "modere", sources: ["sccs", "eu_cosmetics"],
    match: /^$/ }, // détecté à part : ingrédient suivi de « (nano) »
  { key: "tio2_inhaled", kinds: ["precaution"], level: L(null), spray: "limite", powder: "limite", sources: ["eu_cosmetics", "iarc"],
    match: /\b(titanium dioxide|ci 77891)\b/ },

  // --- Silicones cycliques ---
  { key: "d4", kinds: ["cmr", "env"], level: L("modere", "eleve"), sources: ["echa"],
    match: /\bcyclotetrasiloxane\b/ },
  { key: "siloxane", kinds: ["env"], level: L("limite", "modere"), sources: ["echa"],
    match: /\b(cyclopentasiloxane|cyclohexasiloxane|cyclomethicone)\b/ },

  // --- Minéraux ---
  { key: "talc", kinds: ["cmr"], level: L("limite", null), powder: "modere", child: "eleve", sources: ["iarc", "echa"],
    match: /\b(talc|talcum)\b/ },
  { key: "aluminium", kinds: ["precaution"], level: L("limite", null), sources: ["sccs", "eu_cosmetics"],
    match: /\b(alumin(i)?um (chlorohydrate|sesquichlorohydrate|chloride|chlorohydrex\w*)|alumin(i)?um zirconium\w*|potassium alum|alum)\b/ },

  // --- Colorations et actifs ---
  { key: "hair_dye", kinds: ["allergen"], level: L("eleve"), sources: ["sccs", "essca"],
    match: /\b(p-phenylenediamine|paraphenylenediamine|toluene-2[,§]?5-diamine\w*)\b/ },
  { key: "resorcinol", kinds: ["ed", "allergen"], level: L("modere"), sources: ["anses", "eu_cosmetics"],
    match: /\bresorcinol\b/, exclude: /\b(methylresorcinol|hexylresorcinol|phenylethyl resorcinol|butylresorcinol)\b/ },
  { key: "toluene", kinds: ["cmr"], level: L("modere"), sources: ["eu_cosmetics"],
    match: /^toluene$/ },
  { key: "salicylic", kinds: ["cmr"], level: L("limite", null), child: "eleve", spray: "modere", sources: ["eu_cosmetics", "echa"],
    match: /\bsalicylic acid\b/ },
  { key: "methyl_salicylate", kinds: ["cmr"], level: L("limite"), child: "eleve", sources: ["eu_cosmetics"],
    match: /\bmethyl salicylate\b/ },
  { key: "retinoid", kinds: ["precaution"], level: L("limite", null), sources: ["eu_cosmetics", "sccs"],
    match: /\b(retinol|retinyl (acetate|palmitate))\b/ },
  { key: "kojic", kinds: ["allergen"], level: L("limite"), sources: ["eu_cosmetics"],
    match: /\bkojic acid\b/ },

  // --- Tensioactifs ---
  { key: "dea", kinds: ["cmr"], level: L("modere", "limite"), sources: ["iarc", "eu_cosmetics"],
    match: /\b(cocamide|lauramide|oleamide|linoleamide) dea\b|\bdiethanolamine\b/ },
  { key: "sulfate", kinds: ["irritant"], level: L("modere", "limite"), sources: ["cir", "ema"],
    match: /\b(sodium|ammonium|tea|mea|magnesium)[ -]lauryl sulfate\b|\bsodium coco-?sulfate\b/ },
  { key: "ethoxylated", kinds: ["contaminant"], level: L("limite"), sources: ["sccs", "iarc"],
    match: /\bpeg-\d+|\b\w*eth-\d+\b|\b\w+eth sulfate\b|\bpolysorbate[ -]?\d+|\bpolyethylene glycol\b/ }, // PPG : oxyde de propylène, pas de dioxane

  // --- Huiles minérales, microplastiques ---
  { key: "mineral_oil", kinds: ["contaminant"], level: L(null), lip: "limite", sources: ["efsa", "cosmetics_europe"],
    match: /\b(paraffinum liquidum|mineral oil|petrolatum|vaseline|paraffin|cera microcristallina|microcrystalline wax|ozokerite|ceresin)\b/ },
  { key: "microplastic", kinds: ["env"], level: L("limite"), sources: ["echa"],
    match: /\b(polyethylene|nylon-\d+|polymethyl methacrylate|polypropylene|polyethylene terephthalate)\b/, exclude: /\bglycol\b/ },

  // --- Parfum ---
  { key: "fragrance_allergen", kinds: ["allergen"], level: L("limite"), child: "modere", sources: ["eu_cosmetics", "essca"],
    match: /\b(limonene|linalool|citronellol|geraniol|citral|coumarin|eugenol|isoeugenol|cinnamal|cinnamyl alcohol|hydroxycitronellal|amyl cinnamal|amylcinnamyl alcohol|hexyl cinnamal|benzyl salicylate|benzyl benzoate|benzyl cinnamate|benzyl alcohol|farnesol|anise alcohol|alpha-isomethyl ionone|evernia prunastri|evernia furfuracea|methyl 2-octynoate|myroxylon pereirae)\b/ },
  { key: "fragrance", kinds: ["allergen"], level: L("limite"), child: "modere", sources: ["sccs", "afssaps_baby"],
    match: /^(parfum|fragrance|perfume)( ?\/ ?(parfum|fragrance))?$/ },
];
const RULE_BY_KEY = Object.fromEntries(COSMETIC_RULES.map((r) => [r.key, r]));

// ---------------------------------------------------------------------------
// Base officielle CosIng (≈ 33 000 ingrédients), chargée par l'app : data/cosing.json
// Elle sert aux ingrédients qu'aucune famille ci-dessus ne couvre, et donne le rôle de chaque ingrédient.
// ---------------------------------------------------------------------------
let DB = null;
export function setCosmeticDb(data) {
  DB = data && data.i ? { fn: data.fn || [], i: data.i, updated: data.updated, version: (DB ? DB.version : 0) + 1 } : null;
}
export const cosmeticDbVersion = () => (DB ? DB.version : 0);
export const cosmeticDbInfo = () => (DB ? { updated: DB.updated, count: Object.keys(DB.i).length } : null);

// Noms usuels qui ne sont pas le nom INCI exact
const ALIASES = { water: "aqua", eau: "aqua", "aqua/water": "aqua", "water/aqua": "aqua", glycerine: "glycerin", glycerol: "glycerin",
  fragrance: "parfum", perfume: "parfum", "parfum/fragrance": "parfum", "fragrance/parfum": "parfum", "alcohol denatured": "alcohol denat." };
const dbKey = (seg) => seg.replace(/§/g, ",").replace(/¶/g, " ").replace(/\s*\*+$/, "").replace(/\s+/g, " ").trim();
function dbLookup(seg) {
  if (!DB) return null;
  const k = dbKey(seg);
  const tries = [k, ALIASES[k], k.replace(/\s*\(nano\)$/, ""), k.replace(/\.$/, ""), k + "."];
  // « Aqua/Water », « Sodium Tallowate or Sodium Palmate » : chaque variante
  for (const part of k.split(/\s*\/\s*|\s+(?:or|ou|and\/or|et\/ou)\s+/)) tries.push(part, ALIASES[part]);
  for (const t of tries) if (t && DB.i[t]) return { name: t, rec: DB.i[t] };
  return null;
}
const dbFunctions = (rec) => (rec[0] || []).map((i) => DB.fn[i]).filter(Boolean);

// Risque déduit du statut réglementaire, pour un ingrédient hors familles
function dbRisk(rec, ctx = {}) {
  const annexes = (rec[1] || "").split(",").filter(Boolean);
  const cmr = rec[2] || "";
  const flags = rec[3] || 0;
  if (annexes.includes("II") && !(flags & 4)) return "db_banned";
  if (cmr === "1A" || cmr === "1B") return annexes.some((a) => a !== "II") ? "db_cmr1_allowed" : "db_banned";
  if (cmr === "2") return "db_cmr2";
  if (flags & 1) return "db_allergen";
  if (flags & 2 && ctx.hairDye) return "db_hairdye"; // un colorant capillaire ne compte que dans une coloration
  return null;
}
const DB_RULES = {
  db_banned: { key: "db_banned", kinds: ["illegal"], level: L("eleve"), sources: ["cosing", "eu_cosmetics"] },
  db_cmr1_allowed: { key: "db_cmr1_allowed", kinds: ["cmr"], level: L("modere", "limite"), child: "eleve", sources: ["cosing", "eu_cosmetics"] },
  db_cmr2: { key: "db_cmr2", kinds: ["cmr"], level: L("limite"), sources: ["cosing", "eu_cosmetics"] },
  db_allergen: { key: "db_allergen", kinds: ["allergen"], level: L("limite"), child: "modere", sources: ["cosing", "eu_cosmetics"] },
  db_hairdye: { key: "db_hairdye", kinds: ["allergen"], level: L("limite"), sources: ["cosing", "sccs"] },
};
// Morceaux de liste qui ne sont pas des ingrédients (« peut contenir », numéros de formule…)
const NOISE = /^(may contain|peut contenir|\+\/-|\[\+\/-|contient|ingredients?|ingredientes|f\.?i\.?l\.?|code|n°|\d+([.,]\d+)?\s*%?)$|^(may contain|peut contenir)\b/;

// Conservateurs plafonnés à 1 % ou moins (annexe V) : tout ce qui suit est à 1 % au plus.
const ONE_PERCENT_MARKERS = /\b(phenoxyethanol|\w*paraben|methylchloroisothiazolinone|methylisothiazolinone|potassium sorbate|dehydroacetic acid|sodium dehydroacetate|chlorphenesin|dmdm hydantoin|imidazolidinyl urea|diazolidinyl urea|sodium hydroxymethylglycinate|triclosan|bht|bha|methylparaben)\b/;

// ---------------------------------------------------------------------------
// Contexte d'exposition, déduit des catégories et du nom du produit
// ---------------------------------------------------------------------------
export function exposureContext(product) {
  const txt = normalize([...(product.categories_tags || []), product.product_name_fr, product.product_name, product.product_name_en]
    .filter(Boolean).join(" | ")).replace(/[-:_]/g, " ");
  const wipe = /\b(lingettes?|wipes?)\b/.test(txt);
  const leaveOverride = wipe || /\b(apres rasage|after ?shave|leave in|sans rincage|no rinse)\b/.test(txt);
  const rinse = !leaveOverride && /\b(shower|douche|shampo\w*|conditioners?|apres shampo\w*|soaps?|savons?|bath|bain moussant|bain douche|toothpastes?|dentifrices?|mouthwash\w*|bain de bouche|cleansers?|cleansing|nettoyants?|gel lavant|lavant|face wash|body wash|hand wash|demaquill\w*|make up removers?|makeup removers?|scrubs?|gommages?|exfoliants?|shaving|mousse a raser|gel a raser|hair masks?|masque capillaire|intimate wash|toilette intime)\b/.test(txt);
  return {
    rinse,
    oral: /\b(toothpastes?|dentifrices?|mouthwash\w*|bain de bouche|oral care)\b/.test(txt),
    spray: /\b(spray|sprays|aerosol|aerosols|brume|mist|atomiseur|vaporisateur)\b/.test(txt),
    aerosol: /\b(aerosols?|gaz propulseur|propellant)\b/.test(txt),
    powder: /\b(poudre libre|loose powders?|baby powders?|poudre pour bebe|talcum|poudre de talc)\b/.test(txt),
    lip: /\b(lips?|levres|lipsticks?|lip balms?|lip gloss|gloss|rouge a levres|baume a levres|stick levres)\b/.test(txt),
    hairDye: /\b(colorations?|hair colou?rs?|hair dyes?|teintures?|colour cream|color cream|creme colorante)\b/.test(txt),
    child: /\b(bebes?|baby|babies|enfants?|kids?|junior|nourrissons?|toddlers?|infants?|naissance|liniment)\b/.test(txt),
  };
}

// Découpage de la liste : la virgule entre deux chiffres fait partie du nom chimique
// (« Toluene-2,5-Diamine », « 2-Bromo-2-Nitropropane-1,3-Diol ») ; on la protège par « § ».
// De même, « HC Blue No. 2 » ne doit pas être coupé après « No. » (« ¶ » remplace l'espace).
const cosmeticSegments = (product) => segments(ingredientsText(product).replace(/(\d),(\d)/g, "$1§$2").replace(/\b(no)\.\s+(\d)/gi, "$1.¶$2"));

// Nom d'ingrédient lisible (« sodium lauryl sulfate » -> « Sodium Lauryl Sulfate »)
function inciName(seg) {
  return seg.replace(/§/g, ",").replace(/¶/g, " ").replace(/\s*\*+$/, "")
    .replace(/(^|[\s/-])([a-z])/g, (m, a, b) => a + b.toUpperCase())
    .replace(/\b(Peg|Ppg|Bht|Bha|Dea|Mea|Tea|Dmdm|Ptfe|Phmb|Ci)\b/g, (m) => m.toUpperCase())
    .slice(0, 60);
}

function levelFor(rule, ctx) {
  let lv = ctx.rinse ? rule.level.ro : rule.level.lo;
  if (ctx.child && rule.child) lv = higher(lv, rule.child);
  if (ctx.child && !ctx.rinse && rule.childLo) lv = higher(lv, rule.childLo); // produit pour enfant laissé sur la peau
  if (ctx.aerosol && rule.aerosol) lv = higher(lv, rule.aerosol);
  if (ctx.spray && rule.spray) lv = higher(lv, rule.spray);
  if (ctx.powder && rule.powder) lv = higher(lv, rule.powder);
  if (ctx.lip && rule.lip) lv = higher(lv, rule.lip);
  return lv || null;
}

/**
 * Ingrédients à surveiller, du plus grave au moins grave.
 * level : eleve | modere | limite | null (présent mais sans risque dans ce type de produit)
 * dose : "major" (probablement > 1 %), "minor" (≤ 1 %) ou null (inconnu)
 */
export function cosmeticRisks(product, ctx = exposureContext(product)) {
  const segs = cosmeticSegments(product);
  const lineIdx = segs.findIndex((s) => ONE_PERCENT_MARKERS.test(s));
  const out = [];
  const seenSeg = new Set();
  segs.forEach((seg, i) => {
    if (seenSeg.has(seg)) return;
    const dose = lineIdx < 0 ? null : i < lineIdx ? "major" : i > lineIdx ? "minor" : null;
    let done = false;
    for (const rule of COSMETIC_RULES) {
      if (!rule.match.test(seg) || (rule.exclude && rule.exclude.test(seg))) continue;
      seenSeg.add(seg);
      done = true;
      if (rule.key === "fragrance" && out.some((r) => r.key === "fragrance")) break; // « Parfum (Fragrance) »
      out.push({ key: rule.key, level: levelFor(rule, ctx), kinds: rule.kinds, name: inciName(seg), sources: rule.sources, dose, pos: i });
      break;
    }
    if (done) return;
    // Hors familles : statut réglementaire de la base CosIng
    const hit = dbLookup(seg);
    const k = hit && dbRisk(hit.rec, ctx);
    if (k) {
      const rule = DB_RULES[k];
      seenSeg.add(seg);
      out.push({ key: k, level: levelFor(rule, ctx), kinds: rule.kinds, name: inciName(seg), sources: rule.sources, dose, pos: i, db: true });
    }
  });
  // Nanomatériaux inhalables : « Titanium Dioxide (nano) » dans un spray ou une poudre libre
  if (ctx.spray || ctx.powder) {
    const raw = normalize(ingredientsText(product));
    const re = /([a-z0-9][a-z0-9 \-]{2,40}?)\s*\(\s*nano\s*\)/g;
    let m;
    while ((m = re.exec(raw))) {
      const rule = RULE_BY_KEY.nano_inhaled;
      const base = m[1].trim();
      // Le même ingrédient non nano a pu être relevé avant : la forme nano le remplace
      const dup = out.findIndex((r) => normalize(r.name) === base);
      if (dup >= 0) out.splice(dup, 1);
      out.push({ key: rule.key, level: levelFor(rule, ctx), kinds: rule.kinds, name: inciName(base) + " (nano)", sources: rule.sources, dose: null, pos: -1 });
    }
  }
  const order = (r) => (r.level ? RANK[r.level] : 0);
  return out.sort((a, b) => order(b) - order(a) || a.pos - b.pos);
}

function penaltyOf(r, table) {
  const [sys, loc] = table;
  let p = r.kinds.some((k) => SYSTEMIC.has(k)) ? sys : loc;
  if (r.dose === "minor" && r.kinds.every((k) => DOSE_SENSITIVE.has(k))) p /= 2;
  return p;
}

export function cosmeticScore(product, risks = cosmeticRisks(product)) {
  if (!normalize(ingredientsText(product)).trim()) return null;
  const scored = risks.filter((r) => r.level);
  const worst = scored.some((r) => r.level === "eleve") ? "eleve" : scored.some((r) => r.level === "modere") ? "modere" : "limite";
  const [floor, start] = COSMETIC_RANGES[worst];
  let penalty = 0;
  if (worst === "limite") {
    for (const r of scored) penalty += penaltyOf(r, LIMITED_RANGE_PENALTY);
  } else {
    const first = scored.findIndex((r) => r.level === worst); // celui-ci fixe la fourchette
    scored.forEach((r, i) => { if (i !== first) penalty += penaltyOf(r, COSMETIC_PENALTY[r.level]); });
  }
  const score = Math.max(floor, Math.min(start, Math.round(start - penalty)));
  const g = HEALTH_GRADES.find((x) => score >= x.min);
  const count = (lv) => scored.filter((r) => r.level === lv).length;
  return { score, grade: g.id, label: g.label, worst: scored.length ? worst : null, parts: { eleve: count("eleve"), modere: count("modere"), limite: count("limite") } };
}

// Même forme que analyzeHealth (champ score) : listes, comparaison et alternatives en profitent sans rien changer.
/** Tous les ingrédients de la liste, avec leur rôle (CosIng) et leur niveau de risque dans ce produit. */
export function cosmeticIngredients(product, risks) {
  const byPos = new Map(risks.filter((r) => r.pos >= 0).map((r) => [r.pos, r]));
  const out = [];
  const seen = new Set();
  let prevDb = null;
  cosmeticSegments(product).forEach((seg, i) => {
    if (seen.has(seg) || NOISE.test(seg) || /[®™©]/.test(seg) || seg.length > 70 || !/[a-z]/.test(seg)) return; // marque déposée : pas un ingrédient
    seen.add(seg);
    const hit = dbLookup(seg);
    // « Parfum (Fragrance) », « Aqua (Water) » : la traduction entre parenthèses n'est pas un autre ingrédient
    if (hit && prevDb === hit.name) return;
    prevDb = hit ? hit.name : null;
    const r = byPos.get(i);
    out.push({
      name: inciName(seg),
      functions: hit ? dbFunctions(hit.rec) : [],
      known: !!hit || !!r,
      level: r ? r.level : null,
      flagged: !!r,
    });
  });
  return out;
}

// Même forme que analyzeHealth (champ score) : listes, comparaison et alternatives en profitent sans rien changer.
export function analyzeCosmetic(product) {
  const context = exposureContext(product);
  const risks = cosmeticRisks(product, context);
  const ingredients = cosmeticIngredients(product, risks);
  return {
    cosmetic: true,
    context,
    score: cosmeticScore(product, risks),
    risks,
    ingredients,
    analyzed: ingredients.length,
    coverage: DB ? { known: ingredients.filter((x) => x.known).length, total: ingredients.length, db: DB.updated } : null,
    dbVersion: cosmeticDbVersion(),
  };
}
