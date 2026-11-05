// Carte de restaurant : photo de la carte, lecture sur le téléphone, puis chaque plat est classé
// (à éviter, à vérifier, rien de signalé), avec les ingrédients que son nom laisse deviner.
import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, TextInput, Pressable, Image, Modal, ScrollView, Animated, Easing } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Txt, Muted, Row, FadeIn } from "../components/ui";
import { Glyph } from "../components/Art";
import { ToolPage, ToolIntro, ToolBtn, Reading, ScanReading, pickImage, useTextReader, TOOL_ICONS, TOOL_COLORS } from "../components/ToolKit";
import { C, R, dir, lift, STATUS_COLORS, SEV_COLORS } from "../theme";
import { t, tn } from "../i18n";
import { haptic, ms } from "../motion";
import { flagLabel } from "../view";
import { getSettings } from "../storage";
import { analyzeMenu, linesFromWords } from "../../../public/lib/menu.js";

const GROUP = { haram: "haram", mashbouh: "mashbouh", ok: "halal_probable" };
const OCR_LANGS = { fr: "fra+eng", en: "eng+fra", tr: "tur+eng+fra", ar: "fra+eng" };

function Dish({ d, onPress, selected, first }) {
  const [fg, bg] = STATUS_COLORS[GROUP[d.status]];
  const reasons = d.flags.filter((f) => f.severity !== "info");
  return (
    <Pressable onPress={onPress} disabled={!onPress} accessibilityRole={onPress ? "button" : undefined} accessibilityHint={onPress ? t("menu.find_hint") : undefined}
      style={({ pressed }) => ({ flexDirection: dir().row, gap: 12, paddingHorizontal: 16, paddingVertical: 14, borderTopWidth: first ? 0 : 0.5, borderTopColor: C.line,
        backgroundColor: selected ? fg + "1F" : pressed ? C.tint : "transparent" })}>
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
      {onPress && d.boxes && d.boxes.length ? <Glyph paths='<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4 4"/>' size={17} color={C.faint} /> : null}
    </Pressable>
  );
}

// Rectangle qui entoure un plat sur la photo (ses lignes réunies)
function unionBox(boxes) {
  const b = { x0: 1, y0: 1, x1: 0, y1: 0 };
  for (const x of boxes) { b.x0 = Math.min(b.x0, x.x0); b.y0 = Math.min(b.y0, x.y0); b.x1 = Math.max(b.x1, x.x1); b.y1 = Math.max(b.y1, x.y1); }
  const p = 0.004;
  return { x0: Math.max(0, b.x0 - p), y0: Math.max(0, b.y0 - p), x1: Math.min(1, b.x1 + p), y1: Math.min(1, b.y1 + p) };
}

