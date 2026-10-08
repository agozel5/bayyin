import { test } from "node:test";
import assert from "node:assert/strict";
import { classify } from "../public/lib/rules.js";
import { FIXTURES } from "../public/lib/fixtures.js";

const ids = (v) => v.flags.map((f) => f.id);
const p = (ingredients_text_fr, extra = {}) => ({ ingredients_text_fr, additives_tags: [], labels_tags: [], ...extra });

test("produits d'exemple : verdicts attendus", () => {
  const expected = {
    "3017620422003": "halal_probable", // Nutella
    "4001686301029": "mashbouh",       // Dragibus : gélatine + E120
    "3019081100148": "haram",          // saucisson pur porc
    "6111242002012": "halal_certifie", // nuggets AVS
    "3245390011015": "mashbouh",       // pain de mie : E471
    "3560070462803": "halal_probable", // vinaigrette : vinaigre de vin = info
    "3560070998005": "mashbouh",       // bière 0,0 % : bière sans alcool, sujet débattu
    "3250392420017": "haram",          // baba au rhum
    "3228021587011": "mashbouh",       // camembert : présure
    "3263859893408": "halal_probable", // chips arôme poulet, végétalien
    "3274080005003": "halal_probable", // eau sans ingrédients
  };
  for (const [code, status] of Object.entries(expected)) {
    assert.equal(classify(FIXTURES[code]).status, status, FIXTURES[code].product_name_fr);
  }
});

test("le porc l'emporte sur un label halal", () => {
  const v = classify(p("Viande de porc, sel", { labels_tags: ["en:halal"] }));
  assert.equal(v.status, "haram");
  assert.ok(v.notes.length > 0);
});

test("jambon de dinde n'est pas du porc", () => {
  const v = classify(p("Jambon de dinde, sel, dextrose"));
  assert.ok(!ids(v).includes("porc"));
  assert.ok(ids(v).includes("viande"));
});

test("orange sanguine n'est pas du sang", () => {
  assert.ok(!ids(classify(p("Jus d'orange sanguine, sucre"))).includes("sang"));
});

test("arôme rhum est douteux, pas haram", () => {
  const v = classify(p("Sucre, farine, arôme naturel de rhum"));
  assert.equal(v.status, "mashbouh");
  assert.deepEqual(ids(v), ["arome_alcool"]);
});

test("présure microbienne n'est pas signalée", () => {
  assert.equal(classify(p("Lait, sel, présure microbienne")).status, "halal_probable");
});

test("gélatine de poisson ou halal acceptée, gélatine de porc interdite", () => {
  assert.equal(classify(p("Sucre, gélatine de poisson")).status, "halal_probable");
  assert.equal(classify(p("Sucre, gélatine bovine halal")).status, "halal_probable");
  assert.equal(classify(p("Sucre, gélatine de porc")).status, "haram");
});

test("E471 d'origine végétale déclarée passe en info", () => {
  const v = classify(p("Farine, émulsifiant : E471 (origine végétale)", { additives_tags: ["en:e471"] }));
  assert.equal(v.status, "halal_probable");
  assert.equal(v.flags[0].severity, "info");
});

test("origine végétale d'un autre additif ne blanchit pas E471", () => {
  const v = classify(p("Émulsifiant : E471, huile de colza", { additives_tags: ["en:e471"] }));
  assert.equal(v.status, "mashbouh");
});

test("code E repéré dans le texte même sans additives_tags", () => {
  assert.ok(ids(classify(p("Sucre, colorant E120"))).includes("e120"));
});

test("suffixe de tag OFF (e322i) n'est pas confondu", () => {
  assert.equal(classify(p("Sucre, lécithine", { additives_tags: ["en:e322i"] })).flags.length, 0);
});

test("organisme de certification reconnu", () => {
  const v = classify(p("Poulet, sel", { labels_tags: ["en:halal"], labels: "Halal, Achahada" }));
  assert.equal(v.status, "halal_certifie");
  assert.equal(v.certification.organisme, "Achahada");
});

test("sans alcool et polyols ne sont pas de l'alcool", () => {
  assert.equal(classify(p("Eau, malt, houblon. Bière sans alcool")).status, "halal_probable");
  assert.equal(classify(p("Édulcorants : polyols (sucres-alcools)")).status, "halal_probable");
});

// ---------------------------------------------------------------------------
// Écoles et sujets débattus
// ---------------------------------------------------------------------------
import { SCHOOLS } from "../public/lib/rules.js";
const withSchool = (s) => ({ school: s, topics: SCHOOLS[s] });

test("carmin : douteux par défaut et chez malékites et chaféites, interdit chez hanafites et hanbalites", () => {
  const dragibus = FIXTURES["4001686301029"];
  assert.equal(classify(dragibus).flags.find((f) => f.id === "e120").severity, "mashbouh");
  assert.equal(classify(dragibus, withSchool("hanafi")).status, "haram");
  assert.equal(classify(dragibus, withSchool("hanbali")).status, "haram");
  assert.equal(classify(dragibus, withSchool("maliki")).flags.find((f) => f.id === "e120").severity, "mashbouh");
  assert.equal(classify(dragibus, withSchool("shafii")).flags.find((f) => f.id === "e120").severity, "mashbouh");
});

test("présure : douteuse partout (origine et abattage inconnus)", () => {
  const camembert = FIXTURES["3228021587011"];
  for (const s of ["standard", "hanafi", "maliki", "shafii", "hanbali"]) assert.equal(classify(camembert, withSchool(s)).status, "mashbouh", s);
});

