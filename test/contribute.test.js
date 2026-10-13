import test from "node:test";
import assert from "node:assert/strict";

const mem = new Map();
globalThis.localStorage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k) };
const calls = [];
globalThis.fetch = async (url, opts) => {
  calls.push({ url, body: opts.body });
  return { json: async () => (url.includes("image_upload") ? { status: "status ok" } : { status: 1, status_verbose: "fields saved" }) };
};
const { APP } = await import("../public/app-config.js");
const c = await import("../public/lib/contribute.js");

test("sans compte de l'app : envoi direct impossible, page d'ajout guidée", async () => {
  assert.equal(c.offAccountReady(), false);
  assert.deepEqual(await c.contribute({ code: "3270190207924", ingredients: "sucre" }), { ok: false, error: "no_account" });
  assert.match(c.addUrl("3270190207924"), /openfoodfacts\.org\/cgi\/product\.pl\?type=search_or_add.*code=3270190207924/);
});

test("avec le compte de l'app : texte puis photo, produit marqué comme envoyé", async () => {
  APP.off = { user: "bayyin-app", password: "x" };
  const r = await c.contribute({ code: "3270190207924", name: "Biscuits", ingredients: "farine, sucre", photo: new Blob(["img"], { type: "image/jpeg" }) });
  assert.deepEqual(r, { ok: true, photo: true });
  assert.match(calls[0].url, /product_jqm2\.pl$/);
  assert.equal(calls[0].body.get("ingredients_text_fr"), "farine, sucre");
  assert.equal(calls[0].body.get("app_name"), "Bayyin");
  assert.match(calls[1].url, /product_image_upload\.pl$/);
  assert.equal(calls[1].body.get("imagefield"), "ingredients_fr");
  assert.equal(c.contributed("3270190207924"), true);
});
