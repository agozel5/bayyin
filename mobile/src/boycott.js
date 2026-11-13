// Appels au boycott : ce qui ne dépend pas de la fiche (couleur, icône, détection selon les réglages,
// pastille des listes). Séparé du composant de la fiche pour être utilisé par les listes et l'API.
import React from "react";
import { View, Text } from "react-native";
import { Glyph } from "./components/Art";
import { dir } from "./theme";
import { t, locale } from "./i18n";
import { getSettings } from "./storage";
import { boycottOf, sourceOf, DEFAULT_KINDS } from "../../public/lib/boycott.js";

export const BOYCOTT_COLOR = "#6A55C2";
export const BOYCOTT_ICON = '<path d="M4 10v4a1 1 0 0 0 1 1h2l5 4V5L7 9H5a1 1 0 0 0-1 1z"/><path d="M16 9.5a3.5 3.5 0 0 1 0 5M18.5 7a7 7 0 0 1 0 10"/>';

const fmtDate = (d) => { try { return new Intl.DateTimeFormat(locale(), { day: "numeric", month: "long", year: "numeric" }).format(new Date(d + "T12:00:00")); } catch { return d; } };
/** Ligne « Source : … · liste relue le … » et lien, pour une entrée de la liste ou un résultat */
export const sourceLine = (e) => { const s = sourceOf(e); return { url: s.url, text: t(s.key, { d: fmtDate(s.checked) }) }; };

/** Appel au boycott qui concerne ce produit selon les réglages (null si masqué ou non concerné) */
export function boycottFor(p) {
  const st = getSettings();
  if (!p || st.boycott === false) return null;
  const raw = p.raw || {};
  return boycottOf({ ...raw, code: p.code || raw.code, kind: p.kind || raw.kind, brands: raw.brands || p.brand }, { ...DEFAULT_KINDS, ...(st.boycottKinds || {}) });
}

/** Phrase qui explique pourquoi le produit est concerné */
export function boycottText(b) {
  if (b.id === "israel") return t(b.via === "barcode" ? "boycott.israel_code" : "boycott.israel");
  return t(b.level === "organic" ? "boycott.organic" : b.level === "bdsfr" ? "boycott.bdsfr" : "boycott.bds", { c: b.company });
}
export const whyKey = (b) => (b.kind === "organic" ? "boycott.why.organic" : `boycott.why.${b.why || b.id}`);

// Petite pastille pour les listes (historique, recherche, classements)
export function BoycottTag({ p, compact }) {
  if (!boycottFor(p)) return null;
  return (
    <View accessibilityLabel={t("boycott.t")} style={{ flexDirection: dir().row, alignItems: "center", gap: 3, paddingHorizontal: compact ? 5 : 7, paddingVertical: 2, borderRadius: 99, backgroundColor: BOYCOTT_COLOR + "1F" }}>
      <Glyph paths={BOYCOTT_ICON} size={12} color={BOYCOTT_COLOR} width={2.3} />
      {compact ? null : <Text style={{ color: BOYCOTT_COLOR, fontSize: 11.5, fontWeight: "800" }}>{t("boycott.tag")}</Text>}
    </View>
  );
}

