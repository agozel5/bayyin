// Pièces de la fiche produit, au design de la version web : en-tête, bandeau du verdict,
// fiabilité, chaîne de vérification, étiquette surlignée, points relevés, onglets.
import React, { useState } from "react";
import { View, Text, Pressable, Image, Linking } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { Glyph, Tile } from "./Art";
import { Khatam, Thumb, STATUS_GLYPH } from "./Cards";
import { Txt, Muted, Row } from "./ui";
import { C, R, VERDICT, GRADE_COLORS, SEV_COLORS, RISK_COLORS, mix, dir, lift, isDark } from "../theme";
import { t, tn } from "../i18n";
import { getSettings } from "../storage";
import { S, nameOf, scoreOf, kindOf, flagLabel, flagReason } from "../view";
import { verdictConfidence } from "../../../public/lib/confidence.js";
import { readLabel } from "../../../public/lib/highlight.js";
import { normQuantity } from "../../../public/lib/off.js";
import { haptic } from "../motion";

const open = (url) => Linking.openURL(url).catch(() => {});

// ---------- en-tête : photo, nom, marque · quantité, code ----------
export function Top({ p }) {
  const meta = [p.brand, normQuantity(p.quantity)].filter(Boolean).join(" · ");
  return (
    <Row gap={14} style={{ alignItems: "center" }}>
      <View style={[{ borderRadius: 20, backgroundColor: p.image ? "#fff" : C.artBg, padding: p.image ? 6 : 0 }, lift()]}>
        <Thumb p={p} size={p.image ? 96 : 108} radius={16} />
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <Txt style={{ fontSize: 22, lineHeight: 27, fontWeight: "800", letterSpacing: -0.3 }} numberOfLines={3}>{nameOf(p)}</Txt>
        {meta ? <Muted numberOfLines={1}>{meta}</Muted> : null}
        {/^\d+$/.test(p.code) ? <Text style={{ color: C.faint, fontSize: 13, fontVariant: ["tabular-nums"], letterSpacing: 0.5, textAlign: dir().ta }}>{p.code}</Text> : null}
      </View>
    </Row>
  );
}

// ---------- anneau de la note sur 100 ----------
function Ring({ score, color, size = 50 }) {
  const r = (size - 7) / 2, c = 2 * Math.PI * r;
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} style={{ position: "absolute", transform: [{ rotate: "-90deg" }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={mix(color, isDark() ? "#141B17" : "#FFFFFF", 0.22)} strokeWidth={5} fill="none" />
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={5} fill="none" strokeLinecap="round" strokeDasharray={`${(c * (score || 0)) / 100} ${c}`} />
      </Svg>
      <Text style={{ fontSize: 15, fontWeight: "800", color: C.fg, fontVariant: ["tabular-nums"] }}>{score ?? "?"}</Text>
      <Text style={{ fontSize: 9, color: C.muted, marginTop: -2 }}>/100</Text>
    </View>
  );
}

// ---------- bandeau du verdict, avec la note santé en dessous ----------
export function VerdictHero({ p, v }) {
  const s = scoreOf(p);
  const kind = kindOf(p);
  const vc = VERDICT[v.status];
  const school = getSettings().school;
  const kicker = t("detail.kicker", { s: t(`school.${school}`) });
  const gc = s ? GRADE_COLORS[s.grade] : null;
  const footBg = gc ? mix(gc, C.surface, isDark() ? 0.2 : 0.15) : C.surface;
  return (
    <View accessibilityRole="summary" accessibilityLabel={`${S(v.status, "label")}. ${S(v.status, "lead")}`}
      style={{ borderRadius: R.xl, overflow: "hidden", backgroundColor: vc, shadowColor: vc, shadowOpacity: isDark() ? 0 : 0.35, shadowRadius: 16, shadowOffset: { width: 0, height: 10 }, elevation: 5 }}>
      <View style={{ padding: 18, paddingBottom: 20, flexDirection: dir().row, gap: 16, alignItems: "center" }}>
        <Khatam opacity={0.2} />
        <View style={{ width: 68, height: 68, borderRadius: 34, backgroundColor: "rgba(255,255,255,0.95)", alignItems: "center", justifyContent: "center" }}>
          <Glyph paths={STATUS_GLYPH[v.status]} size={34} color={vc} width={2.8} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Txt style={{ color: "rgba(255,255,255,0.9)", fontSize: 13, fontWeight: "600" }}>{kicker}</Txt>
          <Txt style={{ color: "#fff", fontSize: 27, lineHeight: 31, fontWeight: "800", letterSpacing: -0.4 }}>{S(v.status, "label")}</Txt>
          <Txt style={{ color: "rgba(255,255,255,0.92)", fontSize: 14.5, lineHeight: 20 }}>{S(v.status, "lead")}</Txt>
        </View>
      </View>
      {kind !== "medicine" ? (
        <View style={{ flexDirection: dir().row, alignItems: "center", gap: 12, paddingHorizontal: 18, paddingVertical: 12, backgroundColor: footBg,
          borderTopWidth: gc ? 1 : 0, borderTopColor: gc ? mix(gc, C.surface, 0.35) : "transparent" }}>
          <Ring score={s ? s.score : null} color={gc || C.faint} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: C.muted, fontSize: 13, textAlign: dir().ta }}>{t(kind === "beauty" ? "detail.cosmetic" : "detail.health")}</Text>
            <Text style={{ color: gc ? mix(gc, C.fg, 0.75) : C.fg, fontSize: 17, fontWeight: "800", textAlign: dir().ta }}>
              {s ? t(`grade.${s.grade}`) : t(kind === "beauty" ? "detail.cosmetic_none_short" : "detail.not_rated")}
            </Text>
          </View>
          {gc ? <View style={{ width: 11, height: 11, borderRadius: 6, backgroundColor: gc, shadowColor: gc, shadowOpacity: 0.9, shadowRadius: 6, shadowOffset: { width: 0, height: 0 } }} /> : null}
        </View>
      ) : null}
    </View>
  );
}

