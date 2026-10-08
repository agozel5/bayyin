import { test } from "node:test";
import assert from "node:assert/strict";
import { cosmeticRisks, cosmeticScore, analyzeCosmetic, exposureContext } from "../public/lib/cosmetic.js";
import { present, similarity, categoryPath, createClient } from "../public/lib/off.js";
import { FIXTURES } from "../public/lib/fixtures.js";
import { SOURCE_BY_ID } from "../public/lib/sources.js";
import { COSMETIC_RULES } from "../public/lib/cosmetic.js";

const p = (ingredients_text) => ({ ingredients_text });

const prod = (ingredients_text, categories_tags = [], product_name = "") => ({ ingredients_text, categories_tags, product_name });
const keysOf = (r) => r.map((x) => x.key);

test("cosmétiques : ingrédients reconnus (INCI)", () => {
  const r = cosmeticRisks(p("Aqua, Sodium Laureth Sulfate, Parfum (Fragrance), Methylisothiazolinone, Limonene, Propylparaben, Cetearyl Alcohol, Glycerin"));
  const keys = keysOf(r);
  assert.equal(keys[0], "isothiazolinone", "le plus grave en tête");
  assert.ok(keys.includes("propylparaben") && keys.includes("ethoxylated") && keys.includes("fragrance_allergen"));
  assert.equal(keys.filter((k) => k === "fragrance").length, 1, "« Parfum (Fragrance) » compté une fois");
  assert.ok(!keys.includes("sulfate"), "laureth sulfate n'est pas du SLS");
  assert.equal(cosmeticRisks(p("Aqua, Glycerin, Cetearyl Alcohol, Butyrospermum Parkii Butter, Tocopherol")).length, 0);
  assert.equal(cosmeticRisks(p("Methylparaben"))[0].key, "paraben_short");
  assert.equal(cosmeticRisks(p("Butylparaben"))[0].key, "butylparaben");
  assert.equal(cosmeticRisks(p("Aluminum Starch Octenylsuccinate")).length, 0);
  assert.equal(cosmeticRisks(p("PEG-40 Hydrogenated Castor Oil"))[0].key, "ethoxylated");
  assert.equal(cosmeticRisks(p("Toluene-2,5-Diamine Sulfate"))[0].key, "hair_dye", "pas confondu avec le toluène");
  assert.equal(cosmeticRisks(p("Benzyl Salicylate, Salicylic Acid")).map((r) => r.key).sort().join(), "fragrance_allergen,salicylic");
  assert.equal(cosmeticRisks(p("Ricinus Communis Seed Oil, PTFE"))[0].key, "pfas");
});

test("cosmétiques : contexte d'exposition", () => {
  assert.equal(exposureContext(prod("", ["en:shower-gels"])).rinse, true);
  assert.equal(exposureContext(prod("", ["en:body-lotions"])).rinse, false);
  assert.equal(exposureContext(prod("", [], "Lingettes nettoyantes bébé")).rinse, false, "une lingette reste sur la peau");
  assert.equal(exposureContext(prod("", [], "Lingettes nettoyantes bébé")).child, true);
  assert.equal(exposureContext(prod("", [], "Baume après-rasage")).rinse, false);
  assert.equal(exposureContext(prod("", ["en:sunscreens"], "Spray solaire SPF 50")).spray, true);
  assert.equal(exposureContext(prod("", ["en:lipsticks"], "Rouge à lèvres")).lip, true);
});

test("cosmétiques : le même ingrédient pèse plus dans un produit non rincé", () => {
  const ing = "Aqua, Sodium Laureth Sulfate, Parfum, Methylchloroisothiazolinone, Methylisothiazolinone, Limonene";
  const rinse = analyzeCosmetic(prod(ing, ["en:shower-gels"], "Gel douche"));
  const leave = analyzeCosmetic(prod(ing, ["en:body-lotions"], "Lait corps"));
  assert.equal(rinse.risks[0].level, "modere");
  assert.equal(leave.risks[0].level, "eleve", "MI interdite dans les produits non rincés");
  assert.ok(rinse.score.score >= 25 && rinse.score.score <= 49);
  assert.ok(leave.score.score <= 24);
  // Le phénoxyéthanol n'est pas pénalisé dans un shampooing
  const sh = analyzeCosmetic(prod("Aqua, Coco-Glucoside, Phenoxyethanol", ["en:shampoos"], "Shampooing"));
  assert.equal(sh.risks[0].level, null);
  assert.equal(sh.score.score, 100);
});

