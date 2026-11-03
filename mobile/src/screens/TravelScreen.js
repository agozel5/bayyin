// Mode voyage : photo de la liste d'ingrédients d'un produit acheté à l'étranger. Le texte est lu sur
// le téléphone, sa langue reconnue, les mots importants traduits (porc, gélatine, alcool, présure,
// allergènes…), puis analysé avec les mêmes règles qu'en France.
import React, { useMemo, useState } from "react";
import { View, Text, TextInput, Pressable } from "react-native";
import { Txt, Muted, Row, FadeIn } from "../components/ui";
import { Glyph } from "../components/Art";
import { Chip, ChipRow } from "../components/Controls";
import { ToolPage, ToolIntro, ToolBtn, Reading, pickImage, useTextReader, TOOL_ICONS, TOOL_COLORS } from "../components/ToolKit";
import { C, R, dir, lift, STATUS_COLORS, SEV_COLORS } from "../theme";
import { t } from "../i18n";
import { haptic } from "../motion";
import { S, flagLabel } from "../view";
import { present, additivesFromText, cleanOcrText, classify } from "../core";
import { getSettings, addToHistory } from "../storage";
import { TRAVEL_LANGS, detectLang, travelRaw } from "../../../public/lib/travel.js";

const FLAG = { de: "🇩🇪", es: "🇪🇸", it: "🇮🇹", nl: "🇳🇱", pt: "🇵🇹", pl: "🇵🇱", tr: "🇹🇷", en: "🇬🇧" };
const TESS = { de: "deu+eng", es: "spa+eng", it: "ita+eng", nl: "nld+eng", pt: "por+eng", pl: "pol+eng", tr: "tur+eng", en: "eng" };

// Sévérité d'un mot traduit seul (pour sa couleur dans la liste)
function termSeverity(term) {
  if (term.kind !== "halal") return null;
  const flags = classify({ ingredients_text: term.to, categories_tags: [] }, getSettings()).flags;
  return flags.some((f) => f.severity === "haram") ? "haram" : flags.some((f) => f.severity === "mashbouh") ? "mashbouh" : "info";
}

