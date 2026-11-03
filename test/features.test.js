// Mode voyage, carte de restaurant, alerte recette
import { test } from "node:test";
import assert from "node:assert/strict";
import { detectLang, translateIngredients, travelRaw } from "../public/lib/travel.js";
import { menuItems, analyzeDish, analyzeMenu } from "../public/lib/menu.js";
import { diffRecipe, worse } from "../public/lib/recipe.js";
import { present } from "../public/lib/off.js";
import { SCHOOLS } from "../public/lib/rules.js";

const status = (raw) => present(raw).verdict.status;

test("voyage : la langue de l'étiquette est reconnue", () => {
  assert.equal(detectLang("Zutaten: Zucker, Glukosesirup, Gelatine, Säuerungsmittel. Kann Spuren von Milch enthalten."), "de");
  assert.equal(detectLang("Ingredientes: azúcar, jarabe de glucosa, gelatina, puede contener trazas de leche"), "es");
  assert.equal(detectLang("Ingredienti: zucchero, sciroppo di glucosio, gelatina, può contenere tracce di latte"), "it");
  assert.equal(detectLang("Ingrediënten: suiker, glucosestroop, gelatine, kan sporen van melk bevatten"), "nl");
  assert.equal(detectLang("Składniki: cukier, syrop glukozowy, żelatyna wieprzowa, może zawierać mleko"), "pl");
});

test("voyage : porc, gélatine et alcool étrangers sont traduits et changent le verdict", () => {
  const de = travelRaw("Zutaten: Zucker, Schweinegelatine, Weinessig, Milch");
  assert.ok(de.terms.some((t) => t.to === "gélatine de porc"));
  assert.ok(de.terms.some((t) => t.to === "vinaigre de vin"));
  assert.equal(status(de.raw), "haram");
  assert.equal(status(travelRaw("Ingredientes: harina de trigo, manteca de cerdo, sal").raw), "haram");
  assert.equal(status(travelRaw("Ingredienti: zucchero, gelatina, aroma").raw), "mashbouh");
  assert.equal(status(travelRaw("Ingrediënten: suiker, water, wijn, zout").raw), "haram");
  assert.equal(status(travelRaw("Składniki: cukier, żelatyna wieprzowa").raw), "haram");
});

test("voyage : vinaigre de vin et « sans alcool » ne sont pas pris pour de l'alcool", () => {
  assert.notEqual(status(travelRaw("Zutaten: Gurken, Wasser, Weinessig, Salz").raw), "haram");
  assert.notEqual(status(travelRaw("Zutaten: Wasser, Gerstenmalz, Hopfen, alkoholfrei").raw), "haram");
  const tr = translateIngredients("Zutaten: Zucker, Weinsäure, Wasser", "de");
  assert.ok(!/\bvin\b/.test(tr.text));
});

test("carte : plats séparés, prix retirés, description rattachée au plat", () => {
  const items = menuItems("ENTRÉES\nSalade César 12,50 €\navec poulet grillé et parmesan\nPLATS\nSpaghetti carbonara ....... 14€\nPavé de saumon 18.00");
  assert.deepEqual(items.map((i) => i.title), ["Salade César", "Spaghetti carbonara", "Pavé de saumon"]);
  assert.match(items[0].desc, /poulet/);
  assert.equal(items[1].section, "PLATS");
});

test("carte : ingrédients cachés et verdicts", () => {
  assert.equal(analyzeDish({ title: "Tartiflette" }).status, "haram");
  assert.equal(analyzeDish({ title: "Bœuf bourguignon" }).status, "haram");
  const carbo = analyzeDish({ title: "Spaghetti carbonara" });
  assert.equal(carbo.status, "mashbouh"); // souvent des lardons : à vérifier
  assert.ok(carbo.flags.some((f) => f.hidden));
  assert.equal(analyzeDish({ title: "Panna cotta" }).status, "mashbouh");
  assert.equal(analyzeDish({ title: "Pavé de saumon", desc: "riz basmati" }).status, "ok");
  assert.equal(analyzeDish({ title: "Entrecôte grillée" }).status, "mashbouh"); // viande : abattage à demander
  assert.equal(analyzeDish({ title: "Côtes du Rhône", section: "VINS" }).status, "haram");
  const m = analyzeMenu("Pizza margherita 10€\nPizza regina 12€\nCroque monsieur 8€");
  assert.equal(m.count.ok, 1);
});

test("carte : les crevettes suivent l'école choisie", () => {
  const hanafi = analyzeDish({ title: "Risotto aux crevettes" }, { school: "hanafi", topics: { ...SCHOOLS.standard, ...SCHOOLS.hanafi } });
  assert.ok(hanafi.flags.some((f) => f.id === "crevettes"));
});

test("recette : seuls les vrais changements comptent", () => {
  const a = { ingredients_text_fr: "Sucre, farine de blé 30%, huile de palme, cacao maigre 5%, émulsifiant (lécithine de soja)" };
  const same = { ingredients_text_fr: "SUCRE, farine de blé 31 %, huile de palme, cacao maigre 4%, émulsifiant (lécithine de soja)" };
  assert.equal(diffRecipe(a, same), null);
  const b = { ingredients_text_fr: "Sucre, farine de blé, huile de palme, cacao maigre, gélatine de porc, émulsifiant (lécithine de soja)" };
  const d = diffRecipe(a, b);
  assert.deepEqual(d.added, ["gelatine de porc"]);
  assert.ok(worse("halal_probable", "haram"));
  assert.ok(!worse("mashbouh", "halal_probable"));
  assert.equal(diffRecipe(a, { ingredients_text_fr: "" }), null);
});
