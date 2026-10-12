import test from "node:test";
import assert from "node:assert/strict";

// Stockage et réseau simulés
const mem = new Map();
globalThis.localStorage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k) };
let reply = null;
globalThis.fetch = async (url, opts) => ({ json: async () => reply(url, opts) });

const { PREMIUM } = await import("../public/premium-config.js");
const pm = await import("../public/lib/premium.js");

test("abonnement non configuré : tout reste accessible", () => {
  assert.equal(pm.premiumEnabled(), false);
  assert.equal(pm.isPremium(), true);
});

test("clé valide de la boutique : Premium actif, puis retiré", async () => {
  Object.assign(PREMIUM, { storeId: 7, productId: 9, checkout: { year: "https://x/buy", month: "" }, legal: { cgv: "cgv.html", mentions: "m.html" } });
  assert.equal(pm.premiumEnabled(), true);
  assert.equal(pm.isPremium(), false);
  reply = () => ({ activated: true, instance: { id: "i1" }, license_key: { status: "active", expires_at: null }, meta: { store_id: 7, product_id: 9, customer_email: "a@b.fr" } });
  assert.deepEqual(await pm.activate("ABCD-1234-EFGH"), { ok: true });
  assert.equal(pm.isPremium(), true);
  assert.equal(pm.premiumState().email, "a…@b.fr");
  reply = () => ({ deactivated: true });
  await pm.deactivate();
  assert.equal(pm.isPremium(), false);
});

test("clé d'un autre produit refusée", async () => {
  reply = (url) => (url.endsWith("activate")
    ? { activated: true, instance: { id: "i2" }, license_key: { status: "active" }, meta: { store_id: 1, product_id: 2 } }
    : { deactivated: true });
  assert.deepEqual(await pm.activate("ZZZZ-9999-YYYY"), { ok: false, error: "other_product" });
  assert.equal(pm.isPremium(), false);
});

test("abonnement expiré à la revérification", async () => {
  reply = () => ({ activated: true, instance: { id: "i3" }, license_key: { status: "active" }, meta: { store_id: 7, product_id: 9 } });
  await pm.activate("ABCD-1234-EFGH");
  reply = () => ({ valid: false, license_key: { status: "expired" }, meta: { store_id: 7, product_id: 9 } });
  await pm.refresh({ force: true });
  assert.equal(pm.isPremium(), false);
});

test("hors connexion : délai de grâce de 45 jours", async () => {
  reply = () => ({ activated: true, instance: { id: "i4" }, license_key: { status: "active" }, meta: { store_id: 7, product_id: 9 } });
  await pm.activate("ABCD-1234-EFGH");
  assert.equal(pm.isPremium(Date.now() + 30 * 864e5), true);
  assert.equal(pm.isPremium(Date.now() + 50 * 864e5), false);
});
