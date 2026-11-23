// Carte image du verdict à partager (WhatsApp, Instagram…), même mise en page que la version web.
// Dessinée hors de l'écran puis photographiée (react-native-view-shot) en 1080 × 1920.
import { SITE, WEB } from "../config";
import React, { forwardRef, useEffect, useMemo } from "react";
import { View, Text, Platform, Share } from "react-native";
import { Img } from "./Img";
import Svg, { Rect, Path, Circle } from "react-native-svg";
import { Logo } from "./Icon";
import { Khatam } from "./Cards";
import { t, getLang, isRTL } from "../i18n";
import { verdictOf, nameOf, scoreOf, S, kindOf } from "../view";
import { qrMatrix } from "../../../public/lib/qr.js";

export const SHARE_W = 360, SHARE_H = 640;
const COLORS = { halal_certifie: "#128A4E", halal_probable: "#2E7F45", mashbouh: "#BF650A", haram: "#C3362D", inconnu: "#5F6B65" };
const GRADE = { excellent: "#169B57", bon: "#7DBE45", mediocre: "#EE8A1F", mauvais: "#E0423A" };
// Lien de la fiche : seulement quand un nom de domaine propre est réglé (config.js)
export const shareUrl = (code) => (SITE ? `${SITE}?p=${encodeURIComponent(code)}` : "");

function Mark({ status, color }) {
  const d = status === "halal_certifie" || status === "halal_probable" ? "M13 25l7 7 15-15" : status === "haram" ? "M16 16l16 16M32 16L16 32" : status === "mashbouh" ? null : "M14 24h20";
  return (
    <View style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" }}>
      {d ? <Svg width={34} height={34} viewBox="0 0 48 48"><Path d={d} stroke={color} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" fill="none" /></Svg>
        : <Text allowFontScaling={false} style={{ color, fontSize: 32, fontWeight: "900", lineHeight: 36 }}>?</Text>}
    </View>
  );
}

export function Qr({ text, size }) {
  const m = useMemo(() => { try { return qrMatrix(text); } catch { return null; } }, [text]);
  if (!m) return null;
  const n = m.length, cell = size / n;
  let d = "";
  m.forEach((row, y) => row.forEach((on, x) => { if (on) d += `M${x * cell} ${y * cell}h${cell + 0.2}v${cell + 0.2}h-${cell + 0.2}z`; }));
  return <Svg width={size} height={size}><Path d={d} fill="#15211A" /></Svg>;
}

