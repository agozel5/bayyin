// Couleurs et mesures, reprises de la version web (thème clair).
import { isRTL } from "./i18n";

export const C = {
  bg: "#FFFFFF",
  tint: "#F4F6F3",
  tint2: "#EBEFEA",
  fg: "#18211C",
  muted: "#5D6A63",
  faint: "#97A39C",
  line: "#E6EAE5",
  brand: "#14805A",
  brandDark: "#0E6346",
  brandSoft: "#E3F3EB",
  gold: "#FFD27A",
};

// Couleurs des statuts halal : [texte/forme, fond]
export const STATUS_COLORS = {
  halal_certifie: ["#169B57", "#E2F5EA"],
  halal_probable: ["#3E8A49", "#EAF5EB"],
  mashbouh: ["#C06B0C", "#FFF1E0"],
  haram: ["#E0423A", "#FDE8E6"],
  inconnu: ["#6C7771", "#EEF0EE"],
};
export const ALERT_COLORS = { no: ["#C0312A", "#FDECEA"], maybe: ["#B25E00", "#FFF4E5"] };
export const SEV_COLORS = { haram: STATUS_COLORS.haram, mashbouh: STATUS_COLORS.mashbouh, info: ["#3F79B5", "#E6EFF8"] };
export const RISK_COLORS = { eleve: ["#E0423A", "#FDE8E6"], modere: ["#C06B0C", "#FFF1E0"], limite: ["#8A7A12", "#F7F3D9"] };
export const GRADE_COLORS = { excellent: "#169B57", bon: "#7DBE45", mediocre: "#EE8A1F", mauvais: "#E0423A" };
export const LEVEL_COLORS = { faible: "#169B57", bon: "#169B57", modere: "#EE8A1F", eleve: "#E0423A" };
export const NOVA_COLORS = { 1: "#169B57", 2: "#7DBE45", 3: "#EE8A1F", 4: "#E0423A" };

export const R = { xl: 26, lg: 20, md: 14, sm: 10 };

// Sens de lecture : l'arabe se lit de droite à gauche.
export const dir = () => {
  const rtl = isRTL();
  return { rtl, row: rtl ? "row-reverse" : "row", ta: rtl ? "right" : "left", align: rtl ? "flex-end" : "flex-start" };
};
