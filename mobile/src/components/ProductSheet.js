// Fiche produit : verdict halal, note santé, additifs, alternatives… (même contenu que la version web)
import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable, Image, Linking, Share } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Icon from "./Icon";
import { Txt, H2, Muted, Label, Row, Btn, Pill, StatusPill, MiniScore, Loading, Message } from "./ui";
import { C, R, STATUS_COLORS, SEV_COLORS, RISK_COLORS, GRADE_COLORS, LEVEL_COLORS, NOVA_COLORS, dir } from "../theme";
import { t, tn, tPlain } from "../i18n";
import { SOURCE_BY_ID, RISK_SOURCES, FLAG_SOURCES } from "../core";
import { fetchProduct, fetchAlternatives } from "../api";
import { getSettings, getEntry, addToHistory, toggleFav, subscribe } from "../storage";
import { verdictOf, nameOf, scoreOf, S, isBarcode, flagLabel, flagReason, noteText, fmt, errorText } from "../view";

const STATUS_ICON = { halal_certifie: "check", halal_probable: "check", mashbouh: "question", haram: "cross", inconnu: "dash" };
const open = (url) => Linking.openURL(url).catch(() => {});

// ---------------------------------------------------------------------------
// Petits éléments
// ---------------------------------------------------------------------------
function Section({ title, sub, children }) {
  return (
    <View style={{ gap: 10, paddingTop: 22, marginTop: 4, borderTopWidth: 1, borderTopColor: C.line }}>
      <Row style={{ justifyContent: "space-between" }}>
        <H2 style={{ flexShrink: 1 }}>{title}</H2>
        {sub ? <Muted style={{ fontSize: 13 }}>{sub}</Muted> : null}
      </Row>
      {children}
    </View>
  );
}

function SourceLine({ ids }) {
  const list = (ids || []).map((id) => SOURCE_BY_ID[id]).filter(Boolean);
  if (!list.length) return null;
  return (
    <Txt style={{ fontSize: 13, lineHeight: 19, color: C.muted }}>
      {t("detail.source")} :{" "}
      {list.map((src, i) => (
        <Text key={src.id} onPress={() => open(src.url)} style={{ color: C.brand, textDecorationLine: "underline" }}>
          {src.name}
          {i < list.length - 1 ? ", " : ""}
        </Text>
      ))}
    </Txt>
  );
}

function Expand({ head, children, initial = false }) {
  const [on, setOn] = useState(initial);
  return (
    <View style={{ backgroundColor: C.tint, borderRadius: R.md, overflow: "hidden" }}>
      <Pressable onPress={() => setOn(!on)} style={{ flexDirection: dir().row, alignItems: "center", gap: 10, padding: 14 }}>
        <View style={{ flex: 1 }}>{head}</View>
        <View style={{ transform: [{ rotate: on ? "90deg" : "0deg" }] }}>
          <Icon name="chev" size={16} color={C.muted} flip={dir().rtl && !on} />
        </View>
      </Pressable>
      {on ? <View style={{ paddingHorizontal: 14, paddingBottom: 14, gap: 6 }}>{children}</View> : null}
    </View>
  );
}

