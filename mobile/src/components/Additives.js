// Additifs : nom, fonction, picto d'origine, statut halal (selon le réglage) et risque santé,
// avec le détail qui s'ouvre au toucher. Même présentation que la version web (onglet Additifs et Composition).
import React, { useState } from "react";
import { View, Text, Pressable, Linking } from "react-native";
import { Art, Glyph } from "./Art";
import { Txt, Muted, Row } from "./ui";
import { Pill2 } from "./SheetParts";
import { C, R, SEV_COLORS, RISK_COLORS, dir } from "../theme";
import { t, tn, getLang } from "../i18n";
import { getSettings } from "../storage";
import { ADDITIVES, ADDITIVE_RISK, SEVERITY_OF, TOPIC_OF } from "../core";
import { ORIGIN_ART } from "../../../public/lib/rank-art.js";
import DB from "../../../public/data/additives.json";
import { haptic } from "../motion";
import { Chevron } from "./Reveal";
import { FadeIn } from "./ui";

const BY_CODE = new Map(DB.items.map((it) => [it.e.toLowerCase(), it]));
export const additiveItem = (k) => BY_CODE.get(k) || BY_CODE.get((k.match(/^e\d+/) || [k])[0]) || null;

export function eFunctions(it) {
  if (it.k && it.k.length) return it.k;
  const n = parseInt(it.e.slice(1), 10);
  if (n >= 100 && n < 200) return ["colour"];
  if (n >= 200 && n < 300) return ["preservative"];
  if (n >= 300 && n < 400) return ["antioxidant"];
  if (n >= 400 && n < 500) return ["thickener"];
  if (n >= 500 && n < 600) return ["acidity-regulator"];
  if (n >= 600 && n < 700) return ["flavour-enhancer"];
  if (n >= 950 && n < 970) return ["sweetener"];
  if (n >= 900 && n < 950) return ["glazing-agent"];
  return ["other"];
}
export const eOrigin = (it) => (it.g === "n" ? "animal" : it.v === "n" ? "animal_product" : it.v === "m" || it.g === "m" ? "maybe" : it.v === "y" ? "plant" : "unknown");
export function eHalal(code) {
  const a = ADDITIVES[code];
  if (!a) return { level: "ok" };
  const topics = getSettings().topics;
  if (a.group === "gras") return { level: SEVERITY_OF[topics.derives], reason: t("flag.fatty.reason"), topic: "derives" };
  return { level: TOPIC_OF[code] ? SEVERITY_OF[topics[TOPIC_OF[code]]] : a.severity, reason: t(`flag.${code}.reason`), topic: TOPIC_OF[code] };
}
export function eHealth(code, it) {
  const r = ADDITIVE_RISK[code];
  if (r) return { level: r.level, reason: t(`risk.reason.${r.key}`) };
  if (it && (it.r === "high" || it.r === "moderate")) return { level: "modere", reason: t("add.efsa_over") };
  return { level: null };
}
const originArt = (origin, code) => ORIGIN_ART[origin === "animal" && /^e(120|904)/.test(code) ? "insect" : origin];

// Données d'une ligne, à partir du code (e471, e322i…)
export function additiveRow(k) {
  const it = additiveItem(k);
  if (!it) return null;
  const base = (k.match(/^e\d+/) || [k])[0];
  let halal = eHalal(k);
  if (halal.level === "ok" && k !== base) halal = eHalal(base);
  let health = eHealth(it.e.toLowerCase(), it);
  if (!health.level && k !== base) health = eHealth(base, it);
  const raw = it.n[getLang()] || it.n.fr || it.n.en || "";
  return { it, code: k, label: it.e.replace(/[A-F]$/, (l) => l.toLowerCase()), name: raw.charAt(0).toUpperCase() + raw.slice(1), halal, health, origin: eOrigin(it), fns: eFunctions(it) };
}

