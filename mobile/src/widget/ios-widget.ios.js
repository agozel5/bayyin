// Widget iOS (expo-widgets, SwiftUI), une mise en page par taille :
//  - petit : le nombre de produits de la semaine, la barre des verdicts, le bouton de scan en haut à droite ;
//  - moyen : le bilan à gauche, les derniers produits à droite ;
//  - grand : le bilan, la part halal et les cinq derniers produits ;
//  - écran verrouillé : rond (nombre de la semaine), rectangle (bilan en une ligne), en ligne.
// Un produit de l'historique rappelé ajoute une ligne rouge « Rappel : … » en tête.
// Rien n'a de largeur fixe : la barre et les lignes s'étirent, les textes rétrécissent avant d'être coupés
// (noms longs, allemand, indonésien…), et les couleurs suivent le mode clair ou sombre du téléphone.
// Le composant est compilé à part : seulement des éléments @expo/ui/swift-ui, rien d'extérieur.
import { Text, VStack, HStack, Image, Spacer, Link, Capsule, Gauge } from "@expo/ui/swift-ui";
import { font, foregroundStyle, padding, frame, background, clipShape, lineLimit, monospacedDigit, widgetURL, gaugeStyle, minimumScaleFactor } from "@expo/ui/swift-ui/modifiers";
import { createWidget } from "expo-widgets";

