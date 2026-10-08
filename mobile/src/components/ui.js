// Briques d'interface réutilisées par tous les écrans.
import React from "react";
import { View, Text, Pressable, ActivityIndicator, StyleSheet, Image } from "react-native";
import Icon from "./Icon";
import { C, R, STATUS_COLORS, GRADE_COLORS, dir } from "../theme";
import { t } from "../i18n";
import { S, nameOf, verdictOf, scoreOf } from "../view";

export function Txt({ style, children, ...rest }) {
  return (
    <Text style={[{ color: C.fg, fontSize: 16, lineHeight: 23, textAlign: dir().ta, writingDirection: dir().rtl ? "rtl" : "ltr" }, style]} {...rest}>
      {children}
    </Text>
  );
}

export const H1 = ({ children, style }) => <Txt style={[{ fontSize: 30, lineHeight: 35, fontWeight: "800", letterSpacing: -0.5 }, style]}>{children}</Txt>;
export const H2 = ({ children, style }) => <Txt style={[{ fontSize: 20, lineHeight: 26, fontWeight: "800" }, style]}>{children}</Txt>;
export const Muted = ({ children, style }) => <Txt style={[{ color: C.muted, fontSize: 15, lineHeight: 22 }, style]}>{children}</Txt>;
export const Label = ({ children, style }) => (
  <Txt style={[{ color: C.muted, fontSize: 12, fontWeight: "800", letterSpacing: dir().rtl ? 0 : 0.8, textTransform: "uppercase" }, style]}>{children}</Txt>
);

export function Row({ children, style, gap = 10 }) {
  return <View style={[{ flexDirection: dir().row, alignItems: "center", gap }, style]}>{children}</View>;
}

export function Btn({ title, onPress, kind = "primary", icon, style, disabled }) {
  const bg = kind === "primary" ? C.brand : kind === "white" ? "#fff" : C.tint;
  const fg = kind === "primary" ? "#fff" : C.fg;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={({ pressed }) => [styles.btn, { backgroundColor: bg, opacity: disabled ? 0.5 : pressed ? 0.85 : 1, flexDirection: dir().row }, style]}
    >
      {icon ? <Icon name={icon} color={fg} size={20} /> : null}
      <Text style={{ color: fg, fontWeight: "700", fontSize: 16 }}>{title}</Text>
    </Pressable>
  );
}

export function Pill({ text, colors, dot = false }) {
  const [fg, bg] = colors;
  return (
    <View style={[styles.pill, { backgroundColor: bg, flexDirection: dir().row }]}>
      {dot ? <View style={[styles.dot, { backgroundColor: fg }]} /> : null}
      <Text style={{ color: fg, fontWeight: "800", fontSize: 12 }}>{text}</Text>
    </View>
  );
}

export const StatusPill = ({ status }) => <Pill text={S(status, "short")} colors={STATUS_COLORS[status]} dot />;

export function MiniScore({ p }) {
  const s = scoreOf(p);
  if (!s) return null;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
      <View style={[styles.dot, { width: 9, height: 9, backgroundColor: GRADE_COLORS[s.grade] }]} />
      <Text style={{ fontSize: 13, fontWeight: "800", color: C.muted }}>{s.score}/100</Text>
    </View>
  );
}

export function Loading({ text }) {
  return (
    <View style={{ flexDirection: dir().row, alignItems: "center", justifyContent: "center", gap: 12, padding: 28 }}>
      <ActivityIndicator color={C.brand} />
      <Muted>{text}</Muted>
    </View>
  );
}

export function Message({ title, text, children }) {
  return (
    <View style={styles.msg}>
      <Txt style={{ fontWeight: "800", fontSize: 17 }}>{title}</Txt>
      <Muted>{text}</Muted>
      {children ? <View style={{ gap: 10, marginTop: 6 }}>{children}</View> : null}
    </View>
  );
}

export function ProductRow({ p, onPress, fav = false, when = "" }) {
  const meta = [p.brand, when].filter(Boolean).join(" · ");
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, { flexDirection: dir().row, backgroundColor: pressed ? C.tint : "transparent" }]}>
      {p.image ? <Image source={{ uri: p.image }} style={styles.rowImg} resizeMode="contain" /> : (
        <View style={[styles.rowImg, { backgroundColor: C.tint, borderColor: C.tint, alignItems: "center", justifyContent: "center" }]}>
          <Icon name={p.local ? "doc" : "box"} color={C.faint} size={22} />
        </View>
      )}
      <View style={{ flex: 1, gap: 4 }}>
        <Txt style={{ fontWeight: "700", fontSize: 16, lineHeight: 21 }} numberOfLines={2}>{nameOf(p)}</Txt>
        {meta ? <Muted style={{ fontSize: 13, lineHeight: 18 }} numberOfLines={1}>{meta}</Muted> : null}
        <Row gap={8}>
          <StatusPill status={verdictOf(p).status} />
          <MiniScore p={p} />
          {fav ? <Icon name="star" size={16} color="#E9A100" fill="#E9A100" /> : null}
        </Row>
      </View>
      <Icon name="chev" size={18} color={C.faint} flip={dir().rtl} />
    </Pressable>
  );
}

export function Card({ children, style }) {
  return <View style={[{ backgroundColor: C.tint, borderRadius: R.lg, padding: 16 }, style]}>{children}</View>;
}

export const styles = StyleSheet.create({
  btn: { alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 14, paddingHorizontal: 20, borderRadius: R.md },
  pill: { alignItems: "center", gap: 6, paddingVertical: 4, paddingHorizontal: 10, borderRadius: 999, alignSelf: "flex-start" },
  dot: { width: 8, height: 8, borderRadius: 4 },
  msg: { backgroundColor: C.tint, borderRadius: R.lg, padding: 20, gap: 8 },
  row: { alignItems: "center", gap: 14, paddingVertical: 12, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: C.line },
  rowImg: { width: 56, height: 56, borderRadius: 14, backgroundColor: "#fff", borderWidth: 1, borderColor: C.line },
});

export { t };
