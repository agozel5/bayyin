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

// ---------------------------------------------------------------------------
// Photo illisible : jamais de caractères au hasard, plusieurs essais, image tournée
// ---------------------------------------------------------------------------
import { ocrQuality, binarize, binarizeAuto, grayStretch, needsAnotherTry, betterRead, isReadable, OCR_MIN, OCR_GOOD } from "../public/lib/ocr.js";

test("qualité : une vraie liste passe, le bruit d'image non", () => {
  assert.ok(ocrQuality("Ingrédients : farine de blé, sucre, huile de palme, émulsifiant : lécithine de soja, E322").score > OCR_GOOD);
  assert.ok(ocrQuality("lait entier, sucre, crème, gélatine de porc").score > OCR_GOOD);
  assert.ok(ocrQuality("su, şeker, tuz, buğday unu, yumurta").score > OCR_GOOD);
  for (const junk of ["; i i mi hat. it: i G de 4", "os 0 x 5 hoe to. oo 2", "Rx Wee neers ate ae Eanes ln tr me", "BISCUITS", "Swe IgG Cou Sec Og"]) {
    const q = ocrQuality(junk);
    assert.equal(isReadable({ quality: q.score, hits: q.hits }), false, junk);
  }
});

test("seuillage local : le texte reste noir sous une ombre, le fond devient blanc", () => {
  // Fond qui passe du clair au sombre, avec un trait de « texte » plus foncé que son voisinage partout
  const w = 120, h = 40, g = new Uint8ClampedArray(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) g[y * w + x] = 230 - x * 1.2 - ((y >= 18 && y <= 21) ? 90 : 0);
  const b = binarize(g, w, h);
  assert.equal(b[20 * w + 10], 0, "texte à gauche (clair)");
  assert.equal(b[20 * w + 110], 0, "texte à droite (ombre)");
  assert.equal(b[5 * w + 110], 255, "fond dans l'ombre");
});

test("contraste : fond foncé inversé (texte clair sur rouge)", () => {
  const px = new Uint8ClampedArray(4 * 100);
  for (let i = 0; i < 100; i++) { const white = i % 10 === 0; px.set(white ? [250, 250, 250, 255] : [170, 30, 40, 255], i * 4); }
  const g = grayStretch(px);
  assert.ok(g[0] < 60, "le texte devient foncé");
  assert.ok(g[1] > 200, "le fond devient clair");
});

test("essais : on s'arrête dès que c'est lisible, on ne tourne l'image que si rien n'est lisible", () => {
  assert.equal(needsAnotherTry(null, { rot: 0 }), true);
  assert.equal(needsAnotherTry({ quality: 0.9 }, { rot: 0 }), false);
  assert.equal(needsAnotherTry({ quality: 0.3 }, { rot: 0 }), true, "lecture moyenne : autre traitement");
  assert.equal(needsAnotherTry({ quality: 0.3, hits: 6 }, { rot: 90 }), false, "lisible à l'endroit : pas de rotation");
  assert.equal(needsAnotherTry({ quality: 0.3, hits: 1 }, { rot: 90 }), true, "un seul mot reconnu : on tourne l'image");
  assert.equal(needsAnotherTry({ quality: 0 }, { rot: 90 }), true);
  const a = { quality: 0.2, text: "abc" }, b = { quality: 0.8, text: "x" };
  assert.equal(betterRead(a, b), b);
  assert.equal(betterRead(b, a), b);
});

test("seuillage local : texte clair sur fond foncé, détecté seul", () => {
  // Fond foncé uniforme avec des traits clairs fins (texte blanc sur sac rouge)
  const w = 100, h = 60, g = new Uint8ClampedArray(w * h).fill(60);
  for (let y = 20; y < 40; y += 6) for (let x = 10; x < 90; x++) g[y * w + x] = 230;
  const b = binarizeAuto(g, w, h);
  let dark = 0; for (const v of b) if (!v) dark++;
  assert.ok(dark / b.length < 0.2, "le fond ne devient pas noir");
  assert.equal(b[20 * w + 50], 0, "le trait clair devient le texte (noir)");
});
