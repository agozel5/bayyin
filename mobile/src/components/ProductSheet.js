// Fiche produit : verdict halal, note santé, additifs, alternatives… (même contenu que la version web)
import React, { useEffect, useRef, useState } from "react";
import { View, Text, ScrollView, Pressable, Image, Linking, Share, Animated, Easing, Platform } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Icon from "./Icon";
import { Txt, H2, Muted, Label, Row, Btn, Pill, StatusPill, MiniScore, Loading, Message, Skeleton, FadeIn } from "./ui";
import { haptic, ms, announce } from "../motion";
import { isDark, C, R, ALERT_COLORS, STATUS_COLORS, SEV_COLORS, RISK_COLORS, GRADE_COLORS, LEVEL_COLORS, NOVA_COLORS, dir, lift } from "../theme";
import { t, tn, tPlain } from "../i18n";
import { SOURCE_BY_ID, RISK_SOURCES, FLAG_SOURCES, isMedicineCode } from "../core";
import { fetchProduct, fetchAlternatives } from "../api";
import { getSettings, getEntry, addToHistory, toggleFav, subscribe } from "../storage";
import { verdictOf, nameOf, scoreOf, S, isBarcode, flagLabel, flagReason, noteText, fmt, errorText, kindOf, profileOf } from "../view";
import { Top as Top2, VerdictHero, Confidence, SheetTabs, Chain, Reader, CertCard, Disclaimer, Panel, FlagCard as FlagCard2 } from "./SheetParts";
import { Glyph, Art, Tile } from "./Art";
import { I } from "../../../public/lib/icons.js";
import { CompositionAdditives } from "./Additives";
import PlanetSection from "./Planet";
import RecallBox from "./Recall";
import ShareCard, { shareUrl, SHARE_W } from "./ShareCard";
import { countScan } from "../review";
import CosmeticSection, { CosmeticIngredients } from "./Cosmetic";
import { NUT_ART, ALLERGEN_ART } from "../../../public/lib/rank-art.js";

const STATUS_ICON = { halal_certifie: "check", halal_probable: "check", mashbouh: "question", haram: "cross", inconnu: "dash" };
const open = (url) => Linking.openURL(url).catch(() => {});
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// ---------------------------------------------------------------------------
// Petits éléments
// ---------------------------------------------------------------------------
function Section({ title, sub, children }) {
  return (
    <View style={{ gap: 10 }}>
      <Row style={{ justifyContent: "space-between" }}>
        <H2 style={{ flexShrink: 1 }}>{title}</H2>
        {sub ? <Muted style={{ fontSize: 13 }}>{sub}</Muted> : null}
      </Row>
      {children}
    </View>
  );
}

function SourceLine({ ids }) {
  const list = (ids || []).map((id) => SOURCE_BY_ID[id]).filter(Boolean);
  if (!list.length) return null;
  return (
    <Txt style={{ fontSize: 13, lineHeight: 19, color: C.muted }}>
      {t("detail.source")} :{" "}
      {list.map((src, i) => (
        <Text key={src.id} onPress={() => open(src.url)} style={{ color: C.brand, textDecorationLine: "underline" }}>
          {src.name}
          {i < list.length - 1 ? ", " : ""}
        </Text>
      ))}
    </Txt>
  );
}

function Expand({ head, children, initial = false }) {
  const [on, setOn] = useState(initial);
  return (
    <View style={{ backgroundColor: C.tint, borderRadius: R.md, overflow: "hidden" }}>
      <Pressable
        onPress={() => {
          haptic.tap();
          setOn(!on);
        }}
        accessibilityRole="button"
        accessibilityState={{ expanded: on }}
        style={{ flexDirection: dir().row, alignItems: "center", gap: 10, padding: 14 }}
      >
        <View style={{ flex: 1 }}>{head}</View>
        <View style={{ transform: [{ rotate: on ? "90deg" : "0deg" }] }}>
          <Icon name="chev" size={16} color={C.muted} flip={dir().rtl && !on} />
        </View>
      </Pressable>
      {on ? <View style={{ paddingHorizontal: 14, paddingBottom: 14, gap: 6 }}>{children}</View> : null}
    </View>
  );
}

