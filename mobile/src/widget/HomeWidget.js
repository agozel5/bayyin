// Widget Android : « Scanner un produit » et le bilan de la semaine (react-native-android-widget).
import React from "react";
import { FlexWidget, TextWidget, SvgWidget } from "react-native-android-widget";

const LOGO = '<svg viewBox="0 0 48 48"><rect width="48" height="48" rx="12" fill="#FFFFFF"/><path d="M9.6 20.4c-.1 5.6 3.4 8.1 10.4 8.3l7.6.1c6.9 0 10.6-2.6 11-8.4.2-2.4-.3-4.8-1.2-6.6" fill="none" stroke="#14805A" stroke-width="4.4" stroke-linecap="round" stroke-linejoin="round"/><circle cx="23.6" cy="35.8" r="3.2" fill="#E7B84E"/></svg>';
const SCAN = '<svg viewBox="0 0 24 24"><g fill="none" stroke="#0F6545" stroke-width="2.2" stroke-linecap="round"><path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2M7 8v8M10 8v8M13 8v8M16 8v8"/></g></svg>';
const DOT = { ok: "#8FE3B8", doubt: "#FFC163", bad: "#FF8C80" };

export function HomeWidget({ data }) {
  const d = data || { n: 0, ok: 0, doubt: 0, bad: 0, title: "Scanner un produit", week: "", labels: {} };
  return (
    <FlexWidget clickAction="OPEN_URI" clickActionData={{ uri: "bayyin://scan" }}
      style={{ height: "match_parent", width: "match_parent", backgroundColor: "#0F6545", borderRadius: 24, padding: 14, flexDirection: "column", justifyContent: "space-between" }}>
      <FlexWidget style={{ flexDirection: "row", alignItems: "center", width: "match_parent" }}>
        <SvgWidget svg={LOGO} style={{ width: 26, height: 26 }} />
        <TextWidget text="  Bayyin" style={{ fontSize: 16, fontWeight: "700", color: "#FFFFFF" }} />
        <FlexWidget style={{ flex: 1 }} />
        <TextWidget text={d.week} style={{ fontSize: 12, color: "#D6F2E4" }} />
      </FlexWidget>
      {d.n ? (
        <FlexWidget style={{ flexDirection: "row", alignItems: "center" }}>
          {["ok", "doubt", "bad"].filter((k) => d[k]).map((k) => (
            <FlexWidget key={k} style={{ flexDirection: "row", alignItems: "center", marginRight: 12 }}>
              <FlexWidget style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: DOT[k] }} />
              <TextWidget text={" " + (d.labels[k] || d[k])} style={{ fontSize: 12, color: "#FFFFFF", fontWeight: "700" }} />
            </FlexWidget>
          ))}
        </FlexWidget>
      ) : null}
      <FlexWidget clickAction="OPEN_URI" clickActionData={{ uri: "bayyin://scan" }}
        style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: "#FFFFFF", borderRadius: 16, paddingVertical: 10, width: "match_parent" }}>
        <SvgWidget svg={SCAN} style={{ width: 20, height: 20 }} />
        <TextWidget text={"  " + d.title} style={{ fontSize: 15, fontWeight: "700", color: "#0F6545" }} />
      </FlexWidget>
    </FlexWidget>
  );
}
