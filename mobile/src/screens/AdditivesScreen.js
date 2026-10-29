// Guide des additifs : codes E (origine, halal selon vos réglages, risque santé) et ingrédients surveillés.
// Même présentation que la version web.
import React, { useMemo, useState } from "react";
import { View, Text, FlatList, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Txt, Muted, Row } from "../components/ui";
import { PageHead, SearchBox, Chip, ChipRow, Segmented } from "../components/Controls";
import { AdditiveRow, additiveRow, eFunctions } from "../components/Additives";
import { Pill2 } from "../components/SheetParts";
import { C, R, SEV_COLORS, dir, lift } from "../theme";
import { t, tn, getLang } from "../i18n";
import { TEXT_RULES, TOPIC_OF, SEVERITY_OF, BEAUTY_RULES } from "../core";
import { getSettings, getHistory } from "../storage";
import DB from "../../../public/data/additives.json";

const norm = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const PAGE = 60;

// Ingrédients surveillés pour le halal (porc, alcool, gélatine…), selon vos réglages
function ingredientItems() {
  const topics = getSettings().topics;
  const level = (id, base) => (TOPIC_OF[id] ? SEVERITY_OF[topics[TOPIC_OF[id]]] : base);
  return [...TEXT_RULES.map((r) => ({ ...r, beauty: false })), ...BEAUTY_RULES.map((r) => ({ ...r, beauty: true }))].map((r) => ({
    key: (r.beauty ? "b" : "r") + r.id, name: t(`flag.${r.id}.label`), reason: t(`flag.${r.id}.reason`), level: level(r.id, r.severity), topic: TOPIC_OF[r.id], beauty: r.beauty,
  })).sort((a, b) => ({ haram: 0, mashbouh: 1, info: 2 }[a.level] - { haram: 0, mashbouh: 1, info: 2 }[b.level]));
}

function myCounts() {
  const m = new Map();
  for (const e of getHistory()) for (const tag of (e.p.raw && e.p.raw.additives_tags) || []) {
    const k = String(tag).replace(/^\w+:/, "").toLowerCase();
    m.set(k, (m.get(k) || 0) + 1);
  }
  return m;
}