const RISK_STEPS = () => [["none", "#3FB46B"], ["limite", "#D9B600"], ["modere", "#F0A23A"], ["eleve", "#E2533F"]];
function RiskScale({ level }) {
  const steps = RISK_STEPS();
  const i = steps.findIndex(([k]) => k === (level || "none"));
  return (
    <View style={{ flexDirection: "row", gap: 3, marginVertical: 4, direction: "ltr" }}>
      {steps.map(([k, c], j) => (
        <View key={k} style={{ flex: 1, paddingVertical: j === i ? 5 : 3, borderRadius: 7, backgroundColor: j === i ? c : c + "55", alignItems: "center" }}>
          <Text numberOfLines={1} style={{ fontSize: 11, fontWeight: "800", color: j === i ? "#fff" : C.fg, opacity: j === i ? 1 : 0.6 }}>{t(`risk.short.${k}`)}</Text>
        </View>
      ))}
    </View>
  );
}

export function AdditiveRow({ r, first, onGotoSettings }) {
  const [openR, setOpen] = useState(false);
  const fn = r.fns.map((k) => t(`fn.${k}`)).join(", ");
  const bad = r.halal.level === "haram" || r.halal.level === "mashbouh";
  const halalPill = bad ? <Pill2 text={t(`sev.${r.halal.level}`)} colors={SEV_COLORS[r.halal.level]} /> : null;
  const healthPill = r.health.level ? <Pill2 text={t(`risk.short.${r.health.level}`)} colors={RISK_COLORS[r.health.level]} /> : null;
  const art = originArt(r.origin, r.code);
  return (
    <View style={{ borderTopWidth: first ? 0 : 0.5, borderTopColor: C.line }}>
      <Pressable onPress={() => { haptic.tap(); setOpen(!openR); }} accessibilityRole="button" accessibilityState={{ expanded: openR }}
        accessibilityLabel={`${r.label} ${r.name}`} style={{ flexDirection: dir().row, alignItems: "center", gap: 10, paddingVertical: 12 }}>
        <View style={{ width: 36, height: 36, borderRadius: 11, backgroundColor: C.artBg, alignItems: "center", justifyContent: "center" }}>{art ? <Art xml={art} size={28} /> : null}</View>
        <View style={{ minWidth: 54, paddingHorizontal: 7, paddingVertical: 5, borderRadius: 9, backgroundColor: C.tint }}>
          <Text style={{ fontWeight: "700", fontSize: 13.5, color: C.fg, textAlign: "center", fontVariant: ["tabular-nums"] }}>{r.label}</Text>
        </View>
        <View style={{ flex: 1, gap: 1 }}>
          <Txt numberOfLines={2} style={{ fontWeight: "700", fontSize: 15, lineHeight: 19 }}>{r.name || r.label}</Txt>
          {fn || r.origin !== "plant" ? <Muted numberOfLines={2} style={{ fontSize: 12.5, lineHeight: 16 }}>{[fn, r.origin !== "plant" ? t(`add.origin.${r.origin}`) : ""].filter(Boolean).join(" · ")}</Muted> : null}
        </View>
        <View style={{ alignItems: "flex-end", gap: 4 }}>
          {halalPill}{healthPill}
          {!halalPill && !healthPill ? <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: C.brandSoft, alignItems: "center", justifyContent: "center" }}><Glyph name="check" size={15} color={C.cert} width={2.6} /></View> : null}
        </View>
        <Chevron open={openR} />
      </Pressable>
      {openR ? (
        <FadeIn distance={-6} style={{ gap: 12, paddingBottom: 14, paddingHorizontal: 4 }}>
          {fn ? <Field title={t("add.e_fn")}><Txt style={{ fontSize: 15 }}>{fn}</Txt></Field> : null}
          <Field title={t("add.e_origin")}>
            <Row gap={10}>{art ? <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: C.artBg, alignItems: "center", justifyContent: "center" }}><Art xml={art} size={26} /></View> : null}<Txt style={{ flex: 1, fontSize: 15 }}>{t(`add.origin.${r.origin}`)}</Txt></Row>
          </Field>
          <Field title={t("add.e_halal")}>
            {r.halal.reason ? <View style={{ gap: 6 }}>{halalPill || <Pill2 text={t("sev.info")} colors={SEV_COLORS.info} />}<Txt style={{ fontSize: 15, lineHeight: 21 }}>{r.halal.reason}</Txt></View> : <Txt style={{ fontSize: 15 }}>{t("add.halal_ok")}</Txt>}
            {r.halal.topic ? (
              <Text style={{ fontSize: 13, color: C.muted, marginTop: 4, textAlign: dir().ta }}>
                {t("add.your_setting", { d: t(`decision.${getSettings().topics[r.halal.topic]}`).toLowerCase() })} · <Text onPress={onGotoSettings} style={{ color: C.brand, fontWeight: "700", textDecorationLine: "underline" }}>{t("detail.change_setting")}</Text>
              </Text>
            ) : null}
          </Field>
          <Field title={t("add.e_health")}>
            <RiskScale level={r.health.level} />
            <Txt style={{ fontSize: 15, lineHeight: 21 }}>{r.health.level ? r.health.reason : t("add.health_ok")}</Txt>
            {r.it.a ? <Muted style={{ fontSize: 13 }}>{t("add.anses")}</Muted> : null}
            {r.it.u ? <Text onPress={() => Linking.openURL(r.it.u).catch(() => {})} style={{ color: C.brand, fontWeight: "700", fontSize: 13.5, marginTop: 2, textAlign: dir().ta }}>{t("add.efsa_link", { d: (r.it.d || "").slice(0, 4) })} ↗</Text> : null}
          </Field>
        </FadeIn>
      ) : null}
    </View>
  );
}
function Field({ title, children }) {
  return <View style={{ gap: 3 }}><Text style={{ fontSize: 13, fontWeight: "700", color: C.muted, textAlign: dir().ta }}>{title}</Text>{children}</View>;
}