export default function TravelScreen({ onClose, onOpenProduct }) {
  const [lang, setLang] = useState("auto"); // langue choisie avant la photo
  const [step, setStep] = useState("intro"); // intro | reading | result | empty | error | denied
  const [text, setText] = useState("");
  const [shown, setShown] = useState(null); // langue retenue pour la traduction
  const [editing, setEditing] = useState(false);
  const [full, setFull] = useState(false);
  const reader = useTextReader();
  if (typeof window !== "undefined" && window.__bayyin) window.__bayyinTravel = (txt, l) => { setText(txt); setShown(l || detectLang(txt)); setEditing(false); setStep("result"); }; // captures automatiques (web)

  const go = async (source) => {
    let img;
    try { img = await pickImage(source); } catch { return setStep("error"); }
    if (img === "denied") return setStep("denied");
    if (!img) return;
    setStep("reading");
    try {
      const raw = await reader.read(img, TESS[lang] || "deu+spa+ita+eng");
      const clean = cleanOcrText(raw);
      if (!clean || clean.replace(/[^\p{L}]/gu, "").length < 6) return setStep("empty");
      haptic.success();
      setText(clean);
      setShown(lang === "auto" ? detectLang(clean) : lang);
      setEditing(false);
      setStep("result");
    } catch {
      setStep("error");
    }
  };

  // Analyse recalculée à chaque correction du texte ou changement de langue
  const res = useMemo(() => {
    if (!text) return null;
    const tr = travelRaw(text, { lang: shown || detectLang(text), name: t("travel.product_name") });
    tr.raw.additives_tags = additivesFromText(tr.text);
    return { ...tr, p: present(tr.raw, getSettings()) };
  }, [text, shown]);

  const openFull = () => {
    if (!res) return;
    const p = present({ ...res.raw, code: `travel-${Date.now()}` }, getSettings());
    addToHistory(p);
    onOpenProduct(p);
  };

  return (
    <ToolPage title={t("travel.title")} onClose={onClose}>
      {step === "intro" || step === "denied" || step === "error" || step === "empty" ? (
        <>
          <ToolIntro color={TOOL_COLORS.travel} paths={TOOL_ICONS.travel} title={t("travel.intro_t")} text={t("travel.intro_p")}
            points={[t("travel.pt1"), t("travel.pt2"), t("travel.pt3")]}>
            <ToolBtn text={t("travel.take")} paths={TOOL_ICONS.camera} onPress={() => go("camera")} />
            <ToolBtn soft text={t("tool.gallery")} paths={TOOL_ICONS.gallery} onPress={() => go("library")} />
          </ToolIntro>
          {step !== "intro" ? (
            <View style={{ padding: 14, borderRadius: R.lg, backgroundColor: STATUS_COLORS.mashbouh[1] }}>
              <Txt style={{ color: STATUS_COLORS.mashbouh[0], fontWeight: "700", fontSize: 14.5 }}>
                {step === "denied" ? t("cam.err.denied.p") : step === "empty" ? t("ocr.empty.p") : t("ocr.error.p")}
              </Txt>
            </View>
          ) : null}
          <View style={{ gap: 8 }}>
            <Muted style={{ fontSize: 13.5, fontWeight: "700" }}>{t("travel.lang_label")}</Muted>
            <ChipRow>
              <Chip text={t("travel.lang.auto")} on={lang === "auto"} onPress={() => setLang("auto")} />
              {TRAVEL_LANGS.map((l) => <Chip key={l} text={`${FLAG[l]} ${t(`travel.lang.${l}`)}`} on={lang === l} onPress={() => setLang(l)} />)}
            </ChipRow>
          </View>
        </>
      ) : null}

      {step === "reading" ? <Reading progress={reader.progress} /> : null}

      {step === "result" && res ? (
        <FadeIn style={{ gap: 16 }}>
          {/* Langue reconnue : modifiable */}
          <View style={{ gap: 8 }}>
            <Muted style={{ fontSize: 13.5, fontWeight: "700" }}>{t("travel.detected")}</Muted>
            <ChipRow>
              {TRAVEL_LANGS.map((l) => <Chip key={l} text={`${FLAG[l]} ${t(`travel.lang.${l}`)}`} on={res.lang === l} onPress={() => setShown(l)} />)}
            </ChipRow>
          </View>

          {/* Verdict */}
          {(() => {
            const v = res.p.verdict;
            const [fg, bg] = STATUS_COLORS[v.status] || STATUS_COLORS.inconnu;
            const shownFlags = v.flags.filter((f) => f.severity !== "info");
            return (
              <View style={[{ borderRadius: R.xl, padding: 18, gap: 10, backgroundColor: bg, borderWidth: 1, borderColor: fg + "44" }, lift()]}>
                <Text style={{ color: fg, fontSize: 12.5, fontWeight: "800", letterSpacing: 0.8 }}>{t("detail.kicker", { s: t(`school.${getSettings().school}`) }).toUpperCase()}</Text>
                <Text accessibilityRole="header" style={{ color: fg, fontSize: 26, fontWeight: "900", letterSpacing: -0.4 }}>{S(v.status, "label")}</Text>
                <Txt style={{ fontSize: 15, lineHeight: 21 }}>{S(v.status, "lead")}</Txt>
                {shownFlags.length ? (
                  <View style={{ flexDirection: dir().row, flexWrap: "wrap", gap: 6 }}>
                    {shownFlags.slice(0, 6).map((f) => {
                      const [c, b] = SEV_COLORS[f.severity];
                      return <Text key={f.id} style={{ color: c, backgroundColor: b, fontWeight: "800", fontSize: 13, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 99, overflow: "hidden" }}>{flagLabel(f)}</Text>;
                    })}
                  </View>
                ) : null}
              </View>
            );
          })()}

          {/* Mots repérés et leur traduction */}
          <View style={[{ backgroundColor: C.surface, borderRadius: R.xl, overflow: "hidden" }, lift()]}>
            <Txt style={{ fontWeight: "800", fontSize: 16.5, padding: 16, paddingBottom: 6 }}>{t("travel.terms")}</Txt>
            {res.terms.filter((x) => x.kind !== "word").length ? res.terms.filter((x) => x.kind !== "word").map((x, i) => {
              const sev = termSeverity(x);
              const color = x.kind === "allergen" ? "#3D84DB" : sev && sev !== "info" ? SEV_COLORS[sev][0] : C.brand;
              return (
                <Row key={`${x.from}-${i}`} gap={12} style={{ paddingHorizontal: 16, paddingVertical: 11, borderTopWidth: 0.5, borderTopColor: C.line }}>
                  <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color }} />
                  <Text style={{ flex: 1, fontSize: 15, color: C.muted }} numberOfLines={1}>{x.from}</Text>
                  <Glyph paths='<path d="M5 12h14M13 6l6 6-6 6"/>' size={16} color={C.faint} />
                  <Text style={{ flex: 1.2, fontSize: 15, fontWeight: "800", color: C.fg, textAlign: dir().rtl ? "left" : "right" }} numberOfLines={1}>{x.to}</Text>
                </Row>
              );
            }) : <Muted style={{ paddingHorizontal: 16, paddingBottom: 14, fontSize: 14 }}>{t("travel.no_terms")}</Muted>}
            <View style={{ height: 6 }} />
          </View>

          {/* Liste traduite / texte lu (corrigeable) */}
          <View style={[{ backgroundColor: C.surface, borderRadius: R.xl, padding: 16, gap: 10 }, lift()]}>
            <Row style={{ justifyContent: "space-between" }}>
              <Txt style={{ fontWeight: "800", fontSize: 16.5 }}>{editing ? t("travel.original") : t("travel.translated")}</Txt>
              <Pressable onPress={() => { haptic.tap(); setEditing(!editing); }} hitSlop={8} accessibilityRole="button">
                <Text style={{ color: C.brand, fontWeight: "800", fontSize: 14 }}>{editing ? t("travel.done") : t("travel.fix")}</Text>
              </Pressable>
            </Row>
            {editing ? (
              <TextInput value={text} onChangeText={setText} multiline autoCorrect={false} spellCheck={false}
                style={{ minHeight: 140, textAlignVertical: "top", borderWidth: 1, borderColor: C.line, borderRadius: R.md, padding: 12, fontSize: 15, color: C.fg, backgroundColor: C.bg }} />
            ) : (
              <Pressable onPress={() => setFull(!full)}>
                <Txt style={{ fontSize: 14.5, lineHeight: 21, color: C.fg }} numberOfLines={full ? undefined : 5}>{res.text}</Txt>
              </Pressable>
            )}
            <Muted style={{ fontSize: 12.5, lineHeight: 18 }}>{t("travel.note")}</Muted>
          </View>

          <ToolBtn text={t("travel.full")} paths='<path d="M9 5l7 7-7 7"/>' onPress={openFull} />
          <ToolBtn soft text={t("travel.again")} paths={TOOL_ICONS.camera} onPress={() => go("camera")} />
        </FadeIn>
      ) : null}
      {reader.element}
    </ToolPage>
  );
}
