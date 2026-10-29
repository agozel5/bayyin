// Caméra plein écran : lecture native des codes-barres (EAN-13, EAN-8, UPC-A, UPC-E).
// Même mise en scène que la version web : fond assombri autour d'un cadre large, coins qui respirent,
// trait de lecture qui balaie, cadre vert quand le code est lu.
import React, { useEffect, useRef, useState } from "react";
import { View, Text, Pressable, Linking, StyleSheet, Animated, Easing, useWindowDimensions } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import Svg, { Path } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Btn, Loading } from "./ui";
import { Art, Glyph } from "./Art";
import { C, R } from "../theme";
import { t } from "../i18n";
import { normalizeScan } from "../core";
import { haptic, ms } from "../motion";
import { mascot } from "../../../public/lib/mascot.js";

const TYPES = ["ean13", "ean8", "upc_a", "upc_e"];
const GREEN = "#3DDC84";
const G = {
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  torch: '<path d="M8 3h8l-1 5h-6zM9 8h6v3l-1.5 2v8h-3v-8L9 11z"/>',
  photo: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
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

function Pill({ glyph, text, onPress }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button"
      style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 11, paddingHorizontal: 18, borderRadius: 999, backgroundColor: pressed ? "rgba(255,255,255,0.28)" : "rgba(255,255,255,0.16)" })}>
      <Glyph paths={glyph} size={19} color="#fff" />
      <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>{text}</Text>
    </Pressable>
  );
}

export default function CameraScanner({ onCode, onClose, onManual, onPhoto }) {
  const insets = useSafeAreaInsets();
  const { width: W, height: H } = useWindowDimensions();
  const [perm, requestPerm] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  const [found, setFound] = useState(false);
  const [slow, setSlow] = useState(false);
  const done = useRef(false);
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
    done.current = true;
    setFound(true);
    haptic.tap(); // code lu ; le verdict a sa propre vibration
    setTimeout(() => onCode(code), ms(260));
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
  const cornerColor = found ? GREEN : "#fff";
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
          {found ? <Path d={hole} fill="rgba(61,220,132,0.22)" /> : null}
        </Svg>
        <View style={{ position: "absolute", left: fx, top: fy, width: fw, height: fh }}>
          {corner("tl", -5, -5)}{corner("tr", 5, -5)}{corner("bl", -5, 5)}{corner("br", 5, 5)}
          {found ? null : (
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

      <View style={{ position: "absolute", left: 20, right: 20, bottom: insets.bottom + 28, alignItems: "center", gap: 16 }}>
        <Text accessibilityLiveRegion="polite"
          style={[{ color: "#fff", fontSize: 16.5, fontWeight: "700", textAlign: "center" },
            slow ? { backgroundColor: "rgba(0,0,0,0.55)", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, overflow: "hidden", fontWeight: "600", fontSize: 15 }
              : { textShadowColor: "rgba(0,0,0,0.6)", textShadowRadius: 6 }]}>
          {t(slow ? "cam.slow" : "cam.hint")}
        </Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 10 }}>
          {onPhoto ? <Pill glyph={G.photo} text={t("cam.photo")} onPress={onPhoto} /> : null}
          <Pill glyph={G.keys} text={t("cam.type")} onPress={onManual} />
        </View>
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
