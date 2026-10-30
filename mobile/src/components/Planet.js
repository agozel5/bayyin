// Onglet Planète : Green-Score d'Open Food Facts (analyse de cycle de vie Agribalyse), bio, huile de palme,
// origine des ingrédients (carte et drapeaux) et emballage. Même contenu que la version web.
import React, { useEffect, useMemo, useState } from "react";
import { View, Text, Pressable } from "react-native";
import { SvgXml } from "react-native-svg";
import { Txt, Muted, Row, Skeleton } from "./ui";
import { Art, Glyph } from "./Art";
import { C, R, STATUS_COLORS, dir, isDark } from "../theme";
import { t, getLang } from "../i18n";
import { fmt } from "../view";
import { fetchEnvironment } from "../api";
import { Reveal, Collapse, Chevron } from "./Reveal";
import LetterScale from "./LetterScale";
import { ENV_ART, FAMILY_ART, RANK_ART, NUT_ART } from "../../../public/lib/rank-art.js";
import { loadWorld, resolveOrigin, flagOf, countryName } from "../../../public/lib/world.js";

const WORLD_URL = "https://agozel5.github.io/bayyin/data/world.json";
const GS = [["a-plus", "A+", "#00703A"], ["a", "A", "#1E8F4E"], ["b", "B", "#4E9A0E"], ["c", "C", "#B98400"], ["d", "D", "#D9601A"], ["e", "E", "#D3261F"], ["f", "F", "#9E1A1A"]];
const PROD_SEGS = ["#E2533F", "#F0A23A", "#F2CF3B", "#7CC36B", "#2E9E57"];
// Repères sous la jauge de production : où se situent quelques aliments connus (ordre de grandeur)
const BENCH = [[4, FAMILY_ART.meat], [22, RANK_ART.chocolates], [41, FAMILY_ART.poultry], [60, RANK_ART.pizzas], [80, FAMILY_ART.vegetable], [96, NUT_ART.fruits]];

const hasT = (k) => t(k) !== k;
const envWord = (kind, w) => {
  if (!w) return "";
  const base = w.replace(/^(pp|pet|pe|hdpe|ldpe|ps|pvc)-/, "$1:").split(":")[0];
  for (const k of [w, base]) if (hasT(`env.${kind}.${k}`)) return t(`env.${kind}.${k}`);
  return w.replace(/-/g, " ");
};
function originName(o) {
  if (!o) return "";
  if (o.region) return t(`env.region.${o.region}`);
  if (o.iso) {
    const n = countryName(o.iso, getLang());
    if (n && n !== o.iso) return n;
  }
  return hasT(`env.origin.${o.tag}`) ? t(`env.origin.${o.tag}`) : o.tag.replace(/-/g, " ").replace(/^./, (c) => c.toUpperCase());
}

function Ok({ ok }) {
  if (ok === null || ok === undefined) return <Text style={{ color: C.faint, fontWeight: "700", fontSize: 16, minWidth: 28, textAlign: "center" }}>—</Text>;
  const [fg, bg] = STATUS_COLORS[ok ? "halal_certifie" : "haram"];
  return (
    <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: bg, alignItems: "center", justifyContent: "center" }}>
      <Glyph name={ok ? "check" : "cross"} size={16} color={fg} width={3} />
    </View>
  );
}

function EnvRow({ art, title, sub, right, first, children }) {
  const head = (open) => (
    <Row gap={12}>
      <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: C.artBg, alignItems: "center", justifyContent: "center" }}>
        <Art xml={ENV_ART[art]} size={30} />
      </View>
      <View style={{ flex: 1, gap: 1 }}>
        <Txt style={{ fontWeight: "700" }}>{title}</Txt>
        <Muted style={{ fontSize: 13, lineHeight: 18 }}>{sub}</Muted>
      </View>
      {right}
      {children ? <Chevron open={open} /> : null}
    </Row>
  );
  // Production et origines : dépliants ouverts au départ, comme sur le site
  return (
    <Reveal style={{ paddingVertical: 12, borderTopWidth: first ? 0 : 0.5, borderTopColor: C.line }}>
      {children ? <Collapse initial head={head}><View style={{ gap: 8, paddingTop: 8 }}>{children}</View></Collapse> : head(false)}
    </Reveal>
  );
}

function GsScale({ grade }) {
  return <LetterScale label={`Green-Score ${grade}`} value={grade} items={GS} activeFlex={1.3} />;
}

