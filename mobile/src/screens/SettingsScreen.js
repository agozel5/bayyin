// Réglages : un menu en tuiles colorées (comme iOS), puis une page par rubrique avec son illustration.
// Même organisation que la version web.
import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable, Linking, BackHandler, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Constants from "expo-constants";
import { Txt, Muted, Row } from "../components/ui";
import { PageHead, Segmented } from "../components/Controls";
import { Tile, Art, Glyph } from "../components/Art";
import { Pill2 } from "../components/SheetParts";
import { C, R, STATUS_COLORS, GRADE_COLORS, SEV_COLORS, VERDICT, dir, lift, isDark } from "../theme";
import { t, tn, tPlain, locale, LANGS } from "../i18n";
import { SCHOOLS, TOPICS, DECISIONS, SOURCES, LANG_NAMES, HEALTH_GRADES, PROFILE_ALLERGENS, DIETS } from "../core";
import { getSettings, setSettings, setSchool, setTopic, toggleAllergen, setDiet, toggleDistrust, resetSettings, getHistory, clearHistory } from "../storage";
import { downloadPack } from "../api";
import { askNotifications, notificationsGranted, checkRecalls } from "../recalls";
import { premiumEnabled, isPremium, canUse } from "../premium";
import { S } from "../view";
import { haptic } from "../motion";
import { PAGE_ART } from "../../../public/lib/page-art.js";
import { ALLERGEN_ART, LANG_FLAG } from "../../../public/lib/rank-art.js";
import { CERTIFIER_INFO } from "../../../public/lib/certifiers.js";
import { I } from "../../../public/lib/icons.js";

const open = (url) => Linking.openURL(url).catch(() => {});
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
    <Block gap={14}>
      <Lead>{t("settings.profile_p")}</Lead>
      <Text style={{ fontSize: 15, fontWeight: "800", color: C.fg, textAlign: dir().ta }}>{t("settings.diet")}</Text>
      <Segmented items={[[null, t("diet.none")], ...DIETS.map((d) => [d, t(`diet.${d}`)])]} value={st.profile.diet || null} onChange={(d) => setDiet(d)} />
      <Text style={{ fontSize: 15, fontWeight: "800", color: C.fg, textAlign: dir().ta, marginTop: 4 }}>{t("settings.allergens")}</Text>
      <View style={{ flexDirection: dir().row, flexWrap: "wrap", gap: 8 }}>
        {PROFILE_ALLERGENS.map((a) => {
          const on = st.profile.allergens.includes(a);
          return (
            <Pressable key={a} onPress={() => { haptic.tap(); toggleAllergen(a); }} accessibilityRole="checkbox" accessibilityState={{ checked: on }}
              style={{ flexDirection: dir().row, alignItems: "center", gap: 7, paddingVertical: 7, paddingHorizontal: 12, paddingStart: 7, borderRadius: 99, borderWidth: 1.5, borderColor: on ? C.brand : C.line, backgroundColor: on ? C.brandSoft : "transparent" }}>
              <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: C.artBg, alignItems: "center", justifyContent: "center" }}><Art xml={ALLERGEN_ART[a]} size={20} /></View>
              <Text style={{ fontWeight: "700", fontSize: 14, color: on ? C.brandDark : C.fg }}>{t(`allergen.${a}`)}</Text>
            </Pressable>
          );
        })}
      </View>
    </Block>
  );
}

