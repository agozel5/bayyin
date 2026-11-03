// Widgets Android (react-native-android-widget), cinq modèles :
//  - BayyinScan    (petit, 2 × 2) : le bouton Scanner, entouré de l'anneau « part halal » de la semaine ;
//  - BayyinLast    (petit, 2 × 2) : le dernier produit et son verdict (touchez pour rouvrir la fiche) ;
//  - BayyinQuick   (barre, 4 × 1) : Scanner, Ingrédients, Recherche, Mode courses ;
//  - BayyinHome    (moyen, 4 × 2) : le bilan de la semaine (nombre, anneau, barre) et le bouton Scanner ;
//  - BayyinRecent  (grand, 4 × 4) : le bilan, les derniers produits (touchez pour ouvrir la fiche) et des raccourcis.
// Un produit de l'historique rappelé (RappelConso) ajoute un bandeau rouge qui ouvre sa fiche.
import React from "react";
import { FlexWidget, TextWidget, SvgWidget, OverlapWidget } from "react-native-android-widget";

const GREEN = "#0F6545";
const LOGO = '<svg viewBox="0 0 1024 1024"><rect width="1024" height="1024" rx="230" fill="#FFFFFF"/><path d="M232 340v-60a48 48 0 0 1 48-48h60M684 232h60a48 48 0 0 1 48 48v60M792 684v60a48 48 0 0 1-48 48h-60M340 792h-60a48 48 0 0 1-48-48v-60" fill="none" stroke="#14805A" stroke-opacity=".35" stroke-width="30" stroke-linecap="round"/><g transform="translate(512 506) scale(.7) translate(-547 -521)"><path d="M318 442c-2 112 66 162 206 166l152 2c138 0 212-52 220-168 4-48-6-96-24-132" transform="translate(-60 0)" fill="none" stroke="#14805A" stroke-width="96" stroke-linecap="round" stroke-linejoin="round"/><circle cx="462" cy="752" r="64" fill="#E7B84E"/></g></svg>';
const ico = (paths, color = GREEN) => `<svg viewBox="0 0 24 24"><g fill="none" stroke="${color}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${paths}</g></svg>`;
const P = {
  scan: '<path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2M7 8v8M10 8v8M13 8v8M16 8v8"/>',
  photo: '<path d="M7 3h7l5 5v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M14 3v5h5M9 12h6M9 15.5h6"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',
  basket: '<path d="M5 8h14l-1.5 11a1 1 0 0 1-1 .9H7.5a1 1 0 0 1-1-.9z"/><path d="M9 8l3-4 3 4"/>',
  places: '<path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.4"/>',
};
const DOT = { ok: "#8FE3B8", doubt: "#FFC163", bad: "#FF8C80", other: "#B9C4BE" };
const REC = { ok: "#1E9A5B", doubt: "#EE8A1F", bad: "#E0423A", other: "#97A39C" };
const PILL = { ok: ["#E2F5EA", "#127A47"], doubt: ["#FFF0D9", "#A85A00"], bad: ["#FDE1DE", "#B42A22"], other: ["#EEF1EE", "#5D6A63"] };
const EMPTY = { n: 0, ok: 0, doubt: 0, bad: 0, other: 0, share: 0, recent: [], title: "Scanner un produit", scan: "Scanner", week: "", labels: {}, words: {} };
const link = (uri) => ({ clickAction: "OPEN_URI", clickActionData: { uri } });

