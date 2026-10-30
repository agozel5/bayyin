// Commerces halal autour de moi (OpenStreetMap) : position ou ville, rayon, catégories, carte et fiches.
import React, { useRef, useState } from "react";
import { View, Text, ScrollView, Pressable, TextInput, Linking, Platform, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Txt, Muted, Row, Skeleton } from "../components/ui";
import { Art, Glyph } from "../components/Art";
import { Chip, ChipRow } from "../components/Controls";
import PlacesMap from "../components/PlacesMap";
import { C, R, dir, lift, STATUS_COLORS, SEV_COLORS } from "../theme";
import { t, tn, locale, getLang } from "../i18n";
import { haptic } from "../motion";
import { fetchPlaces, livePlaces, geocode, directionsUrl, osmUrl, RADII, CATEGORIES } from "../../../public/lib/places.js";
import { PLACE_ART } from "../../../public/lib/rank-art.js";
import { mascot } from "../../../public/lib/mascot.js";

const open = (url) => Linking.openURL(url).catch(() => {});
const fmtDistance = (m) => (m < 950 ? `${Math.max(10, Math.round(m / 10) * 10)} m` : `${(m / 1000).toLocaleString(locale(), { maximumFractionDigits: m < 9950 ? 1 : 0 })} km`);

function SmallBtn({ text, onPress, primary }) {
  return (
    <Pressable onPress={() => { haptic.tap(); onPress(); }} accessibilityRole="link"
      style={({ pressed }) => ({ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 99, backgroundColor: primary ? C.brand : pressed ? C.tint2 : C.tint })}>
      <Text style={{ fontSize: 13.5, fontWeight: "800", color: primary ? "#fff" : C.fg }}>{text}</Text>
    </Pressable>
  );
}

function PlaceCard({ p, selected, onSelect }) {
  const title = p.name || t(`places.cat.${p.cat}`);
  const [fg, bg] = STATUS_COLORS[p.halal === "only" ? "halal_certifie" : "halal_probable"];
  return (
    <Pressable onPress={() => onSelect(p.id)} accessibilityRole="button"
      style={[{ flexDirection: dir().row, gap: 12, padding: 14, borderRadius: R.lg, backgroundColor: C.surface, borderWidth: 2, borderColor: selected ? C.brand : "transparent" }, lift()]}>
      <View style={{ width: 46, height: 46, borderRadius: 14, backgroundColor: C.artBg, alignItems: "center", justifyContent: "center" }}>
        <Art xml={PLACE_ART[p.cat] || PLACE_ART.other} size={34} />
      </View>
      <View style={{ flex: 1, gap: 6 }}>
        <View>
          <Txt style={{ fontWeight: "800", fontSize: 16 }}>{title}</Txt>
          <Muted style={{ fontSize: 13 }}>{t(`places.cat.${p.cat}`)} · {fmtDistance(p.distance)}</Muted>
        </View>
        <View style={{ flexDirection: dir().row, flexWrap: "wrap", gap: 6 }}>
          <View style={{ flexDirection: dir().row, alignItems: "center", gap: 5, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99, backgroundColor: bg }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: fg }} />
            <Text style={{ fontSize: 12, fontWeight: "800", color: fg }}>{t(p.halal === "only" ? "places.only" : "places.yes")}</Text>
          </View>
          {p.cert ? <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99, backgroundColor: SEV_COLORS.info[1] }}><Text style={{ fontSize: 12, fontWeight: "800", color: SEV_COLORS.info[0] }}>{t("places.cert", { c: p.cert })}</Text></View> : null}
        </View>
        {p.address ? <Muted style={{ fontSize: 13.5 }}>{p.address}</Muted> : null}
        {p.hours ? <Muted style={{ fontSize: 12.5, writingDirection: "ltr" }}>{p.hours}</Muted> : null}
        <View style={{ flexDirection: dir().row, flexWrap: "wrap", gap: 8, marginTop: 2 }}>
          <SmallBtn primary text={t("places.directions")} onPress={() => open(directionsUrl(p, Platform.OS === "ios"))} />
          {p.phone ? <SmallBtn text={t("places.call")} onPress={() => open(`tel:${p.phone.replace(/[^\d+]/g, "")}`)} /> : null}
          {p.website ? <SmallBtn text={t("places.website")} onPress={() => open(/^https?:/.test(p.website) ? p.website : "https://" + p.website)} /> : null}
          <SmallBtn text={t("places.osm")} onPress={() => open(osmUrl(p))} />
        </View>
      </View>
    </Pressable>
  );
}

