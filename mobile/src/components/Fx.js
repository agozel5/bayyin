// Effets d'animation réutilisables : compteur qui monte, progression 0→1, gerbe d'étincelles.
// Tous respectent « réduire les animations » (affichage direct de la valeur finale).
import React, { useEffect, useRef, useState } from "react";
import { Text, View, Animated, Easing } from "react-native";
import { ms } from "../motion";

/** Valeur 0→1 (état React) relancée quand `key` change. */
export function useProgress(key, { duration = 900, delay = 100 } = {}) {
  const [k, setK] = useState(ms(1) ? 0 : 1);
  useEffect(() => {
    if (!ms(1)) return setK(1);
    const v = new Animated.Value(0);
    const id = v.addListener(({ value }) => setK(value));
    setK(0);
    Animated.timing(v, { toValue: 1, duration, delay, easing: Easing.bezier(0.3, 0.8, 0.3, 1), useNativeDriver: false }).start();
    return () => { v.removeListener(id); v.stopAnimation(); };
  }, [key]);
  return k;
}

/** Nombre qui monte de 0 jusqu'à `to`. `suffix` s'ajoute après (ex. " %"). */
export function CountUp({ to, suffix = "", duration = 800, delay = 150, style, ...rest }) {
  const k = useProgress(`${to}`, { duration, delay });
  const n = Number(to);
  const shown = Number.isFinite(n) ? Math.round(n * k) : to;
  return <Text {...rest} style={style}>{shown}{suffix}</Text>;
}

const GOLD = ["#F4C542", "#FFFFFF", "#7FE0A8", "#FFB454"];
/** Gerbe de petites pièces qui partent du centre puis retombent en s'effaçant. `play` change → rejoue. */
export function Burst({ play, count = 14, radius = 70, colors = GOLD, size = 7, style }) {
  const v = useRef(new Animated.Value(0)).current;
  const parts = useRef(Array.from({ length: 24 }, (_, i) => ({
    a: (i / 24) * Math.PI * 2 + (i % 3) * 0.21, d: 0.55 + ((i * 37) % 45) / 100, s: 0.7 + ((i * 17) % 6) / 10, r: (i * 53) % 360,
  }))).current;
  useEffect(() => {
    if (!play || !ms(1)) return;
    v.setValue(0);
    Animated.timing(v, { toValue: 1, duration: 1100, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [play]);
  if (!play || !ms(1)) return null;
  return (
    <View pointerEvents="none" style={[{ position: "absolute", width: 0, height: 0, alignItems: "center", justifyContent: "center" }, style]}>
      {parts.slice(0, count).map((p, i) => {
        const x = Math.cos(p.a) * radius * p.d, y = Math.sin(p.a) * radius * p.d;
        return (
          <Animated.View key={i} style={{
            position: "absolute", width: size * p.s, height: size * p.s * (i % 2 ? 1 : 0.55), borderRadius: 2, backgroundColor: colors[i % colors.length],
            opacity: v.interpolate({ inputRange: [0, 0.1, 0.7, 1], outputRange: [0, 1, 1, 0] }),
            transform: [
              { translateX: v.interpolate({ inputRange: [0, 1], outputRange: [0, x] }) },
              { translateY: v.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0, y, y + 22] }) },
              { rotate: v.interpolate({ inputRange: [0, 1], outputRange: ["0deg", `${p.r + 220}deg`] }) },
              { scale: v.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0.2, 1, 0.8] }) },
            ],
          }} />
        );
      })}
    </View>
  );
}
