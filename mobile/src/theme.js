// Couleurs et mesures, reprises de la version web (thèmes clair et sombre).
// C est modifié sur place au changement de thème, puis toute l'app est redessinée.
import { Appearance } from "react-native";
import { isRTL } from "./i18n";

const LIGHT = {
  bg: "#F1F5F0", surface: "#FFFFFF", tint: "#F3F6F2", tint2: "#E7EDE5",
  fg: "#15211A", muted: "#5D6A63", faint: "#5F6B64", line: "#E6EAE5",
  brand: "#12724F", brandDark: "#0B5139", brandSoft: "#E3F3EB", gold: "#E7B84E",
  artBg: "#F4EFE4", tabbar: "rgba(255,255,255,0.93)", shadow: "#0B2A1C",
  cert: "#169B57", doubt: "#EE8A1F", haram: "#E0423A", info: "#3F79B5",
};
const DARK = {
  bg: "#0B100D", surface: "#141B17", tint: "#1B241F", tint2: "#232E28",
  fg: "#E8EEEA", muted: "#9FADA5", faint: "#8A978F", line: "#28332D",
  brand: "#3DBE8A", brandDark: "#86DDB6", brandSoft: "#15342A", gold: "#E2B84E",
  artBg: "#232C27", tabbar: "rgba(20,27,23,0.94)", shadow: "#000000",
  cert: "#3FC27C", doubt: "#F0A04A", haram: "#F0675D", info: "#6FA6DE",
};

export const C = { ...LIGHT };
let dark = false;
export const isDark = () => dark;
// mode : "auto" (comme le téléphone), "light" ou "dark"
export function applyTheme(mode = "auto") {
  dark = mode === "dark" || (mode !== "light" && Appearance.getColorScheme() === "dark");
  Object.assign(C, dark ? DARK : LIGHT);
  return dark;
}

// Bandeau du verdict (couleur pleine, comme la version web)
export const VERDICT = {
  halal_certifie: "#128A4E", halal_probable: "#2E7F45", mashbouh: "#BF650A", haram: "#C3362D", inconnu: "#5F6B65",
};
// Couleurs des statuts halal : [texte/forme, fond] (fonds recalculés en sombre)
const ST_LIGHT = {
  halal_certifie: ["#169B57", "#E2F5EA"], halal_probable: ["#3E8A49", "#EAF5EB"], mashbouh: ["#C06B0C", "#FFF1E0"],
  haram: ["#E0423A", "#FDE8E6"], inconnu: ["#6C7771", "#EEF0EE"],
};
const ST_DARK = {
  halal_certifie: ["#3FC27C", "#173A27"], halal_probable: ["#6FC27A", "#1C3522"], mashbouh: ["#F0A04A", "#3A2A14"],
  haram: ["#F0675D", "#3D1D1A"], inconnu: ["#A5B2AA", "#26302A"],
};
export const STATUS_COLORS = new Proxy({}, { get: (_, k) => (dark ? ST_DARK : ST_LIGHT)[k] });
export const ALERT_COLORS = new Proxy({}, { get: (_, k) => ({ no: dark ? ["#F0675D", "#3D1D1A"] : ["#C0312A", "#FDECEA"], maybe: dark ? ["#F0A04A", "#3A2A14"] : ["#B25E00", "#FFF4E5"] })[k] });
export const SEV_COLORS = new Proxy({}, { get: (_, k) => ({ haram: STATUS_COLORS.haram, mashbouh: STATUS_COLORS.mashbouh, info: dark ? ["#6FA6DE", "#1B2A3B"] : ["#3F79B5", "#E6EFF8"] })[k] });
export const RISK_COLORS = new Proxy({}, { get: (_, k) => ({ eleve: STATUS_COLORS.haram, modere: STATUS_COLORS.mashbouh, limite: dark ? ["#D8C95A", "#33301A"] : ["#8A7A12", "#F7F3D9"] })[k] });
export const GRADE_COLORS = { excellent: "#169B57", bon: "#7DBE45", mediocre: "#EE8A1F", mauvais: "#E0423A" };
export const LEVEL_COLORS = { faible: "#169B57", bon: "#169B57", modere: "#EE8A1F", eleve: "#E0423A" };
export const NOVA_COLORS = { 1: "#169B57", 2: "#7DBE45", 3: "#EE8A1F", 4: "#E0423A" };

// Couleur de deux teintes mélangées (équivalent de color-mix de la version web)
export function mix(a, b, k) {
  const p = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const x = p(a), y = p(b);
  return "#" + x.map((v, i) => Math.round(v * k + y[i] * (1 - k)).toString(16).padStart(2, "0")).join("");
}

export const R = { xl: 22, lg: 18, md: 13, sm: 10 };

// Sens de lecture : l'arabe se lit de droite à gauche.
export const dir = () => {
  const rtl = isRTL();
  return { rtl, row: rtl ? "row-reverse" : "row", ta: rtl ? "right" : "left", align: rtl ? "flex-end" : "flex-start" };
};

// Ombre douce des cartes (iOS) / élévation (Android)
export const lift = () => (dark
  ? { borderWidth: 0.5, borderColor: "rgba(255,255,255,0.07)" }
  : { shadowColor: C.shadow, shadowOpacity: 0.08, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 2 });