function Ring({ value, color, size = 58 }) {
  const w = 6;
  const r = (size - w) / 2;
  const len = 2 * Math.PI * r;
  // L'anneau se remplit jusqu'à la note
  const v = useRef(new Animated.Value(ms(1) ? 0 : value || 0)).current;
  useEffect(() => {
    Animated.timing(v, { toValue: value || 0, duration: ms(700), delay: ms(150), easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [value]);
  const dash = v.interpolate({ inputRange: [0, 100], outputRange: [0, len] });
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} style={{ position: "absolute", transform: [{ rotate: "-90deg" }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={C.line} strokeWidth={w} fill="none" />
        {value ? (
          <AnimatedCircle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={w} fill="none" strokeLinecap="round"
            strokeDasharray={[len, len]} strokeDashoffset={Animated.subtract(len, dash)} />
        ) : null}
      </Svg>
      <Text maxFontSizeMultiplier={1.2} style={{ fontWeight: "800", fontSize: value ? 18 : 20, color: C.fg }}>{value || "?"}</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Blocs de la fiche
// ---------------------------------------------------------------------------
function Top({ p }) {
  const meta = [p.brand, p.quantity].filter(Boolean).join(" · ");
  return (
    <Row gap={14} style={{ alignItems: "flex-start" }}>
      {p.image ? (
        <Image source={{ uri: p.image }} style={{ width: 84, height: 84, borderRadius: 16, borderWidth: 1, borderColor: C.line, backgroundColor: "#fff" }} resizeMode="contain" accessible={false} />
      ) : (
        <View style={{ width: 84, height: 84, borderRadius: 16, backgroundColor: C.tint, alignItems: "center", justifyContent: "center" }}>
          <Icon name={p.local ? "doc" : "box"} size={30} color={C.faint} />
        </View>
      )}
      <View style={{ flex: 1, gap: 4 }}>
        <Txt style={{ fontSize: 21, lineHeight: 26, fontWeight: "800" }}>{nameOf(p)}</Txt>
        {meta ? <Muted>{meta}</Muted> : null}
        {isBarcode(p.code) ? <Text style={{ color: C.faint, fontSize: 13, textAlign: dir().ta }}>{p.code}</Text> : null}
      </View>
    </Row>
  );
}

function Tiles({ p, v }) {
  const s = scoreOf(p);
  const [fg, bg] = STATUS_COLORS[v.status];
  const tile = { flex: 1, borderRadius: R.lg, padding: 14, gap: 10, minHeight: 128 };
  return (
    <View style={{ flexDirection: dir().row, gap: 10 }}>
      <View style={[tile, { backgroundColor: bg }]} accessible accessibilityLabel={`${t("detail.halal")} : ${S(v.status, "label")}`}>
        <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: fg, alignItems: "center", justifyContent: "center" }}>
          <Icon name={STATUS_ICON[v.status]} size={26} color="#fff" width={2.8} />
        </View>
        <View>
          <Label style={{ color: fg }}>{t("detail.halal")}</Label>
          <Txt style={{ fontSize: 18, lineHeight: 23, fontWeight: "800", color: fg }}>{S(v.status, "label")}</Txt>
        </View>
      </View>
      {kindOf(p) !== "food" ? (
        <View style={[tile, { backgroundColor: C.tint }]} accessible accessibilityLabel={t(`kind.${kindOf(p)}`)}>
          <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" }}>
            <Icon name={kindOf(p) === "medicine" ? "pill" : "drop"} size={24} color={C.brand} />
          </View>
          <View>
            <Label>{t(`kind.${kindOf(p)}`)}</Label>
            <Txt style={{ fontSize: 16, lineHeight: 21, fontWeight: "800" }} numberOfLines={3}>
              {kindOf(p) === "medicine" ? p.form || t("kind.medicine") : t("detail.beauty_note")}
            </Txt>
          </View>
        </View>
      ) : (
      <View
        style={[tile, { backgroundColor: C.tint }]}
        accessible
        accessibilityLabel={`${t("detail.health")} : ${s ? `${s.score}/100, ${t(`grade.${s.grade}`)}` : t("detail.not_rated")}`}
      >
        <Ring value={s ? s.score : 0} color={s ? GRADE_COLORS[s.grade] : C.faint} />
        <View>
          <Label>{t("detail.health")}</Label>
          <Txt style={{ fontSize: 18, lineHeight: 23, fontWeight: "800", color: s ? GRADE_COLORS[s.grade] : C.muted }}>
            {s ? t(`grade.${s.grade}`) : t("detail.not_rated")}
          </Txt>
        </View>
      </View>
      )}
    </View>
  );
}

// Alerte personnelle (allergies, régime) en haut de la fiche
function ProfileAlert({ p, onGotoProfile }) {
  const r = profileOf(p);
  if (!r.alert) return null;
  const [fg, bg] = ALERT_COLORS[r.alert];
  const label = (tags) => tags.map((a) => t(`allergen.${a}`)).join(", ");
  const lines = [
    r.contains.length ? t("alert.contains", { list: label(r.contains) }) : null,
    r.diet ? t(`alert.${r.diet.id}.${r.diet.level}`) : null,
    r.traces.length ? t("alert.traces", { list: label(r.traces) }) : null,
  ].filter(Boolean);
  const arts = [...r.contains, ...r.traces].filter((a, i, l) => ALLERGEN_ART[a] && l.indexOf(a) === i).slice(0, 5);
  return (
    <View accessible accessibilityRole="alert" accessibilityLabel={`${t(`alert.${r.alert}`)}. ${lines.join(". ")}`}
      style={[{ backgroundColor: C.surface, borderRadius: R.xl, overflow: "hidden", borderWidth: 1, borderColor: fg + "55" }, lift()]}>
      <View style={{ backgroundColor: bg, padding: 14, gap: 10 }}>
        <Row gap={12}>
          <Tile color={fg} paths={I.alert} size={40} />
          <Txt style={{ color: fg, fontWeight: "800", fontSize: 17, flex: 1, lineHeight: 22 }}>{t(`alert.${r.alert}`)}</Txt>
          {arts.length ? (
            <View style={{ flexDirection: dir().row }}>
              {arts.map((a, i) => (
                <View key={a} style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: C.surface, borderWidth: 2, borderColor: bg, alignItems: "center", justifyContent: "center", marginStart: i ? -10 : 0 }}>
                  <Art xml={ALLERGEN_ART[a]} size={24} />
                </View>
              ))}
            </View>
          ) : null}
        </Row>
        {lines.map((l) => <Txt key={l} style={{ color: C.fg, fontWeight: "700", fontSize: 15.5, lineHeight: 21 }}>{l}</Txt>)}
      </View>
      <View style={{ paddingHorizontal: 14, paddingTop: 10, paddingBottom: 4, gap: 2 }}>
        <Muted style={{ fontSize: 13, lineHeight: 18 }}>{t("alert.note")}</Muted>
        <Pressable onPress={onGotoProfile} accessibilityRole="link" style={{ flexDirection: dir().row, alignItems: "center", gap: 4, paddingVertical: 8 }}>
          <Text style={{ color: fg, fontWeight: "800", fontSize: 14.5 }}>{t("alert.edit")}</Text>
          <Glyph name="chev" size={15} color={fg} width={2.4} />
        </Pressable>
      </View>
    </View>
  );
}

function MedicineSection({ p }) {
  return (
    <Section title={t("kind.medicine")}>
      <Txt>{t("detail.med_lead")}</Txt>
      <View style={{ backgroundColor: C.tint, borderRadius: R.md, padding: 14, gap: 8 }}>
        <Row style={{ justifyContent: "space-between" }}>
          <Muted>{t("detail.med_form")}</Muted>
          <Txt style={{ fontWeight: "700", flexShrink: 1 }}>{p.form || "—"}</Txt>
        </Row>
        {p.brand ? (
          <Row style={{ justifyContent: "space-between" }}>
            <Muted>{t("detail.med_holder")}</Muted>
            <Txt style={{ fontWeight: "700", flexShrink: 1 }}>{p.brand}</Txt>
          </Row>
        ) : null}
      </View>
      <Row gap={10} style={{ alignItems: "flex-start" }}>
        <Icon name="bulb" size={20} color={C.brand} />
        <Txt style={{ flex: 1 }}>{t("detail.med_ask")}</Txt>
      </Row>
      <Muted style={{ fontSize: 13 }}>{t("detail.med_source")}</Muted>
    </Section>
  );
}

function FlagCard({ f, onGotoSettings }) {
  const colors = SEV_COLORS[f.severity];
  return (
    <View style={{ borderRadius: R.md, padding: 14, gap: 6, backgroundColor: C.tint, borderStartWidth: 4, borderStartColor: colors[0] }}>
      <Row style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
        <Txt style={{ fontWeight: "800", flex: 1 }}>{flagLabel(f)}</Txt>
        <Pill text={t(`sev.${f.severity}`)} colors={colors} />
      </Row>
      <Muted>{flagReason(f)}</Muted>
      {f.covered ? (
        <Muted style={{ fontSize: 13 }}>{t("detail.covered")}</Muted>
      ) : f.topic && f.decision ? (
        <Txt style={{ fontSize: 13, lineHeight: 19, color: C.muted }}>
          {t("detail.by_setting", { topic: t(`topic.${f.topic}`), d: t(`decision.${f.decision}`).toLowerCase() })}{" "}
          <Text onPress={onGotoSettings} style={{ color: C.brand, fontWeight: "700" }}>{t("detail.change_setting")}</Text>
        </Txt>
      ) : null}
      {f.source && !f.code ? <Muted style={{ fontSize: 13 }}>{t("detail.found_in", { s: f.source })}</Muted> : null}
      <SourceLine ids={FLAG_SOURCES[f.id]} />
    </View>
  );
}

function HalalSection({ p, v, onGotoSettings, onOcr }) {
  const notes = [...(p.local ? [t("detail.local")] : []), ...v.notes.map(noteText)];
  return (
    <Section title={t("detail.halal")}>
      {kindOf(p) !== "medicine" || v.status !== "inconnu" ? <Txt>{S(v.status, "lead")}</Txt> : null}
      {v.certification ? (
        <Row gap={8} style={{ backgroundColor: C.brandSoft, borderRadius: R.md, padding: 12 }}>
          <Icon name="shield" size={20} color={C.brand} />
          <Txt style={{ color: C.brandDark, fontWeight: "700", flex: 1 }}>
            {t("detail.certified")}
            {v.certification.organisme ? " · " + v.certification.organisme : ""}
          </Txt>
        </Row>
      ) : null}
      {notes.map((n, i) => (
        <Muted key={i}>{n}</Muted>
      ))}
      {v.flags.map((f, i) => (
        <FlagCard key={f.id + i} f={f} onGotoSettings={onGotoSettings} />
      ))}
      {v.status === "inconnu" && isBarcode(p.code) && kindOf(p) === "food" ? <Btn title={t("detail.photo_ingredients")} icon="doc" onPress={() => onOcr(p.code)} /> : null}
    </Section>
  );
}

// Jauge tricolore avec repère du produit (comme la version web)
function Gauge({ n }) {
  if (!n.t) return null;
  const [a, b] = n.t;
  const top = Math.max(n.kind === "neg" ? b * 1.6 : b * 1.5, n.value * 1.05);
  const pct = (x) => Math.max(0, Math.min(100, (x / top) * 100));
  const segs = n.kind === "neg" ? ["#3FB46B", "#F0A23A", "#E2533F"] : ["#B9DFC6", "#3FB46B", "#1E8A4C"];
  const r = (x) => fmt(x < 10 ? Math.round(x * 10) / 10 : Math.round(x));
  const w = [pct(a), pct(b) - pct(a), 100 - pct(b)];
  return (
    <View style={{ marginStart: 52, marginTop: 4, direction: "ltr" }} accessible accessibilityLabel={`${fmt(n.value)} ${n.unit} · ${r(a)} / ${r(b)}`}>
      <View style={{ height: 14, justifyContent: "flex-end" }}>
        <View style={{ position: "absolute", left: `${pct(n.value)}%`, marginLeft: -6, top: 0, width: 0, height: 0, borderLeftWidth: 6, borderRightWidth: 6, borderTopWidth: 8,
          borderLeftColor: "transparent", borderRightColor: "transparent", borderTopColor: C.fg }} />
      </View>
      <View style={{ flexDirection: "row", height: 7, gap: 2, marginTop: 2 }}>
        {segs.map((c, i) => <View key={i} style={{ width: `${w[i]}%`, backgroundColor: c, borderRadius: 4 }} />)}
      </View>
      <View style={{ height: 18, marginTop: 3 }}>
        {[[0, "0"], [pct(a), r(a)], [pct(b), r(b)], [100, r(top)]].map(([x, l], i) => (
          <Text key={i} style={{ position: "absolute", left: `${x}%`, transform: [{ translateX: i === 0 ? 0 : i === 3 ? -24 : -10 }], fontSize: 11.5, color: C.muted, fontVariant: ["tabular-nums"] }}>{l}</Text>
        ))}
      </View>
    </View>
  );
}

function NutRow({ n }) {
  const textKey = n.id === "fiber" && n.value >= 6 ? "excellent" : n.level;
  const color = LEVEL_COLORS[n.level] || C.muted;
  return (
    <View style={{ gap: 6, paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: C.line }}>
      <Row gap={12}>
        <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: C.artBg, alignItems: "center", justifyContent: "center" }}>
          {NUT_ART[n.id] ? <Art xml={NUT_ART[n.id]} size={30} /> : <Icon name={n.id} size={20} color={C.fg} />}
        </View>
        <View style={{ flex: 1 }}>
          <Txt style={{ fontWeight: "700" }}>{t(`nut.${n.id}`)}</Txt>
          <Muted style={{ fontSize: 13, lineHeight: 18 }}>{t(`nut.${n.id}.${textKey}`)}</Muted>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Text style={{ fontWeight: "800", color: C.fg, fontSize: 15.5 }}>{fmt(n.value)} {n.unit}</Text>
          <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color }} />
        </View>
      </Row>
      <Gauge n={n} />
    </View>
  );
}

