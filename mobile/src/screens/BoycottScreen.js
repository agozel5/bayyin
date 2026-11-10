// Appels au boycott : la liste des entreprises (par catégorie), toutes les marques reconnues, les produits
// de l'historique concernés, et pour chaque entreprise une page détaillée : ce que dit la source, les
// marques, de vrais produits (photos d'Open Food Facts) et, si on vient d'une fiche, des alternatives.
// Bayyin rapporte l'information sans prendre position ; tout est réglable dans Réglages › Appels au boycott.
import React, { useEffect, useMemo, useState } from "react";
import { View, Text, ScrollView, Pressable, Linking, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import SubStack from "../components/SubStack";
import { Txt, Muted, Row, Skeleton, FadeIn } from "../components/ui";
import { Segmented, Chip, ChipRow } from "../components/Controls";
import { Glyph, Tile } from "../components/Art";
import { Img } from "../components/Img";
import { ListRow, Thumb } from "../components/Cards";
import EmptyState from "../components/Empty";
import { C, R, dir, lift } from "../theme";
import { t, tn } from "../i18n";
import { haptic } from "../motion";
import { getHistory, getSettings } from "../storage";
import { mailto } from "../config";
import { relTime, nameOf, verdictOf, S } from "../view";
import { fetchAlternatives, fetchBoycottData } from "../api";
import { BOYCOTT, BOYCOTT_SOURCE, kindOfEntry } from "../../../public/lib/boycott.js";
import { BOYCOTT_COLOR, BOYCOTT_ICON, boycottFor, boycottText, checkedDate, whyKey } from "../boycott";

const KINDS = ["bds", "israel", "organic"];
const entryOf = (id) => BOYCOTT.find((e) => e.id === id);
const titleOf = (e) => (e.id === "israel" ? t("boycott.israel_row") : e.company);

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

const SectionTitle = ({ children }) => (
  <Text style={{ fontSize: 12.5, fontWeight: "800", color: C.muted, letterSpacing: 0.5, textTransform: "uppercase", textAlign: dir().ta }}>{children}</Text>
);

function KindChip({ kind }) {
  return (
    <View style={{ alignSelf: dir().rtl ? "flex-end" : "flex-start", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 99, backgroundColor: BOYCOTT_COLOR + "1F" }}>
      <Text style={{ color: BOYCOTT_COLOR, fontWeight: "800", fontSize: 11.5 }}>{t(`boycott.k.${kind}`)}</Text>
    </View>
  );
}

// Trois vraies photos de produits de l'entreprise, superposées (ou l'icône quand il n'y en a pas)
function Mosaic({ products, size = 64 }) {
  const pics = (products || []).slice(0, 3);
  if (!pics.length) return <Tile color={BOYCOTT_COLOR} paths={BOYCOTT_ICON} size={size} />;
  const w = size * 0.62;
  return (
    <View style={{ width: size, height: size }}>
      {pics.map((p, i) => (
        <View key={p.code} style={{ position: "absolute", top: i === 1 ? 0 : size - w - (i === 2 ? 0 : size * 0.12), left: i === 0 ? 0 : i === 1 ? size - w : size * 0.2,
          width: w, height: w, borderRadius: 10, backgroundColor: "#fff", borderWidth: 2, borderColor: C.surface, overflow: "hidden", zIndex: 3 - i }}>
          <Img uri={p.image} style={{ width: "100%", height: "100%" }} fit="contain" />
        </View>
      ))}
    </View>
  );
}

function CompanyCard({ e, data, onPress }) {
  const products = data && data.companies && data.companies[e.id] ? data.companies[e.id].products : [];
  const brands = (e.shown || []).length;
  return (
    <Pressable onPress={() => { haptic.tap(); onPress(); }} accessibilityRole="button" accessibilityLabel={titleOf(e)}
      style={({ pressed }) => [{ flexDirection: dir().row, alignItems: "center", gap: 14, padding: 14, borderRadius: R.lg, backgroundColor: C.surface, transform: [{ scale: pressed ? 0.985 : 1 }] }, lift()]}>
      <Mosaic products={products} />
      <View style={{ flex: 1, gap: 4 }}>
        <Txt style={{ fontWeight: "800", fontSize: 16.5 }}>{titleOf(e)}</Txt>
        <KindChip kind={kindOfEntry(e)} />
        <Muted style={{ fontSize: 13 }}>{e.id === "israel" ? t("boycott.israel_short") : tn("boycott.n_brands", brands)}</Muted>
      </View>
      <Glyph name="chev" size={17} color={C.faint} />
    </Pressable>
  );
}

// Liste des entreprises, avec un filtre par catégorie
function Companies({ data, onPick }) {
  const [kind, setKind] = useState("all");
  const kinds = { bds: true, organic: true, israel: true, ...(getSettings().boycottKinds || {}) };
  const list = BOYCOTT.filter((e) => kinds[kindOfEntry(e)] !== false && (kind === "all" || kindOfEntry(e) === kind));
  const order = KINDS.flatMap((k) => list.filter((e) => kindOfEntry(e) === k));
  return (
    <View style={{ gap: 12 }}>
      <ChipRow>
        {["all", ...KINDS.filter((k) => kinds[k] !== false)].map((k) => (
          <Chip key={k} text={k === "all" ? t("boycott.all") : t(`boycott.k.${k}`)} n={k === "all" ? BOYCOTT.filter((e) => kinds[kindOfEntry(e)] !== false).length : BOYCOTT.filter((e) => kindOfEntry(e) === k).length} on={kind === k} onPress={() => setKind(k)} />
        ))}
      </ChipRow>
      {order.map((e, i) => <FadeIn key={e.id} delay={i * 40}><CompanyCard e={e} data={data} onPress={() => onPick(e.id)} /></FadeIn>)}
    </View>
  );
}

// Toutes les marques reconnues, de A à Z
function Brands({ onPick }) {
  const kinds = { bds: true, organic: true, israel: true, ...(getSettings().boycottKinds || {}) };
  const rows = BOYCOTT.filter((e) => e.company && kinds[kindOfEntry(e)] !== false).flatMap((e) => (e.shown || []).map((b) => ({ b, e })))
    .sort((x, y) => x.b.localeCompare(y.b));
  return (
    <View style={[{ backgroundColor: C.surface, borderRadius: R.lg, overflow: "hidden" }, lift()]}>
      {rows.map(({ b, e }, i) => (
        <Pressable key={b + e.id} onPress={() => { haptic.tap(); onPick(e.id); }} accessibilityRole="button"
          style={({ pressed }) => ({ flexDirection: dir().row, alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: pressed ? C.tint : "transparent", borderTopWidth: i ? 0.5 : 0, borderTopColor: C.line })}>
          <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: BOYCOTT_COLOR + "1A", alignItems: "center", justifyContent: "center" }}>
            <Text style={{ color: BOYCOTT_COLOR, fontWeight: "900", fontSize: 15 }}>{b[0].toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Txt style={{ fontWeight: "800", fontSize: 15.5 }}>{b}</Txt>
            {b !== e.company ? <Muted style={{ fontSize: 13 }}>{e.company}</Muted> : null}
          </View>
          <Glyph name="chev" size={15} color={C.faint} />
        </Pressable>
      ))}
    </View>
  );
}

