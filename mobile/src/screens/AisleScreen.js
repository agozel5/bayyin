// Mode rayon : la caméra lit les codes-barres d'un rayon au fil de l'eau et pose sur chacun
// une pastille verte, orange ou rouge, à l'endroit où il se trouve à l'écran.
import React, { useEffect, useRef, useState } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet, Linking } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Btn, Loading } from "../components/ui";
import { Glyph } from "../components/Art";
import { C, STATUS_COLORS } from "../theme";
import { t, tn } from "../i18n";
import { haptic } from "../motion";
import { normalizeScan } from "../core";
import { fetchProduct } from "../api";
import { getEntry } from "../storage";
import { verdictOf, profileOf, nameOf, S } from "../view";

const TYPES = ["ean13", "ean8", "upc_a", "upc_e"];
const KEEP = 900; // une pastille reste affichée un peu après que le code a quitté l'image
const color = (p) => {
  if (!p) return ["#FFFFFF", "rgba(20,28,24,0.78)"];
  const st = verdictOf(p).status;
  const al = profileOf(p).alert;
  if (st === "haram" || al === "no") return ["#FFFFFF", "#D93A30"];
  if (st === "mashbouh" || al) return ["#FFFFFF", "#E08A12"];
  if (st === "halal_certifie" || st === "halal_probable") return ["#FFFFFF", "#169B57"];
  return ["#FFFFFF", "#5F6B65"];
};

export default function AisleScreen({ onClose, onOpen }) {
  const insets = useSafeAreaInsets();
  const [perm, requestPerm] = useCameraPermissions();
  const hits = useRef(new Map()); // code -> { rect, at }
  const products = useRef(new Map()); // code -> produit (ou null si introuvable)
  const [seen, setSeen] = useState([]); // codes vus, du plus récent au plus ancien
  const [, setTick] = useState(0);
  const last = useRef(0);

  useEffect(() => {
    const id = setInterval(() => {
      const now = Date.now();
      let changed = false;
      hits.current.forEach((h, k) => { if (now - h.at > KEEP) { hits.current.delete(k); changed = true; } });
      if (changed) setTick((n) => n + 1);
    }, 250);
    return () => clearInterval(id);
  }, []);

  const onScanned = (r) => {
    const code = normalizeScan(r.data);
    if (!code) return;
    const b = r.bounds && r.bounds.origin ? r.bounds : null;
    hits.current.set(code, { rect: b ? { x: b.origin.x, y: b.origin.y, w: b.size.width, h: b.size.height } : null, at: Date.now() });
    if (!products.current.has(code)) {
      products.current.set(code, undefined);
      haptic.tap();
      setSeen((s) => [code, ...s.filter((c) => c !== code)].slice(0, 30));
      const saved = getEntry(code);
      if (saved) { products.current.set(code, saved.p); }
      else fetchProduct(code).then((p) => { products.current.set(code, p || null); if (p) { const [, bg] = color(p); if (bg === "#D93A30") haptic.warn(); } setTick((n) => n + 1); }).catch(() => products.current.set(code, null));
    }
    if (Date.now() - last.current > 120) { last.current = Date.now(); setTick((n) => n + 1); }
  };

  if (!perm) return <View style={{ flex: 1, backgroundColor: "#000", justifyContent: "center" }}><Loading text={t("cam.opening")} /></View>;
  if (!perm.granted) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, padding: 24, paddingTop: insets.top + 24, gap: 14, justifyContent: "center" }}>
        <Text style={{ fontSize: 22, fontWeight: "800", color: C.fg, textAlign: "center" }}>{t("cam.err.denied.t")}</Text>
        <Text style={{ fontSize: 16, lineHeight: 23, color: C.muted, textAlign: "center" }}>{t("cam.err.denied.p")}</Text>
        {perm.canAskAgain ? <Btn title={t("cam.allow")} onPress={requestPerm} /> : <Btn title={t("cam.open_settings")} onPress={() => Linking.openSettings().catch(() => {})} />}
        <Btn title={t("sheet.back")} kind="soft" onPress={onClose} />
      </View>
    );
  }

  const live = [...hits.current.entries()].filter(([, h]) => h.rect);
  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      <CameraView style={StyleSheet.absoluteFill} facing="back" barcodeScannerSettings={{ barcodeTypes: TYPES }} onBarcodeScanned={onScanned} />
      {/* Pastilles posées sur les codes-barres visibles */}
      {live.map(([code, h]) => {
        const p = products.current.get(code);
        const [fg, bg] = color(p);
        const label = p ? (profileOf(p).alert ? t(`alert.short.${profileOf(p).alert}`) : S(verdictOf(p).status, "short")) : p === null ? "?" : "…";
        return (
          <Pressable key={code} onPress={() => p && onOpen(code, { product: p })} accessibilityRole="button" accessibilityLabel={p ? `${nameOf(p)}, ${label}` : code}
            style={{ position: "absolute", left: h.rect.x + h.rect.w / 2 - 70, top: Math.max(insets.top + 60, h.rect.y - 46), width: 140, alignItems: "center" }}>
            <View style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, backgroundColor: bg, maxWidth: 140, borderWidth: 2, borderColor: "rgba(255,255,255,0.9)" }}>
              <Text numberOfLines={1} style={{ color: fg, fontWeight: "900", fontSize: 14, textAlign: "center" }}>{label}</Text>
              {p ? <Text numberOfLines={1} style={{ color: "rgba(255,255,255,0.9)", fontSize: 11, textAlign: "center" }}>{nameOf(p)}</Text> : null}
            </View>
            <View style={{ width: 0, height: 0, borderLeftWidth: 7, borderRightWidth: 7, borderTopWidth: 8, borderLeftColor: "transparent", borderRightColor: "transparent", borderTopColor: "rgba(255,255,255,0.9)" }} />
          </Pressable>
        );
      })}

      <View style={{ position: "absolute", top: insets.top + 12, left: 16, right: 16, flexDirection: "row", alignItems: "center", gap: 12 }}>
        <Pressable onPress={onClose} hitSlop={8} accessibilityRole="button" accessibilityLabel={t("cam.close")}
          style={{ width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.45)" }}>
          <Glyph paths='<path d="M6 6l12 12M18 6L6 18"/>' size={22} color="#fff" width={2.2} />
        </Pressable>
        <View style={{ flex: 1, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 16, backgroundColor: "rgba(0,0,0,0.45)" }}>
          <Text style={{ color: "#fff", fontWeight: "800", fontSize: 15 }}>{t("aisle.title")}</Text>
          <Text style={{ color: "rgba(255,255,255,0.8)", fontSize: 12.5 }}>{seen.length ? tn("aisle.seen", seen.length) : t("aisle.promo")}</Text>
        </View>
      </View>

      <View style={{ position: "absolute", left: 0, right: 0, bottom: insets.bottom + 18, gap: 10 }}>
        <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15, textAlign: "center", paddingHorizontal: 24, textShadowColor: "rgba(0,0,0,0.6)", textShadowRadius: 6 }}>{t("aisle.hint")}</Text>
        {seen.length ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
            {seen.map((code) => {
              const p = products.current.get(code);
              const [, bg] = color(p);
              return (
                <Pressable key={code} onPress={() => p && onOpen(code, { product: p })} accessibilityRole="button"
                  style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 99, backgroundColor: "rgba(12,20,16,0.82)", maxWidth: 220 }}>
                  <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: bg }} />
                  <Text numberOfLines={1} style={{ color: "#fff", fontWeight: "700", fontSize: 13.5, flexShrink: 1 }}>{p ? nameOf(p) : code}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        ) : null}
      </View>
    </View>
  );
}