const INK = "#15211A", SOFT = "#5D6A63", DEEP = "#0F6545";
const host = (u) => String(u || "").replace(/^https?:\/\//, "").replace(/\/$/, "");

// En-tête commun : logo et nom, en blanc sur le vert de la marque
function Brand({ row }) {
  return (
    <View style={{ flexDirection: row, alignItems: "center", gap: 10 }}>
      <Logo size={34} />
      <Text allowFontScaling={false} style={{ fontSize: 21, fontWeight: "800", color: "#fff", letterSpacing: -0.3 }}>Bayyin</Text>
    </View>
  );
}
// Pied commun : QR code vers la fiche (ou vers l'app), une ligne d'invitation et l'adresse
function Foot({ url, line, row, ta, light }) {
  return (
    <View style={{ flexDirection: row, alignItems: "center", gap: 14, marginTop: "auto" }}>
      <View style={{ padding: 7, borderRadius: 10, backgroundColor: "#fff", borderWidth: light ? 0 : 0.7, borderColor: "#E3E8E2" }}><Qr text={url} size={62} /></View>
      <View style={{ flex: 1, gap: 4 }}>
        <Text allowFontScaling={false} numberOfLines={2} style={{ fontSize: 14.5, lineHeight: 19, fontWeight: "800", color: light ? "#fff" : INK, textAlign: ta }}>{line}</Text>
        <Text allowFontScaling={false} numberOfLines={1} style={{ fontSize: 11.5, color: light ? "rgba(255,255,255,0.82)" : "#12724F", fontWeight: "700", textAlign: ta }}>{host(url)}</Text>
      </View>
    </View>
  );
}

/** Carte d'une fiche produit. onReady() est appelé quand la photo est affichée (ou absente) : on peut alors photographier. */
const ShareCard = forwardRef(function ShareCard({ p, onReady }, ref) {
  const v = verdictOf(p);
  const s = scoreOf(p);
  const vc = COLORS[v.status] || COLORS.inconnu;
  const rtl = isRTL();
  const row = rtl ? "row-reverse" : "row";
  const ta = rtl ? "right" : "left";
  const r = 15, c = 2 * Math.PI * r;
  const ready = () => { if (onReady) onReady(); };
  useEffect(() => { if (!p.image) ready(); }, [p.image]);
  const link = /^\d+$/.test(p.code) && SITE ? shareUrl(p.code) : WEB;
  return (
    <View ref={ref} collapsable={false} style={{ width: SHARE_W, height: SHARE_H, backgroundColor: "#F1F5F0", overflow: "hidden" }}>
      {/* Bandeau vert de la marque ; la photo du produit le chevauche */}
      <View style={{ height: 196, backgroundColor: DEEP, paddingHorizontal: 26, paddingTop: 34, overflow: "hidden" }}>
        <Khatam opacity={0.16} />
        <Brand row={row} />
      </View>
      <View style={{ marginTop: -104, marginHorizontal: 26, height: 190, borderRadius: 22, backgroundColor: "#fff", alignItems: "center", justifyContent: "center",
        shadowColor: "#0B2A1C", shadowOpacity: 0.16, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 6 }}>
        {p.image ? <Img uri={p.image} fit="contain" transition={0} onLoad={ready} onError={ready} style={{ width: 250, height: 160 }} />
          : <Svg width={64} height={46} viewBox="0 0 56 40"><Rect x={2} y={2} width={52} height={36} fill="none" stroke="#C9D3CC" strokeWidth={2.5} rx={3} /><Path d="M9 9v22M14 9v22M20 9v22M24 9v22M31 9v22M36 9v22M41 9v22M47 9v22" stroke="#C9D3CC" strokeWidth={2.6} /></Svg>}
      </View>
      <View style={{ flex: 1, paddingHorizontal: 26, paddingTop: 16, paddingBottom: 26, gap: 12 }}>
        <View style={{ gap: 2 }}>
          <Text allowFontScaling={false} numberOfLines={2} style={{ fontSize: 22, fontWeight: "800", color: INK, lineHeight: 27, letterSpacing: -0.3, textAlign: ta }}>{nameOf(p)}</Text>
          {p.brand ? <Text allowFontScaling={false} numberOfLines={1} style={{ fontSize: 14.5, color: SOFT, textAlign: ta }}>{p.brand}</Text> : null}
        </View>
        <View style={{ borderRadius: 18, backgroundColor: vc, padding: 16, gap: 10, overflow: "hidden" }}>
          <Khatam opacity={0.13} />
          <View style={{ flexDirection: row, alignItems: "center", gap: 14 }}>
            <Mark status={v.status} color={vc} />
            <View style={{ flex: 1 }}>
              <Text allowFontScaling={false} style={{ color: "rgba(255,255,255,0.85)", fontSize: 12.5, fontWeight: "700", textAlign: ta }}>{t("detail.halal")}</Text>
              <Text allowFontScaling={false} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={{ color: "#fff", fontSize: 26, fontWeight: "900", letterSpacing: -0.4, textAlign: ta }}>{S(v.status, "label")}</Text>
            </View>
          </View>
          <Text allowFontScaling={false} numberOfLines={2} style={{ color: "rgba(255,255,255,0.92)", fontSize: 12.5, lineHeight: 17, textAlign: ta }}>{S(v.status, "lead")}</Text>
        </View>
        {s ? (
          <View style={{ flexDirection: row, alignItems: "center", gap: 14, borderRadius: 16, backgroundColor: "#fff", borderWidth: 0.7, borderColor: "#E3E8E2", padding: 12 }}>
            <Svg width={40} height={40} viewBox="0 0 40 40" style={{ transform: [{ rotate: "-90deg" }] }}>
              <Circle cx={20} cy={20} r={r} stroke="#EBEFEA" strokeWidth={4.5} fill="none" />
              <Circle cx={20} cy={20} r={r} stroke={GRADE[s.grade] || SOFT} strokeWidth={4.5} fill="none" strokeDasharray={`${(c * s.score) / 100} ${c}`} strokeLinecap="round" />
            </Svg>
            <View style={{ position: "absolute", [rtl ? "right" : "left"]: 12, width: 40, alignItems: "center" }}><Text allowFontScaling={false} style={{ fontSize: 13, fontWeight: "800", color: INK }}>{s.score}</Text></View>
            <View style={{ flex: 1 }}>
              <Text allowFontScaling={false} style={{ fontSize: 11.5, color: SOFT, textAlign: ta }}>{t(kindOf(p) === "beauty" ? "detail.cosmetic" : "detail.health")}</Text>
              <Text allowFontScaling={false} style={{ fontSize: 15, fontWeight: "800", color: INK, textAlign: ta }}>{t(`grade.${s.grade}`)} · {s.score}/100</Text>
            </View>
          </View>
        ) : null}
        <Foot url={link} line={/^\d+$/.test(p.code) && SITE ? t("share.scan_line") : t("share.footer")} row={row} ta={ta} />
      </View>
    </View>
  );
});
export default ShareCard;

/** Carte « Recommander Bayyin » : la promesse de l'app, un aperçu de verdict et le QR code pour l'ouvrir. */
export const PromoCard = forwardRef(function PromoCard(_, ref) {
  const rtl = isRTL();
  const row = rtl ? "row-reverse" : "row";
  const ta = rtl ? "right" : "left";
  const r = 15, c = 2 * Math.PI * r;
  const lines = String(t("home.h1_html")).split(/<br\s*\/?>/i).map((x) => x.trim()).filter(Boolean);
  return (
    <View ref={ref} collapsable={false} style={{ width: SHARE_W, height: SHARE_H, backgroundColor: DEEP, padding: 28, paddingTop: 36, gap: 18, overflow: "hidden" }}>
      <Khatam opacity={0.17} />
      <View style={{ position: "absolute", width: 420, height: 420, borderRadius: 210, backgroundColor: "#1FA371", opacity: 0.28, top: -170, [rtl ? "left" : "right"]: -150 }} />
      <Brand row={row} />
      <View style={{ gap: 8, marginTop: 6 }}>
        {lines.map((x, i) => <Text allowFontScaling={false} key={i} style={{ fontSize: 31, lineHeight: 36, fontWeight: "900", letterSpacing: -0.7, color: i ? "#BFEBD6" : "#fff", textAlign: ta }}>{x}</Text>)}
        <Text allowFontScaling={false} numberOfLines={4} style={{ fontSize: 14.5, lineHeight: 21, color: "rgba(255,255,255,0.88)", textAlign: ta, marginTop: 4 }}>{t("home.lead")}</Text>
      </View>
      {/* Aperçu : une fiche type, verdict et note santé */}
      <View style={{ borderRadius: 22, backgroundColor: "#fff", padding: 12, gap: 10, shadowColor: "#000", shadowOpacity: 0.22, shadowRadius: 20, shadowOffset: { width: 0, height: 12 }, elevation: 8 }}>
        <View style={{ borderRadius: 14, backgroundColor: COLORS.halal_certifie, padding: 14, flexDirection: row, alignItems: "center", gap: 12, overflow: "hidden" }}>
          <Khatam opacity={0.13} />
          <Mark status="halal_certifie" color={COLORS.halal_certifie} />
          <View style={{ flex: 1 }}>
            <Text allowFontScaling={false} style={{ color: "rgba(255,255,255,0.85)", fontSize: 12, fontWeight: "700", textAlign: ta }}>{t("detail.halal")}</Text>
            <Text allowFontScaling={false} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={{ color: "#fff", fontSize: 23, fontWeight: "900", letterSpacing: -0.3, textAlign: ta }}>{S("halal_certifie", "label")}</Text>
          </View>
        </View>
        <View style={{ flexDirection: row, alignItems: "center", gap: 12, paddingHorizontal: 6, paddingBottom: 2 }}>
          <Svg width={40} height={40} viewBox="0 0 40 40" style={{ transform: [{ rotate: "-90deg" }] }}>
            <Circle cx={20} cy={20} r={r} stroke="#EBEFEA" strokeWidth={4.5} fill="none" />
            <Circle cx={20} cy={20} r={r} stroke={GRADE.excellent} strokeWidth={4.5} fill="none" strokeDasharray={`${c * 0.86} ${c}`} strokeLinecap="round" />
          </Svg>
          <View style={{ position: "absolute", [rtl ? "right" : "left"]: 6, width: 40, alignItems: "center" }}><Text allowFontScaling={false} style={{ fontSize: 13, fontWeight: "800", color: INK }}>86</Text></View>
          <View style={{ flex: 1 }}>
            <Text allowFontScaling={false} style={{ fontSize: 11.5, color: SOFT, textAlign: ta }}>{t("detail.health")}</Text>
            <Text allowFontScaling={false} style={{ fontSize: 15, fontWeight: "800", color: INK, textAlign: ta }}>{t("grade.excellent")} · 86/100</Text>
          </View>
        </View>
      </View>
      <Foot url={WEB} line={t("home.scan")} row={row} ta={ta} light />
    </View>
  );
});

/**
 * Photographie une carte (ShareCard, PromoCard) et ouvre la feuille de partage du téléphone.
 * Image JPEG légère (quelques centaines de Ko) au nom lisible. Renvoie false si l'image n'a pas pu être faite.
 */
export async function shareCardImage(ref, { name = "Bayyin", message = "" } = {}) {
  if (Platform.OS === "web") return false;
  try {
    const { captureRef } = require("react-native-view-shot");
    const fileName = `Bayyin-${String(name).normalize("NFD").replace(/[^A-Za-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "app"}`;
    const uri = await Promise.race([
      captureRef(ref, { format: "jpg", quality: 0.92, width: 1080, height: 1920, result: "tmpfile", fileName }),
      new Promise((_, ko) => setTimeout(() => ko(new Error("capture")), 5000)),
    ]);
    const file = String(uri).startsWith("file://") ? uri : `file://${uri}`;
    // iPhone : la feuille de partage du système (WhatsApp, Messages…) avec l'image et le texte
    if (Platform.OS === "ios") { await Share.share({ url: file, message }); return true; }
    const Sharing = require("expo-sharing");
    if (await Sharing.isAvailableAsync()) { await Sharing.shareAsync(file, { mimeType: "image/jpeg", dialogTitle: name }); return true; }
  } catch { /* capture ou partage impossible : l'appelant partage le texte */ }
  return false;
}
