// Demande d'avis (fenêtre officielle d'Apple ou de Google), une seule fois, après quelques fiches réussies.
import { Platform, Linking } from "react-native";
import { getSettings, setSettings } from "./storage";

export function countScan(status) {
  const st = getSettings();
  const scans = (st.scans || 0) + 1;
  setSettings({ scans });
  if (Platform.OS === "web" || st.reviewAsked || scans < 6) return;
  if (status !== "halal_certifie" && status !== "halal_probable") return; // un bon moment : un verdict clair et positif
  setSettings({ reviewAsked: Date.now() });
  setTimeout(async () => {
    try {
      const StoreReview = require("expo-store-review");
      if (await StoreReview.hasAction()) await StoreReview.requestReview();
    } catch { /* indisponible */ }
  }, 2500);
}

// « Donner mon avis » (Réglages) : ouvre la page de l'app sur le store, directement sur la rédaction
// d'un avis ; si le store ne s'ouvre pas, on demande la fenêtre de notation du système.
const IOS_APP_ID = "6828549276";
const ANDROID_PACKAGE = "io.github.agozel5.bayyin";
export async function rateApp() {
  const url = Platform.OS === "ios" ? `itms-apps://apps.apple.com/app/id${IOS_APP_ID}?action=write-review` : `market://details?id=${ANDROID_PACKAGE}`;
  try { await Linking.openURL(url); return; } catch { /* store indisponible */ }
  try {
    const StoreReview = require("expo-store-review");
    if (await StoreReview.hasAction()) await StoreReview.requestReview();
  } catch { /* indisponible */ }
}
