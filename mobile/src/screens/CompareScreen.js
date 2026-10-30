// Comparer deux produits côte à côte : halal, note santé, nutriments, additifs, NOVA, profil.
// La case en vert indique le meilleur des deux.
import React, { useCallback, useRef, useState } from "react";
import { View, Text, ScrollView, Pressable, Animated } from "react-native";
import { RevealProvider, useRevealRoot, Reveal, useGrow } from "../components/Reveal";
import { useInnerBack } from "../components/EdgeSwipe";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Txt, Muted, Row, Btn } from "../components/ui";
import { Art, Glyph } from "../components/Art";
import { ListRow, Thumb, STATUS_GLYPH } from "../components/Cards";
import { C, R, dir, lift, VERDICT, STATUS_COLORS, ALERT_COLORS, LEVEL_COLORS, isDark } from "../theme";
import PhotoZoom, { photoList } from "../components/PhotoZoom";
import { t } from "../i18n";
import { getHistory, getEntry } from "../storage";
import { verdictOf, profileOf, scoreOf, nameOf, kindOf, fmt, S } from "../view";
import { mascot } from "../../../public/lib/mascot.js";

const RANK = { halal_certifie: 4, halal_probable: 3, inconnu: 2, mashbouh: 1, haram: 0 };
const nutOf = (p, id) => {
  const h = p.health;
  return (h && h.nutrition && [...h.nutrition.negatives, ...h.nutrition.positives].find((x) => x.id === id)) || null;
};
const better = (x, y, low) => (x == null || y == null || x === y ? [false, false] : (low ? x < y : x > y) ? [true, false] : [false, true]);
const watchCount = (p) => { const h = p.health; return ((h && (h.additives || (h.risks || []).filter((r) => r.level))) || []).length; };

function Head({ p, onOpen }) {
  const st = verdictOf(p).status;
  const [zoom, setZoom] = useState(false);
  const many = photoList(p).length > 0;
  return (
    <View style={[{ flex: 1, borderRadius: R.lg, backgroundColor: C.surface, overflow: "hidden" }, lift()]}>
      <View style={{ flexDirection: dir().row, alignItems: "center", justifyContent: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 7, backgroundColor: VERDICT[st] }}>
        <Glyph paths={STATUS_GLYPH[st]} size={14} color="#fff" width={2.6} />
        <Text numberOfLines={1} style={{ flexShrink: 1, color: "#fff", fontWeight: "800", fontSize: 13 }}>{S(st, "label")}</Text>
      </View>
      <View style={{ alignItems: "center", padding: 12, gap: 6 }}>
        {/* Photo agrandissable, comme sur le web */}
        <Pressable disabled={!many} onPress={() => setZoom(true)} accessibilityRole="imagebutton" accessibilityLabel={t("zoom.open")} style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.96 : 1 }] })}>
          <Thumb p={p} size={104} radius={18} />
          {many ? (
            <View style={{ position: "absolute", bottom: 5, [dir().rtl ? "left" : "right"]: 5, width: 26, height: 26, borderRadius: 13, backgroundColor: "rgba(0,0,0,0.6)", alignItems: "center", justifyContent: "center" }}>
              <Glyph paths='<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4 4M11 8.5v5M8.5 11h5"/>' size={15} color="#fff" width={2.2} />
            </View>
          ) : null}
        </Pressable>
        {many ? <PhotoZoom p={p} visible={zoom} onClose={() => setZoom(false)} /> : null}
        <Pressable onPress={() => onOpen(p.code)} accessibilityRole="button" style={{ alignItems: "center", gap: 3 }}>
          <Text numberOfLines={2} style={{ fontSize: 15, fontWeight: "800", color: C.fg, textAlign: "center", lineHeight: 19 }}>{nameOf(p)}</Text>
          {p.brand ? <Text numberOfLines={1} style={{ fontSize: 12.5, color: C.muted }}>{p.brand}</Text> : null}
          <Text style={{ fontSize: 13.5, fontWeight: "800", color: C.brand, marginTop: 2 }}>{t("cmp.see")} ›</Text>
        </Pressable>
      </View>
    </View>
  );
}

