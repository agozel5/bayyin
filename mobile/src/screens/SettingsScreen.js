// Réglages : un menu en tuiles colorées (comme iOS), puis une page par rubrique avec son illustration.
// Même organisation que la version web.
import React, { useEffect, useRef, useState } from "react";
import { View, Text, ScrollView, Pressable, Linking, BackHandler, Platform, Animated, Easing, TextInput, KeyboardAvoidingView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Constants from "expo-constants";
import { Txt, Muted, Row } from "../components/ui";
import { PageHead, Segmented, Chip, ChipRow } from "../components/Controls";
import { Tile, Art, Glyph } from "../components/Art";
import { Pill2 } from "../components/SheetParts";
import { C, R, STATUS_COLORS, GRADE_COLORS, SEV_COLORS, RISK_COLORS, VERDICT, dir, lift, isDark } from "../theme";
import { t, tn, tPlain, locale, LANGS } from "../i18n";
import { SCHOOLS, TOPICS, DECISIONS, SOURCES, LANG_NAMES, HEALTH_GRADES, PROFILE_ALLERGENS, DIETS, FLAG_SOURCES, RISK_SOURCES } from "../core";
import { COSMETIC_RULES } from "../../../public/lib/cosmetic.js";
import { mascot } from "../../../public/lib/mascot.js";
import { getSettings, setSettings, setSchool, setTopic, toggleAllergen, setDiet, toggleDistrust, resetSettings, getHistory, clearHistory, localCount, addMember, removeMember, toggleMemberAllergen, setMemberDiet } from "../storage";
import { downloadPack } from "../api";
import { downloadRankings } from "../rankcache";
import { askNotifications, notificationsGranted, checkRecalls } from "../recalls";
import { premiumEnabled, isPremium, canUse } from "../premium";
import { S } from "../view";
import { haptic, ms } from "../motion";
import { CONTACT_EMAIL, mailto } from "../config";
import { useEdgeSwipe } from "../components/EdgeSwipe";
import { Collapse, Chevron } from "../components/Reveal";
import { getBasket } from "../basket";
import { PAGE_ART } from "../../../public/lib/page-art.js";
import { ALLERGEN_ART, LANG_FLAG } from "../../../public/lib/rank-art.js";
import { CERTIFIER_INFO } from "../../../public/lib/certifiers.js";
import { I } from "../../../public/lib/icons.js";

const open = (url) => Linking.openURL(url).catch(() => {});
// Page de réglage ouverte : on peut la faire défiler jusqu'au champ quand le clavier s'ouvre
const pageScroll = React.createRef();
// Confirmation discrète après chaque réglage (comme la version web)
let say = null;
const saved = (msg) => { haptic.success(); say && say(msg); };
const SI = {
  lang: ['#3D84DB', '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3z"/>'],
  profile: ['#E0457B', I.user],
  religion: ['#1FA597', '<path d="M15.5 3.6A8.6 8.6 0 1 0 20.4 16a7 7 0 0 1-4.9-12.4z"/><path d="M17 7.5l.7 1.4 1.5.2-1.1 1 .3 1.5-1.4-.7-1.4.7.3-1.5-1.1-1 1.5-.2z"/>'],
  appearance: ['#5A6472', '<circle cx="12" cy="12" r="9"/><path d="M12 3v18"/>'],
  offline: ['#2F6FC0', '<path d="M12 4v11M7.5 10.5L12 15l4.5-4.5M5 19.5h14"/>'],
  data: ['#71809A', '<ellipse cx="12" cy="6" rx="7" ry="3"/><path d="M5 6v12c0 1.7 3.1 3 7 3s7-1.3 7-3V6M5 12c0 1.7 3.1 3 7 3s7-1.3 7-3"/>'],
  notes: ['#8A63DA', '<path d="M5 20V11M10.5 20V5M16 20v-6M3 20.5h18"/>'],
  how: ['#E2A812', I.bulb],
  sources: ['#4C64D6', I.doc],
  privacy: ['#46526A', '<rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>'],
  limits: ['#F0BC33', I.alert],
  feedback: ['#1897D6', '<path d="M4 5.5A1.5 1.5 0 0 1 5.5 4h13A1.5 1.5 0 0 1 20 5.5v9a1.5 1.5 0 0 1-1.5 1.5H10l-4.5 4v-4A1.5 1.5 0 0 1 4 14.5z"/>'],
  off: ['#8B5A3C', I.box],
  premium: ['#D9A21B', '<path d="M5 18h14M5 18l-1.5-9 5 3.5L12 6l3.5 6.5 5-3.5L19 18"/>'],
  notif: ['#E0423A', '<path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>'],
  report: ['#5A6472', '<path d="M5.5 21V4M5.5 4h11l-2.2 4 2.2 4h-11"/>'],
};
const PAGE_TINT = { lang: "#3D84DB", profile: "#E0457B", religion: "#1FA597", appearance: "#E2A812", offline: "#2F6FC0", data: "#71809A", how: "#E2A812", sources: "#4C64D6", limits: "#F0BC33" };

// ---------- briques ----------
function Group({ title, children }) {
  return (
    <View style={{ gap: 8 }}>
      {title ? <Text style={{ fontSize: 14, fontWeight: "700", color: C.muted, paddingHorizontal: 6, textAlign: dir().ta }}>{title}</Text> : null}
      <View style={[{ backgroundColor: C.surface, borderRadius: R.lg, overflow: "hidden" }, lift()]}>{children}</View>
    </View>
  );
}
function MenuRow({ id, title, value, onPress, external, first }) {
  const [color, paths] = SI[id];
  return (
    <Pressable onPress={() => { haptic.tap(); onPress(); }} accessibilityRole={external ? "link" : "button"} accessibilityLabel={value ? `${title}, ${value}` : title}
      style={({ pressed }) => ({ flexDirection: dir().row, alignItems: "center", gap: 14, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: pressed ? C.tint : "transparent", borderTopWidth: first ? 0 : 0.5, borderTopColor: C.line })}>
      <Tile color={color} paths={paths} size={34} />
      <View style={{ flex: 1, gap: 1, paddingVertical: 2 }}>
        <Text style={{ fontSize: 16, fontWeight: "700", color: C.fg, textAlign: dir().ta }}>{title}</Text>
        {value ? <Text numberOfLines={1} style={{ fontSize: 13.5, color: C.muted, textAlign: dir().ta }}>{value}</Text> : null}
      </View>
      {external ? <Text style={{ color: C.faint, fontSize: 16 }}>↗</Text> : <Glyph name="chev" size={17} color={C.faint} />}
    </Pressable>
  );
}
function Block({ title, children, gap = 12 }) {
  return (
    <View style={[{ backgroundColor: C.surface, borderRadius: 22, padding: 18, gap }, lift()]}>
      {title ? <Text accessibilityRole="header" style={{ fontSize: 17, fontWeight: "800", color: C.fg, textAlign: dir().ta }}>{title}</Text> : null}
      {children}
    </View>
  );
}
function Lead({ children }) {
  return <Txt style={{ fontSize: 16, lineHeight: 24, color: C.fg, opacity: 0.85 }}>{children}</Txt>;
}
function Radio({ on }) {
  return <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: on ? C.brand : C.faint, alignItems: "center", justifyContent: "center" }}>{on ? <View style={{ width: 11, height: 11, borderRadius: 6, backgroundColor: C.brand }} /> : null}</View>;
}
function Switch({ on, onPress, label }) {
  return (
    <Pressable onPress={() => { haptic.tap(); onPress(); }} accessibilityRole="switch" accessibilityState={{ checked: on }} accessibilityLabel={label} hitSlop={6}
      style={{ width: 50, height: 30, borderRadius: 15, backgroundColor: on ? "#34C759" : C.tint2, padding: 2, alignItems: on ? "flex-end" : "flex-start", justifyContent: "center" }}>
      <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: "#fff", shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 2 }} />
    </Pressable>
  );
}
function IconList({ items }) {
  return (
    <View>
      {items.map(([color, paths, text], i) => (
        <Row key={i} gap={14} style={{ alignItems: "flex-start", paddingVertical: 12, borderTopWidth: i ? 0.5 : 0, borderTopColor: C.line }}>
          <Tile color={color} paths={paths} size={34} />
          <Txt style={{ flex: 1, fontSize: 15.5, lineHeight: 22, paddingTop: 5 }}>{text}</Txt>
        </Row>
      ))}
    </View>
  );
}

