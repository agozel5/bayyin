// Accueil : bouton de scan, autres façons d'entrer un produit, derniers produits vus.
import React, { useState } from "react";
import { View, Text, TextInput, Pressable, Platform } from "react-native";
import Icon, { Logo } from "../components/Icon";
import { Txt, H1, H2, Muted, Row, Btn, Message, ProductRow } from "../components/ui";
import Screen from "../components/Screen";
import { C, R, dir } from "../theme";
import { t, tPlain } from "../i18n";
import { getHistory } from "../storage";
import { haptic } from "../motion";

function AltButton({ icon, text, onPress, wide }) {
  return (
    <Pressable
      onPress={() => {
        haptic.light();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={text}
      style={({ pressed }) => ({
        transform: [{ scale: pressed ? 0.98 : 1 }],
        flexBasis: wide ? "100%" : "47%", flexGrow: 1, flexDirection: dir().row, alignItems: "center", gap: 10,
        padding: 14, borderRadius: R.md, backgroundColor: pressed ? C.tint2 : C.tint,
      })}
    >
      <Icon name={icon} size={22} color={C.brand} />
      <Txt style={{ flex: 1, fontWeight: "700", fontSize: 15, lineHeight: 20 }}>{text}</Txt>
    </Pressable>
  );
}

function Feature({ badge, color, title, text }) {
  return (
    <View style={{ flexBasis: "47%", flexGrow: 1, backgroundColor: C.tint, borderRadius: R.lg, padding: 14, gap: 6 }}>
      <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: color, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ color: "#fff", fontWeight: "800", fontSize: 16 }}>{badge}</Text>
      </View>
      <Txt style={{ fontWeight: "800" }}>{title}</Txt>
      <Muted style={{ fontSize: 14, lineHeight: 20 }}>{text}</Muted>
    </View>
  );
}

export default function ScanScreen({ onScan, onOpen, onOcr, onPhotoBarcode, onGoto, manualOpen, setManualOpen, status }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState(null);
  const recent = getHistory().slice(0, 4);

  const submit = () => {
    const digits = code.replace(/\D/g, "");
    if (digits.length < 8 || digits.length > 14) {
      haptic.error();
      return setError(true);
    }
    setError(null);
    onOpen(digits, { fromScan: true });
  };

  return (
    <Screen>
      <Row gap={10}>
        <View accessible={false} importantForAccessibility="no-hide-descendants"><Logo size={36} /></View>
        <Text style={{ fontSize: 22, fontWeight: "800", color: C.fg }}>{t("app.name")}</Text>
        <Text style={{ fontSize: 20, fontWeight: "700", color: C.brand }}>بيّن</Text>
      </Row>
      <View style={{ gap: 8 }}>
        <Txt style={{ color: C.brand, fontWeight: "800", fontSize: 14 }}>{t("app.tagline")}</Txt>
        <H1>{tPlain("home.h1_html")}</H1>
        <Muted style={{ fontSize: 16, lineHeight: 23 }}>{t("home.lead")}</Muted>
      </View>

      <Pressable
        onPress={() => {
          haptic.light();
          onScan();
        }}
        accessibilityRole="button"
        accessibilityLabel={`${t("home.scan")}. ${t("home.scan_sub")}`}
        style={({ pressed }) => ({
          transform: [{ scale: pressed ? 0.98 : 1 }],
          flexDirection: dir().row, alignItems: "center", gap: 16, padding: 18, borderRadius: R.xl,
          backgroundColor: pressed ? C.brandDark : C.brand,
          shadowColor: C.brand, shadowOpacity: 0.3, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 5,
        })}
      >
        <View style={{ width: 64, height: 64, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.16)", alignItems: "center", justifyContent: "center" }}>
          <Icon name="scan" size={34} color="#fff" />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Txt style={{ color: "#fff", fontWeight: "800", fontSize: 19 }}>{t("home.scan")}</Txt>
          <Txt style={{ color: "rgba(255,255,255,0.85)", fontSize: 14, lineHeight: 19 }}>{t("home.scan_sub")}</Txt>
        </View>
        <Icon name="chev" size={22} color="#fff" flip={dir().rtl} />
      </Pressable>

      <View style={{ flexDirection: dir().row, flexWrap: "wrap", gap: 10 }}>
        {Platform.OS === "android" ? <AltButton icon="camera" text={t("home.photo_barcode")} onPress={onPhotoBarcode} /> : null}
        <AltButton icon="doc" text={t("home.photo_ingredients")} onPress={() => onOcr(null)} wide={Platform.OS !== "android"} />
        <AltButton icon="keyboard" text={t("home.type_code")} onPress={() => setManualOpen(!manualOpen)} wide />
      </View>

      <Row gap={8} style={{ justifyContent: "center" }}>
        <Icon name="shield" size={18} color={C.brand} />
        <Text style={{ color: C.muted, fontWeight: "700", fontSize: 13 }}>{t("privacy.badge")}</Text>
      </Row>

      {manualOpen ? (
        <View style={{ gap: 8 }}>
          <Muted style={{ fontSize: 14 }}>{t("home.manual_label")}</Muted>
          <Row>
            <TextInput
              value={code}
              onChangeText={setCode}
              keyboardType="number-pad"
              placeholder="3017620422003"
              placeholderTextColor={C.faint}
              autoFocus
              returnKeyType="go"
              onSubmitEditing={submit}
              style={{ flex: 1, borderWidth: 1.5, borderColor: C.line, borderRadius: R.md, paddingHorizontal: 14, paddingVertical: 12, fontSize: 18, color: C.fg, backgroundColor: "#fff" }}
            />
            <Btn title={t("home.verify")} onPress={submit} />
          </Row>
          {error ? <Message title={t("msg.code_short.t")} text={t("msg.code_short.p")} /> : null}
        </View>
      ) : null}

      {status ? <Message title={status.title} text={status.text} /> : null}

      {recent.length ? (
        <View style={{ gap: 4 }}>
          <Row style={{ justifyContent: "space-between" }}>
            <H2>{t("home.recent")}</H2>
            <Pressable onPress={() => onGoto("history")} hitSlop={8} accessibilityRole="link">
              <Text style={{ color: C.brand, fontWeight: "700" }}>{t("home.see_all")}</Text>
            </Pressable>
          </Row>
          {recent.map((e) => (
            <ProductRow key={e.code} p={e.p} fav={e.fav} onPress={() => onOpen(e.code)} />
          ))}
        </View>
      ) : null}

      {recent.length < 3 ? (
        <View style={{ gap: 12 }}>
          <H2>{t("home.know")}</H2>
          <View style={{ flexDirection: dir().row, flexWrap: "wrap", gap: 10 }}>
            <Feature badge="✓" color="#169B57" title={t("feat.halal.t")} text={t("feat.halal.p")} />
            <Feature badge="72" color="#7DBE45" title={t("feat.health.t")} text={t("feat.health.p")} />
            <Feature badge="E" color="#EE8A1F" title={t("feat.add.t")} text={t("feat.add.p")} />
            <Feature badge="↻" color="#3F79B5" title={t("feat.alt.t")} text={t("feat.alt.p")} />
          </View>
        </View>
      ) : null}
    </Screen>
  );
}
