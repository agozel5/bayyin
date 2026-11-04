// Photos de produits : gardées en mémoire et sur le téléphone (expo-image), téléchargées à l'avance quand
// une liste s'affiche, et qui apparaissent en fondu. Sans expo-image (version web), l'image classique.
import React from "react";
import { Image as RNImage, Platform } from "react-native";

let EImage = null;
try { EImage = Platform.OS === "web" ? null : require("expo-image").Image; } catch { EImage = null; }

export function Img({ uri, style, fit = "contain", onError, transition = 160 }) {
  if (!uri) return null;
  if (EImage) return <EImage source={{ uri }} style={style} contentFit={fit} cachePolicy="memory-disk" transition={transition} recyclingKey={uri} onError={onError} accessible={false} />;
  return <RNImage source={{ uri }} style={style} resizeMode={fit} onError={onError} accessible={false} />;
}

/** Télécharge des photos à l'avance (liste qui s'ouvre, classements gardés pour le hors connexion) */
export function prefetchImages(urls, max = 60) {
  const list = [...new Set((urls || []).filter((u) => typeof u === "string" && /^https:\/\//.test(u)))].slice(0, max);
  if (!list.length) return;
  try {
    if (EImage && EImage.prefetch) EImage.prefetch(list, "memory-disk").catch(() => {});
    else list.forEach((u) => RNImage.prefetch(u).catch(() => {}));
  } catch { /* téléchargement à l'avance impossible : les photos se chargeront à l'affichage */ }
}