// ---------- pages ----------
function LangPage() {
  const st = getSettings();
  return (
    <Block>
      <View style={{ flexDirection: dir().row, flexWrap: "wrap", gap: 10 }}>
        {LANGS.map((l) => {
          const on = st.lang === l;
          return (
            <Pressable key={l} onPress={() => { haptic.tap(); setSettings({ lang: l }); }} accessibilityRole="radio" accessibilityState={{ checked: on }}
              style={{ flexBasis: "46%", flexGrow: 1, flexDirection: dir().row, alignItems: "center", gap: 12, padding: 14, borderRadius: R.md, borderWidth: 1.5, borderColor: on ? C.brand : C.line, backgroundColor: on ? C.brandSoft : "transparent" }}>
              <View style={{ width: 42, height: 30, borderRadius: 8, overflow: "hidden", borderWidth: 0.5, borderColor: "rgba(0,0,0,0.18)" }}><Art xml={LANG_FLAG[l]} width={42} height={30} /></View>
              <Text style={{ fontWeight: "800", fontSize: 16, color: on ? C.brandDark : C.fg }}>{LANG_NAMES[l]}</Text>
            </Pressable>
          );
        })}
      </View>
    </Block>
  );
}

function ProfilePage() {
  const st = getSettings();
  return (
    <View style={{ gap: 14 }}>
    <Block gap={14}>
      <Lead>{t("settings.profile_p")}</Lead>
      <Text style={{ fontSize: 15, fontWeight: "800", color: C.fg, textAlign: dir().ta }}>{t("settings.diet")}</Text>
      <Segmented items={[[null, t("diet.none")], ...DIETS.map((d) => [d, t(`diet.${d}`)])]} value={st.profile.diet || null} onChange={(d) => { setDiet(d); saved(t("set.diet", { x: t(d ? `diet.${d}` : "diet.none") })); }} />
      <Text style={{ fontSize: 15, fontWeight: "800", color: C.fg, textAlign: dir().ta, marginTop: 4 }}>{t("settings.allergens")}</Text>
      <View style={{ flexDirection: dir().row, flexWrap: "wrap", gap: 8 }}>
        {PROFILE_ALLERGENS.map((a) => {
          const on = st.profile.allergens.includes(a);
          return (
            <Pressable key={a} onPress={() => { const on2 = !st.profile.allergens.includes(a); toggleAllergen(a); saved(t(on2 ? "set.allergen_on" : "set.allergen_off", { x: t(`allergen.${a}`) })); }} accessibilityRole="checkbox" accessibilityState={{ checked: on }}
              style={{ flexDirection: dir().row, alignItems: "center", gap: 7, paddingVertical: 7, paddingHorizontal: 12, paddingStart: 7, borderRadius: 99, borderWidth: 1.5, borderColor: on ? C.brand : C.line, backgroundColor: on ? C.brandSoft : "transparent" }}>
              <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: C.artBg, alignItems: "center", justifyContent: "center" }}><Art xml={ALLERGEN_ART[a]} size={20} /></View>
              <Text style={{ fontWeight: "700", fontSize: 14, color: on ? C.brandDark : C.fg }}>{t(`allergen.${a}`)}</Text>
            </Pressable>
          );
        })}
      </View>
    </Block>
    <FamilyBlock />
    </View>
  );
}

// Profils de la famille (Premium) : un dépliant par personne, avec ses allergies et son régime
function FamilyBlock() {
  const st = getSettings();
  const [name, setName] = useState("");
  const [openId, setOpenId] = useState(null);
  const locked = premiumEnabled() && !isPremium();
  const add = () => {
    if (!canUse("family")) return;
    const id = addMember(name);
    if (id) { haptic.success(); setName(""); setOpenId(id); }
  };
  return (
    <Block gap={12}>
      <Row gap={8} style={{ justifyContent: "space-between" }}>
        <Text style={{ flex: 1, fontSize: 17, fontWeight: "800", color: C.fg, textAlign: dir().ta }}>{t("family.title")}</Text>
        {locked ? <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99, backgroundColor: "#E0457B" }}><Text style={{ color: "#fff", fontWeight: "800", fontSize: 11.5 }}>{t("premium.locked")}</Text></View> : null}
      </Row>
      <Muted style={{ fontSize: 14, lineHeight: 20 }}>{t("family.intro")}</Muted>
      {st.members.map((m) => {
        const sum = [m.diet ? t(`diet.${m.diet}`) : null, ...m.allergens.map((a) => t(`allergen.${a}`))].filter(Boolean).join(" · ") || t("family.none");
        return (
          <View key={m.id} style={{ borderRadius: R.md, borderWidth: 1, borderColor: C.line, padding: 12 }}>
            <Collapse initial={openId === m.id} head={(open) => (
              <View style={{ flexDirection: dir().row, alignItems: "center", gap: 12 }}>
                <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: C.brandSoft, alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ color: C.brandDark, fontWeight: "800", fontSize: 17 }}>{m.name.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1, gap: 1 }}>
                  <Text style={{ fontWeight: "800", fontSize: 15.5, color: C.fg, textAlign: dir().ta }}>{m.name}</Text>
                  <Muted style={{ fontSize: 13 }} numberOfLines={1}>{sum}</Muted>
                </View>
                <Chevron open={open} />
              </View>
            )}>
              <View style={{ gap: 10, paddingTop: 12 }}>
                <Text style={{ fontSize: 13, fontWeight: "800", color: C.muted, textAlign: dir().ta }}>{t("settings.diet")}</Text>
                <Segmented items={[[null, t("diet.none")], ...DIETS.map((d) => [d, t(`diet.${d}`)])]} value={m.diet || null}
                  onChange={(d) => { setMemberDiet(m.id, d); saved(t("set.member", { name: m.name, x: t(d ? `diet.${d}` : "diet.none") })); }} />
                <Text style={{ fontSize: 13, fontWeight: "800", color: C.muted, textAlign: dir().ta }}>{t("settings.allergens")}</Text>
                <View style={{ flexDirection: dir().row, flexWrap: "wrap", gap: 6 }}>
                  {PROFILE_ALLERGENS.map((a) => {
                    const on = m.allergens.includes(a);
                    return (
                      <Pressable key={a} onPress={() => { toggleMemberAllergen(m.id, a); saved(t("set.member", { name: m.name, x: `${on ? "−" : "+"} ${t(`allergen.${a}`)}` })); }} accessibilityRole="checkbox" accessibilityState={{ checked: on }}
                        style={{ paddingVertical: 6, paddingHorizontal: 11, borderRadius: 99, borderWidth: 1.5, borderColor: on ? C.brand : C.line, backgroundColor: on ? C.brandSoft : "transparent" }}>
                        <Text style={{ fontWeight: "700", fontSize: 13.5, color: on ? C.brandDark : C.fg }}>{t(`allergen.${a}`)}</Text>
                      </Pressable>
                    );
                  })}
                </View>
                <Pressable onPress={() => { haptic.tap(); removeMember(m.id); }} accessibilityRole="button" hitSlop={6} style={{ alignSelf: dir().rtl ? "flex-end" : "flex-start", paddingVertical: 6 }}>
                  <Text style={{ color: STATUS_COLORS.haram[0], fontWeight: "700", fontSize: 14 }}>{t("family.remove", { name: m.name })}</Text>
                </Pressable>
              </View>
            </Collapse>
          </View>
        );
      })}
      {st.members.length < 8 ? (
        <View style={{ flexDirection: dir().row, gap: 8 }}>
          <TextInput value={name} onChangeText={setName} onFocus={() => setTimeout(() => pageScroll.current && pageScroll.current.scrollToEnd({ animated: true }), 350)} placeholder={t("family.name_ph")} placeholderTextColor={C.faint} maxLength={24} returnKeyType="done" onSubmitEditing={add}
            style={{ flex: 1, minWidth: 0, width: 10, borderWidth: 1, borderColor: C.line, borderRadius: R.md, paddingHorizontal: 14, paddingVertical: 11, fontSize: 16, color: C.fg, backgroundColor: C.surface, textAlign: dir().ta }} />
          <Pressable onPress={add} disabled={!name.trim()} accessibilityRole="button"
            style={({ pressed }) => ({ paddingHorizontal: 18, justifyContent: "center", borderRadius: R.md, backgroundColor: pressed ? C.brandDark : C.brand, opacity: name.trim() ? 1 : 0.5 })}>
            <Text style={{ color: "#fff", fontWeight: "800", fontSize: 15 }}>{t("family.add")}</Text>
          </Pressable>
        </View>
      ) : null}
    </Block>
  );
}