function AdditivesRow({ count }) {
  const bad = count > 0;
  return (
    <Row gap={12} style={{ paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.line }}>
      <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: C.artBg, alignItems: "center", justifyContent: "center" }}>
        <Art xml={NUT_ART.additives} size={30} />
      </View>
      <View style={{ flex: 1 }}>
        <Txt style={{ fontWeight: "700" }}>{t("detail.additives")}</Txt>
        <Muted style={{ fontSize: 13, lineHeight: 18 }}>{bad ? tn("detail.additives_risky", count) : t("detail.additives_none")}</Muted>
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        {bad ? <Text style={{ fontWeight: "700", color: C.fg }}>{count}</Text> : null}
        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: bad ? LEVEL_COLORS.eleve : LEVEL_COLORS.bon }} />
      </View>
    </Row>
  );
}

function HealthSection({ p }) {
  const h = p.health;
  if (!h || h.cosmetic) return null; // cosmétiques : note des ingrédients (portage à venir)
  const s = h.score;
  const risky = h.additives.length;
  const neg = h.nutrition.negatives;
  const pos = h.nutrition.positives;
  const hasNut = neg.length || pos.length;
  const bits = s ? [t("hsum.ns", { g: s.nutriscore.toUpperCase() }), ...(h.nova && h.nova.group ? [t(`hsum.nova${h.nova.group}`)] : []),
    risky ? tn("hsum.add", risky) : t("hsum.add0"), ...(h.organic ? [t("hsum.bio")] : [])] : [];
  const lead = s ? <Txt><Text style={{ fontWeight: "800" }}>{t(`grade.${s.grade}`)}</Text> : {bits.join(", ")}.</Txt> : <Txt>{t("detail.health_none")}</Txt>;
  const parts = s ? [["nutrition", 55, "#1E8F4E"], ["additives", 25, "#3F79B5"], ["nova", 10, "#E0912A"], ["bio", 10, isDark() ? "#A68BEB" : "#7B5BC9"]] : [];
  return (
    <Section title={t("detail.health")} sub={t("detail.per", { u: t(h.nutrition.drink ? "unit.100ml" : "unit.100g") })}>
      {lead}
      {s ? (
        <View style={{ gap: 8, direction: "ltr" }}>
          <View style={{ flexDirection: "row", gap: 4, height: 8 }}>
            {parts.map(([id, max, c]) => (
              <View key={id} style={{ flex: max, backgroundColor: C.tint2, borderRadius: 4, overflow: "hidden" }}>
                <View style={{ width: `${(s.parts[id] / max) * 100}%`, height: "100%", backgroundColor: c }} />
              </View>
            ))}
          </View>
          <View style={{ flexDirection: dir().row, flexWrap: "wrap", columnGap: 14, rowGap: 4 }}>
            {parts.map(([id, max, c]) => (
              <Row key={id} gap={5}><View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c }} /><Text style={{ fontSize: 12.5, color: C.muted }}>{t(`bd.${id}`)} <Text style={{ color: C.fg, fontWeight: "800" }}>{s.parts[id]}</Text>/{max}</Text></Row>
            ))}
          </View>
        </View>
      ) : null}
      {s && s.nutriscore && "abcde".includes(s.nutriscore) ? (
        <View style={{ gap: 6 }}>
          <Txt style={{ fontWeight: "800", fontSize: 15 }}>Nutri-Score</Txt>
          <View style={{ flexDirection: "row", gap: 4, alignItems: "center", direction: "ltr" }}>
            {[["a", "#038141"], ["b", "#85BB2F"], ["c", "#F6B800"], ["d", "#EE8100"], ["e", "#E63E11"]].map(([l, c]) => {
              const on = l === s.nutriscore;
              return <View key={l} style={{ flex: on ? 1.25 : 1, paddingVertical: on ? 8 : 5, borderRadius: 9, backgroundColor: on ? c : c + "66", alignItems: "center",
                shadowColor: c, shadowOpacity: on ? 0.5 : 0, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } }}><Text style={{ color: "#fff", fontWeight: "800", fontSize: on ? 16 : 12, opacity: on ? 1 : 0.85 }}>{l.toUpperCase()}</Text></View>;
            })}
          </View>
        </View>
      ) : null}
      {neg.length || risky ? (
        <View>
          <Label style={{ marginTop: 6 }}>{t("detail.defects")}</Label>
          {neg.map((n) => <NutRow key={n.id} n={n} />)}
          {risky ? <AdditivesRow count={risky} /> : null}
        </View>
      ) : null}
      {pos.length || !risky ? (
        <View>
          <Label style={{ marginTop: 6 }}>{t("detail.qualities")}</Label>
          {pos.map((n) => <NutRow key={n.id} n={n} />)}
          {!risky ? <AdditivesRow count={0} /> : null}
        </View>
      ) : null}
      {!hasNut ? <Muted>{t("detail.nut_missing")}</Muted> : null}
      {s || hasNut ? <SourceLine ids={["nutriscore", "fsa"]} /> : null}
    </Section>
  );
}

