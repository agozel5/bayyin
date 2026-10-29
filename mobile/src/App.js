// Bayyin — application native (iOS et Android).
// Cinq onglets en bas, et une pile d'écrans par-dessus : caméra, fiche produit, lecture d'étiquette.
import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, Pressable, BackHandler, Animated, Easing, StyleSheet, Platform, Appearance, AppState } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { scanFromURLAsync } from "expo-camera";
import Icon, { Logo } from "./components/Icon";
import ProductSheet from "./components/ProductSheet";
import CameraScanner from "./components/CameraScanner";
import OcrFlow from "./components/OcrFlow";
import ScanScreen from "./screens/ScanScreen";
import RankingsScreen from "./screens/RankingsScreen";
import Tour, { tourRef } from "./components/Tour";
import SearchScreen from "./screens/SearchScreen";
import HistoryScreen from "./screens/HistoryScreen";
import AdditivesScreen from "./screens/AdditivesScreen";
import SettingsScreen from "./screens/SettingsScreen";
import { C, dir, applyTheme, isDark } from "./theme";
import { Glyph } from "./components/Art";
import { t, setLang, getLang } from "./i18n";
import { initStorage, getSettings, setSettings, subscribe, getHistory } from "./storage";
import { checkRecalls, dismissRecalls, notifyRecalls, setupNotifications, askNotifications, onNotificationOpen } from "./recalls";
import { registerBackground } from "./background";
import { listenLinks, setQuickActions } from "./links";
import { normalizeScan } from "./core";
import { FadeIn } from "./components/ui";
import { haptic, ms, announce } from "./motion";

// Même ordre que la version web : le scanner au centre, en relief
const TABS = [
  { id: "search", icon: "search" },
  { id: "history", icon: "history" },
  { id: "scan", icon: "scan" },
  { id: "additives", icon: "flask" },
  { id: "settings", icon: "gear" },
];
const BARCODE_TYPES = ["ean13", "ean8", "upc_a", "upc_e"];
const TAB_GLYPH = {
  search: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4 4"/>',
  history: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  scan: '<path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3M8 9v6M11 9v6M14 9v6M17 9v6"/>',
  additives: '<path d="M9 3h6M10 3v6.2L4.8 18a2 2 0 0 0 1.7 3h11a2 2 0 0 0 1.7-3L14 9.2V3"/><path d="M7.5 15h9"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
};

