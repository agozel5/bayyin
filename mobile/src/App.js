// Bayyin — application native (iOS et Android).
// Cinq onglets en bas, et une pile d'écrans par-dessus : caméra, fiche produit, lecture d'étiquette.
import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, Pressable, BackHandler, Animated, Easing, StyleSheet } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { scanFromURLAsync } from "expo-camera";
import Icon, { Logo } from "./components/Icon";
import ProductSheet from "./components/ProductSheet";
import CameraScanner from "./components/CameraScanner";
import OcrFlow from "./components/OcrFlow";
import ScanScreen from "./screens/ScanScreen";
import SearchScreen from "./screens/SearchScreen";
import HistoryScreen from "./screens/HistoryScreen";
import AdditivesScreen from "./screens/AdditivesScreen";
import SettingsScreen from "./screens/SettingsScreen";
import { C, dir } from "./theme";
import { t, setLang, getLang } from "./i18n";
import { initStorage, getSettings, subscribe } from "./storage";
import { normalizeScan } from "./core";
import { FadeIn } from "./components/ui";
import { haptic, ms, announce } from "./motion";

const TABS = [
  { id: "scan", icon: "scan" },
  { id: "search", icon: "search" },
  { id: "history", icon: "history" },
  { id: "additives", icon: "flask" },
  { id: "settings", icon: "gear" },
];
const BARCODE_TYPES = ["ean13", "ean8", "upc_a", "upc_e"];