const BayyinWidget = (props, environment) => {
  "widget";
  const dark = !!environment && environment.colorScheme === "dark";
  const GREEN = dark ? "#3DBE8A" : "#14805A";
  const PILL = "#14805A";
  const MUTED = dark ? "#9FADA5" : "#5D6A63";
  const TRACK = dark ? "#2A342E" : "#DCE4DE";
  const COL = dark ? { ok: "#3FC27C", doubt: "#F0A04A", bad: "#F0675D", other: "#7F8C85" } : { ok: "#1E9A5B", doubt: "#EE8A1F", bad: "#E0423A", other: "#97A39C" };
  const TINT = dark ? { ok: "#173A27", doubt: "#3A2A14", bad: "#3D1D1A", other: "#26302A" } : { ok: "#DDF3E6", doubt: "#FDEBD3", bad: "#FBDFDD", other: "#E9EDEA" };
  const PRIMARY = { type: "hierarchical", style: "primary" };
  const fam = (environment && environment.widgetFamily) || "systemSmall";
  const n = props.n || 0;
  const w = props.words || {};
  const recent = props.recent || [];
  const alert = props.alert || "";
  const SCAN_URL = "bayyin://scan";
  const urlOf = (r) => (r && r.code ? `bayyin://p/${r.code}` : "bayyin://history");

  // Barre de la semaine : des segments égaux qui s'étirent sur toute la largeur, colorés selon la part
  // de chaque verdict (halal, douteux, haram, autres) ; chaque verdict présent a au moins un segment.
  const bar = (seg, h) => {
    const parts = [["ok", props.ok || 0], ["doubt", props.doubt || 0], ["bad", props.bad || 0], ["other", props.other || 0]].filter((x) => x[1] > 0);
    const cells = [];
    if (n && parts.length) {
      const counts = parts.map((x) => Math.max(1, Math.round((x[1] / n) * seg)));
      let total = 0, top = 0;
      counts.forEach((c, i) => { total += c; if (c > counts[top]) top = i; });
      counts[top] = Math.max(1, counts[top] + seg - total);
      parts.forEach((x, i) => { for (let k = 0; k < counts[i]; k++) cells.push(COL[x[0]]); });
    } else for (let k = 0; k < seg; k++) cells.push(TRACK);
    return (
      <HStack spacing={2}>
        {cells.map((c, i) => <Capsule key={String(i)} modifiers={[frame({ height: h }), foregroundStyle(c)]} />)}
      </HStack>
    );
  };
  const big = (size) => <Text modifiers={[font({ weight: "heavy", size, design: "rounded" }), monospacedDigit(), foregroundStyle(PRIMARY), lineLimit(1), minimumScaleFactor(0.6)]}>{String(n)}</Text>;
  // « produits cette semaine », ou l'invitation à scanner tant que la semaine est vide
  const caption = (size, lines) => (
    <Text modifiers={[font({ size, weight: "medium" }), foregroundStyle(MUTED), lineLimit(lines), minimumScaleFactor(0.75)]}>{n ? (w.ofWeek || props.week || "") : (props.week || "")}</Text>
  );
  const alertRow = alert ? (
    <HStack spacing={4}>
      <Image systemName="exclamationmark.triangle.fill" color={COL.bad} />
      <Text modifiers={[font({ weight: "bold", size: 12 }), foregroundStyle(COL.bad), lineLimit(1), minimumScaleFactor(0.8)]}>{alert}</Text>
      <Spacer />
    </HStack>
  ) : null;
  const dot = (g, v) => (
    <HStack key={g} spacing={3}>
      <Capsule modifiers={[frame({ width: 7, height: 7 }), foregroundStyle(COL[g])]} />
      <Text modifiers={[font({ weight: "bold", size: 12, design: "rounded" }), monospacedDigit(), foregroundStyle(COL[g])]}>{String(v)}</Text>
    </HStack>
  );
  const counts = (
    <HStack spacing={9}>
      {props.ok ? dot("ok", props.ok) : null}
      {props.doubt ? dot("doubt", props.doubt) : null}
      {props.bad ? dot("bad", props.bad) : null}
    </HStack>
  );
  const head = (
    <HStack spacing={5}>
      <Image systemName="checkmark.seal.fill" color={GREEN} />
      <Text modifiers={[font({ weight: "heavy", size: 15, design: "rounded" }), foregroundStyle(GREEN), lineLimit(1)]}>Bayyin</Text>
      <Spacer />
    </HStack>
  );
  // Bouton « Scanner » : pastille verte pleine (le texte rétrécit s'il est long : « Pindai », « Scannen »…)
  const scanPill = (
    <HStack spacing={5} modifiers={[padding({ horizontal: 11, vertical: 6 }), background(PILL), clipShape("capsule")]}>
      <Image systemName="barcode.viewfinder" color="#FFFFFF" />
      <Text modifiers={[font({ weight: "bold", size: 13 }), foregroundStyle("#FFFFFF"), lineLimit(1), minimumScaleFactor(0.75)]}>{props.scan || "Scanner"}</Text>
    </HStack>
  );
  // Rond vert du petit widget (tout le widget ouvre le scan)
  const scanDot = (
    <HStack modifiers={[padding({ all: 6 }), background(PILL), clipShape("circle")]}>
      <Image systemName="barcode.viewfinder" color="#FFFFFF" />
    </HStack>
  );
  const badge = (r) => (
    <Text modifiers={[font({ weight: "bold", size: 10.5 }), foregroundStyle(COL[r.g] || COL.other), lineLimit(1), padding({ horizontal: 7, vertical: 2.5 }), background(TINT[r.g] || TINT.other), clipShape("capsule")]}>{r.label || ""}</Text>
  );
  // Une ligne par produit récent : un toucher ouvre sa fiche
  const row = (r, i) => (
    <Link key={String(i)} destination={urlOf(r)}>
      <HStack spacing={6}>
        <Capsule modifiers={[frame({ width: 4, height: 18 }), foregroundStyle(COL[r.g] || COL.other)]} />
        <Text modifiers={[font({ weight: "semibold", size: 13 }), foregroundStyle(PRIMARY), lineLimit(1)]}>{r.name || ""}</Text>
        <Spacer />
        {badge(r)}
      </HStack>
    </Link>
  );
  const bigRow = (r, i) => (
    <Link key={String(i)} destination={urlOf(r)}>
      <HStack spacing={8}>
        <Capsule modifiers={[frame({ width: 4, height: 28 }), foregroundStyle(COL[r.g] || COL.other)]} />
        <VStack alignment="leading" spacing={1}>
          <Text modifiers={[font({ weight: "semibold", size: 13.5 }), foregroundStyle(PRIMARY), lineLimit(1)]}>{r.name || ""}</Text>
          {r.brand ? <Text modifiers={[font({ size: 11 }), foregroundStyle(MUTED), lineLimit(1)]}>{r.brand}</Text> : null}
        </VStack>
        <Spacer />
        {badge(r)}
      </HStack>
    </Link>
  );
  const title = (text) => <Text modifiers={[font({ weight: "bold", size: 11 }), foregroundStyle(MUTED), lineLimit(1), minimumScaleFactor(0.8)]}>{String(text || "").toUpperCase()}</Text>;
  const none = (size) => <Text modifiers={[font({ size }), foregroundStyle(MUTED), lineLimit(3), minimumScaleFactor(0.8)]}>{w.none || ""}</Text>;

  // Écran verrouillé
  if (fam === "accessoryCircular") {
    return (
      <Gauge value={n ? (props.share || 0) : 0} min={0} max={100} modifiers={[gaugeStyle("circularCapacity"), widgetURL(SCAN_URL)]}
        currentValueLabel={<Text modifiers={[font({ weight: "bold", size: 15, design: "rounded" })]}>{String(n)}</Text>} />
    );
  }
  if (fam === "accessoryRectangular") {
    return (
      <VStack alignment="leading" spacing={1} modifiers={[widgetURL(SCAN_URL)]}>
        <HStack spacing={4}>
          <Image systemName={alert ? "exclamationmark.triangle.fill" : "checkmark.seal.fill"} />
          <Text modifiers={[font({ weight: "bold", size: 14 }), lineLimit(1), minimumScaleFactor(0.8)]}>{alert || "Bayyin"}</Text>
        </HStack>
        <Text modifiers={[font({ size: 12 }), lineLimit(1), minimumScaleFactor(0.8)]}>{props.week || ""}</Text>
        <Text modifiers={[font({ size: 12 }), lineLimit(1), minimumScaleFactor(0.8)]}>{n ? `${props.share || 0} % ${w.halal || "halal"}` : props.scan || ""}</Text>
      </VStack>
    );
  }
  if (fam === "accessoryInline") {
    return <Text>{alert ? `⚠ ${alert}` : n ? `Bayyin · ${props.week || ""}` : `Bayyin · ${props.scan || ""}`}</Text>;
  }

  // Moyen : bilan à gauche, derniers produits à droite
  if (fam === "systemMedium") {
    return (
      <HStack spacing={14} modifiers={[padding({ all: 2 })]}>
        <VStack alignment="leading" spacing={3} modifiers={[frame({ width: 122 })]}>
          {head}
          <Spacer />
          {big(32)}
          {caption(11.5, 2)}
          {bar(10, 5)}
          <Spacer />
          <Link destination={SCAN_URL}>{scanPill}</Link>
        </VStack>
        <VStack alignment="leading" spacing={7}>
          {alertRow}
          {title(w.recent)}
          {recent.length ? recent.slice(0, alert ? 3 : 4).map(row) : none(12)}
          <Spacer />
        </VStack>
      </HStack>
    );
  }

  // Grand : bilan, barre de la semaine et cinq derniers produits
  if (fam === "systemLarge" || fam === "systemExtraLarge") {
    return (
      <VStack alignment="leading" spacing={8} modifiers={[padding({ all: 4 })]}>
        <HStack>
          {head}
          <Link destination={SCAN_URL}>{scanPill}</Link>
        </HStack>
        {alertRow}
        <HStack spacing={10} alignment="center">
          {big(40)}
          <VStack alignment="leading" spacing={2}>
            {caption(12.5, 1)}
            {n ? <Text modifiers={[font({ weight: "bold", size: 13 }), foregroundStyle(COL.ok), lineLimit(1), minimumScaleFactor(0.8)]}>{`${props.share || 0} % ${w.halal || "halal"}`}</Text> : null}
          </VStack>
          <Spacer />
          {counts}
        </HStack>
        {bar(24, 7)}
        <HStack modifiers={[padding({ top: 4 })]}>{title(w.recent)}<Spacer /></HStack>
        {recent.length ? recent.slice(0, alert ? 4 : 5).map(bigRow) : none(13)}
        <Spacer />
      </VStack>
    );
  }

  // Petit : un toucher ouvre le scan
  return (
    <VStack alignment="leading" spacing={3} modifiers={[widgetURL(SCAN_URL)]}>
      <HStack spacing={5}>
        <Image systemName="checkmark.seal.fill" color={GREEN} />
        <Text modifiers={[font({ weight: "heavy", size: 15, design: "rounded" }), foregroundStyle(GREEN), lineLimit(1), minimumScaleFactor(0.8)]}>Bayyin</Text>
        <Spacer />
        {scanDot}
      </HStack>
      {alert ? <Text modifiers={[font({ weight: "bold", size: 11 }), foregroundStyle(COL.bad), lineLimit(1), minimumScaleFactor(0.8)]}>{`⚠ ${alert}`}</Text> : null}
      <Spacer />
      {big(34)}
      {caption(12, 2)}
      {bar(10, 6)}
    </VStack>
  );
};

export default createWidget("BayyinWidget", BayyinWidget);