const DECISION_COLORS = () => ({ permis: SEV_COLORS.info, douteux: SEV_COLORS.mashbouh, interdit: SEV_COLORS.haram });
function ReligionPage() {
  const st = getSettings();
  const base = SCHOOLS[st.school] ? st.school : "standard";
  const ref = { ...SCHOOLS.standard, ...SCHOOLS[base] };
  const modified = TOPICS.filter((tp) => st.topics[tp] !== ref[tp]);
  const schools = [...Object.keys(SCHOOLS), ...(st.school === "custom" ? ["custom"] : [])];
  const distrust = st.distrust || [];
  return (
    <View style={{ gap: 14 }}>
      <Block gap={10}>
        <Lead>{t("settings.school_intro")}</Lead>
        {schools.map((s) => {
          const on = st.school === s;
          return (
            <Pressable key={s} onPress={() => { if (s !== "custom" && !on) { setSchool(s); saved(t("set.school", { x: t(`school.${s}`) })); } }} accessibilityRole="radio" accessibilityState={{ checked: on }}
              style={{ flexDirection: dir().row, alignItems: "center", gap: 12, padding: 14, borderRadius: R.md, borderWidth: 1.5, borderColor: on ? C.brand : C.line, backgroundColor: on ? C.brandSoft : "transparent" }}>
              <Radio on={on} />
              <View style={{ flex: 1, gap: 2 }}>
                <Txt style={{ fontWeight: "800" }}>{t(`school.${s}`)}</Txt>
                <Muted style={{ fontSize: 13.5, lineHeight: 19 }}>{t(`school.${s}.d`)}</Muted>
              </View>
            </Pressable>
          );
        })}
      </Block>
      <Block gap={14}>
        <Collapse head={(open) => (
          <View style={{ flexDirection: dir().row, alignItems: "center", gap: 10 }}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ fontSize: 17, fontWeight: "800", color: C.fg, textAlign: dir().ta }}>{t("settings.topics")}</Text>
              <Muted style={{ fontSize: 13.5 }}>{modified.length ? tn("settings.topics_modified", modified.length, { s: t(`school.${base}`) }) : t("settings.topics_none", { s: t(`school.${base}`) })}</Muted>
            </View>
            <Chevron open={open} />
          </View>
        )}>
        <View style={{ gap: 14, paddingTop: 14 }}>
        {modified.length ? (
          <Pressable onPress={() => { haptic.tap(); setSchool(base); }} accessibilityRole="button" style={{ alignSelf: dir().rtl ? "flex-end" : "flex-start", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 99, backgroundColor: C.tint }}>
            <Text style={{ fontWeight: "800", color: C.fg, fontSize: 13.5 }}>{t("settings.topics_reset", { s: t(`school.${base}`) })}</Text>
          </Pressable>
        ) : null}
        {TOPICS.map((topic) => (
          <View key={topic} style={{ gap: 8 }}>
            <Txt style={{ fontWeight: "700" }}>{t(`topic.${topic}`)}</Txt>
            <View style={{ flexDirection: dir().row, backgroundColor: isDark() ? C.tint : C.tint2, borderRadius: R.md, padding: 4, gap: 4 }}>
              {DECISIONS.map((d) => {
                const on = st.topics[topic] === d;
                const [fg, bg] = DECISION_COLORS()[d] || [C.fg, C.surface];
                return (
                  <Pressable key={d} onPress={() => { if (on) return; setTopic(topic, d); saved(t("set.topic", { x: `${t(`topic.${topic}`)} → ${t(`decision.${d}`).toLowerCase()}` })); }} accessibilityRole="radio" accessibilityState={{ checked: on }}
                    style={{ flex: 1, paddingVertical: 9, borderRadius: R.sm, alignItems: "center", backgroundColor: on ? bg : "transparent", borderWidth: on ? 1.5 : 0, borderColor: fg }}>
                    <Text style={{ fontWeight: "800", fontSize: 14, color: on ? fg : C.muted }}>{t(`decision.${d}`)}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))}
        </View>
        </Collapse>
        <Muted style={{ fontSize: 13, lineHeight: 19 }}>{t("settings.disclaimer")}</Muted>
      </Block>
      <Block title={t("certs.title")} gap={4}>
        <Muted style={{ marginBottom: 6 }}>{t("certs.intro")}</Muted>
        {CERTIFIER_INFO.map((c, i) => (
          <Row key={c.id} gap={12} style={{ alignItems: "flex-start", paddingVertical: 12, borderTopWidth: i ? 0.5 : 0, borderTopColor: C.line }}>
            <View style={{ flex: 1, gap: 3 }}>
              <Row gap={6}><Txt style={{ fontWeight: "800" }}>{c.name}</Txt><Text style={{ fontSize: 11, fontWeight: "800", color: C.muted, backgroundColor: C.tint2, paddingHorizontal: 5, borderRadius: 4 }}>{c.country}</Text></Row>
              <Muted style={{ fontSize: 13.5, lineHeight: 19 }}>{t(`cert.${c.id}.d`)}</Muted>
              {c.site ? <Text onPress={() => open(c.site)} style={{ color: C.brand, fontWeight: "700", fontSize: 13.5, textAlign: dir().ta }}>{t("certs.more")} ↗</Text> : null}
            </View>
            <Switch on={!distrust.includes(c.id)} onPress={() => toggleDistrust(c.id)} label={t("certs.follow", { org: c.name })} />
          </Row>
        ))}
      </Block>
    </View>
  );
}

function AppearancePage() {
  const st = getSettings();
  return (
    <View style={{ gap: 14 }}>
    <Block title={t("settings.theme")}>
      <View style={{ flexDirection: dir().row, gap: 10 }}>
        {["auto", "light", "dark"].map((m) => {
          const on = st.theme === m;
          const previewBg = m === "dark" ? "#141B17" : m === "light" ? "#FFFFFF" : null;
          return (
            <Pressable key={m} onPress={() => { haptic.tap(); setSettings({ theme: m }); }} accessibilityRole="radio" accessibilityState={{ checked: on }}
              style={{ flex: 1, alignItems: "center", gap: 6, padding: 12, borderRadius: R.md, borderWidth: 1.5, borderColor: on ? C.brand : C.line, backgroundColor: on ? C.brandSoft : "transparent" }}>
              <View style={{ width: 54, height: 40, borderRadius: 8, overflow: "hidden", flexDirection: "row", borderWidth: 0.5, borderColor: C.line }}>
                {previewBg ? <View style={{ flex: 1, backgroundColor: previewBg, padding: 5, gap: 3 }}><View style={{ height: 6, borderRadius: 3, backgroundColor: m === "dark" ? "#26302B" : "#EEF1F4" }} /><View style={{ height: 8, borderRadius: 3, backgroundColor: "#1A9C68" }} /></View>
                  : <><View style={{ flex: 1, backgroundColor: "#fff", padding: 5 }}><View style={{ height: 8, borderRadius: 3, backgroundColor: "#1A9C68", marginTop: 9 }} /></View><View style={{ flex: 1, backgroundColor: "#141B17", padding: 5 }}><View style={{ height: 8, borderRadius: 3, backgroundColor: "#1A9C68", marginTop: 9 }} /></View></>}
              </View>
              <Text style={{ fontWeight: "800", fontSize: 14, color: on ? C.brandDark : C.fg }}>{t(`theme.${m}`)}</Text>
              {m === "auto" ? <Text style={{ fontSize: 11, color: C.muted, textAlign: "center" }}>{t("theme.auto_d")}</Text> : null}
            </Pressable>
          );
        })}
      </View>
    </Block>
    <Block title={t("appearance.text_t")} gap={10}>
      <Muted style={{ fontSize: 14, lineHeight: 20 }}>{t("appearance.text_p")}</Muted>
      <View style={{ flexDirection: dir().row, alignItems: "flex-end", gap: 14, padding: 14, borderRadius: R.md, backgroundColor: C.tint }}>
        {[14, 18, 23].map((n) => <Text key={n} style={{ fontSize: n, fontWeight: "800", color: C.fg }}>A</Text>)}
        <Muted style={{ flex: 1, fontSize: 13, lineHeight: 18 }}>{t("settings.text_preview")}</Muted>
      </View>
      {Platform.OS !== "web" ? (
        <Pressable onPress={() => Linking.openSettings().catch(() => {})} accessibilityRole="button" style={{ paddingVertical: 12, borderRadius: 14, alignItems: "center", backgroundColor: C.brandSoft }}>
          <Text style={{ color: C.brandDark, fontWeight: "800" }}>{t("appearance.text_btn")}</Text>
        </Pressable>
      ) : null}
    </Block>
    </View>
  );
}

function OfflinePage() {
  const st = getSettings();
  const [packing, setPacking] = useState(null);
  const [err, setErr] = useState(false);
  const [ranks, setRanks] = useState(null);
  const pack = async () => {
    if (packing !== null || !canUse("offline")) return;
    setErr(false); setPacking(0);
    try {
      const n = await downloadPack((count) => setPacking(count));
      // Les classements aussi, pour les consulter sans réseau
      setRanks([0, 0]);
      const r = await downloadRankings((k, total) => setRanks([k, total])).catch(() => 0);
      haptic.success(); setPacking(null); setRanks(null);
      setSettings({ packAt: Date.now(), packCount: n, packRanks: r });
    } catch { setPacking(null); setRanks(null); setErr(true); }
  };
  return (
    <Block>
      <Lead>{t("settings.offline_p")}</Lead>
      <Pressable onPress={pack} disabled={packing !== null} accessibilityRole="button"
        style={({ pressed }) => ({ paddingVertical: 15, borderRadius: R.md, backgroundColor: pressed ? C.brandDark : C.brand, alignItems: "center", opacity: packing !== null ? 0.6 : 1 })}>
        <Text style={{ color: "#fff", fontWeight: "800", fontSize: 16 }}>{t(st.packAt ? "settings.offline_update" : "settings.offline_btn")}</Text>
      </Pressable>
      {ranks ? <Muted>{t("offline.ranks_progress", { n: ranks[0], t: ranks[1] || "…" })}</Muted>
        : packing !== null ? <Muted>{t("settings.offline_progress", { n: packing })}</Muted>
        : err ? <Muted style={{ color: C.haram }}>{t("settings.offline_error")}</Muted>
        : st.packAt ? <Muted>{t("settings.offline_done", { n: st.packCount, d: new Date(st.packAt).toLocaleDateString(locale(), { day: "numeric", month: "long" }) })}{st.packRanks ? ` ${t("offline.ranks_done", { n: st.packRanks })}` : ""}</Muted> : null}
      <Muted style={{ fontSize: 13, lineHeight: 19 }}>{t("offline.limits")}</Muted>
    </Block>
  );
}

function DataPage({ toast }) {
  const [confirm, setConfirm] = useState(null);
  const all = getHistory();
  const stats = [
    [all.length, "data.history", "#3D84DB", '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>'],
    [all.filter((e) => e.fav).length, "data.favs", "#D9A81E", I.star],
    [getBasket().length, "data.basket", "#E0457B", '<path d="M5 8h14l-1.5 11a1 1 0 0 1-1 .9H7.5a1 1 0 0 1-1-.9z"/><path d="M9 8l3-4 3 4"/>'],
    [localCount(), "data.local", "#8A63DA", '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>'],
  ];
  const act = (what) => {
    if (confirm !== what) { haptic.warn(); return setConfirm(what); }
    setConfirm(null);
    if (what === "history") { clearHistory(); toast && toast(t("data.cleared")); } else { resetSettings(); toast && toast(t("data.reset_done")); }
  };
  return (
    <View style={{ gap: 14 }}>
      <Block>
        <Lead>{t("settings.data_p")}</Lead>
        <View style={{ flexDirection: dir().row, flexWrap: "wrap", justifyContent: "space-between", rowGap: 10 }}>
          {stats.map(([n, k, color, paths]) => (
            <View key={k} style={{ width: "48.5%", padding: 14, borderRadius: 16, backgroundColor: C.tint, gap: 6 }}>
              <Tile color={color} paths={paths} size={30} />
              <Text style={{ fontSize: 26, fontWeight: "800", color: C.fg, textAlign: dir().ta }}>{n}</Text>
              <Muted style={{ fontSize: 13 }}>{t(k)}</Muted>
            </View>
          ))}
        </View>
      </Block>
      <Block title={t("settings.data_clear")} gap={10}>
        {["history", "reset"].map((w) => (
          <Pressable key={w} onPress={() => act(w)} accessibilityRole="button" style={{ paddingVertical: 14, borderRadius: R.md, backgroundColor: STATUS_COLORS.haram[1], alignItems: "center" }}>
            <Text style={{ color: C.haram, fontWeight: "800" }}>{t(confirm === w ? "data.confirm" : w === "history" ? "data.clear_history" : "data.reset")}</Text>
          </Pressable>
        ))}
      </Block>
    </View>
  );
}

// Texte « _html » de la version web : seulement <strong> (gras) et <br>
function Rich({ k, vars, style }) {
  const parts = String(t(k, vars)).replace(/<br\s*\/?>/g, "\n").split(/(<strong>[\s\S]*?<\/strong>)/g);
  return (
    <Text style={[{ fontSize: 14, lineHeight: 20, color: C.muted, textAlign: dir().ta }, style]}>
      {parts.map((x, i) => (/^<strong>/.test(x) ? <Text key={i} style={{ fontWeight: "800", color: C.fg }}>{x.replace(/<\/?strong>/g, "")}</Text> : x.replace(/<[^>]+>/g, "")))}
    </Text>
  );
}
const KIND_ICONS = {
  illegal: '<circle cx="12" cy="12" r="8.5"/><path d="M6 6l12 12"/>',
  cmr: '<circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/>',
  ed: '<path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4a2 2 0 0 0 1.8-3l-5-9V3"/><path d="M7.5 15h9"/>',
  allergen: '<circle cx="12" cy="9" r="4"/><path d="M12 13v8M12 5V3M8 9H6M18 9h-2M9.2 6.2L8 5M14.8 6.2L16 5"/>',
  irritant: '<path d="M12 3l9 16H3z"/><path d="M12 10v4M12 17h.01"/>',
  env: '<path d="M4 14c3-4 6-4 9 0s6 4 7 0"/><path d="M4 19c3-4 6-4 9 0s6 4 7 0"/><path d="M12 9V3M9 6l3-3 3 3"/>',
  contaminant: '<path d="M7 3h10M8 3v5l-3 11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1L16 8V3"/><circle cx="10" cy="15" r="1"/><circle cx="14" cy="13" r="1"/>',
  precaution: '<circle cx="12" cy="12" r="8.5"/><path d="M12 8v5M12 16h.01"/>',
};
const KIND_COL = { illegal: "haram", cmr: "haram", ed: "mashbouh", allergen: "mashbouh", irritant: "mashbouh", env: "halal_certifie", contaminant: "inconnu", precaution: "inconnu" };

function NotesPage() {
  const [tab, setTab] = useState("halal");
  const pts = (label, colors) => (
    <View style={{ minWidth: 62, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 8, backgroundColor: colors ? colors[1] : C.brandSoft, alignItems: "center" }}>
      <Text style={{ fontWeight: "800", color: colors ? colors[0] : C.brandDark, fontSize: 13 }}>{label}</Text>
    </View>
  );
  const pill = (s) => {
    const [fg, bg] = STATUS_COLORS[s];
    return (
      <View style={{ minWidth: 118, flexDirection: dir().row, alignItems: "center", justifyContent: "center", gap: 5, paddingVertical: 5, paddingHorizontal: 8, borderRadius: 99, backgroundColor: bg }}>
        <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: fg }} /><Text style={{ color: fg, fontWeight: "800", fontSize: 12 }}>{S(s, "label")}</Text>
      </View>
    );
  };
  return (
    <View style={{ gap: 14 }}>
      <Row gap={12} style={{ padding: 14, borderRadius: R.lg, backgroundColor: isDark() ? "#173A2B" : "#E3F3EB" }}>
        <Art xml={mascot("teach", { size: 76 })} size={76} />
        <Txt style={{ flex: 1, fontWeight: "700", color: C.brandDark, fontSize: 14.5, lineHeight: 20 }}>{t("notes.mascot")}</Txt>
      </Row>
      <Segmented items={[["halal", t("settings.notes_halal")], ["health", t("settings.notes_health")], ["cosmetic", t("settings.notes_cosmetic")]]} value={tab} onChange={setTab} />
      {tab === "halal" ? (
        <Block title={t("settings.statuses")} gap={12}>
          {["halal_certifie", "halal_probable", "mashbouh", "haram", "inconnu"].map((s) => (
            <Row key={s} gap={12} style={{ alignItems: "flex-start" }}>{pill(s)}<Muted style={{ flex: 1, fontSize: 14, lineHeight: 20 }}>{S(s, "legend")}</Muted></Row>
          ))}
        </Block>
      ) : tab === "health" ? (
        <Block title={t("settings.health")} gap={12}>
          {[["55", "health.rule1_html"], ["25", "health.rule2_html"], ["10", "health.rule4_html"], ["10", "health.rule3_html"]].map(([n, key]) => (
            <Row key={key} gap={12} style={{ alignItems: "flex-start" }}>{pts(t("health.pts", { n }))}<Rich k={key} style={{ flex: 1 }} /></Row>
          ))}
          <Rich k="health.why_html" />
          {HEALTH_GRADES.map((g, i) => (
            <Row key={g.id} gap={10}>
              <View style={{ flexDirection: dir().row, alignItems: "center", gap: 6, minWidth: 108, paddingVertical: 4, paddingHorizontal: 10, borderRadius: 99, backgroundColor: C.tint }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: GRADE_COLORS[g.id] }} /><Text style={{ fontWeight: "800", fontSize: 13, color: C.fg }}>{t(`grade.${g.id}`)}</Text>
              </View>
              <Muted style={{ fontSize: 14 }}>{t("health.range", { a: g.min, b: i === 0 ? 100 : HEALTH_GRADES[i - 1].min - 1 })}</Muted>
            </Row>
          ))}
        </Block>
      ) : (
        <Block title={t("settings.cosmetic")} gap={12}>
          <Muted style={{ fontSize: 14, lineHeight: 20 }}>{t("cosmetic.intro")}</Muted>
          {[["0–24", "cosmetic.rule1_html", "eleve"], ["25–49", "cosmetic.rule2_html", "modere"], ["50–100", "cosmetic.rule3_html", "limite"]].map(([n, key, lv]) => (
            <Row key={key} gap={12} style={{ alignItems: "flex-start" }}>{pts(n, RISK_COLORS[lv])}<Rich k={key} style={{ flex: 1 }} /></Row>
          ))}
          <Rich k="cosmetic.exposure_html" />
          <Text style={{ fontSize: 13, fontWeight: "800", color: C.muted, textTransform: "uppercase", letterSpacing: 0.4, marginTop: 4, textAlign: dir().ta }}>{t("cosmetic.kinds_t")}</Text>
          {Object.entries(KIND_ICONS).map(([k, ico]) => {
            const [fg, bg] = STATUS_COLORS[KIND_COL[k]];
            return (
              <Row key={k} gap={12} style={{ alignItems: "flex-start" }}>
                <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: bg, alignItems: "center", justifyContent: "center" }}><Glyph paths={ico} size={18} color={fg} /></View>
                <View style={{ flex: 1 }}><Txt style={{ fontWeight: "800", fontSize: 14.5 }}>{t(`cosm.kind.${k}`)}</Txt><Muted style={{ fontSize: 13, lineHeight: 18 }}>{t(`cosm.kind.${k}.d`)}</Muted></View>
              </Row>
            );
          })}
          <Rich k="cosmetic.why_html" />
          <Muted style={{ fontSize: 13, lineHeight: 18 }}>{t("cosmetic.note")}</Muted>
        </Block>
      )}
    </View>
  );
}

