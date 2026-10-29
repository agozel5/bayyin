// Version web de contrôle (captures automatiques) : la page HTML s'affiche dans un cadre.
import React from "react";
import { View } from "react-native";
export function WebView({ source, style }) {
  if (source && source.html) return <View style={style}>{React.createElement("iframe", { srcDoc: source.html, style: { border: 0, width: "100%", height: "100%" } })}</View>;
  return <View style={style} />;
}
export default WebView;
