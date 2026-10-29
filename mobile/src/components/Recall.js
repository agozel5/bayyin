// Rappel officiel (RappelConso) pour le code-barres de la fiche
import React, { useEffect, useState } from "react";
import { View, Text, Pressable, Linking } from "react-native";
import { Txt, Muted, Row } from "./ui";
import { Tile } from "./Art";
import { C, R, STATUS_COLORS, dir, lift } from "../theme";
import { t, tn } from "../i18n";
import { haptic } from "../motion";
import { recallsFor, isActive } from "../../../public/lib/recalls.js";
import { cap, longDate } from "../recalls";

export default function RecallBox({ p }) {
  const [list, setList] = useState([]);
  useEffect(() => {
    let live = true;
    setList([]);
    if (p.kind === "medicine" || !/^\d{8,14}$/.test(p.code)) return;
    recallsFor(p.code).then((l) => {
      if (!live || !l.length) return;
      setList(l);
      if (isActive(l[0])) haptic.warn();
    });
    return () => { live = false; };
  }, [p.code]);
  if (!list.length) return null;
  const f = list[0];
  const on = isActive(f);
  const [fg, bg] = on ? STATUS_COLORS.haram : STATUS_COLORS.inconnu;
  const rows = [["recall.motif", f.m], ["recall.risk", f.r], ["recall.todo", f.a]].filter(([, v]) => v);
  return (
    <View accessibilityRole="alert" style={[{ backgroundColor: C.surface, borderRadius: R.xl, overflow: "hidden", borderWidth: 1, borderColor: fg + "55" }, lift()]}>
      <View style={{ backgroundColor: bg, padding: 14, gap: 6 }}>
        <Row gap={12}>
          <Tile color={fg} paths='<path d="M12 4l9 16H3z"/><path d="M12 10v4.5M12 17.5v.1"/>' size={40} />
          <View style={{ flex: 1 }}>
            <Txt style={{ color: fg, fontWeight: "800", fontSize: 17 }}>{t(on ? "recall.t" : "recall.t_old")}</Txt>
            <Muted style={{ fontSize: 13 }}>{t("recall.date", { d: longDate(f.d) })}</Muted>
          </View>
        </Row>
        <Txt style={{ fontWeight: "700" }}>{cap(f.n)}{f.b ? ` · ${cap(f.b)}` : ""}</Txt>
      </View>
      <View style={{ padding: 14, gap: 10 }}>
        {rows.map(([k, v]) => (
          <View key={k} style={{ gap: 2 }}>
            <Text style={{ fontSize: 12.5, fontWeight: "800", color: C.muted, textTransform: "uppercase", letterSpacing: 0.4, textAlign: dir().ta }}>{t(k)}</Text>
            <Txt style={{ fontSize: 14.5, lineHeight: 20 }}>{cap(v)}</Txt>
          </View>
        ))}
        <Muted style={{ fontSize: 13, lineHeight: 18 }}>{t("recall.lot")}</Muted>
        {f.u ? (
          <Pressable onPress={() => Linking.openURL(f.u).catch(() => {})} accessibilityRole="link">
            <Text style={{ color: fg, fontWeight: "800", fontSize: 14.5, textAlign: dir().ta }}>{t("recall.link")} ↗</Text>
          </Pressable>
        ) : null}
        {list.length > 1 ? <Muted style={{ fontSize: 13 }}>{tn("recall.more", list.length - 1)}</Muted> : null}
      </View>
    </View>
  );
}
