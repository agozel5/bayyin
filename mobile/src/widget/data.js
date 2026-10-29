// Données du widget : bilan des 7 derniers jours, calculé depuis l'historique.
import { verdictOf, profileOf } from "../view";
import { t } from "../i18n";

export function widgetData(history) {
  const list = (history || []).filter((e) => e.at > Date.now() - 7 * 864e5);
  const c = { ok: 0, doubt: 0, bad: 0 };
  list.forEach((e) => {
    try {
      const st = verdictOf(e.p).status;
      if (st === "haram" || profileOf(e.p).alert === "no") c.bad++;
      else if (st === "halal_certifie" || st === "halal_probable") c.ok++;
      else c.doubt++;
    } catch { /* fiche illisible */ }
  });
  return {
    n: list.length, ...c,
    title: t("home.scan"),
    week: list.length ? `${list.length} · ${t("widget.week")}` : t("home.week_none"),
    labels: { ok: t("home.wk_ok", { n: c.ok }), doubt: t("home.wk_doubt", { n: c.doubt }), bad: t("home.wk_bad", { n: c.bad }) },
  };
}
