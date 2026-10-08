// Recherche par nom de produit, marque ou code-barres.
import React, { useRef, useState } from "react";
import { View, Text, TextInput, Pressable } from "react-native";
import Icon from "../components/Icon";
import { H1, Muted, Label, Row, Loading, Message, ProductRow } from "../components/ui";
import Screen from "../components/Screen";
import { C, R, dir } from "../theme";
import { t, tn } from "../i18n";
import { fetchProduct, searchProducts } from "../api";
import { errorText } from "../view";
import { haptic } from "../motion";

const SUGGESTIONS = ["Nutella", "Haribo", "Kinder", "Isla Délice", "Danone", "Oreo"];

export function Chip({ text, n, on, onPress }) {
  return (
    <Pressable
      onPress={() => {
        haptic.tap();
        onPress && onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={n !== undefined ? `${text}, ${n}` : text}
      accessibilityState={{ selected: !!on }}
      style={{ flexDirection: dir().row, alignItems: "center", gap: 6, paddingVertical: 9, paddingHorizontal: 14, borderRadius: 999, backgroundColor: on ? C.fg : C.tint }}
    >
      <Text style={{ color: on ? "#fff" : C.fg, fontWeight: "700", fontSize: 14 }}>{text}</Text>
      {n !== undefined ? <Text style={{ color: on ? "rgba(255,255,255,0.7)" : C.muted, fontWeight: "700", fontSize: 13 }}>{n}</Text> : null}
    </Pressable>
  );
}

export function SearchField({ value, onChangeText, onSubmit, placeholder }) {
  return (
    <View style={{ flexDirection: dir().row, alignItems: "center", gap: 10, borderWidth: 1.5, borderColor: C.line, borderRadius: R.md, paddingHorizontal: 14, backgroundColor: "#fff" }}>
      <Icon name="search" size={20} color={C.muted} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        onSubmitEditing={onSubmit}
        placeholder={placeholder}
        placeholderTextColor={C.faint}
        returnKeyType="search"
        autoCorrect={false}
        style={{ flex: 1, paddingVertical: 13, fontSize: 17, color: C.fg, textAlign: dir().ta }}
      />
      {value ? (
        <Pressable onPress={() => onChangeText("")} hitSlop={10} accessibilityRole="button" accessibilityLabel="✕">
          <Icon name="close" size={18} color={C.muted} />
        </Pressable>
      ) : null}
    </View>
  );
}

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

  const change = (v) => {
    setQ(v);
    if (!v.trim()) {
      ticket.current++;
      setState({});
    }
  };

  return (
    <Screen>
      <View style={{ gap: 6 }}>
        <H1>{t("search.title")}</H1>
        <Muted>{t("search.sub")}</Muted>
      </View>
      <SearchField value={q} onChangeText={change} onSubmit={() => run(q)} placeholder={t("search.placeholder")} />

      {!q.trim() ? (
        <View style={{ gap: 10 }}>
          <Label>{t("search.ideas")}</Label>
          <Row gap={8} style={{ flexWrap: "wrap" }}>
            {SUGGESTIONS.map((s) => (
              <Chip key={s} text={s} onPress={() => { setQ(s); run(s); }} />
            ))}
          </Row>
        </View>
      ) : null}

      {state.loading ? <Loading text={t("search.searching")} /> : null}
      {state.short ? <Message title={t("search.short.t")} text={t("search.short.p")} /> : null}
      {state.error ? <Message title={t("msg.error.t")} text={errorText(state.error)} /> : null}
      {state.notFound ? <Message title={t("msg.notfound.t")} text={t("msg.notfound.p", { code: state.notFound })} /> : null}
      {state.list ? (
        state.list.length ? (
          <View>
            <Label style={{ marginBottom: 4 }}>{tn("search.results", state.list.length)}</Label>
            {state.list.map((p) => (
              <ProductRow key={p.code} p={p} onPress={() => onOpen(p.code)} />
            ))}
          </View>
        ) : (
          <Message title={t("search.none.t")} text={t("search.none.p", { q: state.q })} />
        )
      ) : null}
    </Screen>
  );
}