// Anneau de la part halal (SVG) ; le centre reste libre pour un texte ou une icône
function ring(share, size, { track = "#2A7A5C", fill = "#8FE3B8", width = 9 } = {}) {
  const r = 50 - width / 2 - 1, c = 2 * Math.PI * r, f = Math.max(0, Math.min(100, share || 0)) / 100;
  return `<svg viewBox="0 0 100 100" width="${size}" height="${size}"><circle cx="50" cy="50" r="${r}" fill="none" stroke="${track}" stroke-width="${width}"/>${f ? `<circle cx="50" cy="50" r="${r}" fill="none" stroke="${fill}" stroke-width="${width}" stroke-linecap="round" stroke-dasharray="${(c * f).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 50 50)"/>` : ""}</svg>`;
}
/** Anneau avec un texte au centre (les deux couches sont empilées) */
function Ring({ share, size, width, text, fontSize }) {
  return (
    <OverlapWidget style={{ width: size, height: size }}>
      <SvgWidget svg={ring(share, size, { width })} style={{ width: size, height: size }} />
      <FlexWidget style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
        <TextWidget text={text} style={{ fontSize, fontWeight: "700", color: "#FFFFFF" }} />
      </FlexWidget>
    </OverlapWidget>
  );
}
const ALERT = '<path d="M12 3.5L2.5 20h19z"/><path d="M12 10v4.5M12 17.4v.1"/>';

/** Bandeau rouge « produit rappelé » (ouvre la fiche du produit) */
function RecallBar({ d, compact = false }) {
  if (!d.alert) return null;
  return (
    <FlexWidget {...link(`bayyin://p/${d.alert.code}`)}
      style={{ flexDirection: "row", alignItems: "center", width: "match_parent", backgroundColor: "#E0423A", borderRadius: 12, paddingHorizontal: 10, paddingVertical: compact ? 4 : 6 }}>
      <SvgWidget svg={ico(ALERT, "#FFFFFF")} style={{ width: 15, height: 15 }} />
      <TextWidget text={" " + d.alert.text} maxLines={1} truncate="END" style={{ fontSize: 12, fontWeight: "700", color: "#FFFFFF" }} />
    </FlexWidget>
  );
}

function Head({ d, light = true }) {
  return (
    <FlexWidget style={{ flexDirection: "row", alignItems: "center", width: "match_parent" }}>
      <SvgWidget svg={LOGO} style={{ width: 24, height: 24 }} />
      <TextWidget text="  Bayyin" style={{ fontSize: 15, fontWeight: "700", color: light ? "#FFFFFF" : GREEN }} />
      <FlexWidget style={{ flex: 1 }} />
      <TextWidget text={d.week} style={{ fontSize: 12, color: light ? "#D6F2E4" : "#5D6A63" }} />
    </FlexWidget>
  );
}

// Barre du bilan : une part par verdict
function WeekBar({ d }) {
  const parts = ["ok", "doubt", "bad", "other"].filter((k) => d[k]);
  if (!parts.length) return null;
  return (
    <FlexWidget style={{ flexDirection: "row", width: "match_parent", height: 8, borderRadius: 4, backgroundColor: "#2A7A5C" }}>
      {parts.map((k, i) => <FlexWidget key={k} style={{ flex: d[k], height: 8, borderRadius: 4, backgroundColor: DOT[k], marginLeft: i ? 3 : 0 }} />)}
    </FlexWidget>
  );
}

function Counts({ d }) {
  return (
    <FlexWidget style={{ flexDirection: "row", alignItems: "center" }}>
      {["ok", "doubt", "bad"].filter((k) => d[k]).map((k) => (
        <FlexWidget key={k} style={{ flexDirection: "row", alignItems: "center", marginRight: 12 }}>
          <FlexWidget style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: DOT[k] }} />
          <TextWidget text={" " + (d.labels[k] || d[k])} style={{ fontSize: 12, color: "#FFFFFF", fontWeight: "700" }} />
        </FlexWidget>
      ))}
    </FlexWidget>
  );
}

function ScanButton({ d }) {
  return (
    <FlexWidget {...link("bayyin://scan")}
      style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: "#FFFFFF", borderRadius: 16, paddingVertical: 10, width: "match_parent" }}>
      <SvgWidget svg={ico(P.scan)} style={{ width: 20, height: 20 }} />
      <TextWidget text={"  " + d.title} style={{ fontSize: 15, fontWeight: "700", color: GREEN }} />
    </FlexWidget>
  );
}

