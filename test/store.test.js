import { test } from "node:test";
import assert from "node:assert/strict";

// localStorage minimal, avec un quota pour tester le cas « stockage plein »
const mem = new Map();
let quota = Infinity;
globalThis.localStorage = {
  getItem: (k) => (mem.has(k) ? mem.get(k) : null),
  setItem: (k, v) => { if (String(v).length > quota) throw new Error("QuotaExceeded"); mem.set(k, String(v)); },
  removeItem: (k) => mem.delete(k),
};
const { store, KEEP_DAYS } = await import("../public/lib/store.js");
const KEY = "halalscan_history_v2";
const day = 864e5;
const entry = (code, ageDays, fav = false) => ({ code, at: Date.now() - ageDays * day, fav, p: { code, name: code } });

test("historique : on garde un an, les favoris toujours", () => {
  store.clear({ keepFavs: false });
  store.merge([entry("old", KEEP_DAYS + 5), entry("oldfav", KEEP_DAYS + 30, true), entry("recent", 40)]);
  store.add({ code: "new", name: "new" });
  const codes = store.all().map((e) => e.code);
  assert.deepEqual(codes.sort(), ["new", "oldfav", "recent"]);
});

test("historique : une copie en mémoire évite de relire le stockage", () => {
  store.clear({ keepFavs: false });
  store.add({ code: "a", name: "a" });
  mem.set(KEY, "[]"); // changé derrière le dos de l'app (même onglet) : la copie en mémoire fait foi
  assert.equal(store.all().length, 1);
  assert.notEqual(store.all(), store.all(), "une nouvelle liste à chaque appel");
});

test("historique : stockage plein, on libère les plus anciens", () => {
  store.clear({ keepFavs: false });
  const many = Array.from({ length: 40 }, (_, i) => entry("c" + i, i));
  quota = JSON.stringify(many).length - 10;
  store.merge(many);
  quota = Infinity;
  const saved = JSON.parse(mem.get(KEY));
  assert.ok(saved.length > 0 && saved.length < 40);
  assert.equal(saved[0].code, "c0", "les plus récents sont gardés");
});
