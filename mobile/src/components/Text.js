// Texte de l'app : identique au Text de React Native, avec la taille choisie dans Réglages → Apparence
// (petit, normal, grand, très grand). Elle s'ajoute à la taille du texte réglée dans le téléphone.
import React, { forwardRef } from "react";
import { Text as RNText, StyleSheet } from "react-native";

export const TEXT_SIZES = { s: 0.9, m: 1, l: 1.12, xl: 1.25 };
let scale = 1;
export const setTextSize = (id) => { scale = TEXT_SIZES[id] || 1; };
export const textScale = () => scale;

export const Text = forwardRef(function Text({ style, ...rest }, ref) {
  if (scale === 1) return <RNText ref={ref} style={style} {...rest} />;
  const f = StyleSheet.flatten(style) || {};
  // Sans taille propre, le texte hérite de son parent (déjà agrandi) : on n'y touche pas
  if (!f.fontSize) return <RNText ref={ref} style={style} {...rest} />;
  // Libellés serrés (onglets, tuiles : ceux qui limitent déjà l'agrandissement du téléphone) : agrandis à peine
  const m = rest.maxFontSizeMultiplier;
  const k = scale > 1 && m ? Math.min(scale, m <= 1.2 ? 1.06 : m <= 1.4 ? 1.15 : scale) : scale;
  return <RNText ref={ref} {...rest} style={[style, { fontSize: f.fontSize * k }, f.lineHeight ? { lineHeight: Math.round(f.lineHeight * k) } : null]} />;
});
