// Données des widgets : bilan des 7 derniers jours, derniers produits et rappels en cours,
// calculés depuis l'historique (rien n'est demandé au réseau ici).
import AsyncStorage from "@react-native-async-storage/async-storage";
import { verdictOf, profileOf, nameOf, S } from "../view";
import { t } from "../i18n";
import { isActive } from "../../../public/lib/recalls.js";

const groupOf = (p) => {
  const st = verdictOf(p).status;
  if (st === "haram" || profileOf(p).alert === "no") return "bad";
  if (st === "halal_certifie" || st === "halal_probable") return "ok";
  if (st === "mashbouh") return "doubt";
  return "other";
};

// Rappels connus (dernière vérification faite par l'app, voir recalls.js), sans ceux déjà masqués
let lastRecalls = [];
export async function loadRecalledCodes() {
  try {
    const [a, b] = await Promise.all([AsyncStorage.getItem("bayyin:recall_check"), AsyncStorage.getItem("bayyin:recall_seen")]);
    const hits = (a && JSON.parse(a).hits) || [];
    const seen = new Set((b && JSON.parse(b)) || []);
    lastRecalls = [...new Set(hits.filter((h) => h.fiche && isActive(h.fiche) && !seen.has(`${h.code}:${h.fiche.id}`)).map((h) => h.code))];
  } catch { /* stockage illisible : on garde la dernière liste */ }
  return lastRecalls;
}

export function widgetData(history, recalled = lastRecalls) {
  const all = history || [];
  const list = all.filter((e) => e.at > Date.now() - 7 * 864e5);
  const c = { ok: 0, doubt: 0, bad: 0, other: 0 };
  list.forEach((e) => { try { c[groupOf(e.p)]++; } catch { /* fiche illisible */ } });
  const recent = all.slice(0, 5).map((e) => {
    try {
      return { code: e.code, name: nameOf(e.p), brand: e.p.brand || "", g: groupOf(e.p), label: S(verdictOf(e.p).status, "short") };
    } catch { return null; }
  }).filter(Boolean);
  // Alerte rappel : le premier produit rappelé de l'historique
  let alert = null;
  const hit = (recalled || []).map((code) => all.find((e) => e.code === code)).filter(Boolean);
  if (hit.length) {
    let name = "";
    try { name = nameOf(hit[0].p); } catch { /* sans nom */ }
    alert = { code: hit[0].code, n: hit.length, text: hit.length > 1 ? t("widget.recall_n", { n: hit.length }) : t("widget.recall_one", { name }) };
  }
  return {
    n: list.length, ...c, recent, alert,
    share: list.length ? Math.round((c.ok / list.length) * 100) : 0,
    title: t("home.scan"),
    scan: t("widget.scan"),
    week: list.length ? `${list.length} · ${t("widget.week")}` : t("home.week_none"),
    labels: { ok: t("home.wk_ok", { n: c.ok }), doubt: t("home.wk_doubt", { n: c.doubt }), bad: t("home.wk_bad", { n: c.bad }) },
    words: {
      recent: t("widget.recent"), none: t("widget.none"), search: t("tab.search"), basket: t("basket.mode"), photo: t("widget.photo"),
      places: t("widget.places"), halal: t("widget.halal_share"), checked: t("widget.checked"), last: t("widget.last"), ofWeek: t("widget.of_week"),
    },
  };
}