test("vinaigre de vin : permis hanafites/malékites, interdit chaféites/hanbalites", () => {
  const v = FIXTURES["3560070462803"];
  assert.equal(classify(v).status, "halal_probable");
  assert.equal(classify(v, withSchool("hanafi")).status, "halal_probable");
  assert.equal(classify(v, withSchool("maliki")).status, "halal_probable");
  assert.equal(classify(v, withSchool("shafii")).status, "haram");
  assert.equal(classify(v, withSchool("hanbali")).status, "haram");
  assert.equal(classify(v, withSchool("prudent")).status, "haram");
});

test("fruits de mer : interdits pour les hanafites seulement ; crevettes débattues", () => {
  const moules = p("Moules, vin blanc, échalotes");
  assert.equal(classify(p("Moules, échalotes, beurre")).status, "halal_probable");
  assert.equal(classify(p("Moules, échalotes, beurre"), withSchool("hanafi")).status, "haram");
  assert.equal(classify(p("Crevettes, sel"), withSchool("hanafi")).status, "halal_probable");
  assert.equal(classify(p("Crevettes, sel"), withSchool("prudent")).status, "mashbouh");
  assert.ok(ids(classify(moules)).includes("alcool"));
});

test("grenouille, escargot, cheval, âne, sanglier, insectes", () => {
  assert.equal(classify(p("Cuisses de grenouille, ail"), withSchool("maliki")).status, "halal_probable");
  assert.equal(classify(p("Cuisses de grenouille, ail"), withSchool("shafii")).status, "haram");
  assert.equal(classify(p("Escargots, beurre, persil")).status, "mashbouh");
  const cheval = classify(p("Viande de cheval, sel"), withSchool("shafii"));
  assert.ok(ids(cheval).includes("cheval") && ids(cheval).includes("viande")); // l'abattage reste en question
  assert.equal(classify(p("Viande d'âne, sel")).status, "haram");
  assert.equal(classify(p("Savon au lait d'ânesse")).status, "halal_probable");
  assert.equal(classify(p("Pâté de sanglier, sel")).status, "haram");
  assert.equal(classify(p("Farine, poudre de grillon (Acheta domesticus)"), withSchool("hanafi")).status, "haram");
  assert.equal(classify(p("Criquets grillés, sel")).status, "halal_probable");
});

test("viande non certifiée : interdite ; un label halal lève le doute sur l'abattage", () => {
  assert.equal(classify(p("Filet de poulet, sel")).status, "haram");
  assert.equal(classify(p("Filet de poulet, sel", { labels_tags: ["en:halal"] })).status, "halal_certifie");
  assert.ok(!ids(classify(p("Chips, arôme poulet"))).includes("viande"));
});

test("un label halal ne tranche pas une divergence d'école", () => {
  const v = classify(p("Moules, crème", { labels_tags: ["en:halal"] }), withSchool("hanafi"));
  assert.equal(v.status, "haram");
  assert.ok(v.notes.includes("cert_school"));
});

test("kombucha et traces d'alcool de fermentation : simple information", () => {
  const v = classify(p("Thé fermenté (kombucha), sucre, traces d'alcool"));
  assert.equal(v.status, "halal_probable");
});

test("réglage personnalisé d'un seul sujet", () => {
  const prefs = { school: "custom", topics: { ...SCHOOLS.standard, gelatine: "interdit" } };
  assert.equal(classify(p("Sucre, gélatine"), prefs).status, "haram");
  const f = classify(p("Sucre, gélatine"), prefs).flags[0];
  assert.equal(f.topic, "gelatine");
  assert.equal(f.decision, "interdit");
});

test("une origine végétale déclarée n'est pas modifiée par le réglage", () => {
  const prefs = { school: "custom", topics: { ...SCHOOLS.standard, derives: "interdit" } };
  const v = classify(p("Farine, E471 (origine végétale)", { additives_tags: ["en:e471"] }), prefs);
  assert.equal(v.status, "halal_probable");
});

test("mots-clés turcs et arabes", () => {
  assert.equal(classify(p("Su, şeker, domuz jelatini")).status, "haram");
  assert.equal(classify(p("Şeker, sığır jelatini")).status, "mashbouh");
  assert.equal(classify(p("Şeker, helal sığır jelatini")).status, "halal_probable");
  assert.equal(classify(p("Su, şarap, şeker")).status, "haram");
  assert.equal(classify(p("Alkolsüz malt içeceği")).status, "halal_probable");
  assert.equal(classify(p("Peynir mayası, süt, tuz")).status, "mashbouh");
  assert.equal(classify(p("ماء، سكر، دهن خنزير")).status, "haram");
  assert.equal(classify(p("سكر، جيلاتين، منكهات")).status, "mashbouh");
  assert.equal(classify(p("سكر، جيلاتين حلال")).status, "halal_probable");
  assert.equal(classify(p("Süt, tuz", { labels: "Helal" })).status, "halal_certifie");
});

test("marque spécialisée halal : la fiche sans label est reconnue", () => {
  const hanafi = { topics: { ...SCHOOLS.hanafi } };
  const p = { product_name_fr: "Blanc de poulet", brands: "Isla Mondial", ingredients_text_fr: "Filet de poulet 92%, eau, sel, dextrose, arôme naturel" };
  const v = classify(p, hanafi);
  assert.equal(v.status, "halal_certifie");
  assert.ok(v.notes.includes("brand_halal"));
  assert.equal(v.certification.brand, "Isla Délice / Isla Mondial");
  // Une autre marque reste soumise à l'avis choisi
  assert.equal(classify({ ...p, brands: "Le Gaulois" }, hanafi).status, "haram");
  // Le porc reste interdit quelle que soit la marque
  assert.equal(classify({ ...p, ingredients_text_fr: "Viande de porc" }).status, "haram");
});