function WatchSection({ p }) {
  const h = p.health;
  if (!h || !h.additives.length) return null;
  return (
    <Section title={t("detail.watch")} sub={String(h.additives.length)}>
      {h.additives.map((a) => (
        <Expand
          key={a.code}
          head={
            <Row style={{ justifyContent: "space-between" }}>
              <Txt style={{ fontWeight: "700", flex: 1 }}>{a.code} · {t(`addname.${a.code.toLowerCase()}`)}</Txt>
              <Pill text={t(`risk.${a.level}`)} colors={RISK_COLORS[a.level]} />
            </Row>
          }
        >
          <Muted>{t(`risk.reason.${a.key}`)}</Muted>
          <SourceLine ids={RISK_SOURCES[a.key]} />
        </Expand>
      ))}
    </Section>
  );
}

function AltCard({ a, onOpen }) {
  return (
    <Pressable onPress={() => onOpen(a.code)} style={({ pressed }) => ({ width: 150, borderRadius: R.lg, padding: 12, gap: 6, backgroundColor: pressed ? C.tint2 : C.tint })}>
      {a.image ? (
        <Image source={{ uri: a.image }} style={{ width: "100%", height: 96, borderRadius: 12, backgroundColor: "#fff" }} resizeMode="contain" />
      ) : (
        <View style={{ width: "100%", height: 96, borderRadius: 12, backgroundColor: "#fff" }} />
      )}
      <Txt style={{ fontWeight: "700", fontSize: 14, lineHeight: 18 }} numberOfLines={2}>{nameOf(a)}</Txt>
      {a.brand ? <Muted style={{ fontSize: 12, lineHeight: 16 }} numberOfLines={1}>{a.brand}</Muted> : null}
      <StatusPill status={verdictOf(a).status} />
      <MiniScore p={a} />
    </Pressable>
  );
}

