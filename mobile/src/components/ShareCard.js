// Carte image du verdict à partager (WhatsApp, Instagram…), même mise en page que la version web.
// Dessinée hors de l'écran puis photographiée (react-native-view-shot) en 1080 × 1920.
import React, { forwardRef, useMemo } from "react";
import { View, Text, Image } from "react-native";
import Svg, { Rect, Path, Circle } from "react-native-svg";
import { Logo } from "./Icon";
import { Khatam } from "./Cards";
import { t, getLang } from "../i18n";
import { verdictOf, nameOf, scoreOf, S, kindOf } from "../view";
import { qrMatrix } from "../../../public/lib/qr.js";

export const SHARE_W = 360, SHARE_H = 640;
const COLORS = { halal_certifie: "#128A4E", halal_probable: "#2E7F45", mashbouh: "#BF650A", haram: "#C3362D", inconnu: "#5F6B65" };
const GRADE = { excellent: "#169B57", bon: "#7DBE45", mediocre: "#EE8A1F", mauvais: "#E0423A" };
export const shareUrl = (code) => `https://agozel5.github.io/bayyin/?p=${encodeURIComponent(code)}`;

function Mark({ status, color }) {
  const d = status === "halal_certifie" || status === "halal_probable" ? "M13 25l7 7 15-15" : status === "haram" ? "M16 16l16 16M32 16L16 32" : status === "mashbouh" ? null : "M14 24h20";
  return (
    <View style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" }}>
      {d ? <Svg width={34} height={34} viewBox="0 0 48 48"><Path d={d} stroke={color} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" fill="none" /></Svg>
        : <Text style={{ color, fontSize: 32, fontWeight: "900", lineHeight: 36 }}>?</Text>}
    </View>
  );
}

function Qr({ text, size }) {
  const m = useMemo(() => { try { return qrMatrix(text); } catch { return null; } }, [text]);
  if (!m) return null;
  const n = m.length, cell = size / n;
  let d = "";
  m.forEach((row, y) => row.forEach((on, x) => { if (on) d += `M${x * cell} ${y * cell}h${cell + 0.2}v${cell + 0.2}h-${cell + 0.2}z`; }));
  return <Svg width={size} height={size}><Path d={d} fill="#15211A" /></Svg>;
}

const ShareCard = forwardRef(function ShareCard({ p }, ref) {
  const v = verdictOf(p);
  const s = scoreOf(p);
  const vc = COLORS[v.status] || COLORS.inconnu;
  const rtl = getLang() === "ar";
  const row = rtl ? "row-reverse" : "row";
  const ta = rtl ? "right" : "left";
  const r = 15, c = 2 * Math.PI * r;
  return (
    <View ref={ref} collapsable={false} style={{ width: SHARE_W, height: SHARE_H, backgroundColor: "#F1F5F0", padding: 30, gap: 14, overflow: "hidden" }}>
      <View style={{ position: "absolute", left: 0, right: 0, top: 0, height: 110, opacity: 0.6 }}><Khatam opacity={0.12} /></View>
      <View style={{ flexDirection: row, alignItems: "center", gap: 10, marginTop: 20 }}>
        <Logo size={30} />
        <Text style={{ flex: 1, fontSize: 18, fontWeight: "800", color: "#15211A", textAlign: ta }}>Bayyin</Text>
        <Text style={{ fontSize: 17, fontWeight: "700", color: "#12724F" }}>بيّن</Text>
      </View>
      <View style={{ height: 150, borderRadius: 14, backgroundColor: "#fff", borderWidth: 0.7, borderColor: "#E3E8E2", alignItems: "center", justifyContent: "center" }}>
        {p.image ? <Image source={{ uri: p.image }} resizeMode="contain" style={{ width: 200, height: 120 }} /> : <Svg width={56} height={40} viewBox="0 0 56 40"><Rect x={2} y={2} width={52} height={36} fill="none" stroke="#C9D3CC" strokeWidth={2.5} /><Path d="M12 10v20M18 10v20M24 10v20M30 10v20M36 10v20M42 10v20" stroke="#C9D3CC" strokeWidth={2.5} /></Svg>}
      </View>
      <View style={{ gap: 2 }}>
        <Text numberOfLines={2} style={{ fontSize: 21, fontWeight: "800", color: "#15211A", lineHeight: 26, textAlign: ta }}>{nameOf(p)}</Text>
        {p.brand ? <Text numberOfLines={1} style={{ fontSize: 14, color: "#5D6A63", textAlign: ta }}>{p.brand}</Text> : null}
      </View>
      <View style={{ borderRadius: 14, backgroundColor: vc, padding: 16, gap: 10, overflow: "hidden" }}>
        <Khatam opacity={0.13} />
        <View style={{ flexDirection: row, alignItems: "center", gap: 14 }}>
          <Mark status={v.status} color={vc} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: "rgba(255,255,255,0.85)", fontSize: 12.5, fontWeight: "700", textAlign: ta }}>{t("detail.halal")}</Text>
            <Text numberOfLines={1} style={{ color: "#fff", fontSize: 26, fontWeight: "900", textAlign: ta }}>{S(v.status, "label")}</Text>
          </View>
        </View>
        <Text numberOfLines={2} style={{ color: "rgba(255,255,255,0.92)", fontSize: 12.5, lineHeight: 17, textAlign: ta }}>{S(v.status, "lead")}</Text>
      </View>
      {s ? (
        <View style={{ flexDirection: row, alignItems: "center", gap: 14, borderRadius: 12, backgroundColor: "#fff", borderWidth: 0.7, borderColor: "#E3E8E2", padding: 12 }}>
          <Svg width={40} height={40} viewBox="0 0 40 40" style={{ transform: [{ rotate: "-90deg" }] }}>
            <Circle cx={20} cy={20} r={r} stroke="#EBEFEA" strokeWidth={4.5} fill="none" />
            <Circle cx={20} cy={20} r={r} stroke={GRADE[s.grade] || "#5D6A63"} strokeWidth={4.5} fill="none" strokeDasharray={`${(c * s.score) / 100} ${c}`} strokeLinecap="round" />
          </Svg>
          <View style={{ position: "absolute", [rtl ? "right" : "left"]: 12, width: 40, alignItems: "center" }}><Text style={{ fontSize: 13, fontWeight: "800", color: "#15211A" }}>{s.score}</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 11.5, color: "#5D6A63", textAlign: ta }}>{t(kindOf(p) === "beauty" ? "detail.cosmetic" : "detail.health")}</Text>
            <Text style={{ fontSize: 15, fontWeight: "800", color: "#15211A", textAlign: ta }}>{t(`grade.${s.grade}`)} · {s.score}/100</Text>
          </View>
        </View>
      ) : null}
      {/^\d+$/.test(p.code) ? (
        <View style={{ flexDirection: row, alignItems: "center", gap: 14, marginTop: "auto" }}>
          <View style={{ padding: 7, borderRadius: 9, backgroundColor: "#fff" }}><Qr text={shareUrl(p.code)} size={60} /></View>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={{ fontSize: 14, fontWeight: "800", color: "#15211A", textAlign: ta }}>{t("share.scan_line")}</Text>
            <Text style={{ fontSize: 11, color: "#12724F", fontWeight: "600", textAlign: ta }}>agozel5.github.io/bayyin</Text>
          </View>
        </View>
      ) : <Text style={{ marginTop: "auto", fontSize: 12, color: "#5D6A63", textAlign: ta }}>{t("share.footer")}</Text>}
    </View>
  );
});
export default ShareCard;