test("cosmétiques : produits pour enfant, sprays, position dans la liste", () => {
  const ing = "Aqua, Glycerin, Propylparaben, Talc";
  assert.equal(analyzeCosmetic(prod(ing, ["en:body-lotions"])).score.grade, "mediocre");
  const baby = analyzeCosmetic(prod(ing, ["en:baby-care"], "Lait bébé"));
  assert.equal(baby.score.grade, "mauvais");
  const spray = analyzeCosmetic(prod("Alcohol Denat., Homosalate, Titanium Dioxide (nano)", ["en:sunscreens"], "Spray solaire aérosol"));
  assert.deepEqual(spray.risks.map((r) => r.level), ["eleve", "modere"]);
  assert.equal(spray.risks.filter((r) => /titanium/i.test(r.name)).length, 1, "le dioxyde de titane nano n'est compté qu'une fois");
  // Après un conservateur plafonné à 1 % : dose ≤ 1 %
  const r = cosmeticRisks(prod("Aqua, Sodium Laureth Sulfate, Phenoxyethanol, PEG-7 Glyceryl Cocoate", ["en:body-lotions"]));
  assert.equal(r.find((x) => x.name === "Sodium Laureth Sulfate").dose, "major");
  assert.equal(r.find((x) => x.name.startsWith("PEG-7")).dose, "minor");
});

test("cosmétiques : fourchettes de la note", () => {
  assert.equal(cosmeticScore(p("Aqua, Glycerin, Sodium Benzoate")).score, 100);
  assert.equal(cosmeticScore(p("")), null, "sans liste d'ingrédients : pas de note");
  const high = cosmeticScore(p("Aqua, Glycerin, Zinc Pyrithione"));
  assert.ok(high.score <= 24 && high.grade === "mauvais");
  const mod = cosmeticScore(p("Aqua, Glycerin, Octocrylene"));
  assert.equal(mod.score, 49);
  const limited = cosmeticScore(p("Parfum, Limonene, Linalool, Geraniol, Citronellol, Coumarin, Eugenol, Citral, Benzyl Alcohol"));
  assert.ok(limited.score >= 50 && limited.score < 100);
  const many = cosmeticScore(p(Array.from({ length: 40 }, (_, i) => `PEG-${i + 1} Stearate`).join(", ")));
  assert.equal(many.score, 50, "jamais sous 50 sans risque modéré ou élevé");
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
  assert.ok(gel.health.context.rinse);
  assert.ok(gel.health.score.score <= 49);
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

test("cosmétiques : pas de faux positifs courants", () => {
  assert.equal(cosmeticRisks(p("Butyl Acetate, Tosylamide/Formaldehyde Resin")).length, 0, "résine de vernis autorisée");
  assert.equal(cosmeticRisks(p("Phenylmercuric Acetate")).length, 0, "autorisé dans les produits pour les yeux");
  assert.equal(cosmeticRisks(p("PPG-15 Stearyl Ether")).length, 0, "PPG : pas de 1,4-dioxane");
  // Huile minérale : sans risque sur la peau, signalée sur les lèvres
  assert.equal(cosmeticRisks(prod("Paraffinum Liquidum", ["en:body-lotions"]))[0].level, null);
  assert.equal(cosmeticRisks(prod("Paraffinum Liquidum", ["en:lip-balms"], "Baume à lèvres"))[0].level, "limite");
  // Propylparaben : élevé seulement pour un produit pour enfant laissé sur la peau
  assert.equal(cosmeticRisks(prod("Propylparaben", ["en:shampoos"], "Shampooing bébé"))[0].level, "limite");
  assert.equal(cosmeticRisks(prod("Propylparaben", ["en:baby-lotions"], "Lait bébé"))[0].level, "eleve");
});
