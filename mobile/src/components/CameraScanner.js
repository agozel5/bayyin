// Caméra plein écran : lecture native des codes-barres (EAN-13, EAN-8, UPC-A, UPC-E).
import React, { useRef, useState } from "react";
import { View, Text, Pressable, Linking, StyleSheet } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Icon from "./Icon";
import { Btn, Loading } from "./ui";
import { C, R } from "../theme";
import { t } from "../i18n";
import { normalizeScan } from "../core";

const TYPES = ["ean13", "ean8", "upc_a", "upc_e"];

export default function CameraScanner({ onCode, onClose, onManual }) {
  const insets = useSafeAreaInsets();
  const [perm, requestPerm] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  const done = useRef(false);

  const onScanned = ({ data }) => {
    if (done.current) return;
    const code = normalizeScan(data);
    if (!code) return; // la clé de contrôle écarte les lectures erronées
    done.current = true;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    onCode(code);
  };

  const round = { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.45)" };

  if (!perm) {
    return (
      <View style={[styles.full, { backgroundColor: "#000", justifyContent: "center" }]}>
        <Loading text={t("cam.opening")} />
      </View>
    );
  }

  if (!perm.granted) {
    return (
      <View style={[styles.full, { backgroundColor: C.bg, padding: 24, paddingTop: insets.top + 24, gap: 14, justifyContent: "center" }]}>
        <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: C.brandSoft, alignItems: "center", justifyContent: "center", alignSelf: "center" }}>
          <Icon name="camera" size={34} color={C.brand} />
        </View>
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

  return (
    <View style={[styles.full, { backgroundColor: "#000" }]}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        enableTorch={torch}
        barcodeScannerSettings={{ barcodeTypes: TYPES }}
        onBarcodeScanned={onScanned}
      />
      {/* Cadre de visée */}
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { alignItems: "center", justifyContent: "center" }]}>
        <View style={styles.frame}>
          <View style={[styles.corner, { top: -2, left: -2, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 18 }]} />
          <View style={[styles.corner, { top: -2, right: -2, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 18 }]} />
          <View style={[styles.corner, { bottom: -2, left: -2, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: 18 }]} />
          <View style={[styles.corner, { bottom: -2, right: -2, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: 18 }]} />
          <View style={styles.laser} />
        </View>
        <Text style={styles.hint}>{t("cam.hint")}</Text>
      </View>

      <View style={[styles.topBar, { top: insets.top + 10 }]}>
        <Pressable onPress={onClose} style={round} accessibilityLabel={t("cam.close")} hitSlop={8}>
          <Icon name="close" color="#fff" size={24} />
        </Pressable>
        <Pressable
          onPress={() => setTorch((v) => !v)}
          style={[round, torch ? { backgroundColor: C.gold } : null]}
          accessibilityLabel={t("cam.torch")}
          accessibilityState={{ selected: torch }}
          hitSlop={8}
        >
          <Icon name="torch" color={torch ? "#000" : "#fff"} size={22} />
        </Pressable>
      </View>

      <View style={[styles.bottomBar, { bottom: insets.bottom + 18 }]}>
        <Pressable onPress={onManual} style={styles.pillBtn}>
          <Icon name="keyboard" color="#fff" size={20} />
          <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>{t("cam.type")}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  full: { flex: 1 },
  frame: { width: "78%", maxWidth: 360, aspectRatio: 1.6, borderRadius: R.lg, justifyContent: "center" },
  corner: { position: "absolute", width: 40, height: 40, borderColor: "#fff" },
  laser: { height: 2, marginHorizontal: 16, backgroundColor: "#FF5A4E", opacity: 0.9 },
  hint: { color: "#fff", fontSize: 16, fontWeight: "700", marginTop: 24, textShadowColor: "rgba(0,0,0,0.6)", textShadowRadius: 6, textAlign: "center", paddingHorizontal: 24 },
  topBar: { position: "absolute", left: 16, right: 16, flexDirection: "row", justifyContent: "space-between" },
  bottomBar: { position: "absolute", left: 16, right: 16, alignItems: "center" },
  pillBtn: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 12, paddingHorizontal: 20, borderRadius: 999, backgroundColor: "rgba(0,0,0,0.55)" },
});
