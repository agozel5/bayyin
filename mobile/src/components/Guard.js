// Filet de sécurité : si un écran plante, on affiche un message (avec retour et nouvel essai)
// au lieu d'un écran blanc pour toute l'app. L'erreur est aussi gardée pour les captures de contrôle.
import React from "react";
import { View, Text, Pressable } from "react-native";
import { C, R } from "../theme";
import { t } from "../i18n";

export default class Guard extends React.Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) {
    try { if (typeof window !== "undefined") (window.__bayyinErrors = window.__bayyinErrors || []).push(String((error && error.stack) || error) + "\n" + ((info && info.componentStack) || "").slice(0, 600)); } catch { /* rien */ }
  }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 28, gap: 14, backgroundColor: C.bg }}>
        <Text style={{ fontSize: 20, fontWeight: "800", color: C.fg, textAlign: "center" }}>{t("msg.load_error.t")}</Text>
        <View style={{ flexDirection: "row", gap: 10 }}>
          {this.props.onBack ? (
            <Pressable onPress={this.props.onBack} accessibilityRole="button" style={{ paddingHorizontal: 18, paddingVertical: 12, borderRadius: R.md, backgroundColor: C.tint }}>
              <Text style={{ fontWeight: "800", color: C.fg }}>{t("sheet.back")}</Text>
            </Pressable>
          ) : null}
          <Pressable onPress={() => this.setState({ error: null })} accessibilityRole="button" style={{ paddingHorizontal: 18, paddingVertical: 12, borderRadius: R.md, backgroundColor: C.brand }}>
            <Text style={{ fontWeight: "800", color: "#fff" }}>{t("msg.retry")}</Text>
          </Pressable>
        </View>
      </View>
    );
  }
}
