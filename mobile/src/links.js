// Liens qui ouvrent l'app : bayyin://p/<code>, bayyin://scan…, et les liens de partage du site (…/bayyin/?p=<code>).
// Servent aussi aux raccourcis de l'icône et au widget.
import { Linking, Platform } from "react-native";
import { t } from "./i18n";

export function parseLink(url) {
  if (!url) return null;
  const s = String(url);
  const m = s.match(/[?&#]p=([0-9]{6,14})/) || s.match(/^bayyin:\/\/(?:p|product)\/([0-9]{6,14})/);
  if (m) return { type: "product", code: m[1] };
  const k = s.match(/^bayyin:\/\/(scan|search|history|rankings|additives|settings)/);
  return k ? { type: k[1] } : null;
}

/** Écoute les liens (au démarrage et app ouverte) et les raccourcis de l'icône. */
export function listenLinks(handle) {
  const subs = [];
  Linking.getInitialURL().then((u) => { const l = parseLink(u); if (l) handle(l); }).catch(() => {});
  const sub = Linking.addEventListener("url", ({ url }) => { const l = parseLink(url); if (l) handle(l); });
  subs.push(() => sub.remove());
  if (Platform.OS !== "web") {
    try {
      const QA = require("expo-quick-actions");
      const run = (a) => { const l = a && a.params && parseLink(a.params.href); if (l) handle(l); };
      if (QA.initial) run(QA.initial);
      const s2 = QA.addListener && QA.addListener(run);
      if (s2) subs.push(() => s2.remove());
    } catch { /* module absent */ }
  }
  return () => subs.forEach((f) => f());
}

/** Raccourcis de l'icône (appui long), dans la langue de l'app. */
export function setQuickActions() {
  if (Platform.OS === "web") return;
  try {
    const QA = require("expo-quick-actions");
    const ios = Platform.OS === "ios";
    QA.setItems([
      { id: "scan", title: t("home.scan"), icon: ios ? "symbol:barcode.viewfinder" : "qa_scan", params: { href: "bayyin://scan" } },
      { id: "search", title: t("tab.search"), icon: ios ? "symbol:magnifyingglass" : "qa_search", params: { href: "bayyin://search" } },
      { id: "history", title: t("tab.history"), icon: ios ? "symbol:clock" : "qa_history", params: { href: "bayyin://history" } },
      { id: "rankings", title: t("rank.title"), icon: ios ? "symbol:trophy" : "qa_rankings", params: { href: "bayyin://rankings" } },
    ]).catch(() => {});
  } catch { /* module absent */ }
}
