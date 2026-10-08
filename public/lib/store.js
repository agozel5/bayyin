// Historique et favoris, gardés dans le navigateur (localStorage) de l'appareil.
// La fiche produit complète est enregistrée : l'historique s'ouvre même hors connexion.

const KEY = "halalscan_history_v2";
const MAX_RECENT = 60; // les favoris ne sont jamais supprimés automatiquement

function read() {
  try {
    const list = JSON.parse(localStorage.getItem(KEY));
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function write(list) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* stockage plein ou bloqué : l'app continue sans historique */
  }
}

const listeners = new Set();
const emit = () => listeners.forEach((fn) => fn());

export const store = {
  all() {
    return read();
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
    const recent = rest.filter((e) => !e.fav).slice(0, MAX_RECENT - 1);
    const merged = [entry, ...favs, ...recent].sort((a, b) => b.at - a.at);
    write(merged);
    emit();
  },
  toggleFav(code) {
    const list = read();
    const e = list.find((x) => x.code === code);
    if (!e) return false;
    e.fav = !e.fav;
    write(list);
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