// Onglet Composition : résumé puis la liste des additifs déclarés
export function CompositionAdditives({ p, onGotoSettings }) {
  if (!p.raw || p.local) return null;
  const keys = [...new Set((p.raw.additives_tags || []).map((tag) => String(tag).replace(/^\w+:/, "").toLowerCase()))].filter((k) => /^e\d{3,4}[a-z]*$/.test(k));
  const baseOf = (k) => k.match(/^e\d+/)[0];
  const shown = keys.filter((k) => !(k === baseOf(k) && keys.some((o) => o !== k && baseOf(o) === k)));
  const rows = shown.map(additiveRow).filter(Boolean);
  const nHalal = rows.filter((r) => r.halal.level === "haram" || r.halal.level === "mashbouh").length;
  const nRisk = rows.filter((r) => r.health.level).length;
  return (
    <View style={{ gap: 10 }}>
      <Row style={{ justifyContent: "space-between" }}>
        <Txt accessibilityRole="header" style={{ fontSize: 20, fontWeight: "800" }}>{t("detail.all_additives")}</Txt>
        <Muted>{shown.length}</Muted>
      </Row>
      {!shown.length ? <Muted>{t("detail.add_none")}</Muted> : nHalal || nRisk ? (
        <Row gap={6} style={{ flexWrap: "wrap" }}>
          {nHalal ? <Pill2 text={tn("compo.halal", nHalal)} colors={SEV_COLORS.mashbouh} /> : null}
          {nRisk ? <Pill2 text={tn("compo.risk", nRisk)} colors={RISK_COLORS.modere} /> : null}
        </Row>
      ) : (
        <Row gap={6}><Glyph name="check" size={17} color={C.cert} width={2.6} /><Text style={{ color: C.cert, fontWeight: "700" }}>{t("compo.all_ok")}</Text></Row>
      )}
      <View>{rows.map((r, i) => <AdditiveRow key={r.code} r={r} first={i === 0} onGotoSettings={onGotoSettings} />)}</View>
    </View>
  );
}
