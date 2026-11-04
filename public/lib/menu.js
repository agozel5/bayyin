// Lecture d'une carte de restaurant : chaque plat est analysé avec les mêmes règles que les
// ingrédients d'un produit. Beaucoup de plats cachent un ingrédient que leur nom ne dit pas
// (lardons d'une carbonara, vin d'un bœuf bourguignon, gélatine d'une panna cotta) : un dictionnaire
// de plats ajoute ces ingrédients « probables », signalés comme tels.
import { classify, normalize, DEFAULT_PREFS } from "./rules.js";

// [motif (texte normalisé), ingrédients probables (en français), sûr ? (true : toujours, false : souvent)]
const DISHES = [
  // Porc
  [/\bcarbonara\b/, "lardons", false],
  [/\bamatriciana\b|\bgricia\b/, "guanciale de porc", true],
  [/\btartiflette\b/, "lardons, vin blanc", true],
  [/\bchoucroute\b/, "porc, saucisses de porc", false],
  [/\bcassoulet\b/, "saucisse de porc, couenne", true],
  [/\bquiche lorraine\b/, "lardons", true],
  [/\bflammekueche\b|\btarte flambee\b/, "lardons", false],
  [/\bcroque.?(monsieur|madame)\b/, "jambon", false],
  [/\bsalade (savoyarde|auvergnate|lyonnaise|landaise)\b/, "lardons, jambon", false],
  [/\braclette\b/, "charcuterie de porc", false],
  [/\bcharcuterie\b|\bplanche mixte\b|\bassiette de charcuterie\b/, "porc", true],
  [/\bsaucisson\b|\brillettes\b|\bandouillette\b|\bboudin\b|\bpetit sale\b|\bchair a saucisse\b/, "porc", true],
  [/\bpate en croute\b|\bterrine\b|\bpate de campagne\b/, "porc", false],
  [/\bjambon.beurre\b|\bparisien\b/, "jambon", true],
  [/\bpizza (regina|reine|royale|calzone|4 saisons|quatre saisons)\b|\bcalzone\b/, "jambon", false],
  [/\bsaltimbocca\b/, "jambon", true],
  [/\bchou farci\b/, "chair à saucisse", false],
  [/\bhot.?dog\b/, "saucisse de porc", false],
  [/\bbratwurst\b|\bcurrywurst\b|\bweisswurst\b|\bschweinebraten\b|\bschnitzel wiener art\b/, "porc", false],
  [/\bjamon\b|\bserrano\b|\bprosciutto\b|\bmortadell[ea]\b|\bsalami\b|\bspeck\b/, "porc", true],
  // Charcuterie et viandes de porc espagnoles (bellota : porc ibérique nourri aux glands)
  [/\blomo\b|\bchoric\w*|\bsalchich\w*|\bsobrasada\b|\bfuet\b|\bmorcilla\b|\bcochinillo\b|\bsecreto\b|\bpluma iberica\b|\bpresa iberica\b|\bpaleta\b|\bbellota\b|\btorreznos?\b|\bcochon\b|\bcarnitas\b|\bpulled pork\b/, "porc", true],
  [/\bpata negra\b|\b(jambon|charcuterie|planche) iberique\b/, "porc", true],
  [/\balbondigas\b|\bboulettes?\b|\bmeatballs?\b|\bpolpette\b/, "viande", true],
  [/\bpaella\b/, "chorizo, fruits de mer", false],
  // Alcool dans la cuisson ou la sauce
  [/\bbourguignon\b|\bcoq au vin\b|\bboeuf mode\b|\bdaube\b/, "vin rouge", true],
  [/\bmarinieres?\b/, "vin blanc", true],
  [/\bfondue (savoyarde|au fromage)\b|\bfondue\b/, "vin blanc, kirsch", false],
  [/\brisotto\b/, "vin blanc", false],
  [/\bcarbonade\b|\bwelsh\b/, "bière", true],
  [/\bsauce (au )?(vin|porto|madere|cognac|marsala)\b|\bau (porto|madere|cognac|calvados|whisky)\b|\b(d.)?oporto\b|\bal (vino|jerez)\b|\bau cidre\b|\ba la biere\b/, "alcool", true],
  // Fromages affinés : présure animale (obligatoire pour plusieurs appellations : parmesan, manchego, comté…)
  [/\bparmesan\b|\bparmigiano\b|\bgrana padano\b|\bpecorino\b|\bmanchego\b|\bcomte\b|\bgruyere\b|\bbeaufort\b|\broquefort\b|\bemmental\b/, "présure animale", false],
  [/\bsauce au poivre\b/, "cognac", false],
  [/\bbeurre blanc\b/, "vin blanc", false],
  [/\bflambee?s?\b/, "alcool", true],
  [/\bsuzette\b/, "liqueur", true],
  [/\bbaba\b|\bsavarin\b/, "rhum", true],
  [/\btiramisu\b/, "marsala", false],
  [/\bsabayon\b|\bzabaione\b/, "marsala", true],
  [/\bforet.?noire\b/, "kirsch", false],
  [/\bsangria\b|\bspritz\b|\bmojito\b|\bkir\b|\bpastis\b/, "alcool", true],
  // Viande : l'abattage est à demander au restaurant
  [/\b(entrec\w{1,2}te|steak|bavette|faux.?filet|rumsteck|onglet|cote de boeuf|tartare|burgers?|cheeseburger|kebab|kefta|merguez|magret|confit|gigot|souris d.?agneau|brochettes?|cordon.?bleu|escalope|blanquette|pot.?au.?feu|hachis parmentier|lasagnes?|bolognaise|chili con carne|tajine|couscous|nuggets?|wings|cote d.?agneau|carpaccio|osso.?buco|schnitzel|gyros|shawarma|chawarma)\b/, "viande", true],
  // Gélatine
  [/\bpanna cotta\b|\bbavarois\b|\bcharlotte\b|\bmousse de fruits\b|\bentremets\b/, "gélatine", false],
  [/\bcheesecake\b|\bguimauve\b|\bmarshmallow\b|\bgelee\b|\baspic\b/, "gélatine", false],
];

