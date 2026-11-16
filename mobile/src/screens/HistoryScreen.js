// Historique, en deux vues : « Bilan » (anneau des verdicts, semaine, note moyenne, ouvert en premier)
// et « Produits » (recherche, filtres, produits par jour, affichés par pages).
import React, { useEffect, useRef, useState } from "react";
import { CountUp } from "../components/Fx";
import { View, Pressable, Animated, Easing, PanResponder } from "react-native";
import { Text } from "../components/Text";
import Svg, { Circle } from "react-native-svg";
import { Txt, Muted, Row, FadeIn } from "../components/ui";
import Screen from "../components/Screen";
import { PageHead, Chip, ChipRow, Segmented, SearchBox } from "../components/Controls";
import { ListRow, Khatam } from "../components/Cards";
import { Glyph, Art, Tile } from "../components/Art";
import { C, R, STATUS_COLORS, GRADE_COLORS, dir, lift, isDark } from "../theme";
import { t, tn, locale } from "../i18n";
import { getHistory, clearHistory, removeFromHistory, toggleFav } from "../storage";
import { ChoiceSheet } from "../components/ToolKit";
import SwipeRow from "../components/SwipeRow";
import EmptyState from "../components/Empty";
import { verdictOf, relTime, S, scoreOf, nameOf } from "../view";
import { RANK_ART } from "../../../public/lib/rank-art.js";
import { haptic, ms } from "../motion";
import { isPremium, canUse, FREE_HISTORY_DAYS } from "../premium";