function Shortcut({ uri, paths, text, light = false }) {
  return (
    <FlexWidget {...link(uri)} style={{ flex: 1, flexDirection: "column", alignItems: "center", paddingVertical: 6 }}>
      <FlexWidget style={{ width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: light ? "#FFFFFF" : "#E7F3EC" }}>
        <SvgWidget svg={ico(paths)} style={{ width: 22, height: 22 }} />
      </FlexWidget>
      <TextWidget text={text} maxLines={1} style={{ fontSize: 11, marginTop: 4, color: light ? "#FFFFFF" : "#16241C", fontWeight: "600" }} />
    </FlexWidget>
  );
}

/** Moyen (4 × 2) : bilan de la semaine (nombre, anneau, barre) et bouton Scanner */
export function HomeWidget({ data }) {
  const d = data || EMPTY;
  const w = d.words || {};
  return (
    <FlexWidget {...link("bayyin://history")}
      style={{ height: "match_parent", width: "match_parent", backgroundColor: GREEN, borderRadius: 24, padding: 14, flexDirection: "column", justifyContent: "space-between" }}>
      <Head d={{ ...d, week: "" }} />
      {d.alert ? <RecallBar d={d} compact /> : null}
      {d.n ? (
        <FlexWidget style={{ flexDirection: "row", alignItems: "center", width: "match_parent" }}>
          <FlexWidget style={{ flex: 1, flexDirection: "column" }}>
            <FlexWidget style={{ flexDirection: "row", alignItems: "center" }}>
              <TextWidget text={String(d.n)} style={{ fontSize: 28, fontWeight: "700", color: "#FFFFFF" }} />
              <TextWidget text={"  " + (w.ofWeek || "")} style={{ fontSize: 12, color: "#D6F2E4" }} />
            </FlexWidget>
            <WeekBar d={d} />
            <FlexWidget style={{ height: 5 }} />
            <Counts d={d} />
          </FlexWidget>
          <FlexWidget style={{ marginLeft: 12 }}><Ring share={d.share} size={58} width={9} text={`${d.share}%`} fontSize={14} /></FlexWidget>
        </FlexWidget>
      ) : <TextWidget text={w.none || ""} maxLines={2} style={{ fontSize: 13, color: "#D6F2E4" }} />}
      <ScanButton d={d} />
    </FlexWidget>
  );
}

/** Petit (2 × 2) : le bouton Scanner, entouré de l'anneau « part halal » de la semaine */
export function ScanWidget({ data }) {
  const d = data || EMPTY;
  return (
    <FlexWidget {...link("bayyin://scan")}
      style={{ height: "match_parent", width: "match_parent", backgroundColor: GREEN, borderRadius: 24, padding: 12, flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      <OverlapWidget style={{ width: 76, height: 76 }}>
        <SvgWidget svg={ring(d.n ? d.share : 0, 76, { width: 7 })} style={{ width: 76, height: 76 }} />
        <FlexWidget style={{ width: 76, height: 76, alignItems: "center", justifyContent: "center" }}>
          <FlexWidget style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" }}>
            <SvgWidget svg={ico(P.scan)} style={{ width: 28, height: 28 }} />
          </FlexWidget>
        </FlexWidget>
        {d.alert ? (
          <FlexWidget style={{ width: 76, height: 76, flexDirection: "row", justifyContent: "flex-end" }}>
            <FlexWidget style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: "#E0423A", alignItems: "center", justifyContent: "center" }}><TextWidget text="!" style={{ fontSize: 13, fontWeight: "700", color: "#FFFFFF" }} /></FlexWidget>
          </FlexWidget>
        ) : null}
      </OverlapWidget>
      <TextWidget text={d.scan} style={{ fontSize: 15, fontWeight: "700", color: "#FFFFFF", marginTop: 6 }} />
      {d.n ? <TextWidget text={`${d.n} · ${d.share} % ${d.words.halal || "halal"}`} style={{ fontSize: 11.5, color: "#D6F2E4", marginTop: 1 }} /> : null}
    </FlexWidget>
  );
}

