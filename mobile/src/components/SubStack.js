// Sous-page qui s'ouvre par-dessus une liste, à l'intérieur d'un écran (un rayon des classements,
// la comparaison de deux produits) : elle arrive depuis le bord, la liste reste dessous et se décale,
// et le glissement depuis le bord ou le bouton retour d'Android la referment en douceur, comme sur iPhone.
// `top` peut être une fonction (close) => élément, pour que le bouton retour de la sous-page ferme avec l'animation.
import React, { useEffect, useRef, useState } from "react";
import { View, Animated, Easing, StyleSheet, Dimensions } from "react-native";
import { useEdgeSwipe, useInnerBack } from "./EdgeSwipe";
import { C, dir } from "../theme";
import { ms } from "../motion";

export default function SubStack({ base, top, onBack, topKey }) {
  const side = dir().rtl ? -1 : 1;
  const W = Dimensions.get("window").width;
  const slide = useRef(new Animated.Value(top ? 1 : 0)).current;
  const [shown, setShown] = useState(top); // garde la sous-page affichée pendant sa sortie
  const closing = useRef(false);
  // Fin du geste : la sous-page est sortie ; tout revient à zéro d'un coup (liste en place)
  const swipe = useEdgeSwipe(() => { closing.current = true; slide.setValue(0); onBack(); return true; }, !!top);
  useEffect(() => {
    if (top) {
      setShown(top);
      if (!closing.current) {
        slide.setValue(ms(1) ? 0 : 1);
        Animated.timing(slide, { toValue: 1, duration: ms(300), easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
      }
    } else {
      // sortie après un glissement : déjà hors de l'écran
      setShown(null); slide.setValue(0); closing.current = false;
    }
  }, [topKey, !!top]);
  const close = () => {
    if (closing.current) return;
    closing.current = true;
    swipe.active.setValue(1);
    Animated.timing(swipe.dx, { toValue: side * W, duration: ms(240), easing: Easing.out(Easing.cubic), useNativeDriver: true }).start(() => {
      slide.setValue(0); swipe.dx.setValue(0); swipe.active.setValue(0); onBack();
    });
  };
  useInnerBack(top ? close : null);
  const back = swipe.dx.interpolate({ inputRange: side > 0 ? [0, W] : [-W, 0], outputRange: side > 0 ? [0, W * 0.3] : [-W * 0.3, 0], extrapolate: "clamp" });
  // toujours attaché : un style animé retiré laisse la liste à sa dernière position
  const baseStyle = { transform: [{ translateX: Animated.add(Animated.multiply(slide, -side * W * 0.3), Animated.multiply(swipe.active, back)) }] };
  const shade = Animated.add(Animated.multiply(slide, 0.18), Animated.multiply(swipe.active, swipe.dx.interpolate({ inputRange: side > 0 ? [0, W] : [-W, 0], outputRange: side > 0 ? [0, -0.18] : [-0.18, 0], extrapolate: "clamp" })));
  return (
    <View style={{ flex: 1 }}>
      <Animated.View style={[{ flex: 1 }, baseStyle]} pointerEvents={shown ? "none" : "auto"} importantForAccessibility={shown ? "no-hide-descendants" : "auto"}>
        {base}
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: "#000", opacity: shade }]} />
      </Animated.View>
      {shown ? (
        <Animated.View {...swipe.panHandlers} style={[StyleSheet.absoluteFill, { backgroundColor: C.bg, shadowColor: "#000", shadowOpacity: 0.22, shadowRadius: 18, shadowOffset: { width: -side * 4, height: 0 },
          transform: [{ translateX: Animated.add(slide.interpolate({ inputRange: [0, 1], outputRange: [side * W, 0] }), swipe.dx) }] }]}>
          {typeof (top || shown) === "function" ? (top || shown)(close) : top || shown}
        </Animated.View>
      ) : null}
    </View>
  );
}
export { SubStack };