// Produits de l'historique concernés
function Mine({ onOpen }) {
  const list = getHistory().filter((e) => boycottFor(e.p));
  if (!list.length) return <EmptyState compact pose="star" size={92} title={t("boycott.mine_empty_t")} text={t("boycott.mine_empty_p")} />;
  return (
    <View style={[{ backgroundColor: C.surface, borderRadius: R.lg, overflow: "hidden" }, lift()]}>
      {list.map((e, i) => <ListRow key={e.p.code} p={e.p} first={!i} when={relTime(e.at)} onPress={() => onOpen(e.p.code, { product: e.p })} />)}
    </View>
  );
}

function Home({ data, onClose, onPick, onOpen }) {
  const [view, setView] = useState("companies");
  if (typeof window !== "undefined" && window.__bayyin) window.__bayyinBoycottView = setView; // captures automatiques (web)
  const nb = BOYCOTT.filter((e) => e.company).length;
  const nBrands = BOYCOTT.reduce((a, e) => a + (e.shown || []).length, 0);
  const mine = getHistory().filter((e) => boycottFor(e.p)).length;
  return (
    <View style={{ gap: 16 }}>
      <Header title={t("settings.menu.boycott")} onBack={onClose} />
      <View style={[{ borderRadius: R.xl, padding: 18, gap: 12, backgroundColor: BOYCOTT_COLOR, overflow: "hidden" }, lift()]}>
        <Row gap={12}>
          <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center" }}>
            <Glyph paths={BOYCOTT_ICON} size={24} color="#fff" width={2.1} />
          </View>
          <Text style={{ flex: 1, color: "#fff", fontSize: 15, lineHeight: 21, fontWeight: "600" }}>{t("boycott.hero")}</Text>
        </Row>
        <View style={{ flexDirection: dir().row, gap: 8 }}>
          {[[nb, t("boycott.stat_companies")], [nBrands, t("boycott.stat_brands")], [mine, t("boycott.stat_mine")]].map(([n, l]) => (
            <View key={l} style={{ flex: 1, paddingVertical: 10, borderRadius: R.md, backgroundColor: "rgba(255,255,255,0.14)", alignItems: "center" }}>
              <Text style={{ color: "#fff", fontSize: 20, fontWeight: "900" }}>{n}</Text>
              <Text numberOfLines={1} style={{ color: "rgba(255,255,255,0.85)", fontSize: 11.5, fontWeight: "700" }}>{l}</Text>
            </View>
          ))}
        </View>
        <Text style={{ color: "rgba(255,255,255,0.8)", fontSize: 12.5, lineHeight: 17 }}>{t("boycott.neutral")}</Text>
      </View>
      <Segmented items={[["companies", t("boycott.v.companies")], ["brands", t("boycott.v.brands")], ["mine", t("boycott.v.mine")]]} value={view} onChange={setView} />
      <FadeIn key={view} distance={6}>
        {view === "companies" ? <Companies data={data} onPick={onPick} /> : view === "brands" ? <Brands onPick={onPick} /> : <Mine onOpen={onOpen} />}
      </FadeIn>
      <Pressable onPress={() => Linking.openURL(BOYCOTT_SOURCE.url).catch(() => {})} accessibilityRole="link">
        <Text style={{ color: BOYCOTT_COLOR, fontWeight: "800", fontSize: 14, textAlign: dir().ta }}>{t("boycott.source", { d: checkedDate() })} ↗</Text>
      </Pressable>
      <Muted style={{ fontSize: 12.5, lineHeight: 17 }}>{t("boycott.photos_note")}</Muted>
    </View>
  );
}

