// Historique et favoris, gardés dans le navigateur (localStorage) de l'appareil.
// La fiche produit complète est enregistrée : l'historique s'ouvre même hors connexion.

const KEY = "halalscan_history_v2";
// Conservation : un an de produits (au plus 800), pour tout le monde ; l'affichage dépend de Premium
// (30 jours sans Premium). Les favoris ne sont jamais supprimés automatiquement.
let MAX_RECENT = 800;
export const KEEP_DAYS = 365;

// Copie en mémoire : l'historique n'est relu (et décodé) qu'après un changement, pas à chaque affichage.
let cache = null;
function read() {
  if (cache) return cache;
  try {
    const list = JSON.parse(localStorage.getItem(KEY));
    cache = Array.isArray(list) ? list : [];
  } catch {
    cache = [];
  }
  return cache;
}

function write(list) {
  cache = list;
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    // Stockage plein : on libère la moitié la plus ancienne (hors favoris), puis on réessaie
    const favs = list.filter((e) => e.fav);
    const rest = list.filter((e) => !e.fav);
    const kept = [...favs, ...rest.slice(0, Math.floor(rest.length / 2))].sort((a, b) => b.at - a.at);
    cache = kept;
    try { localStorage.setItem(KEY, JSON.stringify(kept)); } catch { /* stockage bloqué : l'app continue */ }
  }
}
// Un autre onglet a modifié l'historique : on relira
if (typeof window !== "undefined") window.addEventListener("storage", (e) => { if (e.key === KEY || e.key === null) cache = null; });

const listeners = new Set();
const emit = () => listeners.forEach((fn) => fn());

export const store = {
  setMaxRecent(n) {
    MAX_RECENT = Math.max(20, Math.min(1000, n | 0));
  },
  all() {
    return read().slice();
  },
  get(code) {
    return read().find((e) => e.code === code) || null;
  },
  add(product) {
    const list = read();
    const prev = list.find((e) => e.code === product.code);
    const entry = { code: product.code, at: Date.now(), fav: prev ? prev.fav : false, p: product };
    const rest = list.filter((e) => e.code !== product.code);
    const favs = rest.filter((e) => e.fav);
    const since = Date.now() - KEEP_DAYS * 864e5;
    const recent = rest.filter((e) => !e.fav && e.at >= since).slice(0, MAX_RECENT - 1);
    const merged = [entry, ...favs, ...recent].sort((a, b) => b.at - a.at);
    write(merged);
    emit();
  },
  // Remplace des fiches gardées sans changer leur place dans l'historique (mise à jour en arrière-plan)
  refreshMany(products) {
    const list = read();
    let n = 0;
    for (const product of products) {
      const e = list.find((x) => x.code === product.code);
      if (e) { e.p = product; n++; }
    }
    if (!n) return;
    write(list.slice());
    emit();
  },
  toggleFav(code) {
    const list = read();
    const e = list.find((x) => x.code === code);
    if (!e) return false;
    e.fav = !e.fav;
    write(list.slice());
    emit();
    return e.fav;
  },
  remove(code) {
    write(read().filter((e) => e.code !== code));
    emit();
  },
  // Import d'une sauvegarde : fusion par code-barres, l'entrée la plus récente l'emporte
  merge(entries) {
    const byCode = new Map(read().map((e) => [e.code, e]));
    for (const e of Array.isArray(entries) ? entries : []) {
      if (!e || !e.code || !e.p) continue;
      const prev = byCode.get(e.code);
      if (!prev || (e.at || 0) > (prev.at || 0)) byCode.set(e.code, { code: e.code, at: e.at || Date.now(), fav: !!(e.fav || (prev && prev.fav)), p: e.p });
      else if (e.fav) prev.fav = true;
    }
    write([...byCode.values()].sort((a, b) => b.at - a.at));
    emit();
  },
  clear({ keepFavs = true } = {}) {
    write(keepFavs ? read().filter((e) => e.fav) : []);
    emit();
  },
  subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};

// Fiches complétées par l'utilisateur (photo de la liste d'ingrédients), par code-barres.
// Utilisées quand Open Food Facts ne connaît pas le produit ou n'a pas ses ingrédients.
const LOCAL_KEY = "halalscan_local_v1";
export const localProducts = {
  get(code) {
    try {
      return (JSON.parse(localStorage.getItem(LOCAL_KEY)) || {})[code] || null;
    } catch {
      return null;
    }
  },
  set(code, raw) {
    try {
      const all = JSON.parse(localStorage.getItem(LOCAL_KEY)) || {};
      all[code] = raw;
      localStorage.setItem(LOCAL_KEY, JSON.stringify(all));
    } catch {
      /* stockage indisponible */
    }
  },
};
