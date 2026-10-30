// Réglages du propriétaire (app.json › expo.extra) :
//  - contactEmail : reçoit les avis et les signalements d'erreur ; vide = ces liens sont masqués ;
//  - site : nom de domaine du site (ex. "https://bayyin.app/") pour les liens de partage et le QR code ;
//    vide = le partage se fait sans lien.
import Constants from "expo-constants";

const X = (Constants.expoConfig && Constants.expoConfig.extra) || {};
export const CONTACT_EMAIL = String(X.contactEmail || "").trim();
export const SITE = String(X.site || "").trim().replace(/\/?$/, (m) => (X.site ? "/" : ""));
export const mailto = (subject, body = "") =>
  CONTACT_EMAIL ? `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}${body ? `&body=${encodeURIComponent(body)}` : ""}` : null;
