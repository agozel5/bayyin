// Accueil guidé du premier lancement (comme la version web) : langue, avis religieux, allergies et régime.
// Trois étapes, la mascotte change à chaque étape ; tout reste modifiable ensuite dans Réglages.
import React, { useEffect, useRef, useState } from "react";
import { View, Text, Pressable, ScrollView, Animated, Easing, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Art } from "./Art";
import { Btn, Muted } from "./ui";
import { C, R, dir } from "../theme";
import { t, LANGS } from "../i18n";
import { SCHOOLS, LANG_NAMES, PROFILE_ALLERGENS, DIETS } from "../core";
import { getSettings, setSettings, setSchool, toggleAllergen, setDiet } from "../storage";
import { mascot } from "../../../public/lib/mascot.js";
import { ALLERGEN_ART, LANG_FLAG } from "../../../public/lib/rank-art.js";
import { haptic, ms } from "../motion";

const MOODS = ["hello", "teach", "bravo"];

function Choice({ on, onPress, children, role = "radio", style }) {
  return (
    <Pressable onPress={() => { haptic.tap(); onPress(); }} accessibilityRole={role} accessibilityState={{ checked: on }}
      style={({ pressed }) => [{ flexDirection: dir().row, alignItems: "center", gap: 12, padding: 14, borderRadius: R.md, borderWidth: 1.5, borderColor: on ? C.brand : C.line, backgroundColor: on ? C.brandSoft : C.surface, transform: [{ scale: pressed ? 0.98 : 1 }] }, style]}>
      {children}
    </Pressable>
  );
}

