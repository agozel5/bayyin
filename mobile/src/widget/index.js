// Widgets d'écran d'accueil : Android (react-native-android-widget) ; iOS : voir ios-widget.js
import React from "react";
import { Platform } from "react-native";
import { widgetData } from "./data";

export function registerWidgets() {
  if (Platform.OS !== "android") return;
  try {
    const { registerWidgetTaskHandler } = require("react-native-android-widget");
    registerWidgetTaskHandler(require("./task-handler").widgetTaskHandler);
  } catch { /* module absent */ }
}

/** Met à jour le widget quand l'historique change (appelé par l'app ouverte). */
export function updateWidgets(history) {
  if (Platform.OS !== "android") return;
  try {
    const { requestWidgetUpdate } = require("react-native-android-widget");
    const { HomeWidget } = require("./HomeWidget");
    const data = widgetData(history);
    requestWidgetUpdate({ widgetName: "BayyinHome", renderWidget: () => <HomeWidget data={data} />, widgetNotFound: () => {} }).catch(() => {});
  } catch { /* module absent */ }
}
