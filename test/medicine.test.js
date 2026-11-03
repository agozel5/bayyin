// Médicament : fiche de la base publique complétée par la fiche Open Food Facts du même code
import { test } from "node:test";
import assert from "node:assert/strict";
import { present } from "../public/lib/off.js";
import { medicineRaw, withProductData } from "../public/lib/medicine.js";

const med = medicineRaw("3400932331536", ["DOLIPRANE 500 mg, poudre pour solution buvable en sachet-dose", "poudre pour solution buvable", "OPELLA HEALTHCARE FRANCE", "60234100"]);

test("la photo et les excipients d'Open Food Facts complètent la fiche du médicament", () => {
  const p = present(withProductData(med, { image_front_url: "https://img/f.jpg", ingredients_text_fr: "paracétamol, saccharose, arôme orange" }));
  assert.equal(p.kind, "medicine");
  assert.equal(p.image, "https://img/f.jpg");
  assert.equal(p.photos.length, 1);
  assert.equal(p.verdict.status, "halal_probable");
});

test("un excipient d'origine animale rend le médicament douteux, jamais haram", () => {
  const p = present(withProductData(med, { ingredients_text_fr: "paracétamol, gélatine de porc" }));
  assert.equal(p.verdict.status, "mashbouh");
});

test("sans fiche Open Food Facts, le verdict reste « non déterminé »", () => {
  const p = present(withProductData(med, null));
  assert.equal(p.verdict.status, "inconnu");
  assert.equal(p.image, null);
});
