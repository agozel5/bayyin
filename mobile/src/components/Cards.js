// Cartes produit, motif du bandeau et vignettes, au style de la version web.
import React from "react";
import { View, Text, Pressable, Image } from "react-native";
import { SvgXml } from "react-native-svg";
import { Art, Glyph } from "./Art";
import { C, R, VERDICT, GRADE_COLORS, ALERT_COLORS, STATUS_COLORS, dir, lift } from "../theme";
const STATUS_PILL = (st) => STATUS_COLORS[st];
import { t } from "../i18n";
import { S, nameOf, verdictOf, scoreOf, kindOf, profileOf } from "../view";
import { productArtKey, artByKey } from "../../../public/lib/product-art.js";
import { haptic } from "../motion";

export const STATUS_GLYPH = {
  halal_certifie: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  halal_probable: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  mashbouh: '<path d="M9.2 9a3 3 0 1 1 4.3 2.7c-.9.4-1.5 1.2-1.5 2.2v.6M12 18v.1"/>',
  haram: '<path d="M7 7l10 10M17 7L7 17"/>',
  inconnu: '<path d="M7 12h10"/>',
};

export const artOf = (p) => artByKey(productArtKey({ kind: kindOf(p), tags: p.categories || (p.raw && p.raw.categories_tags) || [], name: nameOf(p), local: !!p.local }));

// Motif géométrique (khatam) des bandeaux verts, comme la version web
const KHATAM = `<svg viewBox="0 0 360 260"><defs><pattern id="kh" width="56" height="56" patternUnits="userSpaceOnUse">
  <g fill="none" stroke="#fff" stroke-opacity=".42" stroke-width="1.1"><rect x="17" y="17" width="22" height="22"/><rect x="17" y="17" width="22" height="22" transform="rotate(45 28 28)"/><circle cx="28" cy="28" r="4.5"/><path d="M0 0l9 9M56 0l-9 9M0 56l9-9M56 56l-9-9"/></g></pattern>
  <linearGradient id="khm" x1="1" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="1"/><stop offset=".65" stop-color="#fff" stop-opacity="0"/></linearGradient>
  <mask id="khk"><rect width="360" height="260" fill="url(#khm)"/></mask></defs>
  <rect width="360" height="260" fill="url(#kh)" mask="url(#khk)"/></svg>`;
export function Khatam({ opacity = 0.22 }) {
  return <View pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, opacity }}><SvgXml xml={KHATAM} width="100%" height="100%" preserveAspectRatio="xMaxYMin slice" /></View>;
}

// Vignette : la photo, sinon l'illustration du rayon, sinon une icône
// Photos qui n'ont pas pu se charger : on passe au dessin du rayon (comme la version web)
const broken = new Set();
export function Thumb({ p, size = 56, radius = 14 }) {
  const art = artOf(p);
  const [, setFail] = React.useState(0);
  if (p.image && !broken.has(p.image))
    return <Image source={{ uri: p.image }} accessible={false} resizeMode="contain" onError={() => { broken.add(p.image); setFail((n) => n + 1); }}
      style={{ width: size, height: size, borderRadius: radius, backgroundColor: "#fff" }} />;
  return (
    <View style={{ width: size, height: size, borderRadius: radius, backgroundColor: art ? C.artBg : C.tint, alignItems: "center", justifyContent: "center" }}>
      {art ? <Art xml={art} size={Math.round(size * 0.66)} /> : <Glyph name={p.local ? "doc" : "box"} size={Math.round(size * 0.42)} color={C.faint} />}
    </View>
  );
}

export function ScoreDot({ p, size = 13 }) {
  const s = scoreOf(p);
  if (!s) return null;
  return (
    <View style={{ flexDirection: dir().row, alignItems: "center", gap: 5 }}>
      <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: GRADE_COLORS[s.grade] }} />
      <Text maxFontSizeMultiplier={1.4} style={{ fontSize: size, fontWeight: "700", color: C.muted }}>{s.score}/100</Text>
    </View>
  );
}

