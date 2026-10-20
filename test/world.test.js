import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolveOrigin, flagOf, EU } from "../public/lib/world.js";
import { greenScore } from "../public/lib/off.js";
import { FIXTURES } from "../public/lib/fixtures.js";

const world = JSON.parse(readFileSync(new URL("../public/data/world.json", import.meta.url)));

test("origines : pays, Union européenne et continents retrouvés sur la carte", () => {
  assert.equal(resolveOrigin("en:france", world).iso, "FR");
  assert.equal(resolveOrigin("en:brazil", world).iso, "BR");
  assert.equal(resolveOrigin("en:united-states", world).iso, "US");
  assert.equal(resolveOrigin("en:cote-d-ivoire", world).iso, "CI");
  assert.equal(resolveOrigin("en:european-union", world).isos.length, EU.size);
  assert.ok(resolveOrigin("en:africa", world).isos.includes("MA"));
  assert.equal(resolveOrigin("en:unknown", world), null);
  assert.equal(flagOf(resolveOrigin("en:france", world)), "🇫🇷");
  assert.equal(flagOf(resolveOrigin("en:european-union", world)), "🇪🇺");
  // Chaque pays de la carte a un tracé
  assert.ok(world.c.length > 150 && world.c.every((c) => c.d && c.d.startsWith("M")));
});

test("origines : par ingrédient quand l'étiquette la donne", () => {
  const e = greenScore(FIXTURES["3245390011015"].env);
  assert.deepEqual(e.byIngredient.find((x) => x.name === "sucre").origins, ["brazil", "paraguay"]);
  assert.equal(e.origins[0].origin, "france");
  assert.ok(e.originText.startsWith("Blé"));
});
