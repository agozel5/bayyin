// Caméra plein écran : lecture native des codes-barres (EAN-13, EAN-8, UPC-A, UPC-E).
// Même mise en scène que la version web : fond assombri autour d'un cadre large, coins qui respirent,
// trait de lecture qui balaie, cadre vert quand le code est lu.
import React, { useEffect, useRef, useState } from "react";
import { View, Text, Pressable, Linking, StyleSheet, Animated, Easing, useWindowDimensions } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import Svg, { Path, Rect, Circle } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Btn, Loading } from "./ui";
import { Art, Glyph } from "./Art";
import { C, R } from "../theme";
import { t } from "../i18n";
import { normalizeScan } from "../core";
import { STATUS_COLORS } from "../theme";
import { nameOf, verdictOf, profileOf, S } from "../view";
import { fetchProduct } from "../api";
import { haptic, ms } from "../motion";
import { mascot } from "../../../public/lib/mascot.js";

const TYPES = ["ean13", "ean8", "upc_a", "upc_e"];
const GREEN = "#3DDC84";
const G = {
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  torch: '<path d="M8 3h8l-1 5h-6zM9 8h6v3l-1.5 2v8h-3v-8L9 11z"/>',
  photo: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
  cart: '<path d="M3 4h2l2.5 11h11L21 7H7"/><circle cx="9.5" cy="19.5" r="1.5"/><circle cx="17" cy="19.5" r="1.5"/>',
  keys: '<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M7 10h.01M11 10h.01M15 10h.01M7 14h10"/>',
};

function RoundBtn({ glyph, onPress, label, on, role = "button" }) {
  return (
    <Pressable onPress={onPress} hitSlop={8} accessibilityRole={role} accessibilityLabel={label} accessibilityState={role === "switch" ? { checked: !!on } : undefined}
      style={({ pressed }) => ({ width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center", backgroundColor: on ? "#FFD24D" : pressed ? "rgba(0,0,0,0.6)" : "rgba(0,0,0,0.45)" })}>
      <Glyph paths={glyph} size={22} color={on ? "#1a1a1a" : "#fff"} width={2.2} />
    </Pressable>
  );
}

function Pill({ glyph, text, onPress, on }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityState={on !== undefined ? { selected: !!on } : undefined}
      style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 11, paddingHorizontal: 18, borderRadius: 999, backgroundColor: on ? "#fff" : pressed ? "rgba(255,255,255,0.28)" : "rgba(255,255,255,0.16)" })}>
      <Glyph paths={glyph} size={19} color={on ? "#0F6545" : "#fff"} />
      <Text style={{ color: on ? "#0F6545" : "#fff", fontWeight: "700", fontSize: 15 }}>{text}</Text>
    </Pressable>
  );
}