// Carte « dernier produit » : bandeau du verdict, vignette, nom, marque, note
export function ProductCard({ p, onPress, fav, width = 214 }) {
  const st = verdictOf(p).status;
  const alert = profileOf(p).alert;
  return (
    <Pressable
      onPress={() => { haptic.tap(); onPress(); }}
      accessibilityRole="button"
      accessibilityLabel={`${nameOf(p)}, ${S(st, "label")}`}
      style={({ pressed }) => [{ width, borderRadius: R.lg, backgroundColor: C.surface, overflow: "hidden", transform: [{ scale: pressed ? 0.98 : 1 }] }, lift()]}
    >
      <View style={{ flexDirection: dir().row, alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: VERDICT[st] }}>
        <Glyph paths={STATUS_GLYPH[st]} size={15} color="#fff" width={2.6} />
        <Text numberOfLines={1} style={{ color: "#fff", fontWeight: "700", fontSize: 13, flex: 1 }}>{S(st, "label")}</Text>
        {fav ? <Glyph name="star" size={14} color="#FFD27A" /> : null}
      </View>
      <View style={{ flexDirection: dir().row, gap: 12, padding: 12, alignItems: "center" }}>
        <Thumb p={p} size={58} />
        <View style={{ flex: 1, gap: 3 }}>
          <Text numberOfLines={2} style={{ color: C.fg, fontWeight: "700", fontSize: 15, lineHeight: 19, textAlign: dir().ta }}>{nameOf(p)}</Text>
          {p.brand ? <Text numberOfLines={1} style={{ color: C.muted, fontSize: 13, textAlign: dir().ta }}>{p.brand}</Text> : null}
        </View>
      </View>
      <View style={{ flexDirection: dir().row, alignItems: "center", gap: 8, paddingHorizontal: 12, paddingBottom: 12 }}>
        <ScoreDot p={p} />
        {alert ? <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 99, backgroundColor: ALERT_COLORS[alert][1] }}><Text style={{ color: ALERT_COLORS[alert][0], fontSize: 12, fontWeight: "700" }}>{t(`alert.short.${alert}`)}</Text></View> : null}
      </View>
    </Pressable>
  );
}

// Ligne de liste (historique, recherche) : vignette, nom, marque · moment, verdict, note
export function ListRow({ p, onPress, fav, when, first }) {
  const st = verdictOf(p).status;
  const alert = profileOf(p).alert;
  const meta = [kindOf(p) !== "food" ? t(`kind.${kindOf(p)}`) : "", p.brand, when].filter(Boolean).join(" · ");
  const [fg, bg] = STATUS_PILL(st);
  return (
    <Pressable onPress={() => { haptic.tap(); onPress(); }} accessibilityRole="button" accessibilityLabel={`${nameOf(p)}, ${S(st, "label")}`}
      style={({ pressed }) => ({ flexDirection: dir().row, alignItems: "center", gap: 12, paddingVertical: 12, paddingHorizontal: 14, backgroundColor: pressed ? C.tint : "transparent",
        borderTopWidth: first ? 0 : 0.5, borderTopColor: C.line })}>
      <Thumb p={p} size={54} />
      <View style={{ flex: 1, gap: 3 }}>
        <Text numberOfLines={2} style={{ color: C.fg, fontWeight: "700", fontSize: 15.5, lineHeight: 20, textAlign: dir().ta }}>{nameOf(p)}</Text>
        {meta ? <Text numberOfLines={1} style={{ color: C.muted, fontSize: 13, textAlign: dir().ta }}>{meta}</Text> : null}
        <View style={{ flexDirection: dir().row, alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <View style={{ flexDirection: dir().row, alignItems: "center", gap: 5, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 99, backgroundColor: bg }}>
            <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: fg }} />
            <Text style={{ color: fg, fontSize: 12, fontWeight: "800" }}>{S(st, "short")}</Text>
          </View>
          <ScoreDot p={p} size={12.5} />
          {alert ? <Text style={{ color: ALERT_COLORS[alert][0], fontSize: 12, fontWeight: "800" }}>{t(`alert.short.${alert}`)}</Text> : null}
          {fav ? <Glyph name="star" size={14} color="#E9A100" /> : null}
        </View>
      </View>
      <Glyph name="chev" size={17} color={C.faint} />
    </Pressable>
  );
}
