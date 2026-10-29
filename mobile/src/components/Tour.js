// Visite guidée : l'écran s'assombrit, l'élément présenté reste éclairé et une carte l'explique.
// Même parcours que la version web (scan, photo, classements, onglets), mascotte à la fin.
import React, { useEffect, useState } from "react";
import { View, Text, Pressable, useWindowDimensions } from "react-native";
import Svg, { Path, Rect } from "react-native-svg";
import { Txt, Muted, FadeIn } from "./ui";
import { Art, Tile } from "./Art";
import { C, R, dir, lift } from "../theme";
import { t } from "../i18n";
import { haptic } from "../motion";
import { mascot } from "../../../public/lib/mascot.js";

// Les écrans enregistrent ici les éléments à éclairer : ref={tourRef("scan")}
export const tourTargets = {};
export const tourRef = (id) => (el) => { if (el) tourTargets[id] = el; else delete tourTargets[id]; };

export const TOUR = [
  { id: "scan", c: "#1A9C68", i: '<path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2M7 8v8M10 8v8M13 8v8M16 8v8"/>' },
  { id: "photo", c: "#8A63DA", i: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.4"/>' },
  { id: "rankings", c: "#E2A812", i: '<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M9 20h6M10 17h4"/>' },
  { id: "search", c: "#3D84DB", i: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4 4"/>' },
  { id: "history", c: "#2F6FC0", i: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>' },
  { id: "additives", c: "#9B79E2", i: '<path d="M9 3h6M10 3v6.2L4.8 18a2 2 0 0 0 1.7 3h11a2 2 0 0 0 1.7-3L14 9.2V3"/><path d="M7.5 15h9"/>' },
  { id: "settings", c: "#5A6472", i: '<circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/>' },
  { id: "end" },
];

function measure(id) {
  const el = tourTargets[id];
  return new Promise((ok) => {
    if (!el || !el.measureInWindow) return ok(null);
    el.measureInWindow((x, y, w, h) => ok(w && h ? { x, y, w, h } : null));
  });
}

export default function Tour({ start = 0, onDone, onScan }) {
  const { width: W, height: H } = useWindowDimensions();
  const [i, setI] = useState(start);
  const [box, setBox] = useState(undefined); // undefined : mesure en cours ; null : pas d'élément (carte au centre)
  const step = TOUR[i];
  const last = step.id === "end";
  useEffect(() => { setI(start); }, [start]);
  useEffect(() => {
    let live = true;
    setBox(undefined);
    if (last) { setBox(null); return; }
    // petite attente : l'écran d'accueil peut finir de se mettre en place
    const id = setTimeout(() => measure(step.id).then((b) => live && setBox(b)), 60);
    return () => { live = false; clearTimeout(id); };
  }, [i]);

  const next = () => { haptic.tap(); if (last) onDone(); else setI(i + 1); };
  const pad = 8;
  const hole = box ? { x: box.x - pad, y: box.y - pad, w: box.w + pad * 2, h: box.h + pad * 2, r: Math.min(22, (box.h + pad * 2) / 2) } : null;
  const below = hole && hole.y + hole.h / 2 < H * 0.5;
  const cardPos = !hole ? { top: H * 0.22 } : below ? { top: hole.y + hole.h + 14 } : { bottom: H - hole.y + 14 };
  const holePath = hole
    ? `M${hole.x + hole.r} ${hole.y}H${hole.x + hole.w - hole.r}A${hole.r} ${hole.r} 0 0 1 ${hole.x + hole.w} ${hole.y + hole.r}V${hole.y + hole.h - hole.r}A${hole.r} ${hole.r} 0 0 1 ${hole.x + hole.w - hole.r} ${hole.y + hole.h}H${hole.x + hole.r}A${hole.r} ${hole.r} 0 0 1 ${hole.x} ${hole.y + hole.h - hole.r}V${hole.y + hole.r}A${hole.r} ${hole.r} 0 0 1 ${hole.x + hole.r} ${hole.y}Z`
    : "";
  const steps = TOUR.length - 1;

  return (
    <View style={{ position: "absolute", left: 0, top: 0, width: W, height: H }} accessibilityViewIsModal>
      <Pressable style={{ position: "absolute", left: 0, top: 0, width: W, height: H }} onPress={next} accessibilityElementsHidden importantForAccessibility="no">
        <Svg width={W} height={H}>
          <Path d={`M0 0H${W}V${H}H0Z ${holePath}`} fill="rgba(6,16,11,0.66)" fillRule="evenodd" />
          {hole ? <Rect x={hole.x} y={hole.y} width={hole.w} height={hole.h} rx={hole.r} fill="none" stroke="#fff" strokeOpacity={0.85} strokeWidth={2} /> : null}
        </Svg>
      </Pressable>
      {box === undefined ? null : (
        <FadeIn key={i} distance={8} style={[{ position: "absolute", left: 16, right: 16, maxWidth: 520, alignSelf: "center" }, cardPos]}>
          <View accessibilityRole="alert" style={[{ backgroundColor: C.surface, borderRadius: R.xl, padding: 18, gap: 12 }, lift()]}>
            {last ? (
              <View style={{ alignItems: "center", gap: 8 }}>
                <Art xml={mascot("bravo", { size: 128 })} size={128} />
                <Text style={{ fontSize: 22, fontWeight: "800", color: C.fg, textAlign: "center" }}>{t("tour.end.t")}</Text>
                <Muted style={{ textAlign: "center" }}>{t("tour.end.p")}</Muted>
              </View>
            ) : (
              <View style={{ flexDirection: dir().row, gap: 14, alignItems: "flex-start" }}>
                <Tile color={step.c} paths={step.i} size={44} />
                <View style={{ flex: 1, gap: 4 }}>
                  <Txt style={{ fontSize: 18, fontWeight: "800" }}>{t(`tour.${step.id}.t`)}</Txt>
                  <Muted style={{ fontSize: 14.5, lineHeight: 21 }}>{t(`tour.${step.id}.p`)}</Muted>
                </View>
              </View>
            )}
            {last ? (
              <View style={{ gap: 8 }}>
                <Pressable onPress={() => { haptic.light(); onDone(); onScan && onScan(); }} accessibilityRole="button"
                  style={({ pressed }) => ({ paddingVertical: 14, borderRadius: 16, backgroundColor: C.brand, alignItems: "center", opacity: pressed ? 0.85 : 1 })}>
                  <Text style={{ color: "#fff", fontWeight: "800", fontSize: 16 }}>{t("tour.go")}</Text>
                </Pressable>
                <Pressable onPress={onDone} accessibilityRole="button" style={{ paddingVertical: 10, alignItems: "center" }}>
                  <Text style={{ color: C.muted, fontWeight: "700", fontSize: 15 }}>{t("tour.close")}</Text>
                </Pressable>
              </View>
            ) : (
              <View style={{ flexDirection: dir().row, alignItems: "center", gap: 10 }}>
                <View style={{ flex: 1, flexDirection: dir().row, gap: 5 }} accessible accessibilityLabel={`${i + 1} / ${steps}`}>
                  {TOUR.slice(0, -1).map((s, k) => <View key={s.id} style={{ width: k === i ? 18 : 6, height: 6, borderRadius: 3, backgroundColor: k === i ? step.c : C.tint2 }} />)}
                </View>
                <Pressable onPress={onDone} accessibilityRole="button" hitSlop={8} style={{ paddingHorizontal: 8, paddingVertical: 8 }}>
                  <Text style={{ color: C.muted, fontWeight: "700", fontSize: 14.5 }}>{t("tour.skip")}</Text>
                </Pressable>
                <Pressable onPress={next} accessibilityRole="button"
                  style={({ pressed }) => ({ paddingHorizontal: 18, paddingVertical: 10, borderRadius: 999, backgroundColor: C.fg, opacity: pressed ? 0.85 : 1 })}>
                  <Text style={{ color: C.bg, fontWeight: "800", fontSize: 14.5 }}>{t("tour.next")}</Text>
                </Pressable>
              </View>
            )}
          </View>
        </FadeIn>
      )}
    </View>
  );
}