function Ring({ value, color, size = 58 }) {
  const w = 6;
  const r = (size - w) / 2;
  const len = 2 * Math.PI * r;
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} style={{ position: "absolute", transform: [{ rotate: "-90deg" }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={C.line} strokeWidth={w} fill="none" />
        {value ? (
          <Circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={w} fill="none" strokeLinecap="round"
            strokeDasharray={`${(len * value) / 100} ${len}`} />
        ) : null}
      </Svg>
      <Text style={{ fontWeight: "800", fontSize: value ? 18 : 20, color: C.fg }}>{value || "?"}</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Blocs de la fiche
// ---------------------------------------------------------------------------
function Top({ p }) {
  const meta = [p.brand, p.quantity].filter(Boolean).join(" · ");
  return (
    <Row gap={14} style={{ alignItems: "flex-start" }}>
      {p.image ? (
        <Image source={{ uri: p.image }} style={{ width: 84, height: 84, borderRadius: 16, borderWidth: 1, borderColor: C.line, backgroundColor: "#fff" }} resizeMode="contain" />
      ) : (
        <View style={{ width: 84, height: 84, borderRadius: 16, backgroundColor: C.tint, alignItems: "center", justifyContent: "center" }}>
          <Icon name={p.local ? "doc" : "box"} size={30} color={C.faint} />
        </View>
      )}
      <View style={{ flex: 1, gap: 4 }}>
        <Txt style={{ fontSize: 21, lineHeight: 26, fontWeight: "800" }}>{nameOf(p)}</Txt>
        {meta ? <Muted>{meta}</Muted> : null}
        {isBarcode(p.code) ? <Text style={{ color: C.faint, fontSize: 13, textAlign: dir().ta }}>{p.code}</Text> : null}
      </View>
    </Row>
  );
}

function Tiles({ p, v }) {
  const s = scoreOf(p);
  const [fg, bg] = STATUS_COLORS[v.status];
  const tile = { flex: 1, borderRadius: R.lg, padding: 14, gap: 10, minHeight: 128 };
  return (
    <View style={{ flexDirection: dir().row, gap: 10 }}>
      <View style={[tile, { backgroundColor: bg }]}>
        <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: fg, alignItems: "center", justifyContent: "center" }}>
          <Icon name={STATUS_ICON[v.status]} size={26} color="#fff" width={2.8} />
        </View>
        <View>
          <Label style={{ color: fg }}>{t("detail.halal")}</Label>
          <Txt style={{ fontSize: 18, lineHeight: 23, fontWeight: "800", color: fg }}>{S(v.status, "label")}</Txt>
        </View>
      </View>
      <View style={[tile, { backgroundColor: C.tint }]}>
        <Ring value={s ? s.score : 0} color={s ? GRADE_COLORS[s.grade] : C.faint} />
        <View>
          <Label>{t("detail.health")}</Label>
          <Txt style={{ fontSize: 18, lineHeight: 23, fontWeight: "800", color: s ? GRADE_COLORS[s.grade] : C.muted }}>
            {s ? t(`grade.${s.grade}`) : t("detail.not_rated")}
          </Txt>
        </View>
      </View>
    </View>
  );
}

function FlagCard({ f, onGotoSettings }) {
  const colors = SEV_COLORS[f.severity];
  return (
    <View style={{ borderRadius: R.md, padding: 14, gap: 6, backgroundColor: C.tint, borderStartWidth: 4, borderStartColor: colors[0] }}>
      <Row style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
        <Txt style={{ fontWeight: "800", flex: 1 }}>{flagLabel(f)}</Txt>
        <Pill text={t(`sev.${f.severity}`)} colors={colors} />
      </Row>
      <Muted>{flagReason(f)}</Muted>
      {f.covered ? (
        <Muted style={{ fontSize: 13 }}>{t("detail.covered")}</Muted>
      ) : f.topic && f.decision ? (
        <Txt style={{ fontSize: 13, lineHeight: 19, color: C.muted }}>
          {t("detail.by_setting", { topic: t(`topic.${f.topic}`), d: t(`decision.${f.decision}`).toLowerCase() })}{" "}
          <Text onPress={onGotoSettings} style={{ color: C.brand, fontWeight: "700" }}>{t("detail.change_setting")}</Text>
        </Txt>
      ) : null}
      {f.source && !f.code ? <Muted style={{ fontSize: 13 }}>{t("detail.found_in", { s: f.source })}</Muted> : null}
      <SourceLine ids={FLAG_SOURCES[f.id]} />
    </View>
  );
}

function HalalSection({ p, v, onGotoSettings, onOcr }) {
  const notes = [...(p.local ? [t("detail.local")] : []), ...v.notes.map(noteText)];
  return (
    <Section title={t("detail.halal")}>
      <Txt>{S(v.status, "lead")}</Txt>
      {v.certification ? (
        <Row gap={8} style={{ backgroundColor: C.brandSoft, borderRadius: R.md, padding: 12 }}>
          <Icon name="shield" size={20} color={C.brand} />
          <Txt style={{ color: C.brandDark, fontWeight: "700", flex: 1 }}>
            {t("detail.certified")}
            {v.certification.organisme ? " · " + v.certification.organisme : ""}
          </Txt>
        </Row>
      ) : null}
      {notes.map((n, i) => (
        <Muted key={i}>{n}</Muted>
      ))}
      {v.flags.map((f, i) => (
        <FlagCard key={f.id + i} f={f} onGotoSettings={onGotoSettings} />
      ))}
      {v.status === "inconnu" && isBarcode(p.code) ? <Btn title={t("detail.photo_ingredients")} icon="doc" onPress={() => onOcr(p.code)} /> : null}
    </Section>
  );
}

function NutRow({ n }) {
  const pct = Math.max(4, Math.min(100, (n.value / n.max) * 100));
  const textKey = n.id === "fiber" && n.value >= 6 ? "excellent" : n.level;
  const color = LEVEL_COLORS[n.level] || C.muted;
  return (
    <View style={{ gap: 8, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.line }}>
      <Row gap={12}>
        <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: C.tint, alignItems: "center", justifyContent: "center" }}>
          <Icon name={n.id} size={20} color={C.fg} />
        </View>
        <View style={{ flex: 1 }}>
          <Txt style={{ fontWeight: "700" }}>{t(`nut.${n.id}`)}</Txt>
          <Muted style={{ fontSize: 13, lineHeight: 18 }}>{t(`nut.${n.id}.${textKey}`)}</Muted>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Text style={{ fontWeight: "700", color: C.fg }}>{fmt(n.value)} {n.unit}</Text>
          <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color }} />
        </View>
      </Row>
      <View style={{ height: 5, borderRadius: 3, backgroundColor: C.tint, overflow: "hidden", flexDirection: dir().row }}>
        <View style={{ width: `${pct}%`, backgroundColor: color, borderRadius: 3 }} />
      </View>
    </View>
  );
}

