// Données des widgets : bilan des 7 derniers jours et derniers produits, calculés depuis l'historique.
import { verdictOf, profileOf, nameOf, S } from "../view";
import { t } from "../i18n";

const groupOf = (p) => {
  const st = verdictOf(p).status;
  if (st === "haram" || profileOf(p).alert === "no") return "bad";
  if (st === "halal_certifie" || st === "halal_probable") return "ok";
  if (st === "mashbouh") return "doubt";
  return "other";
};

export function widgetData(history) {
  const all = history || [];
  const list = all.filter((e) => e.at > Date.now() - 7 * 864e5);
  const c = { ok: 0, doubt: 0, bad: 0, other: 0 };
  list.forEach((e) => { try { c[groupOf(e.p)]++; } catch { /* fiche illisible */ } });
  const recent = all.slice(0, 5).map((e) => {
    try {
      return { code: e.code, name: nameOf(e.p), brand: e.p.brand || "", g: groupOf(e.p), label: S(verdictOf(e.p).status, "short") };
    } catch { return null; }
  }).filter(Boolean);
  return {
    n: list.length, ...c, recent,
    share: list.length ? Math.round((c.ok / list.length) * 100) : 0,
    title: t("home.scan"),
    scan: t("widget.scan"),
    week: list.length ? `${list.length} · ${t("widget.week")}` : t("home.week_none"),
    labels: { ok: t("home.wk_ok", { n: c.ok }), doubt: t("home.wk_doubt", { n: c.doubt }), bad: t("home.wk_bad", { n: c.bad }) },
    words: {
      recent: t("widget.recent"), none: t("widget.none"), search: t("tab.search"), basket: t("basket.mode"), photo: t("widget.photo"),
      places: t("widget.places"), halal: t("widget.halal_share"), checked: t("widget.checked"),
    },
  };
}
