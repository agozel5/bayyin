// Retour par glissement depuis le bord de l'écran (comme sur iPhone) : l'écran suit le doigt,
// puis se ferme si on l'a tiré assez loin ou assez vite.
import { useRef } from "react";
import { Animated, PanResponder, Dimensions } from "react-native";
import { dir } from "../theme";
import { haptic } from "../motion";

const EDGE = 28;
export function useEdgeSwipe(onBack, enabled = true) {
  const dx = useRef(new Animated.Value(0)).current;
  const back = useRef(onBack);
  back.current = onBack;
  const pan = useRef(PanResponder.create({
    onMoveShouldSetPanResponderCapture: (e, g) => {
      if (!enabled) return false;
      const W = Dimensions.get("window").width;
      const rtl = dir().rtl;
      const fromEdge = rtl ? g.x0 > W - EDGE : g.x0 < EDGE;
      const toward = rtl ? g.dx < -8 : g.dx > 8;
      return fromEdge && toward && Math.abs(g.dx) > Math.abs(g.dy) * 1.5;
    },
    onPanResponderGrant: () => dx.setValue(0),
    onPanResponderMove: (e, g) => dx.setValue(dir().rtl ? Math.min(0, g.dx) : Math.max(0, g.dx)),
    onPanResponderTerminationRequest: () => false,
    onPanResponderRelease: (e, g) => {
      const W = Dimensions.get("window").width;
      const d = Math.abs(g.dx), v = Math.abs(g.vx);
      if (d > W * 0.33 || v > 0.6) {
        haptic.tap();
        Animated.timing(dx, { toValue: (dir().rtl ? -1 : 1) * W, duration: 180, useNativeDriver: true }).start(() => { back.current && back.current(); setTimeout(() => dx.setValue(0), 400); });
      } else Animated.spring(dx, { toValue: 0, useNativeDriver: true, friction: 8 }).start();
    },
    onPanResponderTerminate: () => Animated.spring(dx, { toValue: 0, useNativeDriver: true }).start(),
  })).current;
  return { dx, panHandlers: pan.panHandlers };
}
