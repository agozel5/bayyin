// État vide illustré : la mascotte dans un halo qui respire doucement, une phrase, une action.
import React, { useEffect, useRef } from "react";
import { View, Text, Animated, Easing } from "react-native";
import { Art } from "./Art";
import { Btn, FadeIn } from "./ui";
import { C } from "../theme";
import { ms } from "../motion";
import { mascot } from "../../../public/lib/mascot.js";

export default function EmptyState({ pose = "empty", title, text, action, onAction, second, onSecond, size = 112, compact = false }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!ms(1)) return;
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(v, { toValue: 1, duration: 1600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(v, { toValue: 0, duration: 1600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, []);
  const ty = v.interpolate({ inputRange: [0, 1], outputRange: [0, -5] });
  const halo = v.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] });
  const box = size + 36;
  return (
    <FadeIn style={{ alignItems: "center", gap: 10, paddingVertical: compact ? 14 : 30, paddingHorizontal: 12 }}>
      <View style={{ width: box, height: box, alignItems: "center", justifyContent: "center", marginBottom: 4 }}>
        <Animated.View style={{ position: "absolute", width: box, height: box, borderRadius: box / 2, backgroundColor: C.surface, transform: [{ scale: halo }] }} />
        <View style={{ position: "absolute", width: box - 22, height: box - 22, borderRadius: box, backgroundColor: C.tint, opacity: 1 }} />
        <Animated.View style={{ transform: [{ translateY: ty }] }}><Art xml={mascot(pose, { size })} size={size} /></Animated.View>
      </View>
      {title ? <Text accessibilityRole="header" style={{ fontSize: compact ? 17 : 19, fontWeight: "800", color: C.fg, textAlign: "center" }}>{title}</Text> : null}
      {text ? <Text style={{ fontSize: 15, lineHeight: 22, color: C.muted, textAlign: "center", maxWidth: 320 }}>{text}</Text> : null}
      {action ? <Btn title={action} onPress={onAction} style={{ marginTop: 8, alignSelf: "stretch", marginHorizontal: 24 }} /> : null}
      {second ? <Btn kind="soft" title={second} onPress={onSecond} style={{ alignSelf: "stretch", marginHorizontal: 24 }} /> : null}
    </FadeIn>
  );
}