// ---------- fiabilité du verdict ----------
export function Confidence({ p, v }) {
  const [openC, setOpen] = useState(false);
  const c = verdictConfidence(p, v);
  const bars = { high: 3, medium: 2, low: 1 }[c.level];
  const col = { high: C.cert, medium: C.doubt, low: C.haram }[c.level];
  return (
    <View style={[{ borderRadius: R.lg, backgroundColor: C.surface }, lift()]}>
      <Pressable onPress={() => { haptic.tap(); setOpen(!openC); }} accessibilityRole="button" accessibilityState={{ expanded: openC }}
        style={{ flexDirection: dir().row, alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 14 }}>
        <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 3 }}>
          {[1, 2, 3].map((i) => <View key={i} style={{ width: 5, height: 6 + i * 4, borderRadius: 2, backgroundColor: i <= bars ? col : C.tint2 }} />)}
        </View>
        <Text style={{ flex: 1, color: C.fg, fontSize: 15, textAlign: dir().ta }}>{t("conf.title")} : <Text style={{ fontWeight: "800" }}>{t(`conf.${c.level}`)}</Text></Text>
        <View style={{ transform: [{ rotate: openC ? "90deg" : dir().rtl ? "180deg" : "0deg" }] }}><Glyph name="chev" size={18} color={C.faint} /></View>
      </Pressable>
      {openC ? (
        <View style={{ paddingHorizontal: 16, paddingBottom: 14, gap: 8 }}>
          {c.reasons.map((r) => (
            <Row key={r.id} gap={10} style={{ alignItems: "flex-start" }}>
              <Glyph name={r.ok ? "check" : "dash"} size={18} color={r.ok ? C.cert : C.faint} width={2.4} />
              <Txt style={{ flex: 1, fontSize: 14.5, lineHeight: 20 }}>{t(`conf.r.${r.id}${r.ok ? "" : "_no"}`)}</Txt>
            </Row>
          ))}
          <Muted style={{ fontSize: 13.5, lineHeight: 19 }}>{t(`conf.${c.level}.p`)}</Muted>
        </View>
      ) : null}
    </View>
  );
}

