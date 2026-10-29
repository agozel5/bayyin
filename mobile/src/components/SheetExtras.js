// Blocs de la fiche repris de la version web : écrire à la marque, lire la photo des ingrédients
// déjà publiée, fiches plus complètes du même produit, ajouter le produit à Open Food Facts.
import React, { useEffect, useState } from "react";
import { View, Text, Pressable, Image, Linking, Share, ScrollView } from "react-native";
import { Txt, Muted, Row, Btn, Skeleton, FadeIn } from "./ui";
import { Glyph } from "./Art";
import { ProductCard } from "./Cards";
import { C, R, dir, isDark } from "../theme";
import { t } from "../i18n";
import { nameOf, kindOf, isBarcode, flagLabel } from "../view";
import { fetchTwins } from "../api";
import { haptic } from "../motion";

const open = (url) => Linking.openURL(url).catch(() => {});
const MAIL = '<path d="M4 6h16v12H4z"/><path d="M4 7l8 6 8-6"/>';

function Box({ children, tone = "soft" }) {
  const bg = tone === "doubt" ? (isDark() ? "#2F2412" : "#FFF7EA") : C.tint;
  const line = tone === "doubt" ? (isDark() ? "#4D3A17" : "#F4DDB4") : C.line;
  return <View style={{ borderRadius: R.lg, padding: 14, gap: 10, backgroundColor: bg, borderWidth: 1, borderColor: line }}>{children}</View>;
}

function SmallBtn({ text, onPress, primary, icon }) {
  return (
    <Pressable onPress={() => { haptic.tap(); onPress(); }} accessibilityRole="button"
      style={({ pressed }) => ({ flexDirection: dir().row, alignItems: "center", gap: 6, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12, backgroundColor: primary ? (pressed ? C.brandDark : C.brand) : pressed ? C.tint2 : C.surface, borderWidth: primary ? 0 : 1, borderColor: C.line })}>
      {icon ? <Glyph paths={icon} size={16} color={primary ? "#fff" : C.fg} width={2} /> : null}
      <Text style={{ color: primary ? "#fff" : C.fg, fontWeight: "800", fontSize: 14 }}>{text}</Text>
    </Pressable>
  );
}