const PAGE = 40; // produits affichés d'un coup (le reste arrive avec « Afficher plus »)
const fold = (x) => String(x || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
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

// Carte du tableau de bord et son en-tête (pastille d'icône, titre, valeur à droite)
const cardStyle = () => [{ backgroundColor: C.surface, borderRadius: R.xl, padding: 16 }, lift()];
function CardHead({ color, paths, title, right }) {
  return (
    <Row gap={10}>
      <Tile color={color} paths={paths} size={30} />
      <Text numberOfLines={2} style={{ flex: 1, color: C.fg, fontWeight: "800", fontSize: 15.5, lineHeight: 20, textAlign: dir().ta }}>{title}</Text>
      {right || null}
    </Row>
  );
}

// En-tête du bilan : la part halal en grand sur le vert de la marque, la barre des verdicts et le détail
const HERO = { halal_certifie: "#8FE3B8", halal_probable: "#BFEBD0", mashbouh: "#FFC163", haram: "#FF8C80", inconnu: "#B9C4BE" };
function BilanHero({ counts, total, okShare, label, delta, period, setPeriod }) {
  const k = useIntro(`${total}:${okShare}:${period}`, { duration: 900, delay: 150 });
  const segs = ["halal_certifie", "halal_probable", "mashbouh", "haram", "inconnu"].filter((x) => counts[x]); // le halal d'abord
  return (
    <View style={{ borderRadius: R.xl, padding: 18, gap: 14, backgroundColor: isDark() ? "#0F4A35" : "#0F6545", overflow: "hidden",
      shadowColor: "#0B2A1C", shadowOpacity: isDark() ? 0 : 0.18, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 4 }}>
      <Khatam />
      <Row gap={8} style={{ justifyContent: "space-between" }}>
        <View style={{ flex: 1, flexDirection: dir().row, alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <Text style={{ fontSize: 13.5, fontWeight: "700", color: "rgba(255,255,255,0.86)" }}>{label}</Text>
          {delta ? <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 99, backgroundColor: "rgba(255,255,255,0.16)" }}><Text style={{ fontSize: 11.5, fontWeight: "800", color: "#fff" }}>{delta}</Text></View> : null}
        </View>
        {/* Semaine / depuis le début */}
        <View style={{ flexDirection: dir().row, padding: 3, borderRadius: 99, backgroundColor: "rgba(0,0,0,0.22)" }} accessibilityRole="tablist">
          {["week", "all"].map((id) => (
            <Pressable key={id} onPress={() => { haptic.tap(); setPeriod(id); }} accessibilityRole="tab" accessibilityState={{ selected: period === id }} hitSlop={4}
              style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 99, backgroundColor: period === id ? "#fff" : "transparent" }}>
              <Text maxFontSizeMultiplier={1.2} style={{ fontSize: 12.5, fontWeight: "800", color: period === id ? "#0F6545" : "rgba(255,255,255,0.85)" }}>{t(`bilan.p_${id}`)}</Text>
            </Pressable>
          ))}
        </View>
      </Row>
      {total ? (
        <>
          <View style={{ flexDirection: dir().row, alignItems: "flex-end", gap: 12 }}>
            <Text maxFontSizeMultiplier={1.2} style={{ fontSize: 58, lineHeight: 60, fontWeight: "900", letterSpacing: -2, color: "#fff", fontVariant: ["tabular-nums"] }}>
              {Math.round(okShare * k)}<Text style={{ fontSize: 26, fontWeight: "800", letterSpacing: 0 }}> %</Text>
            </Text>
            <View style={{ flex: 1, paddingBottom: 7, gap: 1 }}>
              <Text numberOfLines={1} style={{ fontSize: 19, fontWeight: "800", color: "#BFEBD6", textAlign: dir().ta }}>{t("bilan.k_halal")}</Text>
              <Text numberOfLines={2} style={{ fontSize: 13.5, color: "rgba(255,255,255,0.86)", textAlign: dir().ta }}>{total} {t(total === 1 ? "history.count_one" : "history.count_other")}</Text>
            </View>
          </View>
          <View style={{ height: 10, borderRadius: 5, backgroundColor: "rgba(255,255,255,0.16)", overflow: "hidden", direction: "ltr" }}>
            <View style={{ flexDirection: "row", gap: 3, height: 10, width: `${Math.max(2, (1 - Math.pow(1 - k, 3)) * 100)}%` }}>
              {segs.map((x) => <View key={x} style={{ flex: counts[x], backgroundColor: HERO[x], borderRadius: 5 }} />)}
            </View>
          </View>
          <View style={{ flexDirection: dir().row, flexWrap: "wrap", columnGap: 14, rowGap: 6 }}>
            {segs.map((x) => (
              <Row key={x} gap={6}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: HERO[x] }} />
                <Text style={{ fontSize: 13, fontWeight: "700", color: "#fff" }}>{counts[x]} <Text style={{ fontWeight: "500", color: "rgba(255,255,255,0.86)" }}>{S(x, "short")}</Text></Text>
              </Row>
            ))}
          </View>
        </>
      ) : (
        <View style={{ gap: 4, paddingVertical: 6 }}>
          <Text style={{ fontSize: 18, fontWeight: "800", color: "#fff", textAlign: dir().ta }}>{t("bilan.week_empty")}</Text>
          <Text style={{ fontSize: 14, lineHeight: 20, color: "rgba(255,255,255,0.86)", textAlign: dir().ta }}>{t("bilan.week_empty_p")}</Text>
        </View>
      )}
    </View>
  );
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
// Semaine du calendrier, du lundi au dimanche ; weeksAgo = 0 pour la semaine en cours
function weekBounds(weeksAgo) {
  const start = new Date(); start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7) - 7 * weeksAgo);
  const end = new Date(start); end.setDate(end.getDate() + 7);
  return { start: start.getTime(), end: end.getTime() };
}

