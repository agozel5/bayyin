// Carte de restaurant : photo de la carte, lecture sur le téléphone, puis chaque plat est classé
// (à éviter, à vérifier, rien de signalé), avec les ingrédients que son nom laisse deviner.
import React, { useMemo, useState } from "react";
import { View, Text, TextInput, Pressable } from "react-native";
import { Txt, Muted, Row, FadeIn } from "../components/ui";
import { Glyph } from "../components/Art";
import { ToolPage, ToolIntro, ToolBtn, Reading, pickImage, useTextReader, TOOL_ICONS, TOOL_COLORS } from "../components/ToolKit";
import { C, R, dir, lift, STATUS_COLORS, SEV_COLORS } from "../theme";
import { t, tn } from "../i18n";
import { haptic } from "../motion";
import { flagLabel } from "../view";
import { getSettings } from "../storage";
import { analyzeMenu } from "../../../public/lib/menu.js";

const GROUP = { haram: "haram", mashbouh: "mashbouh", ok: "halal_probable" };
const OCR_LANGS = { fr: "fra+eng", en: "eng+fra", tr: "tur+eng+fra", ar: "fra+eng" };

function Dish({ d }) {
  const [fg, bg] = STATUS_COLORS[GROUP[d.status]];
  const reasons = d.flags.filter((f) => f.severity !== "info");
  return (
    <View style={{ flexDirection: dir().row, gap: 12, paddingHorizontal: 16, paddingVertical: 14, borderTopWidth: 0.5, borderTopColor: C.line }}>
      <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: fg, marginTop: 5 }} />
      <View style={{ flex: 1, gap: 4 }}>
        <Row style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
          <Txt style={{ flex: 1, fontWeight: "800", fontSize: 16, lineHeight: 21 }}>{d.title}</Txt>
          <Text style={{ color: fg, backgroundColor: bg, fontWeight: "800", fontSize: 12, paddingHorizontal: 9, paddingVertical: 3, borderRadius: 99, overflow: "hidden" }}>{t(`menu.st.${d.status}`)}</Text>
        </Row>
        {d.desc ? <Muted style={{ fontSize: 13.5, lineHeight: 19 }} numberOfLines={2}>{d.desc}</Muted> : null}
        {reasons.length ? (
          <View style={{ flexDirection: dir().row, flexWrap: "wrap", gap: 6, marginTop: 2 }}>
            {reasons.map((f) => {
              const [c, b] = SEV_COLORS[f.severity] || SEV_COLORS.info;
              const text = f.ask ? t("menu.ask_meat") : f.hidden ? t(f.sure ? "menu.hidden_sure" : "menu.hidden_maybe", { x: (getSettings().lang === "fr" && f.source) || flagLabel(f).toLowerCase() }) : flagLabel(f);
              return <Text key={f.id} style={{ color: c, backgroundColor: b, fontWeight: "700", fontSize: 12.5, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 99, overflow: "hidden" }}>{text}</Text>;
            })}
          </View>
        ) : null}
      </View>
    </View>
  );
}

