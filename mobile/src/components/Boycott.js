// Encart « Appel au boycott » de la fiche produit : qui appelle au boycott et pourquoi le produit est
// concerné, en une phrase. Un toucher ouvre la page détaillée (source, marques, alternatives).
// Information à part, distincte du verdict halal ; réglable dans Réglages › Appels au boycott.
import React from "react";
import { View, Text, Pressable } from "react-native";
import { Txt, Muted, Row } from "./ui";
import { Tile, Glyph } from "./Art";
import { C, R, dir, lift } from "../theme";
import { t } from "../i18n";
import { haptic } from "../motion";
import { BOYCOTT_COLOR, BOYCOTT_ICON, boycottFor, boycottText, checkedDate } from "../boycott";
export { BOYCOTT_COLOR, BOYCOTT_ICON, checkedDate };

export default function BoycottBox({ p, onDetail }) {
  const b = boycottFor(p);
  if (!b) return null;
  const col = BOYCOTT_COLOR;
  return (
    <Pressable onPress={() => { haptic.tap(); onDetail && onDetail(b.id, p); }} accessibilityRole="button" accessibilityLabel={`${t("boycott.t")}. ${boycottText(b)}`} accessibilityHint={t("boycott.open")}
      style={({ pressed }) => [{ backgroundColor: C.surface, borderRadius: R.xl, padding: 14, gap: 10, borderWidth: 1, borderColor: col + "40", transform: [{ scale: pressed ? 0.985 : 1 }] }, lift()]}>
      <Row gap={12} style={{ alignItems: "flex-start" }}>
        <Tile color={col} paths={BOYCOTT_ICON} size={38} />
        <View style={{ flex: 1, gap: 3 }}>
          <Row gap={8} style={{ flexWrap: "wrap" }}>
            <Txt style={{ color: col, fontWeight: "800", fontSize: 16 }}>{t("boycott.t")}</Txt>
            <View style={{ paddingHorizontal: 7, paddingVertical: 1, borderRadius: 99, backgroundColor: col + "1F" }}>
              <Text style={{ color: col, fontWeight: "800", fontSize: 11.5 }}>{t(`boycott.k.${b.kind}`)}</Text>
            </View>
          </Row>
          <Txt style={{ fontSize: 14.5, lineHeight: 20 }}>{boycottText(b)}</Txt>
          {b.owned ? <Muted style={{ fontSize: 13.5, lineHeight: 18 }}>{t("boycott.owned", { b: b.brandName, c: b.company })}</Muted> : null}
        </View>
      </Row>
      <View style={{ flexDirection: dir().row, alignItems: "center", justifyContent: "space-between", paddingTop: 10, borderTopWidth: 0.5, borderTopColor: C.line }}>
        <Text style={{ color: col, fontWeight: "800", fontSize: 14 }}>{t("boycott.open")}</Text>
        <Glyph name="chev" size={15} color={col} width={2.4} />
      </View>
    </Pressable>
  );
}