// Le moment du scan (comme la version web) : les barres du code se resserrent en un point,
// qui s'ouvre sur le verdict à sa couleur (coche, point d'interrogation, croix), avec sa vibration.
const WIDTHS = [3, 2, 5, 2, 3, 6, 2, 2, 4, 3, 2, 5, 3, 2, 6, 2, 3, 4, 2, 3, 5, 2];
const SYMBOL = { ok: "M127 61l15 15 31-32", warn: "M150 40v26M150 82v.5", no: "M134 44l32 32M166 44l-32 32", question: "M139 47a11 11 0 1 1 16 10c-4 2-5 5-5 9M150 82v.5", dash: "M132 60h36" };
const AnimatedRect = Animated.createAnimatedComponent(Rect);
const AnimatedPath = Animated.createAnimatedComponent(Path);
export function lookOf(p) {
  const st = verdictOf(p).status;
  const al = profileOf(p).alert;
  const [haram] = STATUS_COLORS.haram, [doubt] = STATUS_COLORS.mashbouh;
  if (al === "no") return ["no", haram, t(`alert.${al}`)];
  if (st === "haram") return ["no", haram, S(st, "label")];
  if (st === "mashbouh") return ["question", doubt, S(st, "label")];
  if (al === "maybe") return ["warn", doubt, t(`alert.${al}`)];
  if (st === "inconnu") return ["dash", "#8A9790", S(st, "label")];
  return ["ok", st === "halal_certifie" ? "#169B57" : "#3E8A49", S(st, "label")];
}
function Morph({ width, height, look }) {
  const read = useRef(new Animated.Value(0)).current;
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.timing(read, { toValue: 1, duration: 320, easing: Easing.inOut(Easing.cubic), useNativeDriver: false }).start(); }, []);
  useEffect(() => { if (look) Animated.spring(v, { toValue: 1, friction: 6, tension: 120, useNativeDriver: false }).start(); }, [!!look]);
  const gap = 4.4, total = WIDTHS.reduce((a, w) => a + w, 0) + gap * (WIDTHS.length - 1);
  let x = 150 - total / 2;
  const bars = WIDTHS.map((w, i) => { const cx = x + w / 2; const r = { x, w, dx: 150 - cx }; x += w + gap; return r; });
  return (
    <View pointerEvents="none" style={{ position: "absolute", left: 0, top: 0, width, height, alignItems: "center", justifyContent: "center" }}>
      <Svg width={width} height={height} viewBox="0 0 300 120">
        {bars.map((b, i) => (
          <AnimatedRect key={i} x={read.interpolate({ inputRange: [0, 1], outputRange: [b.x, b.x + b.dx] })} y={read.interpolate({ inputRange: [0, 1], outputRange: [26, 57] })}
            width={b.w} height={read.interpolate({ inputRange: [0, 1], outputRange: [68, 6] })} rx={1} fill="#fff" opacity={look ? 0 : 1} />
        ))}
        {look ? <Circle cx={150} cy={60} r={42} fill={look[1]} /> : null}
        {look ? <AnimatedPath d={SYMBOL[look[0]]} stroke="#fff" strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" fill="none" strokeDasharray="100" strokeDashoffset={v.interpolate({ inputRange: [0, 1], outputRange: [100, 0] })} /> : null}
      </Svg>
      {look ? <Text style={{ position: "absolute", top: height + 16, color: "#fff", fontSize: 19, fontWeight: "800", textAlign: "center", textShadowColor: "rgba(0,0,0,0.6)", textShadowRadius: 6 }}>{look[2]}</Text> : null}
    </View>
  );
}

// Onde autour du cadre à la lecture du code
function Burst({ width, height, color }) {
  const a = useRef(new Animated.Value(0)).current;
  const b = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(a, { toValue: 1, duration: 750, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    Animated.timing(b, { toValue: 1, duration: 750, delay: 120, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, []);
  return [a, b].map((v, i) => (
    <Animated.View key={i} pointerEvents="none" style={{ position: "absolute", left: -3, top: -3, width: width + 6, height: height + 6, borderRadius: 24, borderWidth: 3, borderColor: color,
      opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.95, 0] }), transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, 1.35] }) }] }} />
  ));
}

