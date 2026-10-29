// Page Bayyin Premium : ce qu'apporte l'abonnement, les offres du store, l'achat et la restauration.
import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable, Linking, Platform, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Txt, Muted, Row } from "../components/ui";
import { Art, Tile, Glyph } from "../components/Art";
import { Khatam } from "../components/Cards";
import { C, R, dir, lift, isDark, STATUS_COLORS } from "../theme";
import { t, locale } from "../i18n";
import { haptic } from "../motion";
import { getPlans, buy, restore, isPremium, premiumState, onPremium, manageUrl } from "../premium";
import { mascot } from "../../../public/lib/mascot.js";

const FEATS = [
  ["rankings", "#E2A812", '<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M9 20h6M10 17h4"/>'],
  ["basket", "#1FA597", '<path d="M3 4h2l2.5 11h11L21 7H7"/><circle cx="9.5" cy="19.5" r="1.5"/><circle cx="17" cy="19.5" r="1.5"/>'],
  ["offline", "#2F6FC0", '<path d="M12 4v11M7.5 10.5L12 15l4.5-4.5M5 19.5h14"/>'],
  ["history", "#8A63DA", '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>'],
];

export default function PremiumScreen({ onClose, feature, toast }) {
  const insets = useSafeAreaInsets();
  const [plans, setPlans] = useState(null); // null : chargement ; [] : indisponible
  const [pick, setPick] = useState("year");
  const [busy, setBusy] = useState(false);
  const [, setTick] = useState(0);
  useEffect(() => onPremium(() => setTick((n) => n + 1)), []);
  useEffect(() => { getPlans().then(setPlans).catch(() => setPlans([])); }, []);
  const st = premiumState();
  const on = st.enabled && isPremium();
  const plan = plans && (plans.find((p) => p.id === pick) || plans[0]);
  const store = Platform.OS === "ios" ? "Apple" : "Google Play";

  const doBuy = async () => {
    if (!plan || busy) return;
    haptic.light();
    setBusy(true);
    try {
      if (await buy(plan)) { haptic.success(); toast && toast(t("premium.welcome")); }
    } catch { toast && toast(t("premium.err.store")); }
    setBusy(false);
  };
  const doRestore = async () => {
    setBusy(true);
    try { toast && toast(t((await restore()) ? "premium.restored" : "premium.none_found")); } catch { toast && toast(t("premium.err.store")); }
    setBusy(false);
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ paddingBottom: insets.bottom + 40, gap: 18 }}>
      {/* En-tête doré */}
      <View style={{ paddingTop: insets.top + 10, paddingHorizontal: 20, paddingBottom: 26, backgroundColor: isDark() ? "#3A2C08" : "#F6E7B8", overflow: "hidden", borderBottomLeftRadius: 30, borderBottomRightRadius: 30 }}>
        <Khatam opacity={isDark() ? 0.18 : 0.25} />
        <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel={t("sheet.back")} style={{ alignSelf: dir().rtl ? "flex-end" : "flex-start", padding: 4, transform: [{ scaleX: dir().rtl ? -1 : 1 }] }}>
          <Glyph paths='<path d="M15 5l-7 7 7 7"/>' size={24} color={isDark() ? "#F6E7B8" : "#5A4310"} width={2.2} />
        </Pressable>
        <View style={{ alignItems: "center", gap: 8 }}>
          <Art xml={mascot("star", { size: 120 })} size={120} />
          <Text style={{ fontSize: 13, fontWeight: "900", letterSpacing: 1.5, color: isDark() ? "#F0C75E" : "#9A6B00" }}>BAYYIN PREMIUM</Text>
          <Text accessibilityRole="header" style={{ fontSize: 26, lineHeight: 31, fontWeight: "900", color: isDark() ? "#FFF4D6" : "#3B2C06", textAlign: "center", letterSpacing: -0.4 }}>{on ? t("premium.active_t") : t("premium.title")}</Text>
          <Text style={{ fontSize: 15, lineHeight: 21, color: isDark() ? "#E9D9AE" : "#6B5214", textAlign: "center" }}>{on ? t("premium.thanks") : t("premium.lead")}</Text>
        </View>
      </View>

      <View style={{ paddingHorizontal: 20, gap: 18 }}>
        {feature && !on ? (
          <View style={{ padding: 12, borderRadius: R.md, backgroundColor: STATUS_COLORS.mashbouh[1] }}>
            <Txt style={{ color: STATUS_COLORS.mashbouh[0], fontWeight: "700", fontSize: 14.5 }}>{t(`premium.need.${feature}`)}</Txt>
          </View>
        ) : null}

        <View style={[{ backgroundColor: C.surface, borderRadius: R.xl, overflow: "hidden" }, lift()]}>
          {FEATS.map(([id, color, paths], i) => (
            <Row key={id} gap={14} style={{ padding: 14, alignItems: "flex-start", borderTopWidth: i ? 0.5 : 0, borderTopColor: C.line }}>
              <Tile color={color} paths={paths} size={38} />
              <View style={{ flex: 1, gap: 2 }}>
                <Txt style={{ fontWeight: "800" }}>{t(`premium.f.${id}`)}</Txt>
                <Muted style={{ fontSize: 14, lineHeight: 20 }}>{t(`premium.f.${id}.d`)}</Muted>
              </View>
              {on ? <Glyph name="check" size={18} color={C.brand} width={2.6} /> : null}
            </Row>
          ))}
        </View>

        {on ? (
          <View style={{ gap: 10 }}>
            {st.expires ? <Muted style={{ textAlign: "center" }}>{t("premium.until")} {new Date(st.expires).toLocaleDateString(locale(), { day: "numeric", month: "long", year: "numeric" })}</Muted> : null}
            <Pressable onPress={async () => Linking.openURL(await manageUrl()).catch(() => {})} accessibilityRole="link" style={{ alignItems: "center", paddingVertical: 10 }}>
              <Text style={{ color: C.brand, fontWeight: "800", fontSize: 15 }}>{t("premium.manage_store")} ↗</Text>
            </Pressable>
          </View>
        ) : plans === null ? (
          <Row gap={10} style={{ justifyContent: "center", paddingVertical: 20 }}><ActivityIndicator color={C.brand} /><Muted>{t("premium.loading")}</Muted></Row>
        ) : !plans.length ? (
          <Muted style={{ textAlign: "center" }}>{t("premium.unavailable")}</Muted>
        ) : (
          <View style={{ gap: 12 }}>
            {plans.map((p) => {
              const sel = plan && plan.id === p.id;
              return (
                <Pressable key={p.id} onPress={() => { haptic.tap(); setPick(p.id); }} accessibilityRole="radio" accessibilityState={{ checked: sel }}
                  style={[{ flexDirection: dir().row, alignItems: "center", gap: 12, padding: 16, borderRadius: R.lg, backgroundColor: C.surface, borderWidth: 2, borderColor: sel ? "#D9A21B" : "transparent" }, lift()]}>
                  <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: sel ? "#D9A21B" : C.line, alignItems: "center", justifyContent: "center" }}>
                    {sel ? <View style={{ width: 11, height: 11, borderRadius: 6, backgroundColor: "#D9A21B" }} /> : null}
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Row gap={8}>
                      <Txt style={{ fontWeight: "800", fontSize: 16.5 }}>{t(`premium.plan.${p.id}`)}</Txt>
                      {p.id === "year" ? <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 99, backgroundColor: "#D9A21B" }}><Text style={{ color: "#fff", fontSize: 11, fontWeight: "900" }}>{t("premium.best")}</Text></View> : null}
                    </Row>
                    <Muted style={{ fontSize: 13 }}>{p.id === "year" && p.perMonth ? t("premium.year_sub", { p: p.perMonth }) : t("premium.month_sub")}</Muted>
                  </View>
                  <Text style={{ fontSize: 17, fontWeight: "900", color: C.fg }}>{p.price}<Text style={{ fontSize: 12, fontWeight: "600", color: C.muted }}>{t(p.id === "year" ? "premium.per_year" : "premium.per_month")}</Text></Text>
                </Pressable>
              );
            })}
            <Pressable onPress={doBuy} disabled={busy} accessibilityRole="button"
              style={({ pressed }) => ({ marginTop: 4, paddingVertical: 17, borderRadius: 18, alignItems: "center", backgroundColor: pressed ? "#B8860F" : "#D9A21B", opacity: busy ? 0.7 : 1,
                shadowColor: "#D9A21B", shadowOpacity: 0.45, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 5 })}>
              {busy ? <ActivityIndicator color="#fff" /> : <Text style={{ color: "#fff", fontWeight: "900", fontSize: 17 }}>{plan && plan.trialDays ? t("premium.cta_trial", { n: plan.trialDays }) : t("premium.cta")}</Text>}
            </Pressable>
            <Muted style={{ fontSize: 12, lineHeight: 17, textAlign: "center" }}>{t("premium.store_legal", { store })}</Muted>
          </View>
        )}

        {!on ? (
          <Pressable onPress={doRestore} disabled={busy} accessibilityRole="button" style={{ alignItems: "center", paddingVertical: 6 }}>
            <Text style={{ color: C.brand, fontWeight: "800", fontSize: 15 }}>{t("premium.restore")}</Text>
          </Pressable>
        ) : null}

        <View style={{ padding: 14, borderRadius: R.lg, backgroundColor: C.tint, gap: 4 }}>
          <Txt style={{ fontWeight: "800", fontSize: 14.5 }}>{t("premium.free_t")}</Txt>
          <Muted style={{ fontSize: 14, lineHeight: 20 }}>{t("premium.free_p")}</Muted>
        </View>
      </View>
    </ScrollView>
  );
}