// Barre d'onglets flottante, arrondie, avec le bouton Scanner en relief au centre
function TabBar({ tab, onTab }) {
  const insets = useSafeAreaInsets();
  return (
    <View pointerEvents="box-none" style={{ position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 12, paddingBottom: Math.max(insets.bottom, 10) }}>
      <View style={{ flexDirection: dir().row, alignItems: "flex-end", backgroundColor: C.tabbar, borderRadius: 30, paddingTop: 8, paddingBottom: 8,
        borderWidth: 0.5, borderColor: isDark() ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
        shadowColor: "#000", shadowOpacity: isDark() ? 0.5 : 0.12, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 10 }}>
        {TABS.map((it) => {
          const on = tab === it.id;
          const scan = it.id === "scan";
          return (
            <Pressable
              key={it.id}
              ref={scan ? undefined : tourRef(it.id)}
              onPress={() => {
                haptic.tap();
                onTab(it.id);
              }}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              accessibilityLabel={t(`tab.${it.id}`)}
              style={{ flex: 1, alignItems: "center", gap: 3 }}
            >
              {scan ? (
                <View style={{ marginTop: -30, width: 62, height: 62, borderRadius: 31, backgroundColor: C.brand, alignItems: "center", justifyContent: "center",
                  borderWidth: 4, borderColor: C.bg, shadowColor: C.brand, shadowOpacity: 0.45, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 8 }}>
                  <Glyph paths={TAB_GLYPH.scan} size={28} color="#fff" width={2.2} />
                </View>
              ) : (
                <View style={{ paddingHorizontal: 14, paddingVertical: 3, borderRadius: 999, backgroundColor: on ? C.brandSoft : "transparent" }}>
                  <Glyph paths={TAB_GLYPH[it.id]} size={23} color={on ? C.brand : C.muted} width={on ? 2.2 : 1.9} />
                </View>
              )}
              <Text numberOfLines={1} maxFontSizeMultiplier={1.2} style={{ fontSize: 11, fontWeight: on || scan ? "700" : "600", color: on || scan ? C.brand : C.muted }}>
                {t(`tab.${it.id}`)}
              </Text>
            </Pressable>
          );
        })}
      </View>
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
    kind === "sheet" || kind === "rankings"
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
  const [tour, setTour] = useState(null); // étape de la visite guidée affichée, ou null
  const toastTimer = useRef(null);
  const nonce = useRef(0);

  useEffect(
    () =>
      subscribe((what) => {
        if (what === "settings") { setLang(getSettings().lang); applyTheme(getSettings().theme); setQuickActions(); }
        // Alertes de rappel : autorisation demandée une fois, quand l'historique a quelques produits
        if (what === "history" && getHistory().length >= 2 && !getSettings().notifAsked && Platform.OS !== "web") setTimeout(() => askNotifications(), 1200);
        setTick((n) => n + 1);
      }),
    []
  );

  // Rappels : vérifiés au démarrage, au retour dans l'app et en arrière-plan
  const [recalls, setRecalls] = useState([]);
  const openRef = useRef(null);
  const refreshRecalls = useCallback(async (force = false) => {
    const hits = await checkRecalls({ force }).catch(() => []);
    setRecalls(hits);
    notifyRecalls(hits, { send: false }).catch(() => {});
  }, []);
  useEffect(() => {
    setupNotifications();
    registerBackground();
    refreshRecalls();
    const off = onNotificationOpen((code) => openRef.current && openRef.current({ type: "product", code }));
    const offLinks = listenLinks((l) => openRef.current && openRef.current(l));
    setQuickActions();
    const sub = AppState.addEventListener("change", (st) => { if (st === "active") refreshRecalls(); });
    return () => { off(); offLinks(); sub.remove(); };
  }, []);

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
      if (tour !== null) {
        endTour();
        return true;
      }
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
  }, [stack, tab, leaving, tour]);

  const openProduct = (code, { fromScan = false, product = null, replace } = {}) => {
    const onTop = top && (top.type === "sheet" || top.type === "camera" || top.type === "ocr");
    push({ type: "sheet", code, product, fromScan }, { replace: replace ?? !!onTop });
  };
  // Lien, raccourci de l'icône, widget ou notification
  openRef.current = (l) => {
    setTour(null);
    if (l.type === "product") return openProduct(l.code, { replace: false });
    if (l.type === "scan") { clearStack(); setTab("scan"); return openCamera(); }
    if (l.type === "rankings") { clearStack(); setTab("scan"); return push({ type: "rankings" }); }
    clearStack();
    setTab(l.type);
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
  // Visite guidée : à la première ouverture, puis depuis Réglages › Comment ça marche
  const startTour = (n = 0) => {
    clearStack();
    setTab("scan");
    setTour(n);
  };
  const endTour = () => {
    setTour(null);
    if (!getSettings().toured) setSettings({ toured: true });
  };
  useEffect(() => {
    if (getSettings().toured) return;
    const id = setTimeout(() => setTour((v) => (v === null ? 0 : v)), 900);
    return () => clearTimeout(id);
  }, []);

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
        onRankings={() => push({ type: "rankings" })}
        recalls={recalls}
        onDismissRecalls={() => { dismissRecalls(recalls); setRecalls([]); }}
        manualOpen={manualOpen}
        setManualOpen={setManualOpen}
        status={homeStatus}
      />
    );
  if (tab === "search") page = <SearchScreen onOpen={(code) => openProduct(code)} />;
  if (tab === "history") page = <HistoryScreen onOpen={(code) => openProduct(code)} onScan={() => openCamera()} toast={toast} />;
  if (tab === "additives") page = <AdditivesScreen onGotoSettings={() => gotoSettings()} />;
  if (tab === "settings") page = <SettingsScreen focus={focus} toast={toast} onTour={() => startTour(0)} />;

  const renderScreen = (item) => {
    if (item.type === "camera")
      return (
        <CameraScanner
          onCode={(code) => openProduct(code, { fromScan: true, replace: true })}
          onClose={pop}
          onPhoto={Platform.OS !== "web" ? () => { pop(); photoBarcode(); } : undefined}
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
    if (item.type === "rankings")
      return <RankingsScreen onClose={pop} onOpen={(code, o) => push({ type: "sheet", code, fromScan: false, ...(o || {}) })} />;
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

  // Captures automatiques (version web de contrôle seulement) : on pilote l'app depuis le navigateur
  if (Platform.OS === "web" && typeof window !== "undefined") {
    window.__bayyin = { openProduct, setTab: changeTab, openCamera, gotoSettings, pop, openRankings: () => push({ type: "rankings" }), setSettings, tour: (n) => (n === null ? setTour(null) : startTour(n)) };
  }

  // L'écran précédent reste monté sous celui du dessus : le retour est immédiat et garde la position.
  const visible = stack.slice(-2).filter((item, i, arr) => item.type !== "camera" || i === arr.length - 1);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar style={(top && top.type === "camera" && leaving !== top.key) || isDark() ? "light" : "dark"} />
      <View key={getLang() + (isDark() ? "d" : "l")} style={{ flex: 1 }} importantForAccessibility={stack.length ? "no-hide-descendants" : "auto"} accessibilityElementsHidden={stack.length > 0}>
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
      {tour !== null ? <Tour start={tour} onDone={endTour} onScan={() => openCamera()} /> : null}
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
  const [, setScheme] = useState(0);
  // Thème « automatique » : suit le passage du téléphone en mode sombre
  useEffect(() => {
    const sub = Appearance.addChangeListener(() => {
      const s = getSettings();
      applyTheme(s ? s.theme : "auto");
      setScheme((n) => n + 1);
    });
    return () => sub.remove();
  }, []);
  const [splash, setSplash] = useState(true);
  useEffect(() => {
    initStorage()
      .catch(() => {})
      .finally(() => {
        const s = getSettings();
        setLang(s ? s.lang : "fr");
        applyTheme(s ? s.theme : "auto");
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
