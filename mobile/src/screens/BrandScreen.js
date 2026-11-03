// Carte d'une marque : part de produits halal, certifications rencontrées et produits classés par
// verdict (les plus scannés sur Open Food Facts et Open Beauty Facts). Ouverte depuis une fiche
// (touchez la marque) ou depuis l'outil « Marques » de l'accueil.
import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, Pressable, Animated, Easing } from "react-native";
import { Txt, Muted, Row, FadeIn, Skeleton, ProductRow } from "../components/ui";
import { Glyph } from "../components/Art";
import { SearchBox, Chip, ChipRow } from "../components/Controls";
import { ToolPage, ToolIntro, TOOL_ICONS, TOOL_COLORS } from "../components/ToolKit";
import { C, R, dir, lift, STATUS_COLORS } from "../theme";
import { t, tn } from "../i18n";
import { haptic, ms } from "../motion";
import { S, errorText } from "../view";
import { getHistory } from "../storage";
import { fetchBrand } from "../api";
import { summarizeBrand, mainBrand, BRAND_GROUPS } from "../../../public/lib/brand.js";

const SHOW = 6;

// Marques des produits déjà scannés (les plus fréquentes d'abord)
function knownBrands() {
  const n = new Map();
  for (const e of getHistory()) {
    const b = mainBrand(e.p && (e.p.brand || (e.p.raw && e.p.raw.brands)));
    if (b && b.length > 1) n.set(b, (n.get(b) || 0) + 1);
  }
  return [...n.entries()].sort((a, b) => b[1] - a[1]).map(([b]) => b).slice(0, 14);
}

// Barre empilée qui se remplit à l'ouverture
function GroupBar({ sum }) {
  const grow = useRef(new Animated.Value(ms(1) ? 0 : 1)).current;
  useEffect(() => { Animated.timing(grow, { toValue: 1, duration: ms(700), easing: Easing.out(Easing.cubic), useNativeDriver: false }).start(); }, [sum.total]);
  return (
    <View style={{ height: 12, borderRadius: 6, overflow: "hidden", backgroundColor: C.tint2, flexDirection: dir().row }}>
      <Animated.View style={{ flexDirection: dir().row, width: grow.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }), gap: 2 }}>
        {BRAND_GROUPS.filter((k) => sum.groups[k].length).map((k) => <View key={k} style={{ flex: sum.groups[k].length, backgroundColor: STATUS_COLORS[k][0] }} />)}
      </Animated.View>
    </View>
  );
}

