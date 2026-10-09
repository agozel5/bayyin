import test from "node:test";
import assert from "node:assert/strict";
import { cleanOcrLines, fixAdditiveCodes } from "../public/lib/ocr.js";

test("OCR : les lignes de bruit sont écartées", () => {
  const r = cleanOcrLines([
    { text: "CHOCO CRUNCH", confidence: 91 },
    { text: "|||| 1 1|| ,", confidence: 30 },
    { text: "INGRÉDIENTS : sucre, sirop de glu-", confidence: 88 },
    { text: "cose, gélatine de porc, colorant : El20, arôme .", confidence: 84 },
    { text: "~#@ §§ =-", confidence: 60 },
    { text: "Ç»Ÿ ¥ ¤", confidence: 20 },
  ]);
  assert.equal(r.text, "sucre, sirop de glucose, gélatine de porc, colorant : E120, arôme.");
  assert.ok(r.confidence > 80);
});

test("OCR : confusions de lettres dans les additifs", () => {
  assert.equal(fixAdditiveCodes("E1OO, E 33O, El50a, conservateur E-2SO"), "E100, E330, E150a, conservateur E250");
  assert.equal(fixAdditiveCodes("ESO"), "ESO");
});

test("OCR : texte sans confiance (ancienne version) gardé s'il est crédible", () => {
  const r = cleanOcrLines([{ text: "Ingrédients : lait, sucre" }, { text: "/// ||| ===" }]);
  assert.equal(r.text, "lait, sucre");
});

test("OCR : mots courts peu sûrs retirés quand la confiance par mot est connue", () => {
  const r = cleanOcrLines([{ text: "lait, sucre, oS sel", confidence: 80, words: [
    { text: "lait,", confidence: 90 }, { text: "sucre,", confidence: 88 }, { text: "oS", confidence: 21 }, { text: "sel", confidence: 85 }] }]);
  assert.equal(r.text, "lait, sucre, sel");
});
