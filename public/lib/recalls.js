// Rappels de produits (RappelConso : DGCCRF et DGAL, licence ouverte).
// La base est rangée par GitHub Actions dans data/rappels/ (100 petits fichiers + les rappels récents) :
// l'app ne télécharge que le fichier du code-barres scanné.

const ABS_BASE = "https://agozel5.github.io/bayyin/data/rappels/";
export const RECALL_BASE =
  typeof location !== "undefined" && /^https?:/.test(location.protocol) ? new URL("data/rappels/", location.href).href : ABS_BASE;

// Code-barres normalisé : chiffres seuls, sans zéros de tête (un GTIN-14 « 0… » = EAN-13)
export const normGtin = (g) => String(g ?? "").replace(/\D/g, "").replace(/^0+/, "");
export const shardOf = (code) => {
  const g = normGtin(code);
  return g.length >= 2 ? g.slice(-2) : null;
};

const shards = new Map();
async function getJson(url, timeout = 8000) {
  // AbortSignal.timeout n'existe pas partout (moteur de l'app mobile) : délai seulement s'il est disponible
  const res = await fetch(url, typeof AbortSignal !== "undefined" && AbortSignal.timeout ? { signal: AbortSignal.timeout(timeout) } : {});
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/** Rappels publiés pour ce code-barres (les plus récents d'abord) ; [] si aucun ou base indisponible. */
export async function recallsFor(code, base = RECALL_BASE) {
  const key = shardOf(code);
  if (!key || normGtin(code).length < 8) return [];
  const url = `${base}${key}.json`;
  if (!shards.has(url)) {
    const job = getJson(url);
    shards.set(url, job);
    job.catch(() => shards.delete(url));
  }
  try {
    return (await shards.get(url))[normGtin(code)] || [];
  } catch {
    return [];
  }
}

/** Rappels des 90 derniers jours : { meta, fiches: {id: fiche}, gtins: {gtin: [id]} } */
export async function recentRecalls(base = RECALL_BASE) {
  return getJson(`${base}recent.json`, 12000);
}

/** Produits de l'historique concernés par un rappel récent -> [{ code, fiche }] */
export function matchRecent(recent, codes) {
  const out = [];
  if (!recent || !recent.gtins) return out;
  for (const code of codes) {
    for (const id of recent.gtins[normGtin(code)] || []) {
      const fiche = recent.fiches[id];
      if (fiche) out.push({ code, fiche });
    }
  }
  return out.sort((a, b) => (a.fiche.d < b.fiche.d ? 1 : -1));
}

/** Rappel encore en cours : pas de date de fin, ou date de fin à venir */
export const isActive = (f, now = new Date()) => !f.f || new Date(f.f) >= new Date(now.toISOString().slice(0, 10));
