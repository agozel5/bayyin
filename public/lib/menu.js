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
  [/\bjamon\b|\bserrano\b|\biberico\b|\bprosciutto\b|\bmortadell[ea]\b|\bsalami\b|\bspeck\b/, "porc", true],
  [/\bpaella\b/, "chorizo, fruits de mer", false],
  // Alcool dans la cuisson ou la sauce
  [/\bbourguignon\b|\bcoq au vin\b|\bboeuf mode\b|\bdaube\b/, "vin rouge", true],
  [/\bmarinieres?\b/, "vin blanc", true],
  [/\bfondue (savoyarde|au fromage)\b|\bfondue\b/, "vin blanc, kirsch", false],
  [/\brisotto\b/, "vin blanc", false],
  [/\bcarbonade\b|\bwelsh\b/, "bière", true],
  [/\bsauce (au )?(vin|porto|madere|cognac|marsala)\b|\bau (porto|madere|cognac|calvados|whisky)\b/, "alcool", true],
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
  [/\b(entrecote|steak|bavette|faux.?filet|rumsteck|onglet|cote de boeuf|tartare|burgers?|cheeseburger|kebab|kefta|merguez|magret|confit|gigot|souris d.?agneau|brochettes?|cordon.?bleu|escalope|blanquette|pot.?au.?feu|hachis parmentier|lasagnes?|bolognaise|chili con carne|tajine|couscous|nuggets?|wings|cote d.?agneau|carpaccio|osso.?buco|schnitzel|gyros|shawarma|chawarma)\b/, "viande", true],
  // Gélatine
  [/\bpanna cotta\b|\bbavarois\b|\bcharlotte\b|\bmousse de fruits\b|\bentremets\b/, "gélatine", false],
  [/\bcheesecake\b|\bguimauve\b|\bmarshmallow\b|\bgelee\b|\baspic\b/, "gélatine", false],
];

// Titres de rubriques (on les garde comme intertitres, ils ne sont pas analysés)
const SECTIONS = /^(entrees?|starters?|plats?( principaux)?|mains?|desserts?|boissons?|drinks?|vins?|bieres?|cocktails?|aperitifs?|menu( du jour| enfant)?|formules?|pizzas?|pates|burgers?|salades?|sandwichs?|accompagnements?|sides?|fromages?|softs?|boissons chaudes|antipasti|primi|secondi|dolci|tapas|vorspeisen|hauptgerichte|nachspeisen|getranke)$/;

// Ligne de carte -> texte utile (sans prix ni numéros)
function clean(line) {
  return String(line || "")
    .replace(/\d+[.,]\d{1,2}\s*(€|eur\b|euros?\b)?|\d+\s*(€|eur\b|euros?\b)|€\s*\d+([.,]\d{1,2})?/gi, " ")
    .replace(/\.{2,}|_{2,}|-{3,}/g, " ")
    .replace(/^\s*[\d•*·\-–—]+[.)]?\s*/, "")
    .replace(/\s+/g, " ")
    .trim();
}
const letters = (s) => (s.match(/\p{L}/gu) || []).length;

/** Découpe le texte lu en plats { title, desc, section } (une description suit son plat). */
export function menuItems(text) {
  const items = [];
  let section = null;
  for (const rawLine of String(text || "").split(/\n+/)) {
    const line = clean(rawLine);
    if (letters(line) < 3) continue;
    const n = normalize(line);
    if (SECTIONS.test(n.replace(/[:.!]/g, "").trim())) { section = line.replace(/[:.]+$/, ""); continue; }
    const prev = items[items.length - 1];
    // suite d'une description : commence par une minuscule, « avec », « et », une virgule ou une parenthèse
    const continues = prev && (/^[a-zà-ÿ(,&+]/.test(line) || /^(avec|et|servi|accompagn|sauce|garni|with|served|and)\b/i.test(line));
    if (continues) prev.desc = prev.desc ? `${prev.desc} ${line}` : line;
    else items.push({ title: line, desc: "", section });
  }
  return items.slice(0, 80);
}

/** Analyse un plat -> { status, flags: [{ id, severity, hidden }], hidden: "ingrédients probables" } */
export function analyzeDish(item, prefs = DEFAULT_PREFS) {
  const text = `${item.title} ${item.desc || ""}`;
  const n = normalize(text);
  const hiddenSure = [], hiddenMaybe = [];
  for (const [re, add, sure] of DISHES) if (re.test(n)) (sure ? hiddenSure : hiddenMaybe).push(add);
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
      extra.push({ ...f, hidden: true, sure, severity: !sure && f.severity === "haram" ? "mashbouh" : f.severity });
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
export function analyzeMenu(text, prefs = DEFAULT_PREFS) {
  const dishes = menuItems(text).map((it) => ({ ...it, ...analyzeDish(it, prefs) }));
  const count = { haram: 0, mashbouh: 0, ok: 0 };
  dishes.forEach((d) => count[d.status]++);
  return { dishes, count };
}
