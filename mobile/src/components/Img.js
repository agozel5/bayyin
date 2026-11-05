// Photos de produits : gardées en mémoire et sur le téléphone (expo-image), téléchargées à l'avance quand
// une liste s'affiche, et qui apparaissent en fondu. Sans expo-image (version web), l'image classique.
import React from "react";
import { Image as RNImage, Platform } from "react-native";

let EImage = null;
try { EImage = Platform.OS === "web" ? null : require("expo-image").Image; } catch { EImage = null; }

// Aperçu flou (ThumbHash, calculé avec les classements) : une courte chaîne, vérifiée avant usage
const THUMB = /^[A-Za-z0-9+/]{16,64}={0,2}$/;

export function Img({ uri, style, fit = "contain", onError, onLoad, transition = 160, thumb }) {
  if (!uri) return null;
  if (EImage) return <EImage source={{ uri }} style={style} contentFit={fit} cachePolicy="memory-disk" transition={transition} recyclingKey={uri} onError={onError} onLoad={onLoad} accessible={false}
    placeholder={thumb && THUMB.test(thumb) ? { thumbhash: thumb } : undefined} placeholderContentFit={fit} />;
  return <RNImage source={{ uri }} style={style} resizeMode={fit} onError={onError} onLoad={onLoad} accessible={false} />;
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