function AdditivesRow({ count }) {
  const bad = count > 0;
  return (
    <Row gap={12} style={{ paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.line }}>
      <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: C.tint, alignItems: "center", justifyContent: "center" }}>
        <Icon name="flask" size={20} color={C.fg} />
      </View>
      <View style={{ flex: 1 }}>
        <Txt style={{ fontWeight: "700" }}>{t("detail.additives")}</Txt>
        <Muted style={{ fontSize: 13, lineHeight: 18 }}>{bad ? tn("detail.additives_risky", count) : t("detail.additives_none")}</Muted>
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        {bad ? <Text style={{ fontWeight: "700", color: C.fg }}>{count}</Text> : null}
        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: bad ? LEVEL_COLORS.eleve : LEVEL_COLORS.bon }} />
      </View>
    </Row>
  );
}

function HealthSection({ p }) {
  const h = p.health;
  if (!h) return null;
  const s = h.score;
  const risky = h.additives.length;
  const neg = h.nutrition.negatives;
  const pos = h.nutrition.positives;
  const hasNut = neg.length || pos.length;
  const lead = s
    ? tPlain("detail.health_lead_html", { n: s.score, g: s.nutriscore.toUpperCase(), a: s.parts.nutrition, b: s.parts.additives, c: s.parts.bio })
    : t("detail.health_none");
  return (
    <Section title={t("detail.health")} sub={t("detail.per", { u: t(h.nutrition.drink ? "unit.100ml" : "unit.100g") })}>
      <Txt>{lead}</Txt>
      {neg.length || risky ? (
        <View>
          <Label style={{ marginTop: 6 }}>{t("detail.defects")}</Label>
          {neg.map((n) => <NutRow key={n.id} n={n} />)}
          {risky ? <AdditivesRow count={risky} /> : null}
        </View>
      ) : null}
      {pos.length || !risky ? (
        <View>
          <Label style={{ marginTop: 6 }}>{t("detail.qualities")}</Label>
          {pos.map((n) => <NutRow key={n.id} n={n} />)}
          {!risky ? <AdditivesRow count={0} /> : null}
        </View>
      ) : null}
      {!hasNut ? <Muted>{t("detail.nut_missing")}</Muted> : null}
      {s || hasNut ? <SourceLine ids={["nutriscore", "fsa"]} /> : null}
    </Section>
  );
}

