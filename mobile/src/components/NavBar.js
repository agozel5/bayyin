// Barre de titre à la façon d'iOS : le grand titre de la page défile avec le contenu, puis une barre
// en verre dépoli apparaît en haut avec le titre en petit. Elle couvre aussi la zone de l'heure et de
// la batterie, pour que le contenu ne passe plus dessous à nu.
//   const nav = useNavBar(titre);  <ScrollView {...nav.scroll} />  {nav.bar}
import React, { useRef } from "react";
import { View, Animated, Platform, StyleSheet, ScrollView } from "react-native";
import { Text } from "./Text";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { C, isDark } from "../theme";

export function useNavBar(title, { from = 30, to = 50 } = {}) {
  const insets = useSafeAreaInsets();
  const y = useRef(new Animated.Value(0)).current;
  const opacity = y.interpolate({ inputRange: [from, to], outputRange: [0, 1], extrapolate: "clamp" });
  const rise = y.interpolate({ inputRange: [from, to], outputRange: [6, 0], extrapolate: "clamp" });
  const ios = Platform.OS === "ios";
  const bar = (
    <Animated.View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
      style={{ position: "absolute", top: 0, left: 0, right: 0, height: insets.top + 44, opacity,
        backgroundColor: ios ? (isDark() ? "rgba(11,16,13,0.9)" : "rgba(241,245,240,0.9)") : C.bg, // presque opaque : le contenu ne se lit plus à travers le titre
        borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: isDark() ? "rgba(255,255,255,0.14)" : "rgba(0,0,0,0.12)" }}>
      {ios ? <BlurView intensity={50} tint={isDark() ? "dark" : "light"} style={StyleSheet.absoluteFill} /> : null}
      <View style={{ position: "absolute", left: 56, right: 56, bottom: 0, height: 44, alignItems: "center", justifyContent: "center" }}>
        <Animated.Text numberOfLines={1} maxFontSizeMultiplier={1.2} style={{ fontSize: 17, fontWeight: "700", color: C.fg, letterSpacing: -0.2, transform: [{ translateY: rise }] }}>{title}</Animated.Text>
      </View>
    </Animated.View>
  );
  const scroll = { onScroll: Animated.event([{ nativeEvent: { contentOffset: { y } } }], { useNativeDriver: false }), scrollEventThrottle: 16 };
  return { scroll, bar, y };
}

// Page qui défile avec la barre en verre dépoli : pour les écrans ouverts par-dessus les onglets
// (panier, comparateur, classements, outils…), dont le titre ne doit pas glisser sous l'heure.
export function NavScroll({ title, scrollRef, children, style, ...rest }) {
  const nav = useNavBar(title);
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView ref={scrollRef} {...nav.scroll} {...rest} style={[{ flex: 1, backgroundColor: C.bg }, style]}>
        {children}
      </ScrollView>
      {nav.bar}
    </View>
  );
}
