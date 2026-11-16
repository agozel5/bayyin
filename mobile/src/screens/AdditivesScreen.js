// Guide des additifs : codes E (origine, halal selon vos réglages, risque santé) et ingrédients surveillés.
// Même présentation que la version web.
import React, { useMemo, useState } from "react";
import { View, FlatList, Pressable, ScrollView } from "react-native";
import { Text } from "../components/Text";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Txt, Muted } from "../components/ui";
import { useNavBar } from "../components/NavBar";
import { PageHead, SearchBox, Chip, ChipRow, Segmented } from "../components/Controls";
import { AdditiveRow, additiveRow } from "../components/Additives";
import { Pill2 } from "../components/SheetParts";
import { Glyph, Tile } from "../components/Art";
import { CountUp } from "../components/Fx";
import { Collapse, Chevron } from "../components/Reveal";
import { haptic } from "../motion";
import { C, R, SEV_COLORS, dir, lift, isDark } from "../theme";
import { t, tn, getLang } from "../i18n";
import { TEXT_RULES, TOPIC_OF, SEVERITY_OF, BEAUTY_RULES } from "../core";
import { getSettings, getHistory } from "../storage";
import DB from "../../../public/data/additives.json";

const norm = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const PAGE = 60;
// Compteurs de la vue d'ensemble : [filtre, couleur, icône]
const TILES = [
  ["halal", "#D9820F", '<path d="M12 3l7 3v5.5c0 4.3-2.9 7.3-7 9.5-4.1-2.2-7-5.2-7-9.5V6z"/><path d="M12 8.500v4M12 15.500v.1"/>'],
  ["health", "#D0486B", '<path d="M12 20s-7-4.4-7-9.5A4 4 0 0 1 12 8a4 4 0 0 1 7 2.5C19 15.6 12 20 12 20z"/>'],
  ["animal", "#8A5BD6", '<circle cx="7" cy="10" r="1.8"/><circle cx="11" cy="6.5" r="1.8"/><circle cx="16" cy="7.5" r="1.8"/><circle cx="18.5" cy="12" r="1.8"/><path d="M8.5 17.500c0-2.5 2-4.5 4.2-4.500s4.3 2 4.3 4.500c0 1.4-1.1 2-2.3 2-.9 0-1.4-.4-2-.4s-1.2.4-2 .4c-1.2 0-2.2-.6-2.2-2z"/>'],
  ["mine", "#14805A", '<path d="M5 8h14l-1.5 11a1 1 0 0 1-1 .9H7.500a1 1 0 0 1-1-.9z"/><path d="M9 8l3-4 3 4"/>'],
];
const ALL_TILE = ["all", "#3F79B5", '<path d="M8 6h12M8 12h12M8 18h12M4 6h.1M4 12h.1M4 18h.1"/>'];

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
  const nav = useNavBar(t("add.title"));
  const [mode, setMode] = useState("codes");
  const [filter, setFilter] = useState("all");
  const [fn, setFn] = useState("");
  const [q, setQ] = useState("");
  const [shown, setShown] = useState(PAGE);
    const [ingrF, setIngrF] = useState("all");
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
  const fns = [...fnCount].sort((a, b) => b[1] - a[1]).map(([k]) => k);
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
        <View style={{ gap: 12 }}>
          {/* Vue d'ensemble : quatre compteurs, chacun filtre la liste (un second toucher revient à « Tous ») */}
          <View style={{ flexDirection: dir().row, flexWrap: "wrap", gap: 10 }}>
            {TILES.filter(([id]) => id !== "mine" || rows.some((r) => r.mine)).concat(rows.some((r) => r.mine) ? [] : [ALL_TILE]).map(([id, color, paths]) => {
              const on = filter === id && id !== "all";
              return (
                <Pressable key={id} onPress={() => { haptic.tap(); setFilter(on ? "all" : id); setShown(PAGE); }} accessibilityRole="button" accessibilityState={{ selected: on }}
                  accessibilityLabel={`${t(`add.ef.${id}`)}, ${rows.filter(FILTERS[id]).length}`}
                  style={({ pressed }) => [{ flexBasis: "46%", flexGrow: 1, padding: 12, gap: 8, borderRadius: R.lg, borderWidth: 1.5, borderColor: on ? color : "transparent", backgroundColor: on ? color + (isDark() ? "26" : "14") : C.surface, transform: [{ scale: pressed ? 0.97 : 1 }] }, on ? null : lift()]}>
                  <View style={{ flexDirection: dir().row, alignItems: "center", justifyContent: "space-between" }}>
                    <Tile color={color} paths={paths} size={34} />
                    <CountUp to={rows.filter(FILTERS[id]).length} duration={700} maxFontSizeMultiplier={1.2} style={{ fontSize: 26, fontWeight: "900", letterSpacing: -0.6, color: C.fg, fontVariant: ["tabular-nums"] }} />
                  </View>
                  <Text numberOfLines={2} style={{ fontSize: 13, lineHeight: 17, fontWeight: "700", color: on ? C.fg : C.muted, textAlign: dir().ta }}>{t(`add.ef.${id}`)}</Text>
                </Pressable>
              );
            })}
          </View>
          {/* Fonctions : une rangée de pastilles à faire défiler */}
          <ChipRow>
            <Chip text={t("add.fn_all")} on={!fn} onPress={() => { setFn(""); setShown(PAGE); }} />
            {fns.map((k) => <Chip key={k} text={t(`fn.${k}`)} n={fnCount.get(k)} on={fn === k} onPress={() => { setFn(fn === k ? "" : k); setShown(PAGE); }} />)}
          </ChipRow>
          <View style={{ flexDirection: dir().row, alignItems: "center", gap: 8, paddingHorizontal: 4 }}>
            <Text style={{ fontSize: 13, fontWeight: "800", letterSpacing: 0.6, color: C.muted, textTransform: "uppercase" }}>{tn("add.count", list.length)}</Text>
            {filter !== "all" || fn ? (
              <Pressable onPress={() => { haptic.tap(); setFilter("all"); setFn(""); setShown(PAGE); }} hitSlop={8} accessibilityRole="button" accessibilityLabel={t("add.ef.all")}
                style={{ flexDirection: dir().row, alignItems: "center", gap: 4, paddingHorizontal: 9, paddingVertical: 3, borderRadius: 99, backgroundColor: C.tint2 }}>
                <Text style={{ fontSize: 12, fontWeight: "800", color: C.fg }}>{t("add.ef.all")}</Text>
                <Glyph name="cross" size={11} color={C.muted} />
              </Pressable>
            ) : null}
          </View>
        </View>
      ) : null}
    </View>
  );

  if (mode === "ingr") {
    // Comme sur le site : filtres par niveau, groupes repliés (ouverts par une recherche ou un filtre), lignes dépliables
    const all = ingredientItems();
    const filtered = ingr.filter((it) => ingrF === "all" || it.level === ingrF);
    const groups = [...new Set(filtered.map((it) => (it.beauty ? t("kind.beauty") : t("add.group_ingredients"))))];
    const forceOpen = !!nq || ingrF !== "all" || groups.length === 1;
    const sevPill = (lv, n) => <Pill2 key={lv} text={`${t(`sev.${lv}`)}${n != null ? ` · ${n}` : ""}`} colors={SEV_COLORS[lv] || SEV_COLORS.info} />;
    return (
      <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView {...nav.scroll} style={{ backgroundColor: C.bg }} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 20, paddingTop: insets.top + 16, paddingBottom: insets.bottom + 120, gap: 12 }}>
        {header}
        <ChipRow>
          {[["all", "add.f.all"], ["haram", "sev.haram"], ["mashbouh", "sev.mashbouh"], ["info", "sev.info"]].map(([id, key]) => (
            <Chip key={id} text={t(key)} n={id === "all" ? all.length : all.filter((i) => i.level === id).length} on={ingrF === id} onPress={() => setIngrF(id)} />
          ))}
        </ChipRow>
        {groups.length ? groups.map((g) => {
          const items = filtered.filter((it) => (it.beauty ? t("kind.beauty") : t("add.group_ingredients")) === g);
          const counts = ["haram", "mashbouh", "info"].map((lv) => [lv, items.filter((i) => i.level === lv).length]).filter(([, n]) => n);
          return (
            <View key={g + forceOpen} style={[{ backgroundColor: C.surface, borderRadius: R.lg, overflow: "hidden" }, lift()]}>
              <Collapse initial={forceOpen} head={(open) => (
                <View style={{ flexDirection: dir().row, alignItems: "center", gap: 10, padding: 14 }}>
                  <View style={{ flex: 1, gap: 6 }}>
                    <Txt style={{ fontWeight: "800", fontSize: 16 }}>{g}</Txt>
                    <View style={{ flexDirection: dir().row, flexWrap: "wrap", gap: 6 }}>{counts.map(([lv, n]) => sevPill(lv, n))}</View>
                  </View>
                  <Chevron open={open} />
                </View>
              )}>
                {items.map((it) => (
                  <View key={it.key} style={{ borderTopWidth: 0.5, borderTopColor: C.line, paddingHorizontal: 14 }}>
                    <Collapse head={(open) => (
                      <View style={{ flexDirection: dir().row, alignItems: "center", gap: 10, paddingVertical: 12 }}>
                        <Txt style={{ flex: 1, fontWeight: "700", fontSize: 15 }}>{it.name}</Txt>
                        {sevPill(it.level)}
                        <Chevron open={open} />
                      </View>
                    )}>
                      <View style={{ gap: 6, paddingBottom: 12 }}>
                        <Muted style={{ fontSize: 14, lineHeight: 20 }}>{it.reason}</Muted>
                        {it.topic ? (
                          <Text style={{ fontSize: 13, color: C.muted, textAlign: dir().ta }}>
                            {t("add.your_setting", { d: t(`decision.${topics[it.topic]}`).toLowerCase() })} · <Text onPress={onGotoSettings} style={{ color: C.brand, fontWeight: "700", textDecorationLine: "underline" }}>{t("detail.change_setting")}</Text>
                          </Text>
                        ) : null}
                      </View>
                    </Collapse>
                  </View>
                ))}
              </Collapse>
            </View>
          );
        }) : <View style={{ alignItems: "center", gap: 6, paddingVertical: 30 }}><Text style={{ fontWeight: "800", fontSize: 17, color: C.fg }}>{t("add.empty.t")}</Text><Muted style={{ textAlign: "center" }}>{t("add.empty_halal")}</Muted></View>}
      </ScrollView>
      {nav.bar}
      </View>
    );
  }
  const data = list.slice(0, shown);
  return (
    <>
    <View style={{ flex: 1, backgroundColor: C.bg }}>
    <FlatList {...nav.scroll} data={data} keyExtractor={(r) => r.code} ListHeaderComponent={header} initialNumToRender={20} windowSize={9}
      contentContainerStyle={{ paddingHorizontal: 20, paddingTop: insets.top + 16, paddingBottom: insets.bottom + 120 }}
      style={{ backgroundColor: C.bg }} keyboardShouldPersistTaps="handled"
      renderItem={({ item: r }) => <AdditiveRow card r={r} onGotoSettings={onGotoSettings} />}
      ListEmptyComponent={<View style={{ alignItems: "center", gap: 6, paddingVertical: 30 }}><Text style={{ fontWeight: "800", fontSize: 17, color: C.fg }}>{t("add.empty.t")}</Text><Muted style={{ textAlign: "center" }}>{t("add.e_none")}</Muted></View>}
      ListFooterComponent={list.length > shown ? (
        <Pressable onPress={() => setShown(shown + PAGE)} accessibilityRole="button" style={{ marginTop: 14, paddingVertical: 14, borderRadius: R.md, backgroundColor: C.tint2, alignItems: "center" }}>
          <Text style={{ fontWeight: "700", color: C.fg }}>{t("add.more", { n: list.length - shown })}</Text>
        </Pressable>
      ) : list.length ? <Muted style={{ fontSize: 12.5, marginTop: 14, textAlign: "center" }}>{t("add.e_source")}</Muted> : null}
    />
    {nav.bar}
    </View>
    </>
  );
}