/** La photo de la carte, chaque plat surligné à sa place (rouge : à éviter, orange : à vérifier, vert : rien de signalé) */
function MenuPhoto({ photo, dishes, filter, selected, onSelect, width }) {
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (selected == null || !ms(1)) return undefined;
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 0.35, duration: 520, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 1, duration: 520, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ]), { iterations: 3 });
    loop.start();
    return () => loop.stop();
  }, [selected]);
  if (!width || !photo.width) return null;
  const h = width * (photo.height / photo.width);
  return (
    <View style={{ width, height: h, borderRadius: 12, overflow: "hidden", backgroundColor: "#000" }}>
      <Image source={{ uri: photo.uri }} style={{ width, height: h }} resizeMode="cover" accessible={false} />
      {dishes.map((d, i) => {
        if (!d.boxes || !d.boxes.length) return null;
        const ub = unionBox(d.boxes);
        if (ub.y1 - ub.y0 > 0.2 || ub.x1 - ub.x0 > 0.95) return null; // position douteuse : pas d'encadré trompeur
        const show = filter === "all" ? true : d.status === filter;
        if (!show && i !== selected) return null;
        const b = unionBox(d.boxes);
        const [fg] = STATUS_COLORS[GROUP[d.status]];
        const sel = i === selected;
        const quiet = d.status === "ok" && filter === "all" && !sel; // rien de signalé : simple soulignement
        // rien de signalé : petite barre verte dans la marge (ne cache pas le texte voisin)
        const style = { position: "absolute", left: b.x0 * width, top: b.y0 * h, width: (b.x1 - b.x0) * width, height: (b.y1 - b.y0) * h,
          borderRadius: 4, borderWidth: sel ? 3 : quiet ? 0 : 2, borderLeftWidth: sel ? 3 : quiet ? 4 : 2, borderColor: fg, backgroundColor: quiet ? "transparent" : fg + (sel ? "55" : "38") };
        return (
          <Pressable key={i} onPress={() => { haptic.tap(); onSelect(i); }} accessibilityRole="button" accessibilityLabel={`${d.title}, ${t(`menu.st.${d.status}`)}`} hitSlop={4} style={style}>
            {sel ? <Animated.View pointerEvents="none" style={{ position: "absolute", left: -3, right: -3, top: -3, bottom: -3, borderRadius: 6, borderWidth: 3, borderColor: "#fff", opacity: pulse }} /> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

/** Photo en plein écran : on peut l'agrandir avec deux doigts (iPhone) et toucher les plats */
function ZoomPhoto({ visible, onClose, photo, dishes, filter, selected, onSelect }) {
  const insets = useSafeAreaInsets();
  const [w, setW] = useState(0);
  const d = selected != null ? dishes[selected] : null;
  return (
    <Modal visible={visible} animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: "#000" }} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
        <ScrollView maximumZoomScale={4} minimumZoomScale={1} centerContent bouncesZoom showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingTop: insets.top + 56, paddingBottom: insets.bottom + 220 }}>
          <MenuPhoto photo={photo} dishes={dishes} filter={filter} selected={selected} onSelect={onSelect} width={w} />
        </ScrollView>
        <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel={t("sheet.back")} hitSlop={10}
          style={{ position: "absolute", top: insets.top + 8, [dir().rtl ? "left" : "right"]: 14, width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" }}>
          <Glyph name="cross" size={20} color="#fff" />
        </Pressable>
        <View style={{ position: "absolute", left: 12, right: 12, bottom: insets.bottom + 12 }}>
          {d ? (
            <View style={[{ backgroundColor: C.surface, borderRadius: R.xl, overflow: "hidden" }, lift()]}><Dish d={d} first /></View>
          ) : (
            <Text style={{ color: "#fff", textAlign: "center", fontWeight: "700", fontSize: 14, padding: 12, backgroundColor: "rgba(0,0,0,0.55)", borderRadius: 14, overflow: "hidden" }}>{t("menu.tap_hint")}</Text>
          )}
        </View>
      </View>
    </Modal>
  );
}

export default function MenuScreen({ onClose }) {
  const [step, setStep] = useState("intro"); // intro | reading | result | empty | error | denied
  const [text, setText] = useState("");
  const [lines, setLines] = useState(null); // lignes lues avec leur position sur la photo
  const [photo, setPhoto] = useState(null); // { uri, width, height }
  const [edited, setEdited] = useState(false); // texte corrigé à la main : les positions ne valent plus
  const [filter, setFilter] = useState("all");
  const [editing, setEditing] = useState(false);
  const [selected, setSelected] = useState(null);
  const [zoom, setZoom] = useState(false);
  const [photoW, setPhotoW] = useState(0);
  const scrollRef = useRef(null);
  const photoY = useRef(0);
  const reader = useTextReader();
  const [shot, setShot] = useState(null); // photo en cours de lecture (écran de chargement)
  const [over, setOver] = useState(null); // progression imposée (fin de lecture, captures)
  const reset = () => { setFilter("all"); setEditing(false); setEdited(false); setSelected(null); setZoom(false); setStep("result"); };
  if (typeof window !== "undefined" && window.__bayyin) { // captures automatiques (web)
    window.__bayyinMenu = (txt) => { setText(txt); setLines(null); setPhoto(null); reset(); };
    window.__bayyinMenuPhoto = (uri, width, height, ls) => { setPhoto({ uri, width, height }); setLines(ls); setText(ls.map((l) => l.t).join("\n")); reset(); };
    window.__bayyinMenuSelect = (i) => setSelected(i);
    window.__bayyinMenuReading = (uri, width, height, pr, old) => { setShot(old ? null : { uri, width, height }); setOver(pr); setStep("reading"); };
  }

  const go = async (source) => {
    let img;
    try { img = await pickImage(source); } catch { return setStep("error"); }
    if (img === "denied") return setStep("denied");
    if (!img) return;
    setShot(img); setOver(null);
    setStep("reading");
    try {
      // lecture avec la position de chaque ligne : les plats sont surlignés sur la photo
      const out = await reader.read(img, OCR_LANGS[getSettings().lang] || OCR_LANGS.fr, { boxes: true });
      setOver(100); await new Promise((r) => setTimeout(r, 650)); // dernière étape visible un instant
      const raw = typeof out === "string" ? out : out.text;
      if (!raw || raw.replace(/[^\p{L}]/gu, "").length < 6) return setStep("empty");
      haptic.success();
      setText(raw);
      // lignes refaites à partir des mots (colonnes séparées), sinon celles du lecteur
      const ls = typeof out === "string" ? null : out.words && out.words.length ? linesFromWords(out.words) : out.lines;
      setLines(ls && ls.length ? ls : null);
      setPhoto(img.width && img.height ? { uri: img.uri, width: img.width, height: img.height } : null);
      reset();
    } catch {
      setStep("error");
    }
  };

  const res = useMemo(() => (lines && !edited ? analyzeMenu(lines, getSettings()) : text ? analyzeMenu(text, getSettings()) : null), [text, lines, edited]);
  const located = !!(photo && lines && !edited && res && res.dishes.some((d) => d.boxes && d.boxes.length));
  const select = (i) => {
    setSelected(i);
    if (located && scrollRef.current) scrollRef.current.scrollTo({ y: Math.max(0, photoY.current - 12), animated: true });
  };
  const list = res ? res.dishes.map((d, i) => ({ ...d, i })).filter((d) => filter === "all" || d.status === filter) : [];
  // intertitres (entrées, plats…) gardés dans l'ordre de la carte
  const blocks = [];
  list.forEach((d) => {
    const last = blocks[blocks.length - 1];
    if (!last || last.section !== d.section) blocks.push({ section: d.section, dishes: [d] });
    else last.dishes.push(d);
  });
  const sel = selected != null && res ? res.dishes[selected] : null;

  return (
    <ToolPage title={t("menu.title")} onClose={onClose} scrollRef={scrollRef}>
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

      {step === "reading" && !shot && typeof window !== "undefined" && window.__bayyin ? <Reading progress={over || 0} text={t("menu.reading")} /> : step === "reading" ? (
        <ScanReading photo={shot} progress={over != null ? over : Math.max(2, reader.progress)} color={TOOL_COLORS.menu} title={t("menu.reading")}
          steps={[{ key: "prep", label: t("scan.step.prep"), until: 3 }, { key: "read", label: t("menu.step.read"), until: 99 }, { key: "dishes", label: t("menu.step.dishes"), until: 101 }]}
          tips={[t("menu.tip.1"), t("menu.tip.2"), t("menu.tip.3")]} />
      ) : null}

      {step === "result" && res ? (
        <FadeIn style={{ gap: 14 }}>
          {/* Résumé : trois compteurs qui servent aussi de filtres (sur la photo et dans la liste) */}
          <View style={{ flexDirection: dir().row, gap: 10 }}>
            {["haram", "mashbouh", "ok"].map((k) => {
              const [fg, bg] = STATUS_COLORS[GROUP[k]];
              const on = filter === k;
              return (
                <Pressable key={k} onPress={() => { haptic.tap(); setFilter(on ? "all" : k); setSelected(null); }} accessibilityRole="button" accessibilityState={{ selected: on }}
                  style={[{ flex: 1, padding: 12, borderRadius: R.lg, gap: 2, backgroundColor: on ? fg : bg, borderWidth: 1, borderColor: fg + "44" }, lift()]}>
                  <Text style={{ fontSize: 26, fontWeight: "900", color: on ? "#fff" : fg }}>{res.count[k]}</Text>
                  <Text numberOfLines={2} style={{ fontSize: 12.5, lineHeight: 16, fontWeight: "800", color: on ? "#fff" : fg }}>{t(`menu.sum.${k}`)}</Text>
                </Pressable>
              );
            })}
          </View>

          {/* La carte elle-même, chaque plat surligné à sa place */}
          {located ? (
            <View onLayout={(e) => { photoY.current = e.nativeEvent.layout.y; }} style={[{ backgroundColor: C.surface, borderRadius: R.xl, padding: 10, gap: 10 }, lift()]}>
              <Row style={{ justifyContent: "space-between", paddingHorizontal: 6, paddingTop: 4 }}>
                <Txt style={{ fontWeight: "800", fontSize: 16 }}>{t("menu.on_photo")}</Txt>
                <Pressable onPress={() => { haptic.tap(); setZoom(true); }} accessibilityRole="button" hitSlop={8} style={{ flexDirection: dir().row, alignItems: "center", gap: 6 }}>
                  <Glyph paths='<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>' size={17} color={C.brand} />
                  <Text style={{ color: C.brand, fontWeight: "800", fontSize: 14 }}>{t("menu.zoom")}</Text>
                </Pressable>
              </Row>
              <View onLayout={(e) => setPhotoW(e.nativeEvent.layout.width)}>
                <MenuPhoto photo={photo} dishes={res.dishes} filter={filter} selected={selected} onSelect={setSelected} width={photoW} />
              </View>
              {sel ? (
                <View style={{ borderRadius: R.lg, overflow: "hidden", borderWidth: 1, borderColor: C.line }}><Dish d={sel} first /></View>
              ) : <Muted style={{ fontSize: 13, textAlign: "center", paddingBottom: 4 }}>{t("menu.tap_hint")}</Muted>}
            </View>
          ) : null}

          {res.dishes.length ? (
            blocks.map((b, i) => (
              <View key={i} style={[{ backgroundColor: C.surface, borderRadius: R.xl, overflow: "hidden" }, lift()]}>
                {b.section ? <Text style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8, fontSize: 13, fontWeight: "900", letterSpacing: 1, color: C.muted }}>{b.section.toUpperCase()}</Text> : <View style={{ height: 2 }} />}
                {b.dishes.map((d, j) => <Dish key={d.i} d={d} first={!b.section && j === 0} selected={d.i === selected} onPress={located ? () => { haptic.tap(); select(d.i); } : undefined} />)}
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
              <TextInput value={text} onChangeText={(x) => { setText(x); setEdited(true); setSelected(null); }} multiline autoCorrect={false}
                style={{ minHeight: 180, textAlignVertical: "top", borderWidth: 1, borderColor: C.line, borderRadius: R.md, padding: 12, fontSize: 15, color: C.fg, backgroundColor: C.bg }} />
            </View>
          ) : null}
          <ToolBtn soft text={editing ? t("travel.done") : t("menu.fix")} paths={TOOL_ICONS.edit} onPress={() => setEditing(!editing)} />
          <ToolBtn text={t("menu.again")} paths={TOOL_ICONS.camera} onPress={() => go("camera")} />
          <Muted style={{ fontSize: 12.5, textAlign: "center" }}>{tn("menu.count", res.dishes.length)}</Muted>
        </FadeIn>
      ) : null}
      {located ? <ZoomPhoto visible={zoom} onClose={() => setZoom(false)} photo={photo} dishes={res.dishes} filter={filter} selected={selected} onSelect={setSelected} /> : null}
      {reader.element}
    </ToolPage>
  );
}
