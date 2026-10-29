// Contrôles communs au style de la version web : titre de page, recherche, pastilles, sélecteur segmenté.
import React from "react";
import { View, Text, TextInput, Pressable, ScrollView } from "react-native";
import { Glyph } from "./Art";
import { C, R, dir, lift, isDark } from "../theme";
import { haptic } from "../motion";
import { FONT_MAX } from "./ui";

export function PageHead({ title, sub }) {
  return (
    <View style={{ gap: 4, paddingBottom: 12, borderBottomWidth: 0.5, borderBottomColor: C.line }}>
      <Text accessibilityRole="header" maxFontSizeMultiplier={1.4} style={{ fontSize: 30, fontWeight: "800", letterSpacing: -0.5, color: C.fg, textAlign: dir().ta }}>{title}</Text>
      {sub ? <Text style={{ fontSize: 14.5, color: C.muted, textAlign: dir().ta }}>{sub}</Text> : null}
    </View>
  );
}

export function SearchBox({ value, onChangeText, placeholder, onSubmit, autoFocus }) {
  return (
    <View style={[{ flexDirection: dir().row, alignItems: "center", gap: 10, paddingHorizontal: 14, borderRadius: R.lg, backgroundColor: C.surface }, lift()]}>
      <Glyph paths='<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4 4"/>' size={19} color={C.muted} />
      <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={C.faint} onSubmitEditing={onSubmit} autoFocus={autoFocus}
        returnKeyType="search" autoCorrect={false} maxFontSizeMultiplier={FONT_MAX} accessibilityLabel={placeholder}
        style={{ flex: 1, paddingVertical: 14, fontSize: 16, color: C.fg, textAlign: dir().ta }} />
      {value ? <Pressable onPress={() => onChangeText("")} hitSlop={10} accessibilityRole="button"><Glyph name="cross" size={17} color={C.faint} /></Pressable> : null}
    </View>
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
  return (
    <View style={{ flexDirection: dir().row, padding: 4, borderRadius: 16, backgroundColor: isDark() ? C.surface : C.tint2, gap: 4 }} accessibilityRole="tablist">
      {items.map(([id, label]) => {
        const on = id === value;
        return (
          <Pressable key={String(id)} onPress={() => { haptic.tap(); onChange(id); }} accessibilityRole="tab" accessibilityState={{ selected: on }}
            style={[{ flex: 1, alignItems: "center", paddingVertical: 10, borderRadius: 12, backgroundColor: on ? (isDark() ? C.tint2 : C.surface) : "transparent" }, on && !isDark() ? lift() : null]}>
            <Text numberOfLines={1} style={{ fontSize: 14.5, fontWeight: on ? "800" : "600", color: on ? C.fg : C.muted }}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
