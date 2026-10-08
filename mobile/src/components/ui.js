// Briques d'interface réutilisées par tous les écrans.
import React, { useEffect, useRef } from "react";
import { View, Text, Pressable, ActivityIndicator, StyleSheet, Image, Animated } from "react-native";
import Icon from "./Icon";
import { C, R, STATUS_COLORS, GRADE_COLORS, ALERT_COLORS, dir } from "../theme";
import { t } from "../i18n";
import { S, nameOf, verdictOf, scoreOf, kindOf, profileOf } from "../view";
import { haptic, ms } from "../motion";

// Les grandes polices du téléphone sont respectées, avec une limite pour garder la mise en page lisible.
export const FONT_MAX = 1.6;

export function Txt({ style, children, ...rest }) {
  return (
    <Text maxFontSizeMultiplier={FONT_MAX} style={[{ color: C.fg, fontSize: 16, lineHeight: 23, textAlign: dir().ta, writingDirection: dir().rtl ? "rtl" : "ltr" }, style]} {...rest}>
      {children}
    </Text>
  );
}

export const H1 = ({ children, style }) => <Txt accessibilityRole="header" style={[{ fontSize: 30, lineHeight: 35, fontWeight: "800", letterSpacing: -0.5 }, style]}>{children}</Txt>;
export const H2 = ({ children, style }) => <Txt accessibilityRole="header" style={[{ fontSize: 20, lineHeight: 26, fontWeight: "800" }, style]}>{children}</Txt>;
export const Muted = ({ children, style }) => <Txt style={[{ color: C.muted, fontSize: 15, lineHeight: 22 }, style]}>{children}</Txt>;
export const Label = ({ children, style }) => (
  <Txt style={[{ color: C.muted, fontSize: 12, fontWeight: "800", letterSpacing: dir().rtl ? 0 : 0.8, textTransform: "uppercase" }, style]}>{children}</Txt>
);

export function Row({ children, style, gap = 10 }) {
  return <View style={[{ flexDirection: dir().row, alignItems: "center", gap }, style]}>{children}</View>;
}

export function Btn({ title, onPress, kind = "primary", icon, style, disabled, a11yHint }) {
  const bg = kind === "primary" ? C.brand : kind === "white" ? "#fff" : C.tint;
  const fg = kind === "primary" ? "#fff" : C.fg;
  return (
    <Pressable
      onPress={(e) => {
        haptic.light();
        onPress && onPress(e);
      }}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={a11yHint}
      accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => [
        styles.btn,
        { backgroundColor: bg, opacity: disabled ? 0.5 : 1, flexDirection: dir().row, transform: [{ scale: pressed ? 0.97 : 1 }] },
        pressed && kind === "primary" ? { backgroundColor: C.brandDark } : null,
        style,
      ]}
    >
      {icon ? <Icon name={icon} color={fg} size={20} /> : null}
      <Text maxFontSizeMultiplier={FONT_MAX} style={{ color: fg, fontWeight: "700", fontSize: 16, textAlign: "center", flexShrink: 1 }}>{title}</Text>
    </Pressable>
  );
}

export function Pill({ text, colors, dot = false }) {
  const [fg, bg] = colors;
  return (
    <View style={[styles.pill, { backgroundColor: bg, flexDirection: dir().row }]}>
      {dot ? <View style={[styles.dot, { backgroundColor: fg }]} /> : null}
      <Text maxFontSizeMultiplier={1.4} style={{ color: fg, fontWeight: "800", fontSize: 12 }}>{text}</Text>
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
      <Text maxFontSizeMultiplier={1.4} style={{ fontSize: 13, fontWeight: "800", color: C.muted }}>{s.score}/100</Text>
    </View>
  );
}

export function Loading({ text }) {
  return (
    <View accessible accessibilityLabel={text} accessibilityLiveRegion="polite" style={{ flexDirection: dir().row, alignItems: "center", justifyContent: "center", gap: 12, padding: 28 }}>
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
  const kind = kindOf(p);
  const meta = [kind !== "food" ? t(`kind.${kind}`) : null, p.brand, when].filter(Boolean).join(" · ");
  const s = scoreOf(p);
  const alert = profileOf(p).alert;
  const label = [nameOf(p), p.brand, `${t("detail.halal")} : ${S(verdictOf(p).status, "label")}`, s ? `${t("detail.health")} : ${s.score}/100` : null, alert ? t(`alert.${alert}`) : null, fav ? t("history.f.fav") : null, when]
    .filter(Boolean).join(", ");
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.row, { flexDirection: dir().row, backgroundColor: pressed ? C.tint : "transparent" }]}
    >
      {p.image ? <Image source={{ uri: p.image }} style={styles.rowImg} resizeMode="contain" accessible={false} /> : (
        <View style={[styles.rowImg, { backgroundColor: C.tint, borderColor: C.tint, alignItems: "center", justifyContent: "center" }]}>
          <Icon name={p.local ? "doc" : kind === "medicine" ? "pill" : kind === "beauty" ? "drop" : "box"} color={C.faint} size={22} />
        </View>
      )}
      <View style={{ flex: 1, gap: 4 }}>
        <Txt style={{ fontWeight: "700", fontSize: 16, lineHeight: 21 }} numberOfLines={2}>{nameOf(p)}</Txt>
        {meta ? <Muted style={{ fontSize: 13, lineHeight: 18 }} numberOfLines={1}>{meta}</Muted> : null}
        <Row gap={8} style={{ flexWrap: "wrap" }}>
          <StatusPill status={verdictOf(p).status} />
          <MiniScore p={p} />
          {alert ? <Pill text={t(`alert.short.${alert}`)} colors={ALERT_COLORS[alert]} /> : null}
          {fav ? <Icon name="star" size={16} color="#E9A100" fill="#E9A100" /> : null}
        </Row>
      </View>
      <Icon name="chev" size={18} color={C.faint} flip={dir().rtl} />
    </Pressable>
  );
}

// Bloc gris qui « respire » pendant un chargement (à la place d'une roue qui tourne).
export function Skeleton({ width = "100%", height = 16, radius = 8, style }) {
  const v = useRef(new Animated.Value(0.55)).current;
  useEffect(() => {
    if (!ms(1)) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: 650, useNativeDriver: true }),
        Animated.timing(v, { toValue: 0.55, duration: 650, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);
  return <Animated.View style={[{ width, height, borderRadius: radius, backgroundColor: C.tint2, opacity: v }, style]} />;
}

// Apparition en fondu, avec un léger glissement vers le haut.
export function FadeIn({ children, delay = 0, style, distance = 8 }) {
  const v = useRef(new Animated.Value(ms(1) ? 0 : 1)).current;
  useEffect(() => {
    Animated.timing(v, { toValue: 1, duration: ms(260), delay: ms(delay), useNativeDriver: true }).start();
  }, []);
  const translateY = v.interpolate({ inputRange: [0, 1], outputRange: [distance, 0] });
  return <Animated.View style={[{ opacity: v, transform: [{ translateY }] }, style]}>{children}</Animated.View>;
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
