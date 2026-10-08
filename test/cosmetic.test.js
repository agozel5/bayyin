import { test } from "node:test";
import assert from "node:assert/strict";
import { cosmeticRisks, cosmeticScore, analyzeCosmetic } from "../public/lib/cosmetic.js";
import { present, similarity, categoryPath, createClient } from "../public/lib/off.js";
import { FIXTURES } from "../public/lib/fixtures.js";
import { SOURCE_BY_ID } from "../public/lib/sources.js";
import { COSMETIC_RULES } from "../public/lib/cosmetic.js";

const p = (ingredients_text) => ({ ingredients_text });

test("cosmétiques : ingrédients controversés reconnus (INCI)", () => {
  const r = cosmeticRisks(p("Aqua, Sodium Laureth Sulfate, Parfum (Fragrance), Methylisothiazolinone, Limonene, Propylparaben, Cetearyl Alcohol, Glycerin"));
  const keys = r.map((x) => x.key);
  assert.deepEqual(keys.slice(0, 2).sort(), ["isothiazolinone", "paraben_long"]);
  assert.ok(keys.includes("ethoxylated") && keys.includes("fragrance_allergen"));
  assert.equal(keys.filter((k) => k === "fragrance").length, 1, "« Parfum (Fragrance) » compté une fois");
  assert.ok(!keys.includes("sulfate"), "laureth sulfate n'est pas du SLS");
  // Les alcools gras et la glycérine ne sont pas des ingrédients à risque
  assert.equal(cosmeticRisks(p("Aqua, Glycerin, Cetearyl Alcohol, Butyrospermum Parkii Butter, Tocopherol")).length, 0);
  // Le méthylparaben n'est pas un paraben à chaîne longue
  assert.equal(cosmeticRisks(p("Methylparaben"))[0].key, "paraben_short");
  assert.equal(cosmeticRisks(p("Aluminum Starch Octenylsuccinate")).length, 0);
  assert.equal(cosmeticRisks(p("PEG-40 Hydrogenated Castor Oil"))[0].key, "ethoxylated");
});

test("cosmétiques : note sur 100 et plafonds", () => {
  assert.equal(cosmeticScore(p("Aqua, Glycerin, Sodium Benzoate")).score, 100);
  assert.equal(cosmeticScore(p("")), null, "sans liste d'ingrédients : pas de note");
  const high = cosmeticScore(p("Aqua, Glycerin, Triclosan"));
  assert.ok(high.score <= 40);
  const mod = cosmeticScore(p("Aqua, Glycerin, Talc"));
  assert.equal(mod.score, 70);
  assert.equal(mod.grade, "bon");
  // Les risques limités ne retirent pas plus de 30 points
  const many = cosmeticScore(p("Parfum, Limonene, Linalool, Geraniol, Citronellol, Coumarin, Eugenol, Citral, Benzyl Alcohol"));
  assert.equal(many.score, 70);
  const a = analyzeCosmetic(p("Aqua, Talc"));
  assert.equal(a.cosmetic, true);
  assert.equal(a.analyzed, 2);
});

test("cosmétiques : chaque règle cite des sources connues", () => {
  for (const r of COSMETIC_RULES) for (const s of r.sources) assert.ok(SOURCE_BY_ID[s], `${r.key} -> ${s}`);
});

test("cosmétiques : la fiche présentée porte la note", () => {
  const gel = present(FIXTURES["3600523000029"]);
  assert.equal(gel.kind, "beauty");
  assert.ok(gel.health.cosmetic);
  assert.ok(gel.health.score.score <= 40);
});

test("alternatives semblables : même catégorie précise", async () => {
  const shower = present(FIXTURES["3600523000029"]);
  const shampoo = present(FIXTURES["3600523000043"]);
  const shower2 = present(FIXTURES["3600523000036"]);
  assert.equal(categoryPath(shower).ref, "en:shower-gels");
  assert.ok(similarity(shower, shower2) > similarity(shower, shampoo));
  const client = createClient({ demo: true });
  const alts = await client.alternatives(shower);
  assert.deepEqual(alts.map((a) => a.code), ["3600523000036"], "un gel douche, pas un shampooing");
  // Catégories trop générales : on ne remonte pas jusqu'à « Hygiène »
  assert.equal(categoryPath({ categories: ["en:hygiene", "en:shower-gels"] }).parent, null);
  // La catégorie de référence d'Open Food Facts a priorité
  assert.equal(categoryPath({ categories: ["en:snacks", "en:biscuits", "en:chocolate-biscuits", "en:organic-biscuits"], compared: "en:chocolate-biscuits" }).ref, "en:chocolate-biscuits");
  assert.equal(categoryPath({ categories: ["en:snacks", "en:biscuits", "en:chocolate-biscuits"] }).parent, "en:biscuits");
});
