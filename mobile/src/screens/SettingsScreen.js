// Réglages et informations : langue, école, hors connexion, sources, limites.
import React, { useEffect, useRef, useState } from "react";
import { View, Text, ScrollView, Pressable, Linking } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Constants from "expo-constants";
import Icon from "../components/Icon";
import { Txt, H1, H2, Muted, Label, Row, Btn, Pill } from "../components/ui";
import { C, R, STATUS_COLORS, GRADE_COLORS, SEV_COLORS, dir } from "../theme";
import { t, tPlain, locale, LANGS } from "../i18n";
import { SCHOOLS, TOPICS, DECISIONS, SOURCES, LANG_NAMES, HEALTH_GRADES } from "../core";
import { getSettings, setSettings, setSchool, setTopic } from "../storage";
import { downloadPack } from "../api";
import { S } from "../view";

const LEGEND_ORDER = ["halal_certifie", "halal_probable", "mashbouh", "haram", "inconnu"];
const DECISION_COLORS = { permis: SEV_COLORS.info, douteux: SEV_COLORS.mashbouh, interdit: SEV_COLORS.haram };
const open = (url) => Linking.openURL(url).catch(() => {});

function Block({ title, children, onLayout }) {
  return (
    <View onLayout={onLayout} style={{ gap: 12, paddingTop: 22, borderTopWidth: 1, borderTopColor: C.line }}>
      {title ? <H2>{title}</H2> : null}
      {children}
    </View>
  );
}

function Radio({ on }) {
  return (
    <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: on ? C.brand : C.faint, alignItems: "center", justifyContent: "center" }}>
      {on ? <View style={{ width: 11, height: 11, borderRadius: 6, backgroundColor: C.brand }} /> : null}
    </View>
  );
}

function LinkRow({ title, text, url }) {
  return (
    <Pressable onPress={() => open(url)} style={({ pressed }) => ({ flexDirection: dir().row, alignItems: "center", gap: 12, padding: 14, borderRadius: R.md, backgroundColor: pressed ? C.tint2 : C.tint })}>
      <View style={{ flex: 1, gap: 2 }}>
        <Txt style={{ fontWeight: "700" }}>{title}</Txt>
        {text ? <Muted style={{ fontSize: 13, lineHeight: 18 }}>{text}</Muted> : null}
      </View>
      <Icon name="external" size={18} color={C.muted} />
    </Pressable>
  );
}

