// Serveur local de développement.
// L'app elle-même n'a pas besoin de serveur (le dossier public/ suffit, il appelle
// Open Food Facts directement). Ce serveur sert public/ en local et expose en plus
// une API JSON, utile pour un futur client mobile natif ou des tests.
//
// Aucune dépendance : Node 18+ (fetch natif).
//   npm start              -> http://localhost:3000
//   npm run demo           -> API limitée aux produits d'exemple (public/lib/fixtures.js)

import http from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize as normPath } from "node:path";
import { fileURLToPath } from "node:url";
import { FIXTURES } from "../public/lib/fixtures.js";
import { FIELDS, present } from "../public/lib/off.js";

const ROOT = fileURLToPath(new URL("../public/", import.meta.url));
const OFF_BASE = process.env.OFF_BASE || "https://world.openfoodfacts.org";
// Open Food Facts demande un User-Agent identifiant l'application.
const USER_AGENT = process.env.OFF_USER_AGENT || "Bayyin/0.1 (https://github.com/agozel5/halal-scan)";

const CACHE_TTL_MS = 24 * 3600 * 1000;
const CACHE_MAX = 2000;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".json": "application/json",
  ".webmanifest": "application/manifest+json",
};

// ---------------------------------------------------------------------------
// Accès aux données
// ---------------------------------------------------------------------------

function makeSource({ offline, fetchImpl = globalThis.fetch }) {
  const cache = new Map();

  const cached = async (key, loader) => {
    const hit = cache.get(key);
    if (hit && Date.now() - hit.t < CACHE_TTL_MS) return hit.v;
    const v = await loader();
    if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value);
    cache.set(key, { t: Date.now(), v });
    return v;
  };

  const getJson = async (url) => {
    const res = await fetchImpl(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error("Open Food Facts a répondu " + res.status);
    return res.json();
  };

  return {
    async product(code) {
      if (offline) return FIXTURES[code] || null;
      return cached("p:" + code, async () => {
        const data = await getJson(`${OFF_BASE}/api/v2/product/${code}.json?fields=${FIELDS}`);
        return data && data.status === 1 && data.product ? data.product : null;
      });
    },
    async search(q) {
      if (offline) {
        const n = q.toLowerCase();
        return Object.values(FIXTURES).filter((p) =>
          [p.product_name_fr, p.brands].join(" ").toLowerCase().includes(n)
        );
      }
      return cached("s:" + q.toLowerCase(), async () => {
        const url = `${OFF_BASE}/cgi/search.pl?search_terms=${encodeURIComponent(q)}` +
          `&search_simple=1&action=process&json=1&page_size=12&fields=${FIELDS}`;
        const data = await getJson(url);
        return (data && data.products) || [];
      });
    },
  };
}

// ---------------------------------------------------------------------------
// HTTP
// ---------------------------------------------------------------------------

function sendJson(res, status, body) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(body));
}

async function serveStatic(res, pathname) {
  const rel = pathname === "/" ? "index.html" : pathname.slice(1);
  const file = normPath(join(ROOT, rel));
  if (!file.startsWith(ROOT)) return sendJson(res, 403, { error: "Accès refusé" });
  try {
    const body = await readFile(file);
    res.writeHead(200, { "Content-Type": MIME[extname(file)] || "application/octet-stream" });
    res.end(body);
  } catch {
    sendJson(res, 404, { error: "Page introuvable" });
  }
}

function isOfflineFlag() {
  return process.env.OFFLINE === "1" || process.argv.includes("--offline");
}

export function createApp(options = {}) {
  const offline = options.offline ?? isOfflineFlag();
  const source = options.source || makeSource({ offline, fetchImpl: options.fetchImpl });

  return http.createServer(async (req, res) => {
    const url = new URL(req.url, "http://localhost");
    try {
      if (req.method !== "GET") return sendJson(res, 405, { error: "Méthode non autorisée" });

      const m = url.pathname.match(/^\/api\/product\/([^/]+)$/);
      if (m) {
        const code = decodeURIComponent(m[1]).replace(/\s+/g, "");
        if (!/^\d{8,14}$/.test(code)) {
          return sendJson(res, 400, { error: "Un code-barres contient 8 à 14 chiffres." });
        }
        const p = await source.product(code);
        if (!p) return sendJson(res, 404, { found: false, code, error: "Produit absent d'Open Food Facts." });
        return sendJson(res, 200, { found: true, product: present(p) });
      }

      if (url.pathname === "/api/search") {
        const q = (url.searchParams.get("q") || "").trim();
        if (q.length < 2) return sendJson(res, 400, { error: "Tapez au moins 2 caractères." });
        const list = await source.search(q);
        return sendJson(res, 200, { query: q, results: list.filter((p) => p.code).map(present) });
      }

      if (url.pathname === "/api/health") return sendJson(res, 200, { ok: true, offline });

      return serveStatic(res, url.pathname);
    } catch (err) {
      console.error(err);
      return sendJson(res, 502, {
        error: "Open Food Facts ne répond pas pour le moment. Réessayez dans quelques secondes.",
      });
    }
  });
}

// Lancement direct : node src/server.js
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const port = Number(process.env.PORT) || 3000;
  createApp().listen(port, () => {
    const mode = isOfflineFlag() ? " (mode hors-ligne, produits d'exemple)" : "";
    console.log(`Bayyin prêt sur http://localhost:${port}${mode}`);
  });
}
