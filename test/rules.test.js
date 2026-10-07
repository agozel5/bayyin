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
    "3560070998005": "halal_probable", // bière 0,0 %
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

test("carmin : douteux par défaut, interdit chez les hanafites, permis chez les malékites", () => {
  const dragibus = FIXTURES["4001686301029"];
  assert.equal(classify(dragibus).flags.find((f) => f.id === "e120").severity, "mashbouh");
  assert.equal(classify(dragibus, withSchool("hanafi")).status, "haram");
  const maliki = classify(dragibus, withSchool("maliki"));
  assert.equal(maliki.flags.find((f) => f.id === "e120").severity, "info");
  assert.equal(maliki.status, "mashbouh"); // la gélatine reste douteuse
});

test("présure : acceptée par les hanafites, douteuse chez les chaféites", () => {
  const camembert = FIXTURES["3228021587011"];
  assert.equal(classify(camembert, withSchool("hanafi")).status, "halal_probable");
  assert.equal(classify(camembert, withSchool("shafii")).status, "mashbouh");
});

test("vinaigre de vin : info par défaut, douteux pour le réglage prudent", () => {
  const v = FIXTURES["3560070462803"];
  assert.equal(classify(v).status, "halal_probable");
  assert.equal(classify(v, withSchool("prudent")).status, "mashbouh");
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