export default function SettingsScreen({ focusSchool }) {
  const insets = useSafeAreaInsets();
  const scroller = useRef(null);
  const schoolY = useRef(0);
  const [packing, setPacking] = useState(null); // null | nombre de produits téléchargés
  const [packError, setPackError] = useState(false);
  const st = getSettings();

  useEffect(() => {
    if (focusSchool) setTimeout(() => scroller.current && scroller.current.scrollTo({ y: Math.max(0, schoolY.current - 10), animated: true }), 120);
  }, [focusSchool]);

  const pack = async () => {
    if (packing !== null) return;
    setPackError(false);
    setPacking(0);
    try {
      const n = await downloadPack((count) => setPacking(count));
      setPacking(null);
      setSettings({ packAt: Date.now(), packCount: n });
    } catch {
      setPacking(null);
      setPackError(true);
    }
  };

  const schools = [...Object.keys(SCHOOLS), ...(st.school === "custom" ? ["custom"] : [])];
  const version = (Constants.expoConfig && Constants.expoConfig.version) || "";

  return (
    <ScrollView ref={scroller} style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: insets.top + 16, paddingBottom: 40, gap: 20 }}>
      <H1>{t("settings.title")}</H1>

      <Row gap={14} style={{ backgroundColor: C.brandSoft, borderRadius: R.lg, padding: 16, alignItems: "flex-start" }}>
        <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: C.brand, alignItems: "center", justifyContent: "center" }}>
          <Icon name="shield" size={22} color="#fff" />
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <Txt style={{ fontWeight: "800", color: C.brandDark }}>{t("privacy.t")}</Txt>
          <Txt style={{ fontSize: 14, lineHeight: 20, color: C.brandDark }}>{t("privacy.p")}</Txt>
        </View>
      </Row>

      <Block title={t("settings.lang")}>
        <View style={{ flexDirection: dir().row, flexWrap: "wrap", gap: 10 }}>
          {LANGS.map((l) => (
            <Pressable
              key={l}
              onPress={() => setSettings({ lang: l })}
              accessibilityState={{ selected: st.lang === l }}
              style={{ flexBasis: "47%", flexGrow: 1, paddingVertical: 14, borderRadius: R.md, alignItems: "center", borderWidth: 2, borderColor: st.lang === l ? C.brand : C.line, backgroundColor: st.lang === l ? C.brandSoft : "#fff" }}
            >
              <Text style={{ fontWeight: "800", fontSize: 16, color: st.lang === l ? C.brandDark : C.fg }}>{LANG_NAMES[l]}</Text>
            </Pressable>
          ))}
        </View>
      </Block>

      <Block title={t("settings.school")} onLayout={(e) => (schoolY.current = e.nativeEvent.layout.y)}>
        <Muted>{t("settings.school_intro")}</Muted>
        <View style={{ gap: 8 }}>
          {schools.map((s) => (
            <Pressable
              key={s}
              onPress={() => s !== "custom" && setSchool(s)}
              accessibilityState={{ selected: st.school === s }}
              style={{ flexDirection: dir().row, alignItems: "center", gap: 12, padding: 14, borderRadius: R.md, borderWidth: 2, borderColor: st.school === s ? C.brand : C.line, backgroundColor: st.school === s ? C.brandSoft : "#fff" }}
            >
              <Radio on={st.school === s} />
              <View style={{ flex: 1, gap: 2 }}>
                <Txt style={{ fontWeight: "800" }}>{t(`school.${s}`)}</Txt>
                <Muted style={{ fontSize: 13, lineHeight: 18 }}>{t(`school.${s}.d`)}</Muted>
              </View>
            </Pressable>
          ))}
        </View>
        <Label style={{ marginTop: 8 }}>{t("settings.topics")}</Label>
        <View style={{ gap: 14 }}>
          {TOPICS.map((topic) => (
            <View key={topic} style={{ gap: 8 }}>
              <Txt style={{ fontWeight: "700" }}>{t(`topic.${topic}`)}</Txt>
              <View style={{ flexDirection: dir().row, backgroundColor: C.tint, borderRadius: R.md, padding: 4, gap: 4 }}>
                {DECISIONS.map((d) => {
                  const on = st.topics[topic] === d;
                  const [fg, bg] = DECISION_COLORS[d] || [C.fg, "#fff"];
                  return (
                    <Pressable
                      key={d}
                      onPress={() => setTopic(topic, d)}
                      accessibilityState={{ selected: on }}
                      style={{ flex: 1, paddingVertical: 9, borderRadius: R.sm, alignItems: "center", backgroundColor: on ? bg : "transparent", borderWidth: on ? 1.5 : 0, borderColor: fg }}
                    >
                      <Text style={{ fontWeight: "800", fontSize: 14, color: on ? fg : C.muted }}>{t(`decision.${d}`)}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))}
        </View>
        <Muted style={{ fontSize: 13, lineHeight: 19 }}>{t("settings.disclaimer")}</Muted>
      </Block>

      <Block title={t("settings.offline")}>
        <Muted>{t("settings.offline_p")}</Muted>
        <Btn kind="soft" title={t(st.packAt ? "settings.offline_update" : "settings.offline_btn")} onPress={pack} disabled={packing !== null} icon="box" />
        {packing !== null ? (
          <Muted style={{ fontSize: 14 }}>{t("settings.offline_progress", { n: packing })}</Muted>
        ) : packError ? (
          <Muted style={{ fontSize: 14, color: STATUS_COLORS.haram[0] }}>{t("settings.offline_error")}</Muted>
        ) : st.packAt ? (
          <Muted style={{ fontSize: 14 }}>
            {t("settings.offline_done", { n: st.packCount, d: new Date(st.packAt).toLocaleDateString(locale(), { day: "numeric", month: "long" }) })}
          </Muted>
        ) : null}
      </Block>

      <Block title={t("why.t")}>
        <View style={{ borderStartWidth: 4, borderStartColor: C.gold, paddingStart: 14, gap: 6 }}>
          <Txt style={{ fontSize: 17, lineHeight: 25, fontStyle: "italic" }}>{t("why.quote")}</Txt>
          <Muted style={{ fontSize: 13 }}>{t("why.cite")}</Muted>
        </View>
        <Muted>{t("why.p")}</Muted>
      </Block>

      <Block title={t("settings.how")}>
        {[1, 2, 3].map((i) => (
          <Row key={i} gap={12} style={{ alignItems: "flex-start" }}>
            <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: C.brand, alignItems: "center", justifyContent: "center" }}>
              <Text style={{ color: "#fff", fontWeight: "800" }}>{i}</Text>
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Txt style={{ fontWeight: "800" }}>{t(`how.${i}.t`)}</Txt>
              <Muted>{t(`how.${i}.p`)}</Muted>
            </View>
          </Row>
        ))}
      </Block>

      <Block title={t("settings.statuses")}>
        {LEGEND_ORDER.map((s) => (
          <View key={s} style={{ gap: 6 }}>
            <Pill text={S(s, "label")} colors={STATUS_COLORS[s]} dot />
            <Muted style={{ fontSize: 14, lineHeight: 20 }}>{S(s, "legend")}</Muted>
          </View>
        ))}
      </Block>

      <Block title={t("settings.health")}>
        {[["60", "health.rule1_html"], ["30", "health.rule2_html"], ["10", "health.rule3_html"]].map(([pts, key]) => (
          <Row key={key} gap={12} style={{ alignItems: "flex-start" }}>
            <View style={{ minWidth: 58, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 8, backgroundColor: C.brandSoft, alignItems: "center" }}>
              <Text style={{ fontWeight: "800", color: C.brandDark, fontSize: 13 }}>{t("health.pts", { n: pts })}</Text>
            </View>
            <Muted style={{ flex: 1, fontSize: 14, lineHeight: 20 }}>{tPlain(key)}</Muted>
          </Row>
        ))}
        {HEALTH_GRADES.map((g, i) => {
          const max = i === 0 ? 100 : HEALTH_GRADES[i - 1].min - 1;
          return (
            <Row key={g.id} gap={10}>
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: GRADE_COLORS[g.id] }} />
              <Txt style={{ fontWeight: "700", fontSize: 15 }}>{t(`grade.${g.id}`)}</Txt>
              <Muted style={{ fontSize: 14 }}>{t("health.range", { a: g.min, b: max })}</Muted>
            </Row>
          );
        })}
      </Block>

      <Block title={t("settings.sources")}>
        <Muted>{t("sources.intro")}</Muted>
        {["data", "health", "halal"].map((g) => (
          <View key={g} style={{ gap: 8 }}>
            <Label>{t(`sources.g.${g}`)}</Label>
            {SOURCES.filter((src) => src.group === g).map((src) => (
              <LinkRow key={src.id} title={src.name} text={t(`src.${src.id}`)} url={src.url} />
            ))}
          </View>
        ))}
      </Block>

      <Block title={t("settings.limits")}>
        <Muted>{t("limits.1")}</Muted>
        <Muted>{t("limits.2")}</Muted>
        <Muted>{t("limits.3")}</Muted>
      </Block>

      <Block>
        <LinkRow title={t("link.off.t")} text={t("link.off.d")} url="https://fr.openfoodfacts.org" />
        <LinkRow title={t("link.report.t")} text={t("link.report.d")} url="https://github.com/agozel5/bayyin/issues" />
      </Block>

      <Muted style={{ fontSize: 12, lineHeight: 18, textAlign: "center" }}>
        {t("fine.data")} Open Food Facts ({t("fine.license")}) · Bayyin {version}
      </Muted>
    </ScrollView>
  );
}
