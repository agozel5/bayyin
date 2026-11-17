// Historique, vue « Aperçu » : activité des 12 dernières semaines (carte de chaleur et série de jours),
// ce qui revient le plus (marques, ingrédients à surveiller), étapes franchies et favoris.
// Tout est calculé sur l'appareil, à partir de l'historique.
import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, Pressable, ScrollView, Animated, Easing } from "react-native";
import { Text } from "./Text";
import { Row } from "./ui";
import { Tile, Glyph } from "./Art";
import { Thumb } from "./Cards";
import { C, R, dir, lift, isDark, STATUS_COLORS } from "../theme";
import { t, tn, locale } from "../i18n";
import { verdictOf, flagLabel, nameOf } from "../view";
import { haptic, ms } from "../motion";

const DAY = 864e5;
const dayStart = (ts) => new Date(ts).setHours(0, 0, 0, 0);
const WEEKS = 12;

// Carte commune : pastille d'icône, titre, valeur à droite
export function InsightCard({ color, paths, title, right, children, gap = 12 }) {
  return (
    <View style={[{ backgroundColor: C.surface, borderRadius: R.xl, padding: 16, gap }, lift()]}>
      <Row gap={10}>
        <Tile color={color} paths={paths} size={30} />
        <Text numberOfLines={2} style={{ flex: 1, color: C.fg, fontWeight: "800", fontSize: 15.5, lineHeight: 20, textAlign: dir().ta }}>{title}</Text>
        {right || null}
      </Row>
      {children}
    </View>
  );
}

/** Jours avec au moins un produit, série en cours et record */
export function streaks(all) {
  const days = new Set(all.map((e) => dayStart(e.at)));
  let cur = 0;
  let d = dayStart(Date.now());
  if (!days.has(d)) d -= DAY; // pas encore scanné aujourd'hui : la série d'hier compte encore
  while (days.has(d)) { cur++; d = dayStart(d - DAY + 3600e3 * 3); }
  const sorted = [...days].sort((a, b) => a - b);
  let best = 0, run = 0, prev = null;
  for (const x of sorted) { run = prev != null && Math.round((x - prev) / DAY) === 1 ? run + 1 : 1; best = Math.max(best, run); prev = x; }
  return { days, cur, best };
}

