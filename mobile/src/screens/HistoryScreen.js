// Historique : « Mon bilan » (anneau des verdicts, 7 jours, note moyenne), filtres, produits par jour.
import React, { useEffect, useRef, useState } from "react";
import { View, Text, Pressable, Animated, Easing } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { Txt, Muted, Row, FadeIn } from "../components/ui";
import Screen from "../components/Screen";
import { PageHead, Chip, ChipRow } from "../components/Controls";
import { ListRow } from "../components/Cards";
import { Glyph, Art, Tile } from "../components/Art";
import { C, R, STATUS_COLORS, GRADE_COLORS, dir, lift } from "../theme";
import { t, tn, locale } from "../i18n";
import { getHistory, clearHistory, removeFromHistory } from "../storage";
import SwipeRow from "../components/SwipeRow";
import { verdictOf, relTime, S, scoreOf } from "../view";
import { RANK_ART } from "../../../public/lib/rank-art.js";
import { haptic, ms } from "../motion";
import { isPremium, canUse, FREE_HISTORY_DAYS } from "../premium";

const ORDER = ["haram", "mashbouh", "halal_certifie", "halal_probable", "inconnu"];
const FILTERS = [
  { id: "all", test: () => true },
  { id: "fav", test: (e) => e.fav },
  { id: "halal", test: (e) => verdictOf(e.p).status.startsWith("halal") },
  { id: "doubt", test: (e) => verdictOf(e.p).status === "mashbouh" },
  { id: "haram", test: (e) => verdictOf(e.p).status === "haram" },
];
const col = (st) => STATUS_COLORS[st][0];

// Animation d'arrivée (comme le bilan du web) : valeur de 0 à 1, relancée quand `key` change
function useIntro(key, { duration = 900, delay = 100 } = {}) {
  const [k, setK] = useState(ms(1) ? 0 : 1);
  useEffect(() => {
    if (!ms(1)) return setK(1);
    const v = new Animated.Value(0);
    const id = v.addListener(({ value }) => setK(value));
    setK(0);
    Animated.timing(v, { toValue: 1, duration, delay, easing: Easing.bezier(0.3, 0.8, 0.3, 1), useNativeDriver: false }).start();
    return () => { v.removeListener(id); v.stopAnimation(); };
  }, [key]);
  return k;
}

function Donut({ counts, total, size = 118 }) {
  const r = size / 2 - 10, c = 2 * Math.PI * r;
  // Les segments se dessinent l'un après l'autre, le nombre au centre apparaît
  const k = useIntro(`${total}:${ORDER.map((s) => counts[s] || 0).join(",")}`, { duration: 1100 });
  const segs = ORDER.filter((s) => counts[s]);
  let acc = 0;
  const center = Math.min(1, Math.max(0, (k - 0.15) / 0.5));
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} style={{ position: "absolute", transform: [{ rotate: "-90deg" }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={C.tint2} strokeWidth={14} fill="none" />
        {segs.map((s, i) => {
          const len = (counts[s] / total) * c;
          // chaque segment a sa fenêtre de temps (décalée de 14 %)
          const start = Math.min(0.4, i * 0.14), span = 0.6;
          const f = Math.min(1, Math.max(0, (k - start) / span));
          const eased = 1 - Math.pow(1 - f, 3);
          const el = <Circle key={s} cx={size / 2} cy={size / 2} r={r} stroke={col(s)} strokeWidth={14} fill="none" strokeDasharray={`${Math.max((len - 2) * eased, 0.01)} ${c}`} strokeDashoffset={-acc} />;
          acc += len;
          return el;
        })}
      </Svg>
      <View style={{ alignItems: "center", opacity: center, transform: [{ scale: 0.85 + 0.15 * center }] }}>
        <Text style={{ fontSize: 30, fontWeight: "800", color: C.fg }}>{total}</Text>
        <Text style={{ fontSize: 11, color: C.muted, textAlign: "center", width: 70 }}>{t(total === 1 ? "history.count_one" : "history.count_other")}</Text>
      </View>
    </View>
  );
}

// Barre d'un jour : elle pousse depuis le bas, les jours l'un après l'autre
function DayBar({ i, children, h, weeksAgo }) {
  const v = useRef(new Animated.Value(ms(1) ? 0 : 1)).current;
  useEffect(() => {
    if (!ms(1)) return;
    v.setValue(0);
    Animated.timing(v, { toValue: 1, duration: 600, delay: 100 + i * 60, easing: Easing.bezier(0.3, 1.25, 0.5, 1), useNativeDriver: true }).start();
  }, [weeksAgo]);
  return (
    <View style={{ height: 80, width: 18, justifyContent: "flex-end", borderRadius: 6, backgroundColor: C.tint, overflow: "hidden" }}>
      <Animated.View style={{ height: h, borderRadius: 6, overflow: "hidden", transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [80, 0] }) }] }}>
        {children}
      </Animated.View>
    </View>
  );
}