function HowPage({ onTour }) {
  return (
    <View style={{ gap: 14 }}>
      {onTour ? (
        <Pressable onPress={onTour} accessibilityRole="button"
          style={({ pressed }) => [{ flexDirection: dir().row, alignItems: "center", gap: 14, padding: 14, borderRadius: R.lg, backgroundColor: pressed ? C.tint : C.surface }, lift()]}>
          <Tile color="#1A9C68" paths='<path d="M9 7.5l8 4.5-8 4.5z"/>' size={42} />
          <View style={{ flex: 1, gap: 2 }}>
            <Txt style={{ fontWeight: "800" }}>{t("tour.replay")}</Txt>
            <Muted style={{ fontSize: 14, lineHeight: 19 }}>{t("tour.replay_p")}</Muted>
          </View>
          <Glyph name="chev" size={17} color={C.faint} />
        </Pressable>
      ) : null}
      <Block title={t("why.t")}>
        <View style={{ borderRadius: 20, padding: 20, paddingTop: 26, backgroundColor: isDark() ? "#173A2B" : "#E3F3EB" }}>
          <Text style={{ position: "absolute", top: -6, [dir().rtl ? "right" : "left"]: 14, fontSize: 64, fontWeight: "800", color: C.brand, opacity: 0.5 }}>“</Text>
          <Txt style={{ fontSize: 17, lineHeight: 26, fontWeight: "500" }}>{t("why.quote")}</Txt>
          <Text style={{ marginTop: 8, fontSize: 13, fontWeight: "700", color: C.brandDark, textAlign: dir().ta }}>{t("why.cite")}</Text>
        </View>
        <Muted>{t("why.p")}</Muted>
      </Block>
      <Block gap={10}>
        {[1, 2, 3].map((i) => (
          <Row key={i} gap={14} style={{ alignItems: "flex-start", padding: 14, borderRadius: 18, backgroundColor: C.tint }}>
            <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: "#1A9C68", alignItems: "center", justifyContent: "center" }}><Text style={{ color: "#fff", fontWeight: "800" }}>{i}</Text></View>
            <View style={{ flex: 1, gap: 2 }}>
              <Txt style={{ fontWeight: "800" }}>{t(`how.${i}.t`)}</Txt>
              <Muted style={{ fontSize: 14.5, lineHeight: 21 }}>{t(`how.${i}.p`)}</Muted>
            </View>
          </Row>
        ))}
      </Block>
    </View>
  );
}

