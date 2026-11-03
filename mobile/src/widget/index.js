// Widgets d'écran d'accueil : Android (react-native-android-widget) ; iOS : voir ios-widget.js
import React from "react";
import { Platform } from "react-native";
import { widgetData, loadRecalledCodes } from "./data";

export function registerWidgets() {
  if (Platform.OS !== "android") return;
  try {
    const { registerWidgetTaskHandler } = require("react-native-android-widget");
    registerWidgetTaskHandler(require("./task-handler").widgetTaskHandler);
  } catch { /* module absent */ }
}

/** Met à jour le widget quand l'historique change (appelé par l'app ouverte). */
export function updateWidgets(history, recalled) {
  if (!recalled) { loadRecalledCodes().then((codes) => updateWidgets(history, codes)).catch(() => {}); return; }
  if (Platform.OS === "ios") {
    try {
      const W = require("./ios-widget").default;
      const d = widgetData(history, recalled);
      if (W) W.updateSnapshot({ n: d.n, ok: d.ok, doubt: d.doubt, bad: d.bad, share: d.share, week: d.week, scan: d.scan, title: d.title, words: d.words, alert: d.alert ? d.alert.text : "",
        recent: d.recent.slice(0, 5).map((r) => ({ name: r.name, brand: r.brand, g: r.g, label: r.label })) });
    } catch { /* module absent */ }
    return;
  }
  if (Platform.OS !== "android") return;
  try {
    const { requestWidgetUpdate } = require("react-native-android-widget");
    const { widgetFor, WIDGET_NAMES } = require("./HomeWidget");
    const data = widgetData(history, recalled);
    for (const name of WIDGET_NAMES) requestWidgetUpdate({ widgetName: name, renderWidget: () => widgetFor(name, data), widgetNotFound: () => {} }).catch(() => {});
  } catch { /* module absent */ }
}
