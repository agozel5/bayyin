import test from "node:test";
import assert from "node:assert/strict";
import { normGtin, shardOf, matchRecent, isActive } from "../public/lib/recalls.js";

test("rappels : codes-barres normalisés et rangement", () => {
  assert.equal(normGtin("03700156962272"), "3700156962272");
  assert.equal(shardOf("3700156962272"), "72");
});

test("rappels : historique comparé aux rappels récents", () => {
  const recent = { gtins: { "3700156962272": ["A"] }, fiches: { A: { id: "A", d: "2026-10-09", f: "" } } };
  assert.deepEqual(matchRecent(recent, ["3700156962272", "3017620422003"]).map((h) => h.code), ["3700156962272"]);
  assert.equal(isActive({ f: "" }), true);
  assert.equal(isActive({ f: "2020-01-01" }), false);
});