// Alternatives du même rayon, non concernées, pour le produit d'où l'on vient
function Alternatives({ p, onOpen }) {
  const [list, setList] = useState(null);
  useEffect(() => {
    let alive = true;
    const keep = (l) => alive && setList((l || []).filter((a) => !boycottFor(a)).slice(0, 6));
    fetchAlternatives(p, keep).then(keep).catch(() => alive && setList((x) => x || []));
    return () => { alive = false; };
  }, [p.code]);
  if (list === null) return <View style={{ gap: 8 }}><SectionTitle>{t("boycott.alts")}</SectionTitle><Skeleton height={64} radius={14} /><Skeleton height={64} radius={14} /></View>;
  if (!list.length) return null;
  return (
    <View style={{ gap: 8 }}>
      <SectionTitle>{t("boycott.alts")}</SectionTitle>
      <View style={[{ backgroundColor: C.surface, borderRadius: R.lg, overflow: "hidden" }, lift()]}>
        {list.map((a, i) => <ListRow key={a.code} p={a} first={!i} onPress={() => onOpen(a.code, { product: a })} />)}
      </View>
    </View>
  );
}

// Page d'une entreprise (ou des produits d'Israël)
function Company({ id, from, data, onBack, onOpen }) {
  const e = entryOf(id);
  const { width } = useWindowDimensions();
  if (!e) return null;
  const kind = kindOfEntry(e);
  const products = data && data.companies && data.companies[id] ? data.companies[id].products : null;
  const b = from ? boycottFor(from) : null;
  const how = b ? (b.via === "brand" ? t("boycott.how_brand", { b: b.brandName }) : t(b.via === "origin" ? "boycott.how_origin" : "boycott.how_code")) : null;
  const report = from ? mailto(t("boycott.report_t", { code: from.code }), t("boycott.report_b", { name: nameOf(from), code: from.code, brand: from.brand || "", who: titleOf(e) })) : mailto(t("boycott.report_list_t"), "");
  const col = Math.floor((Math.min(width, 520) - 40 - 12) / 2);
  return (
    <View style={{ gap: 16 }}>
      <Header title={titleOf(e)} onBack={onBack} />
      {/* Bandeau : vraies photos de produits, nom, catégorie */}
      <View style={[{ borderRadius: R.xl, backgroundColor: C.surface, overflow: "hidden" }, lift()]}>
        <View style={{ flexDirection: dir().row, height: 120, backgroundColor: BOYCOTT_COLOR + "14", alignItems: "center", justifyContent: "center", gap: 10, paddingHorizontal: 14 }}>
          {products && products.length ? products.slice(0, 4).map((p, i) => (
            <View key={p.code} style={{ width: 76, height: 92, borderRadius: 14, backgroundColor: "#fff", overflow: "hidden", transform: [{ rotate: `${[-5, 3, -2, 5][i]}deg` }], borderWidth: 2, borderColor: C.surface }}>
              <Img uri={p.image} style={{ width: "100%", height: "100%" }} fit="contain" />
            </View>
          )) : <Tile color={BOYCOTT_COLOR} paths={BOYCOTT_ICON} size={56} />}
        </View>
        <View style={{ padding: 16, gap: 8 }}>
          <KindChip kind={kind} />
          <Txt style={{ fontSize: 15, lineHeight: 21 }}>{e.id === "israel" ? t("boycott.israel") : t(e.level === "organic" ? "boycott.organic" : "boycott.bds", { c: e.company })}</Txt>
        </View>
      </View>

      {/* Le produit d'où l'on vient : ce qui a été reconnu */}
      {from && b ? (
        <View style={{ gap: 8 }}>
          <SectionTitle>{t("boycott.this_product")}</SectionTitle>
          <View style={[{ backgroundColor: C.surface, borderRadius: R.lg, padding: 14, gap: 10 }, lift()]}>
            <Row gap={12}>
              <Thumb p={from} size={48} radius={12} />
              <View style={{ flex: 1 }}>
                <Txt numberOfLines={2} style={{ fontWeight: "800" }}>{nameOf(from)}</Txt>
                {from.brand ? <Muted style={{ fontSize: 13 }}>{from.brand}</Muted> : null}
              </View>
            </Row>
            <Txt style={{ fontSize: 14, lineHeight: 20 }}>{how}</Txt>
            {b.owned ? <Muted style={{ fontSize: 13.5 }}>{t("boycott.owned", { b: b.brandName, c: b.company })}</Muted> : null}
          </View>
        </View>
      ) : null}
      {from && kindOf(from) !== "medicine" && !from.local ? <Alternatives p={from} onOpen={onOpen} /> : null}

      <View style={{ gap: 8 }}>
        <SectionTitle>{t("boycott.why_t")}</SectionTitle>
        <View style={[{ backgroundColor: C.surface, borderRadius: R.lg, padding: 14, gap: 10, borderStartWidth: 4, borderStartColor: BOYCOTT_COLOR }, lift()]}>
          <Txt style={{ fontSize: 14.5, lineHeight: 21 }}>{t(whyKey({ id, kind }))}</Txt>
          <Pressable onPress={() => Linking.openURL(BOYCOTT_SOURCE.url).catch(() => {})} accessibilityRole="link">
            <Text style={{ color: BOYCOTT_COLOR, fontWeight: "800", fontSize: 13.5, textAlign: dir().ta }}>{t("boycott.source", { d: checkedDate() })} ↗</Text>
          </Pressable>
        </View>
      </View>

      <View style={{ gap: 8 }}>
        <SectionTitle>{e.id === "israel" ? t("boycott.how_t") : t("boycott.brands_t")}</SectionTitle>
        {e.id === "israel" ? <Muted style={{ lineHeight: 20 }}>{t("boycott.israel_how")}</Muted> : (
          <View style={{ flexDirection: dir().row, flexWrap: "wrap", gap: 8 }}>
            {(e.shown || []).map((x) => (
              <View key={x} style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: 99, backgroundColor: C.surface, borderWidth: 1, borderColor: C.line }}>
                <Text style={{ color: C.fg, fontWeight: "700", fontSize: 14 }}>{x}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {products === null && data === null ? <Skeleton height={180} radius={18} /> : products && products.length ? (
        <View style={{ gap: 8 }}>
          <SectionTitle>{t("boycott.examples")}</SectionTitle>
          <View style={{ flexDirection: dir().row, flexWrap: "wrap", gap: 12 }}>
            {products.map((p) => (
              <Pressable key={p.code} onPress={() => { haptic.tap(); onOpen(p.code); }} accessibilityRole="button" accessibilityLabel={p.name}
                style={({ pressed }) => [{ width: col, borderRadius: R.lg, backgroundColor: C.surface, overflow: "hidden", transform: [{ scale: pressed ? 0.98 : 1 }] }, lift()]}>
                <View style={{ height: col * 0.8, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", padding: 8 }}>
                  <Img uri={p.image} style={{ width: "100%", height: "100%" }} fit="contain" />
                </View>
                <View style={{ padding: 10, gap: 2 }}>
                  <Text numberOfLines={2} style={{ color: C.fg, fontWeight: "700", fontSize: 13.5, lineHeight: 17, textAlign: dir().ta }}>{p.name}</Text>
                  <Text numberOfLines={1} style={{ color: C.muted, fontSize: 12, textAlign: dir().ta }}>{p.brands}</Text>
                </View>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}

      <Muted style={{ fontSize: 13, lineHeight: 18 }}>{t("boycott.neutral")}</Muted>
      {report ? (
        <Pressable onPress={() => Linking.openURL(report).catch(() => {})} accessibilityRole="link">
          <Text style={{ color: C.muted, fontWeight: "700", fontSize: 13.5, textAlign: dir().ta, textDecorationLine: "underline" }}>{t("boycott.report")}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
const kindOf = (p) => p.kind || (p.raw && p.raw.kind) || "food";

export default function BoycottScreen({ onClose, onOpen, focus, from }) {
  const insets = useSafeAreaInsets();
  const [data, setData] = useState(null);
  const [pick, setPick] = useState(focus || null);
  const direct = !!focus; // ouvert depuis une fiche : le retour ferme l'écran
  if (typeof window !== "undefined" && window.__bayyin) window.__bayyinBoycottPick = setPick; // captures automatiques (web)
  useEffect(() => { let live = true; fetchBoycottData().then((d) => live && setData(d || { companies: {} })).catch(() => live && setData({ companies: {} })); return () => { live = false; }; }, []);
  const pad = { paddingHorizontal: 20, paddingTop: insets.top + 12, paddingBottom: insets.bottom + 40 };
  const open = (code, o) => onOpen(code, o);
  return (
    <SubStack
      topKey={pick}
      onBack={() => (direct && pick === focus ? onClose() : setPick(null))}
      base={<ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={pad}><Home data={data} onClose={onClose} onPick={setPick} onOpen={open} /></ScrollView>}
      top={pick ? (close) => (
        <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={pad}>
          <Company id={pick} from={pick === focus ? from : null} data={data} onBack={direct && pick === focus ? onClose : close} onOpen={open} />
        </ScrollView>
      ) : null}
    />
  );
}