function TabBar({ tab, onTab }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flexDirection: dir().row, borderTopWidth: 1, borderTopColor: C.line, backgroundColor: "#fff", paddingBottom: Math.max(insets.bottom, 8), paddingTop: 6 }}>
      {TABS.map((it) => {
        const on = tab === it.id;
        return (
          <Pressable
            key={it.id}
            onPress={() => {
              if (!on) haptic.tap();
              onTab(it.id);
            }}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            accessibilityLabel={t(`tab.${it.id}`)}
            style={{ flex: 1, alignItems: "center", gap: 3, paddingVertical: 4 }}
          >
            <View style={{ paddingHorizontal: 16, paddingVertical: 4, borderRadius: 999, backgroundColor: on ? C.brandSoft : "transparent" }}>
              <Icon name={it.icon} size={23} color={on ? C.brand : C.muted} width={on ? 2.3 : 2} />
            </View>
            <Text numberOfLines={1} style={{ fontSize: 11, fontWeight: on ? "800" : "600", color: on ? C.brand : C.muted }}>
              {t(`tab.${it.id}`)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function Toast({ text }) {
  const insets = useSafeAreaInsets();
  useEffect(() => announce(text), [text]);
  if (!text) return null;
  return (
    <View pointerEvents="none" style={{ position: "absolute", left: 20, right: 20, bottom: insets.bottom + 90, alignItems: "center" }}>
      <FadeIn key={text} distance={14}>
        <View style={{ backgroundColor: C.fg, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 18, shadowColor: "#000", shadowOpacity: 0.18, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 6 }}>
          <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15, textAlign: "center" }}>{text}</Text>
        </View>
      </FadeIn>
    </View>
  );
}

// Un écran posé par-dessus les onglets, qui entre et sort en glissant.
// fiche produit : glisse depuis le bord (sens de lecture) ; lecture d'étiquette : monte ; caméra : fondu.
function Layer({ kind, instant, leaving, onGone, hidden, children }) {
  const v = useRef(new Animated.Value(instant || !ms(1) ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(v, { toValue: 1, duration: ms(kind === "camera" ? 180 : 260), easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, []);
  useEffect(() => {
    if (!leaving) return;
    Animated.timing(v, { toValue: 0, duration: ms(200), easing: Easing.in(Easing.cubic), useNativeDriver: true }).start(() => onGone && onGone());
  }, [leaving]);
  const side = dir().rtl ? -1 : 1;
  const transform =
    kind === "sheet"
      ? [{ translateX: v.interpolate({ inputRange: [0, 1], outputRange: [side * 70, 0] }) }]
      : kind === "ocr"
        ? [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [80, 0] }) }]
        : [];
  return (
    <Animated.View
      pointerEvents={hidden || leaving ? "none" : "auto"}
      importantForAccessibility={hidden ? "no-hide-descendants" : "auto"}
      accessibilityElementsHidden={!!hidden}
      accessibilityViewIsModal={!hidden}
      style={[StyleSheet.absoluteFill, { backgroundColor: kind === "camera" ? "#000" : C.bg, opacity: v, transform }]}
    >
      {children}
    </Animated.View>
  );
}

function Main() {
  const [tab, setTab] = useState("scan");
  // Pile d'écrans au-dessus des onglets : { type: "camera" } | { type: "sheet", code, product?, fromScan } | { type: "ocr", code }
  const [stack, setStack] = useState([]);
  const [leaving, setLeaving] = useState(null); // clé de l'écran en train de se fermer
  const [, setTick] = useState(0);
  const [toastText, setToastText] = useState(null);
  const [manualOpen, setManualOpen] = useState(false);
  const [homeStatus, setHomeStatus] = useState(null);
  const [focus, setFocus] = useState({ target: null, n: 0 });
  const toastTimer = useRef(null);
  const nonce = useRef(0);

  useEffect(
    () =>
      subscribe((what) => {
        if (what === "settings") setLang(getSettings().lang);
        setTick((n) => n + 1);
      }),
    []
  );

  const toast = useCallback((text) => {
    setToastText(text);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastText(null), 2200);
  }, []);

  const top = stack[stack.length - 1];
  const push = (screen, { replace = false } = {}) => {
    setLeaving(null);
    setStack((s) => [...(replace ? s.slice(0, -1) : s), { ...screen, key: ++nonce.current }]);
  };
  // Fermeture animée : l'écran glisse, puis il est retiré de la pile.
  const pop = () => {
    if (!top || leaving) return;
    setLeaving(top.key);
  };
  const removeTop = (key) => {
    setStack((s) => (s.length && s[s.length - 1].key === key ? s.slice(0, -1) : s));
    setLeaving(null);
  };
  const clearStack = () => {
    setLeaving(null);
    setStack([]);
  };

  // Bouton retour d'Android : ferme d'abord l'écran du dessus.
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (stack.length) {
        pop();
        return true;
      }
      if (tab !== "scan") {
        setTab("scan");
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [stack, tab, leaving]);

  const openProduct = (code, { fromScan = false, product = null, replace } = {}) => {
    const onTop = top && (top.type === "sheet" || top.type === "camera" || top.type === "ocr");
    push({ type: "sheet", code, product, fromScan }, { replace: replace ?? !!onTop });
  };
  const openCamera = ({ replace = false } = {}) => {
    setHomeStatus(null);
    push({ type: "camera" }, { replace });
  };
  const openOcr = (code) => push({ type: "ocr", code: code || null }, { replace: !!top });
  const gotoSettings = (target = "school") => {
    clearStack();
    setTab("settings");
    setFocus((f) => ({ target, n: f.n + 1 }));
  };
  const gotoProfile = () => gotoSettings("profile");

  // Android : lecture du code-barres sur une photo
  const photoBarcode = async () => {
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) return setHomeStatus({ title: t("cam.err.denied.t"), text: t("cam.err.denied.p") });
      const res = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 1 });
      if (res.canceled || !res.assets || !res.assets[0]) return;
      setHomeStatus({ title: t("cam.reading"), text: "" });
      const found = await scanFromURLAsync(res.assets[0].uri, BARCODE_TYPES);
      const code = (found || []).map((r) => normalizeScan(r.data)).find(Boolean);
      if (!code) {
        haptic.warn();
        return setHomeStatus({ title: t("msg.photo_unreadable.t"), text: t("msg.photo_unreadable.p") });
      }
      setHomeStatus(null);
      haptic.success();
      openProduct(code, { fromScan: true });
    } catch {
      setHomeStatus({ title: t("msg.reader_error.t"), text: t("msg.photo_unreadable.p") });
    }
  };

  const changeTab = (id) => {
    clearStack();
    setTab(id);
  };

  let page;
  if (tab === "scan")
    page = (
      <ScanScreen
        onScan={() => openCamera()}
        onOpen={(code, o) => openProduct(code, o)}
        onOcr={openOcr}
        onPhotoBarcode={photoBarcode}
        onGoto={changeTab}
        onGotoSettings={() => gotoSettings()}
        onGotoProfile={gotoProfile}
        manualOpen={manualOpen}
        setManualOpen={setManualOpen}
        status={homeStatus}
      />
    );
  if (tab === "search") page = <SearchScreen onOpen={(code) => openProduct(code)} />;
  if (tab === "history") page = <HistoryScreen onOpen={(code) => openProduct(code)} onScan={() => openCamera()} toast={toast} />;
  if (tab === "additives") page = <AdditivesScreen onGotoSettings={() => gotoSettings()} />;
  if (tab === "settings") page = <SettingsScreen focus={focus} />;

  const renderScreen = (item) => {
    if (item.type === "camera")
      return (
        <CameraScanner
          onCode={(code) => openProduct(code, { fromScan: true, replace: true })}
          onClose={pop}
          onManual={() => {
            clearStack();
            setTab("scan");
            setManualOpen(true);
          }}
        />
      );
    if (item.type === "sheet")
      return (
        <ProductSheet
          code={item.code}
          product={item.product}
          fromScan={item.fromScan}
          onClose={pop}
          onOpen={(code) => push({ type: "sheet", code, fromScan: false }, { replace: code === item.code })}
          onScanAgain={() => openCamera({ replace: true })}
          onOcr={openOcr}
          onGotoSettings={() => gotoSettings()}
          onGotoProfile={gotoProfile}
          toast={toast}
        />
      );
    if (item.type === "ocr")
      return (
        <OcrFlow
          code={item.code}
          onClose={pop}
          onDone={(p, saved) => {
            haptic.success();
            openProduct(p.code, { product: p, replace: true });
            if (saved) toast(t("ocr.saved"));
          }}
        />
      );
    return null;
  };

  // L'écran précédent reste monté sous celui du dessus : le retour est immédiat et garde la position.
  const visible = stack.slice(-2).filter((item, i, arr) => item.type !== "camera" || i === arr.length - 1);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar style={top && top.type === "camera" && leaving !== top.key ? "light" : "dark"} />
      <View key={getLang()} style={{ flex: 1 }} importantForAccessibility={stack.length ? "no-hide-descendants" : "auto"} accessibilityElementsHidden={stack.length > 0}>
        <FadeIn key={tab} distance={0} style={{ flex: 1 }}>
          {page}
        </FadeIn>
        <TabBar tab={tab} onTab={changeTab} />
      </View>
      {visible.map((item) => {
        const isTop = item === top;
        return (
          <Layer
            key={item.key}
            kind={item.type}
            instant={!isTop}
            hidden={!isTop}
            leaving={leaving === item.key}
            onGone={() => removeTop(item.key)}
          >
            {renderScreen(item)}
          </Layer>
        );
      })}
      <Toast text={toastText} />
    </View>
  );
}

