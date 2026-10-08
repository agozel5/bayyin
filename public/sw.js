// Service worker : l'app fonctionne hors connexion.
//
// - Fichiers de l'app : réseau d'abord (mises à jour immédiates), cache si pas de réseau.
// - Bibliothèques et polices (jsDelivr, Google Fonts, modèles OCR) : cache d'abord,
//   leurs adresses sont versionnées donc ne changent jamais.
// - Fiches produits Open Food Facts : réseau d'abord ; au-delà de 4 s ou hors ligne,
//   la fiche en cache. Le « pack » de produits populaires est rangé dans le même cache.

const VERSION = "2026-10-08-20";
const APP_CACHE = `hs-app-${VERSION}`;
const CDN_CACHE = "hs-cdn-v1";
const PRODUCT_CACHE = "hs-products-v1";
const MED_CACHE = "hs-med-v1"; // base des médicaments : gardée d'une version à l'autre
const COSING_CACHE = "hs-cosing-v1"; // base des ingrédients cosmétiques (≈ 2 Mo) : idem
const MAX_PRODUCTS = 4000;

const APP_FILES = [
  "./", "index.html", "style.css", "app.js", "manifest.webmanifest",
  "icon.svg", "icon-180.png", "icon-192.png", "icon-512.png",
  "lib/off.js", "lib/rules.js", "lib/health.js", "lib/fixtures.js", "lib/camera.js", "lib/barcode.js",
  "lib/store.js", "lib/settings.js", "lib/i18n.js", "lib/ocr.js", "lib/sources.js",
  "lib/beauty.js", "lib/medicine.js", "lib/profile.js", "lib/sharecard.js", "lib/aisle.js", "lib/cosmetic.js", "lib/places.js",
  "lib/i18n/fr.js", "lib/i18n/en.js", "lib/i18n/ar.js", "lib/i18n/tr.js",
];

const CDN_HOSTS = ["cdn.jsdelivr.net", "fastly.jsdelivr.net", "fonts.googleapis.com", "fonts.gstatic.com", "tessdata.projectnaptha.com"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(APP_CACHE).then((c) => c.addAll(APP_FILES)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("hs-app-") && k !== APP_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

const timeout = (ms) => new Promise((resolve) => setTimeout(() => resolve(null), ms));

async function networkFirst(request, cacheName, { wait, ignoreSearch = false } = {}) {
  const cache = await caches.open(cacheName);
  const network = fetch(request).then((res) => {
    if (res && res.ok) cache.put(request, res.clone()).catch(() => {});
    return res;
  });
  network.catch(() => {}); // évite une erreur non gérée si on a déjà répondu depuis le cache
  try {
    // Réponse réseau si elle arrive à temps…
    const first = await Promise.race([network, timeout(wait)]);
    if (first) return first;
    // …sinon la copie en cache, ou on continue d'attendre le réseau s'il n'y en a pas.
    const cached = await cache.match(request, { ignoreSearch });
    return cached || (await network);
  } catch {
    const cached = await cache.match(request, { ignoreSearch });
    if (cached) return cached;
    if (request.mode === "navigate") {
      const shell = await cache.match("index.html", { ignoreSearch: true });
      if (shell) return shell;
    }
    return Response.error();
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(CDN_CACHE);
  const hit = await cache.match(request);
  if (hit) return hit;
  const res = await fetch(request);
  // Les réponses opaques (sans CORS) pèsent très lourd dans le quota : on ne les garde pas.
  if (res && res.ok && res.type !== "opaque") cache.put(request, res.clone()).catch(() => {});
  return res;
}

let puts = 0;
async function trimProducts() {
  if (++puts % 50) return;
  const cache = await caches.open(PRODUCT_CACHE);
  const keys = await cache.keys();
  const extra = keys.length - MAX_PRODUCTS;
  for (let i = 0; i < extra; i++) await cache.delete(keys[i]);
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Base des ingrédients : réponse immédiate depuis le cache, mise à jour en arrière-plan
  if (url.origin === self.location.origin && url.pathname.endsWith("/data/cosing.json")) {
    event.respondWith(
      caches.open(COSING_CACHE).then(async (cache) => {
        const hit = await cache.match(req, { ignoreSearch: true });
        const update = fetch(req).then((res) => { if (res.ok) cache.put(req, res.clone()); return res; }).catch(() => null);
        if (hit) { event.waitUntil(update); return hit; }
        return (await update) || new Response("{}", { status: 503, headers: { "Content-Type": "application/json" } });
      })
    );
    return;
  }
  if (url.origin === self.location.origin && url.pathname.includes("/data/med/")) {
    event.respondWith(networkFirst(req, MED_CACHE, { wait: 3000 }));
    return;
  }
  if (url.origin === self.location.origin) {
    event.respondWith(networkFirst(req, APP_CACHE, { wait: 3500, ignoreSearch: req.mode === "navigate" }));
    return;
  }
  if ((url.hostname === "world.openfoodfacts.org" || url.hostname === "world.openbeautyfacts.org") && url.pathname.startsWith("/api/v2/product/")) {
    event.respondWith(networkFirst(req, PRODUCT_CACHE, { wait: 4000 }).finally(() => trimProducts().catch(() => {})));
    return;
  }
  if (CDN_HOSTS.includes(url.hostname)) {
    event.respondWith(cacheFirst(req));
  }
});
