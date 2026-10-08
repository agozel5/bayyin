import { test } from "node:test";
import assert from "node:assert/strict";
import { buildQuery, parsePlaces, categoryOf, distance, directionsUrl } from "../public/lib/places.js";

test("commerces : requête Overpass, position arrondie à ~100 m", () => {
  const q = buildQuery(48.856613, 2.352222, 3000);
  assert.ok(q.includes("(around:3000,48.857,2.352)"));
  assert.ok(q.includes('["diet:halal"~"^(yes|only)$"]'));
  assert.ok(q.includes("out tags center"));
});

test("commerces : catégories, halal, certification, tri par distance", () => {
  const json = { elements: [
    { type: "node", id: 1, lat: 48.86, lon: 2.36, tags: { name: "Boucherie Al Baraka", shop: "butcher", "diet:halal": "only", "diet:halal:certification": "AVS", "addr:housenumber": "12", "addr:street": "Rue X", "addr:city": "Paris", opening_hours: "Mo-Sa 09:00-19:00" } },
    { type: "way", id: 2, center: { lat: 48.857, lon: 2.353 }, tags: { name: "Kebab", amenity: "fast_food", "diet:halal": "yes" } },
    { type: "node", id: 3, lat: 48.9, lon: 2.4, tags: { shop: "supermarket", cuisine: "halal" } },
    { type: "relation", id: 4, tags: { name: "sans position" } },
  ] };
  const list = parsePlaces(json, 48.8566, 2.3522);
  assert.deepEqual(list.map((p) => p.cat), ["restaurant", "butcher", "grocery"]);
  assert.equal(list[1].halal, "only");
  assert.equal(list[1].cert, "AVS");
  assert.equal(list[1].address, "12 Rue X, Paris");
  assert.equal(list[0].halal, "yes");
  assert.equal(list[0].id, "way/2");
  assert.equal(categoryOf({ shop: "bakery" }), "bakery");
  assert.equal(categoryOf({ shop: "clothes" }), "other");
  assert.ok(Math.abs(distance(48.8566, 2.3522, 48.8584, 2.2945) - 4220) < 60, "Notre-Dame -> tour Eiffel ≈ 4,2 km");
  assert.ok(directionsUrl(list[0], true).startsWith("https://maps.apple.com/"));
  assert.ok(directionsUrl(list[0], false).includes("destination=48.857,2.353"));
});
