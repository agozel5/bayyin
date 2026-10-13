import { test } from "node:test";
import assert from "node:assert/strict";
import { healthScore, nutrition, additiveRisks, allergens, nova } from "../public/lib/health.js";
import { normalizeScan, validBarcode, expandUpcE } from "../public/lib/barcode.js";
import { pickAlternatives, present } from "../public/lib/off.js";
import { FIXTURES } from "../public/lib/fixtures.js";

const base = { additives_tags: [], labels_tags: [], nutriments: {} };

test("note santé : nutrition au point près + additifs + transformation + bio", async () => {
  const { nutritionPoints } = await import("../public/lib/health.js");
  // Sans points Nutri-Score : milieu de la plage de la lettre ; transformation inconnue = 5
  assert.equal(healthScore({ ...base, nutriscore_grade: "a" }).score, 51 + 25 + 5);
  assert.equal(healthScore({ ...base, nutriscore_grade: "a", labels_tags: ["en:organic"], nova_group: 1 }).score, 51 + 25 + 10 + 10);
  assert.equal(healthScore({ ...base, nutriscore_grade: "e", nutriscore_score: 30, nova_group: 4, additives_tags: ["en:e951"] }).label, "Mauvais");
  assert.equal(healthScore({ ...base, nutriscore_grade: "b", nova_group: 4, additives_tags: ["en:e951"] }).score, 42 + 17 + 0);
  // Au point près : deux produits A ne valent pas la même chose
  assert.equal(nutritionPoints("a", -15), 55);
  assert.equal(nutritionPoints("a", 0), 46);
  assert.ok(healthScore({ ...base, nutriscore_grade: "a", nutriscore_score: -8 }).score > healthScore({ ...base, nutriscore_grade: "a", nutriscore_score: -1 }).score);
  // Boissons : plages propres au Nutri-Score des boissons
  assert.equal(nutritionPoints("e", 25, true), 0);
  assert.equal(nutritionPoints("c", 3, true), 37);
  // Le détail de la note est fourni
  const parts = healthScore({ ...base, nutriscore_grade: "c", nova_group: 3 }).parts;
  assert.deepEqual([parts.nova, parts.novaKnown, parts.bio], [6, true, 0]);
});

test("un additif à risque élevé plafonne la note à 49", () => {
  const s = healthScore({ ...base, nutriscore_grade: "a", labels_tags: ["en:organic"], additives_tags: ["en:e250"] });
  assert.ok(s.score <= 49);
});

test("pas de Nutri-Score : pas de note inventée", () => {
  assert.equal(healthScore({ ...base, nutriscore_grade: "unknown" }), null);
  assert.equal(healthScore(base), null);
});

test("seuils nutritionnels : aliment et boisson", () => {
  const food = nutrition({ ...base, nutriments: { "sugars_100g": 30, "salt_100g": 0.2 } });
  assert.equal(food.negatives.find((n) => n.id === "sugars").level, "eleve");
  assert.equal(food.positives.find((n) => n.id === "salt").level, "faible");
  const soda = nutrition({ ...base, categories_tags: ["en:beverages"], nutriments: { "sugars_100g": 10.6 } });
  assert.equal(soda.negatives[0].level, "modere");
  assert.equal(soda.per, "100 ml");
});

test("calories déduites des kJ si besoin", () => {
  const n = nutrition({ ...base, nutriments: { "energy_100g": 2000 } });
  assert.equal(Math.round(n.negatives[0].value), 478);
});

test("risque des additifs, allergènes, NOVA", () => {
  const r = additiveRisks({ additives_tags: ["en:e471", "en:e250", "en:e330", "en:e150d"] });
  assert.deepEqual(r.map((x) => x.code), ["E250", "E150D", "E471"]);
  assert.deepEqual(allergens({ allergens_tags: ["en:milk", "en:gluten", "en:xyz"] }), ["Lait", "Gluten"]);
  assert.equal(nova({ nova_group: 4 }).label, "Ultra-transformé");
});

test("codes-barres : clé de contrôle et UPC-E", () => {
  assert.equal(normalizeScan("3017620422003"), "3017620422003");
  assert.equal(normalizeScan("3017620422004"), null);
  assert.ok(validBarcode("96385074"));
  assert.equal(expandUpcE("01234565"), "012345000065");
});

test("alternatives : halal et mieux notées", () => {
  const all = Object.values(FIXTURES).map(present);
  const nutella = all.find((p) => p.code === "3017620422003");
  const alts = pickAlternatives(nutella, all);
  assert.ok(alts.length >= 1);
  for (const a of alts) {
    assert.ok(a.verdict.status.startsWith("halal"));
    assert.ok(a.health.score.score > nutella.health.score.score);
  }
  const pork = all.find((p) => p.code === "3019081100148");
  assert.ok(pickAlternatives(pork, all).some((a) => a.name.includes("bœuf")));
});

test("alternatives : produit déjà parmi les mieux notés de son rayon", async () => {
  const { similarAlternatives } = await import("../public/lib/off.js");
  const cats = ["en:snacks", "en:biscuits", "en:chocolate-biscuits"];
  const mk = (code, score, status = "halal_probable") => ({ code, kind: "food", name: "Biscuit " + code, brand: "B" + code, categories: cats,
    verdict: { status }, health: { score: { score } } });
  const me = mk("1", 90);
  const res = await similarAlternatives(me, async () => [mk("2", 60), mk("3", 70), mk("4", 80), mk("5", 95, "haram")]);
  assert.equal(res.length, 0);
  assert.equal(res.best, true);
  const res2 = await similarAlternatives(mk("9", 40, "haram"), async () => [mk("2", 60), mk("3", 70, "halal_certifie")]);
  assert.equal(res2[0].code, "3", "produit haram : l'alternative certifiée d'abord");
});

test("Nutri-Score calculé quand Open Food Facts n'en donne pas", async () => {
  const { estimateNutriscore, healthScore } = await import("../public/lib/health.js");
  // Granola protéiné (fiche réelle sans Nutri-Score, sel absent) : A, signalé comme estimé
  const granola = { nutriscore_grade: "unknown", categories_tags: ["en:breakfast-cereals"],
    nutriments: { "energy-kj_100g": 1780, sugars_100g: 10.9, "saturated-fat_100g": 2.5, proteins_100g: 20.6, fiber_100g: 13.3 } };
  assert.deepEqual(estimateNutriscore(granola), { grade: "a", points: -2, saltMissing: true });
  assert.equal(healthScore(granola).estimated.saltMissing, true);
  // Soda sucré : E ; biscuit gras et sucré : E ; données insuffisantes : rien
  assert.equal(estimateNutriscore({ categories_tags: ["en:beverages"], nutriments: { "energy-kj_100g": 180, sugars_100g: 10.6, "saturated-fat_100g": 0, salt_100g: 0 } }).grade, "e");
  assert.equal(estimateNutriscore({ nutriments: { "energy-kj_100g": 2000, sugars_100g: 30, "saturated-fat_100g": 9, salt_100g: 0.6, proteins_100g: 6, fiber_100g: 3 } }).grade, "e");
  assert.equal(estimateNutriscore({ nutriments: { "energy-kcal_100g": 400 } }), null);
  assert.equal(estimateNutriscore({ categories_tags: ["en:cheeses"], nutriments: { "energy-kj_100g": 1500, sugars_100g: 0, "saturated-fat_100g": 18 } }), null);
  // Note officielle présente : pas d'estimation
  assert.equal(healthScore({ nutriscore_grade: "b", nutriments: {} }).estimated, null);
});