function Week({ all, weeksAgo, setWeeksAgo }) {
  const oldest = all.length ? Math.min(...all.map((e) => e.at)) : Date.now();
  const maxWeeks = Math.max(0, Math.ceil((weekBounds(0).start - oldest) / (7 * 864e5)));
  const { start, end } = weekBounds(weeksAgo);
  const now = Date.now();
  // Jours du calendrier (et non des tranches de 24 h : le passage à l'heure d'hiver fait un jour de 25 h)
  const days = [...Array(7)].map((_, i) => {
    const d0 = new Date(start); d0.setDate(d0.getDate() + i); const s = d0.getTime();
    const d1 = new Date(start); d1.setDate(d1.getDate() + i + 1); const e1 = d1.getTime();
    const list = all.filter((e) => e.at >= s && e.at < e1);
    const c = {};
    list.forEach((e) => { const st = verdictOf(e.p).status; c[st] = (c[st] || 0) + 1; });
    return { s, n: list.length, c, today: now >= s && now < e1, future: s > now };
  });
  const max = Math.max(1, ...days.map((d) => d.n));
  const n = days.reduce((a, d) => a + d.n, 0);
  const wd = new Intl.DateTimeFormat(locale(), { weekday: "short" });
  let title = t("bilan.week");
  if (weeksAgo) {
    const f = new Intl.DateTimeFormat(locale(), { day: "numeric", month: "short" });
    title = t("bilan.week_range", { range: `${f.format(start)} – ${f.format(end - 864e5)}` });
  }
  const canPrev = weeksAgo < maxWeeks, canNext = weeksAgo > 0;

  // Glisser du doigt sur les barres pour changer de semaine (vers la droite : semaine précédente)
  const x = useRef(new Animated.Value(0)).current;
  const wRef = useRef(320);
  const st = useRef({}); st.current = { weeksAgo, canPrev, canNext, setWeeksAgo };
  const go = (step) => { // step = +1 : semaine précédente
    const { weeksAgo: w, setWeeksAgo: set } = st.current;
    haptic.tap();
    const W = wRef.current;
    if (!ms(1)) { x.setValue(0); return set(w + step); }
    Animated.timing(x, { toValue: step > 0 ? W : -W, duration: 170, easing: Easing.in(Easing.quad), useNativeDriver: true }).start(() => {
      set(w + step);
      x.setValue(step > 0 ? -W * 0.6 : W * 0.6);
      Animated.spring(x, { toValue: 0, friction: 9, tension: 90, useNativeDriver: true }).start();
    });
  };
  const pan = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 12 && Math.abs(g.dx) > Math.abs(g.dy) * 1.4,
    onMoveShouldSetPanResponderCapture: (_, g) => Math.abs(g.dx) > 12 && Math.abs(g.dx) > Math.abs(g.dy) * 1.4,
    onPanResponderTerminationRequest: () => false,
    onPanResponderMove: (_, g) => {
      const ok = g.dx > 0 ? st.current.canPrev : st.current.canNext;
      x.setValue(ok ? g.dx : g.dx * 0.25); // résiste quand il n'y a plus de semaine de ce côté
    },
    onPanResponderRelease: (_, g) => {
      const step = g.dx > 0 ? 1 : -1;
      const ok = step > 0 ? st.current.canPrev : st.current.canNext;
      if (ok && (Math.abs(g.dx) > 50 || Math.abs(g.vx) > 0.5)) go(step);
      else Animated.spring(x, { toValue: 0, friction: 7, useNativeDriver: true }).start();
    },
    onPanResponderTerminate: () => Animated.spring(x, { toValue: 0, useNativeDriver: true }).start(),
  })).current;
  if (typeof window !== "undefined" && window.__bayyin) window.__bayyinWeekGo = go; // captures automatiques (web)

  const Nav = ({ dirn, off }) => (
    <Pressable disabled={off} onPress={() => go(dirn === "prev" ? 1 : -1)} hitSlop={8}
      accessibilityRole="button" accessibilityLabel={t(dirn === "prev" ? "bilan.prev_week" : "bilan.next_week")} style={{ opacity: off ? 0.25 : 1, padding: 4 }}>
      <Glyph name="chev" size={18} color={C.muted} />
    </Pressable>
  );
  return (
    <View style={[cardStyle(), { gap: 12 }]}>
      <CardHead color="#3F79B5" paths='<path d="M5 20V10M12 20V4M19 20v-7"/>' title={title} right={<Text style={{ color: C.fg, fontWeight: "800", fontSize: 18, fontVariant: ["tabular-nums"] }}>{n}</Text>} />
      <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 4, direction: "ltr" }}>
        <View style={{ transform: [{ scaleX: -1 }] }}><Nav dirn="prev" off={!canPrev} /></View>
        <View style={{ flex: 1, overflow: "hidden" }} onLayout={(e) => { wRef.current = e.nativeEvent.layout.width; }} {...pan.panHandlers}
          accessibilityHint={t("bilan.swipe_hint")}>
          <Animated.View style={{ flexDirection: "row", alignItems: "flex-end", gap: 4, transform: [{ translateX: x }],
            opacity: x.interpolate({ inputRange: [-300, 0, 300], outputRange: [0.2, 1, 0.2], extrapolate: "clamp" }) }}>
            {days.map((d, i) => (
              <View key={d.s} style={{ flex: 1, alignItems: "center", gap: 4, opacity: d.future ? 0.45 : 1 }}>
                <Text style={{ fontSize: 11, color: C.muted, height: 14 }}>{d.n || ""}</Text>
                <DayBar i={i} weeksAgo={weeksAgo} h={d.n ? `${Math.max(10, (d.n / max) * 100)}%` : 3}>
                  {d.n ? ORDER.filter((s) => d.c[s]).map((s) => <View key={s} style={{ flex: d.c[s], backgroundColor: col(s) }} />) : <View style={{ flex: 1, backgroundColor: C.tint2 }} />}
                </DayBar>
                <Text style={{ fontSize: 11, color: d.today ? C.brand : C.muted, fontWeight: d.today ? "900" : "500" }}>{wd.format(d.s).replace(/\.$/, "")}</Text>
                <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: d.today ? C.brand : "transparent", marginTop: -2 }} />
              </View>
            ))}
          </Animated.View>
        </View>
        <Nav dirn="next" off={!canNext} />
      </View>
    </View>
  );
}

