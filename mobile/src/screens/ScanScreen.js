// Accueil : scan en un geste, raccourcis, réglages visibles, derniers produits et favoris.
import React, { useState } from "react";
import { View, Text, TextInput, Pressable, Platform, ScrollView, Image } from "react-native";
import Icon, { Logo } from "../components/Icon";
import { Txt, H1, H2, Muted, Row, Btn, Message, StatusPill, MiniScore, FadeIn, FONT_MAX } from "../components/ui";
import Screen from "../components/Screen";
import { C, R, ALERT_COLORS, dir } from "../theme";
import { t, tPlain } from "../i18n";
import { getHistory, getSettings } from "../storage";
import { nameOf, verdictOf, kindOf, profileOf, S } from "../view";
import { hasProfile } from "../core";
import { haptic } from "../motion";

// Raccourci carré : icône au-dessus, libellé en dessous
function Action({ icon, text, onPress }) {
  return (
    <Pressable
      onPress={() => {
        haptic.light();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={text}
      style={({ pressed }) => ({
        flex: 1, alignItems: "center", gap: 8, paddingVertical: 14, paddingHorizontal: 4, borderRadius: R.lg,
        backgroundColor: pressed ? C.tint2 : C.tint, transform: [{ scale: pressed ? 0.97 : 1 }],
      })}
    >
      <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" }}>
        <Icon name={icon} size={22} color={C.brand} />
      </View>
      <Text maxFontSizeMultiplier={1.3} numberOfLines={2} style={{ fontSize: 12.5, lineHeight: 16, fontWeight: "700", color: C.fg, textAlign: "center" }}>{text}</Text>
    </Pressable>
  );
}

// Pastille de réglage (école, profil) qui mène aux Réglages
function SettingChip({ icon, text, onPress, accent }) {
  return (
    <Pressable
      onPress={() => {
        haptic.tap();
        onPress();
      }}
      accessibilityRole="button"
      style={({ pressed }) => ({
        flexDirection: dir().row, alignItems: "center", gap: 6, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999,
        backgroundColor: accent ? C.brandSoft : pressed ? C.tint2 : C.tint, maxWidth: "100%",
      })}
    >
      <Icon name={icon} size={16} color={C.brand} />
      <Text maxFontSizeMultiplier={1.3} numberOfLines={1} style={{ fontSize: 13, fontWeight: "700", color: accent ? C.brandDark : C.fg, flexShrink: 1 }}>{text}</Text>
    </Pressable>
  );
}

// Carte produit compacte pour les listes horizontales
function MiniCard({ e, onOpen }) {
  const p = e.p;
  const kind = kindOf(p);
  const alert = profileOf(p).alert;
  return (
    <Pressable
      onPress={() => onOpen(e.code)}
      accessibilityRole="button"
      accessibilityLabel={`${nameOf(p)}, ${t("detail.halal")} : ${S(verdictOf(p).status, "label")}${alert ? ", " + t(`alert.${alert}`) : ""}`}
      style={({ pressed }) => ({ width: 138, borderRadius: R.lg, padding: 10, gap: 6, backgroundColor: pressed ? C.tint2 : C.tint, transform: [{ scale: pressed ? 0.98 : 1 }] })}
    >
      <View style={{ height: 92, borderRadius: 12, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
        {p.image ? (
          <Image source={{ uri: p.image }} style={{ width: "100%", height: "100%" }} resizeMode="contain" accessible={false} />
        ) : (
          <Icon name={p.local ? "doc" : kind === "medicine" ? "pill" : kind === "beauty" ? "drop" : "box"} size={30} color={C.faint} />
        )}
        {alert ? (
          <View style={{ position: "absolute", top: 6, end: 6, width: 22, height: 22, borderRadius: 11, backgroundColor: ALERT_COLORS[alert][0], alignItems: "center", justifyContent: "center" }}>
            <Text style={{ color: "#fff", fontWeight: "900", fontSize: 13 }}>!</Text>
          </View>
        ) : null}
        {e.fav ? (
          <View style={{ position: "absolute", top: 6, start: 6 }}>
            <Icon name="star" size={16} color="#E9A100" fill="#E9A100" />
          </View>
        ) : null}
      </View>
      <Txt numberOfLines={2} style={{ fontSize: 13.5, lineHeight: 17, fontWeight: "700", minHeight: 34 }}>{nameOf(p)}</Txt>
      <StatusPill status={verdictOf(p).status} />
      <MiniScore p={p} />
    </Pressable>
  );
}

function Shelf({ title, items, onOpen, onSeeAll }) {
  if (!items.length) return null;
  return (
    <View style={{ gap: 10 }}>
      <Row style={{ justifyContent: "space-between" }}>
        <H2>{title}</H2>
        {onSeeAll ? (
          <Pressable onPress={onSeeAll} hitSlop={8} accessibilityRole="link">
            <Text style={{ color: C.brand, fontWeight: "700" }}>{t("home.see_all")}</Text>
          </Pressable>
        ) : null}
      </Row>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginHorizontal: -20 }}
        contentContainerStyle={{ paddingHorizontal: 20, gap: 10, flexDirection: dir().row }}
      >
        {items.map((e) => <MiniCard key={e.code} e={e} onOpen={onOpen} />)}
      </ScrollView>
    </View>
  );
}

function Feature({ icon, color, title, text }) {
  return (
    <View style={{ flexBasis: "47%", flexGrow: 1, backgroundColor: C.tint, borderRadius: R.lg, padding: 14, gap: 6 }}>
      <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: color, alignItems: "center", justifyContent: "center" }}>
        <Icon name={icon} size={20} color="#fff" width={2.3} />
      </View>
      <Txt style={{ fontWeight: "800" }}>{title}</Txt>
      <Muted style={{ fontSize: 14, lineHeight: 20 }}>{text}</Muted>
    </View>
  );
}

