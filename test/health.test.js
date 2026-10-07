import { test } from "node:test";
import assert from "node:assert/strict";
import { healthScore, nutrition, additiveRisks, allergens, nova } from "../public/lib/health.js";
import { normalizeScan, validBarcode, expandUpcE } from "../public/lib/barcode.js";
import { pickAlternatives, present } from "../public/lib/off.js";
import { FIXTURES } from "../public/lib/fixtures.js";

const base = { additives_tags: [], labels_tags: [], nutriments: {} };

test("note santé : Nutri-Score + additifs + bio", () => {
  assert.equal(healthScore({ ...base, nutriscore_grade: "a" }).score, 90);
  assert.equal(healthScore({ ...base, nutriscore_grade: "a", labels_tags: ["en:organic"] }).score, 100);
  assert.equal(healthScore({ ...base, nutriscore_grade: "e" }).label, "Médiocre");
  assert.equal(healthScore({ ...base, nutriscore_grade: "b", additives_tags: ["en:e951"] }).score, 65);
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
