// Mode courses : les produits scannés à la suite, sans quitter la caméra (gardés sur le téléphone).
import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "bayyin:basket";
let items = []; // [{ code, at, p? }]
const listeners = new Set();
const emit = () => listeners.forEach((fn) => fn(items));
const save = () => AsyncStorage.setItem(KEY, JSON.stringify(items.map(({ code, at }) => ({ code, at })))).catch(() => {});

export async function loadBasket() {
  try { const s = await AsyncStorage.getItem(KEY); items = s ? JSON.parse(s) : []; } catch { items = []; }
  emit();
}
export const getBasket = () => items;
export const onBasket = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
export const inBasket = (code) => items.some((x) => x.code === code);
export function addToBasket(code) {
  if (inBasket(code)) return false;
  items = [{ code, at: Date.now() }, ...items];
  save(); emit();
  return true;
}
export function setBasketProduct(code, p) {
  items = items.map((x) => (x.code === code ? { ...x, p } : x));
  emit();
}
export function removeFromBasket(code) {
  items = items.filter((x) => x.code !== code);
  save(); emit();
}
export function clearBasket() {
  items = [];
  save(); emit();
}
