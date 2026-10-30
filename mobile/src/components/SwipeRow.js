// Ligne qu'on fait glisser pour la supprimer (comme dans les apps d'Apple) : un petit glissement
// découvre le bouton « Supprimer », un grand glissement supprime directement.
import React, { useRef } from "react";
import { View, Text, Pressable, Animated, PanResponder, Dimensions } from "react-native";
import { Glyph } from "./Art";
import { dir } from "../theme";
import { haptic } from "../motion";

const OPEN = 92;
export default function SwipeRow({ children, onDelete, label }) {
  const x = useRef(new Animated.Value(0)).current;
  const open = useRef(false);
  const sign = () => (dir().rtl ? 1 : -1); // vers la gauche (vers la droite en arabe)
  const close = () => { open.current = false; Animated.spring(x, { toValue: 0, useNativeDriver: true, friction: 9 }).start(); };
  const remove = () => {
    haptic.success();
    const W = Dimensions.get("window").width;
    Animated.timing(x, { toValue: sign() * W, duration: 200, useNativeDriver: true }).start(() => onDelete());
  };
  const pan = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 10 && Math.abs(g.dx) > Math.abs(g.dy) * 1.6 && (open.current || g.dx * sign() > 0),
    onPanResponderMove: (_, g) => {
      const base = open.current ? sign() * OPEN : 0;
      const v = base + g.dx;
      x.setValue(sign() < 0 ? Math.min(0, v) : Math.max(0, v));
    },
    onPanResponderTerminationRequest: () => false,
    onPanResponderRelease: (_, g) => {
      const W = Dimensions.get("window").width;
      const d = (open.current ? OPEN : 0) + g.dx * sign();
      if (d > W * 0.55 || (g.vx * sign() > 1.4 && d > OPEN)) return remove();
      if (d > OPEN * 0.55) { open.current = true; haptic.tap(); Animated.spring(x, { toValue: sign() * OPEN, useNativeDriver: true, friction: 9 }).start(); }
      else close();
    },
    onPanResponderTerminate: close,
  })).current;
  return (
    <View style={{ overflow: "hidden" }}>
      <View style={{ position: "absolute", top: 0, bottom: 0, [dir().rtl ? "left" : "right"]: 0, width: "100%", backgroundColor: "#E0423A", flexDirection: dir().row, justifyContent: "flex-end" }}>
        <Pressable onPress={remove} accessibilityRole="button" accessibilityLabel={label} style={{ width: OPEN, alignItems: "center", justifyContent: "center", gap: 3 }}>
          <Glyph paths='<path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/>' size={20} color="#fff" width={2} />
          <Text style={{ color: "#fff", fontWeight: "800", fontSize: 12.5 }}>{label}</Text>
        </Pressable>
      </View>
      <Animated.View {...pan.panHandlers} style={{ transform: [{ translateX: x }] }}>
        {children}
      </Animated.View>
    </View>
  );
}
