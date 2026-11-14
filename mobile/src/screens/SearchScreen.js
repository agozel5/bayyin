// Recherche par nom de produit, marque ou code-barres : même fonctionnement que la version web
// (aliments et cosmétiques, recherche pendant la frappe, historique d'abord, filtres, recherches récentes).
import React, { useEffect, useRef, useState } from "react";
import { View, Text, Pressable } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Muted, Message, Row, Txt, Btn, Skeleton } from "../components/ui";
import Screen from "../components/Screen";
import EmptyState from "../components/Empty";
import { PageHead, SearchBox, Chip, Segmented } from "../components/Controls";
import { ListRow } from "../components/Cards";
import { Art, Tile, Glyph } from "../components/Art";
import { C, R, dir, lift } from "../theme";
import { t, tn } from "../i18n";
import { fetchProduct, searchAll } from "../api";
import { getHistory, getSettings } from "../storage";
import { errorText, verdictOf, profileOf, kindOf } from "../view";
import { hasProfile } from "../core";
import { rankByRelevance } from "../../../public/lib/search.js";
import { artByKey } from "../../../public/lib/product-art.js";

const RECENT = "bayyin:recent_q";
// Pertinence d'un groupe de résultats : le nom ou la marque contient la recherche, et le verdict est connu
const norm = (x) => String(x || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
function fit(list, q) {
  const n = norm(q);
  if (!n) return 0;
  return list.slice(0, 8).reduce((sum, p) => {
    const hay = ` ${norm(p.brand)} ${norm(p.name)} `;
    const hit = hay.includes(` ${n} `) ? 3 : hay.includes(n) ? 2 : 0;
    const known = p.verdict && p.verdict.status !== "inconnu" ? 1 : 0;
    return sum + hit + known;
  }, 0) / Math.max(1, Math.min(8, list.length)) * Math.min(8, list.length) ** 0.5;
}
// Écran d'accueil de la recherche : des rayons illustrés et quelques marques connues
const AISLES = {
  food: ["spreads", "chocolates", "candies", "biscuits", "yogurts", "cheeses", "crisps", "sodas", "sausages"],
  beauty: ["shampoos", "shower_gels", "deodorants", "toothpastes", "face_creams", "body_creams", "lipsticks", "mascaras", "nail_polishes"],
};
const aislesOf = (kind) => (kind === "all" ? [...AISLES.food.slice(0, 6), ...AISLES.beauty.slice(0, 3)] : AISLES[kind]);
const BRANDS = { food: ["Nutella", "Haribo", "Isla Délice", "Kinder", "Danone"], beauty: ["Nivea", "Garnier", "Maybelline"] };
const brandsOf = (kind) => (kind === "all" ? [...BRANDS.food, ...BRANDS.beauty.slice(0, 2)] : BRANDS[kind]);
const SectionTitle = ({ children, right }) => (
  <Row style={{ justifyContent: "space-between" }}>
    <Text accessibilityRole="header" style={{ fontSize: 12.5, fontWeight: "800", color: C.muted, letterSpacing: 0.6, textTransform: "uppercase", textAlign: dir().ta }}>{children}</Text>
    {right || null}
  </Row>
);
const FILTERS = {
  all: () => true,
  halal: (p) => ["halal_certifie", "halal_probable"].includes(verdictOf(p).status),
  safe: (p) => !profileOf(p).alert,
};
const cache = new Map(); // réponses gardées 10 minutes : retaper une recherche ne relance rien
// Compatibilité avec les anciens écrans qui importaient ces composants d'ici
export { Chip, SearchBox as SearchField };

function Group({ title, list, onOpen, count }) {
  return (
    <View style={{ gap: 8 }}>
      {title ? <Text style={{ fontSize: 13.5, fontWeight: "800", color: C.muted, textAlign: dir().ta }}>{title}{count ? ` · ${list.length}` : ""}</Text> : null}
      <View style={[{ backgroundColor: C.surface, borderRadius: R.lg, overflow: "hidden" }, lift()]}>
        {list.map((p, i) => <ListRow key={p.code} p={p} first={i === 0} onPress={() => onOpen(p.code)} />)}
      </View>
    </View>
  );
}

export default function SearchScreen({ onOpen, onScan }) {
  const [q, setQ] = useState("");
  const [kind, setKind] = useState("all");
  const [state, setState] = useState({});
  const [filter, setFilter] = useState("all");
  const [recent, setRecent] = useState([]);
  const ticket = useRef(0);
  const timer = useRef(null);
  if (typeof window !== "undefined" && window.__bayyin) window.__bayyinSearchState = (s) => { setQ((s && s.q) || ""); setState(s || {}); }; // captures automatiques (web)

  useEffect(() => { AsyncStorage.getItem(RECENT).then((s) => setRecent(s ? JSON.parse(s) : [])).catch(() => {}); }, []);
  const remember = (query) => {
    if (query.length < 2 || /^\d+$/.test(query.replace(/\s+/g, ""))) return;
    const list = [query, ...recent.filter((x) => x.toLowerCase() !== query.toLowerCase())].slice(0, 8);
    setRecent(list);
    AsyncStorage.setItem(RECENT, JSON.stringify(list)).catch(() => {});
  };
  const localHits = (query, k, n) => rankByRelevance(getHistory().map((e) => e.p).filter((p) => k === "all" || kindOf(p) === k), query).slice(0, n);

  const run = async (raw, { force = false, k = kind, keep = true } = {}) => {
    clearTimeout(timer.current);
    const query = raw.trim();
    if (!query) { ticket.current++; return setState({}); }
    const n = ++ticket.current;
    const digits = query.replace(/\s+/g, "");
    try {
      if (/^\d{8,14}$/.test(digits)) {
        setState({ loading: true, local: [] });
        const p = await fetchProduct(digits);
        if (n !== ticket.current) return;
        return setState(p ? { q: query, single: [p] } : { notFound: digits });
      }
      if (query.length < 2) return setState({ short: true });
      const local = localHits(query, k, 3);
      setState({ loading: true, local });
      const ck = `${getSettings().lang}|${k}|${query.toLowerCase()}`;
      const hit = !force && cache.get(ck);
      const res = hit && Date.now() - hit.at < 600000 ? hit.res : await searchAll(query, k);
      if (n !== ticket.current) return;
      if (!res.foodFailed && !res.beautyFailed) cache.set(ck, { res, at: Date.now() });
      const known = new Set(local.map((p) => p.code));
      const fresh = (l) => l.filter((p) => !known.has(p.code));
      setFilter("all");
      setState({ q: query, local, food: fresh(res.food), beauty: fresh(res.beauty), alt: res.alt, foodFailed: res.foodFailed });
      if (keep) remember(query);
    } catch (err) {
      if (n === ticket.current) setState({ error: err, q: query });
    }
  };
  // Pendant la frappe : l'historique tout de suite, Open Food Facts après une courte pause
  const change = (v) => {
    setQ(v);
    clearTimeout(timer.current);
    const query = v.trim();
    if (!query) { ticket.current++; return setState({}); }
    const digits = query.replace(/\s+/g, "");
    if (/^\d+$/.test(digits)) { if (/^\d{8,14}$/.test(digits)) timer.current = setTimeout(() => run(query, { keep: false }), 450); return; }
    if (query.length < 2) return;
    ticket.current++;
    setState({ loading: query.length >= 3, local: localHits(query, kind, 5) });
    if (query.length >= 3) timer.current = setTimeout(() => run(query, { keep: false }), 700);
  };
  const pick = (s) => { setQ(s); run(s); };
  const changeKind = (k) => { setKind(k); if (q.trim()) run(q, { force: true, k }); };

  const withProfile = hasProfile(getSettings().profile);
  const keepF = FILTERS[filter === "safe" && !withProfile ? "all" : filter];
  const all0 = [...(state.local || []), ...(state.food || []), ...(state.beauty || [])];
  const r = { local: (state.local || []).filter(keepF), food: (state.food || []).filter(keepF), beauty: (state.beauty || []).filter(keepF) };
  const total = r.local.length + r.food.length + r.beauty.length;

  return (
    <Screen gap={16} title={t("search.title")}>
      <PageHead title={t("search.title")} sub={t("search.sub")} />
      <SearchBox value={q} onChangeText={change} onSubmit={() => run(q)} placeholder={t("search.placeholder")} />
      <Segmented items={["all", "food", "beauty"].map((k) => [k, t(`kindtab.${k}`)])} value={kind} onChange={changeKind} />

      {!q.trim() ? (
        <View style={{ gap: 20 }}>
          {recent.length ? (
            <View style={{ gap: 10 }}>
              <SectionTitle right={<Pressable onPress={() => { setRecent([]); AsyncStorage.setItem(RECENT, "[]").catch(() => {}); }} hitSlop={8} accessibilityRole="button"><Text style={{ color: C.brand, fontWeight: "700", fontSize: 13.5 }}>{t("search.recent_clear")}</Text></Pressable>}>{t("search.recent")}</SectionTitle>
              <View style={[{ backgroundColor: C.surface, borderRadius: R.lg, overflow: "hidden" }, lift()]}>
                {recent.slice(0, 5).map((x, i) => (
                  <Pressable key={x} onPress={() => pick(x)} accessibilityRole="button"
                    style={({ pressed }) => ({ flexDirection: dir().row, alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: pressed ? C.tint : "transparent", borderTopWidth: i ? 0.5 : 0, borderTopColor: C.line })}>
                    <Glyph paths='<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>' size={18} color={C.faint} />
                    <Text numberOfLines={1} style={{ flex: 1, fontSize: 15.5, color: C.fg, textAlign: dir().ta }}>{x}</Text>
                    <View style={{ transform: [{ rotate: dir().rtl ? "45deg" : "-45deg" }] }}><Glyph paths='<path d="M5 12h14M13 6l6 6-6 6"/>' size={16} color={C.faint} /></View>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null}
          <View style={{ gap: 10 }}>
            <SectionTitle>{t("search.aisles")}</SectionTitle>
            <View style={{ flexDirection: dir().row, flexWrap: "wrap", gap: 10 }}>
              {aislesOf(kind).map((id) => (
                <Pressable key={id} onPress={() => pick(t(`rank.cat.${id}`))} accessibilityRole="button" accessibilityLabel={t(`rank.cat.${id}`)}
                  style={({ pressed }) => [{ flexBasis: "30%", flexGrow: 1, alignItems: "center", gap: 8, paddingVertical: 14, paddingHorizontal: 6, borderRadius: R.lg, backgroundColor: C.surface, transform: [{ scale: pressed ? 0.96 : 1 }] }, lift()]}>
                  <View style={{ width: 54, height: 54, borderRadius: 27, backgroundColor: C.artBg, alignItems: "center", justifyContent: "center" }}><Art xml={artByKey(`r:${id}`)} size={38} /></View>
                  <Text numberOfLines={2} style={{ fontSize: 12.5, lineHeight: 16, fontWeight: "700", color: C.fg, textAlign: "center" }}>{t(`rank.cat.${id}`)}</Text>
                </Pressable>
              ))}
            </View>
          </View>
          <View style={{ gap: 10 }}>
            <SectionTitle>{t("search.brands")}</SectionTitle>
            <View style={{ flexDirection: dir().row, flexWrap: "wrap", gap: 8 }}>
              {brandsOf(kind).map((x) => <Chip key={x} text={x} onPress={() => pick(x)} />)}
            </View>
          </View>
          <Pressable onPress={onScan} accessibilityRole="button" style={({ pressed }) => ({ flexDirection: dir().row, padding: 14, borderRadius: R.lg, backgroundColor: pressed ? C.brandDark : C.brand, alignItems: "center", gap: 12 })}>
            <View style={{ width: 42, height: 42, borderRadius: 13, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center" }}>
              <Glyph paths='<path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2M7 8v8M10 8v8M13 8v8M16 8v8"/>' size={23} color="#fff" />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ color: "#fff", fontWeight: "800", fontSize: 15.5, textAlign: dir().ta }}>{t("search.tip_t")}</Text>
              <Text style={{ color: "rgba(255,255,255,0.85)", fontSize: 13.5, lineHeight: 19, textAlign: dir().ta }}>{t("search.tip_p")}</Text>
            </View>
            <View style={{ transform: [{ scaleX: dir().rtl ? -1 : 1 }] }}><Glyph name="chev" size={17} color="#fff" /></View>
          </Pressable>
        </View>
      ) : null}

      {state.short ? <Message title={t("search.short.t")} text={t("search.short.p")} /> : null}
      {state.notFound ? <EmptyState pose="search" title={t("msg.notfound.t")} text={t("msg.notfound.p", { code: state.notFound })} action={t("home.scan")} onAction={onScan} /> : null}
      {state.error ? <Message title={t("msg.error.t")} text={errorText(state.error)}><Btn title={t("msg.retry")} onPress={() => run(q, { force: true })} /></Message> : null}
      {state.single ? <Group list={state.single} onOpen={onOpen} /> : null}

      {state.loading ? (
        <View style={{ gap: 14 }}>
          {state.local && state.local.length ? <Group title={t("search.in_history")} list={state.local} onOpen={onOpen} /> : null}
          <View style={[{ backgroundColor: C.surface, borderRadius: R.lg, padding: 14, gap: 16 }, lift()]} accessibilityLabel={t("search.searching")}>
            {[0, 1, 2].map((i) => <Row key={i} gap={12}><Skeleton width={54} height={54} radius={14} /><View style={{ flex: 1, gap: 8 }}><Skeleton height={14} width="80%" /><Skeleton height={11} width="45%" /></View></Row>)}
          </View>
        </View>
      ) : null}

      {!state.loading && state.food ? (
        <View style={{ gap: 14 }}>
          {all0.length > 1 ? (
            <View style={{ flexDirection: dir().row, flexWrap: "wrap", gap: 8 }}>
              {Object.keys(FILTERS).filter((id) => id !== "safe" || withProfile).map((id) => <Chip key={id} text={t(`search.f.${id}`)} n={all0.filter(FILTERS[id]).length} on={filter === id} onPress={() => setFilter(id)} />)}
            </View>
          ) : null}
          {state.foodFailed ? <Message title={t("search.food_failed.t")} text={t("search.food_failed.p")}><Btn title={t("msg.retry")} onPress={() => run(q, { force: true })} /></Message> : null}
          {total ? (
            <>
              <Muted style={{ fontSize: 13.5 }}>{tn("search.results", total)}{state.alt ? ` · ${t("search.alt", { q: state.alt })}` : ""}</Muted>
              {r.local.length ? <Group title={t("search.in_history")} list={r.local} onOpen={onOpen} /> : null}
              {(() => {
                // Le groupe qui correspond le mieux à la recherche passe en premier (« nivea » : cosmétiques d'abord)
                const foodG = r.food.length ? <Group key="f" title={r.beauty.length || r.local.length ? t("search.g_food") : null} count={!!(r.beauty.length || r.local.length)} list={r.food} onOpen={onOpen} /> : null;
                const beautyG = r.beauty.length ? <Group key="b" title={t("search.g_beauty")} count list={r.beauty} onOpen={onOpen} /> : null;
                return fit(r.beauty, state.q) > fit(r.food, state.q) ? [beautyG, foodG] : [foodG, beautyG];
              })()}
            </>
          ) : all0.length ? <EmptyState compact pose="empty" size={84} title={t("search.f.none")} second={t("history.show_all_res")} onSecond={() => setFilter("all")} /> : !state.foodFailed ? (
            <EmptyState pose="search" title={t("search.none.t")} text={t("search.none.p", { q: state.q })} action={t("search.none_scan")} onAction={onScan} />
          ) : null}
        </View>
      ) : null}
    </Screen>
  );
}