function AlternativesSection({ p, onOpen }) {
  const [state, setState] = useState({ loading: true, list: [], error: false });
  useEffect(() => {
    let alive = true;
    setState({ loading: true, list: [], error: false });
    fetchAlternatives(p)
      .then((list) => alive && setState({ loading: false, list, error: false }))
      .catch(() => alive && setState({ loading: false, list: [], error: true }));
    return () => {
      alive = false;
    };
  }, [p.code]);
  if (!state.loading && (state.error || !state.list.length)) return null;
  return (
    <Panel><Section title={t("detail.alternatives")} sub={t("detail.alt_sub")}>
      {state.loading ? (
        <Loading text={t("detail.alt_loading")} />
      ) : state.error ? (
        <Muted>{t("detail.alt_error")}</Muted>
      ) : state.list.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, flexDirection: dir().row }}>
          {state.list.map((a) => <AltCard key={a.code} a={a} onOpen={onOpen} />)}
        </ScrollView>
      ) : (
        <Muted>{t(p.categories && p.categories.length ? "detail.alt_none" : "detail.alt_nocat")}</Muted>
      )}
    </Section></Panel>
  );
}

function AllAdditivesSection({ p, v }) {
  if (!p.raw || p.local) return null;
  const keys = [...new Set((p.raw.additives_tags || []).map((tag) => String(tag).replace(/^\w+:/, "").toLowerCase()))].filter((k) => /^e\d{3,4}[a-z]*$/.test(k));
  if (!keys.length) {
    return (
      <Section title={t("detail.all_additives")}>
        <Muted>{t("detail.add_none")}</Muted>
      </Section>
    );
  }
  const baseOf = (k) => k.match(/^e\d+/)[0];
  const shown = keys.filter((k) => !(k === baseOf(k) && keys.some((o) => o !== k && baseOf(o) === k)));
  return (
    <Section title={t("detail.all_additives")} sub={String(shown.length)}>
      {shown.map((k) => {
        const flag = v.flags.find((f) => f.id === k || f.id === baseOf(k));
        const risk = ((p.health && p.health.additives) || []).find((a) => a.code.toLowerCase() === k || a.code.toLowerCase() === baseOf(k));
        const name = risk ? t(`addname.${risk.code.toLowerCase()}`) : flag ? flagLabel(flag).replace(/^E\w+ · /, "") : "";
        return (
          <View key={k} style={{ gap: 6, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.line }}>
            <Row>
              <Text style={{ fontWeight: "800", color: C.fg, minWidth: 54 }}>{k.toUpperCase()}</Text>
              <Txt style={{ flex: 1, fontSize: 15 }}>{name}</Txt>
            </Row>
            <Row gap={6} style={{ flexWrap: "wrap" }}>
              {flag ? <Pill text={`${t("detail.halal")} · ${t(`sev.${flag.severity}`)}`} colors={SEV_COLORS[flag.severity]} /> : null}
              {risk ? <Pill text={t(`risk.short.${risk.level}`)} colors={RISK_COLORS[risk.level]} /> : null}
              {!flag && !risk ? <Muted style={{ fontSize: 13 }}>{t("detail.add_ok")}</Muted> : null}
            </Row>
          </View>
        );
      })}
    </Section>
  );
}

