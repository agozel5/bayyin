import { test } from "node:test";
import assert from "node:assert/strict";
import { rankList, RANK_CATEGORIES, RANK_ICONS } from "../public/lib/rankings.js";
import { present } from "../public/lib/off.js";

const P = (code, name, extra) => ({ code, product_name: name, nutriments: { "energy-kj_100g": 1500, sugars_100g: 10, "saturated-fat_100g": 2, salt_100g: 0.3 }, ...extra });
const raws = [
  P("1", "Muesli A", { ingredients_text: "flocons d'avoine, raisins", nutriscore_grade: "a" }),
  P("2", "Muesli B", { ingredients_text: "flocons d'avoine, sucre, gélatine de porc", nutriscore_grade: "a" }),
  P("3", "Muesli C", { ingredients_text: "flocons d'avoine, sucre", nutriscore_grade: "c" }),
  P("4", "Muesli D certifié", { ingredients_text: "flocons d'avoine, sucre", nutriscore_grade: "c", labels_tags: ["en:halal"], labels: "Halal" }),
  P("5", "Muesli E lait", { ingredients_text: "flocons d'avoine, lait", nutriscore_grade: "b", allergens_tags: ["en:milk"] }),
];

test("classement : seulement les halal, triés par note, certifiés d'abord à note égale", () => {
  const list = rankList(raws, { present: (r) => present(r) });
  const names = list.map((p) => p.name);
  assert.ok(!names.includes("Muesli B"), "le produit au porc est exclu");
  assert.equal(names[0], "Muesli A");
  assert.ok(names.indexOf("Muesli D certifié") < names.indexOf("Muesli C"));
});

test("classement : filtre « certifiés » et alertes du profil", () => {
  assert.deepEqual(rankList(raws, { present: (r) => present(r), certifiedOnly: true }).map((p) => p.name), ["Muesli D certifié"]);
  const noMilk = rankList(raws, { present: (r) => present(r), alertOf: (p) => (p.raw.allergens_tags || []).includes("en:milk") ? "no" : null });
  assert.ok(!noMilk.some((p) => p.name === "Muesli E lait"));
});

test("chaque rayon a une icône et au moins une étiquette", () => {
  for (const c of RANK_CATEGORIES) {
    assert.ok(RANK_ICONS[c.id], c.id);
    assert.ok(c.tags.length, c.id);
  }
  assert.equal(RANK_CATEGORIES.filter((c) => c.free && c.kind === "food").length, 3);
  assert.equal(RANK_CATEGORIES.filter((c) => c.free && c.kind === "beauty").length, 3);
});
