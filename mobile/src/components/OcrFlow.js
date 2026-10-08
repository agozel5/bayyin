// Photo de la liste d'ingrédients -> texte (OCR) -> analyse.
// La lecture se fait sur le téléphone avec Tesseract.js, exécuté dans une WebView invisible
// (même moteur et même prétraitement que la version web).
import React, { useEffect, useRef, useState } from "react";
import { View, Text, TextInput, ScrollView, Pressable, KeyboardAvoidingView, Platform } from "react-native";
import { WebView } from "react-native-webview";
import * as ImagePicker from "expo-image-picker";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Icon from "./Icon";
import { Txt, H2, Muted, Btn, Message } from "./ui";
import { C, R, dir } from "../theme";
import { t, getLang } from "../i18n";
import { present, additivesFromText, cleanOcrText } from "../core";
import { getSettings, setLocal, addToHistory } from "../storage";

const OCR_LANGS = { fr: "fra+eng", en: "eng+fra", tr: "tur+eng", ar: "ara+eng" };

const ocrHtml = (img, langs) => `<!doctype html><html><head><meta name="viewport" content="width=device-width"></head><body>
<script src="https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js"></script>
<script>
const send = (o) => window.ReactNativeWebView.postMessage(JSON.stringify(o));
window.onerror = (m) => send({ type: "error", message: String(m) });
async function prepare(src) {
  const img = await new Promise((ok, ko) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => ko(new Error("image")); i.src = src; });
  const longest = Math.max(img.naturalWidth, img.naturalHeight);
  const scale = longest > 2200 ? 2200 / longest : longest < 1000 ? 1000 / longest : 1;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.naturalWidth * scale);
  canvas.height = Math.round(img.naturalHeight * scale);
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const px = data.data;
  const hist = new Uint32Array(256);
  for (let i = 0; i < px.length; i += 4) {
    const g = (px[i] * 299 + px[i + 1] * 587 + px[i + 2] * 114) / 1000;
    px[i] = px[i + 1] = px[i + 2] = g;
    hist[g | 0]++;
  }
  const total = px.length / 4;
  let lo = 0, hi = 255, acc = 0;
  while (lo < 255 && (acc += hist[lo]) < total * 0.01) lo++;
  acc = 0;
  while (hi > 0 && (acc += hist[hi]) < total * 0.01) hi--;
  const range = Math.max(1, hi - lo);
  for (let i = 0; i < px.length; i += 4) {
    const v = Math.max(0, Math.min(255, ((px[i] - lo) * 255) / range));
    px[i] = px[i + 1] = px[i + 2] = v;
  }
  ctx.putImageData(data, 0, 0);
  return canvas;
}
(async () => {
  try {
    if (!window.Tesseract) throw new Error("tesseract");
    const canvas = await prepare(${JSON.stringify(img)});
    const worker = await Tesseract.createWorker(${JSON.stringify(langs)}, 1, {
      logger: (m) => { if (m && m.status === "recognizing text") send({ type: "progress", n: Math.round((m.progress || 0) * 100) }); },
    });
    const { data } = await worker.recognize(canvas);
    send({ type: "done", text: (data && data.text) || "" });
    worker.terminate();
  } catch (e) {
    send({ type: "error", message: String((e && e.message) || e) });
  }
})();
</script></body></html>`;