export default function ScanScreen({ onScan, onOpen, onOcr, onPhotoBarcode, onGoto, onGotoSettings, onGotoProfile, manualOpen, setManualOpen, status }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState(null);
  const history = getHistory();
  const recent = history.slice(0, 10);
  const favs = history.filter((e) => e.fav).slice(0, 10);
  const st = getSettings();
  const prof = st.profile;
  const profileText = hasProfile(prof)
    ? [prof.diet ? t(`diet.${prof.diet}`) : null, ...prof.allergens.slice(0, 2).map((a) => t(`allergen.${a}`)), prof.allergens.length > 2 ? `+${prof.allergens.length - 2}` : null]
        .filter(Boolean)
        .join(" · ")
    : null;
  const tipN = 1 + (Math.floor(Date.now() / 864e5) % 4); // une astuce différente chaque jour

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
    <Screen gap={22}>
      <Row style={{ justifyContent: "space-between" }}>
        <Row gap={10}>
          <View accessible={false} importantForAccessibility="no-hide-descendants"><Logo size={36} /></View>
          <Text style={{ fontSize: 22, fontWeight: "800", color: C.fg }}>{t("app.name")}</Text>
          <Text style={{ fontSize: 20, fontWeight: "700", color: C.brand }}>بيّن</Text>
        </Row>
        <Pressable
          onPress={onGotoProfile}
          accessibilityRole="button"
          accessibilityLabel={t("settings.profile")}
          hitSlop={8}
          style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: C.tint, alignItems: "center", justifyContent: "center" }}
        >
          <Icon name="user" size={21} color={C.fg} />
        </Pressable>
      </Row>

      <FadeIn style={{ gap: 8 }}>
        <Txt style={{ color: C.brand, fontWeight: "800", fontSize: 14 }}>{t("app.tagline")}</Txt>
        <H1>{tPlain("home.h1_html")}</H1>
        <Muted style={{ fontSize: 16, lineHeight: 23 }}>{t("home.lead")}</Muted>
      </FadeIn>

      <Pressable
        onPress={() => {
          haptic.light();
          onScan();
        }}
        accessibilityRole="button"
        accessibilityLabel={`${t("home.scan")}. ${t("home.kinds")}`}
        style={({ pressed }) => ({
          flexDirection: dir().row, alignItems: "center", gap: 16, padding: 18, borderRadius: R.xl,
          backgroundColor: pressed ? C.brandDark : C.brand, transform: [{ scale: pressed ? 0.98 : 1 }],
          shadowColor: C.brand, shadowOpacity: 0.3, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 5,
        })}
      >
        <View style={{ width: 64, height: 64, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.16)", alignItems: "center", justifyContent: "center" }}>
          <Icon name="scan" size={34} color="#fff" />
        </View>
        <View style={{ flex: 1, gap: 3 }}>
          <Txt style={{ color: "#fff", fontWeight: "800", fontSize: 20 }}>{t("home.scan")}</Txt>
          <Txt style={{ color: "rgba(255,255,255,0.88)", fontSize: 13.5, lineHeight: 18 }}>{t("home.kinds")}</Txt>
        </View>
        <Icon name="chev" size={22} color="#fff" flip={dir().rtl} />
      </Pressable>

      <View style={{ flexDirection: dir().row, gap: 8 }}>
        <Action icon="doc" text={t("home.photo_ingredients")} onPress={() => onOcr(null)} />
        <Action icon="keyboard" text={t("home.type_code")} onPress={() => setManualOpen(!manualOpen)} />
        <Action icon="search" text={t("home.search")} onPress={() => onGoto("search")} />
        {Platform.OS === "android" ? <Action icon="camera" text={t("home.photo_barcode")} onPress={onPhotoBarcode} /> : null}
      </View>

      {manualOpen ? (
        <FadeIn style={{ gap: 8 }}>
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
              maxFontSizeMultiplier={FONT_MAX}
              accessibilityLabel={t("home.manual_label")}
              style={{ flex: 1, borderWidth: 1.5, borderColor: C.line, borderRadius: R.md, paddingHorizontal: 14, paddingVertical: 12, fontSize: 18, color: C.fg, backgroundColor: "#fff" }}
            />
            <Btn title={t("home.verify")} onPress={submit} />
          </Row>
          {error ? <Message title={t("msg.code_short.t")} text={t("msg.code_short.p")} /> : null}
        </FadeIn>
      ) : null}

      <View style={{ flexDirection: dir().row, flexWrap: "wrap", gap: 8 }}>
        <SettingChip icon="shield" text={t("home.school_chip", { s: t(`school.${st.school}`) })} onPress={onGotoSettings} />
        <SettingChip icon="user" text={profileText ? t("home.profile_chip", { p: profileText }) : t("home.profile_add")} onPress={onGotoProfile} accent={!profileText} />
      </View>

      {status ? <Message title={status.title} text={status.text} /> : null}

      <Shelf title={t("home.recent")} items={recent} onOpen={onOpen} onSeeAll={() => onGoto("history")} />
      <Shelf title={t("home.favorites")} items={favs} onOpen={onOpen} />

      <Row gap={12} style={{ backgroundColor: "#FFF8E6", borderRadius: R.lg, padding: 14, alignItems: "flex-start" }}>
        <Icon name="bulb" size={22} color="#B98500" />
        <View style={{ flex: 1, gap: 2 }}>
          <Txt style={{ fontWeight: "800", color: "#8A6400" }}>{t("home.tip")}</Txt>
          <Txt style={{ fontSize: 15, lineHeight: 21 }}>{t(`home.tip.${tipN}`)}</Txt>
        </View>
      </Row>

      {history.length < 3 ? (
        <View style={{ gap: 12 }}>
          <H2>{t("home.know")}</H2>
          <View style={{ flexDirection: dir().row, flexWrap: "wrap", gap: 10 }}>
            <Feature icon="check" color="#169B57" title={t("feat.halal.t")} text={t("feat.halal.p")} />
            <Feature icon="heart" color="#7DBE45" title={t("feat.health.t")} text={t("feat.health.p")} />
            <Feature icon="pill" color="#3F79B5" title={t("feat.beauty.t")} text={t("feat.beauty.p")} />
            <Feature icon="user" color="#8E5BD0" title={t("feat.profile.t")} text={t("feat.profile.p")} />
            <Feature icon="flask" color="#EE8A1F" title={t("feat.add.t")} text={t("feat.add.p")} />
            <Feature icon="search" color="#14805A" title={t("feat.alt.t")} text={t("feat.alt.p")} />
          </View>
        </View>
      ) : null}

      <Row gap={8} style={{ justifyContent: "center" }}>
        <Icon name="shield" size={18} color={C.brand} />
        <Text style={{ color: C.muted, fontWeight: "700", fontSize: 13 }}>{t("privacy.badge")}</Text>
      </Row>
    </Screen>
  );
}
