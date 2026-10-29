// Accueil : bandeau vert (bonjour et bilan de la semaine, ou présentation), scan en un geste,
// derniers produits, réglage suivi, astuce du jour et ce que l'app vérifie.
import Ramadan from "../components/Ramadan";
import React, { useState } from "react";
import { View, Text, TextInput, Pressable, ScrollView } from "react-native";
import { SvgXml } from "react-native-svg";
import { Logo } from "../components/Icon";
import { Tile, Glyph } from "../components/Art";
import { ProductCard, Khatam } from "../components/Cards";
import { Txt, Muted, Row, Message, FadeIn, FONT_MAX } from "../components/ui";
import Screen from "../components/Screen";
import { C, R, dir, lift, isDark, STATUS_COLORS } from "../theme";
import { t, tn, tPlain } from "../i18n";
import { getHistory, getSettings, getEntry } from "../storage";
import { verdictOf, profileOf, nameOf } from "../view";
import { hasProfile } from "../core";
import { haptic } from "../motion";
import { tourRef } from "../components/Tour";
import { cap, longDate } from "../recalls";

const TIP_COUNT = 8;
const BARCODE = `<svg viewBox="0 0 48 48"><rect width="48" height="48" rx="12" fill="#E8F5EE"/><g stroke="#16241C" stroke-width="2.4"><path d="M11 13v20M15 13v20M18.5 13v20M22.5 13v20M27 13v20M30.5 13v20M34.5 13v20M37.5 13v20"/></g><path d="M8 35.5h32" stroke="#E0566A" stroke-width="2.4" stroke-linecap="round"/></svg>`;
const FEATURES = [
  ["halal", "#1A9C68", '<path d="M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6z"/><path d="M9.5 12.5l2 2 3.5-4"/>'],
  ["health", "#E0457B", '<path d="M3 12h4l2.5-6 4 12 2.5-6H21"/>'],
  ["beauty", "#8A63DA", '<path d="M10.5 20.5a5 5 0 0 1-7-7l6-6a5 5 0 0 1 7 7zM7 10.5l6.5 6.5"/>'],
  ["profile", "#3D84DB", '<circle cx="12" cy="8.5" r="4"/><path d="M4.5 20.5c1.2-3.8 4-5.5 7.5-5.5s6.3 1.7 7.5 5.5"/>'],
  ["add", "#9B79E2", '<path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4A2 2 0 0 0 19 18l-5-9V3"/><path d="M7.5 15h9"/>'],
  ["alt", "#1FA597", '<path d="M4 12a8 8 0 0 1 14-5.3L20 9M20 4v5h-5M20 12a8 8 0 0 1-14 5.3L4 15M4 20v-5h5"/>'],
];
const WK = { ok: "#8FE3B8", doubt: "#FFC163", bad: "#FF8C80", other: "rgba(255,255,255,0.3)" };

function week(history) {
  const list = history.filter((e) => e.at > Date.now() - 7 * 864e5);
  const c = { ok: 0, doubt: 0, bad: 0, other: 0 };
  list.forEach((e) => {
    const st = verdictOf(e.p).status;
    if (st === "haram" || profileOf(e.p).alert === "no") c.bad++;
    else if (st === "mashbouh") c.doubt++;
    else if (st === "halal_certifie" || st === "halal_probable") c.ok++;
    else c.other++;
  });
  return { n: list.length, c };
}

