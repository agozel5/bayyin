// Échelle de lettres (Nutri-Score, Green-Score) avec le repère ▼ au-dessus de la note du produit,
// qui glisse jusqu'à sa place quand l'échelle arrive à l'écran (comme sur le web).
import React, { useRef, useState } from "react";
import { View, Text, Animated } from "react-native";
import { C } from "../theme";
import { useGrow } from "./Reveal";

export default function LetterScale({ items, value, label, activeFlex = 1.25 }) {
  const ref = useRef(null);
  const v = useGrow(ref, { duration: 900, delay: 150 });
  const [box, setBox] = useState(null); // position de la case active { x, w }
  return (
    <View ref={ref} collapsable={false} style={{ direction: "ltr" }} accessible accessibilityLabel={label}>
      <View style={{ height: 12 }}>
        {box ? (
          <Animated.View style={{ position: "absolute", left: v.interpolate({ inputRange: [0, 1], outputRange: [0, box.x + box.w / 2 - 7] }), opacity: v.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 1, 1] }),
            width: 0, height: 0, borderLeftWidth: 7, borderRightWidth: 7, borderTopWidth: 9, borderLeftColor: "transparent", borderRightColor: "transparent", borderTopColor: C.fg }} />
        ) : null}
      </View>
      <View style={{ flexDirection: "row", gap: 4, alignItems: "center" }}>
        {items.map(([k, l, c]) => {
          const on = k === value;
          return (
            <Animated.View key={k} onLayout={on ? (e) => setBox({ x: e.nativeEvent.layout.x, w: e.nativeEvent.layout.width }) : undefined}
              style={{ flex: on ? activeFlex : 1, paddingVertical: on ? 8 : 5, borderRadius: 9, backgroundColor: on ? c : c + "66", alignItems: "center",
                shadowColor: c, shadowOpacity: on ? 0.5 : 0, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
                transform: on ? [{ scale: v.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0.85, 1.06, 1] }) }] : [] }}>
              <Text style={{ color: "#fff", fontWeight: "800", fontSize: on ? 16 : 12, opacity: on ? 1 : 0.85 }}>{l}</Text>
            </Animated.View>
          );
        })}
      </View>
    </View>
  );
}
