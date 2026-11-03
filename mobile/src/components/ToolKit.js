// Briques des outils photo (mode voyage, carte de restaurant) et des pages d'outils :
// en-tête avec retour, carte d'accueil illustrée, choix de la photo, lecture du texte.
import React, { useRef, useState } from "react";
import { View, Text, ScrollView, Pressable, Platform } from "react-native";
import { WebView } from "react-native-webview";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Tile, Glyph } from "./Art";
import { Txt, Muted } from "./ui";
import { C, R, dir, lift } from "../theme";
import { t } from "../i18n";
import { haptic } from "../motion";
import { nativeText, ocrHtml } from "./OcrFlow";

/** Page d'outil : titre, retour, contenu qui défile */
export function ToolPage({ title, onClose, children, scrollRef, right }) {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView ref={scrollRef} style={{ flex: 1, backgroundColor: C.bg }} keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ paddingHorizontal: 20, paddingTop: insets.top + 12, paddingBottom: insets.bottom + 40, gap: 16 }}>
      <View style={{ flexDirection: dir().row, alignItems: "center", gap: 6 }}>
        <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel={t("sheet.back")} style={{ padding: 4, transform: [{ scaleX: dir().rtl ? -1 : 1 }] }}>
          <Glyph paths='<path d="M15 5l-7 7 7 7"/>' size={24} color={C.fg} width={2.2} />
        </Pressable>
        <Text accessibilityRole="header" numberOfLines={1} style={{ flex: 1, fontSize: 22, fontWeight: "800", letterSpacing: -0.4, color: C.fg, textAlign: dir().ta }}>{title}</Text>
        {right || null}
      </View>
      {children}
    </ScrollView>
  );
}

/** Carte d'accueil d'un outil : grande icône colorée, titre, texte, puis les actions */
export function ToolIntro({ color, paths, title, text, points = [], children }) {
  return (
    <View style={[{ backgroundColor: C.surface, borderRadius: R.xl, padding: 20, gap: 14 }, lift()]}>
      <View style={{ flexDirection: dir().row, alignItems: "center", gap: 14 }}>
        <Tile color={color} paths={paths} size={56} />
        <Txt style={{ flex: 1, fontSize: 19, lineHeight: 24, fontWeight: "800" }}>{title}</Txt>
      </View>
      <Muted style={{ fontSize: 15, lineHeight: 22 }}>{text}</Muted>
      {points.length ? (
        <View style={{ gap: 8 }}>
          {points.map((x, i) => (
            <View key={i} style={{ flexDirection: dir().row, gap: 10, alignItems: "flex-start" }}>
              <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: color + "22", alignItems: "center", justifyContent: "center", marginTop: 1 }}>
                <Text style={{ color, fontWeight: "900", fontSize: 12 }}>{i + 1}</Text>
              </View>
              <Txt style={{ flex: 1, fontSize: 14.5, lineHeight: 21 }}>{x}</Txt>
            </View>
          ))}
        </View>
      ) : null}
      {children ? <View style={{ gap: 10, marginTop: 2 }}>{children}</View> : null}
    </View>
  );
}

/** Bouton plein ou doux, avec icône */
export function ToolBtn({ text, icon, paths, onPress, soft, disabled }) {
  return (
    <Pressable onPress={() => { haptic.light(); onPress(); }} disabled={disabled} accessibilityRole="button"
      style={({ pressed }) => ({ flexDirection: dir().row, alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 15, paddingHorizontal: 16, borderRadius: 16, opacity: disabled ? 0.5 : 1,
        backgroundColor: soft ? (pressed ? C.tint2 : C.tint) : pressed ? C.brandDark : C.brand })}>
      <Glyph name={icon} paths={paths} size={20} color={soft ? C.fg : "#fff"} width={2.1} />
      <Text style={{ color: soft ? C.fg : "#fff", fontWeight: "800", fontSize: 16 }}>{text}</Text>
    </Pressable>
  );
}