// Case : la meilleure des deux est teintée sur toute sa moitié de ligne (comme sur le web)
function Cell({ children, win, dot }) {
  return (
    <View style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingTop: 6, paddingBottom: 10, backgroundColor: win ? (isDark() ? "#173A27" : "#E2F5EA") : "transparent" }}>
      {typeof children === "string" ? <Text style={{ fontSize: 17, fontWeight: "800", color: win ? (isDark() ? "#7FDCA9" : STATUS_COLORS.halal_certifie[0]) : C.fg, fontVariant: ["tabular-nums"] }}>{children}</Text> : children}
      {dot ? <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: dot }} /> : null}
    </View>
  );
}

// Ligne du tableau : elle apparaît en glissant quand elle arrive à l'écran, puis ses barres se remplissent
function CmpRow({ r, i }) {
  const ref = useRef(null);
  const g = useGrow(ref, { duration: 750, delay: 120 });
  return (
    <Reveal delay={Math.min(i, 3) * 40}>
      <View ref={ref} collapsable={false} style={{ borderTopWidth: i ? 0.5 : 0, borderTopColor: C.line }}>
        <Text style={{ paddingHorizontal: 14, paddingTop: 10, fontSize: 13.5, fontWeight: "700", color: C.muted, textAlign: dir().ta }}>{r.label}</Text>
        <View style={{ flexDirection: dir().row }}>
          <Cell win={r.w[0]} dot={r.da}>{r.x}</Cell>
          <Cell win={r.w[1]} dot={r.db}>{r.y}</Cell>
        </View>
        {r.va != null && r.vb != null ? (
          // Deux barres en miroir depuis le centre : on voit qui en a le plus
          <View style={{ flexDirection: dir().row, height: 6, gap: 6, paddingHorizontal: 14, marginTop: -4, marginBottom: 10 }}>
            {[[r.va, r.w[0], "flex-end"], [r.vb, r.w[1], "flex-start"]].map(([v, win, al], k) => {
              const pct = Math.max(3, (v / (Math.max(r.va, r.vb) || 1)) * 100);
              return (
                <View key={k} style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: C.tint2, alignItems: dir().rtl ? (al === "flex-end" ? "flex-start" : "flex-end") : al, overflow: "hidden" }}>
                  <Animated.View style={{ width: g.interpolate({ inputRange: [0, 1], outputRange: ["0%", `${pct}%`] }), height: 6, borderRadius: 3, backgroundColor: win ? "#3FB46B" : C.faint }} />
                </View>
              );
            })}
          </View>
        ) : null}
      </View>
    </Reveal>
  );
}

function Table({ a, b, onOpen }) {
  const va = verdictOf(a), vb = verdictOf(b);
  const sa = scoreOf(a), sb = scoreOf(b);
  const pill = (st) => { const [fg, bg] = STATUS_COLORS[st]; return <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99, backgroundColor: bg }}><Text style={{ color: fg, fontWeight: "800", fontSize: 12 }}>{S(st, "short")}</Text></View>; };
  const rows = [
    { label: t("detail.halal"), x: pill(va.status), y: pill(vb.status), w: better(RANK[va.status], RANK[vb.status]) },
    { label: t(kindOf(a) === "beauty" ? "detail.cosmetic" : "detail.health"), x: sa ? `${sa.score}/100` : "—", y: sb ? `${sb.score}/100` : "—", w: better(sa && sa.score, sb && sb.score) },
    ...["sugars", "saturated-fat", "salt", "energy", "fiber", "proteins"].map((id) => {
      const na = nutOf(a, id), nb = nutOf(b, id);
      const low = !["fiber", "proteins"].includes(id);
      return { id, label: t(`nut.${id}`), x: na ? `${fmt(na.value)} ${na.unit}` : "—", y: nb ? `${fmt(nb.value)} ${nb.unit}` : "—", w: better(na && na.value, nb && nb.value, low), va: na && na.value, vb: nb && nb.value,
        da: na && LEVEL_COLORS[na.level], db: nb && LEVEL_COLORS[nb.level] };
    }),
    { label: t(kindOf(a) === "beauty" ? "detail.cosmetic_watch" : "detail.watch"), x: String(watchCount(a)), y: String(watchCount(b)), w: better(watchCount(a), watchCount(b), true) },
    { label: t("detail.nova"), x: a.health && a.health.nova ? String(a.health.nova.group) : "—", y: b.health && b.health.nova ? String(b.health.nova.group) : "—", w: better(a.health && a.health.nova && a.health.nova.group, b.health && b.health.nova && b.health.nova.group, true) },
  ].filter((r) => !(r.x === "—" && r.y === "—"));
  const alA = profileOf(a).alert, alB = profileOf(b).alert;
  if (alA || alB) {
    const al = (x) => (x ? <Text style={{ color: ALERT_COLORS[x][0], fontWeight: "800", fontSize: 12.5 }}>{t(`alert.short.${x}`)}</Text> : "✓");
    rows.push({ label: t("settings.profile"), x: al(alA), y: al(alB), w: better(alA ? 0 : 1, alB ? 0 : 1) });
  }
  return (
    <View style={{ gap: 14 }}>
      <View style={{ flexDirection: dir().row, gap: 12 }}><Head p={a} onOpen={onOpen} /><Head p={b} onOpen={onOpen} /></View>
      <View style={[{ backgroundColor: C.surface, borderRadius: R.xl, overflow: "hidden" }, lift()]}>
        {rows.map((r, i) => <CmpRow key={r.label} r={r} i={i} />)}
      </View>
      <Muted style={{ fontSize: 12.5, textAlign: "center" }}>{t("cmp.note")}</Muted>
    </View>
  );
}