export default function PlacesScreen({ onClose }) {
  const insets = useSafeAreaInsets();
  const [st, setSt] = useState({ center: null, label: "", radius: 3000, cat: "all", list: [], loading: false, error: "", selected: null });
  const [q, setQ] = useState("");
  const job = useRef(0);
  const set = (patch) => setSt((s) => ({ ...s, ...patch }));

  const search = async (lat, lon, label, radius = st.radius) => {
    const n = ++job.current;
    set({ center: { lat, lon }, label, radius, loading: true, error: "", selected: null, cat: "all" });
    let res = null;
    try {
      res = await fetchPlaces(lat, lon, radius);
      if (n !== job.current) return;
      set({ list: res.list, loading: false });
    } catch {
      if (n !== job.current) return;
      return set({ list: [], loading: false, error: t("places.error") });
    }
    // Rien dans les données de la semaine : on vérifie quand même en direct
    if (res && res.source === "local" && !res.list.length) {
      try { const fresh = await livePlaces(lat, lon, radius); if (n === job.current && fresh.list.length) set({ list: fresh.list }); } catch { /* résultat local gardé */ }
    }
  };
  const locate = async () => {
    haptic.tap();
    set({ loading: true, error: "" });
    try {
      if (typeof window !== "undefined" && window.__bayyinPlacesAt) { const c = window.__bayyinPlacesAt; return search(c.lat, c.lon, t("places.around_me")); } // captures (web)
      const Location = require("expo-location");
      const perm = await Location.requestForegroundPermissionsAsync();
      if (!perm.granted) return set({ loading: false, error: t("places.geo_denied") });
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      search(pos.coords.latitude, pos.coords.longitude, t("places.around_me"));
    } catch {
      set({ loading: false, error: t("places.geo_error") });
    }
  };
  const city = async () => {
    const text = q.trim();
    if (!text) return;
    set({ loading: true, error: "" });
    try {
      const g = await geocode(text, getLang());
      if (!g) return set({ loading: false, error: t("places.city_error", { q: text }) });
      search(g.lat, g.lon, text);
    } catch {
      set({ loading: false, error: t("places.error") });
    }
  };
  if (typeof window !== "undefined") window.__bayyinPlacesLocate = locate;

  const counts = Object.fromEntries(CATEGORIES.map((c) => [c, st.list.filter((p) => p.cat === c).length]));
  const vis = st.list.filter((p) => st.cat === "all" || p.cat === st.cat);
  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 20, paddingTop: insets.top + 12, paddingBottom: insets.bottom + 40, gap: 14 }}>
      <Row gap={6}>
        <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel={t("sheet.back")} style={{ padding: 4, transform: [{ scaleX: dir().rtl ? -1 : 1 }] }}>
          <Glyph paths='<path d="M15 5l-7 7 7 7"/>' size={24} color={C.fg} width={2.2} />
        </Pressable>
        <Text accessibilityRole="header" numberOfLines={2} style={{ flex: 1, fontSize: 22, fontWeight: "800", letterSpacing: -0.4, color: C.fg, textAlign: dir().ta }}>{t("places.title")}</Text>
      </Row>

      <Pressable onPress={locate} disabled={st.loading} accessibilityRole="button"
        style={({ pressed }) => ({ flexDirection: dir().row, alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 15, borderRadius: 16, backgroundColor: pressed ? C.brandDark : C.brand, opacity: st.loading ? 0.7 : 1 })}>
        {st.loading ? <ActivityIndicator color="#fff" /> : <Glyph paths='<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/><circle cx="12" cy="12" r="7.5"/>' size={20} color="#fff" width={2.2} />}
        <Text style={{ color: "#fff", fontWeight: "800", fontSize: 16 }}>{t("places.locate")}</Text>
      </Pressable>
      <View style={[{ flexDirection: dir().row, alignItems: "center", gap: 8, paddingHorizontal: 14, borderRadius: R.lg, backgroundColor: C.surface }, lift()]}>
        <Glyph paths='<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4 4"/>' size={18} color={C.muted} />
        <TextInput value={q} onChangeText={setQ} onSubmitEditing={city} placeholder={t("places.city_ph")} placeholderTextColor={C.faint} returnKeyType="search"
          style={{ flex: 1, paddingVertical: 13, fontSize: 15.5, color: C.fg, textAlign: dir().ta }} />
        {q.trim() ? <Pressable onPress={city} hitSlop={8}><Text style={{ color: C.brand, fontWeight: "800" }}>{t("places.city_go")}</Text></Pressable> : null}
      </View>
      <ChipRow>
        {RADII.map((r) => <Chip key={r} text={`${r / 1000} km`} on={st.radius === r} onPress={() => (st.center ? search(st.center.lat, st.center.lon, st.label, r) : set({ radius: r }))} />)}
      </ChipRow>

      {!st.center && !st.loading && !st.error ? (
        <View style={{ alignItems: "center", gap: 10, paddingVertical: 20 }}>
          <Art xml={mascot("search", { size: 110 })} size={110} />
          <Muted style={{ textAlign: "center" }}>{t("places.intro")}</Muted>
        </View>
      ) : null}
      {st.error ? <Txt style={{ color: STATUS_COLORS.mashbouh[0], fontWeight: "700" }}>{st.error}</Txt> : null}

      {st.list.length ? (
        <ChipRow>
          {["all", ...CATEGORIES.filter((c) => counts[c])].map((c) => (
            <Chip key={c} text={t(c === "all" ? "places.all" : `places.cats.${c}`)} n={c === "all" ? st.list.length : counts[c]} on={st.cat === c} onPress={() => set({ cat: c, selected: null })} />
          ))}
        </ChipRow>
      ) : null}
      {/* Comme sur le site : filtres, puis le nombre de commerces, puis la carte */}
      {st.center && !st.loading && !st.error ? <Muted style={{ fontSize: 16, fontWeight: "700", lineHeight: 22 }}>{tn("places.found", vis.length, { where: st.label, r: st.radius / 1000 })}</Muted> : null}
      {st.center ? <PlacesMap center={st.center} places={vis} selected={st.selected} onSelect={(id) => set({ selected: id })} height={320} /> : null}

      {st.loading && !st.list.length ? [0, 1, 2].map((i) => <Skeleton key={i} height={110} radius={18} />) : null}
      {st.center && !st.loading && !st.error && !vis.length ? (
        <View style={{ alignItems: "center", gap: 6, padding: 18, borderRadius: R.lg, backgroundColor: C.surface }}>
          <Txt style={{ fontWeight: "800" }}>{t("places.empty_t")}</Txt>
          <Muted style={{ textAlign: "center" }}>{t("places.empty_p")}</Muted>
        </View>
      ) : null}
      {vis.slice(0, 80).map((p) => <PlaceCard key={p.id} p={p} selected={st.selected === p.id} onSelect={(id) => set({ selected: id })} />)}
      <Muted style={{ fontSize: 12.5, lineHeight: 18 }}>{t("places.note")}</Muted>
      <Pressable onPress={() => open("https://www.openstreetmap.org/edit")} accessibilityRole="link"><Text style={{ color: C.brand, fontWeight: "800", textAlign: dir().ta }}>{t("places.add")} ↗</Text></Pressable>
    </ScrollView>
  );
}