/** Photo prise ou choisie -> { uri, base64, mime } ; null si annulé ; "denied" sans autorisation */
export async function pickImage(source = "camera") {
  const ImagePicker = require("expo-image-picker");
  const perm = source === "camera" ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return "denied";
  const opts = { mediaTypes: ["images"], quality: 0.7, base64: true, exif: false };
  const res = source === "camera" ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
  if (res.canceled || !res.assets || !res.assets[0] || !res.assets[0].base64) return null;
  const a = res.assets[0];
  return { uri: a.uri, base64: a.base64, mime: a.mimeType || "image/jpeg" };
}

/**
 * Lecture du texte d'une photo : d'abord le lecteur du téléphone (instantané, sans réseau),
 * sinon Tesseract dans une WebView invisible. `element` doit être placé dans l'écran.
 */
export function useTextReader() {
  const [html, setHtml] = useState(null);
  const [progress, setProgress] = useState(0);
  const job = useRef(null);
  const finish = (fn) => { const j = job.current; job.current = null; setHtml(null); if (j) { clearTimeout(j.timer); fn(j); } };
  const read = async (img, langs) => {
    setProgress(0);
    const quick = await nativeText(img.uri, { arabicOk: true });
    if (quick) return quick;
    return new Promise((resolve, reject) => {
      job.current = { resolve, reject, timer: setTimeout(() => finish((j) => j.reject(new Error("timeout"))), 120000) };
      setHtml(ocrHtml(`data:${img.mime};base64,${img.base64}`, langs));
    });
  };
  const onMessage = (e) => {
    let msg;
    try { msg = JSON.parse(e.nativeEvent.data); } catch { return; }
    if (msg.type === "progress") setProgress(msg.n);
    if (msg.type === "done") finish((j) => j.resolve(msg.text || ""));
    if (msg.type === "error") finish((j) => j.reject(new Error(msg.message)));
  };
  const element = html && Platform.OS !== "web" ? (
    <View style={{ position: "absolute", width: 1, height: 1, opacity: 0, left: 0, bottom: 0 }} pointerEvents="none">
      <WebView source={{ html, baseUrl: "https://agozel5.github.io/bayyin/" }} originWhitelist={["*"]} javaScriptEnabled onMessage={onMessage}
        onError={() => finish((j) => j.reject(new Error("webview")))} />
    </View>
  ) : null;
  return { read, progress, element };
}

/** Carte « lecture en cours » avec barre de progression */
export function Reading({ progress, text }) {
  return (
    <View style={[{ backgroundColor: C.surface, borderRadius: R.xl, padding: 22, gap: 12, alignItems: "center" }, lift()]}>
      <Txt style={{ fontWeight: "800", fontSize: 17, textAlign: "center" }}>{progress ? t("ocr.reading", { n: progress }) : text || t("ocr.loading")}</Txt>
      <Muted style={{ fontSize: 14, textAlign: "center" }}>{t("ocr.loading_note")}</Muted>
      <View style={{ alignSelf: "stretch", height: 8, borderRadius: 4, backgroundColor: C.tint2, overflow: "hidden", flexDirection: dir().row }}>
        <View style={{ width: `${Math.max(3, progress)}%`, backgroundColor: C.brand, borderRadius: 4 }} />
      </View>
    </View>
  );
}

export const TOOL_ICONS = {
  travel: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3z"/>',
  menu: '<path d="M7 3v8M5 3v5a2 2 0 0 0 4 0V3M7 11v10M17 21V3c-2.2 1.2-3 3.6-3 6.5V13h3"/>',
  brand: '<path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="8" r="1.5"/>',
  camera: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.4"/>',
  gallery: '<rect x="3" y="4" width="18" height="16" rx="2.5"/><circle cx="8.5" cy="9.5" r="1.8"/><path d="M21 16l-5-5-9 9"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>',
  recipe: '<path d="M7 3h7l5 5v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M14 3v5h5M9 13l2 2 4-4"/>',
};
export const TOOL_COLORS = { travel: "#2F8FCF", menu: "#E46A3C", brand: "#8A63DA" };
