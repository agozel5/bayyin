import { test } from "node:test";
import assert from "node:assert/strict";
import { readLabel } from "../public/lib/highlight.js";
import { classify } from "../public/lib/rules.js";
import { FIXTURES } from "../public/lib/fixtures.js";

const hl = (parts) => parts.filter((x) => x.t === "hl").map((x) => [x.text, x.kind]);
const joined = (parts) => parts.map((x) => x.text).join("");

test("lecture de l'étiquette : le passage en cause est surligné à sa place", () => {
  const prod = FIXTURES["3019081100148"]; // saucisson pur porc
  const v = classify(prod);
  const parts = readLabel(prod.ingredients_text_fr, { flags: v.flags });
  const marks = hl(parts);
  assert.ok(marks.some(([txt, k]) => /porc/i.test(txt) && k === "haram"), JSON.stringify(marks));
  // Le texte reste identique, seuls les passages sont balisés
  assert.equal(joined(parts), prod.ingredients_text_fr);
});

test("lecture de l'étiquette : codes E surlignés seuls, allergènes en gras", () => {
  const text = "Farine de _blé_, sucre, émulsifiant : E471, colorant : e120, sel";
  const v = classify({ ingredients_text_fr: text, additives_tags: [], labels_tags: [] });
  const parts = readLabel(text, { flags: v.flags, risks: [{ code: "E120", level: "modere" }] });
  const marks = hl(parts);
  assert.deepEqual(marks.map(([t]) => t), ["E471", "e120"]);
  assert.equal(marks[1][1], "mashbouh"); // carmin : halal douteux, prioritaire sur le risque santé
  assert.ok(parts.some((x) => x.t === "allergen" && x.text === "blé"));
  assert.equal(joined(parts), text.replace(/_/g, ""));
});

test("lecture de l'étiquette : rien à surligner sur une liste sans souci", () => {
  const text = "Eau, sucre, jus de citron";
  const v = classify({ ingredients_text_fr: text, additives_tags: [], labels_tags: [] });
  assert.deepEqual(hl(readLabel(text, { flags: v.flags })), []);
});

test("lecture de l'étiquette : un même signalement surligné à chaque endroit", () => {
  const prod = FIXTURES["3019081100148"];
  const v = classify(prod);
  const marks = hl(readLabel(prod.ingredients_text_fr, { flags: v.flags }));
  assert.equal(marks.filter(([txt]) => /porc/i.test(txt)).length, 2, JSON.stringify(marks));
});
