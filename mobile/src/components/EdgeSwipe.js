// Retour par glissement depuis le bord de l'écran (comme sur iPhone) : l'écran suit le doigt,
// puis se ferme si on l'a tiré assez loin ou assez vite.
import { createContext, useContext, useEffect as useEffect2, useRef } from "react";
import { Animated, PanResponder, Dimensions, BackHandler, Easing } from "react-native";
import { dir } from "../theme";
import { haptic } from "../motion";

const EDGE = 22; // largeur du bord qui déclenche le retour (les listes horizontales commencent après)
/**
 * opts.dx / opts.active : valeurs partagées (l'écran du dessous les lit pour glisser avec, comme sur iPhone).
 * onBack() : renvoie true si l'écran reste (retour « intérieur ») ; sinon l'écran est retiré tout de suite
 * (il est déjà sorti de l'écran), et les valeurs sont remises à zéro à l'image suivante.
 */
export function useEdgeSwipe(onBack, enabled = true, opts = {}) {
  const own = useRef(new Animated.Value(0)).current;
  const ownActive = useRef(new Animated.Value(0)).current;
  const dx = opts.dx || own;
  const active = opts.active || ownActive;
  const back = useRef(onBack);
  back.current = onBack;
  const on = useRef(enabled); // valeur à jour (le geste est créé une seule fois)
  on.current = enabled;
  const vals = useRef({ dx, active });
  vals.current = { dx, active };
  const reset = () => { vals.current.dx.setValue(0); vals.current.active.setValue(0); };
  const pan = useRef(PanResponder.create({
    onMoveShouldSetPanResponderCapture: (e, g) => {
      if (!(typeof on.current === "function" ? on.current() : on.current)) return false;
      const W = Dimensions.get("window").width;
      const rtl = dir().rtl;
      const fromEdge = rtl ? g.x0 > W - EDGE : g.x0 < EDGE;
      const toward = rtl ? g.dx < -8 : g.dx > 8;
      return fromEdge && toward && Math.abs(g.dx) > Math.abs(g.dy) * 1.5;
    },
    onPanResponderGrant: () => { vals.current.dx.setValue(0); vals.current.active.setValue(1); },
    onPanResponderMove: (e, g) => vals.current.dx.setValue(dir().rtl ? Math.min(0, g.dx) : Math.max(0, g.dx)),
    onPanResponderTerminationRequest: () => false,
    onPanResponderRelease: (e, g) => {
      const W = Dimensions.get("window").width;
      const d = Math.abs(g.dx), v = Math.abs(g.vx);
      const { dx: X } = vals.current;
      if (d > W * 0.33 || v > 0.5) {
        haptic.tap();
        Animated.timing(X, { toValue: (dir().rtl ? -1 : 1) * W, duration: Math.max(120, 260 * (1 - d / W)), easing: Easing.out(Easing.cubic), useNativeDriver: true }).start(() => {
          // true : remise à zéro tout de suite ; "manual" : le propriétaire remet à zéro quand l'écran est retiré
          const stay = back.current && back.current();
          if (stay === true) reset(); else if (stay !== "manual") requestAnimationFrame(() => requestAnimationFrame(reset));
        });
      } else Animated.spring(X, { toValue: 0, useNativeDriver: true, friction: 9, tension: 80 }).start(() => vals.current.active.setValue(0));
    },
    onPanResponderTerminate: () => Animated.spring(vals.current.dx, { toValue: 0, useNativeDriver: true }).start(() => vals.current.active.setValue(0)),
  })).current;
  return { dx, active, panHandlers: pan.panHandlers };
}

/** Style de l'écran du dessous pendant le glissement : il part de 30 % à gauche et revient en place. */
export function underStyle(dx, active) {
  const W = Dimensions.get("window").width;
  const s = dir().rtl ? -1 : 1;
  return { transform: [{ translateX: Animated.multiply(active, dx.interpolate({ inputRange: s > 0 ? [0, W] : [-W, 0], outputRange: s > 0 ? [-W * 0.3, 0] : [0, W * 0.3], extrapolate: "clamp" })) }] };
}
/** Voile sombre sur l'écran du dessous, qui s'efface pendant le glissement */
export function underShade(dx, active) {
  const W = Dimensions.get("window").width;
  return { opacity: Animated.multiply(active, dx.interpolate({ inputRange: dir().rtl ? [-W, 0] : [0, W], outputRange: dir().rtl ? [0, 0.18] : [0.18, 0], extrapolate: "clamp" })) };
}

// Retour « intérieur » : un écran qui a sa propre sous-page (un rayon des classements…) reprend
// le geste de retour et le bouton retour d'Android pour revenir à sa liste au lieu de se fermer.
export const InnerBackContext = createContext(null);
export function useInnerBack(handler) {
  const slot = useContext(InnerBackContext);
  useEffect2(() => {
    if (!handler) return undefined;
    if (slot) slot.current = handler;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => { handler(); return true; });
    return () => { if (slot && slot.current === handler) slot.current = null; sub.remove(); };
  }, [handler]);
}