function WatchSection({ p }) {
  const h = p.health;
  if (!h || !h.additives.length) return null;
  return (
    <Section title={t("detail.watch")} sub={String(h.additives.length)}>
      {h.additives.map((a) => (
        <Expand
          key={a.code}
          head={
            <Row style={{ justifyContent: "space-between" }}>
              <Txt style={{ fontWeight: "700", flex: 1 }}>{a.code} · {t(`addname.${a.code.toLowerCase()}`)}</Txt>
              <Pill text={t(`risk.${a.level}`)} colors={RISK_COLORS[a.level]} />
            </Row>
          }
        >
          <Muted>{t(`risk.reason.${a.key}`)}</Muted>
          <SourceLine ids={RISK_SOURCES[a.key]} />
        </Expand>
      ))}
    </Section>
  );
}

function AltCard({ a, onOpen }) {
  return (
    <Pressable onPress={() => onOpen(a.code)} style={({ pressed }) => ({ width: 150, borderRadius: R.lg, padding: 12, gap: 6, backgroundColor: pressed ? C.tint2 : C.tint })}>
      {a.image ? (
        <Image source={{ uri: a.image }} style={{ width: "100%", height: 96, borderRadius: 12, backgroundColor: "#fff" }} resizeMode="contain" />
      ) : (
        <View style={{ width: "100%", height: 96, borderRadius: 12, backgroundColor: "#fff" }} />
      )}
      <Txt style={{ fontWeight: "700", fontSize: 14, lineHeight: 18 }} numberOfLines={2}>{nameOf(a)}</Txt>
      {a.brand ? <Muted style={{ fontSize: 12, lineHeight: 16 }} numberOfLines={1}>{a.brand}</Muted> : null}
      <StatusPill status={verdictOf(a).status} />
      <MiniScore p={a} />
    </Pressable>
  );
}

function AlternativesSection({ p, onOpen }) {
  const [state, setState] = useState({ loading: true, list: [], error: false });
  useEffect(() => {
    let alive = true;
    setState({ loading: true, list: [], error: false });
    fetchAlternatives(p)
      .then((list) => alive && setState({ loading: false, list, error: false }))
      .catch(() => alive && setState({ loading: false, list: [], error: true }));
    return () => {
      alive = false;
    };
  }, [p.code]);
  return (
    <Section title={t("detail.alternatives")} sub={t("detail.alt_sub")}>
      {state.loading ? (
        <Loading text={t("detail.alt_loading")} />
      ) : state.error ? (
        <Muted>{t("detail.alt_error")}</Muted>
      ) : state.list.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, flexDirection: dir().row }}>
          {state.list.map((a) => <AltCard key={a.code} a={a} onOpen={onOpen} />)}
        </ScrollView>
      ) : (
        <Muted>{t(p.categories && p.categories.length ? "detail.alt_none" : "detail.alt_nocat")}</Muted>
      )}
    </Section>
  );
}

function AllAdditivesSection({ p, v }) {
  if (!p.raw || p.local) return null;
  const keys = [...new Set((p.raw.additives_tags || []).map((tag) => String(tag).replace(/^\w+:/, "").toLowerCase()))].filter((k) => /^e\d{3,4}[a-z]*$/.test(k));
  if (!keys.length) {
    return (
      <Section title={t("detail.all_additives")}>
        <Muted>{t("detail.add_none")}</Muted>
      </Section>
    );
  }
  const baseOf = (k) => k.match(/^e\d+/)[0];
  const shown = keys.filter((k) => !(k === baseOf(k) && keys.some((o) => o !== k && baseOf(o) === k)));
  return (
    <Section title={t("detail.all_additives")} sub={String(shown.length)}>
      {shown.map((k) => {
        const flag = v.flags.find((f) => f.id === k || f.id === baseOf(k));
        const risk = ((p.health && p.health.additives) || []).find((a) => a.code.toLowerCase() === k || a.code.toLowerCase() === baseOf(k));
        const name = risk ? t(`addname.${risk.code.toLowerCase()}`) : flag ? flagLabel(flag).replace(/^E\w+ · /, "") : "";
        return (
          <View key={k} style={{ gap: 6, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.line }}>
            <Row>
              <Text style={{ fontWeight: "800", color: C.fg, minWidth: 54 }}>{k.toUpperCase()}</Text>
              <Txt style={{ flex: 1, fontSize: 15 }}>{name}</Txt>
            </Row>
            <Row gap={6} style={{ flexWrap: "wrap" }}>
              {flag ? <Pill text={`${t("detail.halal")} · ${t(`sev.${flag.severity}`)}`} colors={SEV_COLORS[flag.severity]} /> : null}
              {risk ? <Pill text={t(`risk.short.${risk.level}`)} colors={RISK_COLORS[risk.level]} /> : null}
              {!flag && !risk ? <Muted style={{ fontSize: 13 }}>{t("detail.add_ok")}</Muted> : null}
            </Row>
          </View>
        );
      })}
    </Section>
  );
}