export default function MenuScreen({ onClose }) {
  const [step, setStep] = useState("intro"); // intro | reading | result | empty | error | denied
  const [text, setText] = useState("");
  const [filter, setFilter] = useState("all");
  const [editing, setEditing] = useState(false);
  const reader = useTextReader();
  if (typeof window !== "undefined" && window.__bayyin) window.__bayyinMenu = (txt) => { setText(txt); setFilter("all"); setEditing(false); setStep("result"); }; // captures automatiques (web)

  const go = async (source) => {
    let img;
    try { img = await pickImage(source); } catch { return setStep("error"); }
    if (img === "denied") return setStep("denied");
    if (!img) return;
    setStep("reading");
    try {
      const raw = await reader.read(img, OCR_LANGS[getSettings().lang] || OCR_LANGS.fr);
      const clean = String(raw || "");
      if (!clean || clean.replace(/[^\p{L}]/gu, "").length < 6) return setStep("empty");
      haptic.success();
      setText(raw);
      setFilter("all");
      setEditing(false);
      setStep("result");
    } catch {
      setStep("error");
    }
  };

  const res = useMemo(() => (text ? analyzeMenu(text, getSettings()) : null), [text]);
  const list = res ? res.dishes.filter((d) => filter === "all" || d.status === filter) : [];
  // intertitres (entrées, plats…) gardés dans l'ordre de la carte
  const blocks = [];
  list.forEach((d) => {
    const last = blocks[blocks.length - 1];
    if (!last || last.section !== d.section) blocks.push({ section: d.section, dishes: [d] });
    else last.dishes.push(d);
  });

  return (
    <ToolPage title={t("menu.title")} onClose={onClose}>
      {step !== "reading" && step !== "result" ? (
        <>
          <ToolIntro color={TOOL_COLORS.menu} paths={TOOL_ICONS.menu} title={t("menu.intro_t")} text={t("menu.intro_p")}
            points={[t("menu.pt1"), t("menu.pt2"), t("menu.pt3")]}>
            <ToolBtn text={t("menu.take")} paths={TOOL_ICONS.camera} onPress={() => go("camera")} />
            <ToolBtn soft text={t("tool.gallery")} paths={TOOL_ICONS.gallery} onPress={() => go("library")} />
          </ToolIntro>
          {step !== "intro" ? (
            <View style={{ padding: 14, borderRadius: R.lg, backgroundColor: STATUS_COLORS.mashbouh[1] }}>
              <Txt style={{ color: STATUS_COLORS.mashbouh[0], fontWeight: "700", fontSize: 14.5 }}>
                {step === "denied" ? t("cam.err.denied.p") : step === "empty" ? t("menu.empty") : t("ocr.error.p")}
              </Txt>
            </View>
          ) : null}
        </>
      ) : null}

      {step === "reading" ? <Reading progress={reader.progress} /> : null}

      {step === "result" && res ? (
        <FadeIn style={{ gap: 14 }}>
          {/* Résumé : trois compteurs qui servent aussi de filtres */}
          <View style={{ flexDirection: dir().row, gap: 10 }}>
            {["haram", "mashbouh", "ok"].map((k) => {
              const [fg, bg] = STATUS_COLORS[GROUP[k]];
              const on = filter === k;
              return (
                <Pressable key={k} onPress={() => { haptic.tap(); setFilter(on ? "all" : k); }} accessibilityRole="button" accessibilityState={{ selected: on }}
                  style={[{ flex: 1, padding: 12, borderRadius: R.lg, gap: 2, backgroundColor: on ? fg : bg, borderWidth: 1, borderColor: fg + "44" }, lift()]}>
                  <Text style={{ fontSize: 26, fontWeight: "900", color: on ? "#fff" : fg }}>{res.count[k]}</Text>
                  <Text numberOfLines={2} style={{ fontSize: 12.5, lineHeight: 16, fontWeight: "800", color: on ? "#fff" : fg }}>{t(`menu.sum.${k}`)}</Text>
                </Pressable>
              );
            })}
          </View>

          {res.dishes.length ? (
            blocks.map((b, i) => (
              <View key={i} style={[{ backgroundColor: C.surface, borderRadius: R.xl, overflow: "hidden" }, lift()]}>
                {b.section ? <Text style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8, fontSize: 13, fontWeight: "900", letterSpacing: 1, color: C.muted }}>{b.section.toUpperCase()}</Text> : <View style={{ height: 2 }} />}
                {b.dishes.map((d, j) => <Dish key={j} d={d} />)}
              </View>
            ))
          ) : (
            <Muted>{t("menu.no_dish")}</Muted>
          )}
          {res.dishes.length && !list.length ? <Muted style={{ textAlign: "center" }}>{t("menu.none_in_filter")}</Muted> : null}

          <View style={{ flexDirection: dir().row, gap: 10, padding: 14, borderRadius: R.lg, backgroundColor: C.tint, alignItems: "flex-start" }}>
            <Glyph name="bulb" size={19} color="#D9A81E" />
            <Txt style={{ flex: 1, fontSize: 13.5, lineHeight: 19 }}>{t("menu.note")}</Txt>
          </View>

          {editing ? (
            <View style={[{ backgroundColor: C.surface, borderRadius: R.xl, padding: 16, gap: 10 }, lift()]}>
              <Txt style={{ fontWeight: "800" }}>{t("menu.fix_t")}</Txt>
              <Muted style={{ fontSize: 13.5 }}>{t("menu.fix_p")}</Muted>
              <TextInput value={text} onChangeText={setText} multiline autoCorrect={false}
                style={{ minHeight: 180, textAlignVertical: "top", borderWidth: 1, borderColor: C.line, borderRadius: R.md, padding: 12, fontSize: 15, color: C.fg, backgroundColor: C.bg }} />
            </View>
          ) : null}
          <ToolBtn soft text={editing ? t("travel.done") : t("menu.fix")} paths={TOOL_ICONS.edit} onPress={() => setEditing(!editing)} />
          <ToolBtn text={t("menu.again")} paths={TOOL_ICONS.camera} onPress={() => go("camera")} />
          <Muted style={{ fontSize: 12.5, textAlign: "center" }}>{tn("menu.count", res.dishes.length)}</Muted>
        </FadeIn>
      ) : null}
      {reader.element}
    </ToolPage>
  );
}
