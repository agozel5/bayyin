// Mode Ramadan (comme la version web) : pendant le mois, l'accueil affiche le jour du Ramadan,
// la fin du suhoor et l'iftar du jour avec un compte à rebours. Calcul sur le téléphone,
// position arrondie (environ 1 km) gardée dans les réglages.
import React, { useEffect, useState } from "react";
import { View, Text, Pressable, ActivityIndicator } from "react-native";
import Svg, { Path } from "react-native-svg";
import { Khatam } from "./Cards";
import { Glyph } from "./Art";
import { R, dir } from "../theme";
import { t, locale, getLang } from "../i18n";
import { getSettings, setSettings } from "../storage";
import { ramadanDay, fastTimes } from "../../../public/lib/ramadan.js";
import { haptic } from "../motion";

const PIN = '<path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.4"/>';
const until = (ms) => {
  const mins = Math.max(1, Math.round(ms / 60000));
  const h = Math.floor(mins / 60), m = mins % 60;
  return h ? t("ram.hm", { h, m: String(m).padStart(2, "0") }) : t("ram.m", { m });
};
const hm = (d) => { try { return d.toLocaleTimeString(locale(), { hour: "2-digit", minute: "2-digit" }); } catch { return `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`; } };

export default function Ramadan({ force = false }) {
  const day = force ? 13 : ramadanDay();
  const [, tick] = useState(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  // Compte à rebours mis à jour à chaque minute
  useEffect(() => {
    if (!day) return;
    const id = setTimeout(() => tick((n) => n + 1), 60000 - (Date.now() % 60000) + 50);
    return () => clearTimeout(id);
  });
  if (!day) return null;
  const rp = { angle: getLang() === "fr" ? 12 : 18, ...(getSettings().ram || {}) };
  const locate = async () => {
    haptic.tap();
    setBusy(true);
    setErr("");
    try {
      const Location = require("expo-location");
      const perm = await Location.requestForegroundPermissionsAsync();
      if (!perm.granted) throw new Error("denied");
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
      const r = (x) => Math.round(x * 100) / 100;
      setSettings({ ram: { ...rp, lat: r(pos.coords.latitude), lng: r(pos.coords.longitude) } });
    } catch {
      setErr(t("ram.denied"));
    }
    setBusy(false);
  };
  let body;
  if (rp.lat != null) {
    const now = new Date();
    const td = fastTimes(now, rp.lat, rp.lng, { fajrAngle: rp.angle });
    if (td.fajr && td.maghrib) {
      const next = fastTimes(new Date(now.getTime() + 864e5), rp.lat, rp.lng, { fajrAngle: rp.angle });
      const count = now < td.fajr ? t("ram.until_suhoor", { d: until(td.fajr - now) })
        : now < td.maghrib ? t("ram.until_iftar", { d: until(td.maghrib - now) })
        : next.fajr ? t("ram.until_suhoor", { d: until(next.fajr - now) }) : "";
      body = (
        <View style={{ gap: 12 }}>
          <View style={{ flexDirection: dir().row, gap: 10 }}>
            {[["ram.suhoor", td.fajr], ["ram.iftar", td.maghrib]].map(([k, d]) => (
              <View key={k} style={{ flex: 1, padding: 12, borderRadius: R.md, backgroundColor: "rgba(255,255,255,0.08)", borderWidth: 1, borderColor: "rgba(255,255,255,0.12)" }}>
                <Text style={{ color: "rgba(238,244,241,0.72)", fontSize: 13, textAlign: dir().ta }}>{t(k)}</Text>
                <Text style={{ color: "#fff", fontSize: 26, fontWeight: "700", fontVariant: ["tabular-nums"], textAlign: dir().ta }}>{hm(d)}</Text>
              </View>
            ))}
          </View>
          {count ? <Text style={{ color: "#F3D27A", fontWeight: "700", fontSize: 15, textAlign: dir().ta }}>{count}</Text> : null}
          <View style={{ flexDirection: dir().row, flexWrap: "wrap", alignItems: "center", gap: 6 }}>
            <Text style={{ color: "rgba(238,244,241,0.8)", fontSize: 13 }}>{t("ram.method")}</Text>
            {[12, 15, 18].map((a) => (
              <Pressable key={a} onPress={() => { haptic.tap(); setSettings({ ram: { ...rp, angle: a } }); }} accessibilityRole="radio" accessibilityState={{ checked: rp.angle === a }}
                style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 99, backgroundColor: rp.angle === a ? "#F3D27A" : "rgba(255,255,255,0.08)", borderWidth: 1, borderColor: rp.angle === a ? "#F3D27A" : "rgba(255,255,255,0.18)" }}>
                <Text style={{ color: rp.angle === a ? "#12324A" : "#fff", fontWeight: "800", fontSize: 12.5 }}>{a}°</Text>
              </Pressable>
            ))}
            <Pressable onPress={locate} hitSlop={8} accessibilityRole="button" style={{ marginStart: "auto" }}>
              <Text style={{ color: "#fff", fontWeight: "700", fontSize: 13, textDecorationLine: "underline" }}>{t("ram.relocate")}</Text>
            </Pressable>
          </View>
          <Text style={{ color: "rgba(238,244,241,0.65)", fontSize: 12.5, lineHeight: 17, textAlign: dir().ta }}>{t(`ram.m${rp.angle}`)} · {t("ram.note")}</Text>
        </View>
      );
    } else body = <Text style={{ color: "rgba(238,244,241,0.65)", fontSize: 13, textAlign: dir().ta }}>{t("ram.unavailable")}</Text>;
  } else {
    body = (
      <View style={{ gap: 10 }}>
        <Pressable onPress={locate} disabled={busy} accessibilityRole="button"
          style={({ pressed }) => ({ flexDirection: dir().row, alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 13, borderRadius: R.md, backgroundColor: pressed ? "#E8EEF2" : "#fff" })}>
          {busy ? <ActivityIndicator color="#12324A" /> : <Glyph paths={PIN} size={18} color="#12324A" />}
          <Text style={{ color: "#12324A", fontWeight: "800", fontSize: 15 }}>{t(busy ? "ram.locating" : "ram.locate")}</Text>
        </Pressable>
        <Text style={{ color: "rgba(238,244,241,0.65)", fontSize: 12.5, textAlign: dir().ta }}>{err || t("ram.privacy")}</Text>
      </View>
    );
  }
  return (
    <View style={{ borderRadius: R.xl, padding: 18, gap: 14, overflow: "hidden", backgroundColor: "#103743" }}>
      <Svg style={{ position: "absolute", left: 0, top: 0, right: 0, bottom: 0 }} width="100%" height="100%" preserveAspectRatio="none" viewBox="0 0 100 100">
        <Path d="M0 0H100V100H0Z" fill="#12324A" />
        <Path d="M0 100L100 30V100Z" fill="#0E3B33" opacity={0.9} />
      </Svg>
      <Khatam />
      <View style={{ flexDirection: dir().row, alignItems: "center", gap: 12 }}>
        <Svg width={34} height={34} viewBox="0 0 24 24"><Path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z" fill="#F3D27A" /></Svg>
        <View style={{ flex: 1 }}>
          <Text accessibilityRole="header" style={{ color: "#fff", fontWeight: "800", fontSize: 18, textAlign: dir().ta }}>{t("ram.title")}</Text>
          <Text style={{ color: "rgba(238,244,241,0.75)", fontSize: 14, textAlign: dir().ta }}>{t("ram.day", { n: day })}</Text>
        </View>
      </View>
      {body}
    </View>
  );
}