function ExtraSections({ p }) {
  const h = p.health;
  if (!h || p.local) return null;
  const tags = h.allergenTags || [];
  const labels = tags.length ? tags.map((a) => t(`allergen.${a}`)) : h.allergens || [];
  return (
    <>
      <Section title={t("detail.allergens")}>
        {labels.length ? (
          <Row gap={8} style={{ flexWrap: "wrap" }}>
            {labels.map((a) => (
              <View key={a} style={{ backgroundColor: C.tint, borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12 }}>
                <Text style={{ fontWeight: "700", color: C.fg }}>{a}</Text>
              </View>
            ))}
          </Row>
        ) : (
          <Muted>{t("detail.allergens_none")}</Muted>
        )}
      </Section>
      {h.nova ? (
        <Section title={t("detail.nova")} sub={t("detail.nova_sub")}>
          <Row gap={14} style={{ alignItems: "flex-start" }}>
            <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: NOVA_COLORS[h.nova.group], alignItems: "center", justifyContent: "center" }}>
              <Text style={{ color: "#fff", fontWeight: "800", fontSize: 22 }}>{h.nova.group}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Txt style={{ fontWeight: "800" }}>{t(`nova.${h.nova.group}.t`)}</Txt>
              <Muted>{t(`nova.${h.nova.group}.p`)}</Muted>
            </View>
          </Row>
        </Section>
      ) : null}
    </>
  );
}

function LinkRow({ text, url, muted = false }) {
  return (
    <Pressable onPress={() => open(url)} style={{ paddingVertical: 8 }}>
      <Txt style={{ color: muted ? C.muted : C.brand, fontWeight: "700", fontSize: muted ? 14 : 16 }}>{text}</Txt>
    </Pressable>
  );
}