function Group({ k, list, onOpen }) {
  const [all, setAll] = useState(false);
  const [fg] = STATUS_COLORS[k];
  const shown = all ? list : list.slice(0, SHOW);
  return (
    <View style={[{ backgroundColor: C.surface, borderRadius: R.xl, overflow: "hidden" }, lift()]}>
      <Row gap={10} style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 4 }}>
        <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: fg }} />
        <Txt style={{ flex: 1, fontWeight: "800", fontSize: 16.5 }}>{S(k, "label")}</Txt>
        <Text style={{ color: fg, fontWeight: "900", fontSize: 16 }}>{list.length}</Text>
      </Row>
      <View style={{ paddingHorizontal: 4 }}>
        {shown.map((p) => <ProductRow key={p.code} p={p} onPress={() => onOpen(p.code, { product: p })} />)}
      </View>
      {list.length > SHOW ? (
        <Pressable onPress={() => { haptic.tap(); setAll(!all); }} accessibilityRole="button" style={{ padding: 14, alignItems: "center" }}>
          <Text style={{ color: C.brand, fontWeight: "800", fontSize: 14.5 }}>{all ? t("brand.less") : t("brand.more", { n: list.length - SHOW })}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export default function BrandScreen({ brand: initial, onClose, onOpen }) {
  const [brand, setBrand] = useState(initial || "");
  const [q, setQ] = useState("");
  const [st, setSt] = useState({ loading: !!initial, list: null, error: null });
  const job = useRef(0);
  const known = useMemo(knownBrands, []);

  const load = async (name) => {
    const n = ++job.current;
    setBrand(name);
    setSt({ loading: true, list: null, error: null });
    try {
      const list = await fetchBrand(name, (cached) => { if (n === job.current) setSt({ loading: true, list: cached, error: null }); });
      if (n === job.current) setSt({ loading: false, list, error: null });
    } catch (e) {
      if (n === job.current) setSt((s) => ({ loading: false, list: s.list, error: s.list ? null : e }));
    }
  };
  useEffect(() => { if (initial) load(initial); }, []);
  const submit = () => { const v = q.trim(); if (v) { haptic.tap(); load(v); } };

  const sum = st.list ? summarizeBrand(st.list) : null;

  return (
    <ToolPage title={brand || t("brand.title")} onClose={onClose}>
      {!initial ? (
        <View style={{ gap: 10 }}>
          <SearchBox value={q} onChangeText={setQ} placeholder={t("brand.search_ph")} onSubmit={submit} autoFocus={!brand && !known.length} />
          {known.length ? (
            <ChipRow>
              {known.map((b) => <Chip key={b} text={b} on={b === brand} onPress={() => { setQ(b); load(b); }} />)}
            </ChipRow>
          ) : null}
        </View>
      ) : null}

      {!brand ? (
        <ToolIntro color={TOOL_COLORS.brand} paths={TOOL_ICONS.brand} title={t("brand.intro_t")} text={t("brand.intro_p")} />
      ) : null}

      {brand && st.loading && !st.list ? (
        <View style={{ gap: 12 }}>
          <Skeleton height={120} radius={22} />
          <Skeleton height={64} radius={18} />
          <Skeleton height={64} radius={18} />
        </View>
      ) : null}

      {st.error ? (
        <View style={{ backgroundColor: C.tint, borderRadius: R.lg, padding: 18, gap: 10 }}>
          <Txt style={{ fontWeight: "800" }}>{t("brand.error")}</Txt>
          <Muted>{errorText(st.error)}</Muted>
          <Pressable onPress={() => load(brand)} accessibilityRole="button"><Text style={{ color: C.brand, fontWeight: "800" }}>{t("msg.retry")}</Text></Pressable>
        </View>
      ) : null}

      {sum && !sum.total ? <Muted>{t("brand.none", { b: brand })}</Muted> : null}

      {sum && sum.total ? (
        <FadeIn style={{ gap: 14 }}>
          <View style={[{ backgroundColor: C.surface, borderRadius: R.xl, padding: 18, gap: 12 }, lift()]}>
            <Row style={{ alignItems: "flex-end", justifyContent: "space-between" }}>
              <View style={{ gap: 2, flex: 1 }}>
                <Text style={{ fontSize: 40, fontWeight: "900", color: STATUS_COLORS.halal_probable[0], letterSpacing: -1 }}>{sum.share}%</Text>
                <Muted style={{ fontSize: 14 }}>{t("brand.share")}</Muted>
              </View>
              <Muted style={{ fontSize: 13.5, textAlign: dir().rtl ? "left" : "right" }}>{tn("brand.count", sum.total)}</Muted>
            </Row>
            <GroupBar sum={sum} />
            <View style={{ flexDirection: dir().row, flexWrap: "wrap", gap: 12 }}>
              {BRAND_GROUPS.filter((k) => sum.groups[k].length).map((k) => (
                <Row key={k} gap={6}><View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: STATUS_COLORS[k][0] }} /><Text style={{ fontSize: 13, fontWeight: "700", color: C.fg }}>{sum.groups[k].length} {S(k, "short").toLowerCase()}</Text></Row>
              ))}
            </View>
            {sum.certs.length ? (
              <View style={{ gap: 6, paddingTop: 4 }}>
                <Muted style={{ fontSize: 13, fontWeight: "700" }}>{t("brand.certs")}</Muted>
                <View style={{ flexDirection: dir().row, flexWrap: "wrap", gap: 6 }}>
                  {sum.certs.map((c) => (
                    <View key={c.name} style={{ flexDirection: dir().row, alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 99, backgroundColor: STATUS_COLORS.halal_certifie[1] }}>
                      <Glyph name="shield" size={14} color={STATUS_COLORS.halal_certifie[0]} />
                      <Text style={{ color: STATUS_COLORS.halal_certifie[0], fontWeight: "800", fontSize: 12.5 }}>{c.name} · {c.n}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}
          </View>

          {BRAND_GROUPS.filter((k) => sum.groups[k].length).map((k) => <Group key={k} k={k} list={sum.groups[k]} onOpen={onOpen} />)}
          <Muted style={{ fontSize: 12.5, lineHeight: 18 }}>{t("brand.note")}</Muted>
        </FadeIn>
      ) : null}
    </ToolPage>
  );
}