const weekRange = ({ start, end }) => {
  const f = new Intl.DateTimeFormat(locale(), { day: "numeric", month: "short" });
  return `${f.format(start)} – ${f.format(end - 864e5)}`;
};
function weekBounds(weeksAgo) {
  const end = new Date(); end.setHours(0, 0, 0, 0);
  end.setDate(end.getDate() + 1 - 7 * weeksAgo);
  const start = new Date(end); start.setDate(start.getDate() - 7);
  return { start: start.getTime(), end: end.getTime() };
}

function Week({ all, weeksAgo, setWeeksAgo }) {
  const oldest = all.length ? Math.min(...all.map((e) => e.at)) : Date.now();
  const maxWeeks = Math.max(0, Math.ceil((weekBounds(0).start - oldest) / (7 * 864e5)));
  const { start, end } = weekBounds(weeksAgo);
  // Jours du calendrier (et non des tranches de 24 h : le passage à l'heure d'hiver fait un jour de 25 h)
  const days = [...Array(7)].map((_, i) => {
    const d0 = new Date(start); d0.setDate(d0.getDate() + i); const s = d0.getTime();
    const d1 = new Date(start); d1.setDate(d1.getDate() + i + 1); const e1 = d1.getTime();
    const list = all.filter((e) => e.at >= s && e.at < e1);
    const c = {};
    list.forEach((e) => { const st = verdictOf(e.p).status; c[st] = (c[st] || 0) + 1; });
    return { s, n: list.length, c };
  });
  const max = Math.max(1, ...days.map((d) => d.n));
  const n = days.reduce((a, d) => a + d.n, 0);
  const wd = new Intl.DateTimeFormat(locale(), { weekday: "short" });
  let title = t("bilan.week");
  if (weeksAgo) {
    const f = new Intl.DateTimeFormat(locale(), { day: "numeric", month: "short" });
    title = t("bilan.week_range", { range: `${f.format(start)} – ${f.format(end - 864e5)}` });
  }
  const Nav = ({ dirn, off }) => (
    <Pressable disabled={off} onPress={() => { haptic.tap(); setWeeksAgo(weeksAgo + (dirn === "prev" ? 1 : -1)); }} hitSlop={8}
      accessibilityRole="button" accessibilityLabel={t(dirn === "prev" ? "bilan.prev_week" : "bilan.next_week")} style={{ opacity: off ? 0.25 : 1, padding: 4 }}>
      <Glyph name="chev" size={18} color={C.muted} />
    </Pressable>
  );
  return (
    <View style={{ gap: 10, paddingTop: 14, borderTopWidth: 0.5, borderTopColor: C.line }}>
      <Row style={{ justifyContent: "space-between" }}>
        <Text style={{ color: C.muted, fontSize: 13.5, flex: 1, textAlign: dir().ta }}>{title}</Text>
        <Text style={{ color: C.fg, fontWeight: "800", fontSize: 16 }}>{n}</Text>
      </Row>
      <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 4, direction: "ltr" }}>
        <View style={{ transform: [{ scaleX: -1 }] }}><Nav dirn="prev" off={weeksAgo >= maxWeeks} /></View>
        {days.map((d, i) => (
          <View key={d.s} style={{ flex: 1, alignItems: "center", gap: 4 }}>
            <Text style={{ fontSize: 11, color: C.muted, height: 14 }}>{d.n || ""}</Text>
            <DayBar i={i} weeksAgo={weeksAgo} h={d.n ? `${Math.max(10, (d.n / max) * 100)}%` : 3}>
              {d.n ? ORDER.filter((s) => d.c[s]).map((s) => <View key={s} style={{ flex: d.c[s], backgroundColor: col(s) }} />) : <View style={{ flex: 1, backgroundColor: C.tint2 }} />}
            </DayBar>
            <Text style={{ fontSize: 11, color: i === 6 && !weeksAgo ? C.fg : C.muted, fontWeight: i === 6 && !weeksAgo ? "800" : "500" }}>{wd.format(d.s).replace(/\.$/, "")}</Text>
          </View>
        ))}
        <Nav dirn="next" off={weeksAgo === 0} />
      </View>
    </View>
  );
}

