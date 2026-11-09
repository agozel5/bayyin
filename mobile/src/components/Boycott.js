// Appel au boycott qui concerne le produit (liste du mouvement BDS), présenté comme une information
// à part, distincte du verdict halal : qui appelle au boycott, pourquoi selon la source, comment
// Bayyin a reconnu le produit, et des alternatives qui ne sont pas concernées.
// Réglable dans Réglages › Appels au boycott (tout masquer, ou seulement certaines catégories).
import React, { useEffect, useState } from "react";
import { View, Text, Pressable, Linking } from "react-native";
import { Txt, Muted, Row } from "./ui";
import { Tile, Glyph } from "./Art";
import { Thumb } from "./Cards";
import { C, R, dir, lift } from "../theme";
import { t } from "../i18n";
import { haptic } from "../motion";
import { mailto } from "../config";
import { verdictOf, nameOf, S } from "../view";
import { fetchAlternatives } from "../api";
import { BOYCOTT_SOURCE } from "../../../public/lib/boycott.js";
import { BOYCOTT_COLOR, BOYCOTT_ICON, boycottFor, boycottText, checkedDate, whyKey } from "../boycott";
export { BOYCOTT_COLOR, BOYCOTT_ICON, checkedDate };

// Alternatives du même rayon qui ne sont pas concernées (les mêmes que plus bas sur la fiche)
function Alternatives({ p, onOpen }) {
  const [list, setList] = useState(null);
  useEffect(() => {
    let alive = true;
    const keep = (l) => alive && setList((l || []).filter((a) => !boycottFor(a)).slice(0, 3));
    fetchAlternatives(p, keep).then(keep).catch(() => alive && setList((x) => x || []));
    return () => { alive = false; };
  }, [p.code]);
  if (!list || !list.length) return null;
  return (
    <View style={{ gap: 2, marginTop: 2 }}>
      <Text style={{ fontSize: 12.5, fontWeight: "800", color: C.muted, letterSpacing: 0.4, textTransform: "uppercase", textAlign: dir().ta }}>{t("boycott.alts")}</Text>
      {list.map((a) => {
        const st = verdictOf(a).status;
        return (
          <Pressable key={a.code} onPress={() => { haptic.tap(); onOpen && onOpen(a.code, { product: a }); }} accessibilityRole="button" accessibilityLabel={`${nameOf(a)}, ${S(st, "label")}`}
            style={({ pressed }) => ({ flexDirection: dir().row, alignItems: "center", gap: 10, paddingVertical: 7, opacity: pressed ? 0.6 : 1 })}>
            <Thumb p={a} size={40} radius={10} />
            <View style={{ flex: 1 }}>
              <Text numberOfLines={1} style={{ color: C.fg, fontWeight: "700", fontSize: 14.5, textAlign: dir().ta }}>{nameOf(a)}</Text>
              <Text numberOfLines={1} style={{ color: C.muted, fontSize: 12.5, textAlign: dir().ta }}>{[a.brand, S(st, "short")].filter(Boolean).join(" · ")}</Text>
            </View>
            <Glyph name="chev" size={15} color={C.faint} />
          </Pressable>
        );
      })}
    </View>
  );
}

export default function BoycottBox({ p, onOpen }) {
  const [more, setMore] = useState(false);
  if (typeof window !== "undefined" && window.__bayyin) window.__bayyinBoycottMore = () => setMore(true); // captures automatiques (web)
  const b = boycottFor(p);
  if (!b) return null;
  const col = BOYCOTT_COLOR;
  const how = b.via === "brand" ? t("boycott.how_brand", { b: b.brandName }) : t(b.via === "origin" ? "boycott.how_origin" : "boycott.how_code");
  const report = mailto(t("boycott.report_t", { code: p.code }), t("boycott.report_b", { name: nameOf(p), code: p.code, brand: p.brand || "", who: b.company || t("boycott.israel_row") }));
  return (
    <View accessibilityLabel={`${t("boycott.t")}. ${boycottText(b)}`} style={[{ backgroundColor: C.surface, borderRadius: R.xl, padding: 14, gap: 10, borderWidth: 1, borderColor: col + "40" }, lift()]}>
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
      {more ? (
        <View style={{ gap: 10 }}>
          <View style={{ gap: 3 }}>
            <Text style={{ fontSize: 12.5, fontWeight: "800", color: C.muted, letterSpacing: 0.4, textTransform: "uppercase", textAlign: dir().ta }}>{t("boycott.why_t")}</Text>
            <Txt style={{ fontSize: 14, lineHeight: 20 }}>{t(whyKey(b))}</Txt>
          </View>
          <View style={{ gap: 3 }}>
            <Text style={{ fontSize: 12.5, fontWeight: "800", color: C.muted, letterSpacing: 0.4, textTransform: "uppercase", textAlign: dir().ta }}>{t("boycott.how_t")}</Text>
            <Txt style={{ fontSize: 14, lineHeight: 20 }}>{how}</Txt>
          </View>
          <Muted style={{ fontSize: 13, lineHeight: 18 }}>{t("boycott.neutral")}</Muted>
          <Pressable onPress={() => Linking.openURL(BOYCOTT_SOURCE.url).catch(() => {})} accessibilityRole="link">
            <Text style={{ color: col, fontWeight: "800", fontSize: 14, textAlign: dir().ta }}>{t("boycott.source", { d: checkedDate() })} ↗</Text>
          </Pressable>
          {report ? (
            <Pressable onPress={() => Linking.openURL(report).catch(() => {})} accessibilityRole="link">
              <Text style={{ color: C.muted, fontWeight: "700", fontSize: 13.5, textAlign: dir().ta, textDecorationLine: "underline" }}>{t("boycott.report")}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : (
        <Pressable onPress={() => { haptic.tap(); setMore(true); }} accessibilityRole="button" hitSlop={6} style={{ flexDirection: dir().row, alignItems: "center", gap: 4 }}>
          <Text style={{ color: col, fontWeight: "800", fontSize: 14, textAlign: dir().ta }}>{t("boycott.more")}</Text>
          <View style={{ transform: [{ rotate: "90deg" }] }}><Glyph name="chev" size={14} color={col} width={2.4} /></View>
        </Pressable>
      )}
      {(p.kind || (p.raw && p.raw.kind) || "food") !== "medicine" && !p.local ? <Alternatives p={p} onOpen={onOpen} /> : null}
    </View>
  );
}
