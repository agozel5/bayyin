// Panier du mode courses : verdict de chaque produit, note santé moyenne, alertes du profil.
import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Txt, Muted, Row, Btn, Skeleton } from "../components/ui";
import { Art, Glyph, Tile } from "../components/Art";
import { ListRow } from "../components/Cards";
import { C, R, dir, lift, GRADE_COLORS, STATUS_COLORS, ALERT_COLORS } from "../theme";
import { t, tn } from "../i18n";
import { fetchProduct } from "../api";
import { getEntry } from "../storage";
import { verdictOf, profileOf, scoreOf } from "../view";
import { HEALTH_GRADES } from "../core";
import { getBasket, onBasket, setBasketProduct, clearBasket, removeFromBasket } from "../basket";
import { haptic } from "../motion";
import { mascot } from "../../../public/lib/mascot.js";

const gradeOf = (n) => (HEALTH_GRADES || []).find((g) => n >= g.min) || null;

export default function BasketScreen({ onClose, onOpen, onScan, toast }) {
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState(getBasket());
  useEffect(() => onBasket((l) => setItems([...l])), []);
  // Fiches manquantes : chargées une à une
  useEffect(() => {
    items.filter((x) => !x.p).forEach((x) => {
      const saved = getEntry(x.code);
      if (saved) return setBasketProduct(x.code, saved.p);
      fetchProduct(x.code).then((p) => p && setBasketProduct(x.code, p)).catch(() => {});
    });
  }, [items.length]);
  const ready = items.filter((x) => x.p);
  const scores = ready.map((x) => scoreOf(x.p)).filter(Boolean).map((s) => s.score);
  const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
  const g = avg !== null ? gradeOf(avg) : null;
  const alerts = ready.filter((x) => profileOf(x.p).alert === "no" || verdictOf(x.p).status === "haram").length;
  const counts = { ok: 0, doubt: 0, bad: 0 };
  ready.forEach((x) => { const st = verdictOf(x.p).status; if (st === "haram") counts.bad++; else if (st === "mashbouh" || st === "inconnu") counts.doubt++; else counts.ok++; });

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: insets.top + 12, paddingBottom: insets.bottom + 40, gap: 16 }}>
      <Row gap={6}>
        <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel={t("sheet.back")} style={{ padding: 4, transform: [{ scaleX: dir().rtl ? -1 : 1 }] }}>
          <Glyph paths='<path d="M15 5l-7 7 7 7"/>' size={24} color={C.fg} width={2.2} />
        </Pressable>
        <Text accessibilityRole="header" style={{ flex: 1, fontSize: 24, fontWeight: "800", letterSpacing: -0.4, color: C.fg, textAlign: dir().ta }}>{t("basket.title")}</Text>
      </Row>
      {!items.length ? (
        <View style={[{ alignItems: "center", gap: 10, padding: 24, borderRadius: R.xl, backgroundColor: C.surface }, lift()]}>
          <Art xml={mascot("empty", { size: 120 })} size={120} />
          <Txt style={{ fontWeight: "800", fontSize: 18 }}>{t("basket.empty.t")}</Txt>
          <Muted style={{ textAlign: "center" }}>{t("basket.empty.p")}</Muted>
          <Btn title={t("basket.start")} icon="scan" onPress={onScan} style={{ alignSelf: "stretch" }} />
        </View>
      ) : (
        <>
          <View style={[{ borderRadius: R.xl, backgroundColor: C.surface, padding: 16, gap: 14 }, lift()]}>
            <Row gap={14}>
              <Tile color="#1FA597" paths='<path d="M3 4h2l2.5 11h11L21 7H7"/><circle cx="9.5" cy="19.5" r="1.5"/><circle cx="17" cy="19.5" r="1.5"/>' size={44} />
              <View style={{ flex: 1 }}>
                <Txt style={{ fontWeight: "800", fontSize: 18 }}>{tn("basket.count", items.length)}</Txt>
                {alerts ? <Text style={{ color: ALERT_COLORS.no[0], fontWeight: "800", fontSize: 13.5, textAlign: dir().ta }}>{tn("basket.alerts", alerts)}</Text> : null}
              </View>
              {avg !== null ? (
                <View style={{ alignItems: "center" }}>
                  <Text style={{ fontSize: 24, fontWeight: "800", color: GRADE_COLORS[g && g.id] || C.fg }}>{avg}<Text style={{ fontSize: 12, color: C.muted }}>/100</Text></Text>
                  <Text style={{ fontSize: 11.5, color: C.muted, fontWeight: "700" }}>{t("basket.avg_t")}</Text>
                </View>
              ) : null}
            </Row>
            {ready.length ? (
              <View style={{ flexDirection: dir().row, height: 8, gap: 3 }}>
                {[["ok", STATUS_COLORS.halal_certifie[0]], ["doubt", STATUS_COLORS.mashbouh[0]], ["bad", STATUS_COLORS.haram[0]]].filter(([k]) => counts[k]).map(([k, c]) => <View key={k} style={{ flex: counts[k], borderRadius: 4, backgroundColor: c }} />)}
              </View>
            ) : null}
          </View>
          <View style={[{ backgroundColor: C.surface, borderRadius: R.lg, overflow: "hidden" }, lift()]}>
            {items.map((x, i) => x.p ? (
              <ListRow key={x.code} p={x.p} first={i === 0} onPress={() => onOpen(x.code, { product: x.p })} />
            ) : (
              <Row key={x.code} gap={12} style={{ padding: 14, borderTopWidth: i ? 0.5 : 0, borderTopColor: C.line }}>
                <Skeleton width={54} height={54} radius={14} /><View style={{ flex: 1, gap: 6 }}><Skeleton height={14} /><Skeleton width="50%" height={12} /></View>
              </Row>
            ))}
          </View>
          <Btn title={t("basket.continue")} icon="scan" onPress={onScan} />
          <Pressable onPress={() => { haptic.warn(); clearBasket(); toast && toast(t("basket.cleared")); }} accessibilityRole="button" style={{ alignItems: "center", paddingVertical: 10 }}>
            <Text style={{ color: STATUS_COLORS.haram[0], fontWeight: "700", fontSize: 15 }}>{t("basket.clear")}</Text>
          </Pressable>
        </>
      )}
    </ScrollView>
  );
}