// Titres de rubriques (on les garde comme intertitres, ils ne sont pas analysés)
const SECTIONS = /^(entrees?|starters?|plats?( principaux)?|mains?|desserts?|boissons?|drinks?|vins?|bieres?|cocktails?|aperitifs?|menu( du jour| enfant)?|formules?|pizzas?|pates|burgers?|salades?|sandwichs?|accompagnements?|sides?|fromages?|softs?|boissons chaudes|antipasti|primi|secondi|dolci|tapas|vorspeisen|hauptgerichte|nachspeisen|getranke)$/;

// Puces de liste, telles que la lecture de photo les rend souvent (•, +, «, ¢, &, *…), avec un éventuel chiffre parasite devant
const BULLET = /^\s*(?:(?:\d{1,2}\s+)?[•·+«»¢&*▪●◦○■□►▸]\s*|[–—-]\s+)+/;
const PRICE = /\d+(?:[.,]\d{1,2})?\s*(?:€|eur\b|euros?\b)|\d+[.,]\d{2}\s*$|\d+(?:[.,]\d{1,2})?\s*[E€]\s*$/i;

const NOTE = /^(servi chaud|servis? (froid|chaud)|prix nets?|service compris|tous (les|nos) (produits|plats|prix)|(\* ?)?ces .{0,20}plats sont|plat fait maison|allergenes?|tva)/;

