// Illustrations et tuiles en dégradé, à partir des mêmes dessins SVG que la version web
// (public/lib/rank-art.js, page-art.js, mascot.js, icons.js).
import React, { useMemo } from "react";
import { View } from "react-native";
import { SvgXml } from "react-native-svg";
import { I } from "../../../public/lib/icons.js";
import { C, mix, isDark } from "../theme";

// Le moteur SVG de React Native est plus strict que celui des navigateurs : on normalise le texte
export function clean(xml) {
  return String(xml)
    .replace(/rgb\((\d+) (\d+) (\d+) \/ ([.\d]+)\)/g, "rgba($1,$2,$3,$4)")
    .replace(/<defs>(?![\s\S]*<\/defs>)([\s\S]*?<\/linearGradient>)/, "<defs>$1</defs>")
    .replace(/\s(class|style|role|aria-[a-z]+|preserveAspectRatio)="[^"]*"/g, "");
}

// Dessin en couleur (rayon, nutriment, origine, page…)
export function Art({ xml, size = 40, width, height, style }) {
  const x = useMemo(() => clean(xml), [xml]);
  if (!xml) return null;
  return <SvgXml xml={x} width={width || size} height={height || size} style={style} />;
}

// Tuile en dégradé avec un pictogramme blanc (style Réglages d'iOS)
export function Tile({ color, icon, paths, size = 34, radius, iconSize, style }) {
  const r = radius ?? Math.round(size * 0.3);
  const top = mix(color, "#FFFFFF", 0.72), bottom = mix(color, "#000000", 0.85);
  const glyph = paths || I[icon] || "";
  const xml = `<svg viewBox="0 0 ${size} ${size}"><defs><linearGradient id="t${color.slice(1)}" x1="0" y1="0" x2="0.55" y2="1"><stop offset="0" stop-color="${top}"/><stop offset="0.55" stop-color="${color}"/><stop offset="1" stop-color="${bottom}"/></linearGradient></defs>
    <rect width="${size}" height="${size}" rx="${r}" fill="url(#t${color.slice(1)})"/>
    <rect x="0.5" y="0.5" width="${size - 1}" height="${size - 1}" rx="${r - 0.5}" fill="none" stroke="#fff" stroke-opacity="${isDark() ? 0.18 : 0.3}"/></svg>`;
  const g = iconSize || Math.round(size * 0.56);
  const icn = `<svg viewBox="0 0 24 24"><g fill="none" stroke="#fff" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">${glyph}</g></svg>`;
  return (
    <View style={[{ width: size, height: size, alignItems: "center", justifyContent: "center",
      shadowColor: color, shadowOpacity: isDark() ? 0 : 0.35, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 2 }, style]}>
      <SvgXml xml={xml} width={size} height={size} style={{ position: "absolute" }} />
      <SvgXml xml={icn} width={g} height={g} color="#fff" />
    </View>
  );
}

// Fond crème (clair) ou vert-gris (sombre) sous une illustration
export function ArtTile({ xml, size = 48, art, radius = 14, style }) {
  return (
    <View style={[{ width: size, height: size, borderRadius: radius, backgroundColor: C.artBg, alignItems: "center", justifyContent: "center" }, style]}>
      <Art xml={xml} size={art || Math.round(size * 0.74)} />
    </View>
  );
}

// Pictogramme au trait d'une couleur (barre d'onglets, boutons)
export function Glyph({ name, paths, size = 22, color, width = 2 }) {
  const xml = `<svg viewBox="0 0 24 24"><g fill="none" stroke="${color || C.fg}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round">${paths || I[name] || ""}</g></svg>`;
  return <SvgXml xml={xml} width={size} height={size} color={color || C.fg} />;
}