function ProdGauge({ value }) {
  return (
    <View style={{ marginStart: 52, direction: "ltr", gap: 2 }} accessible accessibilityLabel={`${value}/100`}>
      <View style={{ height: 14 }}>
        <View style={{ position: "absolute", left: `${value}%`, marginLeft: -6, top: 0, width: 0, height: 0, borderLeftWidth: 6, borderRightWidth: 6, borderTopWidth: 8,
          borderLeftColor: "transparent", borderRightColor: "transparent", borderTopColor: C.fg }} />
      </View>
      <View style={{ flexDirection: "row", height: 7, gap: 2 }}>
        {PROD_SEGS.map((c) => <View key={c} style={{ flex: 1, backgroundColor: c, borderRadius: 4 }} />)}
      </View>
      <View style={{ height: 16, marginTop: 2 }}>
        {[0, 20, 40, 60, 80, 100].map((x, i) => (
          <Text key={x} style={{ position: "absolute", left: `${x}%`, transform: [{ translateX: i === 0 ? 0 : i === 5 ? -20 : -8 }], fontSize: 11, color: C.muted, fontVariant: ["tabular-nums"] }}>{x}</Text>
        ))}
      </View>
      <View style={{ height: 28, marginTop: 4 }}>
        {BENCH.map(([x, art]) => <View key={x} style={{ position: "absolute", left: `${x}%`, transform: [{ translateX: -13 }] }}><Art xml={art} size={26} /></View>)}
      </View>
      <Text style={{ fontSize: 12, color: C.faint, textAlign: dir().ta, marginTop: 2 }}>{t("env.bench")}</Text>
    </View>
  );
}

function WorldMap({ world, isos }) {
  const [w, setW] = useState(0);
  const xml = useMemo(() => {
    const on = new Set(isos);
    const off = isDark() ? "#2F3A33" : "#D5DDD7";
    const paths = world.c.map((c) => `<path d="${c.d}" fill="${c.i && on.has(c.i) ? C.brand : off}" stroke="${C.tint}" stroke-width="0.6"/>`).join("");
    return `<svg viewBox="0 0 ${world.w} ${world.h}">${paths}</svg>`;
  }, [world, isos.join(",")]);
  return (
    <View onLayout={(ev) => setW(ev.nativeEvent.layout.width - 16)} style={{ borderRadius: R.md, backgroundColor: C.tint, padding: 8, marginStart: 52 }} accessible accessibilityRole="image" accessibilityLabel={t("env.map_label")}>
      {w > 0 ? <SvgXml xml={xml} width={w} height={(w * world.h) / world.w} /> : <View style={{ aspectRatio: world.w / world.h }} />}
    </View>
  );
}

function Origins({ e, world, first }) {
  const Rz = (tag) => resolveOrigin(tag, world);
  const agg = e.origins.map((o) => ({ o: Rz(o.origin), percent: o.percent })).filter((x) => x.o);
  const ingr = e.byIngredient.map((x) => ({ name: x.name, list: x.origins.map(Rz).filter(Boolean) })).filter((x) => x.list.length);
  const prod = e.productOrigins.map(Rz).filter(Boolean);
  const all = [...agg.map((x) => x.o), ...ingr.flatMap((x) => x.list), ...prod];
  if (!all.length) return <EnvRow art="origin" first={first} title={t("env.origins")} sub={t("env.origin_none")} right={<Ok ok={null} />} />;
  const uniq = [...new Map(all.map((o) => [o.tag, o])).values()];
  const isos = [...new Set(all.flatMap((o) => (o.iso ? [o.iso] : o.isos || [])))];
  const rows = ingr.length
    ? ingr.map((x) => ({ flag: flagOf(x.list[0]), title: x.name.charAt(0).toUpperCase() + x.name.slice(1), sub: x.list.map(originName).join(", ") }))
    : (agg.length ? agg : prod.map((o) => ({ o, percent: null }))).map((x) => ({ flag: flagOf(x.o), title: originName(x.o), sub: x.percent ? t("env.pct", { p: x.percent }) : "" }));
  return (
    <EnvRow art="origin" first={first} title={t("env.origins")} sub={uniq.map(originName).join(", ")}
      right={<Text style={{ fontSize: 18 }}>{uniq.slice(0, 3).map(flagOf).join("")}{uniq.length > 3 ? "…" : ""}</Text>}>
      {world && isos.length ? <WorldMap world={world} isos={isos} /> : null}
      <View style={{ marginStart: 52, gap: 8 }}>
        {rows.map((r, i) => (
          <Row key={i} gap={10} style={{ alignItems: "flex-start" }}>
            <Text style={{ fontSize: 20, lineHeight: 24 }}>{r.flag}</Text>
            <View style={{ flex: 1 }}>
              <Txt style={{ fontWeight: "700", fontSize: 14.5 }}>{r.title}</Txt>
              {r.sub ? <Muted style={{ fontSize: 13, lineHeight: 18 }}>{r.sub}</Muted> : null}
            </View>
          </Row>
        ))}
        {e.originText ? <Muted style={{ fontSize: 13, lineHeight: 18 }}>{t("env.maker_says")} « {e.originText} »</Muted> : null}
      </View>
    </EnvRow>
  );
}