function ProductBody({ p, onOpen, onGotoSettings, onOcr }) {
  const v = verdictOf(p);
  const st = getSettings();
  const report = isBarcode(p.code)
    ? "https://github.com/agozel5/bayyin/issues/new?title=" +
      encodeURIComponent(t("report.title", { name: nameOf(p), code: p.code, status: S(v.status, "label"), school: t(`school.${st.school}`), url: p.offUrl || "" })) +
      "&body=" +
      encodeURIComponent(t("report.body", { name: nameOf(p), code: p.code, status: S(v.status, "label"), school: t(`school.${st.school}`), url: p.offUrl || "" }))
    : null;
  return (
    <View style={{ gap: 18 }}>
      <Top p={p} />
      <Tiles p={p} v={v} />
      <HalalSection p={p} v={v} onGotoSettings={onGotoSettings} onOcr={onOcr} />
      <HealthSection p={p} />
      <WatchSection p={p} />
      {!p.local ? <AlternativesSection p={p} onOpen={onOpen} /> : null}
      <AllAdditivesSection p={p} v={v} />
      <ExtraSections p={p} />
      {p.ingredients ? (
        <Section title={t("detail.ingredients")}>
          <Muted>{p.ingredients.replace(/_/g, "")}</Muted>
        </Section>
      ) : null}
      <View style={{ paddingTop: 10, borderTopWidth: 1, borderTopColor: C.line }}>
        {p.local ? (
          isBarcode(p.code) ? <LinkRow text={t("msg.add_off")} url={`https://world.openfoodfacts.org/cgi/product.pl?type=add&code=${p.code}`} /> : null
        ) : (
          <LinkRow text={t("detail.off_link")} url={p.offUrl} />
        )}
        {report ? <LinkRow text={t("detail.report")} url={report} muted /> : null}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Fiche complète (chargement, en-tête, favoris, partage)
// ---------------------------------------------------------------------------
export default function ProductSheet({ code, product, fromScan, onClose, onOpen, onScanAgain, onOcr, onGotoSettings, toast }) {
  const insets = useSafeAreaInsets();
  const [state, setState] = useState(() =>
    product ? { p: product, loading: false } : { p: null, loading: true }
  );
  const [, setTick] = useState(0);

  useEffect(() => subscribe(() => setTick((n) => n + 1)), []);

  useEffect(() => {
    if (product) {
      setState({ p: product, loading: false });
      return;
    }
    let alive = true;
    const saved = getEntry(code);
    if (saved && saved.p && saved.p.health && !fromScan) {
      // Fiche déjà vue : affichée tout de suite, puis rafraîchie
      setState({ p: saved.p, loading: false });
    } else {
      setState({ p: null, loading: true });
    }
    fetchProduct(code)
      .then((p) => {
        if (!alive) return;
        if (!p) return setState({ notFound: true, loading: false });
        setState({ p, loading: false });
        addToHistory(p);
      })
      .catch((err) => {
        if (!alive) return;
        setState((s) => (s.p ? s : { error: err, loading: false }));
      });
    return () => {
      alive = false;
    };
  }, [code, product]);

  const p = state.p;
  const entry = p && getEntry(p.code);
  const fav = !!(entry && entry.fav);

  const onFav = () => {
    if (!p) return;
    if (!getEntry(p.code)) addToHistory(p);
    const on = toggleFav(p.code);
    toast && toast(t(on ? "sheet.fav_added" : "sheet.fav_removed"));
  };
  const onShare = () => {
    if (!p) return;
    const s = scoreOf(p);
    Share.share({
      message:
        t("sheet.share_text", { name: nameOf(p), status: S(verdictOf(p).status, "label"), health: s ? t("sheet.share_health", { n: s.score }) : "" }) +
        (isBarcode(p.code) ? `\n${p.offUrl}` : ""),
    }).catch(() => {});
  };

  const headBtn = { width: 44, height: 44, borderRadius: 22, backgroundColor: C.tint, alignItems: "center", justifyContent: "center" };
  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
      <View style={{ flexDirection: dir().row, alignItems: "center", gap: 8, paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.line }}>
        <Pressable onPress={onClose} style={headBtn} accessibilityLabel={t("sheet.back")} hitSlop={6}>
          <Icon name="back" size={22} flip={dir().rtl} />
        </Pressable>
        <Txt style={{ flex: 1, fontWeight: "800", fontSize: 17 }} numberOfLines={1}>
          {p ? nameOf(p) : state.notFound ? t("msg.notfound.t") : t("sheet.title")}
        </Txt>
        {p && isBarcode(p.code) ? (
          <Pressable onPress={onShare} style={headBtn} accessibilityLabel={t("sheet.share")} hitSlop={6}>
            <Icon name="share" size={20} />
          </Pressable>
        ) : null}
        {p ? (
          <Pressable onPress={onFav} style={headBtn} accessibilityLabel={t(fav ? "sheet.fav_remove" : "sheet.fav_add")} hitSlop={6}>
            <Icon name="star" size={21} color={fav ? "#E9A100" : C.fg} fill={fav ? "#E9A100" : "none"} />
          </Pressable>
        ) : null}
      </View>

      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 30 + insets.bottom }}>
        {state.loading ? (
          <Loading text={t("msg.loading")} />
        ) : state.notFound ? (
          <Message title={t("msg.notfound.t")} text={t("msg.notfound.p", { code })}>
            <Btn title={t("detail.photo_ingredients")} icon="doc" onPress={() => onOcr(code)} />
          </Message>
        ) : state.error ? (
          <Message title={t("msg.load_error.t")} text={errorText(state.error)}>
            <Btn title={t("msg.retry")} onPress={() => onOpen(code)} />
            <Btn title={t("detail.photo_ingredients")} icon="doc" kind="white" onPress={() => onOcr(code)} />
          </Message>
        ) : p ? (
          <ProductBody p={p} onOpen={onOpen} onGotoSettings={onGotoSettings} onOcr={onOcr} />
        ) : null}
      </ScrollView>

      {fromScan ? (
        <View style={{ padding: 12, paddingBottom: 12 + insets.bottom, borderTopWidth: 1, borderTopColor: C.line }}>
          <Btn title={t("sheet.scan_again")} icon="scan" onPress={onScanAgain} />
        </View>
      ) : null}
    </View>
  );
}
