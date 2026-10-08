// Guide des additifs et ingrédients : liste halal (selon vos réglages) et liste santé.
import React, { useState } from "react";
import { View, Text, Pressable } from "react-native";
import { Txt, H1, Muted, Label, Row, Pill } from "../components/ui";
import Screen from "../components/Screen";
import { Chip, SearchField } from "./SearchScreen";
import { C, R, SEV_COLORS, RISK_COLORS, dir } from "../theme";
import { t } from "../i18n";
import { ADDITIVES, TEXT_RULES, TOPIC_OF, SEVERITY_OF, ADDITIVE_RISK } from "../core";
import { getSettings } from "../storage";

const norm = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, "");

function halalItems() {
  const topics = getSettings().topics;
  const level = (id, base) => (TOPIC_OF[id] ? SEVERITY_OF[topics[TOPIC_OF[id]]] : base);
  const items = TEXT_RULES.map((r) => ({
    key: "r" + r.id, group: t("add.group_ingredients"), name: t(`flag.${r.id}.label`), codes: [], reason: t(`flag.${r.id}.reason`),
    level: level(r.id, r.severity), topic: TOPIC_OF[r.id],
  }));
  const fatty = [];
  for (const [code, a] of Object.entries(ADDITIVES)) {
    if (a.group === "gras") {
      fatty.push(code.toUpperCase());
      continue;
    }
    items.push({
      key: "a" + code, group: t("add.group_additives"), name: `${code.toUpperCase()} · ${t(`flag.${code}.label`)}`, codes: [],
      reason: t(`flag.${code}.reason`), level: level(code, a.severity), topic: TOPIC_OF[code],
    });
  }
  items.push({ key: "fatty", group: t("add.group_additives"), name: t("add.fatty"), codes: fatty, reason: t("flag.fatty.reason"), level: SEVERITY_OF[topics.derives], topic: "derives" });
  return items;
}

function healthItems() {
  const groups = new Map();
  for (const [code, a] of Object.entries(ADDITIVE_RISK)) {
    if (!groups.has(a.key)) groups.set(a.key, { level: a.level, key: a.key, members: [] });
    groups.get(a.key).members.push(code);
  }
  return [...groups.values()].map((g) => ({
    key: g.key, group: t(`risk.${g.level}`), name: g.members.map((c) => t(`addname.${c}`)).join(", "),
    codes: g.members.map((c) => c.toUpperCase()), reason: t(`risk.reason.${g.key}`), level: g.level,
  }));
}

const MODES = {
  halal: {
    items: halalItems,
    filters: [["all", "add.f.all"], ["haram", "sev.haram"], ["mashbouh", "sev.mashbouh"], ["info", "sev.info"]],
    pill: (it) => <Pill text={t(`sev.${it.level}`)} colors={SEV_COLORS[it.level]} />,
    order: { haram: 0, mashbouh: 1, info: 2 },
  },
  sante: {
    items: healthItems,
    filters: [["all", "add.f.all"], ["eleve", "risk.short.eleve"], ["modere", "risk.short.modere"], ["limite", "risk.short.limite"]],
    pill: (it) => <Pill text={t(`risk.short.${it.level}`)} colors={RISK_COLORS[it.level]} />,
    order: { eleve: 0, modere: 1, limite: 2 },
  },
};

export default function AdditivesScreen({ onGotoSettings }) {
  const [mode, setMode] = useState("halal");
  const [filter, setFilter] = useState("all");
  const [q, setQ] = useState("");
  const m = MODES[mode];
  const all = m.items();
  const nq = norm(q);
  const items = all
    .filter((it) => (filter === "all" || it.level === filter) && (!nq || norm([it.name, it.codes.join(" "), it.reason].join(" ")).includes(nq)))
    .sort((a, b) => m.order[a.level] - m.order[b.level]);
  const groups = [...new Set(items.map((i) => i.group))];
  const topics = getSettings().topics;

  return (
    <Screen>
      <View style={{ gap: 6 }}>
        <H1>{t("add.title")}</H1>
        <Muted>{t("add.sub")}</Muted>
      </View>

      <View style={{ flexDirection: dir().row, backgroundColor: C.tint, borderRadius: R.md, padding: 4 }}>
        {[["halal", "add.mode_halal"], ["sante", "add.mode_health"]].map(([id, key]) => (
          <Pressable
            key={id}
            onPress={() => {
              setMode(id);
              setFilter("all");
            }}
            accessibilityState={{ selected: mode === id }}
            style={{ flex: 1, paddingVertical: 10, borderRadius: R.sm, backgroundColor: mode === id ? "#fff" : "transparent", alignItems: "center" }}
          >
            <Text style={{ fontWeight: "800", color: mode === id ? C.fg : C.muted }}>{t(key)}</Text>
          </Pressable>
        ))}
      </View>

      <SearchField value={q} onChangeText={setQ} placeholder={t("add.placeholder")} />

      <Row gap={8} style={{ flexWrap: "wrap" }}>
        {m.filters.map(([id, key]) => (
          <Chip key={id} text={t(key)} n={id === "all" ? all.length : all.filter((i) => i.level === id).length} on={filter === id} onPress={() => setFilter(id)} />
        ))}
      </Row>

      {items.length ? (
        groups.map((g) => (
          <View key={g} style={{ gap: 10 }}>
            <Label>{g}</Label>
            {items
              .filter((i) => i.group === g)
              .map((it) => (
                <View key={it.key} style={{ backgroundColor: C.tint, borderRadius: R.md, padding: 14, gap: 6 }}>
                  <Row style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
                    <Txt style={{ fontWeight: "800", flex: 1 }}>{it.name}</Txt>
                    {m.pill(it)}
                  </Row>
                  {it.codes.length ? (
                    <Row gap={6} style={{ flexWrap: "wrap" }}>
                      {it.codes.map((c) => (
                        <View key={c} style={{ backgroundColor: "#fff", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
                          <Text style={{ fontSize: 12, fontWeight: "700", color: C.muted }}>{c}</Text>
                        </View>
                      ))}
                    </Row>
                  ) : null}
                  <Muted style={{ fontSize: 14, lineHeight: 20 }}>{it.reason}</Muted>
                  {it.topic ? (
                    <Txt style={{ fontSize: 13, lineHeight: 19, color: C.muted }}>
                      {t("add.your_setting", { d: t(`decision.${topics[it.topic]}`).toLowerCase() })} ·{" "}
                      <Text onPress={onGotoSettings} style={{ color: C.brand, fontWeight: "700" }}>{t("detail.change_setting")}</Text>
                    </Txt>
                  ) : null}
                </View>
              ))}
          </View>
        ))
      ) : (
        <View style={{ alignItems: "center", gap: 6, paddingVertical: 30 }}>
          <Text style={{ fontWeight: "800", fontSize: 17, color: C.fg }}>{t("add.empty.t")}</Text>
          <Muted style={{ textAlign: "center" }}>{t(mode === "halal" ? "add.empty_halal" : "add.empty_health")}</Muted>
        </View>
      )}
    </Screen>
  );
}
