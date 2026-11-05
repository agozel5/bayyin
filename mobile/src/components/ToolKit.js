// Briques des outils photo (mode voyage, carte de restaurant) et des pages d'outils :
// en-tête avec retour, carte d'accueil illustrée, choix de la photo, lecture du texte.
import React, { useEffect, useRef, useState } from "react";
import { View, Text, ScrollView, Pressable, Platform, Modal, Animated, Easing, Image } from "react-native";
import SafeWebView, { PAGE_BASE } from "./SafeWebView";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Tile, Glyph } from "./Art";
import { Txt, Muted } from "./ui";
import { C, R, dir, lift } from "../theme";
import { t } from "../i18n";
import { haptic, ms } from "../motion";
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
  // Galerie : le sélecteur de photos du système ne demande aucune autorisation (iOS 14+, Android 13+) ;
  // la demander ferait fermer l'app sur iPhone (aucun accès à la photothèque n'est déclaré).
  if (source === "camera") {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return "denied";
  }
  const opts = { mediaTypes: ["images"], quality: 0.7, base64: true, exif: false };
  const res = source === "camera" ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
  if (res.canceled || !res.assets || !res.assets[0] || !res.assets[0].base64) return null;
  const a = res.assets[0];
  return { uri: a.uri, base64: a.base64, mime: a.mimeType || "image/jpeg", width: a.width || 0, height: a.height || 0 };
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
  // boxes : lecture avec la position de chaque ligne -> { text, lines } (toujours par Tesseract)
  const read = async (img, langs, { boxes = false } = {}) => {
    setProgress(0);
    if (!boxes) {
      const quick = await nativeText(img.uri, { arabicOk: true });
      if (quick) return quick;
    }
    return new Promise((resolve, reject) => {
      job.current = { resolve, reject, boxes, timer: setTimeout(() => finish((j) => j.reject(new Error("timeout"))), 180000) };
      setHtml(ocrHtml(`data:${img.mime};base64,${img.base64}`, langs));
    });
  };
  const onMessage = (e) => {
    let msg;
    try { msg = JSON.parse(e.nativeEvent.data); } catch { return; }
    if (msg.type === "progress") setProgress(Math.max(0, Math.min(100, Number(msg.n) || 0)));
    if (msg.type === "done") finish((j) => {
      const text = String(msg.text || "").slice(0, 20000);
      if (!j.boxes) return j.resolve(text);
      // positions vérifiées : nombres entre 0 et 1, texte limité
      const n = (v) => Math.max(0, Math.min(1, Number(v) || 0));
      const lines = (Array.isArray(msg.lines) ? msg.lines : []).slice(0, 400).filter((l) => l && typeof l.t === "string")
        .map((l) => ({ t: l.t.slice(0, 300), x0: n(l.x0), y0: n(l.y0), x1: n(l.x1), y1: n(l.y1), c: Number(l.c) || 0 }));
      const words = (Array.isArray(msg.words) ? msg.words : []).slice(0, 2500).filter((w) => w && typeof w.t === "string")
        .map((w) => ({ t: w.t.slice(0, 60), x0: n(w.x0), y0: n(w.y0), x1: n(w.x1), y1: n(w.y1) }));
      j.resolve({ text, lines, words });
    });
    if (msg.type === "error") finish((j) => j.reject(new Error(msg.message)));
  };
  const element = html && Platform.OS !== "web" ? (
    <View style={{ position: "absolute", width: 1, height: 1, opacity: 0, left: 0, bottom: 0 }} pointerEvents="none">
      <SafeWebView source={{ html, baseUrl: PAGE_BASE }} onMessage={onMessage}
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

/**
 * Écran de lecture soigné : la photo prise, un trait de lecture qui la parcourt, les étapes qui se cochent
 * une à une, une barre de progression et des astuces qui défilent.
 * steps : [{ key, label, until }] — l'étape est terminée quand la progression dépasse `until` (0 à 100).
 */
export function ScanReading({ photo, progress = 0, steps = [], tips = [], color = "#1A9C68", title }) {
  const [w, setW] = useState(0);
  const sweep = useRef(new Animated.Value(0)).current;
  const pct = useRef(new Animated.Value(0)).current;
  const [tip, setTip] = useState(0);
  useEffect(() => {
    if (!ms(1)) return undefined;
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(sweep, { toValue: 1, duration: 1700, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
      Animated.timing(sweep, { toValue: 0, duration: 1700, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, []);
  useEffect(() => { Animated.timing(pct, { toValue: progress, duration: 450, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start(); }, [progress]);
  useEffect(() => {
    if (tips.length < 2) return undefined;
    const id = setInterval(() => setTip((n) => (n + 1) % tips.length), 3600);
    return () => clearInterval(id);
  }, [tips.length]);
  const ratio = photo && photo.width && photo.height ? photo.height / photo.width : 1.3;
  const ph = w ? Math.min(w * ratio, 340) : 0;
  const cur = steps.findIndex((st) => progress < st.until);
  const active = cur === -1 ? steps.length - 1 : cur;
  return (
    <View style={[{ backgroundColor: C.surface, borderRadius: R.xl, padding: 14, gap: 16 }, lift()]}>
      {/* La photo, parcourue par le trait de lecture */}
      <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ borderRadius: 18, overflow: "hidden", backgroundColor: "#0B1410", height: ph || 220 }}>
        {photo && photo.uri && w ? <Image source={{ uri: photo.uri }} style={{ width: w, height: ph }} resizeMode="cover" accessible={false} /> : null}
        <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, backgroundColor: "rgba(6,20,14,0.26)" }} />
        {/* coins du cadre */}
        {[[0, 0], [1, 0], [0, 1], [1, 1]].map(([x, y], i) => (
          <View key={i} pointerEvents="none" style={{ position: "absolute", width: 30, height: 30, [x ? "right" : "left"]: 12, [y ? "bottom" : "top"]: 12,
            borderColor: "#fff", [x ? "borderRightWidth" : "borderLeftWidth"]: 3, [y ? "borderBottomWidth" : "borderTopWidth"]: 3, [`border${y ? "Bottom" : "Top"}${x ? "Right" : "Left"}Radius`]: 10 }} />
        ))}
        {/* trait de lecture avec son halo */}
        <Animated.View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, height: 64, top: -32,
          transform: [{ translateY: sweep.interpolate({ inputRange: [0, 1], outputRange: [20, Math.max(20, (ph || 220) - 20)] }) }] }}>
          <View style={{ flex: 1, backgroundColor: color, opacity: 0.18 }} />
          <View style={{ position: "absolute", left: 16, right: 16, top: 31, height: 3, borderRadius: 2, backgroundColor: "#7CF2B8",
            shadowColor: "#7CF2B8", shadowOpacity: 1, shadowRadius: 10, shadowOffset: { width: 0, height: 0 } }} />
        </Animated.View>
        {/* pourcentage */}
        <View style={{ position: "absolute", [dir().rtl ? "left" : "right"]: 14, bottom: 14, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 99, backgroundColor: "rgba(0,0,0,0.55)" }}>
          <Text style={{ color: "#fff", fontWeight: "900", fontSize: 15, fontVariant: ["tabular-nums"] }}>{Math.round(progress)} %</Text>
        </View>
      </View>

      <View style={{ gap: 12, paddingHorizontal: 4 }}>
        {title ? <Txt style={{ fontSize: 18, fontWeight: "800" }}>{title}</Txt> : null}
        <View style={{ height: 8, borderRadius: 4, backgroundColor: C.tint2, overflow: "hidden" }}>
          <Animated.View style={{ height: 8, borderRadius: 4, backgroundColor: color, width: pct.interpolate({ inputRange: [0, 100], outputRange: ["3%", "100%"], extrapolate: "clamp" }) }} />
        </View>
        {/* étapes */}
        <View style={{ gap: 10 }}>
          {steps.map((st, i) => {
            const done = i < active || (cur === -1 && i === active && progress >= 100);
            const now = i === active && !done;
            return (
              <View key={st.key} style={{ flexDirection: dir().row, alignItems: "center", gap: 12 }}>
                <View style={{ width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center",
                  backgroundColor: done ? color : now ? color + "22" : C.tint2, borderWidth: now ? 2 : 0, borderColor: color }}>
                  {done ? <Glyph name="check" size={15} color="#fff" width={3} /> : now ? <PulseDot color={color} /> : null}
                </View>
                <Text style={{ flex: 1, fontSize: 15, fontWeight: now ? "800" : "600", color: done || now ? C.fg : C.faint, textAlign: dir().ta }}>{st.label}</Text>
              </View>
            );
          })}
        </View>
        {tips.length ? (
          <View style={{ flexDirection: dir().row, gap: 10, padding: 12, borderRadius: 14, backgroundColor: C.tint, alignItems: "flex-start" }}>
            <Glyph name="bulb" size={18} color="#D9A81E" />
            <Txt key={tip} style={{ flex: 1, fontSize: 13.5, lineHeight: 19 }}>{tips[tip]}</Txt>
          </View>
        ) : null}
      </View>
    </View>
  );
}
function PulseDot({ color }) {
  const a = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    if (!ms(1)) return undefined;
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(a, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(a, { toValue: 0.4, duration: 600, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, []);
  return <Animated.View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color, opacity: a, transform: [{ scale: a }] }} />;
}

export const TOOL_ICONS = {
  travel: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3z"/>',
  ingredients: '<path d="M7 3h7l5 5v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M14 3v5h5M9 12h6M9 15.5h6"/>',
  menu: '<path d="M7 3v8M5 3v5a2 2 0 0 0 4 0V3M7 11v10M17 21V3c-2.2 1.2-3 3.6-3 6.5V13h3"/>',
  camera: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.4"/>',
  gallery: '<rect x="3" y="4" width="18" height="16" rx="2.5"/><circle cx="8.5" cy="9.5" r="1.8"/><path d="M21 16l-5-5-9 9"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>',
  recipe: '<path d="M7 3h7l5 5v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M14 3v5h5M9 13l2 2 4-4"/>',
};
export const TOOL_COLORS = { travel: "#2F8FCF", menu: "#E46A3C", ingredients: "#1A9C68" };

/** Feuille de choix qui monte du bas de l'écran (ex. : que voulez-vous photographier ?) */
export function ChoiceSheet({ visible, title, items, onClose, selected }) {
  const insets = useSafeAreaInsets();
  const y = useRef(new Animated.Value(1)).current;
  const [shown, setShown] = useState(visible);
  useEffect(() => {
    if (visible) {
      setShown(true);
      y.setValue(1);
      Animated.timing(y, { toValue: 0, duration: ms(280), easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    } else if (shown) {
      Animated.timing(y, { toValue: 1, duration: ms(200), easing: Easing.in(Easing.cubic), useNativeDriver: true }).start(() => setShown(false));
    }
  }, [visible]);
  const pick = (it) => { haptic.tap(); onClose(); setTimeout(() => it.onPress && it.onPress(), ms(1) ? 220 : 0); };
  return (
    <Modal visible={shown} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <Animated.View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)", opacity: y.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) }}>
        <Pressable style={{ flex: 1 }} onPress={onClose} accessibilityRole="button" accessibilityLabel={t("sheet.back")} />
      </Animated.View>
      <Animated.View accessibilityViewIsModal style={{ position: "absolute", left: 0, right: 0, bottom: 0, backgroundColor: C.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28,
        paddingHorizontal: 18, paddingTop: 10, paddingBottom: insets.bottom + 18, gap: 12, transform: [{ translateY: y.interpolate({ inputRange: [0, 1], outputRange: [0, 760] }) }] }}>
        <View style={{ alignSelf: "center", width: 40, height: 5, borderRadius: 3, backgroundColor: C.line }} />
        <Txt accessibilityRole="header" style={{ fontSize: 20, fontWeight: "800", paddingHorizontal: 4 }}>{title}</Txt>
        <ScrollView style={[{ backgroundColor: C.surface, borderRadius: R.xl, maxHeight: 520 }, lift()]} bounces={false}>
          {items.map((it, i) => (
            <Pressable key={it.id} onPress={() => pick(it)} accessibilityRole="button" accessibilityLabel={`${it.title}. ${it.sub || ""}`}
              style={({ pressed }) => ({ flexDirection: dir().row, alignItems: "center", gap: 14, padding: 16, borderTopWidth: i ? 0.5 : 0, borderTopColor: C.line, backgroundColor: pressed ? C.tint : "transparent" })}>
              {it.emoji ? (
                <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: C.tint, alignItems: "center", justifyContent: "center" }}><Text style={{ fontSize: 24 }}>{it.emoji}</Text></View>
              ) : <Tile color={it.color} paths={it.paths} size={44} />}
              <View style={{ flex: 1, gap: 2 }}>
                <Txt style={{ fontWeight: "800", fontSize: 16.5 }}>{it.title}</Txt>
                {it.sub ? <Muted style={{ fontSize: 13.5, lineHeight: 18 }}>{it.sub}</Muted> : null}
              </View>
              {selected === undefined ? <Glyph name="chev" size={17} color={C.faint} />
                : selected === it.id ? <Glyph name="check" size={20} color={C.brand} width={2.6} /> : <View style={{ width: 20 }} />}
            </Pressable>
          ))}
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}

/** Ligne de réglage dans une carte : libellé à gauche, valeur et flèche à droite */
export function SettingLine({ label, value, onPress }) {
  return (
    <Pressable onPress={() => { haptic.tap(); onPress(); }} accessibilityRole="button" accessibilityLabel={`${label}, ${value}`}
      style={({ pressed }) => ({ flexDirection: dir().row, alignItems: "center", gap: 10, paddingVertical: 13, paddingHorizontal: 14, borderRadius: 14, backgroundColor: pressed ? C.tint2 : C.tint })}>
      <Text style={{ flex: 1, fontSize: 15, color: C.muted, textAlign: dir().ta }} numberOfLines={1}>{label}</Text>
      <Text style={{ fontSize: 15, fontWeight: "800", color: C.fg }} numberOfLines={1}>{value}</Text>
      <Glyph name="chev" size={16} color={C.faint} />
    </Pressable>
  );
}