export default function CompareScreen({ base: baseCode, baseP, onClose, onOpen, onScan }) {
  const insets = useSafeAreaInsets();
  const all = getHistory().map((e) => e.p).filter((p) => kindOf(p) !== "medicine");
  const [a, setA] = useState(() => baseP || (baseCode ? (getEntry(baseCode) || {}).p || null : null));
  const [b, setB] = useState(null);
  if (typeof window !== "undefined") window.__bayyinCompare = (x, y) => { setA((getEntry(x) || {}).p || null); setB((getEntry(y) || {}).p || null); };
  const back = () => (b ? setB(null) : a && !baseCode ? setA(null) : onClose());
  const others = a ? all.filter((p) => p.code !== a.code && kindOf(p) === kindOf(a)) : [];
  const reveal = useRevealRoot();
  // Geste de retour : d'abord revenir au choix du second produit
  const toPick = useCallback(() => setB(null), []);
  useInnerBack(b ? toPick : null);
  return (
    <RevealProvider value={reveal.value}>
    <ScrollView onScroll={reveal.onScroll} scrollEventThrottle={16} style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: insets.top + 12, paddingBottom: insets.bottom + 40, gap: 16 }}>
      <Row gap={6}>
        <Pressable onPress={back} hitSlop={10} accessibilityRole="button" accessibilityLabel={t("sheet.back")} style={{ padding: 4, transform: [{ scaleX: dir().rtl ? -1 : 1 }] }}>
          <Glyph paths='<path d="M15 5l-7 7 7 7"/>' size={24} color={C.fg} width={2.2} />
        </Pressable>
        <Text accessibilityRole="header" style={{ flex: 1, fontSize: 24, fontWeight: "800", letterSpacing: -0.4, color: C.fg, textAlign: dir().ta }}>{t("cmp.title")}</Text>
      </Row>
      {a && b ? <Table a={a} b={b} onOpen={(code) => onOpen(code)} /> : all.length < 2 ? (
        <View style={[{ alignItems: "center", gap: 10, padding: 24, borderRadius: R.xl, backgroundColor: C.surface }, lift()]}>
          <Art xml={mascot("search", { size: 110 })} size={110} />
          <Txt style={{ fontWeight: "800", fontSize: 18 }}>{t("cmp.need_two.t")}</Txt>
          <Muted style={{ textAlign: "center" }}>{t("cmp.need_two.p")}</Muted>
          <Btn title={t("home.scan")} icon="scan" onPress={onScan} style={{ alignSelf: "stretch" }} />
        </View>
      ) : (
        <View style={{ gap: 10 }}>
          <Muted>{a ? t("cmp.pick", { name: nameOf(a) }) : t("cmp.pick_first")}</Muted>
          {a && !others.length ? <Muted>{t("cmp.none")}</Muted> : (
            <View style={[{ backgroundColor: C.surface, borderRadius: R.lg, overflow: "hidden" }, lift()]}>
              {(a ? others : all).map((p, i) => <ListRow key={p.code} p={p} first={i === 0} onPress={() => (a ? setB(p) : setA(p))} />)}
            </View>
          )}
        </View>
      )}
    </ScrollView>
    </RevealProvider>
  );
}
