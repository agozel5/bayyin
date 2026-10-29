// Demande d'avis (fenêtre officielle d'Apple ou de Google), une seule fois, après quelques fiches réussies.
import { Platform } from "react-native";
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