const DECISION_COLORS = () => ({ permis: SEV_COLORS.info, douteux: SEV_COLORS.mashbouh, interdit: SEV_COLORS.haram });
function ReligionPage() {
  const st = getSettings();
  const schools = [...Object.keys(SCHOOLS), ...(st.school === "custom" ? ["custom"] : [])];
  const distrust = st.distrust || [];
  return (
    <View style={{ gap: 14 }}>
      <Block gap={10}>
        <Lead>{t("settings.school_intro")}</Lead>
        {schools.map((s) => {
          const on = st.school === s;
          return (
            <Pressable key={s} onPress={() => { if (s !== "custom") { haptic.tap(); setSchool(s); } }} accessibilityRole="radio" accessibilityState={{ checked: on }}
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
      <Block title={t("settings.topics")} gap={14}>
        {TOPICS.map((topic) => (
          <View key={topic} style={{ gap: 8 }}>
            <Txt style={{ fontWeight: "700" }}>{t(`topic.${topic}`)}</Txt>
            <View style={{ flexDirection: dir().row, backgroundColor: isDark() ? C.tint : C.tint2, borderRadius: R.md, padding: 4, gap: 4 }}>
              {DECISIONS.map((d) => {
                const on = st.topics[topic] === d;
                const [fg, bg] = DECISION_COLORS()[d] || [C.fg, C.surface];
                return (
                  <Pressable key={d} onPress={() => { haptic.tap(); setTopic(topic, d); }} accessibilityRole="radio" accessibilityState={{ checked: on }}
                    style={{ flex: 1, paddingVertical: 9, borderRadius: R.sm, alignItems: "center", backgroundColor: on ? bg : "transparent", borderWidth: on ? 1.5 : 0, borderColor: fg }}>
                    <Text style={{ fontWeight: "800", fontSize: 14, color: on ? fg : C.muted }}>{t(`decision.${d}`)}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))}
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
  );
}

function OfflinePage() {
  const st = getSettings();
  const [packing, setPacking] = useState(null);
  const [err, setErr] = useState(false);
  const pack = async () => {
    if (packing !== null || !canUse("offline")) return;
    setErr(false); setPacking(0);
    try {
      const n = await downloadPack((count) => setPacking(count));
      haptic.success(); setPacking(null);
      setSettings({ packAt: Date.now(), packCount: n });
    } catch { setPacking(null); setErr(true); }
  };
  return (
    <Block>
      <Lead>{t("settings.offline_p")}</Lead>
      <Pressable onPress={pack} disabled={packing !== null} accessibilityRole="button"
        style={({ pressed }) => ({ paddingVertical: 15, borderRadius: R.md, backgroundColor: pressed ? C.brandDark : C.brand, alignItems: "center", opacity: packing !== null ? 0.6 : 1 })}>
        <Text style={{ color: "#fff", fontWeight: "800", fontSize: 16 }}>{t(st.packAt ? "settings.offline_update" : "settings.offline_btn")}</Text>
      </Pressable>
      {packing !== null ? <Muted>{t("settings.offline_progress", { n: packing })}</Muted>
        : err ? <Muted style={{ color: C.haram }}>{t("settings.offline_error")}</Muted>
        : st.packAt ? <Muted>{t("settings.offline_done", { n: st.packCount, d: new Date(st.packAt).toLocaleDateString(locale(), { day: "numeric", month: "long" }) })}</Muted> : null}
    </Block>
  );
}

function DataPage({ toast }) {
  const [confirm, setConfirm] = useState(null);
  const all = getHistory();
  const stats = [
    [all.length, "data.history", "#3D84DB", '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>'],
    [all.filter((e) => e.fav).length, "data.favs", "#D9A81E", I.star],
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
        <View style={{ flexDirection: dir().row, gap: 10 }}>
          {stats.map(([n, k, color, paths]) => (
            <View key={k} style={{ flex: 1, padding: 14, borderRadius: 16, backgroundColor: C.tint, gap: 6 }}>
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

function NotesPage() {
  return (
    <View style={{ gap: 14 }}>
      <Block title={t("settings.statuses")} gap={12}>
        {["halal_certifie", "halal_probable", "mashbouh", "haram", "inconnu"].map((s) => (
          <Row key={s} gap={12} style={{ alignItems: "flex-start" }}>
            <View style={{ minWidth: 112, paddingVertical: 5, paddingHorizontal: 8, borderRadius: 99, backgroundColor: VERDICT[s], alignItems: "center" }}><Text style={{ color: "#fff", fontWeight: "800", fontSize: 12 }}>{S(s, "label")}</Text></View>
            <Muted style={{ flex: 1, fontSize: 14, lineHeight: 20 }}>{S(s, "legend")}</Muted>
          </Row>
        ))}
      </Block>
      <Block title={t("settings.health")} gap={12}>
        {[["60", "health.rule1_html"], ["30", "health.rule2_html"], ["10", "health.rule3_html"]].map(([pts, key]) => (
          <Row key={key} gap={12} style={{ alignItems: "flex-start" }}>
            <View style={{ minWidth: 58, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 8, backgroundColor: C.brandSoft, alignItems: "center" }}><Text style={{ fontWeight: "800", color: C.brandDark, fontSize: 13 }}>{t("health.pts", { n: pts })}</Text></View>
            <Muted style={{ flex: 1, fontSize: 14, lineHeight: 20 }}>{tPlain(key)}</Muted>
          </Row>
        ))}
        {HEALTH_GRADES.map((g, i) => (
          <Row key={g.id} gap={10}>
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: GRADE_COLORS[g.id] }} />
            <Txt style={{ fontWeight: "700", fontSize: 15 }}>{t(`grade.${g.id}`)}</Txt>
            <Muted style={{ fontSize: 14 }}>{t("health.range", { a: g.min, b: i === 0 ? 100 : HEALTH_GRADES[i - 1].min - 1 })}</Muted>
          </Row>
        ))}
      </Block>
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

function SourcesPage() {
  return (
    <Block gap={6}>
      <Lead>{t("sources.intro")}</Lead>
      {["data", "health", "halal"].map((g) => (
        <View key={g} style={{ gap: 2, marginTop: 10 }}>
          <Text style={{ fontSize: 14, fontWeight: "800", color: C.muted, textAlign: dir().ta }}>{t(`sources.g.${g}`)}</Text>
          {SOURCES.filter((src) => src.group === g).map((src, i) => (
            <Pressable key={src.id} onPress={() => open(src.url)} accessibilityRole="link"
              style={{ flexDirection: dir().row, alignItems: "center", gap: 10, paddingVertical: 11, borderTopWidth: i ? 0.5 : 0, borderTopColor: C.line }}>
              <View style={{ flex: 1, gap: 2 }}>
                <Txt style={{ fontWeight: "700", fontSize: 15 }}>{src.name}</Txt>
                <Muted style={{ fontSize: 13, lineHeight: 18 }}>{t(`src.${src.id}`)}</Muted>
              </View>
              <Text style={{ color: C.faint }}>↗</Text>
            </Pressable>
          ))}
        </View>
      ))}
    </Block>
  );
}

function PrivacyPage() {
  const items = [
    ["#4C64D6", '<circle cx="12" cy="8" r="3.6"/><path d="M5 20c1-3.8 3.8-5.6 7-5.6s6 1.8 7 5.6"/><path d="M4 4l16 16"/>', "privacy.1"],
    ["#1FA597", '<rect x="7" y="3" width="10" height="18" rx="2.4"/><path d="M10.5 18h3"/>', "privacy.2"],
    ["#3D84DB", '<path d="M4 6v12M7 6v12M10 6v12M14 6v12M17 6v12M20 6v12"/>', "privacy.3"],
    ["#8A63DA", '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.4"/>', "privacy.4"],
    ["#D9A81E", '<path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>', "privacy.6"],
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

export default function SettingsScreen({ focus, toast, onTour, onPremium }) {
  const insets = useSafeAreaInsets();
  const [page, setPage] = useState(null);
  const st = getSettings();

  // « Mon réglage » de l'accueil, ou alerte d'une fiche : on ouvre directement la bonne page
  useEffect(() => {
    if (focus && focus.n) setPage(focus.target === "profile" ? "profile" : "religion");
  }, [focus && focus.n]);
  useEffect(() => {
    if (!page) return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => { setPage(null); return true; });
    return () => sub.remove();
  }, [page]);
  if (typeof window !== "undefined" && window.__bayyin) window.__bayyin.settingsPage = setPage; // captures automatiques (web)

  const scroll = { paddingHorizontal: 20, paddingTop: insets.top + 12, paddingBottom: insets.bottom + 120, gap: 16 };
  if (page) {
    const P = PAGES[page];
    return (
      <ScrollView key={page} style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={scroll}>
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
    );
  }

  const profText = [st.profile.diet ? t(`diet.${st.profile.diet}`) : null, st.profile.allergens.length ? tn("settings.allergy_count", st.profile.allergens.length) : null].filter(Boolean).join(" · ") || t("settings.profile_none");
  const offText = st.packAt ? t("settings.offline_ready", { n: st.packCount }) : t("settings.offline_not");
  const version = (Constants.expoConfig && Constants.expoConfig.version) || "";
  const go = (id) => () => setPage(id);
  return (
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
      {premiumEnabled() && onPremium ? (
        <Group>
          <MenuRow id="premium" first title={t("premium.card_t")} value={isPremium() ? t("premium.active_t") : t("premium.card_p")} onPress={onPremium} />
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
        <MenuRow id="feedback" first external title={t("fb.title")} value={t("fb.row")} onPress={() => open("https://github.com/agozel5/bayyin/issues/new")} />
        <MenuRow id="off" external title={t("link.off.t")} value={t("link.off.d")} onPress={() => open("https://fr.openfoodfacts.org")} />
        <MenuRow id="report" external title={t("link.report.t")} value={t("link.report.d")} onPress={() => open("https://github.com/agozel5/bayyin/issues")} />
      </Group>
      <Muted style={{ fontSize: 12, lineHeight: 18, textAlign: "center" }}>{t("fine.data")} Open Food Facts ({t("fine.license")}) · Bayyin {version}</Muted>
    </ScrollView>
  );
}