export default function CameraScanner({ onCode, onClose, onManual, onPhoto, onAisle, basket = false, onToggleBasket, onBasketAdd, basketCount = 0, onOpenBasket }) {
  const insets = useSafeAreaInsets();
  const { width: W, height: H } = useWindowDimensions();
  const [perm, requestPerm] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  const [found, setFound] = useState(false);
  const [morph, setMorph] = useState(null); // { look? } pendant l'animation du verdict
  const [burst, setBurst] = useState(0);
  const [slow, setSlow] = useState(false);
  const done = useRef(false);
  const last = useRef({ code: null, at: 0 });
  const [flash, setFlash] = useState(null); // mode courses : dernier produit ajouté { code, p?, again }
  const breathe = useRef(new Animated.Value(0)).current;
  const sweep = useRef(new Animated.Value(0)).current;

  // Cadre : large et bas, comme une étiquette de code-barres
  const fw = Math.min(W * 0.84, 460), fh = Math.min(W * 0.4, 200);
  const fx = (W - fw) / 2, fy = H * 0.42 - fh / 2, r = 22;

  useEffect(() => {
    if (!ms(1)) return;
    const loop = (v) => Animated.loop(Animated.sequence([
      Animated.timing(v, { toValue: 1, duration: 1600, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      Animated.timing(v, { toValue: 0, duration: 1600, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
    ]));
    const a = loop(breathe), b = loop(sweep);
    a.start(); b.start();
    return () => { a.stop(); b.stop(); };
  }, []);
  useEffect(() => {
    const id = setTimeout(() => setSlow(true), 12000);
    return () => clearTimeout(id);
  }, []);

  const onScanned = ({ data }) => {
    if (done.current) return;
    const code = normalizeScan(data);
    if (!code) return; // la clé de contrôle écarte les lectures erronées
    if (basket && onBasketAdd) {
      // Mode courses : on garde la caméra ouverte et on enchaîne les produits
      if (last.current.code === code && Date.now() - last.current.at < 3000) return;
      last.current = { code, at: Date.now() };
      done.current = true;
      setFound(true);
      haptic.success();
      const res = onBasketAdd(code); // { added, product: Promise }
      setFlash({ code, again: !res.added });
      res.product && res.product.then((p) => p && setFlash((f) => (f && f.code === code ? { ...f, p } : f))).catch(() => {});
      setTimeout(() => { done.current = false; setFound(false); }, 1100);
      return;
    }
    done.current = true;
    setFound(true);
    setBurst((n) => n + 1);
    haptic.tap(); // code lu ; le verdict a sa propre vibration
    if (!ms(1)) return onCode(code);
    reveal(code);
  };
  const reveal = async (code) => {
    setMorph({});
    const wait = (n) => new Promise((r) => setTimeout(r, n));
    let p;
    try { [p] = await Promise.all([Promise.race([fetchProduct(code), wait(1500).then(() => undefined)]), wait(320)]); } catch { p = undefined; }
    if (!p) return onCode(code); // lent, introuvable ou erreur : la fiche s'en charge
    const look = lookOf(p);
    setMorph({ look });
    (look[0] === "no" ? haptic.error : look[0] === "ok" ? haptic.success : haptic.warn)();
    await wait(820);
    onCode(code, { product: p, revealed: true });
  };

  if (!perm) {
    return (
      <View style={[StyleSheet.absoluteFill, { backgroundColor: "#000", justifyContent: "center" }]}>
        <Loading text={t("cam.opening")} />
      </View>
    );
  }

  if (!perm.granted) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, padding: 24, paddingTop: insets.top + 24, gap: 14, justifyContent: "center" }}>
        <View style={{ alignSelf: "center" }}><Art xml={mascot("search", { size: 132 })} size={132} /></View>
        <Text style={{ fontSize: 22, fontWeight: "800", color: C.fg, textAlign: "center" }}>{t("cam.err.denied.t")}</Text>
        <Text style={{ fontSize: 16, lineHeight: 23, color: C.muted, textAlign: "center" }}>{t("cam.err.denied.p")}</Text>
        {perm.canAskAgain ? (
          <Btn title={t("cam.allow")} onPress={requestPerm} />
        ) : (
          <Btn title={t("cam.open_settings")} onPress={() => Linking.openSettings().catch(() => {})} />
        )}
        <Btn title={t("cam.type")} kind="soft" icon="keyboard" onPress={onManual} />
        <Btn title={t("sheet.back")} kind="soft" onPress={onClose} />
      </View>
    );
  }

  // Fond assombri autour du cadre : un rectangle plein percé d'un rectangle arrondi
  const hole = `M${fx + r} ${fy}H${fx + fw - r}A${r} ${r} 0 0 1 ${fx + fw} ${fy + r}V${fy + fh - r}A${r} ${r} 0 0 1 ${fx + fw - r} ${fy + fh}H${fx + r}A${r} ${r} 0 0 1 ${fx} ${fy + fh - r}V${fy + r}A${r} ${r} 0 0 1 ${fx + r} ${fy}Z`;
  const cornerColor = morph && morph.look ? morph.look[1] : found ? GREEN : "#fff";
  const corner = (pos, dx, dy) => (
    <Animated.View key={pos} style={[{ position: "absolute", width: 38, height: 38, borderColor: cornerColor }, CORNERS[pos],
      found ? null : { transform: [{ translateX: breathe.interpolate({ inputRange: [0, 1], outputRange: [0, dx] }) }, { translateY: breathe.interpolate({ inputRange: [0, 1], outputRange: [0, dy] }) }] }]} />
  );

  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      <CameraView style={StyleSheet.absoluteFill} facing="back" enableTorch={torch} barcodeScannerSettings={{ barcodeTypes: TYPES }} onBarcodeScanned={onScanned} />

      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <Svg width={W} height={H}>
          <Path d={`M0 0H${W}V${H}H0Z ${hole}`} fill="rgba(0,0,0,0.55)" fillRule="evenodd" />
          {found ? <Path d={hole} fill={morph && morph.look ? morph.look[1] + "33" : "rgba(61,220,132,0.22)"} /> : null}
        </Svg>
        <View style={{ position: "absolute", left: fx, top: fy, width: fw, height: fh }}>
          {corner("tl", -5, -5)}{corner("tr", 5, -5)}{corner("bl", -5, 5)}{corner("br", 5, 5)}
          {burst ? <Burst key={burst} width={fw} height={fh} color={GREEN} /> : null}
          {morph ? <Morph width={fw} height={fh} look={morph.look} /> : null}
          {found || morph ? null : (
            <Animated.View style={{ position: "absolute", left: 14, right: 14, height: 2, borderRadius: 2, backgroundColor: "#FF5A50",
              shadowColor: "#FF5A50", shadowOpacity: 0.8, shadowRadius: 8, top: fh * 0.14,
              transform: [{ translateY: sweep.interpolate({ inputRange: [0, 1], outputRange: [0, fh * 0.72] }) }] }} />
          )}
        </View>
      </View>

      <View style={{ position: "absolute", top: insets.top + 12, left: 16, right: 16, flexDirection: "row", justifyContent: "space-between" }}>
        <RoundBtn glyph={G.close} onPress={onClose} label={t("cam.close")} />
        <RoundBtn glyph={G.torch} role="switch" on={torch} label={t("cam.torch")} onPress={() => { haptic.tap(); setTorch((v) => !v); }} />
      </View>

      {basket && flash ? (() => {
        const st = flash.p ? verdictOf(flash.p).status : null;
        const [fg, bg] = st ? STATUS_COLORS[st] : ["#fff", "rgba(255,255,255,0.2)"];
        return (
          <View key={flash.code + (flash.p ? "p" : "")} style={{ position: "absolute", top: insets.top + 70, left: 16, right: 16, flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: 16, backgroundColor: "rgba(12,20,16,0.82)" }} accessibilityLiveRegion="polite">
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: st ? fg : "#9AA59F" }} />
            <View style={{ flex: 1 }}>
              <Text numberOfLines={1} style={{ color: "#fff", fontWeight: "800", fontSize: 15 }}>{flash.p ? nameOf(flash.p) : flash.code}</Text>
              <Text style={{ color: "rgba(255,255,255,0.75)", fontSize: 12.5 }}>{t(flash.again ? "basket.again" : "basket.scanned")}</Text>
            </View>
            {st ? <View style={{ paddingHorizontal: 9, paddingVertical: 4, borderRadius: 99, backgroundColor: bg }}><Text style={{ color: fg, fontWeight: "800", fontSize: 12 }}>{S(st, "short")}</Text></View> : null}
          </View>
        );
      })() : null}

      <View style={{ position: "absolute", left: 20, right: 20, bottom: insets.bottom + 28, alignItems: "center", gap: 16 }}>
        <Text accessibilityLiveRegion="polite"
          style={[{ color: "#fff", fontSize: 16.5, fontWeight: "700", textAlign: "center" },
            slow ? { backgroundColor: "rgba(0,0,0,0.55)", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, overflow: "hidden", fontWeight: "600", fontSize: 15 }
              : { textShadowColor: "rgba(0,0,0,0.6)", textShadowRadius: 6 }]}>
          {t(slow && !basket ? "cam.slow" : basket ? "basket.on_toast" : "cam.hint")}
        </Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 10 }}>
          {onToggleBasket ? <Pill glyph={G.cart} text={t("basket.mode")} on={basket} onPress={() => { haptic.tap(); onToggleBasket(); }} /> : null}
          {basket ? null : onPhoto ? <Pill glyph={G.photo} text={t("cam.photo")} onPress={onPhoto} /> : null}
          {basket ? null : <Pill glyph={G.keys} text={t("cam.type")} onPress={onManual} />}
          {basket || !onAisle ? null : <Pill glyph='<path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2"/><circle cx="8.5" cy="10" r="2.2"/><circle cx="15.5" cy="10" r="2.2"/><circle cx="12" cy="16" r="2.2"/>' text={t("aisle.title")} onPress={onAisle} />}
        </View>
        {basket ? (
          <Pressable onPress={onOpenBasket} accessibilityRole="button"
            style={({ pressed }) => ({ alignSelf: "stretch", paddingVertical: 14, borderRadius: 16, alignItems: "center", backgroundColor: pressed ? "#0B5038" : "#14805A" })}>
            <Text style={{ color: "#fff", fontWeight: "800", fontSize: 16 }}>{t("basket.open", { n: basketCount })}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const CORNERS = {
  tl: { top: -2, left: -2, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 22 },
  tr: { top: -2, right: -2, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 22 },
  bl: { bottom: -2, left: -2, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: 22 },
  br: { bottom: -2, right: -2, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: 22 },
};
