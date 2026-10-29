// Classements : les produits halal les mieux notés pour la santé, rayon par rayon (selon vos réglages).
// Les listes sont préparées chaque semaine sur le site (data/rankings/<rayon>.json).
import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable, Image } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Txt, Muted, Row, Loading } from "../components/ui";
import { Segmented, Chip } from "../components/Controls";
import { Art, ArtTile, Glyph } from "../components/Art";
import { C, R, GRADE_COLORS, STATUS_COLORS, dir, lift } from "../theme";
import { t } from "../i18n";
import { getSettings } from "../storage";
import { present } from "../core";
import { nameOf, S, profileOf } from "../view";
import { RANK_CATEGORIES, rankIndex, rankProducts, rankList, rankTab } from "../../../public/lib/rankings.js";
import { RANK_ART } from "../../../public/lib/rank-art.js";
import { mascot } from "../../../public/lib/mascot.js";
import { haptic } from "../motion";

const MEDAL = ["#E2A812", "#A7B0B8", "#C98A4A"];

function Header({ title, onBack }) {
  return (
    <Row gap={6}>
      <Pressable onPress={onBack} hitSlop={10} accessibilityRole="button" accessibilityLabel={t("sheet.back")} style={{ padding: 4, transform: [{ scaleX: dir().rtl ? -1 : 1 }] }}>
        <Glyph paths='<path d="M15 5l-7 7 7 7"/>' size={24} color={C.fg} width={2.2} />
      </Pressable>
      <Text accessibilityRole="header" numberOfLines={1} style={{ flex: 1, fontSize: 24, fontWeight: "800", letterSpacing: -0.4, color: C.fg, textAlign: dir().ta }}>{title}</Text>
    </Row>
  );
}

function CategoryList({ onPick, onBack }) {
  const [kind, setKind] = useState("food");
  const [index, setIndex] = useState(null);
  useEffect(() => { rankIndex().then(setIndex).catch(() => setIndex(false)); }, []);
  const cats = RANK_CATEGORIES.filter((c) => rankTab(c) === kind && (!index || index.categories[c.id]));
  return (
    <View style={{ gap: 16 }}>
      <Header title={t("rank.title")} onBack={onBack} />
      <Row gap={14} style={{ alignItems: "center" }}>
        <Art xml={mascot("bravo", { size: 72 })} size={72} />
        <Txt style={{ flex: 1, fontSize: 15.5, lineHeight: 22, color: C.muted }}>{t("rank.intro")}</Txt>
      </Row>
      <Segmented items={["food", "beauty", "makeup"].map((k) => [k, t(`rank.kind.${k}`)])} value={kind} onChange={setKind} />
      {kind === "makeup" ? <Muted style={{ fontSize: 13 }}>{t("rank.makeup_note")}</Muted> : null}
      <View style={[{ backgroundColor: C.surface, borderRadius: R.lg, overflow: "hidden" }, lift()]}>
        {cats.map((c, i) => (
          <Pressable key={c.id} onPress={() => { haptic.tap(); onPick(c); }} accessibilityRole="button"
            style={({ pressed }) => ({ flexDirection: dir().row, alignItems: "center", gap: 14, paddingHorizontal: 14, paddingVertical: 11, backgroundColor: pressed ? C.tint : "transparent", borderTopWidth: i ? 0.5 : 0, borderTopColor: C.line })}>
            <ArtTile xml={RANK_ART[c.id]} size={48} />
            <Text style={{ flex: 1, fontSize: 16, fontWeight: "700", color: C.fg, textAlign: dir().ta }}>{t(`rank.cat.${c.id}`)}</Text>
            <Glyph name="chev" size={17} color={C.faint} />
          </Pressable>
        ))}
      </View>
      {index ? <Muted style={{ fontSize: 12.5 }}>{t("rank.source", { d: new Date(index.updated).toLocaleDateString() })}</Muted> : null}
    </View>
  );
}

