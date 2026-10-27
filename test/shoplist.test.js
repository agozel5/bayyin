import { test } from "node:test";
import assert from "node:assert/strict";
import { categoryOf, textItem, productItem, tickFor, shareText } from "../public/lib/shoplist.js";

test("liste de courses : le mot tapé trouve son rayon, dans les 4 langues", () => {
  assert.equal(categoryOf("Biscuits"), "biscuits");
  assert.equal(categoryOf("biscuits au chocolat"), "choco_biscuits");
  assert.equal(categoryOf("Yaourts nature"), "yogurts");
  assert.equal(categoryOf("jambon de dinde"), "sausages"); // et pas « confiture » (jam)
  assert.equal(categoryOf("après-shampoing"), "conditioners");
  assert.equal(categoryOf("Ekmek"), "breads");
  assert.equal(categoryOf("خبز"), "breads");
  assert.equal(categoryOf("Toothpaste"), "toothpastes");
  assert.equal(categoryOf("lait"), null);
  assert.equal(textItem("  "), null);
});

test("liste de courses : cochée au scan (produit exact, ou bon rayon s'il convient)", () => {
  const nutella = { code: "3017620422003", name: "Nutella", brand: "Ferrero" };
  const items = [textItem("biscuits"), productItem(nutella), textItem("pain")];
  // Produit exact
  assert.equal(tickFor(items, nutella).code, nutella.code);
  // Bon rayon, mais le produit ne convient pas (douteux) : rien n'est coché
  const bread = { code: "1", name: "Pain de mie" };
  assert.equal(tickFor(items, bread, { ok: false, catsOf: () => ["breads"] }), null);
  // Bon rayon et produit qui convient
  assert.equal(tickFor(items, bread, { ok: true, catsOf: () => ["breads"] }).text, "pain");
  assert.equal(items.filter((x) => x.done).length, 2);
  const txt = shareText(items, "Ma liste");
  assert.ok(txt.startsWith("Ma liste\n☐ biscuits") && txt.includes("☑ Nutella"));
});
