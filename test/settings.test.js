import { test } from "node:test";
import assert from "node:assert/strict";

const mem = {};
globalThis.localStorage = { getItem: (k) => (k in mem ? mem[k] : null), setItem: (k, v) => (mem[k] = String(v)) };
const { settings } = await import("../public/lib/settings.js");
const { SCHOOLS } = await import("../public/lib/rules.js");

test("réglages : école de départ gardée pour un réglage personnalisé", () => {
  settings.setSchool("hanafi");
  settings.setTopic("vinaigre", SCHOOLS.hanafi.vinaigre === "interdit" ? "permis" : "interdit");
  const st = settings.get();
  assert.equal(st.school, "custom");
  assert.equal(st.baseSchool, "hanafi");
});

test("réglages : apparence, import vérifié, remise à zéro", () => {
  settings.set({ theme: "dark", textSize: "large", lang: "ar" });
  assert.equal(settings.get().theme, "dark");
  settings.import({ lang: "tr", theme: "nimporte", textSize: "xlarge", school: "maliki", profile: { allergens: ["en:milk", "x"], diet: "vegan" } });
  const st = settings.get();
  assert.equal(st.lang, "tr");
  assert.equal(st.theme, "auto", "valeur inconnue : réglage par défaut");
  assert.equal(st.textSize, "xlarge");
  assert.equal(st.school, "maliki");
  assert.deepEqual(st.profile.allergens, ["en:milk"]);
  assert.equal(st.onboarded, true);
  settings.reset();
  const r = settings.get();
  assert.equal(r.lang, "tr", "la langue est gardée");
  assert.equal(r.school, "standard");
  assert.equal(r.theme, "auto");
  assert.deepEqual(r.profile, { allergens: [], diet: null });
});
