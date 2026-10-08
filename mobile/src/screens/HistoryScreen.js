// Historique : statistiques, filtres par statut, favoris.
import React, { useState } from "react";
import { View, Text, Pressable } from "react-native";
import Icon from "../components/Icon";
import { Txt, H1, Muted, Row, Btn, ProductRow } from "../components/ui";
import Screen from "../components/Screen";
import { Chip } from "./SearchScreen";
import { C, R, STATUS_COLORS, dir } from "../theme";
import { t } from "../i18n";
import { getHistory, clearHistory } from "../storage";
import { verdictOf, relTime, S } from "../view";
import { haptic } from "../motion";

const STATUS_ORDER = ["haram", "mashbouh", "halal_certifie", "halal_probable", "inconnu"];
const FILTERS = [
  { id: "all", test: () => true },
  { id: "fav", test: (e) => e.fav },
  { id: "halal", test: (e) => verdictOf(e.p).status.startsWith("halal") },
  { id: "doubt", test: (e) => verdictOf(e.p).status === "mashbouh" },
  { id: "haram", test: (e) => verdictOf(e.p).status === "haram" },
];

export default function HistoryScreen({ onOpen, onScan, toast }) {
  const [filter, setFilter] = useState("all");
  const [confirm, setConfirm] = useState(false);
  const all = getHistory();

  if (!all.length) {
    return (
      <Screen>
        <H1>{t("history.title")}</H1>
        <View style={{ alignItems: "center", gap: 10, paddingVertical: 40 }}>
          <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: C.tint, alignItems: "center", justifyContent: "center" }}>
            <Icon name="history" size={34} color={C.faint} />
          </View>
          <Text style={{ fontSize: 19, fontWeight: "800", color: C.fg, textAlign: "center" }}>{t("history.empty.t")}</Text>
          <Text style={{ fontSize: 15, lineHeight: 22, color: C.muted, textAlign: "center" }}>{t("history.empty.p")}</Text>
          <Btn title={t("home.scan")} icon="scan" onPress={onScan} style={{ marginTop: 8 }} />
        </View>
      </Screen>
    );
  }

  const counts = {};
  all.forEach((e) => {
    const st = verdictOf(e.p).status;
    counts[st] = (counts[st] || 0) + 1;
  });
  const seen = STATUS_ORDER.filter((s) => counts[s]);
  const shown = all.filter(FILTERS.find((f) => f.id === filter).test);

  return (
    <Screen>
      <View style={{ gap: 6 }}>
        <H1>{t("history.title")}</H1>
        <Muted>{t("history.sub")}</Muted>
      </View>

      <View style={{ backgroundColor: C.tint, borderRadius: R.lg, padding: 16, gap: 12 }}>
        <Row gap={8} style={{ alignItems: "baseline" }}>
          <Text style={{ fontSize: 34, fontWeight: "800", color: C.fg }}>{all.length}</Text>
          <Muted>{t(all.length === 1 ? "history.count_one" : "history.count_other")}</Muted>
        </Row>
        <View
          accessible
          accessibilityLabel={seen.map((s) => `${counts[s]} ${S(s, "label")}`).join(", ")}
          style={{ flexDirection: dir().row, height: 12, borderRadius: 6, overflow: "hidden", gap: 2 }}
        >
          {seen.map((s) => (
            <View key={s} style={{ flex: counts[s], backgroundColor: STATUS_COLORS[s][0] }} />
          ))}
        </View>
        <Row gap={14} style={{ flexWrap: "wrap" }}>
          {seen.map((s) => (
            <Row key={s} gap={6}>
              <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: STATUS_COLORS[s][0] }} />
              <Text style={{ fontSize: 13, color: C.muted, fontWeight: "600" }}>{counts[s]} {S(s, "label")}</Text>
            </Row>
          ))}
        </Row>
      </View>

      <Row gap={8} style={{ flexWrap: "wrap" }}>
        {FILTERS.map((f) => (
          <Chip key={f.id} text={t(`history.f.${f.id}`)} n={all.filter(f.test).length} on={filter === f.id} onPress={() => setFilter(f.id)} />
        ))}
      </Row>

      <View>
        {shown.length ? (
          shown.map((e) => <ProductRow key={e.code} p={e.p} fav={e.fav} when={relTime(e.at)} onPress={() => onOpen(e.code)} />)
        ) : (
          <Muted style={{ textAlign: "center", paddingVertical: 24 }}>{t(filter === "fav" ? "history.empty_fav" : "history.empty_cat")}</Muted>
        )}
      </View>

      {confirm ? (
        <Row gap={16} style={{ justifyContent: "center", flexWrap: "wrap" }}>
          <Txt style={{ fontWeight: "700" }}>{t("history.clear_q")}</Txt>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              haptic.warn();
              clearHistory();
              setConfirm(false);
              toast(t("history.cleared"));
            }}
          >
            <Text style={{ color: STATUS_COLORS.haram[0], fontWeight: "800" }}>{t("history.clear_yes")}</Text>
          </Pressable>
          <Pressable onPress={() => setConfirm(false)} accessibilityRole="button">
            <Text style={{ color: C.muted, fontWeight: "700" }}>{t("history.clear_no")}</Text>
          </Pressable>
        </Row>
      ) : (
        <Pressable onPress={() => setConfirm(true)} accessibilityRole="button" style={{ alignSelf: "center", padding: 8 }}>
          <Text style={{ color: C.muted, fontWeight: "700", textDecorationLine: "underline" }}>{t("history.clear")}</Text>
        </Pressable>
      )}
    </Screen>
  );
}
