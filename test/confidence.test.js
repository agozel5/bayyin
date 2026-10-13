import test from "node:test";
import assert from "node:assert/strict";
import { verdictConfidence } from "../public/lib/confidence.js";
import { classify } from "../public/lib/rules.js";

const P = (raw) => ({ raw, ingredients: raw.ingredients_text_fr || "", kind: "food" });
test("fiabilité : label sans conflit = élevée, interdit certain = élevée", () => {
  const cert = { product_name: "Merguez", labels: "Halal AVS", ingredients_text_fr: "viande de bœuf, épices, sel, eau" };
  assert.equal(verdictConfidence(P(cert), classify(cert)).level, "high");
  const pork = { product_name: "Saucisson", ingredients_text_fr: "viande de porc, sel, épices, dextrose" };
  assert.equal(verdictConfidence(P(pork), classify(pork)).level, "high");
});
test("fiabilité : ingrédients sans label = moyenne, sans ingrédients = faible", () => {
  const veg = { product_name: "Biscuit", ingredients_text_fr: "farine de blé, sucre, huile de tournesol, sel", states_tags: ["en:ingredients-completed"] };
  const c = verdictConfidence(P(veg), classify(veg));
  assert.equal(c.level, "medium");
  assert.ok(c.reasons.find((r) => r.id === "checked").ok);
  const empty = { product_name: "Inconnu" };
  assert.equal(verdictConfidence(P(empty), classify(empty)).level, "low");
});
