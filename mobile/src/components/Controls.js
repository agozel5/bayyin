// Contrôles communs au style de la version web : titre de page, recherche, pastilles, sélecteur segmenté.
import React, { useEffect, useRef, useState } from "react";
import { View, Text, TextInput, Pressable, ScrollView, Animated } from "react-native";
import { Glyph } from "./Art";
import { C, R, dir, lift, isDark } from "../theme";
import { haptic, ms } from "../motion";
import { FONT_MAX } from "./ui";

export function PageHead({ title, sub }) {
  return (
    <View style={{ gap: 4, paddingBottom: 12, borderBottomWidth: 0.5, borderBottomColor: C.line }}>
      <Text accessibilityRole="header" maxFontSizeMultiplier={1.4} style={{ fontSize: 30, fontWeight: "800", letterSpacing: -0.5, color: C.fg, textAlign: dir().ta }}>{title}</Text>
      {sub ? <Text style={{ fontSize: 14.5, color: C.muted, textAlign: dir().ta }}>{sub}</Text> : null}
    </View>
  );
}

export function SearchBox({ value, onChangeText, placeholder, onSubmit, autoFocus, onScan, scanLabel }) {
  // Au focus : la bordure passe au vert de la marque, la loupe aussi, et la barre « respire » (halo doux)
  const f = useRef(new Animated.Value(0)).current;
  const [on, setOn] = useState(false);
  useEffect(() => { Animated.timing(f, { toValue: on ? 1 : 0, duration: ms(180), useNativeDriver: false }).start(); }, [on]);
  return (
    <Animated.View style={[{ flexDirection: dir().row, alignItems: "center", gap: 10, paddingHorizontal: 16, borderRadius: R.xl, backgroundColor: C.surface, borderWidth: 1.5,
      borderColor: f.interpolate({ inputRange: [0, 1], outputRange: ["transparent", C.brand] }), transform: [{ scale: f.interpolate({ inputRange: [0, 1], outputRange: [1, 1.012] }) }] }, lift(),
      on ? { shadowColor: C.brand, shadowOpacity: isDark() ? 0.35 : 0.22, shadowRadius: 16, shadowOffset: { width: 0, height: 6 } } : null]}>
      <Glyph paths='<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4 4"/>' size={20} color={on ? C.brand : C.muted} width={on ? 2.3 : 2} />
      <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={C.faint} onSubmitEditing={onSubmit} autoFocus={autoFocus}
        onFocus={() => setOn(true)} onBlur={() => setOn(false)} selectionColor={C.brand}
        returnKeyType="search" autoCorrect={false} maxFontSizeMultiplier={FONT_MAX} accessibilityLabel={placeholder}
        style={{ flex: 1, paddingVertical: 16, fontSize: 16.5, color: C.fg, textAlign: dir().ta }} />
      {value ? (
        <Pressable onPress={() => { haptic.tap(); onChangeText(""); }} hitSlop={12} accessibilityRole="button"
          style={({ pressed }) => ({ width: 24, height: 24, borderRadius: 12, backgroundColor: pressed ? C.tint2 : C.tint, alignItems: "center", justifyContent: "center" })}>
          <Glyph name="cross" size={13} color={C.muted} />
        </Pressable>
      ) : onScan ? (
        <Pressable onPress={() => { haptic.light(); onScan(); }} hitSlop={10} accessibilityRole="button" accessibilityLabel={scanLabel}
          style={({ pressed }) => ({ width: 36, height: 36, borderRadius: 12, backgroundColor: pressed ? C.brandDark : C.brand, alignItems: "center", justifyContent: "center", marginEnd: -6 })}>
          <Glyph paths='<path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2M7 8v8M10 8v8M13 8v8M16 8v8"/>' size={19} color="#fff" />
        </Pressable>
      ) : null}
    </Animated.View>
  );
}

// Pastille de filtre ; « on » = fond foncé et texte blanc, comme la version web
export function Chip({ text, n, on, onPress, icon }) {
  return (
    <Pressable onPress={() => { haptic.tap(); onPress(); }} accessibilityRole="button" accessibilityState={{ selected: !!on }}
      style={({ pressed }) => [{ flexDirection: dir().row, alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 99,
        backgroundColor: on ? C.fg : pressed ? C.tint2 : C.surface }, on ? null : lift()]}>
      {icon || null}
      <Text maxFontSizeMultiplier={1.3} style={{ fontSize: 14, fontWeight: "700", color: on ? C.bg : C.fg }}>{text}</Text>
      {n != null ? <Text style={{ fontSize: 12.5, fontWeight: "600", color: on ? C.bg : C.muted, opacity: on ? 0.75 : 1 }}>{n}</Text> : null}
    </Pressable>
  );
}
export function ChipRow({ children }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20 }}
      contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 4, gap: 8, flexDirection: dir().row }}>{children}</ScrollView>
  );
}

export function Segmented({ items, value, onChange }) {
  const [w, setW] = useState(0);
  const idx = Math.max(0, items.findIndex(([id]) => id === value));
  const n = items.length, gap = 4, pad = 4;
  const cell = w ? (w - pad * 2 - gap * (n - 1)) / n : 0;
  const x = useRef(new Animated.Value(0)).current;
  const first = useRef(true);
  useEffect(() => {
    if (!cell) return;
    const to = (dir().rtl ? n - 1 - idx : idx) * (cell + gap);
    if (first.current || !ms(1)) { x.setValue(to); first.current = false; return; }
    Animated.spring(x, { toValue: to, friction: 9, tension: 130, useNativeDriver: true }).start();
  }, [idx, cell]);
  return (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ flexDirection: dir().row, padding: pad, borderRadius: 16, backgroundColor: isDark() ? C.surface : C.tint2, gap }} accessibilityRole="tablist">
      {cell ? <Animated.View pointerEvents="none" style={[{ position: "absolute", top: pad, bottom: pad, left: pad, width: cell, borderRadius: 12, backgroundColor: isDark() ? C.tint2 : C.surface, transform: [{ translateX: x }] }, isDark() ? null : lift()]} /> : null}
      {items.map(([id, label]) => {
        const on = id === value;
        return (
          <Pressable key={String(id)} onPress={() => { haptic.tap(); onChange(id); }} accessibilityRole="tab" accessibilityState={{ selected: on }}
            style={{ flex: 1, alignItems: "center", paddingVertical: 10, borderRadius: 12, backgroundColor: !cell && on ? (isDark() ? C.tint2 : C.surface) : "transparent" }}>
            <Text numberOfLines={1} style={{ fontSize: 14.5, fontWeight: on ? "800" : "600", color: on ? C.fg : C.muted }}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