export default function AdditivesScreen({ onGotoSettings }) {
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState("codes");
  const [filter, setFilter] = useState("all");
  const [fn, setFn] = useState("");
  const [q, setQ] = useState("");
  const [shown, setShown] = useState(PAGE);
  const lang = getLang();
  const rows = useMemo(() => {
    const mine = myCounts();
    return DB.items.map((it) => ({ ...additiveRow(it.e.toLowerCase()), mine: mine.get(it.e.toLowerCase()) || 0 })).filter((r) => r.it);
  }, [lang, getSettings().topics]);
  const FILTERS = {
    all: () => true,
    mine: (r) => r.mine > 0,
    halal: (r) => r.halal.level === "haram" || r.halal.level === "mashbouh",
    health: (r) => !!r.health.level,
    animal: (r) => r.origin === "animal" || r.origin === "animal_product" || r.origin === "maybe",
  };
  const fnCount = new Map();
  rows.forEach((r) => r.fns.forEach((k) => fnCount.set(k, (fnCount.get(k) || 0) + 1)));
  const fns = [...fnCount].sort((a, b) => b[1] - a[1]).map(([k]) => k).slice(0, 10);
  const nq = norm(q), qCode = nq.replace(/^e-?/, "");
  const list = rows.filter((r) => FILTERS[filter](r) && (!fn || r.fns.includes(fn)) &&
    (!nq || r.code === "e" + qCode || (r.code.startsWith("e" + qCode) && /^\d/.test(qCode)) || norm(r.name + " " + Object.values(r.it.n).join(" ")).includes(nq)));
  if (filter === "mine") list.sort((a, b) => b.mine - a.mine);

  const ingr = mode === "ingr" ? ingredientItems().filter((it) => !nq || norm(it.name + " " + it.reason).includes(nq)) : [];
  const topics = getSettings().topics;

  const header = (
    <View style={{ gap: 14, paddingBottom: 10 }}>
      <PageHead title={t("add.title")} sub={t("add.sub")} />
      <Segmented items={[["codes", t("add.mode_e")], ["ingr", t("add.mode_ingr")]]} value={mode} onChange={(m) => { setMode(m); setShown(PAGE); }} />
      <SearchBox value={q} onChangeText={(v) => { setQ(v); setShown(PAGE); }} placeholder={t("add.placeholder")} />
      {mode === "codes" ? (
        <View style={{ gap: 6 }}>
          <ChipRow>
            {Object.keys(FILTERS).filter((id) => id !== "mine" || rows.some((r) => r.mine)).map((id) => (
              <Chip key={id} text={t(`add.ef.${id}`)} n={rows.filter(FILTERS[id]).length} on={filter === id} onPress={() => { setFilter(id); setShown(PAGE); }} />
            ))}
          </ChipRow>
          <ChipRow>
            <Chip text={t("add.fn_all")} on={!fn} onPress={() => setFn("")} />
            {fns.map((k) => <Chip key={k} text={t(`fn.${k}`)} on={fn === k} onPress={() => setFn(fn === k ? "" : k)} />)}
          </ChipRow>
          <Muted style={{ fontSize: 13.5, marginTop: 4 }}>{tn("add.count", list.length)}</Muted>
        </View>
      ) : null}
    </View>
  );

  const card = { backgroundColor: C.surface, paddingHorizontal: 14, ...lift() };
  if (mode === "ingr") {
    return (
      <FlatList data={ingr} keyExtractor={(it) => it.key} ListHeaderComponent={header}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: insets.top + 16, paddingBottom: insets.bottom + 120, gap: 10 }}
        style={{ backgroundColor: C.bg }} keyboardShouldPersistTaps="handled"
        renderItem={({ item: it }) => (
          <View style={[{ backgroundColor: C.surface, borderRadius: R.lg, padding: 14, gap: 6 }, lift()]}>
            <Row style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
              <Txt style={{ fontWeight: "800", flex: 1 }}>{it.name}</Txt>
              <Pill2 text={t(`sev.${it.level}`)} colors={SEV_COLORS[it.level] || SEV_COLORS.info} />
            </Row>
            <Muted style={{ fontSize: 14, lineHeight: 20 }}>{it.reason}</Muted>
            {it.topic ? (
              <Text style={{ fontSize: 13, color: C.muted, textAlign: dir().ta }}>
                {t("add.your_setting", { d: t(`decision.${topics[it.topic]}`).toLowerCase() })} · <Text onPress={onGotoSettings} style={{ color: C.brand, fontWeight: "700", textDecorationLine: "underline" }}>{t("detail.change_setting")}</Text>
              </Text>
            ) : null}
          </View>
        )}
      />
    );
  }
  const data = list.slice(0, shown);
  return (
    <FlatList data={data} keyExtractor={(r) => r.code} ListHeaderComponent={header} initialNumToRender={20} windowSize={9}
      contentContainerStyle={{ paddingHorizontal: 20, paddingTop: insets.top + 16, paddingBottom: insets.bottom + 120 }}
      style={{ backgroundColor: C.bg }} keyboardShouldPersistTaps="handled"
      renderItem={({ item: r, index }) => (
        <View style={[card, index === 0 ? { borderTopLeftRadius: R.lg, borderTopRightRadius: R.lg, paddingTop: 2 } : null, index === data.length - 1 ? { borderBottomLeftRadius: R.lg, borderBottomRightRadius: R.lg, paddingBottom: 2 } : null]}>
          <AdditiveRow r={r} first={index === 0} onGotoSettings={onGotoSettings} />
        </View>
      )}
      ListEmptyComponent={<View style={{ alignItems: "center", gap: 6, paddingVertical: 30 }}><Text style={{ fontWeight: "800", fontSize: 17, color: C.fg }}>{t("add.empty.t")}</Text><Muted style={{ textAlign: "center" }}>{t("add.e_none")}</Muted></View>}
      ListFooterComponent={list.length > shown ? (
        <Pressable onPress={() => setShown(shown + PAGE)} style={{ marginTop: 14, paddingVertical: 14, borderRadius: R.md, backgroundColor: C.tint2, alignItems: "center" }}>
          <Text style={{ fontWeight: "700", color: C.fg }}>{t("add.more", { n: list.length - shown })}</Text>
        </Pressable>
      ) : list.length ? <Muted style={{ fontSize: 12.5, marginTop: 14, textAlign: "center" }}>{t("add.e_source")}</Muted> : null}
    />
  );
}
