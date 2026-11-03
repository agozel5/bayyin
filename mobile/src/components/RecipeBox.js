// Fiche d'un produit dont la recette a changé depuis la dernière fois : ce qui a été ajouté, retiré,
// et le verdict d'avant et d'aujourd'hui.
import React, { useEffect, useState } from "react";
import { View, Text, Pressable } from "react-native";
import { Txt, Muted, Row } from "./ui";
import { Tile } from "./Art";
import { C, R, STATUS_COLORS, dir, lift } from "../theme";
import { t, locale } from "../i18n";
import { haptic } from "../motion";
import { S } from "../view";
import { changeFor, markSeen, onChanges, loadChanges } from "../recipewatch";
import { worse } from "../../../public/lib/recipe.js";
import { TOOL_ICONS } from "./ToolKit";

export default function RecipeBox({ code }) {
  const [c, setC] = useState(() => changeFor(code));
  useEffect(() => {
    loadChanges().then(() => setC(changeFor(code)));
    return onChanges(() => setC(changeFor(code)));
  }, [code]);
  useEffect(() => { if (c && !c.seen) { haptic.warn(); markSeen([code]); } }, [c && c.at]);
  const [open, setOpen] = useState(true);
  if (!c) return null;
  const bad = worse(c.before, c.after);
  const [fg, bg] = bad ? STATUS_COLORS.mashbouh : STATUS_COLORS.inconnu;
  const date = new Date(c.at).toLocaleDateString(locale(), { day: "numeric", month: "long" });
  const list = (k, items, color) => (items.length ? (
    <View style={{ gap: 6 }}>
      <Text style={{ fontSize: 12.5, fontWeight: "800", color: C.muted, textTransform: "uppercase", letterSpacing: 0.4, textAlign: dir().ta }}>{t(k)}</Text>
      <View style={{ flexDirection: dir().row, flexWrap: "wrap", gap: 6 }}>
        {items.map((x) => <Text key={x} style={{ color, backgroundColor: color + "18", fontWeight: "700", fontSize: 13, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99, overflow: "hidden" }}>{x}</Text>)}
      </View>
    </View>
  ) : null);
  return (
    <View accessibilityRole="alert" style={[{ backgroundColor: C.surface, borderRadius: R.xl, overflow: "hidden", borderWidth: 1, borderColor: fg + "55" }, lift()]}>
      <Pressable onPress={() => setOpen(!open)} style={{ backgroundColor: bad ? bg : C.tint, padding: 14 }} accessibilityRole="button" accessibilityState={{ expanded: open }}>
        <Row gap={12}>
          <Tile color={bad ? fg : "#4C64D6"} paths={TOOL_ICONS.recipe} size={40} />
          <View style={{ flex: 1 }}>
            <Txt style={{ color: bad ? fg : C.fg, fontWeight: "800", fontSize: 17 }}>{t("recipe.t")}</Txt>
            <Muted style={{ fontSize: 13 }}>{t("recipe.date", { d: date })}</Muted>
          </View>
        </Row>
      </Pressable>
      {open ? (
        <View style={{ padding: 14, gap: 12 }}>
          {c.before !== c.after ? (
            <Row gap={8} style={{ flexWrap: "wrap" }}>
              <Muted style={{ fontSize: 14 }}>{t("recipe.verdict")}</Muted>
              <Text style={{ fontWeight: "800", color: STATUS_COLORS[c.before][0], textDecorationLine: "line-through" }}>{S(c.before, "short")}</Text>
              <Text style={{ color: C.faint }}>→</Text>
              <Text style={{ fontWeight: "900", color: STATUS_COLORS[c.after][0] }}>{S(c.after, "short")}</Text>
            </Row>
          ) : <Muted style={{ fontSize: 14 }}>{t("recipe.same_verdict", { s: S(c.after, "short") })}</Muted>}
          {list("recipe.added", [...c.added, ...c.addedE], STATUS_COLORS.mashbouh[0])}
          {list("recipe.removed", [...c.removed, ...c.removedE], C.muted)}
          <Muted style={{ fontSize: 12.5, lineHeight: 18 }}>{t("recipe.note")}</Muted>
        </View>
      ) : null}
    </View>
  );
}
