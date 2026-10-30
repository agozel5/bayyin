// Classements gardés sur le téléphone : chaque rayon ouvert (ou téléchargé pour le hors connexion)
// reste disponible sans réseau. En ligne, la version du site est toujours préférée.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { rankIndex, rankProducts } from "../../public/lib/rankings.js";

const KEY = (id) => "bayyin:rank:" + id;
const keep = (id, data) => AsyncStorage.setItem(KEY(id), JSON.stringify(data)).catch(() => {});
async function cached(id) {
  try { const s = await AsyncStorage.getItem(KEY(id)); return s ? JSON.parse(s) : null; } catch { return null; }
}
async function withCache(id, load) {
  try {
    const data = await load();
    keep(id, data);
    return data;
  } catch (e) {
    const old = await cached(id);
    if (old) return old;
    throw e;
  }
}
export const rankIndexCached = () => withCache("index", () => rankIndex());
export const rankProductsCached = (id) => withCache(id, () => rankProducts(id));

/** Télécharge tous les rayons (hors connexion) -> nombre de rayons gardés */
export async function downloadRankings(onProgress) {
  const index = await rankIndexCached();
  const ids = Object.keys((index && index.categories) || {});
  let n = 0;
  for (const id of ids) {
    try { await rankProductsCached(id); n++; } catch { /* rayon indisponible : ignoré */ }
    onProgress && onProgress(n, ids.length);
  }
  return n;
}