function ExtraSections({ p }) {
  const h = p.health;
  if (!h || p.local || h.cosmetic) return null;
  const tags = h.allergenTags || [];
  const labels = tags.length ? tags.map((a) => t(`allergen.${a}`)) : h.allergens || [];
  return (
    <>
      <Section title={t("detail.allergens")}>
        {labels.length ? (
          <Row gap={8} style={{ flexWrap: "wrap" }}>
            {labels.map((a) => (
              <View key={a} style={{ backgroundColor: C.tint, borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12 }}>
                <Text style={{ fontWeight: "700", color: C.fg }}>{a}</Text>
              </View>
            ))}
          </Row>
        ) : (
          <Muted>{t("detail.allergens_none")}</Muted>
        )}
      </Section>
      {h.nova ? (
        <Section title={t("detail.nova")} sub={t("detail.nova_sub")}>
          <Row gap={14} style={{ alignItems: "flex-start" }}>
            <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: NOVA_COLORS[h.nova.group], alignItems: "center", justifyContent: "center" }}>
              <Text style={{ color: "#fff", fontWeight: "800", fontSize: 22 }}>{h.nova.group}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Txt style={{ fontWeight: "800" }}>{t(`nova.${h.nova.group}.t`)}</Txt>
              <Muted>{t(`nova.${h.nova.group}.p`)}</Muted>
            </View>
          </Row>
        </Section>
      ) : null}
    </>
  );
}

function LinkRow({ text, url, muted = false }) {
  return (
    <Pressable onPress={() => open(url)} style={{ paddingVertical: 8 }}>
      <Txt style={{ color: muted ? C.muted : C.brand, fontWeight: "700", fontSize: muted ? 14 : 16 }}>{text}</Txt>
    </Pressable>
  );
}

