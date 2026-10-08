// Bayyin — application native (iOS et Android).
// Cinq onglets en bas, et une pile d'écrans par-dessus : caméra, fiche produit, lecture d'étiquette.
import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, Pressable, BackHandler } from "react-native";
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
            onPress={() => onTab(it.id)}
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
  if (!text) return null;
  return (
    <View pointerEvents="none" style={{ position: "absolute", left: 20, right: 20, bottom: insets.bottom + 90, alignItems: "center" }}>
      <View style={{ backgroundColor: C.fg, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 18 }}>
        <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15, textAlign: "center" }}>{text}</Text>
      </View>
    </View>
  );
}

function Main() {
  const [tab, setTab] = useState("scan");
  // Pile d'écrans au-dessus des onglets : { type: "camera" } | { type: "sheet", code, product?, fromScan } | { type: "ocr", code }
  const [stack, setStack] = useState([]);
  const [, setTick] = useState(0);
  const [toastText, setToastText] = useState(null);
  const [manualOpen, setManualOpen] = useState(false);
  const [homeStatus, setHomeStatus] = useState(null);
  const [focusSchool, setFocusSchool] = useState(0);
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
  const push = (screen, { replace = false } = {}) => setStack((s) => [...(replace ? s.slice(0, -1) : s), { ...screen, key: ++nonce.current }]);
  const pop = () => setStack((s) => s.slice(0, -1));

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
  }, [stack.length, tab]);

  const openProduct = (code, { fromScan = false, product = null, replace } = {}) => {
    const onTop = top && (top.type === "sheet" || top.type === "camera" || top.type === "ocr");
    push({ type: "sheet", code, product, fromScan }, { replace: replace ?? !!onTop });
  };
  const openCamera = ({ replace = false } = {}) => {
    setHomeStatus(null);
    push({ type: "camera" }, { replace });
  };
  const openOcr = (code) => push({ type: "ocr", code: code || null }, { replace: !!top });
  const gotoSettings = () => {
    setStack([]);
    setTab("settings");
    setFocusSchool((n) => n + 1);
  };

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
      if (!code) return setHomeStatus({ title: t("msg.photo_unreadable.t"), text: t("msg.photo_unreadable.p") });
      setHomeStatus(null);
      openProduct(code, { fromScan: true });
    } catch {
      setHomeStatus({ title: t("msg.reader_error.t"), text: t("msg.photo_unreadable.p") });
    }
  };

  const changeTab = (id) => {
    setStack([]);
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
        manualOpen={manualOpen}
        setManualOpen={setManualOpen}
        status={homeStatus}
      />
    );
  if (tab === "search") page = <SearchScreen onOpen={(code) => openProduct(code)} />;
  if (tab === "history") page = <HistoryScreen onOpen={(code) => openProduct(code)} onScan={() => openCamera()} toast={toast} />;
  if (tab === "additives") page = <AdditivesScreen onGotoSettings={gotoSettings} />;
  if (tab === "settings") page = <SettingsScreen focusSchool={focusSchool} />;

  let overlay = null;
  if (top && top.type === "camera") {
    overlay = (
      <CameraScanner
        key={top.key}
        onCode={(code) => openProduct(code, { fromScan: true, replace: true })}
        onClose={pop}
        onManual={() => {
          pop();
          setTab("scan");
          setManualOpen(true);
        }}
      />
    );
  } else if (top && top.type === "sheet") {
    overlay = (
      <ProductSheet
        key={top.key}
        code={top.code}
        product={top.product}
        fromScan={top.fromScan}
        onClose={pop}
        onOpen={(code) => push({ type: "sheet", code, fromScan: false }, { replace: code === top.code })}
        onScanAgain={() => openCamera({ replace: true })}
        onOcr={openOcr}
        onGotoSettings={gotoSettings}
        toast={toast}
      />
    );
  } else if (top && top.type === "ocr") {
    overlay = (
      <OcrFlow
        key={top.key}
        code={top.code}
        onClose={pop}
        onDone={(p, saved) => {
          openProduct(p.code, { product: p, replace: true });
          if (saved) toast(t("ocr.saved"));
        }}
      />
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar style={top && top.type === "camera" ? "light" : "dark"} />
      <View key={getLang()} style={{ flex: 1 }}>
        <View style={{ flex: 1 }}>{page}</View>
        <TabBar tab={tab} onTab={changeTab} />
      </View>
      {overlay ? <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: C.bg }}>{overlay}</View> : null}
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

export default function App() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    initStorage()
      .catch(() => {})
      .finally(() => {
        const s = getSettings();
        setLang(s ? s.lang : "fr");
        setReady(true);
      });
  }, []);
  return <SafeAreaProvider>{ready && getSettings() ? <Main /> : <Splash />}</SafeAreaProvider>;
}
