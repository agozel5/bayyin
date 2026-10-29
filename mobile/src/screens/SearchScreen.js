// Recherche par nom de produit, marque ou code-barres.
import React, { useRef, useState } from "react";
import { View, Text } from "react-native";
import { Muted, Loading, Message, Row, Txt } from "../components/ui";
import Screen from "../components/Screen";
import { PageHead, SearchBox, Chip } from "../components/Controls";
import { ListRow } from "../components/Cards";
import { Art, Tile } from "../components/Art";
import { C, R, dir, lift } from "../theme";
import { t, tn } from "../i18n";
import { fetchProduct, searchProducts } from "../api";
import { errorText } from "../view";
import { artByKey } from "../../../public/lib/product-art.js";

// Des marques, et deux mots courants dans la langue de l'app, chacun avec son dessin
const IDEAS = () => [["Nutella", "r:spreads"], ["Haribo", "r:candies"], ["Isla Délice", "r:sausages"], [t("search.idea_milk"), "f:dairy"], [t("search.idea_chicken"), "f:poultry"], ["Kinder", "r:chocolates"], ["Danone", "r:yogurts"]];
// Compatibilité avec les anciens écrans qui importaient ces composants d'ici
export { Chip, SearchBox as SearchField };

export default function SearchScreen({ onOpen }) {
  const [q, setQ] = useState("");
  const [state, setState] = useState({});
  const ticket = useRef(0);

  const run = async (raw) => {
    const query = raw.trim();
    if (!query) return setState({});
    const n = ++ticket.current;
    setState({ loading: true });
    const digits = query.replace(/\s+/g, "");
    try {
      if (/^\d{8,14}$/.test(digits)) {
        const p = await fetchProduct(digits);
        if (n !== ticket.current) return;
        return setState(p ? { list: [p], q: query } : { notFound: digits });
      }
      if (query.length < 2) return setState({ short: true });
      const list = await searchProducts(query);
      if (n === ticket.current) setState({ list, q: query });
    } catch (err) {
      if (n === ticket.current) setState({ error: err });
    }
  };
  const change = (v) => { setQ(v); if (!v.trim()) { ticket.current++; setState({}); } };

  return (
    <Screen gap={16}>
      <PageHead title={t("search.title")} sub={t("search.sub")} />
      <SearchBox value={q} onChangeText={change} onSubmit={() => run(q)} placeholder={t("search.placeholder")} />

      {!q.trim() ? (
        <View style={{ gap: 10 }}>
          <Text style={{ fontSize: 14, fontWeight: "700", color: C.muted, textAlign: dir().ta }}>{t("search.ideas")}</Text>
          <View style={{ flexDirection: dir().row, flexWrap: "wrap", gap: 8 }}>
            {IDEAS().map(([s, k]) => (
              <Chip key={s} text={s} onPress={() => { setQ(s); run(s); }}
                icon={<View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: C.artBg, alignItems: "center", justifyContent: "center", marginStart: -6 }}><Art xml={artByKey(k)} size={19} /></View>} />
            ))}
          </View>
          <Row gap={12} style={[{ marginTop: 8, padding: 14, borderRadius: R.lg, backgroundColor: C.surface, alignItems: "flex-start" }, lift()]}>
            <Tile color="#1A9C68" paths='<path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2M7 8v8M10 8v8M13 8v8M16 8v8"/>' size={42} />
            <View style={{ flex: 1, gap: 2 }}>
              <Txt style={{ fontWeight: "800" }}>{t("search.tip_t")}</Txt>
              <Muted style={{ fontSize: 14, lineHeight: 20 }}>{t("search.tip_p")}</Muted>
            </View>
          </Row>
        </View>
      ) : null}

      {state.loading ? <Loading text={t("search.searching")} /> : null}
      {state.short ? <Message title={t("search.short.t")} text={t("search.short.p")} /> : null}
      {state.error ? <Message title={t("msg.error.t")} text={errorText(state.error)} /> : null}
      {state.notFound ? <Message title={t("msg.notfound.t")} text={t("msg.notfound.p", { code: state.notFound })} /> : null}
      {state.list ? (
        state.list.length ? (
          <View style={{ gap: 8 }}>
            <Text style={{ fontSize: 14, fontWeight: "700", color: C.muted, textAlign: dir().ta }}>{tn("search.results", state.list.length)}</Text>
            <View style={[{ backgroundColor: C.surface, borderRadius: R.lg, overflow: "hidden" }, lift()]}>
              {state.list.map((p, i) => <ListRow key={p.code} p={p} first={i === 0} onPress={() => onOpen(p.code)} />)}
            </View>
          </View>
        ) : <Message title={t("search.none.t")} text={t("search.none.p", { q: state.q })} />
      ) : null}
    </Screen>
  );
}
