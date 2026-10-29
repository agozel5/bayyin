// Animations au défilement (comme la version web) : un bloc apparaît en glissant quand il arrive
// à l'écran, une jauge se remplit à ce moment-là. Et un dépliant avec sa flèche qui tourne.
import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { View, Pressable, Animated, Easing, Dimensions } from "react-native";
import { Glyph } from "./Art";
import { C, dir } from "../theme";
import { ms } from "../motion";
import { haptic } from "../motion";

const Ctx = createContext(null);
export const RevealProvider = Ctx.Provider;

/** Dans l'écran qui défile : <RevealProvider value={root.value}> et onScroll={root.onScroll} */
export function useRevealRoot() {
  const subs = useRef(new Set()).current;
  const timer = useRef(null);
  const check = () => subs.forEach((fn) => fn());
  const onScroll = () => {
    if (timer.current) return;
    timer.current = setTimeout(() => { timer.current = null; check(); }, 80);
  };
  const value = useRef({ subscribe: (fn) => { subs.add(fn); return () => subs.delete(fn); }, check }).current;
  return { onScroll, value, check };
}

/** Déclenche `run` une seule fois, quand la vue arrive dans l'écran. */
export function useInView(ref, run, deps = []) {
  const ctx = useContext(Ctx);
  useEffect(() => {
    let done = false;
    const test = () => {
      if (done || !ref.current || !ref.current.measureInWindow) return;
      ref.current.measureInWindow((x, y, w, h) => {
        if (done) return;
        const H = Dimensions.get("window").height;
        if (h && y < H * 0.92 && y + h > 0) { done = true; off && off(); run(); }
      });
    };
    const off = ctx ? ctx.subscribe(test) : null;
    const id = setTimeout(test, 60); // déjà visible à l'ouverture
    if (!ctx) { const k = setTimeout(() => { if (!done) { done = true; run(); } }, 120); return () => { clearTimeout(id); clearTimeout(k); }; }
    return () => { clearTimeout(id); off && off(); };
  }, deps);
}

/** Bloc qui apparaît en glissant vers le haut quand il arrive à l'écran. */
export function Reveal({ children, style, delay = 0, distance = 10 }) {
  const ref = useRef(null);
  const v = useRef(new Animated.Value(ms(1) ? 0 : 1)).current;
  useInView(ref, () => Animated.timing(v, { toValue: 1, duration: ms(400), delay: ms(delay), easing: Easing.bezier(0.2, 0.8, 0.2, 1), useNativeDriver: true }).start());
  return (
    <Animated.View ref={ref} collapsable={false} style={[{ opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [distance, 0] }) }] }, style]}>
      {children}
    </Animated.View>
  );
}

/** Valeur animée de 0 à 1 lancée à l'arrivée à l'écran (jauges, barres). */
export function useGrow(ref, { duration = 700, delay = 150 } = {}) {
  const v = useRef(new Animated.Value(ms(1) ? 0 : 1)).current;
  useInView(ref, () => Animated.timing(v, { toValue: 1, duration: ms(duration), delay: ms(delay), easing: Easing.bezier(0.2, 0.8, 0.2, 1), useNativeDriver: false }).start());
  return v;
}

/** Flèche qui pivote d'un quart de tour à l'ouverture. */
export function Chevron({ open, color, size = 16 }) {
  const v = useRef(new Animated.Value(open ? 1 : 0)).current;
  useEffect(() => { Animated.timing(v, { toValue: open ? 1 : 0, duration: ms(220), easing: Easing.out(Easing.cubic), useNativeDriver: true }).start(); }, [open]);
  const rot = v.interpolate({ inputRange: [0, 1], outputRange: ["0deg", dir().rtl ? "-90deg" : "90deg"] });
  return <Animated.View style={{ transform: [{ rotate: rot }] }}><Glyph name="chev" size={size} color={color || C.faint} width={2.2} /></Animated.View>;
}

/** Dépliant : un en-tête qu'on touche, un contenu qui s'ouvre en fondu. */
export function Collapse({ head, children, initial = false, onToggle }) {
  const [open, setOpen] = useState(initial);
  const v = useRef(new Animated.Value(initial ? 1 : 0)).current;
  const toggle = () => {
    haptic.tap();
    const o = !open;
    setOpen(o);
    onToggle && onToggle(o);
    v.setValue(0);
    if (o) Animated.timing(v, { toValue: 1, duration: ms(260), easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  };
  return (
    <View>
      <Pressable onPress={toggle} accessibilityRole="button" accessibilityState={{ expanded: open }}>
        {typeof head === "function" ? head(open) : head}
      </Pressable>
      {open ? <Animated.View style={{ opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [-6, 0] }) }] }}>{children}</Animated.View> : null}
    </View>
  );
}