function NotifPage() {
  const st = getSettings();
  const [granted, setGranted] = useState(null);
  const [hits, setHits] = useState(null);
  useEffect(() => { if (Platform.OS !== "web") notificationsGranted().then(setGranted); }, []);
  const toggle = async (v) => {
    setSettings({ notif: v });
    if (v && !granted) setGranted(await askNotifications({ force: true }));
  };
  return (
    <View style={{ gap: 14 }}>
      <Block title={t("notif.t")}>
        <Muted>{t("notif.p")}</Muted>
        <Row gap={12} style={{ paddingVertical: 6 }}>
          <Txt style={{ flex: 1, fontWeight: "700" }}>{t("notif.switch")}</Txt>
          <Switch on={!!st.notif && granted !== false} onPress={() => toggle(!(st.notif && granted !== false))} label={t("notif.switch")} />
        </Row>
        {st.notif && granted === false ? (
          <View style={{ gap: 8, padding: 12, borderRadius: R.md, backgroundColor: STATUS_COLORS.mashbouh[1] }}>
            <Txt style={{ color: STATUS_COLORS.mashbouh[0], fontWeight: "700", fontSize: 14.5 }}>{t("notif.denied")}</Txt>
            <Pressable onPress={() => Linking.openSettings().catch(() => {})} accessibilityRole="button">
              <Text style={{ color: STATUS_COLORS.mashbouh[0], fontWeight: "800", textAlign: dir().ta }}>{t("cam.open_settings")} ↗</Text>
            </Pressable>
          </View>
        ) : null}
        <Muted style={{ fontSize: 13 }}>{t("notif.when")}</Muted>
      </Block>
      <Block>
        <Pressable onPress={async () => { haptic.tap(); setHits(await checkRecalls({ force: true })); }} accessibilityRole="button"
          style={({ pressed }) => ({ paddingVertical: 13, borderRadius: 14, alignItems: "center", backgroundColor: pressed ? C.tint2 : C.tint })}>
          <Text style={{ fontWeight: "800", color: C.fg, fontSize: 15 }}>{t("notif.check")}</Text>
        </Pressable>
        {hits ? <Txt style={{ fontWeight: "700", color: hits.length ? STATUS_COLORS.haram[0] : C.brand }}>{hits.length ? tn("recall.home", hits.length) : t("notif.none")}</Txt> : null}
      </Block>
    </View>
  );
}