function AvgGauge({ avg }) {
  const k = useIntro(avg, { duration: 1000, delay: 250 });
  const g = avg >= 75 ? "excellent" : avg >= 50 ? "bon" : avg >= 25 ? "mediocre" : "mauvais";
  return (
    <View style={{ gap: 8, paddingTop: 14, borderTopWidth: 0.5, borderTopColor: C.line }}>
      <Row style={{ justifyContent: "space-between" }}>
        <Text style={{ color: C.muted, fontSize: 13.5, flex: 1, textAlign: dir().ta }}>{t("bilan.avg")}</Text>
        <Text style={{ color: GRADE_COLORS[g], fontWeight: "800", fontSize: 18 }}>{avg}<Text style={{ fontSize: 12, color: C.muted }}>/100</Text></Text>
        <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 99, backgroundColor: GRADE_COLORS[g] + "33" }}><Text style={{ color: GRADE_COLORS[g], fontWeight: "800", fontSize: 12 }}>{t(`grade.${g}`)}</Text></View>
      </Row>
      <View style={{ direction: "ltr" }}>
        <View style={{ height: 12 }}><View style={{ position: "absolute", left: `${avg * (1 - Math.pow(1 - k, 3))}%`, opacity: Math.min(1, k * 4), marginLeft: -6, width: 0, height: 0, borderLeftWidth: 6, borderRightWidth: 6, borderTopWidth: 8, borderLeftColor: "transparent", borderRightColor: "transparent", borderTopColor: C.fg }} /></View>
        <View style={{ height: 7, overflow: "hidden", width: `${Math.min(100, k * 160)}%` }}><View style={{ flexDirection: "row", gap: 2, height: 7, width: `${100 / Math.max(0.01, Math.min(1, k * 1.6))}%` }}>{["#E2533F", "#F0A23A", "#7DBE45", "#1E8A4C"].map((c) => <View key={c} style={{ flex: 1, backgroundColor: c, borderRadius: 4 }} />)}</View></View>
      </View>
    </View>
  );
}

function groups(entries) {
  const day = (ts) => new Date(ts).setHours(0, 0, 0, 0);
  const today = day(Date.now());
  const bucket = (ts) => { const d = (today - day(ts)) / 864e5; return d < 1 ? "today" : d < 2 ? "yesterday" : d < 7 ? "week" : "older"; };
  return ["today", "yesterday", "week", "older"].map((g) => ({ g, list: entries.filter((e) => bucket(e.at) === g) })).filter((x) => x.list.length);
}

