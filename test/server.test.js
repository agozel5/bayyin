import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../src/server.js";
import { FIXTURES } from "../public/lib/fixtures.js";

// Faux Open Food Facts : renvoie les fixtures au format de l'API v2.
const calls = [];
const fakeFetch = async (url, opts) => {
  calls.push({ url: String(url), ua: opts.headers["User-Agent"] });
  const m = String(url).match(/\/product\/(\d+)\.json/);
  if (m) {
    const product = FIXTURES[m[1]];
    const body = product ? { status: 1, product } : { status: 0 };
    return new Response(JSON.stringify(body), { status: product ? 200 : 404 });
  }
  if (String(url).includes("search.pl")) {
    return new Response(JSON.stringify({ products: [FIXTURES["4001686301029"]] }), { status: 200 });
  }
  return new Response("{}", { status: 500 });
};

let server, base;
before(async () => {
  server = createApp({ offline: false, fetchImpl: fakeFetch }).listen(0);
  await new Promise((r) => server.once("listening", r));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => server.close());

const get = async (path) => {
  const r = await fetch(base + path);
  return { status: r.status, body: r.headers.get("content-type").includes("json") ? await r.json() : await r.text() };
};

test("GET /api/product/:code renvoie le verdict", async () => {
  const { status, body } = await get("/api/product/3019081100146");
  assert.equal(status, 200);
  assert.equal(body.product.verdict.status, "haram");
  assert.equal(body.product.name, "Saucisson sec pur porc");
  assert.match(calls.at(-1).url, /api\/v2\/product\/3019081100146\.json\?fields=/);
  assert.match(calls.at(-1).ua, /HalalScan/);
});

test("le cache évite un second appel à Open Food Facts", async () => {
  const before = calls.length;
  await get("/api/product/3019081100146");
  assert.equal(calls.length, before);
});

test("produit inconnu -> 404", async () => {
  const { status, body } = await get("/api/product/0000000000000");
  assert.equal(status, 404);
  assert.equal(body.found, false);
});

test("code invalide -> 400", async () => {
  assert.equal((await get("/api/product/abc")).status, 400);
});

test("recherche par nom", async () => {
  const { status, body } = await get("/api/search?q=dragibus");
  assert.equal(status, 200);
  assert.equal(body.results[0].verdict.status, "mashbouh");
});

test("sert le frontend et bloque la sortie du dossier public", async () => {
  const home = await fetch(base + "/");
  assert.equal(home.status, 200);
  assert.match(await home.text(), /<title>Halal Scan<\/title>/);
  const escape = await fetch(base + "/..%2fpackage.json");
  assert.ok(escape.status >= 400);
  assert.doesNotMatch(await escape.text(), /"halal-scan"/);
});

test("Open Food Facts en panne -> 502 avec message clair", async () => {
  const down = createApp({ offline: false, fetchImpl: async () => { throw new Error("réseau"); } }).listen(0);
  await new Promise((r) => down.once("listening", r));
  const r = await fetch(`http://127.0.0.1:${down.address().port}/api/product/3017620422003`);
  assert.equal(r.status, 502);
  assert.match((await r.json()).error, /Open Food Facts/);
  down.close();
});
