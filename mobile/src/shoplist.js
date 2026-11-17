// Liste de courses : des produits ajoutés depuis une fiche ou les favoris, cochés en magasin.
// Gardée sur le téléphone ; le produit est copié (nom, marque, photo, verdict) pour s'afficher hors connexion.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { verdictOf } from "./view";

const KEY = "bayyin:shoplist";
let items = []; // [{ code, at, done, p }]
const listeners = new Set();
const emit = () => listeners.forEach((fn) => fn(items));
const save = () => AsyncStorage.setItem(KEY, JSON.stringify(items)).catch(() => {});

export async function loadShopList() {
  try { const s = await AsyncStorage.getItem(KEY); items = s ? JSON.parse(s) : []; } catch { items = []; }
  emit();
}
export const getShopList = () => items;
export const onShopList = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
export const inShopList = (code) => items.some((x) => x.code === code);
// Copie légère du produit (sans les données brutes, pour garder la liste petite) : le verdict est
// calculé au moment de l'ajout et gardé tel quel
const lite = (p) => ({ code: p.code, name: p.name, brand: p.brand, image: p.image, quantity: p.quantity, kind: p.kind, verdict: verdictOf(p), score: p.score });
export function toggleShopList(p) {
  if (inShopList(p.code)) { items = items.filter((x) => x.code !== p.code); save(); emit(); return false; }
  items = [{ code: p.code, at: Date.now(), done: false, p: lite(p) }, ...items];
  save(); emit();
  return true;
}
export function toggleDone(code) {
  items = items.map((x) => (x.code === code ? { ...x, done: !x.done } : x));
  save(); emit();
}
export function removeFromShopList(code) { items = items.filter((x) => x.code !== code); save(); emit(); }
export function clearDone() { items = items.filter((x) => !x.done); save(); emit(); }
