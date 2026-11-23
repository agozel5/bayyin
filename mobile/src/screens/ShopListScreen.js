// Liste de courses : les produits à prendre, cochés d'un toucher en magasin ; ajout rapide depuis les favoris.
import React, { useEffect, useState } from "react";
import { View, Pressable, ScrollView } from "react-native";
import { Text } from "../components/Text";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { NavScroll } from "../components/NavBar";
import { Txt, Muted, Row, FadeIn } from "../components/ui";
import { Glyph, Tile } from "../components/Art";
import { Thumb } from "../components/Cards";
import EmptyState from "../components/Empty";
import { C, R, dir, lift, STATUS_COLORS } from "../theme";
import { t, tn } from "../i18n";
import { getHistory } from "../storage";
import { verdictOf, nameOf, S } from "../view";
import { getShopList, onShopList, toggleShopList, toggleDone, removeFromShopList, clearDone } from "../shoplist";
import { haptic } from "../motion";

export default function ShopListScreen({ onOpen, onClose, toast }) {
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState(getShopList());
  useEffect(() => onShopList((l) => setItems([...l])), []);
  const todo = items.filter((x) => !x.done), done = items.filter((x) => x.done);
  const favs = getHistory().filter((e) => e.fav && !items.some((x) => x.code === e.code));
  const row = (x, i, list) => {
    const st = verdictOf(x.p).status;
    const [fg, bg] = STATUS_COLORS[st] || STATUS_COLORS.inconnu;
    return (
      <FadeIn key={x.code} delay={Math.min(i, 8) * 35} distance={8}>
        <View style={{ flexDirection: dir().row, alignItems: "center", gap: 12, paddingVertical: 10, paddingHorizontal: 12, borderTopWidth: i ? 0.5 : 0, borderTopColor: C.line, opacity: x.done ? 0.55 : 1 }}>
          <Pressable onPress={() => { haptic.tap(); toggleDone(x.code); }} hitSlop={10} accessibilityRole="checkbox" accessibilityState={{ checked: !!x.done }} accessibilityLabel={nameOf(x.p)}
            style={{ width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: x.done ? C.brand : C.faint, backgroundColor: x.done ? C.brand : "transparent", alignItems: "center", justifyContent: "center" }}>
            {x.done ? <Glyph name="check" size={15} color="#fff" width={3} /> : null}
          </Pressable>
          <Pressable onPress={() => onOpen(x.code)} style={{ flex: 1, flexDirection: dir().row, alignItems: "center", gap: 12 }} accessibilityRole="button">
            <Thumb p={x.p} size={46} radius={12} />
            <View style={{ flex: 1, gap: 3 }}>
              <Text numberOfLines={2} style={{ fontSize: 15, fontWeight: "700", color: C.fg, textAlign: dir().ta, textDecorationLine: x.done ? "line-through" : "none" }}>{nameOf(x.p)}</Text>
              <Row gap={6}>
                <View style={{ paddingHorizontal: 7, paddingVertical: 1, borderRadius: 99, backgroundColor: bg }}><Text style={{ fontSize: 11.5, fontWeight: "800", color: fg }}>{S(st, "short")}</Text></View>
                {x.p.brand ? <Muted numberOfLines={1} style={{ flex: 1, fontSize: 12.5 }}>{x.p.brand}</Muted> : null}
              </Row>
            </View>
          </Pressable>
          <Pressable onPress={() => { haptic.tap(); removeFromShopList(x.code); toast && toast(t("shop.removed")); }} hitSlop={10} accessibilityRole="button" accessibilityLabel={t("history.delete_one")}
            style={({ pressed }) => ({ width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: pressed ? C.tint2 : "transparent" })}>
            <Glyph name="cross" size={13} color={C.faint} />
          </Pressable>
        </View>
      </FadeIn>
    );
  };
  const card = (list) => <View style={[{ backgroundColor: C.surface, borderRadius: R.lg, overflow: "hidden" }, lift()]}>{list.map((x, i) => row(x, i, list))}</View>;
  return (
    <NavScroll title={t("shop.title")} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: insets.top + 12, paddingBottom: insets.bottom + 40, gap: 16 }}>
      <Row gap={6}>
        <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel={t("sheet.back")} style={{ padding: 4, transform: [{ scaleX: dir().rtl ? -1 : 1 }] }}>
          <Glyph paths='<path d="M15 5l-7 7 7 7"/>' size={24} color={C.fg} width={2.2} />
        </Pressable>
      </Row>
      <Txt accessibilityRole="header" style={{ fontSize: 30, fontWeight: "800", letterSpacing: -0.5 }}>{t("shop.title")}</Txt>
      {items.length ? (
        <>
          {/* Progression : combien reste-t-il à prendre */}
          <View style={{ gap: 8 }}>
            <Row style={{ justifyContent: "space-between" }}>
              <Text style={{ fontSize: 15, fontWeight: "800", color: todo.length ? C.fg : C.brand }}>{todo.length ? tn("shop.left", todo.length) : t("shop.all_done")}</Text>
              <Text style={{ fontSize: 13.5, fontWeight: "700", color: C.muted, fontVariant: ["tabular-nums"] }}>{done.length}/{items.length}</Text>
            </Row>
            <View style={{ height: 8, borderRadius: 4, backgroundColor: C.tint2, overflow: "hidden" }}>
              <View style={{ height: 8, borderRadius: 4, width: `${(done.length / items.length) * 100}%`, backgroundColor: C.brand }} />
            </View>
          </View>
          {todo.length ? card(todo) : null}
          {done.length ? (
            <View style={{ gap: 8 }}>
              {card(done)}
              <Pressable onPress={() => { haptic.tap(); clearDone(); }} accessibilityRole="button" style={{ alignSelf: "center", padding: 8 }}>
                <Text style={{ color: C.muted, fontWeight: "700", textDecorationLine: "underline" }}>{t("shop.clear_done")}</Text>
              </Pressable>
            </View>
          ) : null}
        </>
      ) : <EmptyState compact pose="star" size={96} title={t("shop.empty_t")} text={t("shop.empty_p")} />}
      {/* Ajout rapide depuis les favoris */}
      {favs.length ? (
        <View style={{ gap: 10 }}>
          <Text style={{ fontSize: 13, fontWeight: "800", letterSpacing: 0.6, color: C.muted, textTransform: "uppercase", textAlign: dir().ta }}>{t("shop.from_favs")}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20 }} contentContainerStyle={{ paddingHorizontal: 20, gap: 10, flexDirection: dir().row }}>
            {favs.map((e) => (
              <Pressable key={e.code} onPress={() => { haptic.success(); toggleShopList(e.p); }} accessibilityRole="button" accessibilityLabel={`${t("shop.add")} : ${nameOf(e.p)}`}
                style={({ pressed }) => [{ width: 104, padding: 8, gap: 6, borderRadius: R.lg, backgroundColor: C.surface, alignItems: "center", transform: [{ scale: pressed ? 0.95 : 1 }] }, lift()]}>
                <View>
                  <Thumb p={e.p} size={64} radius={14} />
                  <View style={{ position: "absolute", bottom: -6, [dir().rtl ? "left" : "right"]: -6, width: 24, height: 24, borderRadius: 12, backgroundColor: C.brand, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: C.surface }}>
                    <Glyph paths='<path d="M12 6v12M6 12h12"/>' size={13} color="#fff" width={3} />
                  </View>
                </View>
                <Text numberOfLines={2} style={{ fontSize: 12, lineHeight: 15, fontWeight: "700", color: C.fg, textAlign: "center" }}>{nameOf(e.p)}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      ) : null}
    </NavScroll>
  );
}