// Onglet ouvert, gardé d'un produit à l'autre (comme la version web)
let lastTab = "halal";
function ProductBody({ p, onOpen, onGotoSettings, onGotoProfile, onOcr }) {
  const v = verdictOf(p);
  const kind = kindOf(p);
  const food = kind === "food";
  const s = scoreOf(p);
  const [tab, setTabState] = useState(lastTab);
  const setTab = (x) => { lastTab = x; setTabState(x); };
  if (typeof window !== "undefined" && window.__bayyin) window.__bayyin.sheetTab = setTab; // captures automatiques (web)
  const st = getSettings();
  const report = isBarcode(p.code)
    ? "https://github.com/agozel5/bayyin/issues/new?title=" +
      encodeURIComponent(t("report.title", { name: nameOf(p), code: p.code, status: S(v.status, "label"), school: t(`school.${st.school}`), url: p.offUrl || "" })) +
      "&body=" +
      encodeURIComponent(t("report.body", { name: nameOf(p), code: p.code, status: S(v.status, "label"), school: t(`school.${st.school}`), url: p.offUrl || "" }))
    : null;
  const notes = [...(p.local ? [t("detail.local")] : []), ...v.notes.map(noteText)];
  const halal = (
    <Panel>
      <Chain p={p} v={v} />
      <CertCard v={v} />
      {notes.map((n, i) => <Muted key={i}>{n}</Muted>)}
      <Reader p={p} v={v} onGotoSettings={onGotoSettings} />
      {v.flags.length ? <View style={{ gap: 10 }}>{v.flags.map((f, i) => <FlagCard2 key={f.id + i} f={f} onGotoSettings={onGotoSettings} />)}</View> : null}
      {v.status === "inconnu" && isBarcode(p.code) && food ? <Btn title={t("detail.photo_ingredients")} icon="doc" onPress={() => onOcr(p.code)} /> : null}
      <Disclaimer />
    </Panel>
  );
  const health = food ? (
    <View style={{ gap: 14 }}>
      <Panel><HealthSection p={p} /></Panel>
      <WatchSection p={p} />
      <Panel><ExtraSections p={p} /></Panel>
    </View>
  ) : kind === "medicine" ? <Panel><MedicineSection p={p} /></Panel> : kind === "beauty" ? <Panel><CosmeticSection p={p} /></Panel> : null;
  const compo = (
    <View style={{ gap: 14 }}>
      {food ? <Panel><CompositionAdditives p={p} onGotoSettings={onGotoSettings} /></Panel> : null}
      {kind === "beauty" ? <Panel><CosmeticIngredients p={p} /></Panel> : null}
      {p.ingredients && !food && kind !== "beauty" ? <Panel><Section title={t("detail.ingredients")}><Muted>{p.ingredients.replace(/_/g, "")}</Muted></Section></Panel> : null}
    </View>
  );
  const tabs = [
    { id: "halal", label: t("detail.halal"), mark: <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: VERDICT_DOT(v.status) }} />, el: halal },
    health ? { id: "health", label: t(food ? "detail.health" : kind === "beauty" ? "detail.cosmetic_tab" : "kind.medicine"), mark: s ? <View style={{ paddingHorizontal: 7, paddingVertical: 1, borderRadius: 99, backgroundColor: GRADE_COLORS[s.grade] }}><Text style={{ color: "#fff", fontSize: 12, fontWeight: "800" }}>{s.score}</Text></View> : null, el: health } : null,
    food || (kind === "beauty" && p.ingredients) ? { id: "compo", label: t("detail.compo_tab"), mark: null, el: compo } : null,
    // Environnement : chargé à l'ouverture de l'onglet (aliments d'Open Food Facts seulement)
    food && !p.local && isBarcode(p.code) ? { id: "planet", label: t("env.tab"), mark: null, el: <Panel><PlanetSection p={p} /></Panel> } : null,
  ].filter(Boolean);
  const cur = tabs.some((x) => x.id === tab) ? tab : "halal";
  return (
    <View style={{ gap: 14 }}>
      <FadeIn><Top2 p={p} /></FadeIn>
      <FadeIn delay={40}><ProfileAlert p={p} onGotoProfile={onGotoProfile} /></FadeIn>
      <RecallBox p={p} />
      <FadeIn delay={60}><VerdictHero p={p} v={v} /></FadeIn>
      {kind !== "medicine" ? <FadeIn delay={90}><Confidence p={p} v={v} /></FadeIn> : null}
      <SheetTabs tabs={tabs} cur={cur} onTab={setTab} />
      <FadeIn key={cur} distance={6}>{tabs.find((x) => x.id === cur).el}</FadeIn>
      {!p.local && food ? <AlternativesSection p={p} onOpen={onOpen} /> : null}
      <Panel gap={6}>
        {p.local ? (
          isBarcode(p.code) ? <LinkRow text={t("msg.add_off")} url={`https://world.openfoodfacts.org/cgi/product.pl?type=add&code=${p.code}`} /> : null
        ) : p.offUrl ? (
          <LinkRow text={t(kind === "medicine" ? "detail.med_link" : kind === "beauty" ? "detail.obf_link" : "detail.off_link")} url={p.offUrl} />
        ) : null}
        {report ? <LinkRow text={t("detail.report")} url={report} muted /> : null}
      </Panel>
    </View>
  );
}
const VERDICT_DOT = (st) => ({ halal_certifie: "#169B57", halal_probable: "#3E8A49", mashbouh: "#EE8A1F", haram: "#E0423A", inconnu: "#97A39C" })[st];

// ---------------------------------------------------------------------------
// Fiche complète (chargement, en-tête, favoris, partage)
// ---------------------------------------------------------------------------
function SheetSkeleton() {
  return (
    <View style={{ gap: 18 }} accessible accessibilityLabel={t("msg.loading")}>
      <Row gap={14}>
        <Skeleton width={84} height={84} radius={16} />
        <View style={{ flex: 1, gap: 10 }}>
          <Skeleton height={22} width="85%" />
          <Skeleton height={16} width="50%" />
        </View>
      </Row>
      <View style={{ flexDirection: "row", gap: 10 }}>
        <Skeleton height={128} radius={R.lg} style={{ flex: 1 }} width={null} />
        <Skeleton height={128} radius={R.lg} style={{ flex: 1 }} width={null} />
      </View>
      <Skeleton height={20} width="40%" />
      <Skeleton height={14} />
      <Skeleton height={14} width="90%" />
      <Skeleton height={70} radius={R.md} />
      <Skeleton height={70} radius={R.md} />
    </View>
  );
}

