// WebView verrouillée : sert seulement à exécuter une page fournie par l'app (carte, lecture de texte).
//  - pas de navigation vers une autre page (un lien touché s'ouvre dans le navigateur, s'il est en https) ;
//  - pas d'accès aux fichiers du téléphone, pas de nouvelles fenêtres, pas de contenu non chiffré ;
//  - les messages reçus de la page sont des données, jamais du code.
import React, { forwardRef } from "react";
import { Linking } from "react-native";
import { WebView } from "react-native-webview";

export const PAGE_BASE = "https://agozel5.github.io/bayyin/";

/** JSON qu'on peut placer dans un <script> sans risque (« </script> » ne peut pas fermer la balise) */
export const safeJson = (v) => JSON.stringify(v).replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026")
  .replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");

/** Adresse sûre à ouvrir hors de l'app (https, e-mail, téléphone) ; null sinon */
export const safeUrl = (u) => {
  const s = String(u || "").trim();
  return /^(https:\/\/|mailto:|tel:)/i.test(s) ? s : null;
};

const SafeWebView = forwardRef(function SafeWebView({ onMessage, ...props }, ref) {
  return (
    <WebView
      ref={ref}
      {...props}
      originWhitelist={["https://*", "about:blank"]}
      onShouldStartLoadWithRequest={(r) => {
        if (r.url === PAGE_BASE || r.url === "about:blank" || r.url.startsWith("data:")) return true;
        if (r.isTopFrame === false) return true; // ressources internes (cadres) : la page elle-même n'en crée pas
        const u = safeUrl(r.url);
        if (u && r.navigationType === "click") Linking.openURL(u).catch(() => {});
        return false;
      }}
      onMessage={(e) => {
        const d = e && e.nativeEvent && e.nativeEvent.data;
        if (typeof d !== "string" || d.length > 200000) return; // message inattendu : ignoré
        onMessage && onMessage(e);
      }}
      javaScriptEnabled
      javaScriptCanOpenWindowsAutomatically={false}
      setSupportMultipleWindows={false}
      allowFileAccess={false}
      allowFileAccessFromFileURLs={false}
      allowUniversalAccessFromFileURLs={false}
      allowsLinkPreview={false}
      mixedContentMode="never"
      geolocationEnabled={false}
      mediaPlaybackRequiresUserAction
      dataDetectorTypes="none"
    />
  );
});
export default SafeWebView;
