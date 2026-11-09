// Appel au boycott qui concerne le produit (liste du mouvement BDS), présenté comme une information
// à part, distincte du verdict halal. Désactivable dans Réglages › Appels au boycott.
import React, { useState } from "react";
import { View, Text, Pressable, Linking } from "react-native";
import { Txt, Muted, Row } from "./ui";
import { Tile } from "./Art";
import { C, R, dir, lift } from "../theme";
import { t, locale } from "../i18n";
import { haptic } from "../motion";
import { getSettings } from "../storage";
import { boycottOf, BOYCOTT_SOURCE } from "../../../public/lib/boycott.js";

export const BOYCOTT_COLOR = "#6A55C2";
export const BOYCOTT_ICON = '<path d="M4 10v4a1 1 0 0 0 1 1h2l5 4V5L7 9H5a1 1 0 0 0-1 1z"/><path d="M16 9.5a3.5 3.5 0 0 1 0 5M18.5 7a7 7 0 0 1 0 10"/>';

export const checkedDate = () => {
  try { return new Intl.DateTimeFormat(locale(), { day: "numeric", month: "long", year: "numeric" }).format(new Date(BOYCOTT_SOURCE.checked + "T12:00:00")); } catch { return BOYCOTT_SOURCE.checked; }
};

/** Phrase qui explique pourquoi le produit est concerné */
export function boycottText(b) {
  if (b.id === "israel") return t(b.via === "barcode" ? "boycott.israel_code" : "boycott.israel");
  return t(b.level === "organic" ? "boycott.organic" : "boycott.bds", { c: b.company });
}

export default function BoycottBox({ p }) {
  const [more, setMore] = useState(false);
  if (getSettings().boycott === false) return null;
  const b = boycottOf({ ...(p.raw || {}), code: p.code, kind: p.kind || (p.raw && p.raw.kind) });
  if (!b) return null;
  const col = BOYCOTT_COLOR;
  return (
    <View accessibilityLabel={`${t("boycott.t")}. ${boycottText(b)}`} style={[{ backgroundColor: C.surface, borderRadius: R.xl, padding: 14, gap: 10, borderWidth: 1, borderColor: col + "40" }, lift()]}>
      <Row gap={12}>
        <Tile color={col} paths={BOYCOTT_ICON} size={38} />
        <View style={{ flex: 1, gap: 2 }}>
          <Txt style={{ color: col, fontWeight: "800", fontSize: 16 }}>{t("boycott.t")}</Txt>
          <Txt style={{ fontSize: 14.5, lineHeight: 20 }}>{boycottText(b)}</Txt>
        </View>
      </Row>
      {more ? (
        <View style={{ gap: 8 }}>
          <Muted style={{ fontSize: 13.5, lineHeight: 19 }}>{t(b.level === "organic" ? "boycott.organic_p" : "boycott.bds_p")}</Muted>
          <Muted style={{ fontSize: 13.5, lineHeight: 19 }}>{t("boycott.neutral")}</Muted>
          <Pressable onPress={() => Linking.openURL(BOYCOTT_SOURCE.url).catch(() => {})} accessibilityRole="link">
            <Text style={{ color: col, fontWeight: "800", fontSize: 14, textAlign: dir().ta }}>{t("boycott.source", { d: checkedDate() })} ↗</Text>
          </Pressable>
          <Muted style={{ fontSize: 12.5, lineHeight: 17 }}>{t("boycott.hide_hint")}</Muted>
        </View>
      ) : (
        <Pressable onPress={() => { haptic.tap(); setMore(true); }} accessibilityRole="button" hitSlop={6}>
          <Text style={{ color: col, fontWeight: "800", fontSize: 14, textAlign: dir().ta }}>{t("boycott.more")}</Text>
        </Pressable>
      )}
    </View>
  );
}