// ---------- onglets de la fiche ----------
export function SheetTabs({ tabs, cur, onTab }) {
  return (
    <View style={[{ flexDirection: dir().row, padding: 4, borderRadius: 18, backgroundColor: C.surface, gap: 2 }, lift()]} accessibilityRole="tablist">
      {tabs.map((x) => {
        const on = x.id === cur;
        return (
          <Pressable key={x.id} onPress={() => { haptic.tap(); onTab(x.id); }} accessibilityRole="tab" accessibilityState={{ selected: on }}
            style={{ flex: x.id === "compo" ? 1.35 : 1, flexDirection: dir().row, alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, borderRadius: 14, backgroundColor: on ? C.tint2 : "transparent" }}>
            {x.mark}
            <Text numberOfLines={1} maxFontSizeMultiplier={1.2} style={{ fontSize: 14, fontWeight: on ? "800" : "600", color: on ? C.fg : C.muted }}>{x.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ---------- chaîne de vérification : ingrédients, origine, additifs, label ----------
const CHAIN_ICO = {
  ing: '<path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4M10 12h5M10 16h5"/>',
  origin: '<path d="M8 4c0 3 1 4 4 4s4-1 4-4"/><path d="M6 10c0 6 2.5 10 6 10s6-4 6-10"/><path d="M10 14h4"/>',
  add: '<path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3"/><path d="M7.5 15h9"/>',
  cert: '<path d="M12 3l7 3v5c0 4.5-3 8.2-7 10-4-1.8-7-5.5-7-10V6z"/><path d="M9 12l2 2 4-4"/>',
};
const MARK = { ok: '<path d="M5 12.5l4.5 4.5L19 7.5"/>', bad: '<path d="M7 7l10 10M17 7L7 17"/>', warn: '<path d="M12 7v6"/><path d="M12 17h.01"/>', na: '<path d="M7 12h10"/>', none: '<path d="M7 12h10"/>' };
export function chainSteps(p, v) {
  const hasList = !!(p.ingredients || (p.raw && (p.raw.additives_tags || []).length)) || v.flags.length > 0;
  const step = (id, list) => {
    if (!hasList) return { id, state: "na", sub: t("chain.na") };
    const bad = list.filter((f) => f.severity === "haram"), doubt = list.filter((f) => f.severity === "mashbouh");
    const worst = bad.length ? bad : doubt;
    if (worst.length) return { id, state: bad.length ? "bad" : "warn", sub: flagLabel(worst[0]) + (worst.length > 1 ? ` +${worst.length - 1}` : "") };
    if (list.some((f) => f.covered)) return { id, state: "ok", sub: t("chain.covered") };
    return { id, state: "ok", sub: t("chain.ok") };
  };
  const cert = v.certification
    ? { id: "cert", state: "ok", sub: v.certification.organisme || t("detail.certified") }
    : v.certIgnored ? { id: "cert", state: "warn", sub: t("chain.cert_ignored") } : { id: "cert", state: "none", sub: t("chain.cert_none") };
  return [
    hasList ? { id: "ing", state: "ok", sub: t("chain.ing_ok") } : { id: "ing", state: "na", sub: t("chain.ing_none") },
    step("origin", v.flags.filter((f) => !f.code)),
    step("add", v.flags.filter((f) => f.code)),
    cert,
  ];
}
export function Chain({ p, v }) {
  if (kindOf(p) === "medicine") return null;
  const steps = chainSteps(p, v);
  const col = (s) => ({ ok: C.cert, bad: C.haram, warn: C.doubt, na: C.faint, none: C.faint })[s];
  return (
    <View style={{ flexDirection: dir().row, backgroundColor: C.tint, borderRadius: R.lg, paddingVertical: 14, paddingHorizontal: 6 }}
      accessibilityLabel={steps.map((s) => `${t(`chain.s.${s.id}`)} : ${s.sub}`).join(" · ")}>
      {steps.map((s, i) => (
        <View key={s.id} style={{ flex: 1, alignItems: "center", gap: 6 }}>
          {i ? <View style={{ position: "absolute", top: 21, [dir().rtl ? "left" : "right"]: "50%", width: "100%", height: 3, borderRadius: 2,
            backgroundColor: steps[i - 1].state === "ok" && s.state !== "na" && s.state !== "none" ? col(s.state) : C.tint2 }} /> : null}
          <View style={{ width: 44, height: 44, borderRadius: 22, borderWidth: 2.5, borderColor: col(s.state), backgroundColor: C.surface, alignItems: "center", justifyContent: "center" }}>
            <Glyph paths={CHAIN_ICO[s.id]} size={21} color={col(s.state)} />
            <View style={{ position: "absolute", bottom: -4, [dir().rtl ? "left" : "right"]: -4, width: 20, height: 20, borderRadius: 10, backgroundColor: col(s.state), borderWidth: 2, borderColor: C.tint, alignItems: "center", justifyContent: "center" }}>
              <Glyph paths={MARK[s.state]} size={12} color="#fff" width={3} />
            </View>
          </View>
          <Text numberOfLines={1} style={{ fontSize: 12.5, fontWeight: "800", color: C.fg }}>{t(`chain.s.${s.id}`)}</Text>
          <Text numberOfLines={2} style={{ fontSize: 11.5, lineHeight: 14, color: s.state === "bad" || s.state === "warn" ? col(s.state) : C.muted, textAlign: "center", paddingHorizontal: 2 }}>{s.sub}</Text>
        </View>
      ))}
    </View>
  );
}

// ---------- un point relevé (ingrédient ou additif) ----------
export const sevColors = (sev) => SEV_COLORS[sev] || SEV_COLORS.info;
export function Pill2({ text, colors }) {
  return <View style={{ paddingHorizontal: 9, paddingVertical: 3, borderRadius: 99, backgroundColor: colors[1], alignSelf: "flex-start" }}><Text style={{ color: colors[0], fontSize: 12, fontWeight: "800" }}>{text}</Text></View>;
}
export function FlagCard({ f, onGotoSettings }) {
  const [fg] = sevColors(f.severity);
  return (
    <View style={{ borderRadius: R.md, padding: 14, gap: 6, backgroundColor: C.tint, borderStartWidth: 4, borderStartColor: fg }}>
      <Row style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
        <Txt style={{ flex: 1, fontWeight: "800", fontSize: 15.5 }}>{flagLabel(f)}</Txt>
        <Pill2 text={t(`sev.${f.severity}`)} colors={sevColors(f.severity)} />
      </Row>
      <Muted style={{ fontSize: 14.5, lineHeight: 20 }}>{flagReason(f)}</Muted>
      {f.covered ? <Muted style={{ fontSize: 13, fontStyle: "italic" }}>{t("detail.covered")}</Muted>
        : f.topic && f.decision ? (
          <Text style={{ fontSize: 13, color: C.muted, fontStyle: "italic", textAlign: dir().ta }}>
            {t("detail.by_setting", { topic: t(`topic.${f.topic}`), d: t(`decision.${f.decision}`).toLowerCase() })}{" "}
            <Text onPress={onGotoSettings} style={{ color: C.brand, fontWeight: "700", textDecorationLine: "underline", fontStyle: "normal" }}>{t("detail.change_setting")}</Text>
          </Text>
        ) : null}
      {f.source && !f.code ? <Text style={{ fontSize: 12.5, color: C.faint, textAlign: dir().ta }}>{t("detail.found_in", { s: f.source })}</Text> : null}
    </View>
  );
}

// ---------- ce que dit l'étiquette : passages surlignés, explication au toucher ----------
const HL = { haram: () => [C.haram, isDark() ? "#4A1F1C" : "#FDE1DE"], mashbouh: () => [C.doubt, isDark() ? "#4A3416" : "#FFEBD1"], risk: () => [C.info, isDark() ? "#1B2C40" : "#E3EEFA"], info: () => [C.muted, C.tint2] };
export function Reader({ p, v, onGotoSettings }) {
  const [openI, setOpenI] = useState(null);
  const [more, setMore] = useState(false);
  if (!p.ingredients || kindOf(p) === "beauty") return null;
  const parts = readLabel(p.ingredients, { flags: v.flags, risks: (p.health && p.health.additives) || [] });
  const marks = parts.filter((x) => x.t === "hl");
  const long = p.ingredients.length > 380 && !more;
  let k = 0;
  const body = parts.map((x, idx) => {
    if (x.t === "text") return <Text key={idx}>{x.text}</Text>;
    if (x.t === "allergen") return <Text key={idx} style={{ fontWeight: "800" }}>{x.text}</Text>;
    const i = k++;
    const [fg, bg] = HL[x.kind]();
    return (
      <Text key={idx} onPress={() => { haptic.tap(); setOpenI(openI === i ? null : i); }} accessibilityRole="button"
        style={{ backgroundColor: bg, color: C.fg, textDecorationLine: "underline", textDecorationColor: fg, fontWeight: openI === i ? "800" : "600" }}>{x.text}</Text>
    );
  });
  const cur = openI != null ? marks[openI] : null;
  return (
    <View style={{ gap: 10 }}>
      <View>
        <Txt style={{ fontWeight: "800", fontSize: 17 }}>{t("reader.title")}</Txt>
        <Muted style={{ fontSize: 13.5 }}>{marks.length ? tn("reader.sum", marks.length) : t("reader.none")}</Muted>
      </View>
      <Txt numberOfLines={long ? 6 : undefined} style={{ fontSize: 16, lineHeight: 26 }}>{body}</Txt>
      {p.ingredients.length > 380 && !more ? <Pressable onPress={() => setMore(true)}><Text style={{ color: C.brand, fontWeight: "700", textAlign: dir().ta }}>{t("reader.more")}</Text></Pressable> : null}
      {cur ? (
        <View style={{ gap: 8 }}>
          {cur.flags.map((f) => <FlagCard key={f.id} f={f} onGotoSettings={onGotoSettings} />)}
          {cur.risk ? (
            <View style={{ borderRadius: R.md, padding: 14, gap: 6, backgroundColor: C.tint, borderStartWidth: 4, borderStartColor: RISK_COLORS[cur.risk.level][0] }}>
              <Row style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
                <Txt style={{ flex: 1, fontWeight: "800" }}>{String(cur.risk.code).toUpperCase()} · {t(`addname.${String(cur.risk.code).toLowerCase()}`)}</Txt>
                <Pill2 text={t(`risk.${cur.risk.level}`)} colors={RISK_COLORS[cur.risk.level]} />
              </Row>
              <Muted style={{ fontSize: 14.5, lineHeight: 20 }}>{t(`risk.reason.${cur.risk.key}`)}</Muted>
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

// ---------- label de certification ----------
export function CertCard({ v }) {
  if (!v.certification) return v.certIgnored ? (
    <Row gap={10} style={{ padding: 12, borderRadius: R.md, backgroundColor: C.tint }}><Glyph name="shield" size={18} color={C.muted} /><Muted style={{ flex: 1 }}>{t("certs.ignored", { org: v.certIgnored.organisme })}</Muted></Row>
  ) : null;
  const org = v.certification.organisme;
  return (
    <View style={{ borderRadius: R.md, padding: 14, gap: 6, backgroundColor: isDark() ? "#173A27" : "#E2F5EA", borderWidth: 1, borderColor: isDark() ? "#24563A" : "#BFE6CF" }}>
      <Row gap={8}><Glyph name="shield" size={19} color={C.cert} /><Txt style={{ flex: 1, fontWeight: "800", color: C.cert }}>{t("detail.certified")}{org ? ` · ${org}` : ""}</Txt></Row>
      <Muted style={{ fontSize: 13.5, lineHeight: 19 }}>{t("cert.unverified")}</Muted>
      <Text onPress={() => open(`https://duckduckgo.com/?q=${encodeURIComponent(`${org || ""} halal`)}`)} style={{ color: C.brand, fontWeight: "700", textDecorationLine: "underline", textAlign: dir().ta }}>
        {org ? t("cert.verify", { org }) : t("cert.verify_any")} ↗
      </Text>
    </View>
  );
}

export function Disclaimer() {
  return (
    <Row gap={8} style={{ alignItems: "flex-start", paddingTop: 4 }}>
      <Glyph name="shield" size={16} color={C.faint} />
      <Text style={{ flex: 1, color: C.faint, fontSize: 12.5, lineHeight: 17, textAlign: dir().ta }}>{t("detail.disclaimer")}</Text>
    </Row>
  );
}

// Carte blanche arrondie qui contient un onglet
export function Panel({ children, gap = 16 }) {
  return <View style={[{ backgroundColor: C.surface, borderRadius: R.xl, padding: 16, gap }, lift()]}>{children}</View>;
}