/** Ingrédients douteux : un message prêt à envoyer au service consommateurs */
export function AskBrand({ p, v }) {
  if (kindOf(p) === "medicine" || !isBarcode(p.code)) return null;
  if (!v.flags.some((f) => f.severity === "mashbouh" && !f.covered)) return null;
  const doubts = v.flags.filter((f) => f.severity === "mashbouh" || f.severity === "haram").map((f) => flagLabel(f));
  const subject = t("ask.subject", { name: nameOf(p) });
  const body = t("ask.body", { name: nameOf(p), brand: p.brand || "", code: p.code, list: doubts.map((d) => "- " + d).join("\n") });
  const find = `https://duckduckgo.com/?q=${encodeURIComponent(`${p.brand || nameOf(p)} service consommateurs contact`)}`;
  return (
    <Box tone="doubt">
      <Row gap={10} style={{ alignItems: "flex-start" }}>
        <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: C.doubt, alignItems: "center", justifyContent: "center" }}><Glyph paths={MAIL} size={18} color="#fff" width={2} /></View>
        <View style={{ flex: 1, gap: 3 }}>
          <Txt style={{ fontWeight: "800" }}>{t("ask.t")}</Txt>
          <Muted style={{ fontSize: 13.5, lineHeight: 19 }}>{t("ask.p")}</Muted>
        </View>
      </Row>
      <View style={{ flexDirection: dir().row, flexWrap: "wrap", gap: 8 }}>
        <SmallBtn primary icon={MAIL} text={t("ask.write")} onPress={() => open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`)} />
        <SmallBtn text={t("share.text")} onPress={() => Share.share({ message: `${subject}\n\n${body}` }).catch(() => {})} />
        <SmallBtn text={t("ask.find")} onPress={() => open(find)} />
      </View>
    </Box>
  );
}

/** Photo de la liste d'ingrédients déjà publiée sur Open Food Facts */
export const ingredientsPhoto = (p) => {
  const ph = (p.photos || []).find((x) => (x.k || x[0]) === "ingredients");
  return (ph && (ph.u || ph[1])) || (p.raw && p.raw.image_ingredients_url) || null;
};
export function OffPhoto({ p, v, onOcr }) {
  const url = v.status === "inconnu" && isBarcode(p.code) && kindOf(p) === "food" ? ingredientsPhoto(p) : null;
  if (!url) return null;
  return (
    <Box>
      <Row gap={12} style={{ alignItems: "center" }}>
        <Image source={{ uri: url }} style={{ width: 64, height: 64, borderRadius: 10, backgroundColor: "#fff" }} resizeMode="cover" />
        <View style={{ flex: 1, gap: 3 }}>
          <Txt style={{ fontWeight: "800" }}>{t("offocr.t")}</Txt>
          <Muted style={{ fontSize: 13.5, lineHeight: 19 }}>{t("offocr.p")}</Muted>
        </View>
      </Row>
      <Btn title={t("offocr.btn")} icon="doc" onPress={() => onOcr(p.code, url)} />
    </Box>
  );
}

/** Fiche sans ingrédients : fiches plus complètes du même produit (autre format, autre pays) */
export function Twins({ p, onOpen }) {
  const want = !p.ingredients && !p.local && isBarcode(p.code) && kindOf(p) === "food" && !!nameOf(p);
  const [list, setList] = useState(want ? null : []);
  useEffect(() => {
    if (!want) return;
    let alive = true;
    setList(null);
    fetchTwins(p).then((l) => alive && setList(l || [])).catch(() => alive && setList([]));
    return () => { alive = false; };
  }, [p.code, want]);
  if (!want || (list && !list.length)) return null;
  return (
    <View style={{ gap: 8 }}>
      <Txt style={{ fontWeight: "800" }}>{list ? t("twins.t") : t("twins.searching")}</Txt>
      {list ? <Muted style={{ fontSize: 13.5, lineHeight: 19 }}>{t("twins.p")}</Muted> : null}
      {list ? (
        <FadeIn>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16 }} contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 4, gap: 12, flexDirection: dir().row }}>
            {list.map((a) => <ProductCard key={a.code} p={a} width={190} onPress={() => onOpen(a.code, { product: a })} />)}
          </ScrollView>
        </FadeIn>
      ) : (
        <View style={{ flexDirection: dir().row, gap: 12 }}>{[0, 1].map((i) => <Skeleton key={i} width={190} height={150} radius={18} />)}</View>
      )}
    </View>
  );
}

/** Produit absent ou sans liste : l'ajouter sur Open Food Facts (et partager la liste lue par Bayyin) */
export function Contribute({ p }) {
  if (!isBarcode(p.code) || kindOf(p) === "medicine") return null;
  const beauty = kindOf(p) === "beauty";
  const fromOcr = p.local && p.ingredients;
  if (!fromOcr) return null;
  const url = `${beauty ? "https://world.openbeautyfacts.org" : "https://world.openfoodfacts.org"}/cgi/product.pl?type=search_or_add&action=process&code=${encodeURIComponent(p.code)}`;
  return (
    <Box>
      <Row gap={10} style={{ alignItems: "flex-start" }}>
        <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: C.brand, alignItems: "center", justifyContent: "center" }}><Glyph paths='<path d="M12 5v14M5 12h14"/>' size={18} color="#fff" width={2.4} /></View>
        <View style={{ flex: 1, gap: 3 }}>
          <Txt style={{ fontWeight: "800" }}>{t(p.raw && p.raw.ocr_from === "off" ? "contrib.t_list" : "contrib.t")}</Txt>
          <Muted style={{ fontSize: 13.5, lineHeight: 19 }}>{t("contrib.p")}</Muted>
        </View>
      </Row>
      <View style={{ flexDirection: dir().row, flexWrap: "wrap", gap: 8 }}>
        <SmallBtn primary text={t("contrib.web")} onPress={() => open(url)} />
        <SmallBtn text={t("share.text")} onPress={() => Share.share({ message: p.ingredients }).catch(() => {})} />
      </View>
      <Muted style={{ fontSize: 12.5, lineHeight: 17 }}>{t("contrib.share_hint")}</Muted>
    </Box>
  );
}
