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
  clear({ keepFavs = true } = {}) {
    write(keepFavs ? read().filter((e) => e.fav) : []);
    emit();
  },
  subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};