export default function PlanetSection({ p }) {
  const [e, setE] = useState(null); // null : chargement ; false : erreur ; objet : Green-Score
  const [world, setWorld] = useState(null);
  const [n, setN] = useState(0);
  useEffect(() => {
    let live = true;
    setE(null);
    fetchEnvironment(p.code).then(async (x) => {
      if (!live) return;
      if (x && (x.origins.length || x.byIngredient.length || x.productOrigins.length)) {
        const w = await loadWorld(WORLD_URL);
        if (live) setWorld(w);
      }
      if (live) setE(x || "none");
    }).catch(() => live && setE(false));
    return () => { live = false; };
  }, [p.code, n]);

  if (e === null) return <View style={{ gap: 12 }}>{[0, 1, 2, 3].map((i) => <Skeleton key={i} height={44} radius={12} />)}</View>;
  if (e === false) return <Pressable onPress={() => setN((x) => x + 1)} accessibilityRole="button"><Muted>{t("env.error")}</Muted></Pressable>;
  if (e === "none" || (!e.known && e.production === null)) return <Muted>{t("env.none")}</Muted>;
  const gs = GS.find((x) => x[0] === e.grade);
  const pack = e.packaging.length
    ? e.packaging.map((x) => [envWord("shape", x.shape), envWord("mat", x.material)].filter(Boolean).join(" · ")).join(", ")
    : t("env.unknown");
  const rows = [];
  if (e.production !== null)
    rows.push((first) => (
      <EnvRow key="prod" art="prod" first={first} title={t("env.production")} sub={t(e.production >= 60 ? "env.prod.low" : e.production >= 40 ? "env.prod.mid" : "env.prod.high")}
        right={<Text style={{ fontWeight: "800", color: C.fg, fontSize: 15.5 }}>{e.production}/100</Text>}>
        <ProdGauge value={e.production} />
        <Muted style={{ fontSize: 13, lineHeight: 18, marginStart: 52 }}>{t("env.prod_note", { co2: fmt(e.co2 ?? 0), ref: e.reference || "—" })}</Muted>
      </EnvRow>
    ));
  rows.push((first) => <EnvRow key="bio" art="bio" first={first} title={t("env.organic")} sub={t(e.organic ? "env.organic.yes" : "env.organic.no")} right={<Ok ok={e.organic} />} />);
  rows.push((first) => <EnvRow key="palm" art="palm" first={first} title={t("env.palm")} sub={t(`env.palm.${e.palm || "unknown"}`)} right={<Ok ok={e.palm === "free" ? true : e.palm === "yes" ? false : null} />} />);
  rows.push((first) => <Origins key="origin" e={e} world={world} first={first} />);
  rows.push((first) => (
    <EnvRow key="pack" art="pack" first={first} title={t("env.packaging")} sub={pack + (e.nonRecyclable ? ` · ${t("env.non_recyclable")}` : "")}
      right={<Ok ok={e.packaging.length ? !e.nonRecyclable : null} />} />
  ));
  return (
    <View style={{ gap: 14 }}>
      {gs ? (
        <View style={{ gap: 12 }}>
          <Row gap={14}>
            <View style={{ width: 52, height: 52, borderTopLeftRadius: 16, borderBottomRightRadius: 16, borderTopRightRadius: 4, borderBottomLeftRadius: 4, backgroundColor: gs[2], alignItems: "center", justifyContent: "center" }}>
              <Text style={{ color: "#fff", fontWeight: "900", fontSize: 22 }}>{gs[1]}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Txt style={{ fontWeight: "800", fontSize: 18 }}>Green-Score</Txt>
              <Muted style={{ fontSize: 14 }}>{t(`env.grade.${e.grade}`)}{e.score !== null ? ` · ${e.score}/100` : ""}</Muted>
            </View>
          </Row>
          <GsScale grade={e.grade} />
        </View>
      ) : null}
      <View>{rows.map((r, i) => r(i === 0))}</View>
      <Muted style={{ fontSize: 12.5, lineHeight: 18 }}>{t("env.source")}</Muted>
    </View>
  );
}