// Nos sources : des cartes par thème. Pas de logos officiels (ce serait laisser croire à un partenariat) :
// un sigle sur une pastille dont la couleur et le pictogramme disent le type de source.
const SRC_THEMES = ["halal", "food", "cosm", "data"];
const SRC_COSM = new Set(["sccs", "echa", "ansm", "eu_cosmetics", "cir", "essca", "ema", "cosmetics_europe", "afssaps_baby", "fr_pfas"]);
const srcTheme = (src) => (src.group === "halal" || /_list$/.test(src.id) ? "halal" : src.group === "data" ? "data" : SRC_COSM.has(src.id) ? "cosm" : "food");
const SRC_THEME = { halal: ["#1A9C68", I.shield], food: ["#D9822B", I.flask], cosm: ["#B4589C", '<path d="M9 3h6v4H9z"/><path d="M8 7h8l1 4v9a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1v-9z"/><path d="M10 14h4"/>'], data: ["#2F7FC1", I.box] };
const SRC_KIND = {
  database: ["#2F7FC1", '<ellipse cx="12" cy="6" rx="7" ry="3"/><path d="M5 6v12c0 1.7 3.1 3 7 3s7-1.3 7-3V6M5 12c0 1.7 3.1 3 7 3s7-1.3 7-3"/>'],
  agency: ["#1E8F5A", '<path d="M3 21h18M5 21V10M19 21V10M9 21v-7M15 21v-7M3 10l9-6 9 6z"/>'],
  law: ["#5B6B86", '<path d="M12 4v16M5 20h14M6 8h12M6 8l-3 6a3 3 0 0 0 6 0zM18 8l-3 6a3 3 0 0 0 6 0z"/>'],
  study: ["#7A5BC2", '<path d="M4 20V10M10 20V4M16 20v-8M22 20H2"/>'],
  text: ["#B8892A", '<path d="M4 5c3-1 6-1 8 1 2-2 5-2 8-1v14c-3-1-6-1-8 1-2-2-5-2-8-1z"/><path d="M12 6v14"/>'],
  fatwa: ["#14857A", '<path d="M12 3a6 6 0 0 0 0 12 5 5 0 0 1 0-10"/><path d="M5 21h14M7 21v-4h10v4"/>'],
};
const SRC_SHORT = { off: "OFF", obf: "OBF", cosing: "CosIng", bdpm: "BDPM", rappelconso: "Rappel", osm: "OSM", avs_list: "AVS", achahada_list: "Achahada", hmc_list: "HMC",
  efsa: "EFSA", anses: "ANSES", iarc: "CIRC", jecfa: "JECFA", eu_additives: "1333", eu_labelling: "1169", fda: "FDA", nutriscore: "Nutri", fsa: "FSA", nova: "NOVA", nutrinet: "NutriNet",
  sccs: "SCCS", echa: "ECHA", ansm: "ANSM", eu_cosmetics: "1223", cir: "CIR", essca: "ESSCA", ema: "EMA", cosmetics_europe: "CE", afssaps_baby: "ANSM", fr_pfas: "PFAS",
  quran: "قرآن", iifa: "IIFA", ecfr: "ECFR", diyanet: "Diyanet", daralifta: "Ifta", muftiwp: "Mufti", mui: "MUI" };
let srcUses = null;
function sourceUses() {
  if (srcUses) return srcUses;
  srcUses = new Map();
  const add = (ids) => (ids || []).forEach((id) => srcUses.set(id, (srcUses.get(id) || 0) + 1));
  Object.values(FLAG_SOURCES).forEach(add);
  Object.values(RISK_SOURCES).forEach(add);
  (COSMETIC_RULES || []).forEach((r) => add(r.sources));
  return srcUses;
}