// Ligne de carte -> texte utile (sans prix, points de conduite ni puces)
// Bruit de lecture devant le nom : signes, ou 1 à 3 capitales isolées (icône lue « SB | - », « GB »),
// retirés seulement si un vrai mot (Majuscule + minuscule) suit
function stripNoise(s) {
  const m = s.match(/^(?:[^\p{L}«"(]+|\p{Lu}{1,3}(?=[\s|.\-]))+/u);
  if (!m) return s;
  const rest = s.slice(m[0].length);
  return /^[«"(]?\p{Lu}\p{Ll}/u.test(rest) ? rest : s.replace(/^[^\p{L}«"(]+/u, "");
}
function clean(line) {
  return stripNoise(String(line || ""))
    .replace(BULLET, "")
    .replace(/\d+[.,]\d{1,2}\s*(€|eur\b|euros?\b)?|\d+\s*(€|eur\b|euros?\b)|€\s*\d+([.,]\d{1,2})?|\d+\s*E\s*$/gi, " ")
    .replace(/[.…_·]{3,}[\w.]*|-{3,}/g, " ")
    // points de conduite mal lus (« cisssidccsssss… ») : mots trop longs ou aux lettres répétées
    .replace(/\S{22,}|\S*(\p{L})\1{3,}\S*/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[.,:;\s]+$/, "");
}
const letters = (s) => (s.match(/\p{L}/gu) || []).length;

/**
 * Mots lus avec leur position [{ t, x0, y0, x1, y1 }] -> lignes de la carte, colonne par colonne.
 * Le lecteur réunit parfois deux colonnes sur une même ligne : ici, une ligne est coupée à la gouttière
 * entre les colonnes, après un prix, et là où l'espace entre deux mots est trop grand.
 */
export function linesFromWords(words) {
  const ws = (words || []).filter((w) => w && typeof w.t === "string" && w.t.trim() && w.x1 > w.x0 && w.y1 > w.y0);
  if (!ws.length) return [];
  const hs = ws.map((w) => w.y1 - w.y0).sort((a, b) => a - b);
  const wh = hs[Math.floor(hs.length / 2)]; // hauteur habituelle d'un mot
  // Gouttière : bande verticale (entre 25 % et 75 % de la largeur) que presque aucun mot ne traverse
  const BINS = 100, cover = new Array(BINS).fill(0);
  for (const w of ws) for (let b = Math.floor(w.x0 * BINS); b <= Math.min(BINS - 1, Math.floor(w.x1 * BINS)); b++) cover[b]++;
  let split = null, best = 0;
  for (let b = 25; b <= 75; b++) {
    if (cover[b] > ws.length * 0.01) continue;
    let e = b; while (e + 1 <= 75 && cover[e + 1] <= ws.length * 0.01) e++;
    if (e - b + 1 > best) { best = e - b + 1; split = (b + e + 1) / 2 / BINS; }
    b = e;
  }
  const col = (w) => (split != null && (w.x0 + w.x1) / 2 > split ? 1 : 0);
  // Rangées : mots dont le milieu vertical est proche
  const sorted = [...ws].sort((a, b) => (a.y0 + a.y1) - (b.y0 + b.y1));
  const rows = [];
  for (const w of sorted) {
    const cy = (w.y0 + w.y1) / 2;
    const r = rows.find((x) => x.col === col(w) && Math.abs(x.cy - cy) < wh * 0.55);
    if (r) { r.ws.push(w); r.cy = (r.cy * (r.ws.length - 1) + cy) / r.ws.length; } else rows.push({ col: col(w), cy, ws: [w] });
  }
  const isPrice = (t) => /\d\s*€$|^€$|\d[.,]\d{2}$/.test(t);
  const lines = [];
  for (const r of rows) {
    r.ws.sort((a, b) => a.x0 - b.x0);
    let cur = null;
    r.ws.forEach((w, i) => {
      const prev = r.ws[i - 1];
      const gap = prev ? w.x0 - prev.x1 : 0;
      const cut = !cur || gap > wh * 2.4 || (prev && isPrice(prev.t) && gap > wh * 0.5);
      if (cut) { cur = { words: [], col: r.col }; lines.push(cur); }
      cur.words.push(w);
    });
  }
  return lines.map((l) => ({
    t: l.words.map((w) => w.t).join(" "), col: l.col,
    x0: Math.min(...l.words.map((w) => w.x0)), y0: Math.min(...l.words.map((w) => w.y0)),
    x1: Math.max(...l.words.map((w) => w.x1)), y1: Math.max(...l.words.map((w) => w.y1)),
  })).sort((a, b) => (a.col - b.col) || (a.y0 - b.y0) || (a.x0 - b.x0));
}

/**
 * Découpe la carte en plats { title, desc, section, boxes }.
 * `input` : le texte lu, ou les lignes lues avec leur position [{ t, x0, y0, x1, y1 }] (proportions de la photo).
 * Avec les positions, la taille du texte aide : un intertitre est écrit plus gros, une description plus petit.
 */
export function menuItems(input) {
  const rows = (Array.isArray(input) ? input.map((l) => ({ t: String(l.t || ""), box: l })) : String(input || "").split(/\n+/).map((t) => ({ t, box: null })))
    .map((r) => ({ ...r, t: r.t.replace(/\n+/g, " ") }))
    .filter((r) => letters(r.t) >= 3);
  const bulleted = rows.filter((r) => BULLET.test(r.t)).length >= 3; // carte à puces : chaque plat commence par une puce
  const priced = rows.filter((r) => PRICE.test(r.t)).length >= Math.max(3, rows.length * 0.15); // carte avec prix
  // hauteur habituelle d'une ligne de plat (lignes avec prix, sinon toutes)
  const hs = rows.filter((r) => r.box && (!priced || PRICE.test(r.t))).map((r) => r.box.y1 - r.box.y0).sort((a, b) => a - b);
  const mid = hs.length ? hs[Math.floor(hs.length / 2)] : 0;
  const items = [];
  let section = null;
  let prevPriced = false;
  for (const { t: raw, box } of rows) {
    const bullet = BULLET.test(raw);
    // un prix, ou des points de conduite (même mal lus) : c'est la ligne d'un plat
    const price = PRICE.test(raw) || /(\p{L})\1{3,}|[.·…_]{4,}|\S{22,}/u.test(raw);
    const line = clean(raw);
    if (letters(line) < 3) continue;
    const n = normalize(line).replace(/[:.!]/g, "").trim();
    if (NOTE.test(n)) continue; // mentions de bas de carte (légende, prix nets…) : pas des plats
    const h = box ? box.y1 - box.y0 : 0;
    const big = !!(mid && h >= mid * 1.3), small = !!(mid && h <= mid * 0.82);
    // intertitre : rubrique connue, ligne finie par « … », ligne en capitales, ou écrite plus gros, sans puce ni prix
    const title = line.replace(/^(?:[^\p{L}«"]+|\p{L}{1,2}\s+|\d\s+)+(?=[\p{Lu}«"])/u, ""); // bruit de lecture devant le titre (« ae Del mar »)
    const header = !bullet && !price && (SECTIONS.test(n) || /^[\p{Lu}«"]/u.test(title)) && (SECTIONS.test(n)
      || (/^[\p{Lu}«"]/u.test(title) && /(\.\.\.|…)\s*$/.test(raw.trim()))
      || (/^[^a-zà-ÿ]*$/.test(line) && line.split(/\s+/).length <= 4)
      || (big && line.split(/\s+/).length <= 8));
    if (header) { section = title.replace(/[.…:!]+$/, ""); prevPriced = false; continue; }
    const prev = items[items.length - 1];
    // avec les positions : une suite de plat est juste en dessous, dans la même colonne
    const last = prev && prev.boxes.length ? prev.boxes[prev.boxes.length - 1] : null;
    const near = !box || !last || ((box.col ?? 0) === (last.col ?? 0) && box.y0 - last.y1 < Math.max(h, mid) * 1.6 && box.y0 >= last.y0 && box.x0 < last.x1 && box.x1 > last.x0);
    const continues = prev && !bullet && near && ((bulleted && !price) || /^[a-zà-ÿ(,&]/.test(line) || /^(avec|et|servi|accompagn|sauce|garni|with|served|and)\b/i.test(line)
      || (small && !price) || (priced && !price && prevPriced));
    if (continues) {
      prev.desc = prev.desc ? `${prev.desc} ${line}` : line;
      if (box) prev.boxes.push(box);
      if (price) prevPriced = true;
    } else if (priced && !price && !bullet) {
      // carte avec prix : une ligne isolée, sans prix ni puce, n'est pas un plat (légende, mention, bas de page)
      prevPriced = false;
    } else {
      items.push({ title: line, desc: "", section, boxes: box ? [box] : [] });
      prevPriced = price;
    }
  }
  return items.slice(0, 100);
}

/** Analyse un plat -> { status, flags: [{ id, severity, hidden }], hidden: "ingrédients probables" } */
export function analyzeDish(item, prefs = DEFAULT_PREFS) {
  const text = `${item.title} ${item.desc || ""}`;
  const n = normalize(text);
  const hiddenSure = [], hiddenMaybe = [];
  // poisson ou légumes nommés (« carpaccio de saumon », « burger végétarien ») : la viande devinée ne compte pas
  const noMeat = /\b(saumon|thon|poisson|cabillaud|daurade|dorade|bar|loup|truite|sardines?|anchois|crevettes?|poulpe|calamars?|vegetarien\w*|vegan\w*|vegetal\w*|legumes?|falafels?|halloumi|tofu)\b/.test(n);
  for (const [re, add, sure] of DISHES) if (re.test(n) && !(add === "viande" && noMeat)) (sure ? hiddenSure : hiddenMaybe).push(add);
  // rubrique des vins, bières, cocktails ou apéritifs : boisson alcoolisée, sauf mention « sans alcool »
  if (item.section && /^(vins?|bieres?|cocktails?|aperitifs?|digestifs?)\b/.test(normalize(item.section)) && !/sans alcool|alcohol.?free|0[.,]0 ?%|virgin|mocktail/.test(n)) hiddenSure.push("alcool");
  const seen = (r) => classify({ ingredients_text: r, categories_tags: [] }, prefs).flags.filter((f) => f.severity !== "info" || f.topic);
  // ingrédients écrits sur la carte, puis ingrédients du plat : toujours présents, ou seulement souvent
  const written = seen(text.replace(/\n/g, ", "));
  const ids = new Set(written.map((f) => f.id));
  const extra = [];
  for (const [list, sure] of [[hiddenSure, true], [hiddenMaybe, false]]) {
    if (!list.length) continue;
    for (const f of seen(list.join(", "))) {
      if (ids.has(f.id)) continue;
      ids.add(f.id);
      // un ingrédient seulement « fréquent » n'est jamais plus grave que « à vérifier »
      // le nom de l'ingrédient tel qu'il est écrit (avec ses accents), pas sa forme normalisée
      const orig = list.join(", ").split(/,\s*/).find((x) => normalize(x) === f.source);
      extra.push({ ...f, source: orig || f.source, hidden: true, sure, severity: !sure && f.severity === "haram" ? "mashbouh" : f.severity });
    }
  }
  // Viande : le restaurant peut servir de la viande halal ; c'est une question à lui poser, pas un interdit,
  // sauf si la carte dit déjà « halal »
  const halalSaid = /\bhalal\b|\bhelal\b/.test(n);
  const flags = [...written, ...extra].filter((f) => !(halalSaid && (f.id === "viande" || f.id === "extrait_viande")))
    .map((f) => (f.id === "viande" || f.id === "extrait_viande" ? { ...f, severity: "mashbouh", ask: true } : f));
  const status = flags.some((f) => f.severity === "haram") ? "haram" : flags.some((f) => f.severity === "mashbouh") ? "mashbouh" : "ok";
  return { status, flags, hidden: [...hiddenSure, ...hiddenMaybe].join(", ") };
}

/** Carte complète -> plats analysés, groupés : à éviter, à vérifier, rien de signalé */
export function analyzeMenu(input, prefs = DEFAULT_PREFS) {
  const dishes = menuItems(input).map((it) => ({ ...it, ...analyzeDish(it, prefs) }));
  const count = { haram: 0, mashbouh: 0, ok: 0 };
  dishes.forEach((d) => count[d.status]++);
  return { dishes, count };
}
