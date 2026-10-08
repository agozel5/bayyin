// Retour haptique et animations, en respectant les réglages d'accessibilité du téléphone.
import { AccessibilityInfo, Platform } from "react-native";
import * as Haptics from "expo-haptics";

let reduceMotion = false;
AccessibilityInfo.isReduceMotionEnabled()
  .then((v) => (reduceMotion = !!v))
  .catch(() => {});
AccessibilityInfo.addEventListener?.("reduceMotionChanged", (v) => (reduceMotion = !!v));

// Durée d'une animation : zéro si l'utilisateur a demandé de réduire les animations.
export const ms = (n) => (reduceMotion ? 0 : n);
export const isReduceMotion = () => reduceMotion;

const safe = (p) => p && p.catch && p.catch(() => {});
export const haptic = {
  tap: () => safe(Haptics.selectionAsync()), // choix d'un onglet, d'un réglage
  light: () => safe(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)), // bouton
  success: () => safe(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  warn: () => safe(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
  error: () => safe(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
};

// Annonce vocale pour VoiceOver / TalkBack (messages temporaires, résultats).
export function announce(text) {
  if (!text) return;
  if (Platform.OS === "ios") setTimeout(() => AccessibilityInfo.announceForAccessibility(text), 150);
  else AccessibilityInfo.announceForAccessibility(text);
}