export default function OcrFlow({ code, onDone, onClose }) {
  const insets = useSafeAreaInsets();
  // step : photo | reading | review | empty | error
  const [step, setStep] = useState("photo");
  const [html, setHtml] = useState(null);
  const [progress, setProgress] = useState(0);
  const [text, setText] = useState("");
  const [name, setName] = useState("");
  const timer = useRef(null);

  const takePhoto = async () => {
    setStep("photo");
    setHtml(null);
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) return setStep("denied");
      const res = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.6, base64: true, exif: false });
      if (res.canceled || !res.assets || !res.assets[0] || !res.assets[0].base64) return onClose();
      const a = res.assets[0];
      const mime = a.mimeType || "image/jpeg";
      setProgress(0);
      setStep("reading");
      setHtml(ocrHtml(`data:${mime};base64,${a.base64}`, OCR_LANGS[getLang()] || OCR_LANGS.fr));
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setStep((s) => (s === "reading" ? "error" : s)), 120000);
    } catch {
      setStep("error");
    }
  };

  useEffect(() => {
    takePhoto();
    return () => clearTimeout(timer.current);
  }, []);

  const onMessage = (e) => {
    let msg;
    try {
      msg = JSON.parse(e.nativeEvent.data);
    } catch {
      return;
    }
    if (msg.type === "progress") setProgress(msg.n);
    if (msg.type === "done") {
      clearTimeout(timer.current);
      setHtml(null);
      const clean = cleanOcrText(msg.text);
      if (!clean || clean.replace(/[^\p{L}]/gu, "").length < 6) return setStep("empty");
      setText(clean);
      setStep("review");
    }
    if (msg.type === "error") {
      clearTimeout(timer.current);
      setHtml(null);
      setStep("error");
    }
  };

  const analyze = () => {
    const body = text.trim();
    if (!body) return;
    const raw = {
      code: code || `local-${Date.now()}`,
      product_name: name.trim() || t("ocr.unnamed"),
      ingredients_text: body,
      additives_tags: additivesFromText(body),
      categories_tags: [],
      local: true,
    };
    if (code) setLocal(code, raw);
    const p = present(raw, getSettings());
    addToHistory(p);
    onDone(p, !!code);
  };

  const field = {
    borderWidth: 1.5, borderColor: C.line, borderRadius: R.md, padding: 14, fontSize: 16, color: C.fg, backgroundColor: "#fff",
    textAlign: dir().ta, writingDirection: dir().rtl ? "rtl" : "ltr",
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.bg }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={{ paddingTop: insets.top, flexDirection: dir().row, alignItems: "center", gap: 8, paddingHorizontal: 12, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: C.line }}>
        <Pressable onPress={onClose} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: C.tint, alignItems: "center", justifyContent: "center" }} accessibilityLabel={t("sheet.back")}>
          <Icon name="back" size={22} flip={dir().rtl} />
        </Pressable>
        <Txt style={{ flex: 1, fontWeight: "800", fontSize: 17 }}>{t("ocr.title")}</Txt>
      </View>

      <ScrollView contentContainerStyle={{ padding: 18, gap: 14, paddingBottom: 30 + insets.bottom }} keyboardShouldPersistTaps="handled">
        {step === "photo" ? <Muted>{t("ocr.loading")}</Muted> : null}

        {step === "reading" ? (
          <View style={{ backgroundColor: C.tint, borderRadius: R.lg, padding: 22, gap: 12 }}>
            <Txt style={{ fontWeight: "800", fontSize: 17 }}>{progress ? t("ocr.reading", { n: progress }) : t("ocr.loading")}</Txt>
            <Muted style={{ fontSize: 14 }}>{t("ocr.loading_note")}</Muted>
            <View style={{ height: 8, borderRadius: 4, backgroundColor: C.line, overflow: "hidden", flexDirection: dir().row }}>
              <View style={{ width: `${Math.max(3, progress)}%`, backgroundColor: C.brand }} />
            </View>
          </View>
        ) : null}

        {step === "review" ? (
          <>
            <H2>{t("ocr.review")}</H2>
            <Muted>{t("ocr.review_hint")}</Muted>
            <TextInput value={text} onChangeText={setText} multiline autoCorrect={false} spellCheck={false} style={[field, { minHeight: 180, textAlignVertical: "top" }]} />
            <Muted style={{ fontSize: 14 }}>{t("ocr.name")}</Muted>
            <TextInput value={name} onChangeText={setName} style={field} returnKeyType="done" />
            <Btn title={t("ocr.analyze")} onPress={analyze} />
            <Btn title={t("ocr.retake")} kind="soft" icon="camera" onPress={takePhoto} />
          </>
        ) : null}

        {step === "empty" ? (
          <Message title={t("ocr.empty.t")} text={t("ocr.empty.p")}>
            <Btn title={t("ocr.retake")} icon="camera" onPress={takePhoto} />
          </Message>
        ) : null}

        {step === "error" ? (
          <Message title={t("msg.reader_error.t")} text={t("ocr.error.p")}>
            <Btn title={t("msg.retry")} icon="camera" onPress={takePhoto} />
          </Message>
        ) : null}

        {step === "denied" ? (
          <Message title={t("cam.err.denied.t")} text={t("cam.err.denied.p")}>
            <Btn title={t("msg.retry")} onPress={takePhoto} />
          </Message>
        ) : null}
      </ScrollView>

      {html ? (
        <View style={{ position: "absolute", width: 1, height: 1, opacity: 0, left: 0, bottom: 0 }} pointerEvents="none">
          <WebView
            source={{ html, baseUrl: "https://agozel5.github.io/bayyin/" }}
            originWhitelist={["*"]}
            javaScriptEnabled
            onMessage={onMessage}
            onError={() => setStep("error")}
          />
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}