export default function ProductSheet({ code, product, fromScan, onClose, onOpen, onScanAgain, onOcr, onGotoSettings, onGotoProfile, toast }) {
  const insets = useSafeAreaInsets();
  const [state, setState] = useState(() =>
    product ? { p: product, loading: false } : { p: null, loading: true }
  );
  const [, setTick] = useState(0);

  useEffect(() => subscribe(() => setTick((n) => n + 1)), []);

  useEffect(() => {
    if (product) {
      setState({ p: product, loading: false });
      return;
    }
    let alive = true;
    const saved = getEntry(code);
    if (saved && saved.p && saved.p.health && !fromScan) {
      // Fiche déjà vue : affichée tout de suite, puis rafraîchie
      setState({ p: saved.p, loading: false });
    } else {
      setState({ p: null, loading: true });
    }
    fetchProduct(code)
      .then((p) => {
        if (!alive) return;
        if (!p) {
          haptic.warn();
          return setState({ notFound: true, loading: false });
        }
        setState({ p, loading: false });
        addToHistory(p);
        const st = verdictOf(p).status;
        countScan(st);
        const alert = profileOf(p).alert;
        if (fromScan) (st === "haram" || alert === "no" ? haptic.error : st === "mashbouh" || alert ? haptic.warn : haptic.success)();
        announce(`${nameOf(p)}. ${t("detail.halal")} : ${S(st, "label")}`);
      })
      .catch((err) => {
        if (!alive) return;
        setState((s) => (s.p ? s : { error: err, loading: false }));
      });
    return () => {
      alive = false;
    };
  }, [code, product]);

  const p = state.p;
  const entry = p && getEntry(p.code);
  const fav = !!(entry && entry.fav);

  const onFav = () => {
    if (!p) return;
    if (!getEntry(p.code)) addToHistory(p);
    const on = toggleFav(p.code);
    on ? haptic.success() : haptic.tap();
    toast && toast(t(on ? "sheet.fav_added" : "sheet.fav_removed"));
  };
  // Partage : une image du verdict (carte), ou le texte quand l'image n'est pas possible
  const cardRef = useRef(null);
  const [card, setCard] = useState(false);
  if (typeof window !== "undefined" && window.__bayyin) window.__bayyin.shareCard = setCard; // captures automatiques (web)
  const onShare = async () => {
    if (!p) return;
    haptic.light();
    const s = scoreOf(p);
    const text = t("sheet.share_text", { name: nameOf(p), status: S(verdictOf(p).status, "label"), health: s ? t(kindOf(p) === "beauty" ? "sheet.share_cosmetic" : "sheet.share_health", { n: s.score }) : "" });
    const link = isBarcode(p.code) ? `\n${shareUrl(p.code)}` : "";
    if (Platform.OS !== "web") {
      try {
        setCard(true);
        await new Promise((r) => setTimeout(r, 700)); // le temps d'afficher la photo du produit
        const { captureRef } = require("react-native-view-shot");
        const Sharing = require("expo-sharing");
        const uri = await captureRef(cardRef, { format: "png", quality: 1, width: 1080, height: 1920, result: "tmpfile" });
        setCard(false);
        if (await Sharing.isAvailableAsync()) return await Sharing.shareAsync(uri, { mimeType: "image/png", UTI: "public.png", dialogTitle: nameOf(p) });
      } catch { setCard(false); }
    }
    Share.share({ message: text + link }).catch(() => {});
  };

  const headBtn = { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center" };
  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
      <View style={{ flexDirection: dir().row, alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 6 }}>
        <Pressable onPress={onClose} style={headBtn} accessibilityRole="button" accessibilityLabel={t("sheet.back")} hitSlop={6}>
          <Icon name="back" size={22} flip={dir().rtl} />
        </Pressable>
        <Txt style={{ flex: 1, fontWeight: "800", fontSize: 17 }} numberOfLines={1}>
          {p ? nameOf(p) : state.notFound ? t("msg.notfound.t") : t("sheet.title")}
        </Txt>
        {p && isBarcode(p.code) ? (
          <Pressable onPress={onShare} style={headBtn} accessibilityRole="button" accessibilityLabel={t("sheet.share")} hitSlop={6}>
            <Icon name="share" size={20} />
          </Pressable>
        ) : null}
        {p ? (
          <Pressable onPress={onFav} style={headBtn} accessibilityRole="button" accessibilityState={{ selected: fav }} accessibilityLabel={t(fav ? "sheet.fav_remove" : "sheet.fav_add")} hitSlop={6}>
            <Icon name="star" size={21} color={fav ? "#E9A100" : C.fg} fill={fav ? "#E9A100" : "none"} />
          </Pressable>
        ) : null}
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 6, paddingBottom: 30 + insets.bottom }}>
        {state.loading ? (
          <SheetSkeleton />
        ) : state.notFound ? (
          isMedicineCode(code) ? (
            <Message title={t("msg.notfound.t")} text={t("msg.med_notfound", { code })} />
          ) : (
            <Message title={t("msg.notfound.t")} text={t("msg.notfound.p", { code })}>
              <Btn title={t("detail.photo_ingredients")} icon="doc" onPress={() => onOcr(code)} />
            </Message>
          )
        ) : state.error ? (
          <Message title={t("msg.load_error.t")} text={errorText(state.error)}>
            <Btn title={t("msg.retry")} onPress={() => onOpen(code)} />
            <Btn title={t("detail.photo_ingredients")} icon="doc" kind="white" onPress={() => onOcr(code)} />
          </Message>
        ) : p ? (
          <ProductBody p={p} onOpen={onOpen} onGotoSettings={onGotoSettings} onGotoProfile={onGotoProfile} onOcr={onOcr} />
        ) : null}
      </ScrollView>

      {card && p ? (
        // hors de l'écran pour le partage ; au centre pour les captures de contrôle (web)
        <View pointerEvents="none" style={Platform.OS === "web" ? { position: "absolute", top: 70, left: 0, right: 0, alignItems: "center" } : { position: "absolute", top: 0, left: -SHARE_W * 3 }}>
          <ShareCard ref={cardRef} p={p} />
        </View>
      ) : null}
      {fromScan ? (
        <View style={{ padding: 12, paddingBottom: 12 + insets.bottom, backgroundColor: C.bg }}>
          <Btn title={t("sheet.scan_again")} icon="scan" onPress={onScanAgain} />
        </View>
      ) : null}
    </View>
  );
}