export default function HistoryScreen({ onOpen, onScan, toast }) {
  const [filter, setFilter] = useState("all");
  const [confirm, setConfirm] = useState(false);
  const [weeksAgo, setWeeksAgo] = useState(0);
  const [period, setPeriod] = useState("week");
  // Sans Premium (quand il est en vente) : les 30 derniers jours, favoris compris
  const full = getHistory();
  const all = isPremium() ? full : full.filter((e) => e.fav || e.at > Date.now() - FREE_HISTORY_DAYS * 864e5);
  const hidden = full.length - all.length;

  if (!all.length) {
    return (
      <Screen>
        <PageHead title={t("history.title")} sub={t("history.sub")} />
        <View style={{ alignItems: "center", gap: 10, paddingVertical: 36 }}>
          <View style={{ width: 96, height: 96, borderRadius: 28, backgroundColor: C.artBg, alignItems: "center", justifyContent: "center" }}><Art xml={RANK_ART.mueslis} size={70} /></View>
          <Text style={{ fontSize: 19, fontWeight: "800", color: C.fg, textAlign: "center" }}>{t("history.empty.t")}</Text>
          <Text style={{ fontSize: 15, lineHeight: 22, color: C.muted, textAlign: "center" }}>{t("history.empty.p")}</Text>
          <Pressable onPress={onScan} style={{ marginTop: 8, paddingHorizontal: 22, paddingVertical: 14, borderRadius: R.md, backgroundColor: C.brand }}><Text style={{ color: "#fff", fontWeight: "800", fontSize: 16 }}>{t("home.scan")}</Text></Pressable>
        </View>
      </Screen>
    );
  }

  // Bilan de la semaine (celle choisie dans le graphique) ou depuis le début
  const wb = weekBounds(weeksAgo);
  const inWeek = (e, b) => e.at >= b.start && e.at < b.end;
  const base = period === "week" ? all.filter((e) => inWeek(e, wb)) : all;
  const prevN = all.filter((e) => inWeek(e, weekBounds(weeksAgo + 1))).length;
  const counts = {};
  base.forEach((e) => { const st = verdictOf(e.p).status; counts[st] = (counts[st] || 0) + 1; });
  const scores = base.map((e) => scoreOf(e.p)).filter(Boolean).map((x) => x.score);
  const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
  const okShare = base.length ? Math.round((((counts.halal_certifie || 0) + (counts.halal_probable || 0)) / base.length) * 100) : 0;
  const shown = all.filter(FILTERS.find((f) => f.id === filter).test);

  return (
    <Screen gap={16}>
      <PageHead title={t("history.title")} sub={t("history.sub")} />
      {hidden > 0 ? (
        <Pressable onPress={() => canUse("history")} accessibilityRole="button"
          style={({ pressed }) => [{ flexDirection: dir().row, alignItems: "center", gap: 12, padding: 14, borderRadius: R.lg, backgroundColor: pressed ? C.tint : C.surface }, lift()]}>
          <Tile color="#D9A21B" paths='<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>' size={38} />
          <View style={{ flex: 1, gap: 2 }}>
            <Txt style={{ fontWeight: "800" }}>{tn("premium.history_more", hidden)}</Txt>
            <Muted style={{ fontSize: 13, lineHeight: 18 }}>{t("premium.history_more_p", { days: FREE_HISTORY_DAYS })}</Muted>
          </View>
          <Glyph name="chev" size={17} color={C.faint} />
        </Pressable>
      ) : null}

      <View style={[{ backgroundColor: C.surface, borderRadius: R.xl, padding: 16, gap: 14 }, lift()]}>
        <Row style={{ justifyContent: "space-between" }}>
          <Txt style={{ fontWeight: "800", fontSize: 18, flex: 1 }}>{t("bilan.title")}</Txt>
          {/* Semaine / depuis le début */}
          <View style={{ flexDirection: dir().row, padding: 3, borderRadius: 99, backgroundColor: C.tint }} accessibilityRole="tablist">
            {["week", "all"].map((k) => (
              <Pressable key={k} onPress={() => { haptic.tap(); setPeriod(k); }} accessibilityRole="tab" accessibilityState={{ selected: period === k }}
                style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 99, backgroundColor: period === k ? C.surface : "transparent" }}>
                <Text style={{ fontSize: 13, fontWeight: period === k ? "800" : "600", color: period === k ? C.fg : C.muted }}>{t(`bilan.p_${k}`)}</Text>
              </Pressable>
            ))}
          </View>
        </Row>
        {period === "week" ? (
          <FadeIn key={`wk${weeksAgo}`} distance={4}>
            <View style={{ flexDirection: dir().row, alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <Text style={{ fontSize: 13.5, color: C.muted, textAlign: dir().ta }}>{weeksAgo ? t("bilan.week_of", { range: weekRange(wb) }) : t("bilan.this_week")}</Text>
              {base.length || prevN ? (
                <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 99, backgroundColor: base.length >= prevN ? C.brandSoft : C.tint }}>
                  <Text style={{ fontSize: 12, fontWeight: "800", color: base.length >= prevN ? C.brandDark : C.muted }}>
                    {base.length === prevN ? t("bilan.same") : `${base.length > prevN ? "+" : "−"}${Math.abs(base.length - prevN)} ${t("bilan.vs_prev")}`}
                  </Text>
                </View>
              ) : null}
            </View>
          </FadeIn>
        ) : null}
        {base.length ? (
        <Row gap={18}>
          <Donut counts={counts} total={base.length} />
          <View style={{ flex: 1, gap: 8 }}>
            {ORDER.filter((s) => counts[s]).map((s, i) => (
              <FadeIn key={s} delay={150 + i * 90}><Row gap={8}>
                <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: col(s) }} />
                <Text numberOfLines={1} style={{ flex: 1, fontSize: 13.5, color: C.fg, textAlign: dir().ta }}>{S(s, "label")}</Text>
                <Text style={{ fontSize: 13.5, fontWeight: "800", color: C.fg }}>{counts[s]}</Text>
                <Text style={{ fontSize: 12, color: C.muted, width: 38, textAlign: "right" }}>{Math.round((counts[s] / all.length) * 100)} %</Text>
              </Row></FadeIn>
            ))}
          </View>
        </Row>
        ) : (
          <View style={{ alignItems: "center", paddingVertical: 18, gap: 4 }}>
            <Text style={{ fontSize: 15, fontWeight: "800", color: C.fg }}>{t("bilan.week_empty")}</Text>
            <Muted style={{ fontSize: 13.5, textAlign: "center" }}>{t("bilan.week_empty_p")}</Muted>
          </View>
        )}
        {base.length ? (
          <View style={{ flexDirection: dir().row, gap: 10 }}>
            {[["ok", okShare + " %", t("bilan.k_halal"), C.cert], ["n", String(base.length), t(base.length === 1 ? "history.count_one" : "history.count_other"), C.fg], ["bad", String((counts.haram || 0) + (counts.mashbouh || 0)), t("bilan.k_avoid"), (counts.haram || 0) + (counts.mashbouh || 0) ? C.doubt : C.muted]].map(([k, v, l, c], i) => (
              <FadeIn key={k + period + weeksAgo} delay={200 + i * 80} style={{ flex: 1 }}>
                <View style={{ flex: 1, minHeight: 78, padding: 10, borderRadius: R.md, backgroundColor: C.tint, alignItems: "center", justifyContent: "center", gap: 2 }}>
                  <Text style={{ fontSize: 19, fontWeight: "800", color: c, fontVariant: ["tabular-nums"] }}>{v}</Text>
                  <Text numberOfLines={2} style={{ fontSize: 11.5, color: C.muted, textAlign: "center" }}>{l}</Text>
                </View>
              </FadeIn>
            ))}
          </View>
        ) : null}
        <Week all={all} weeksAgo={weeksAgo} setWeeksAgo={setWeeksAgo} />
        {avg !== null ? <AvgGauge avg={avg} /> : null}
      </View>

      <ChipRow>
        {FILTERS.map((f) => <Chip key={f.id} text={t(`history.f.${f.id}`)} n={all.filter(f.test).length} on={filter === f.id} onPress={() => setFilter(f.id)} />)}
      </ChipRow>

      {shown.length ? <Muted style={{ fontSize: 12.5, marginTop: -6 }}>{t("history.swipe_hint")}</Muted> : null}
      {shown.length ? groups(shown).map(({ g, list }) => (
        <View key={g} style={{ gap: 8 }}>
          <Text style={{ fontSize: 14, fontWeight: "700", color: C.muted, textAlign: dir().ta }}>{t(`history.g.${g}`)}</Text>
          <View style={[{ backgroundColor: C.surface, borderRadius: R.lg, overflow: "hidden" }, lift()]}>
            {list.map((e, i) => (
              <SwipeRow key={e.code} label={t("history.delete_one")} onDelete={() => { removeFromHistory(e.code); toast && toast(t("history.deleted_one")); }}>
                <View style={{ backgroundColor: C.surface }}><ListRow p={e.p} fav={e.fav} when={relTime(e.at)} first={i === 0} onPress={() => onOpen(e.code)} /></View>
              </SwipeRow>
            ))}
          </View>
        </View>
      )) : <Muted style={{ textAlign: "center", paddingVertical: 24 }}>{t(filter === "fav" ? "history.empty_fav" : "history.empty_cat")}</Muted>}

      {confirm ? (
        <Row gap={16} style={{ justifyContent: "center", flexWrap: "wrap" }}>
          <Txt style={{ fontWeight: "700" }}>{t("history.clear_q")}</Txt>
          <Pressable accessibilityRole="button" onPress={() => { haptic.warn(); clearHistory(); setConfirm(false); toast(t("history.cleared")); }}>
            <Text style={{ color: C.haram, fontWeight: "800" }}>{t("history.clear_yes")}</Text>
          </Pressable>
          <Pressable onPress={() => setConfirm(false)} accessibilityRole="button"><Text style={{ color: C.muted, fontWeight: "700" }}>{t("history.clear_no")}</Text></Pressable>
        </Row>
      ) : (
        <Pressable onPress={() => setConfirm(true)} accessibilityRole="button" style={{ alignSelf: "center", padding: 8 }}>
          <Text style={{ color: C.muted, fontWeight: "700", textDecorationLine: "underline" }}>{t("history.clear")}</Text>
        </Pressable>
      )}
    </Screen>
  );
}