function SrcCard({ src }) {
  const [kc, kIco] = SRC_KIND[src.kind] || SRC_KIND.database;
  const short = SRC_SHORT[src.id] || src.name.split(" ")[0];
  const n = sourceUses().get(src.id) || 0;
  return (
    <Pressable onPress={() => open(src.url)} accessibilityRole="link" accessibilityLabel={src.name}
      style={({ pressed }) => [{ width: "48.5%", padding: 12, gap: 4, borderRadius: R.lg, backgroundColor: pressed ? C.tint : C.surface, borderWidth: 0.5, borderColor: C.line }]}>
      <View style={{ alignSelf: dir().rtl ? "flex-end" : "flex-start", minWidth: 56, height: 44, paddingHorizontal: 10, marginBottom: 4, borderRadius: 13, backgroundColor: kc, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ color: "#fff", fontWeight: "800", fontSize: short.length > 5 ? 12.5 : 15 }}>{short}</Text>
        <View style={{ position: "absolute", bottom: -5, [dir().rtl ? "left" : "right"]: -5, width: 20, height: 20, borderRadius: 10, backgroundColor: C.surface, alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: kc }}>
          <Glyph paths={kIco} size={11} color={kc} width={2.2} />
        </View>
      </View>
      <Text numberOfLines={3} style={{ fontSize: 14, fontWeight: "800", color: C.fg, lineHeight: 18, textAlign: dir().ta }}>{src.name}</Text>
      <Text style={{ fontSize: 11.5, fontWeight: "800", color: kc, textAlign: dir().ta }}>{t(`sources.k1.${src.kind}`)}</Text>
      <Muted numberOfLines={4} style={{ fontSize: 12, lineHeight: 16 }}>{t(`src.${src.id}`)}</Muted>
      <View style={{ flexDirection: dir().row, justifyContent: "space-between", alignItems: "center", marginTop: "auto", paddingTop: 4 }}>
        {n ? (
          <View style={{ flexDirection: dir().row, alignItems: "center", gap: 3, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 99, backgroundColor: C.brandSoft }}>
            <Glyph name="check" size={11} color={C.brandDark} width={2.6} /><Text style={{ fontSize: 11, fontWeight: "800", color: C.brandDark }}>{tn("sources.uses", n)}</Text>
          </View>
        ) : <View />}
        <Text style={{ color: C.faint }}>↗</Text>
      </View>
    </Pressable>
  );
}

function SourcesPage() {
  const [f, setF] = useState("all");
  const count = (th) => SOURCES.filter((src) => th === "all" || srcTheme(src) === th).length;
  const themes = f === "all" ? SRC_THEMES : [f];
  return (
    <View style={{ gap: 14 }}>
      <Block gap={12}>
        <Lead>{t("sources.intro")}</Lead>
        <View style={{ flexDirection: dir().row, gap: 8 }}>
          {SRC_THEMES.map((th) => (
            <Pressable key={th} onPress={() => { haptic.tap(); setF(f === th ? "all" : th); }} accessibilityRole="button" accessibilityState={{ selected: f === th }}
              style={{ flex: 1, alignItems: "center", gap: 3, paddingVertical: 10, borderRadius: R.md, backgroundColor: f === th ? SRC_THEME[th][0] + "22" : C.tint }}>
              <Tile color={SRC_THEME[th][0]} paths={SRC_THEME[th][1]} size={30} />
              <Text style={{ fontSize: 19, fontWeight: "800", color: C.fg }}>{count(th)}</Text>
              <Text numberOfLines={1} style={{ fontSize: 11, color: C.muted, fontWeight: "600" }}>{t(`sources.t.${th}`)}</Text>
            </Pressable>
          ))}
        </View>
      </Block>
      <ChipRow>
        {["all", ...SRC_THEMES].map((th) => <Chip key={th} text={th === "all" ? t("sources.all") : t(`sources.t.${th}`)} n={count(th)} on={f === th} onPress={() => setF(th)} />)}
      </ChipRow>
      {themes.map((th) => (
        <View key={th} style={{ gap: 10 }}>
          <Row gap={10}>
            <Tile color={SRC_THEME[th][0]} paths={SRC_THEME[th][1]} size={34} />
            <View style={{ flex: 1 }}>
              <Txt style={{ fontWeight: "800", fontSize: 16 }}>{t(`sources.t.${th}`)}</Txt>
              <Muted style={{ fontSize: 13, lineHeight: 18 }}>{t(`sources.td.${th}`)}</Muted>
            </View>
          </Row>
          <View style={{ flexDirection: dir().row, flexWrap: "wrap", justifyContent: "space-between", rowGap: 10 }}>
            {SOURCES.filter((src) => srcTheme(src) === th).map((src) => <SrcCard key={src.id} src={src} />)}
          </View>
        </View>
      ))}
      <Row gap={10} style={{ padding: 14, borderRadius: R.lg, backgroundColor: C.tint, alignItems: "flex-start" }}>
        <Glyph name="bulb" size={18} color="#D9A81E" />
        <Muted style={{ flex: 1, fontSize: 13.5, lineHeight: 19 }}>{t("sources.how")}</Muted>
      </Row>
    </View>
  );
}

function PrivacyPage() {
  const items = [
    ["#4C64D6", '<circle cx="12" cy="8" r="3.6"/><path d="M5 20c1-3.8 3.8-5.6 7-5.6s6 1.8 7 5.6"/><path d="M4 4l16 16"/>', "privacy.1"],
    ["#1FA597", '<rect x="7" y="3" width="10" height="18" rx="2.4"/><path d="M10.5 18h3"/>', "privacy.2"],
    ["#3D84DB", '<path d="M4 6v12M7 6v12M10 6v12M14 6v12M17 6v12M20 6v12"/>', "privacy.3"],
    ["#8A63DA", '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.4"/>', "privacy.4"],
    ["#2F6FC0", '<path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.4"/>', "privacy.5"],
    ["#D9A81E", '<path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>', "privacy.6"],
    ["#E0457B", '<path d="M5 18h14M5 18l-1.5-9 5 3.5L12 6l3.5 6.5 5-3.5L19 18"/>', "privacy.7app"],
  ].map(([c, pth, k]) => [c, pth, t(k)]);
  return (
    <View style={{ gap: 14 }}>
      <View style={{ alignItems: "center", gap: 8, padding: 22, borderRadius: 22, backgroundColor: isDark() ? "#173A2B" : "#E3F3EB" }}>
        <Tile color="#1A9C68" paths={I.shield} size={64} />
        <Text style={{ fontSize: 19, fontWeight: "800", color: C.brandDark, textAlign: "center" }}>{t("privacy.t")}</Text>
        <Text style={{ fontSize: 14.5, lineHeight: 21, color: C.fg, textAlign: "center" }}>{t("privacy.p")}</Text>
      </View>
      <View style={{ flexDirection: dir().row, gap: 10 }}>
        {["pv.b1", "pv.b2", "pv.b3"].map((k) => (
          <View key={k} style={[{ flex: 1, alignItems: "center", paddingVertical: 12, borderRadius: 18, backgroundColor: C.surface }, lift()]}>
            <Text style={{ fontSize: 26, fontWeight: "800", color: C.brand }}>0</Text>
            <Text style={{ fontSize: 13, fontWeight: "600", color: C.muted }}>{t(k)}</Text>
          </View>
        ))}
      </View>
      <Block><IconList items={items} /></Block>
    </View>
  );
}

function LimitsPage() {
  return (
    <Block>
      <IconList items={[
        ["#3D84DB", '<circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.4"/><path d="M3.5 19c.8-3.4 3-5 5.5-5s4.7 1.6 5.5 5M14.5 14.6c2.6-.6 5 .8 6 4.4"/>', t("limits.1")],
        ["#1FA597", '<circle cx="12" cy="9" r="5.5"/><path d="M9.5 9l1.8 1.8 3.2-3.4M8.5 13.8L7 21l5-2.5 5 2.5-1.5-7.2"/>', t("limits.2")],
        ["#8A63DA", '<path d="M9 3h6M10 3v6.2L4.8 18a2 2 0 0 0 1.7 3h11a2 2 0 0 0 1.7-3L14 9.2V3"/><path d="M7.5 15h9"/>', t("limits.3")],
      ]} />
    </Block>
  );
}

