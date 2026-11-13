// Widget iOS (expo-widgets, SwiftUI), une mise en page par taille :
//  - petit : le nombre de produits de la semaine, la barre des verdicts, « Scanner » ;
//  - moyen : le bilan à gauche, les trois derniers produits à droite ;
//  - grand : le bilan et les quatre derniers produits ;
//  - écran verrouillé : rond (nombre de la semaine), rectangle (bilan en une ligne), en ligne.
// Un produit de l'historique rappelé ajoute une ligne rouge « Rappel : … » en tête.
// Le composant est compilé à part : seulement des éléments @expo/ui/swift-ui, rien d'extérieur.
import { Text, VStack, HStack, Image, Spacer, Link, Capsule, Gauge } from "@expo/ui/swift-ui";
import { font, foregroundStyle, padding, frame, background, clipShape, lineLimit, monospacedDigit, widgetURL, gaugeStyle } from "@expo/ui/swift-ui/modifiers";
import { createWidget } from "expo-widgets";

const BayyinWidget = (props, environment) => {
  "widget";
  const GREEN = "#14805A";
  const MUTED = "#5D6A63";
  const COL = { ok: "#1E9A5B", doubt: "#EE8A1F", bad: "#E0423A", other: "#97A39C" };
  const TINT = { ok: "#DDF3E6", doubt: "#FDEBD3", bad: "#FBDFDD", other: "#E9EDEA" };
  const fam = (environment && environment.widgetFamily) || "systemSmall";
  const n = props.n || 0;
  const w = props.words || {};
  const recent = props.recent || [];
  const alert = props.alert || "";
  const SCAN_URL = "bayyin://scan";
  const urlOf = (r) => (r && r.code ? `bayyin://p/${r.code}` : "bayyin://history");

  // Barre de la semaine : une portion par verdict (halal, douteux, haram, autres), largeur totale donnée
  const bar = (total, h) => {
    const parts = [["ok", props.ok || 0], ["doubt", props.doubt || 0], ["bad", props.bad || 0], ["other", props.other || 0]].filter((x) => x[1] > 0);
    if (!n || !parts.length) return <Capsule modifiers={[frame({ width: total, height: h }), foregroundStyle("#D5DDD8")]} />;
    const room = total - (parts.length - 1) * 2;
    return (
      <HStack spacing={2}>
        {parts.map((x) => <Capsule key={x[0]} modifiers={[frame({ width: Math.max(h, Math.round((x[1] / n) * room)), height: h }), foregroundStyle(COL[x[0]])]} />)}
      </HStack>
    );
  };
  const big = (size) => <Text modifiers={[font({ weight: "heavy", size, design: "rounded" }), monospacedDigit()]}>{String(n)}</Text>;
  const alertRow = alert ? (
    <HStack spacing={4}>
      <Image systemName="exclamationmark.triangle.fill" color={COL.bad} />
      <Text modifiers={[font({ weight: "bold", size: 12 }), foregroundStyle(COL.bad), lineLimit(1)]}>{alert}</Text>
      <Spacer />
    </HStack>
  ) : null;
  const counts = (
    <HStack spacing={8}>
      {props.ok ? <Text modifiers={[font({ weight: "bold", size: 12, design: "rounded" }), foregroundStyle(COL.ok)]}>{`● ${props.ok}`}</Text> : null}
      {props.doubt ? <Text modifiers={[font({ weight: "bold", size: 12, design: "rounded" }), foregroundStyle(COL.doubt)]}>{`● ${props.doubt}`}</Text> : null}
      {props.bad ? <Text modifiers={[font({ weight: "bold", size: 12, design: "rounded" }), foregroundStyle(COL.bad)]}>{`● ${props.bad}`}</Text> : null}
    </HStack>
  );
  const head = (
    <HStack spacing={5}>
      <Image systemName="checkmark.seal.fill" color={GREEN} />
      <Text modifiers={[font({ weight: "heavy", size: 15, design: "rounded" }), foregroundStyle(GREEN)]}>Bayyin</Text>
      <Spacer />
    </HStack>
  );
  // Bouton « Scanner » : pastille verte pleine
  const scanPill = (
    <HStack spacing={5} modifiers={[padding({ horizontal: 11, vertical: 6 }), background(GREEN), clipShape("capsule")]}>
      <Image systemName="barcode.viewfinder" color="#FFFFFF" />
      <Text modifiers={[font({ weight: "bold", size: 13 }), foregroundStyle("#FFFFFF"), lineLimit(1)]}>{props.scan || "Scanner"}</Text>
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
        <Text modifiers={[font({ weight: "semibold", size: 13 }), foregroundStyle({ type: "hierarchical", style: "primary" }), lineLimit(1)]}>{r.name || ""}</Text>
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
          <Text modifiers={[font({ weight: "semibold", size: 13.5 }), foregroundStyle({ type: "hierarchical", style: "primary" }), lineLimit(1)]}>{r.name || ""}</Text>
          {r.brand ? <Text modifiers={[font({ size: 11 }), foregroundStyle(MUTED), lineLimit(1)]}>{r.brand}</Text> : null}
        </VStack>
        <Spacer />
        {badge(r)}
      </HStack>
    </Link>
  );

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
          <Text modifiers={[font({ weight: "bold", size: 14 }), lineLimit(1)]}>{alert || "Bayyin"}</Text>
        </HStack>
        <Text modifiers={[font({ size: 12 }), lineLimit(1)]}>{props.week || ""}</Text>
        <Text modifiers={[font({ size: 12 }), lineLimit(1)]}>{n ? `${props.share || 0} % ${w.halal || "halal"}` : props.scan || ""}</Text>
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
        <VStack alignment="leading" spacing={3} modifiers={[frame({ width: 118 })]}>
          {head}
          <Spacer />
          {big(32)}
          <Text modifiers={[font({ size: 12 }), foregroundStyle(MUTED), lineLimit(1)]}>{props.week || ""}</Text>
          {bar(112, 6)}
          <Spacer />
          <Link destination={SCAN_URL}>{scanPill}</Link>
        </VStack>
        <VStack alignment="leading" spacing={7}>
          {alertRow}
          <Text modifiers={[font({ weight: "bold", size: 11 }), foregroundStyle(MUTED), lineLimit(1)]}>{(w.recent || "").toUpperCase()}</Text>
          {recent.length ? recent.slice(0, alert ? 3 : 4).map(row) : <Text modifiers={[font({ size: 12 }), foregroundStyle(MUTED)]}>{w.none || ""}</Text>}
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
            <Text modifiers={[font({ size: 12 }), foregroundStyle(MUTED), lineLimit(1)]}>{props.week || ""}</Text>
            {n ? <Text modifiers={[font({ weight: "bold", size: 13 }), foregroundStyle(COL.ok), lineLimit(1)]}>{`${props.share || 0} % ${w.halal || "halal"}`}</Text> : null}
          </VStack>
          <Spacer />
          {counts}
        </HStack>
        {bar(300, 7)}
        <Text modifiers={[font({ weight: "bold", size: 11 }), foregroundStyle(MUTED), padding({ top: 4 })]}>{(w.recent || "").toUpperCase()}</Text>
        {recent.length ? recent.slice(0, alert ? 4 : 5).map(bigRow) : <Text modifiers={[font({ size: 13 }), foregroundStyle(MUTED)]}>{w.none || ""}</Text>}
        <Spacer />
      </VStack>
    );
  }

  // Petit : un toucher ouvre le scan
  return (
    <VStack alignment="leading" spacing={3} modifiers={[padding({ all: 2 }), widgetURL(SCAN_URL)]}>
      {head}
      {alert ? <Text modifiers={[font({ weight: "bold", size: 11 }), foregroundStyle(COL.bad), lineLimit(1)]}>{`⚠ ${alert}`}</Text> : null}
      <Spacer />
      {big(30)}
      <Text modifiers={[font({ size: 12 }), foregroundStyle(MUTED), lineLimit(1)]}>{props.week || ""}</Text>
      {bar(120, 6)}
      <Spacer />
      {scanPill}
    </VStack>
  );
};

export default createWidget("BayyinWidget", BayyinWidget);
