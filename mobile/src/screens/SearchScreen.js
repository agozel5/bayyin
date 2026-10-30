// Recherche par nom de produit, marque ou code-barres : même fonctionnement que la version web
// (aliments et cosmétiques, recherche pendant la frappe, historique d'abord, filtres, recherches récentes).
import React, { useEffect, useRef, useState } from "react";
import { View, Text, Pressable } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Muted, Message, Row, Txt, Btn, Skeleton } from "../components/ui";
import Screen from "../components/Screen";
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
const IDEAS = (kind) => kind === "beauty"
  ? [[t("sidea.mascara"), "r:mascaras"], [t("sidea.lipstick"), "r:lipsticks"], [t("sidea.foundation"), "r:complexion"], ["Nivea", "r:body_creams"], ["Garnier", "r:shampoos"], [t("sidea.nail"), "r:nail_polishes"], ["Maybelline", "r:makeup_other"]]
  : [["Nutella", "r:spreads"], ["Haribo", "r:candies"], ["Isla Délice", "r:sausages"], [t("search.idea_milk"), "f:dairy"], [t("search.idea_chicken"), "f:poultry"], ["Kinder", "r:chocolates"], ["Danone", "r:yogurts"]];
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
    <Screen gap={16}>
      <PageHead title={t("search.title")} sub={t("search.sub")} />
      <SearchBox value={q} onChangeText={change} onSubmit={() => run(q)} placeholder={t("search.placeholder")} />
      <Segmented items={["all", "food", "beauty"].map((k) => [k, t(`kindtab.${k}`)])} value={kind} onChange={changeKind} />

      {!q.trim() ? (
        <View style={{ gap: 12 }}>
          {recent.length ? (
            <View style={{ gap: 8 }}>
              <Row style={{ justifyContent: "space-between" }}>
                <Text style={{ fontSize: 14, fontWeight: "700", color: C.muted }}>{t("search.recent")}</Text>
                <Pressable onPress={() => { setRecent([]); AsyncStorage.setItem(RECENT, "[]").catch(() => {}); }} hitSlop={8}><Text style={{ color: C.muted, fontWeight: "700", textDecorationLine: "underline" }}>{t("search.recent_clear")}</Text></Pressable>
              </Row>
              <View style={{ flexDirection: dir().row, flexWrap: "wrap", gap: 8 }}>
                {recent.map((s) => <Chip key={s} text={s} onPress={() => pick(s)} icon={<Glyph paths='<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>' size={15} color={C.muted} />} />)}
              </View>
            </View>
          ) : null}
          <Text style={{ fontSize: 14, fontWeight: "700", color: C.muted, textAlign: dir().ta }}>{t("search.ideas")}</Text>
          <View style={{ flexDirection: dir().row, flexWrap: "wrap", gap: 8 }}>
            {IDEAS(kind).map(([s, k]) => (
              <Chip key={s} text={s} onPress={() => pick(s)}
                icon={<View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: C.artBg, alignItems: "center", justifyContent: "center", marginStart: -6 }}><Art xml={artByKey(k)} size={19} /></View>} />
            ))}
          </View>
          <Pressable onPress={onScan} accessibilityRole="button" style={({ pressed }) => [{ flexDirection: dir().row, marginTop: 8, padding: 14, borderRadius: R.lg, backgroundColor: pressed ? C.tint : C.surface, alignItems: "flex-start", gap: 12 }, lift()]}>
            <Tile color="#1A9C68" paths='<path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2M7 8v8M10 8v8M13 8v8M16 8v8"/>' size={42} />
            <View style={{ flex: 1, gap: 2 }}>
              <Txt style={{ fontWeight: "800" }}>{t("search.tip_t")}</Txt>
              <Muted style={{ fontSize: 14, lineHeight: 20 }}>{t("search.tip_p")}</Muted>
            </View>
          </Pressable>
        </View>
      ) : null}

      {state.short ? <Message title={t("search.short.t")} text={t("search.short.p")} /> : null}
      {state.notFound ? <Message title={t("msg.notfound.t")} text={t("msg.notfound.p", { code: state.notFound })} /> : null}
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
          ) : all0.length ? <Muted style={{ textAlign: "center" }}>{t("search.f.none")}</Muted> : !state.foodFailed ? (
            <Message title={t("search.none.t")} text={t("search.none.p", { q: state.q })} />
          ) : null}
        </View>
      ) : null}
    </Screen>
  );
}