/** Petit (2 × 2) : le dernier produit et son verdict ; touchez pour rouvrir sa fiche */
export function LastWidget({ data }) {
  const d = data || EMPTY;
  const w = d.words || {};
  const r = d.recent[0];
  const g = r ? r.g : "other";
  return (
    <FlexWidget {...link(r ? `bayyin://p/${r.code}` : "bayyin://scan")}
      style={{ height: "match_parent", width: "match_parent", backgroundColor: "#FFFFFF", borderRadius: 24, padding: 12, flexDirection: "column", justifyContent: "space-between" }}>
      <FlexWidget style={{ flexDirection: "row", alignItems: "center", width: "match_parent" }}>
        <SvgWidget svg={LOGO} style={{ width: 20, height: 20 }} />
        <TextWidget text={"  " + (w.last || "")} maxLines={1} style={{ fontSize: 11.5, fontWeight: "700", color: "#5D6A63" }} />
      </FlexWidget>
      {r ? (
        <FlexWidget style={{ flexDirection: "column", width: "match_parent" }}>
          <TextWidget text={r.name} maxLines={2} truncate="END" style={{ fontSize: 15, fontWeight: "700", color: "#16241C" }} />
          {r.brand ? <TextWidget text={r.brand} maxLines={1} truncate="END" style={{ fontSize: 11.5, color: "#5D6A63", marginTop: 1 }} /> : null}
          <FlexWidget style={{ flexDirection: "row", marginTop: 6 }}>
            <FlexWidget style={{ flexDirection: "row", alignItems: "center", backgroundColor: PILL[g][0], borderRadius: 10, paddingHorizontal: 9, paddingVertical: 4 }}>
              <FlexWidget style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: REC[g] }} />
              <TextWidget text={" " + r.label} style={{ fontSize: 12, fontWeight: "700", color: PILL[g][1] }} />
            </FlexWidget>
          </FlexWidget>
        </FlexWidget>
      ) : <TextWidget text={w.none || ""} maxLines={3} style={{ fontSize: 12.5, color: "#5D6A63" }} />}
      <FlexWidget {...link("bayyin://scan")} style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", width: "match_parent", backgroundColor: GREEN, borderRadius: 12, paddingVertical: 7 }}>
        <SvgWidget svg={ico(P.scan, "#FFFFFF")} style={{ width: 16, height: 16 }} />
        <TextWidget text={"  " + d.scan} style={{ fontSize: 13, fontWeight: "700", color: "#FFFFFF" }} />
      </FlexWidget>
    </FlexWidget>
  );
}

/** Barre (4 × 1) : quatre raccourcis */
export function QuickWidget({ data }) {
  const d = data || EMPTY;
  const w = d.words || {};
  return (
    <FlexWidget style={{ height: "match_parent", width: "match_parent", backgroundColor: GREEN, borderRadius: 24, paddingHorizontal: 8, flexDirection: "row", alignItems: "center" }}>
      <Shortcut light uri="bayyin://scan" paths={P.scan} text={d.scan} />
      <Shortcut light uri="bayyin://photo" paths={P.photo} text={w.photo || "Ingrédients"} />
      <Shortcut light uri="bayyin://search" paths={P.search} text={w.search || "Recherche"} />
      <Shortcut light uri="bayyin://basket" paths={P.basket} text={w.basket || "Courses"} />
    </FlexWidget>
  );
}