const PAGES = { notif: NotifPage, lang: LangPage, profile: ProfilePage, religion: ReligionPage, appearance: AppearancePage, offline: OfflinePage, data: DataPage, notes: NotesPage, how: HowPage, sources: SourcesPage, privacy: PrivacyPage, limits: LimitsPage };

// Dernière demande d'ouverture d'une page déjà traitée (sinon l'onglet rouvrirait la page à chaque visite)
let handledFocus = 0;
export default function SettingsScreen({ focus, toast, onTour, onPremium }) {
  say = toast;
  const insets = useSafeAreaInsets();
  const [page, setPage] = useState(null);
  const st = getSettings();

  // « Mon réglage » de l'accueil, ou alerte d'une fiche : on ouvre directement la bonne page
  useEffect(() => {
    if (focus && focus.n > handledFocus) { handledFocus = focus.n; setPage(focus.target === "profile" ? "profile" : "religion"); }
  }, [focus && focus.n]);
  useEffect(() => {
    if (!page) return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => { setPage(null); return true; });
    return () => sub.remove();
  }, [page]);
  if (typeof window !== "undefined" && window.__bayyin) window.__bayyin.settingsPage = setPage; // captures automatiques (web)
  // Page qui arrive en glissant depuis le bord ; retour par glissement du doigt depuis le bord
  const swipe = useEdgeSwipe(() => setPage(null), !!page);
  const slide = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    slide.setValue(ms(1) ? 0 : 1);
    Animated.timing(slide, { toValue: 1, duration: ms(260), easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [page]);
  const side = dir().rtl ? -1 : 1;
  const slideStyle = { flex: 1, opacity: slide, transform: [{ translateX: Animated.add(slide.interpolate({ inputRange: [0, 1], outputRange: [side * (page ? 34 : -34), 0] }), swipe.dx) }] };

  const scroll = { paddingHorizontal: 20, paddingTop: insets.top + 12, paddingBottom: insets.bottom + 120, gap: 16 };
  if (page) {
    const P = PAGES[page];
    return (
      <Animated.View {...swipe.panHandlers} style={[slideStyle, { backgroundColor: C.bg }]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView key={page} ref={pageScroll} style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={scroll} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
        <Row gap={6}>
          <Pressable onPress={() => setPage(null)} hitSlop={10} accessibilityRole="button" accessibilityLabel={t("sheet.back")} style={{ padding: 4, transform: [{ scaleX: dir().rtl ? -1 : 1 }] }}>
            <Glyph paths='<path d="M15 5l-7 7 7 7"/>' size={24} color={C.fg} width={2.2} />
          </Pressable>
          <Text accessibilityRole="header" style={{ fontSize: 24, fontWeight: "800", letterSpacing: -0.4, color: C.fg }}>{t(`settings.menu.${page}`)}</Text>
        </Row>
        {PAGE_ART[page] ? (
          <View style={{ borderRadius: 22, overflow: "hidden", paddingHorizontal: 8, paddingVertical: 4, backgroundColor: (PAGE_TINT[page] || "#1A9C68") + (isDark() ? "2E" : "22"), borderWidth: 0.5, borderColor: (PAGE_TINT[page] || "#1A9C68") + "33" }}>
            <Art xml={PAGE_ART[page]} width="100%" height={150} />
          </View>
        ) : null}
        <P toast={toast} onTour={onTour} />
      </ScrollView>
      </KeyboardAvoidingView>
      </Animated.View>
    );
  }

  const profText = [st.profile.diet ? t(`diet.${st.profile.diet}`) : null, st.profile.allergens.length ? tn("settings.allergy_count", st.profile.allergens.length) : null].filter(Boolean).join(" · ") || t("settings.profile_none");
  const offText = st.packAt ? t("settings.offline_ready", { n: st.packCount }) : t("settings.offline_not");
  const version = (Constants.expoConfig && Constants.expoConfig.version) || "";
  const go = (id) => () => setPage(id);
  return (
    <Animated.View style={slideStyle}>
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={scroll}>
      <PageHead title={t("settings.title")} />
      <View style={[{ backgroundColor: C.surface, borderRadius: R.lg, padding: 14, gap: 8 }, lift()]}>
        <Text style={{ fontSize: 13.5, fontWeight: "700", color: C.muted, textAlign: dir().ta }}>{t("settings.summary_t")}</Text>
        {[["summary_school", t(`school.${st.school}`), "religion"], ["summary_profile", profText, "profile"], ["summary_offline", offText, "offline"]].map(([k, v, pg]) => (
          <Pressable key={k} onPress={go(pg)} style={{ flexDirection: dir().row, justifyContent: "space-between", alignItems: "center", gap: 10, paddingVertical: 10, paddingHorizontal: 12, borderRadius: R.sm, backgroundColor: C.tint }}>
            <Text style={{ fontSize: 13, color: C.muted }}>{t(`settings.${k}`)}</Text>
            <Text numberOfLines={1} style={{ flexShrink: 1, fontSize: 14, fontWeight: "800", color: C.brandDark }}>{v}</Text>
          </Pressable>
        ))}
      </View>
      {/* Bayyin Premium : toujours visible ; « bientôt disponible » tant que l'achat n'est pas ouvert */}
      {onPremium ? (
        <Group>
          <MenuRow id="premium" first title={t("premium.card_t")} value={!premiumEnabled() ? t("premium.soon") : isPremium() ? t("premium.active_t") : t("premium.card_p")} onPress={onPremium} />
        </Group>
      ) : null}
      <Group title={t("settings.g_prefs")}>
        <MenuRow id="lang" first title={t("settings.menu.lang")} value={LANG_NAMES[st.lang]} onPress={go("lang")} />
        <MenuRow id="profile" title={t("settings.menu.profile")} value={profText} onPress={go("profile")} />
        <MenuRow id="religion" title={t("settings.menu.religion")} value={t(`school.${st.school}`)} onPress={go("religion")} />
        <MenuRow id="appearance" title={t("settings.menu.appearance")} value={t(`theme.${st.theme}`)} onPress={go("appearance")} />
      </Group>
      <Group title={t("settings.g_data")}>
        <MenuRow id="offline" first title={t("settings.menu.offline")} value={offText} onPress={go("offline")} />
        <MenuRow id="notif" title={t("settings.menu.notif")} value={t(st.notif ? "notif.on" : "notif.off")} onPress={go("notif")} />
        <MenuRow id="data" title={t("settings.menu.data")} value={tn("settings.data_count", getHistory().length)} onPress={go("data")} />
      </Group>
      <Group title={t("settings.g_about")}>
        {["notes", "how", "sources", "privacy", "limits"].map((id, i) => <MenuRow key={id} id={id} first={i === 0} title={t(`settings.menu.${id}`)} onPress={go(id)} />)}
      </Group>
      <Group title={t("settings.g_links")}>
        {CONTACT_EMAIL ? <MenuRow id="feedback" first external title={t("fb.title")} value={t("fb.row")} onPress={() => open(mailto(`Bayyin · ${t("fb.title")}`))} /> : null}
        <MenuRow id="off" first={!CONTACT_EMAIL} external title={t("link.off.t")} value={t("link.off.d")} onPress={() => open("https://fr.openfoodfacts.org")} />
        {CONTACT_EMAIL ? <MenuRow id="report" external title={t("link.report.t")} value={t("link.report.d")} onPress={() => open(mailto("Bayyin"))} /> : null}
      </Group>
      <Muted style={{ fontSize: 12, lineHeight: 18, textAlign: "center" }}>{t("fine.data")} Open Food Facts ({t("fine.license")}) · Bayyin {version}</Muted>
    </ScrollView>
    </Animated.View>
  );
}
