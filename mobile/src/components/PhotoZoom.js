// Photos du produit en grand : le produit, la liste d'ingrédients, le tableau nutritionnel.
// Pincer pour zoomer (iPhone), toucher deux fois pour agrandir, glisser vers le bas pour fermer.
import React, { useRef, useState } from "react";
import { View, Text, Pressable, Modal, ScrollView, Image, useWindowDimensions, Animated, PanResponder, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Glyph } from "./Art";
import { t } from "../i18n";
import { haptic } from "../motion";

const big = (url) => String(url || "").replace(/\.(100|200|400)\.jpg$/, ".full.jpg");

function ZoomPage({ url, W, H }) {
  const ref = useRef(null);
  const [zoomed, setZoomed] = useState(false);
  const last = useRef(0);
  const [scale] = useState(() => new Animated.Value(1));
  const tap = () => {
    const now = Date.now();
    if (now - last.current < 300) {
      const z = !zoomed;
      setZoomed(z);
      if (Platform.OS === "ios" && ref.current && ref.current.scrollResponderZoomTo) {
        if (z) ref.current.scrollResponderZoomTo({ x: W / 4, y: H / 4, width: W / 2, height: H / 2, animated: true });
        else ref.current.scrollResponderZoomTo({ x: 0, y: 0, width: W, height: H, animated: true });
      } else Animated.spring(scale, { toValue: z ? 2.2 : 1, useNativeDriver: true, friction: 7 }).start();
    }
    last.current = now;
  };
  return (
    <ScrollView ref={ref} style={{ width: W, height: H }} contentContainerStyle={{ width: W, height: H, alignItems: "center", justifyContent: "center" }}
      maximumZoomScale={4} minimumZoomScale={1} centerContent showsHorizontalScrollIndicator={false} showsVerticalScrollIndicator={false}>
      <Pressable onPress={tap}>
        <Animated.View style={{ transform: [{ scale }] }}>
          <Image source={{ uri: big(url) }} defaultSource={undefined} resizeMode="contain" style={{ width: W, height: H * 0.78 }} />
        </Animated.View>
      </Pressable>
    </ScrollView>
  );
}

export default function PhotoZoom({ p, visible, start = 0, onClose }) {
  const { width: W, height: H } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const photos = (p.photos || []).filter(([, u]) => u);
  const [i, setI] = useState(start);
  const pager = useRef(null);
  const dy = useRef(new Animated.Value(0)).current;
  // Glisser vers le bas : la photo suit le doigt, puis se ferme
  const pan = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 14 && Math.abs(g.dy) > Math.abs(g.dx) * 1.5,
    onPanResponderMove: (_, g) => dy.setValue(Math.max(0, g.dy)),
    onPanResponderRelease: (_, g) => {
      if (g.dy > 120 || g.vy > 1.2) { haptic.tap(); onClose(); dy.setValue(0); }
      else Animated.spring(dy, { toValue: 0, useNativeDriver: true }).start();
    },
  })).current;
  if (!photos.length) return null;
  const go = (n) => { const k = Math.max(0, Math.min(photos.length - 1, n)); setI(k); pager.current && pager.current.scrollTo({ x: k * W, animated: true }); };
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Animated.View {...pan.panHandlers} style={{ flex: 1, backgroundColor: dy.interpolate({ inputRange: [0, 300], outputRange: ["rgba(0,0,0,0.96)", "rgba(0,0,0,0.4)"], extrapolate: "clamp" }) }}>
        <Animated.View style={{ flex: 1, transform: [{ translateY: dy }] }}>
          <ScrollView ref={pager} horizontal pagingEnabled showsHorizontalScrollIndicator={false} contentOffset={{ x: start * W, y: 0 }}
            onMomentumScrollEnd={(e) => setI(Math.round(e.nativeEvent.contentOffset.x / W))}>
            {photos.map(([k, u]) => <ZoomPage key={k} url={u} W={W} H={H} />)}
          </ScrollView>
        </Animated.View>
        <View pointerEvents="box-none" style={{ position: "absolute", top: insets.top + 10, left: 14, right: 14, flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel={t("zoom.close")}
            style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(255,255,255,0.16)", alignItems: "center", justifyContent: "center" }}>
            <Glyph paths='<path d="M6 6l12 12M18 6L6 18"/>' size={22} color="#fff" width={2.2} />
          </Pressable>
          <Text style={{ flex: 1, color: "#fff", fontWeight: "800", fontSize: 16 }}>{t(`zoom.${photos[i] ? photos[i][0] : "front"}`)}</Text>
        </View>
        <View pointerEvents="box-none" style={{ position: "absolute", bottom: insets.bottom + 18, left: 16, right: 16, alignItems: "center", gap: 12 }}>
          {photos.length > 1 ? (
            <View style={{ flexDirection: "row", gap: 8 }}>
              {photos.map(([k], n) => (
                <Pressable key={k} onPress={() => go(n)} accessibilityRole="button" accessibilityLabel={t(`zoom.${k}`)}
                  style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 99, backgroundColor: n === i ? "#fff" : "rgba(255,255,255,0.16)" }}>
                  <Text style={{ color: n === i ? "#000" : "#fff", fontWeight: "800", fontSize: 13 }}>{t(`zoom.${k}`)}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}
          <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 12.5, textAlign: "center" }}>{t("zoom.hint")}</Text>
        </View>
      </Animated.View>
    </Modal>
  );
}
