import test from "node:test";
import assert from "node:assert/strict";
import { normalize, tokens, relevance, rankByRelevance, translateQuery, guessLang } from "../public/lib/search.js";

test("normalisation : accents, turc et arabe", () => {
  assert.equal(normalize("Pâte à tartiner"), "pate a tartiner");
  assert.equal(normalize("Süt Kakaolu ı"), "sut kakaolu i");
  assert.equal(normalize("شُوكولاتة"), "شوكولاته");
  assert.deepEqual(tokens("Le lait de la vache"), ["lait", "vache"]);
  assert.deepEqual(tokens("الحليب"), ["حليب"]);
});

test("pertinence : nom et marque comptent plus que les catégories", () => {
  const nutella = { product_name: "Nutella", brands: "Ferrero", countries_tags: ["en:france"] };
  const prince = { product_name: "Prince", brands: "LU", categories_tags: ["en:chocolate-biscuits", "fr:biscuits-au-chocolat"] };
  const vin = { product_name: "Domaine de Sahari 2011", brands: "Sahari" };
  assert.ok(relevance(nutella, "nutela") >= 1, "faute de frappe tolérée");
  assert.equal(relevance(prince, "chocolat"), 0.5);
  assert.equal(relevance(vin, "isla mondial poulet"), 0);
  assert.equal(relevance({ product_name: "Boulettes" }, "poulet"), 0, "pas de confusion poulet / boulet");
});

test("tri : les produits sans rapport sont écartés, la popularité est gardée à égalité", () => {
  const list = [
    { code: "1", product_name: "Domaine de Sahari 2011", brands: "Sahari" },
    { code: "2", product_name: "Cordon bleu", brands: "Isla Mondial" },
    { code: "3", product_name: "Blanc de poulet", brands: "Isla Mondial", countries_tags: ["en:france"] },
    { code: "4", product_name: "Nuggets de poulet", brands: "Isla Mondial", countries_tags: ["en:france"] },
  ];
  assert.deepEqual(rankByRelevance(list, "isla mondial poulet").map((p) => p.code), ["3", "4", "2"]);
});

test("recherche dans une autre langue : traduite en français", () => {
  assert.equal(guessLang("حليب"), "ar");
  assert.equal(translateQuery("حليب", "ar"), "lait");
  assert.equal(translateQuery("زيت الزيتون", "fr"), "huile d'olive");
  assert.equal(translateQuery("tavuk", "tr"), "poulet");
  assert.equal(translateQuery("süt", "fr"), "lait");
  assert.equal(translateQuery("chocolate milk", "en"), "chocolat lait");
  assert.equal(translateQuery("Pinar süt", "tr"), "pinar lait", "la marque est gardée");
  assert.equal(translateQuery("lait", "fr"), null, "déjà en français");
  assert.equal(translateQuery("kinder bueno", "fr"), null);
  assert.equal(translateQuery("su", "fr"), null, "mot turc trop court sans contexte turc");
  // Les résultats français d'une recherche arabe restent pertinents
  assert.ok(rankByRelevance([{ product_name: "Lait demi-écrémé" }], ["حليب", "lait"]).length === 1);
});

test("turc : le pluriel en -lar / -ler est reconnu (rayons de la recherche)", () => {
  assert.equal(translateQuery("Yoğurtlar", "tr"), "yaourt");
  assert.equal(translateQuery("Peynirler", "tr"), "fromage");
  assert.equal(translateQuery("Şampuanlar", "tr"), "shampooing");
  assert.equal(translateQuery("Tablet çikolatalar", "tr"), "tablet chocolat");
  assert.equal(translateQuery("yoğurt", "tr"), "yaourt", "le singulier marche toujours");
  assert.equal(translateQuery("aller", "fr"), null, "un mot français en -ler n'est pas traduit");
  assert.equal(translateQuery("collier", "fr"), null);
});

test("les 12 langues de l'app : un mot courant est ramené au français", async () => {
  const { translateQuery, suggestTerms } = await import("../public/lib/search.js");
  const cas = [["Milch", "de"], ["leche", "es"], ["latte", "it"], ["melk", "nl"], ["susu", "id"], ["susu", "ms"], ["دودھ", "ur"], ["দুধ", "bn"],
    ["حليب", "ar"], ["süt", "tr"], ["milk", "en"]];
  for (const [q, lang] of cas) assert.equal(translateQuery(q, lang), "lait", `${lang} : ${q}`);
  assert.equal(translateQuery("aceite de oliva", "es"), "huile d'olive");
  assert.equal(translateQuery("tandpasta", "nl"), "dentifrice");
  assert.equal(translateQuery("শ্যাম্পু", "bn"), "shampooing");
  assert.equal(translateQuery("ٹوتھ پیسٹ", "ur"), "dentifrice");
  assert.equal(translateQuery("Schokolade Milch", "de"), "chocolat lait");
  assert.equal(translateQuery("Käse", "fr"), "fromage"); // une autre langue latine est reconnue en repli
  assert.equal(translateQuery("Nutella", "de"), null); // une marque reste telle quelle
  assert.deepEqual(suggestTerms("yao", "fr"), ["Yaourt"]);
  assert.deepEqual(suggestTerms("jog", "de"), ["Joghurt"]);
  assert.deepEqual(suggestTerms("a", "fr"), []);
});