export default function Onboarding({ onDone }) {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(0);
  const st = getSettings();
  const v = useRef(new Animated.Value(0)).current;
  const scroll = useRef(null);
  useEffect(() => {
    v.setValue(0);
    Animated.timing(v, { toValue: 1, duration: ms(380), easing: Easing.bezier(0.2, 0.8, 0.2, 1), useNativeDriver: true }).start();
    scroll.current && scroll.current.scrollTo({ y: 0, animated: false });
  }, [step]);
  useEffect(() => { if (typeof window !== "undefined" && window.__bayyin) window.__bayyinOb = setStep; }, []);
  const finish = () => { haptic.success && haptic.success(); setSettings({ onboarded: true }); onDone(); };
  const next = () => (step < 2 ? setStep(step + 1) : finish());
  const head = (k) => (
    <View style={{ alignItems: "center", gap: 10 }}>
      <Art xml={mascot(MOODS[step], { size: 110 })} size={110} />
      <Text accessibilityRole="header" style={{ fontSize: 26, lineHeight: 32, fontWeight: "800", color: C.fg, textAlign: "center" }}>{t(`ob.${k}.t`)}</Text>
      <Muted style={{ textAlign: "center", fontSize: 15.5, lineHeight: 23 }}>{t(`ob.${k}.p`)}</Muted>
    </View>
  );
  let body;
  if (step === 0) {
    body = (
      <View style={{ gap: 10 }}>
        {LANGS.map((l) => (
          <Choice key={l} on={st.lang === l} onPress={() => setSettings({ lang: l })}>
            <View style={{ width: 42, height: 30, borderRadius: 8, overflow: "hidden", borderWidth: 0.5, borderColor: "rgba(0,0,0,0.18)" }}><Art xml={LANG_FLAG[l]} width={42} height={30} /></View>
            <Text style={{ flex: 1, fontWeight: "800", fontSize: 16, color: st.lang === l ? C.brandDark : C.fg, textAlign: dir().ta }}>{LANG_NAMES[l]}</Text>
          </Choice>
        ))}
      </View>
    );
  } else if (step === 1) {
    body = (
      <View style={{ gap: 10 }}>
        {Object.keys(SCHOOLS).map((s) => {
          const on = st.school === s;
          return (
            <Choice key={s} on={on} onPress={() => setSchool(s)}>
              <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: on ? C.brand : C.faint, alignItems: "center", justifyContent: "center" }}>
                {on ? <View style={{ width: 11, height: 11, borderRadius: 6, backgroundColor: C.brand }} /> : null}
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ fontWeight: "800", fontSize: 16, color: C.fg, textAlign: dir().ta }}>{t(`school.${s}`)}</Text>
                <Muted style={{ fontSize: 13.5, lineHeight: 19 }}>{t(`school.${s}.d`)}</Muted>
              </View>
            </Choice>
          );
        })}
      </View>
    );
  } else {
    body = (
      <View style={{ gap: 12 }}>
        <Text style={{ fontSize: 13, fontWeight: "800", color: C.muted, textTransform: "uppercase", letterSpacing: 0.6, textAlign: dir().ta }}>{t("settings.diet")}</Text>
        <View style={{ flexDirection: dir().row, flexWrap: "wrap", gap: 8 }}>
          {[null, ...DIETS].map((d) => {
            const on = (st.profile.diet || null) === d;
            return (
              <Pressable key={d || "none"} onPress={() => { haptic.tap(); setDiet(d); }} accessibilityRole="radio" accessibilityState={{ checked: on }}
                style={{ paddingVertical: 9, paddingHorizontal: 14, borderRadius: 99, borderWidth: 1.5, borderColor: on ? C.brand : C.line, backgroundColor: on ? C.brandSoft : C.surface }}>
                <Text style={{ fontWeight: "700", fontSize: 14, color: on ? C.brandDark : C.fg }}>{t(d ? `diet.${d}` : "diet.none")}</Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={{ fontSize: 13, fontWeight: "800", color: C.muted, textTransform: "uppercase", letterSpacing: 0.6, marginTop: 6, textAlign: dir().ta }}>{t("settings.allergens")}</Text>
        <View style={{ flexDirection: dir().row, flexWrap: "wrap", gap: 8 }}>
          {PROFILE_ALLERGENS.map((a) => {
            const on = st.profile.allergens.includes(a);
            return (
              <Pressable key={a} onPress={() => { haptic.tap(); toggleAllergen(a); }} accessibilityRole="checkbox" accessibilityState={{ checked: on }}
                style={{ flexDirection: dir().row, alignItems: "center", gap: 7, paddingVertical: 7, paddingHorizontal: 12, paddingStart: 7, borderRadius: 99, borderWidth: 1.5, borderColor: on ? C.brand : C.line, backgroundColor: on ? C.brandSoft : C.surface }}>
                <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: C.artBg, alignItems: "center", justifyContent: "center" }}><Art xml={ALLERGEN_ART[a]} size={20} /></View>
                <Text style={{ fontWeight: "700", fontSize: 14, color: on ? C.brandDark : C.fg }}>{t(`allergen.${a}`)}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    );
  }
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: C.bg, paddingTop: insets.top }]} accessibilityViewIsModal>
      <View style={{ flexDirection: dir().row, alignItems: "center", paddingHorizontal: 18, paddingVertical: 10 }}>
        <View style={{ flex: 1, flexDirection: dir().row, gap: 6 }}>
          {[0, 1, 2].map((i) => <View key={i} style={{ width: i === step ? 22 : 8, height: 8, borderRadius: 4, backgroundColor: i === step ? C.brand : C.line }} />)}
        </View>
        <Pressable onPress={finish} hitSlop={12} accessibilityRole="button"><Text style={{ color: C.muted, fontWeight: "700", fontSize: 15 }}>{t("ob.skip")}</Text></Pressable>
      </View>
      <ScrollView ref={scroll} contentContainerStyle={{ padding: 22, paddingTop: 8, gap: 22 }}>
        <Animated.View style={{ gap: 22, opacity: v, transform: [{ translateX: v.interpolate({ inputRange: [0, 1], outputRange: [dir().rtl ? -24 : 24, 0] }) }] }}>
          {head(step + 1)}
          {body}
        </Animated.View>
      </ScrollView>
      <View style={{ flexDirection: dir().row, gap: 10, padding: 18, paddingBottom: insets.bottom + 14, borderTopWidth: 0.5, borderTopColor: C.line, backgroundColor: C.bg }}>
        {step > 0 ? <Btn kind="ghost" title={t("sheet.back")} onPress={() => setStep(step - 1)} style={{ flex: 1 }} /> : null}
        <Btn title={t(step === 2 ? "ob.start" : "ob.next")} onPress={next} style={{ flex: 2 }} />
      </View>
    </View>
  );
}