// ---------- Activité : 12 semaines, une case par jour (du lundi au dimanche) ----------
export function Activity({ all }) {
  const { cells, active, cur, best } = useMemo(() => {
    const per = new Map();
    for (const e of all) {
      const k = dayStart(e.at);
      const st = verdictOf(e.p).status;
      const o = per.get(k) || { n: 0, bad: 0 };
      o.n++; if (st === "haram" || st === "mashbouh") o.bad++;
      per.set(k, o);
    }
    const today = dayStart(Date.now());
    const monday = new Date(today); monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
    const start = new Date(monday); start.setDate(start.getDate() - 7 * (WEEKS - 1));
    const cols = [];
    for (let w = 0; w < WEEKS; w++) {
      const col = [];
      for (let d = 0; d < 7; d++) {
        const x = new Date(start); x.setDate(x.getDate() + w * 7 + d);
        const k = x.getTime();
        col.push({ k, future: k > today, today: k === today, ...(per.get(k) || { n: 0, bad: 0 }) });
      }
      cols.push(col);
    }
    const s = streaks(all);
    return { cells: cols, active: cols.flat().filter((c) => c.n).length, cur: s.cur, best: s.best };
  }, [all.length, all[0] && all[0].at]);
  const max = Math.max(1, ...cells.flat().map((c) => c.n));
  const [sel, setSel] = useState(null);
  const shade = (c) => {
    if (c.future) return "transparent";
    if (!c.n) return isDark() ? "#222B26" : "#E7ECE7";
    const k = Math.min(1, c.n / max);
    const g = isDark() ? ["#1E5A3F", "#2A8A5C", "#3DBE8A"] : ["#A8DDBF", "#4DB57E", "#14805A"];
    return c.bad && c.bad >= c.n / 2 ? "#EE8A1F" : g[k > 0.66 ? 2 : k > 0.33 ? 1 : 0];
  };
  const v = useRef(new Animated.Value(ms(1) ? 0 : 1)).current;
  useEffect(() => { if (ms(1)) Animated.timing(v, { toValue: 1, duration: 700, delay: 150, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start(); }, []);
  const wd = new Intl.DateTimeFormat(locale(), { weekday: "narrow" });
  const df = new Intl.DateTimeFormat(locale(), { weekday: "long", day: "numeric", month: "long" });
  return (
    <InsightCard color="#E07B2E" paths='<path d="M12 21c-3.6 0-6-2.4-6-5.6 0-3.1 2.1-4.6 3.1-6.9.4 1.4 1.2 2.2 2 2.6-.2-2.9 1-5.7 3.4-7.1-.4 2.6.5 4.2 1.8 5.8 1 1.2 1.7 2.6 1.7 4.6C18 18.6 15.6 21 12 21z"/>'
      title={t("hist.activity")}
      right={cur ? <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99, backgroundColor: "#E07B2E" + (isDark() ? "33" : "1F") }}><Text maxFontSizeMultiplier={1.2} style={{ fontSize: 12.5, fontWeight: "900", color: "#E07B2E" }}>{tn("hist.streak", cur)}</Text></View> : null}>
      <View style={{ flexDirection: "row", gap: 4, direction: "ltr" }}>
        <View style={{ gap: 4, paddingTop: 0 }}>
          {[0, 1, 2, 3, 4, 5, 6].map((d) => {
            const x = new Date(2024, 0, 1 + d); // lundi 1er janvier 2024
            return <View key={d} style={{ height: 16, justifyContent: "center" }}><Text maxFontSizeMultiplier={1.1} style={{ fontSize: 9.5, color: C.faint, width: 12 }}>{d % 2 ? "" : wd.format(x).toUpperCase()}</Text></View>;
          })}
        </View>
        {cells.map((col, w) => (
          <Animated.View key={w} style={{ flex: 1, gap: 4, opacity: v.interpolate({ inputRange: [0, Math.min(0.95, w / WEEKS), 1], outputRange: [0, 0, 1] }),
            transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }) }] }}>
            {col.map((c) => (
              <Pressable key={c.k} disabled={c.future} onPress={() => { haptic.tap(); setSel(sel && sel.k === c.k ? null : c); }} hitSlop={2}
                accessibilityLabel={`${df.format(c.k)} : ${c.n}`}
                style={{ height: 16, borderRadius: 4, backgroundColor: shade(c), borderWidth: c.today || (sel && sel.k === c.k) ? 1.5 : 0, borderColor: C.fg }} />
            ))}
          </Animated.View>
        ))}
      </View>
      <Row gap={8} style={{ justifyContent: "space-between", flexWrap: "wrap" }}>
        <Text style={{ fontSize: 12.5, color: C.muted, textAlign: dir().ta }}>
          {sel ? `${df.format(sel.k)} · ${sel.n} ${t(sel.n === 1 ? "history.count_one" : "history.count_other")}` : `${tn("hist.active", active)}${best > 1 ? ` · ${t("hist.best", { n: best })}` : ""}`}
        </Text>
        <Row gap={4}>
          <Text style={{ fontSize: 11, color: C.faint }}>{t("hist.less")}</Text>
          {[isDark() ? "#222B26" : "#E7ECE7", ...(isDark() ? ["#1E5A3F", "#2A8A5C", "#3DBE8A"] : ["#A8DDBF", "#4DB57E", "#14805A"])].map((c) => <View key={c} style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: c }} />)}
          <Text style={{ fontSize: 11, color: C.faint }}>{t("hist.more")}</Text>
        </Row>
      </Row>
    </InsightCard>
  );
}

