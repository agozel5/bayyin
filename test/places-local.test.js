import { test } from "node:test";
import assert from "node:assert/strict";
import { tilesAround, coveredBy, localPlaces } from "../public/lib/places.js";

const INDEX = { updated: "2026-10-11", countries: { FR: { bbox: [41.3, -5.2, 51.1, 9.6] } }, tiles: ["48_2"] };
const TILE = [
  { id: "node/1", name: "Boucherie A", lat: 48.857, lon: 2.352, cat: "butcher", halal: "only" },
  { id: "node/2", name: "Resto loin", lat: 48.95, lon: 2.6, cat: "restaurant", halal: "yes" },
];

test("carreaux autour d'un point (bord de carreau inclus)", () => {
  assert.deepEqual(tilesAround(48.85, 2.35, 3000), ["48_2"]);
  assert.deepEqual(tilesAround(48.99, 2.99, 3000), ["48_2", "48_3", "49_2", "49_3"]);
});

test("pays couverts", () => {
  assert.equal(coveredBy(INDEX, 48.85, 2.35), true);
  assert.equal(coveredBy(INDEX, 41.0, 28.9), false); // Istanbul : en direct
});

test("recherche locale : filtre par rayon et trie par distance", async () => {
  const orig = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url) => {
    calls.push(url);
    const body = url.endsWith("index.json") ? INDEX : url.endsWith("48_2.json") ? TILE : null;
    return { ok: !!body, status: body ? 200 : 404, json: async () => body };
  };
  try {
    const r = await localPlaces(48.856, 2.351, 3000, "https://x.test/p/");
    assert.equal(r.source, "local");
    assert.deepEqual(r.list.map((p) => p.name), ["Boucherie A"]);
    const far = await localPlaces(48.856, 2.351, 30000, "https://x.test/p/");
    assert.deepEqual(far.list.map((p) => p.name), ["Boucherie A", "Resto loin"]);
    assert.equal(await localPlaces(41.0, 28.9, 3000, "https://x.test/p/"), null);
    assert.ok(calls.every((u) => !u.includes("49_")), "seuls les carreaux existants sont demandés");
  } finally {
    globalThis.fetch = orig;
  }
});