function Ranking({ cat, onBack, onOpen }) {
  const [raws, setRaws] = useState(null);
  const [certOnly, setCertOnly] = useState(false);
  useEffect(() => { rankProducts(cat.id).then(setRaws).catch(() => setRaws(false)); }, [cat.id]);
  const st = getSettings();
  const list = raws ? rankList(raws, {
    present: (raw) => present(raw, st),
    scoreOf: (p) => p.health && p.health.score,
    alertOf: (p) => profileOf(p).alert,
    certifiedOnly: certOnly,
  }).slice(0, 50) : [];
  return (
    <View style={{ gap: 14 }}>
      <Header title={t(`rank.cat.${cat.id}`)} onBack={onBack} />
      <Row gap={8}>
        <Chip text={t("rank.f.all")} on={!certOnly} onPress={() => setCertOnly(false)} />
        <Chip text={t("rank.f.cert")} on={certOnly} onPress={() => setCertOnly(true)} />
      </Row>
      <Muted style={{ fontSize: 13 }}>{t("rank.basis", { school: t(`school.${st.school}`) })}</Muted>
      {raws === null ? <Loading text={t("msg.loading")} /> : raws === false ? (
        <View style={{ alignItems: "center", gap: 6, paddingVertical: 24 }}><Txt style={{ fontWeight: "800" }}>{t("rank.error.t")}</Txt><Muted>{t("rank.error.p")}</Muted></View>
      ) : list.length ? (
        <View style={[{ backgroundColor: C.surface, borderRadius: R.lg, overflow: "hidden" }, lift()]}>
          {list.map((p, i) => {
            const s = p.health.score;
            const gc = GRADE_COLORS[s.grade];
            const [sf, sb] = STATUS_COLORS[p.verdict.status];
            return (
              <Pressable key={p.code} onPress={() => { haptic.tap(); onOpen(p.code, { product: p }); }} accessibilityRole="button" accessibilityLabel={`${i + 1}. ${nameOf(p)}, ${s.score}/100`}
                style={({ pressed }) => ({ flexDirection: dir().row, alignItems: "center", gap: 10, paddingHorizontal: 12, paddingVertical: 12, backgroundColor: pressed ? C.tint : "transparent", borderTopWidth: i ? 0.5 : 0, borderTopColor: C.line })}>
                <View style={{ width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: i < 3 ? MEDAL[i] : "transparent" }}>
                  <Text style={{ fontWeight: "800", fontSize: 14, color: i < 3 ? "#fff" : C.muted }}>{i + 1}</Text>
                </View>
                {p.image ? <Image source={{ uri: p.image }} resizeMode="contain" style={{ width: 52, height: 52, borderRadius: 12, backgroundColor: "#fff" }} />
                  : <ArtTile xml={RANK_ART[cat.id]} size={52} radius={12} />}
                <View style={{ flex: 1, gap: 3 }}>
                  <Text numberOfLines={2} style={{ fontSize: 15, fontWeight: "700", color: C.fg, lineHeight: 19, textAlign: dir().ta }}>{nameOf(p)}</Text>
                  {p.brand ? <Text numberOfLines={1} style={{ fontSize: 12.5, color: C.muted, textAlign: dir().ta }}>{p.brand}</Text> : null}
                  <View style={{ height: 4, borderRadius: 2, backgroundColor: C.tint2, overflow: "hidden" }}><View style={{ width: `${s.score}%`, height: "100%", backgroundColor: gc }} /></View>
                  <View style={{ flexDirection: dir().row, alignItems: "center", gap: 5, alignSelf: dir().rtl ? "flex-end" : "flex-start", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 99, backgroundColor: sb }}>
                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: sf }} /><Text style={{ fontSize: 11.5, fontWeight: "800", color: sf }}>{S(p.verdict.status, "short")}</Text>
                  </View>
                </View>
                <View style={{ alignItems: "center", minWidth: 54 }}>
                  <Text style={{ fontSize: 20, fontWeight: "800", color: gc }}>{s.score}<Text style={{ fontSize: 11, color: C.muted }}>/100</Text></Text>
                  <Text style={{ fontSize: 11, fontWeight: "700", color: gc }}>{t(`grade.${s.grade}`)}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      ) : (
        <View style={{ alignItems: "center", gap: 6, paddingVertical: 24 }}>
          <Txt style={{ fontWeight: "800" }}>{t("rank.empty.t")}</Txt>
          <Muted style={{ textAlign: "center" }}>{t(certOnly ? "rank.empty.cert" : "rank.empty.p")}</Muted>
        </View>
      )}
      <Muted style={{ fontSize: 12.5 }}>{t("rank.note")}</Muted>
    </View>
  );
}

export default function RankingsScreen({ onClose, onOpen }) {
  const insets = useSafeAreaInsets();
  const [cat, setCat] = useState(null);
  if (typeof window !== "undefined") window.__bayyinRankCat = (id) => setCat(id ? RANK_CATEGORIES.find((c) => c.id === id) : null);
  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: insets.top + 12, paddingBottom: insets.bottom + 40 }}>
      {cat ? <Ranking cat={cat} onBack={() => setCat(null)} onOpen={onOpen} /> : <CategoryList onPick={setCat} onBack={onClose} />}
    </ScrollView>
  );
}
