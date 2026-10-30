// Le système demande le contenu du widget (ajout, mise à jour périodique), parfois app fermée.
import React from "react";
import { widgetFor } from "./HomeWidget";
import { widgetData } from "./data";

export async function widgetTaskHandler(props) {
  const { initStorage, getHistory, getSettings } = require("../storage");
  const { setLang } = require("../i18n");
  try { await initStorage(); setLang(getSettings().lang); } catch { /* stockage indisponible */ }
  switch (props.widgetAction) {
    case "WIDGET_ADDED":
    case "WIDGET_UPDATE":
    case "WIDGET_RESIZED":
      props.renderWidget(widgetFor(props.widgetInfo && props.widgetInfo.widgetName, widgetData(getHistory())));
      break;
    default:
      break;
  }
}