// ---------- Ce qui revient le plus : marques et ingrédients à surveiller ----------
export function TopCard({ all }) {
  const { brands, flags } = useMemo(() => {
    const b = new Map(), f = new Map();
    for (const e of all) {
      const br = String(e.p.brand || "").split(",")[0].trim();
      if (br) b.set(br, (b.get(br) || 0) + 1);
      const seen = new Set();
      for (const x of verdictOf(e.p).flags || []) {
        const label = flagLabel(x);
        if (seen.has(label)) continue;
        seen.add(label);
        const o = f.get(label) || { n: 0, sev: x.severity };
        o.n++; if (x.severity === "haram") o.sev = "haram";
        f.set(label, o);
      }
    }
    return {
      brands: [...b].sort((a, z) => z[1] - a[1]).slice(0, 3),
      flags: [...f].sort((a, z) => z[1].n - a[1].n).slice(0, 3),
    };
  }, [all.length, all[0] && all[0].at]);
  if (!brands.length && !flags.length) return null;
  const maxB = Math.max(1, ...brands.map((x) => x[1]));
  const head = (k) => <Text style={{ fontSize: 12, fontWeight: "800", letterSpacing: 0.5, color: C.muted, textTransform: "uppercase", textAlign: dir().ta }}>{t(k)}</Text>;
  return (
    <InsightCard color="#8A5BD6" paths='<path d="M4 19h16M7 16V9M12 16V5M17 16v-4"/>' title={t("hist.top")}>
      {brands.length ? (
        <View style={{ gap: 8 }}>
          {head("hist.top_brands")}
          {brands.map(([name, n], i) => (
            <View key={name} style={{ gap: 4 }}>
              <Row gap={8}>
                <Text style={{ width: 16, fontSize: 13, fontWeight: "900", color: C.faint }}>{i + 1}</Text>
                <Text numberOfLines={1} style={{ flex: 1, fontSize: 14.5, fontWeight: "700", color: C.fg, textAlign: dir().ta }}>{name}</Text>
                <Text style={{ fontSize: 13.5, fontWeight: "800", color: C.fg, fontVariant: ["tabular-nums"] }}>{n}</Text>
              </Row>
              <View style={{ height: 5, borderRadius: 3, backgroundColor: C.tint, marginStart: 24, overflow: "hidden" }}>
                <View style={{ height: 5, borderRadius: 3, width: `${(n / maxB) * 100}%`, backgroundColor: "#8A5BD6" }} />
              </View>
            </View>
          ))}
        </View>
      ) : null}
      <View style={{ gap: 8, paddingTop: brands.length ? 4 : 0 }}>
        {head("hist.top_flags")}
        {flags.length ? flags.map(([label, o]) => {
          const [fg, bg] = STATUS_COLORS[o.sev === "haram" ? "haram" : "mashbouh"];
          return (
            <Row key={label} gap={10}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: fg }} />
              <Text numberOfLines={1} style={{ flex: 1, fontSize: 14, color: C.fg, textAlign: dir().ta }}>{label}</Text>
              <View style={{ minWidth: 26, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 99, backgroundColor: bg, alignItems: "center" }}><Text style={{ fontSize: 12, fontWeight: "800", color: fg }}>{o.n}</Text></View>
            </Row>
          );
        }) : (
          <Row gap={8}><Glyph name="check" size={16} color={C.cert} width={2.6} /><Text style={{ flex: 1, fontSize: 13.5, color: C.muted, textAlign: dir().ta }}>{t("hist.no_flags")}</Text></Row>
        )}
      </View>
    </InsightCard>
  );
}