function HeroButton({ icon, text, onPress, on }) {
  return (
    <Pressable
      onPress={() => { haptic.light(); onPress(); }}
      accessibilityRole="button"
      accessibilityLabel={text}
      style={({ pressed }) => ({ flex: 1, flexDirection: dir().row, alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 13, paddingHorizontal: 10,
        borderRadius: R.md, backgroundColor: on ? "#fff" : pressed ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.14)" })}
    >
      <Glyph name={icon} size={18} color={on ? "#0F6545" : "#fff"} />
      <Text numberOfLines={2} maxFontSizeMultiplier={1.3} style={{ color: on ? "#0F6545" : "#fff", fontWeight: "700", fontSize: 14, textAlign: "center", flexShrink: 1 }}>{text}</Text>
    </Pressable>
  );
}

export default function ScanScreen({ onScan, onOpen, onOcr, onGoto, onGotoProfile, onRankings, onAisle, onPlaces, onCompare, onBasketMode, onOpenBasket, basketCount = 0, recalls = [], onDismissRecalls, manualOpen, setManualOpen, status }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState(null);
  const history = getHistory();
  const recent = history.slice(0, 10);
  const st = getSettings();
  const prof = st.profile;
  const profText = hasProfile(prof)
    ? [prof.diet ? t(`diet.${prof.diet}`) : null, ...prof.allergens.slice(0, 2).map((a) => t(`allergen.${a}`)), prof.allergens.length > 2 ? `+${prof.allergens.length - 2}` : null].filter(Boolean).join(" · ")
    : t("home.no_allergy");
  const tip = 1 + (Math.floor(Date.now() / 864e5) % TIP_COUNT);
  const wk = week(history);
  const returning = history.length > 0;

  const submit = () => {
    const digits = code.replace(/\D/g, "");
    if (digits.length < 8 || digits.length > 14) { haptic.error(); return setError(true); }
    setError(null);
    onOpen(digits, { fromScan: true });
  };

  return (
    <Screen gap={18}>
      {/* En-tête : logo, nom, profil */}
      <Row style={{ justifyContent: "space-between" }}>
        <Row gap={10}>
          <View accessible={false} importantForAccessibility="no-hide-descendants"><Logo size={36} /></View>
          <Text style={{ fontSize: 21, fontWeight: "800", color: C.fg }}>{t("app.name")}</Text>
          <Text style={{ fontSize: 19, fontWeight: "700", color: C.brand }}>بيّن</Text>
        </Row>
        <Pressable onPress={onGotoProfile} accessibilityRole="button" accessibilityLabel={t("settings.profile")} hitSlop={8}
          style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, alignItems: "center", justifyContent: "center" }}>
          <Glyph name="user" size={21} color={C.fg} />
        </Pressable>
      </Row>

      {/* Bandeau vert */}
      <View style={{ borderRadius: R.xl, padding: 18, gap: 14, backgroundColor: isDark() ? "#0F4A35" : "#0F6545", overflow: "hidden",
        shadowColor: "#0F6545", shadowOpacity: isDark() ? 0 : 0.35, shadowRadius: 18, shadowOffset: { width: 0, height: 12 }, elevation: 6 }}>
        <Khatam />
        <FadeIn style={{ gap: 8 }}>
          <Txt accessibilityRole="header" style={{ color: "#fff", fontSize: returning ? 30 : 27, lineHeight: returning ? 34 : 31, fontWeight: "800", letterSpacing: -0.5 }}>
            {returning ? t("home.greet") : tPlain("home.h1_html")}
          </Txt>
          {returning ? (
            <View style={{ gap: 8 }}>
              <Txt style={{ color: "rgba(255,255,255,0.92)", fontSize: 15, fontWeight: "600" }}>{wk.n ? tn("home.week", wk.n) : t("home.week_none")}</Txt>
              {wk.n ? (
                <View style={{ flexDirection: dir().row, gap: 4, height: 8 }}>
                  {["ok", "doubt", "bad", "other"].filter((k) => wk.c[k]).map((k) => <View key={k} style={{ flex: wk.c[k], borderRadius: 4, backgroundColor: WK[k] }} />)}
                </View>
              ) : null}
              <Row gap={14} style={{ flexWrap: "wrap" }}>
                {["ok", "doubt", "bad"].filter((k) => wk.c[k]).map((k) => (
                  <Row key={k} gap={6}><View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: WK[k] }} /><Text style={{ color: "#fff", fontWeight: "700", fontSize: 13 }}>{t(`home.wk_${k}`, { n: wk.c[k] })}</Text></Row>
                ))}
              </Row>
            </View>
          ) : (
            <Txt style={{ color: "rgba(255,255,255,0.88)", fontSize: 15, lineHeight: 21 }}>{t("home.lead")}</Txt>
          )}
        </FadeIn>

        <Pressable
          ref={tourRef("scan")}
          onPress={() => { haptic.light(); onScan(); }}
          accessibilityRole="button"
          accessibilityLabel={`${t("home.scan")}. ${t("home.kinds")}`}
          style={({ pressed }) => ({ flexDirection: dir().row, alignItems: "center", gap: 14, padding: 14, borderRadius: R.lg, backgroundColor: "#fff", transform: [{ scale: pressed ? 0.98 : 1 }] })}
        >
          <SvgXml xml={BARCODE} width={56} height={56} />
          <View style={{ flex: 1, gap: 2 }}>
            <Txt style={{ color: "#16241C", fontWeight: "800", fontSize: 19 }}>{t("home.scan")}</Txt>
            <Txt style={{ color: "#5D6A63", fontSize: 13.5, lineHeight: 18 }}>{t("home.kinds")}</Txt>
          </View>
          <Glyph name="chev" size={20} color="#0F6545" />
        </Pressable>
        <View ref={tourRef("photo")} collapsable={false} style={{ flexDirection: dir().row, gap: 10 }}>
          <HeroButton icon="doc" text={t("home.photo_ingredients")} onPress={() => onOcr(null)} />
          <HeroButton icon="keyboard" text={t("home.type_code")} on={manualOpen} onPress={() => setManualOpen(!manualOpen)} />
        </View>
        {manualOpen ? (
          <FadeIn style={{ gap: 8 }}>
            <Txt style={{ color: "rgba(255,255,255,0.9)", fontSize: 14 }}>{t("home.manual_label")}</Txt>
            <Row>
              <TextInput value={code} onChangeText={setCode} keyboardType="number-pad" placeholder="3017620422003" placeholderTextColor="#97A39C" autoFocus returnKeyType="go"
                onSubmitEditing={submit} maxFontSizeMultiplier={FONT_MAX} accessibilityLabel={t("home.manual_label")}
                style={{ flex: 1, borderRadius: R.md, paddingHorizontal: 14, paddingVertical: 12, fontSize: 18, color: "#16241C", backgroundColor: "#fff" }} />
              <Pressable onPress={submit} accessibilityRole="button" style={({ pressed }) => ({ paddingHorizontal: 18, paddingVertical: 13, borderRadius: R.md, backgroundColor: pressed ? "#0B5139" : "#1A9C68" })}>
                <Text style={{ color: "#fff", fontWeight: "800", fontSize: 16 }}>{t("home.verify")}</Text>
              </Pressable>
            </Row>
            {error ? <Txt style={{ color: "#FFD3CE", fontSize: 14 }}>{t("msg.code_short.p")}</Txt> : null}
          </FadeIn>
        ) : null}
      </View>

      {/* Pendant le Ramadan : horaires du jour */}
      <Ramadan force={typeof window !== "undefined" && !!window.__bayyinRamadan} />

      {/* Rappel d'un produit de l'historique */}
      {recalls.length ? (() => {
        const h = recalls[0];
        const e = getEntry(h.code);
        const [fg, bg] = STATUS_COLORS.haram;
        return (
          <FadeIn>
            <View accessibilityRole="alert" style={[{ flexDirection: dir().row, alignItems: "center", borderRadius: R.lg, backgroundColor: bg, borderWidth: 1, borderColor: fg + "55", overflow: "hidden" }, lift()]}>
              <Pressable onPress={() => onOpen(h.code)} accessibilityRole="button" style={{ flex: 1, flexDirection: dir().row, alignItems: "center", gap: 12, padding: 14 }}>
                <Tile color={fg} paths='<path d="M12 4l9 16H3z"/><path d="M12 10v4.5M12 17.5v.1"/>' size={40} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Txt style={{ color: fg, fontWeight: "800", fontSize: 15.5 }}>{tn("recall.home", recalls.length)}</Txt>
                  <Muted style={{ fontSize: 13.5, lineHeight: 18 }} numberOfLines={2}>{t("recall.home_p", { name: e ? nameOf(e.p) : cap(h.fiche.n), d: longDate(h.fiche.d) })}</Muted>
                </View>
                <Glyph name="chev" size={17} color={fg} />
              </Pressable>
              <Pressable onPress={onDismissRecalls} hitSlop={8} accessibilityRole="button" accessibilityLabel={t("recall.dismiss")} style={{ paddingHorizontal: 12, alignSelf: "stretch", justifyContent: "center" }}>
                <Glyph name="cross" size={17} color={C.muted} />
              </Pressable>
            </View>
          </FadeIn>
        );
      })() : null}

      {/* Outils, comme la version web : mode rayon, commerces, mode courses, comparer */}
      <View style={{ flexDirection: dir().row, gap: 10 }}>
        {[
          ["aisle", "#1FA597", '<path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2"/><circle cx="8.5" cy="10" r="2.2"/><circle cx="15.5" cy="10" r="2.2"/><circle cx="12" cy="16" r="2.2"/>', t("aisle.title"), onAisle],
          ["places", "#2F6FC0", '<path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.4"/>', t("home.tool_places"), onPlaces],
          ["basket", "#E0457B", '<path d="M5 8h14l-1.5 11a1 1 0 0 1-1 .9H7.5a1 1 0 0 1-1-.9z"/><path d="M9 8l3-4 3 4"/>', t("basket.mode"), basketCount ? onOpenBasket : onBasketMode],
          ["compare", "#4C64D6", '<path d="M4 8h13l-3-3M20 16H7l3 3"/>', t("cmp.title"), onCompare],
        ].map(([id, color, paths, label, go]) => (
          <Pressable key={id} onPress={() => { haptic.tap(); go && go(); }} accessibilityRole="button" accessibilityLabel={id === "basket" && basketCount ? `${label}, ${basketCount}` : label}
            style={({ pressed }) => [{ flex: 1, alignItems: "center", gap: 8, paddingVertical: 14, paddingHorizontal: 2, borderRadius: R.lg, backgroundColor: C.surface, transform: [{ scale: pressed ? 0.95 : 1 }] }, lift()]}>
            <View>
              <Tile color={color} paths={paths} size={42} />
              {id === "basket" && basketCount ? (
                <View style={{ position: "absolute", top: -7, [dir().rtl ? "left" : "right"]: -9, minWidth: 22, height: 22, paddingHorizontal: 5, borderRadius: 11, backgroundColor: C.brand, borderWidth: 2, borderColor: C.surface, alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ color: "#fff", fontSize: 11.5, fontWeight: "900" }}>{basketCount}</Text>
                </View>
              ) : null}
            </View>
            <Text numberOfLines={2} maxFontSizeMultiplier={1.2} adjustsFontSizeToFit minimumFontScale={0.85} style={{ fontSize: 12, lineHeight: 15, fontWeight: "800", color: C.fg, textAlign: "center" }}>{label}</Text>
          </Pressable>
        ))}
      </View>

      {/* Classements : les meilleurs produits halal de chaque rayon */}
      <Pressable ref={tourRef("rankings")} onPress={() => { haptic.tap(); onRankings && onRankings(); }} accessibilityRole="button"
        style={({ pressed }) => [{ flexDirection: dir().row, alignItems: "center", gap: 14, paddingVertical: 16, paddingHorizontal: 16, borderRadius: R.lg, backgroundColor: C.surface, transform: [{ scale: pressed ? 0.98 : 1 }] }, lift()]}>
        <Tile color="#E2A812" paths='<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M9 20h6M10 17h4"/>' size={48} />
        <View style={{ flex: 1, gap: 2 }}>
          <Txt style={{ fontWeight: "800", fontSize: 17 }}>{t("rank.title")}</Txt>
          <Muted style={{ fontSize: 14, lineHeight: 19 }}>{t("rank.promo")}</Muted>
        </View>
        <Glyph name="chev" size={17} color={C.faint} />
      </Pressable>

      {status ? <Message title={status.title} text={status.text} /> : null}

      {/* Derniers produits */}
      {recent.length ? (
        <View style={{ gap: 10 }}>
          <Row style={{ justifyContent: "space-between" }}>
            <Txt accessibilityRole="header" style={{ fontSize: 21, fontWeight: "800" }}>{t("home.recent")}</Txt>
            <Pressable onPress={() => onGoto("history")} hitSlop={8} accessibilityRole="link"><Text style={{ color: C.brand, fontWeight: "700", fontSize: 15 }}>{t("home.see_all")}</Text></Pressable>
          </Row>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20 }}
            contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 6, gap: 12, flexDirection: dir().row }}>
            {recent.map((e) => <ProductCard key={e.code} p={e.p} fav={e.fav} onPress={() => onOpen(e.code)} />)}
          </ScrollView>
        </View>
      ) : null}

      {/* Réglage suivi : avis et allergies, mène au profil */}
      <Pressable onPress={onGotoProfile} accessibilityRole="button"
        style={({ pressed }) => [{ flexDirection: dir().row, alignItems: "center", gap: 10, paddingVertical: 12, paddingHorizontal: 14, borderRadius: R.md, backgroundColor: pressed ? C.tint : C.surface }, lift()]}>
        <Glyph name="user" size={18} color={C.brand} />
        <Text numberOfLines={1} style={{ flex: 1, color: C.muted, fontSize: 14, textAlign: dir().ta }}>
          <Text style={{ color: C.fg, fontWeight: "700" }}>{t("home.setting_line")} </Text>{t(`school.${st.school}`)} · {profText}
        </Text>
        <Glyph name="chev" size={16} color={C.faint} />
      </Pressable>

      {/* Astuce du jour */}
      <Row gap={12} style={{ backgroundColor: C.tint, borderWidth: 1, borderColor: C.line, borderRadius: R.lg, padding: 14, alignItems: "flex-start" }}>
        <Glyph name="bulb" size={20} color="#D9A81E" />
        <Txt style={{ flex: 1, fontSize: 14.5, lineHeight: 21 }}><Text style={{ fontWeight: "800", color: "#C99512" }}>{t("home.tip")} </Text>{t(`home.tip.${tip}`)}</Txt>
      </Row>

      {/* Ce que l'app vérifie (premiers usages) */}
      {history.length < 3 ? (
        <View style={{ gap: 12 }}>
          <Txt accessibilityRole="header" style={{ fontSize: 21, fontWeight: "800" }}>{t("home.know")}</Txt>
          <View style={[{ backgroundColor: C.surface, borderRadius: R.xl, overflow: "hidden" }, lift()]}>
            {FEATURES.map(([id, color, paths], i) => (
              <Row key={id} gap={14} style={{ paddingVertical: 14, paddingHorizontal: 16, alignItems: "flex-start", borderTopWidth: i ? 0.5 : 0, borderTopColor: C.line }}>
                <Tile color={color} paths={paths} size={36} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Txt style={{ fontWeight: "700" }}>{t(`feat.${id}.t`)}</Txt>
                  <Muted style={{ fontSize: 14, lineHeight: 20 }}>{t(`feat.${id}.p`)}</Muted>
                </View>
              </Row>
            ))}
          </View>
        </View>
      ) : null}

      <Row gap={8} style={{ justifyContent: "center" }}>
        <Glyph name="shield" size={17} color={C.brand} />
        <Text style={{ color: C.brand, fontWeight: "700", fontSize: 13 }}>{t("privacy.badge")}</Text>
      </Row>
    </Screen>
  );
}