function Splash() {
  return (
    <View style={{ flex: 1, backgroundColor: C.brand, alignItems: "center", justifyContent: "center" }}>
      <Logo size={96} />
    </View>
  );
}

// L'écran de démarrage (même vert que celui du système) s'efface en douceur une fois les données chargées.
function SplashFade({ onDone }) {
  const v = useRef(new Animated.Value(1)).current;
  const scale = v.interpolate({ inputRange: [0, 1], outputRange: [1.15, 1] });
  useEffect(() => {
    Animated.timing(v, { toValue: 0, duration: ms(380), delay: ms(120), useNativeDriver: true }).start(onDone);
  }, []);
  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: C.brand, alignItems: "center", justifyContent: "center", opacity: v }]}>
      <Animated.View style={{ transform: [{ scale }] }}>
        <Logo size={96} />
      </Animated.View>
    </Animated.View>
  );
}

export default function App() {
  const [ready, setReady] = useState(false);
  const [splash, setSplash] = useState(true);
  useEffect(() => {
    initStorage()
      .catch(() => {})
      .finally(() => {
        const s = getSettings();
        setLang(s ? s.lang : "fr");
        setReady(true);
      });
  }, []);
  const ok = ready && getSettings();
  return (
    <SafeAreaProvider>
      {ok ? <Main /> : <Splash />}
      {ok && splash ? <SplashFade onDone={() => setSplash(false)} /> : null}
    </SafeAreaProvider>
  );
}
