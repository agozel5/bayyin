import { test } from "node:test";
import assert from "node:assert/strict";
import { classifyBeauty, BEAUTY_RULES } from "../public/lib/beauty.js";
import { classifyMedicine, isMedicineCode, medShard, medicineRaw } from "../public/lib/medicine.js";
import { checkProfile, PROFILE_ALLERGENS } from "../public/lib/profile.js";
import { present, classifyAny } from "../public/lib/off.js";
import { SCHOOLS, classify } from "../public/lib/rules.js";
import { DICTS } from "../public/lib/i18n.js";

const beauty = (ingredients_text, extra = {}) => ({ code: "3600523000000", kind: "beauty", ingredients_text, ...extra });
const ids = (v) => v.flags.map((f) => f.id);

test("cosmétique : les alcools gras ne sont pas de l'alcool", () => {
  const v = classifyBeauty(beauty("Aqua, Cetearyl Alcohol, Glycerin, Stearyl Alcohol, Benzyl Alcohol, Parfum"));
  assert.equal(v.status, "halal_probable");
  assert.deepEqual(ids(v), []);
});

test("cosmétique : alcool dénaturé suit le réglage alcool_cosmetique", () => {
  const p = beauty("Alcohol Denat., Aqua, Parfum, Linalool");
  assert.equal(classifyBeauty(p, { topics: SCHOOLS.standard }).status, "halal_probable");
  assert.deepEqual(ids(classifyBeauty(p, { topics: SCHOOLS.standard })), ["cosm_alcool"]);
  assert.equal(classifyBeauty(p, { topics: SCHOOLS.shafii }).status, "mashbouh");
  assert.equal(classifyBeauty(p, { topics: { ...SCHOOLS.standard, alcool_cosmetique: "interdit" } }).status, "haram");
});

test("cosmétique : suif, porc, collagène, carmin", () => {
  assert.equal(classifyBeauty(beauty("Sodium Tallowate, Aqua, Glycerin")).status, "mashbouh");
  assert.equal(classifyBeauty(beauty("Aqua, Hydrolyzed Porcine Collagen")).status, "haram");
  assert.deepEqual(ids(classifyBeauty(beauty("Aqua, Marine Collagen"))), []);
  assert.deepEqual(ids(classifyBeauty(beauty("Talc, CI 75470, Mica"))), ["cosm_carmin"]);
});

test("cosmétique végan : pas de signalement animal", () => {
  const v = classifyBeauty(beauty("Aqua, Collagen, Keratin", { labels_tags: ["en:vegan"] }));
  assert.deepEqual(ids(v), []);
});

test("cosmétique sans ingrédients : non déterminé", () => {
  assert.equal(classifyBeauty(beauty("")).status, "inconnu");
});

test("médicament : code CIP13 et répartition en fichiers", () => {
  assert.ok(isMedicineCode("3400930000000"));
  assert.ok(!isMedicineCode("3017620422003"));
  assert.equal(medShard("3400936404816"), "81");
});

test("médicament : gélule douteuse, comprimé non déterminé, sirop en information", () => {
  const raw = (form) => medicineRaw("3400936404816", ["X 500 mg", form, "Labo", "60000000"]);
  assert.equal(classifyMedicine(raw("gélule")).status, "mashbouh");
  assert.equal(classifyMedicine(raw("gélule végétale")).status, "inconnu");
  assert.equal(classifyMedicine(raw("comprimé pelliculé")).status, "inconnu");
  const sirop = classifyMedicine(raw("sirop"));
  assert.equal(sirop.status, "inconnu");
  assert.equal(sirop.flags[0].severity, "info");
  const p = present(raw("capsule molle"));
  assert.equal(p.kind, "medicine");
  assert.equal(p.verdict.status, "mashbouh");
  assert.match(p.offUrl, /medicament\/60000000\/extrait$/);
  assert.equal(classifyAny(p.raw).status, "mashbouh");
});

test("present garde le type cosmétique et recalcule avec classifyAny", () => {
  const p = present(beauty("Aqua, Sodium Tallowate"));
  assert.equal(p.kind, "beauty");
  assert.equal(p.health, null);
  assert.equal(classifyAny(p.raw).status, "mashbouh");
});

test("profil : allergènes, traces et régime", () => {
  const raw = { allergens_tags: ["en:milk", "en:gluten"], traces_tags: ["en:nuts"], ingredients_analysis_tags: ["en:non-vegan", "en:vegetarian"] };
  const v = classify(raw);
  assert.equal(checkProfile(raw, v, { allergens: [], diet: null }).alert, null);
  const a = checkProfile(raw, v, { allergens: ["en:milk", "en:nuts"], diet: null });
  assert.deepEqual(a.contains, ["en:milk"]);
  assert.deepEqual(a.traces, ["en:nuts"]);
  assert.equal(a.alert, "no");
  assert.equal(checkProfile(raw, v, { allergens: ["en:nuts"], diet: null }).alert, "maybe");
  assert.equal(checkProfile(raw, v, { allergens: [], diet: "vegetarian" }).alert, null);
  assert.equal(checkProfile(raw, v, { allergens: [], diet: "vegan" }).alert, "no");
  const meat = { ingredients_text: "porc, sel" };
  assert.equal(checkProfile(meat, classify(meat), { allergens: [], diet: "vegetarian" }).diet.level, "no");
});

test("traductions des cosmétiques, médicaments et allergènes du profil", () => {
  const keys = [
    ...BEAUTY_RULES.flatMap((r) => [`flag.${r.id}.label`, `flag.${r.id}.reason`]),
    "flag.med_gelule.label", "flag.med_gelule.reason", "flag.med_alcool.label", "flag.med_alcool.reason",
    "note.vegan_beauty", "note.beauty_external", "note.med_excipients", "note.med_notice", "note.med_necessity",
    ...PROFILE_ALLERGENS.map((a) => `allergen.${a}`),
  ];
  assert.deepEqual(keys.filter((k) => !(k in DICTS.fr)), []);
});