/** Grand (4 × 4) : bilan, derniers produits (chacun ouvre sa fiche) et raccourcis */
export function RecentWidget({ data }) {
  const d = data || EMPTY;
  const w = d.words || {};
  return (
    <FlexWidget style={{ height: "match_parent", width: "match_parent", backgroundColor: "#F4F8F5", borderRadius: 24, padding: 6, flexDirection: "column" }}>
      <FlexWidget {...link("bayyin://history")} style={{ backgroundColor: GREEN, borderRadius: 20, padding: 12, flexDirection: "column", width: "match_parent" }}>
        <Head d={d} />
        {d.n ? (
          <FlexWidget style={{ flexDirection: "row", alignItems: "center", width: "match_parent", marginTop: 8 }}>
            <FlexWidget style={{ flex: 1, flexDirection: "column" }}><WeekBar d={d} /><FlexWidget style={{ height: 6 }} /><Counts d={d} /></FlexWidget>
            <FlexWidget style={{ marginLeft: 12 }}><Ring share={d.share} size={46} width={10} text={`${d.share}%`} fontSize={11.5} /></FlexWidget>
          </FlexWidget>
        ) : null}
      </FlexWidget>
      {d.alert ? <FlexWidget style={{ paddingHorizontal: 6, paddingTop: 6, width: "match_parent" }}><RecallBar d={d} /></FlexWidget> : null}
      <FlexWidget style={{ flex: 1, flexDirection: "column", paddingHorizontal: 14, paddingTop: 10, width: "match_parent" }}>
        <TextWidget text={w.recent || "Derniers produits"} style={{ fontSize: 12, fontWeight: "700", color: "#5D6A63" }} />
        {d.recent.length ? d.recent.slice(0, 4).map((r) => (
          <FlexWidget key={r.code} {...link(`bayyin://p/${r.code}`)} style={{ flexDirection: "row", alignItems: "center", paddingVertical: 6, width: "match_parent" }}>
            <FlexWidget style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: REC[r.g] }} />
            <FlexWidget style={{ flex: 1, flexDirection: "column", marginLeft: 10 }}>
              <TextWidget text={r.name} maxLines={1} truncate="END" style={{ fontSize: 13.5, fontWeight: "700", color: "#16241C" }} />
              {r.brand ? <TextWidget text={r.brand} maxLines={1} truncate="END" style={{ fontSize: 11.5, color: "#5D6A63" }} /> : null}
            </FlexWidget>
            <FlexWidget style={{ backgroundColor: PILL[r.g][0], borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 }}>
              <TextWidget text={r.label} style={{ fontSize: 11, fontWeight: "700", color: PILL[r.g][1] }} />
            </FlexWidget>
          </FlexWidget>
        )) : <TextWidget text={w.none || ""} style={{ fontSize: 13, color: "#5D6A63", marginTop: 8 }} />}
      </FlexWidget>
      <FlexWidget style={{ flexDirection: "row", paddingHorizontal: 8, paddingBottom: 8, width: "match_parent" }}>
        <Shortcut uri="bayyin://scan" paths={P.scan} text={d.scan} />
        <Shortcut uri="bayyin://photo" paths={P.photo} text={w.photo || "Ingrédients"} />
        <Shortcut uri="bayyin://search" paths={P.search} text={w.search || "Recherche"} />
        <Shortcut uri="bayyin://places" paths={P.places} text={w.places || "Commerces"} />
      </FlexWidget>
    </FlexWidget>
  );
}

/** Widget à dessiner selon son nom (déclaré dans app.json) */
export function widgetFor(name, data) {
  if (name === "BayyinScan") return <ScanWidget data={data} />;
  if (name === "BayyinQuick") return <QuickWidget data={data} />;
  if (name === "BayyinRecent") return <RecentWidget data={data} />;
  if (name === "BayyinLast") return <LastWidget data={data} />;
  return <HomeWidget data={data} />;
}
export const WIDGET_NAMES = ["BayyinHome", "BayyinScan", "BayyinLast", "BayyinQuick", "BayyinRecent"];