function AvgGauge({ avg }) {
  const k = useIntro(avg, { duration: 1000, delay: 250 });
  const g = avg >= 75 ? "excellent" : avg >= 50 ? "bon" : avg >= 25 ? "mediocre" : "mauvais";
  return (
    <View style={[cardStyle(), { gap: 10 }]}>
      <Row gap={10} style={{ justifyContent: "space-between" }}>
        <Tile color="#D0486B" paths='<path d="M12 20s-7-4.4-7-9.5A4 4 0 0 1 12 8a4 4 0 0 1 7 2.5C19 15.6 12 20 12 20z"/>' size={30} />
        <Text numberOfLines={2} style={{ color: C.fg, fontWeight: "800", fontSize: 15.5, flex: 1, textAlign: dir().ta }}>{t("bilan.avg")}</Text>
        <Text style={{ color: GRADE_COLORS[g], fontWeight: "800", fontSize: 18 }}>{Math.round(avg * k)}<Text style={{ fontSize: 12, color: C.muted }}>/100</Text></Text>
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
  const [menu, setMenu] = useState(null); // appui long sur un produit : actions rapides
  const lastMenu = useRef(null); if (menu) lastMenu.current = menu;
  const m = menu || lastMenu.current;
  if (typeof window !== "undefined" && window.__bayyin) window.__bayyinHistMenu = (i) => setMenu(i == null ? null : getHistory()[i]); // captures automatiques (web)
  const menuSheet = (
    <ChoiceSheet visible={!!menu} onClose={() => setMenu(null)} title={m ? nameOf(m.p) : ""} items={m ? [
      { id: "open", color: "#14805A", paths: '<path d="M9 5l7 7-7 7"/>', title: t("history.open"), onPress: () => onOpen(m.code) },
      { id: "fav", color: "#E9A100", paths: '<path d="M12 4l2.5 5 5.5.8-4 3.9.9 5.5-4.9-2.6-4.9 2.6.9-5.5-4-3.9 5.5-.8z"/>', title: t(m.fav ? "sheet.fav_remove" : "sheet.fav_add"), onPress: () => { toggleFav(m.code); toast && toast(t(m.fav ? "sheet.fav_removed" : "sheet.fav_added")); } },
      { id: "del", color: "#E0423A", paths: '<path d="M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12"/>', title: t("history.delete_one"), onPress: () => { removeFromHistory(m.code); toast && toast(t("history.deleted_one")); } },
    ] : []} />
  );
  const [filter, setFilter] = useState("all");
  if (typeof window !== "undefined" && window.__bayyin) window.__bayyinHistFilter = setFilter; // captures automatiques (web)
  const [confirm, setConfirm] = useState(false);
  const [view, setView] = useState("bilan"); // ouverture sur le bilan (les chiffres) ; « list » : les produits, un toucher plus loin
  const [q, setQ] = useState("");
  const [limit, setLimit] = useState(PAGE);
  if (typeof window !== "undefined" && window.__bayyin) window.__bayyinHistView = setView; // captures automatiques (web)
  const [weeksAgo, setWeeksAgo] = useState(0);
  const [period, setPeriod] = useState("week");
  // Sans Premium (quand il est en vente) : les 30 derniers jours, favoris compris
  const full = getHistory();
  const all = isPremium() ? full : full.filter((e) => e.fav || e.at > Date.now() - FREE_HISTORY_DAYS * 864e5);
  const hidden = full.length - all.length;

  if (!all.length) {
    return (
      <Screen title={t("history.title")}>
        <PageHead title={t("history.title")} sub={t("history.sub")} />
        <EmptyState pose="hello" title={t("history.empty.t")} text={t("history.empty.p")} action={t("home.scan")} onAction={onScan} />
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
  const needle = fold(q.trim());
  const matches = all.filter(FILTERS.find((f) => f.id === filter).test)
    .filter((e) => !needle || fold(`${nameOf(e.p)} ${e.p.brand || ""} ${e.code}`).includes(needle));
  const shown = matches.slice(0, limit);

  return (
    <Screen gap={16} title={t("history.title")}>
      <PageHead title={t("history.title")} sub={t("history.sub")} />
      <Segmented items={[["bilan", t("bilan.title")], ["list", `${t("history.v.list")} · ${all.length}`]]} value={view} onChange={setView} />
      {view === "list" && hidden > 0 ? (
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

      {view === "bilan" ? (
      <FadeIn distance={6} style={{ gap: 14 }}>
        <BilanHero counts={counts} total={base.length} okShare={okShare} period={period} setPeriod={setPeriod}
          label={period === "all" ? t("history.title") : weeksAgo ? t("bilan.week_of", { range: weekRange(wb) }) : t("bilan.this_week")}
          delta={period === "week" && (base.length || prevN) ? (base.length === prevN ? t("bilan.same") : `${base.length > prevN ? "+" : "−"}${Math.abs(base.length - prevN)} ${t("bilan.vs_prev")}`) : ""} />
        {base.length ? (
          <View style={[cardStyle(), { gap: 14 }]}>
            <CardHead color="#14805A" paths='<path d="M12 3.5a8.5 8.5 0 1 0 8.5 8.5H12z"/><path d="M15 3.9A8.5 8.5 0 0 1 20.1 9H15z"/>' title={t("bilan.title")} />
            <Row gap={18}>
              <Donut counts={counts} total={base.length} />
              <View style={{ flex: 1 }}>
                {ORDER.filter((x) => counts[x]).map((x, i) => (
                  <FadeIn key={x} delay={150 + i * 90}>
                    <Row gap={8} style={{ paddingVertical: 8, borderTopWidth: i ? 0.5 : 0, borderTopColor: C.line }}>
                      <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: col(x) }} />
                      <Text numberOfLines={1} style={{ flex: 1, fontSize: 14, color: C.fg, textAlign: dir().ta }}>{S(x, "label")}</Text>
                      <Text style={{ fontSize: 14.5, fontWeight: "800", color: C.fg, fontVariant: ["tabular-nums"] }}>{counts[x]}</Text>
                      <Text style={{ fontSize: 12.5, color: C.muted, width: 40, textAlign: "right", fontVariant: ["tabular-nums"] }}>{Math.round((counts[x] / base.length) * 100)} %</Text>
                    </Row>
                  </FadeIn>
                ))}
              </View>
            </Row>
          </View>
        ) : null}
        <Week all={all} weeksAgo={weeksAgo} setWeeksAgo={setWeeksAgo} />
        {avg !== null ? <AvgGauge avg={avg} /> : null}
      </FadeIn>
      ) : (
      <>
      <SearchBox value={q} onChangeText={(x) => { setQ(x); setLimit(PAGE); }} placeholder={t("history.search_ph")} />
      <ChipRow>
        {FILTERS.map((f) => <Chip key={f.id} text={t(`history.f.${f.id}`)} n={all.filter(f.test).length} on={filter === f.id} onPress={() => { setFilter(f.id); setLimit(PAGE); }} />)}
      </ChipRow>
      {shown.length ? groups(shown).map(({ g, list }) => (
        <View key={g} style={{ gap: 8 }}>
          <Row gap={8} style={{ paddingHorizontal: 4 }}>
            <Text style={{ fontSize: 13, fontWeight: "800", letterSpacing: 0.6, color: C.muted, textTransform: "uppercase" }}>{t(`history.g.${g}`)}</Text>
            <View style={{ minWidth: 22, paddingHorizontal: 7, paddingVertical: 1, borderRadius: 99, backgroundColor: C.tint2, alignItems: "center" }}><Text style={{ fontSize: 11.5, fontWeight: "800", color: C.muted }}>{list.length}</Text></View>
          </Row>
          <View style={[{ backgroundColor: C.surface, borderRadius: R.lg, overflow: "hidden" }, lift()]}>
            {list.map((e, i) => (
              <SwipeRow key={e.code} label={t("history.delete_one")} onDelete={() => { removeFromHistory(e.code); toast && toast(t("history.deleted_one")); }}>
                <FadeIn delay={Math.min(i, 8) * 45} distance={10} style={{ backgroundColor: C.surface }}><ListRow p={e.p} fav={e.fav} when={relTime(e.at)} first={i === 0} onPress={() => onOpen(e.code)} onLongPress={() => setMenu(e)} /></FadeIn>
              </SwipeRow>
            ))}
          </View>
        </View>
      )) : needle ? <EmptyState compact pose="search" size={92} title={t("history.no_match")} second={t("history.show_all")} onSecond={() => { setQ(""); setFilter("all"); }} />
      : (filter === "fav"
        ? <EmptyState compact pose="star" size={92} title={t("history.empty_fav_t")} text={t("history.empty_fav_p")} second={t("history.show_all")} onSecond={() => setFilter("all")} />
        : <EmptyState compact pose="search" size={92} title={t("history.empty_cat")} second={t("history.show_all")} onSecond={() => setFilter("all")} />)}

      {matches.length > shown.length ? (
        <Pressable onPress={() => { haptic.tap(); setLimit(limit + PAGE); }} accessibilityRole="button"
          style={({ pressed }) => ({ paddingVertical: 14, borderRadius: R.md, backgroundColor: pressed ? C.tint2 : C.tint, alignItems: "center" })}>
          <Text style={{ color: C.fg, fontWeight: "800", fontSize: 15 }}>{t("history.more", { n: matches.length - shown.length })}</Text>
        </Pressable>
      ) : null}
      {shown.length && !needle ? <Muted style={{ fontSize: 12.5, textAlign: "center" }}>{t("history.swipe_hint")}</Muted> : null}

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
      </>
      )}
      {menuSheet}
    </Screen>
  );
}