// ---------- Étapes : des médailles qui se gagnent en utilisant l'app ----------
const BADGES = [
  ["first", "#14805A", (s) => [s.n, 1], '<path d="M12 3l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.4l-5.2 2.7 1-5.8L3.5 9.2l5.9-.9z"/>'],
  ["p10", "#3F79B5", (s) => [s.n, 10], '<path d="M5 12l4.5 4.5L19 7"/>'],
  ["p50", "#8A5BD6", (s) => [s.n, 50], '<path d="M5 12l4.5 4.5L19 7"/><path d="M5 6.5l2 2"/>'],
  ["p100", "#D9A21B", (s) => [s.n, 100], '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4"/>'],
  ["s3", "#E07B2E", (s) => [s.best, 3], '<path d="M12 21c-3.6 0-6-2.4-6-5.6 0-3.1 2.1-4.6 3.1-6.9.4 1.4 1.2 2.2 2 2.6-.2-2.9 1-5.7 3.4-7.1-.4 2.6.5 4.2 1.8 5.8 1 1.2 1.7 2.6 1.7 4.6C18 18.6 15.6 21 12 21z"/>'],
  ["s7", "#D0486B", (s) => [s.best, 7], '<path d="M12 21c-3.6 0-6-2.4-6-5.6 0-3.1 2.1-4.6 3.1-6.9.4 1.4 1.2 2.2 2 2.6-.2-2.9 1-5.7 3.4-7.1-.4 2.6.5 4.2 1.8 5.8 1 1.2 1.7 2.6 1.7 4.6C18 18.6 15.6 21 12 21z"/><path d="M12 13v4"/>'],
  ["c10", "#169B57", (s) => [s.cert, 10], '<path d="M12 3l7 3v5.5c0 4.3-2.9 7.3-7 9.5-4.1-2.2-7-5.2-7-9.5V6z"/><path d="M8.5 12l2.5 2.5 4.5-5"/>'],
  ["f5", "#E9A100", (s) => [s.fav, 5], '<path d="M12 4l2.5 5 5.5.8-4 3.9.9 5.5-4.9-2.6-4.9 2.6.9-5.5-4-3.9 5.5-.8z"/>'],
];
export function Badges({ all }) {
  const st = useMemo(() => ({
    n: all.length,
    best: streaks(all).best,
    cert: all.filter((e) => verdictOf(e.p).status === "halal_certifie").length,
    fav: all.filter((e) => e.fav).length,
  }), [all.length, all.filter((e) => e.fav).length]);
  const list = BADGES.map(([id, color, f, paths]) => { const [v, goal] = f(st); return { id, color, paths, v: Math.min(v, goal), goal, done: v >= goal }; });
  const won = list.filter((b) => b.done).length;
  return (
    <InsightCard color="#D9A21B" paths='<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4"/>' title={t("hist.badges")}
      right={<Text style={{ fontSize: 13, fontWeight: "800", color: C.muted }}>{t("hist.badges_n", { n: won, m: list.length })}</Text>}>
      <View style={{ flexDirection: dir().row, flexWrap: "wrap", rowGap: 14 }}>
        {list.map((b) => (
          <View key={b.id} style={{ width: "25%", alignItems: "center", gap: 6 }} accessibilityLabel={`${t(`badge.${b.id}`)} ${b.v}/${b.goal}`}>
            <View style={{ width: 54, height: 54, alignItems: "center", justifyContent: "center" }}>
              {/* anneau de progression */}
              <View style={{ position: "absolute", width: 54, height: 54, borderRadius: 27, borderWidth: 3, borderColor: b.done ? b.color : C.tint2 }} />
              {b.done ? <Tile color={b.color} paths={b.paths} size={42} radius={21} /> : (
                <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: C.tint, alignItems: "center", justifyContent: "center" }}>
                  <Glyph paths={b.paths} size={20} color={C.faint} />
                </View>
              )}
            </View>
            <Text numberOfLines={2} maxFontSizeMultiplier={1.15} style={{ fontSize: 11, lineHeight: 14, fontWeight: b.done ? "800" : "600", color: b.done ? C.fg : C.muted, textAlign: "center", paddingHorizontal: 2 }}>{t(`badge.${b.id}`)}</Text>
            {!b.done ? <Text style={{ fontSize: 10.5, color: C.faint, fontVariant: ["tabular-nums"], marginTop: -4 }}>{b.v}/{b.goal}</Text> : null}
          </View>
        ))}
      </View>
    </InsightCard>
  );
}

// ---------- Favoris : une rangée de vignettes en haut de la liste ----------
export function FavStrip({ all, onOpen }) {
  const favs = all.filter((e) => e.fav);
  if (!favs.length) return null;
  return (
    <View style={{ gap: 8 }}>
      <Row gap={8} style={{ paddingHorizontal: 4 }}>
        <Glyph paths='<path d="M12 4l2.5 5 5.5.8-4 3.9.9 5.5-4.9-2.6-4.9 2.6.9-5.5-4-3.9 5.5-.8z"/>' size={15} color="#E9A100" />
        <Text style={{ fontSize: 13, fontWeight: "800", letterSpacing: 0.6, color: C.muted, textTransform: "uppercase" }}>{t("history.f.fav")}</Text>
        <View style={{ minWidth: 22, paddingHorizontal: 7, paddingVertical: 1, borderRadius: 99, backgroundColor: C.tint2, alignItems: "center" }}><Text style={{ fontSize: 11.5, fontWeight: "800", color: C.muted }}>{favs.length}</Text></View>
      </Row>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20 }} contentContainerStyle={{ paddingHorizontal: 20, gap: 12, flexDirection: dir().row }}>
        {favs.map((e) => {
          const [fg] = STATUS_COLORS[verdictOf(e.p).status] || STATUS_COLORS.inconnu;
          return (
            <Pressable key={e.code} onPress={() => { haptic.tap(); onOpen(e.code); }} accessibilityRole="button" accessibilityLabel={nameOf(e.p)}
              style={({ pressed }) => ({ width: 84, gap: 6, alignItems: "center", transform: [{ scale: pressed ? 0.95 : 1 }] })}>
              <View style={[{ padding: 3, borderRadius: 20, borderWidth: 2, borderColor: fg, backgroundColor: C.surface }, lift()]}><Thumb p={e.p} size={66} radius={16} /></View>
              <Text numberOfLines={2} style={{ fontSize: 11.5, lineHeight: 14, fontWeight: "700", color: C.fg, textAlign: "center" }}>{nameOf(e.p)}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
