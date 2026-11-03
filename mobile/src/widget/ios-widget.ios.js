// Widget iOS (expo-widgets, SwiftUI), une mise en page par taille :
//  - petit : le nombre de produits de la semaine, la part halal, « Scanner » ;
//  - moyen : le bilan à gauche, les trois derniers produits à droite ;
//  - grand : le bilan et les quatre derniers produits ;
//  - écran verrouillé : rond (nombre de la semaine), rectangle (bilan en une ligne), en ligne.
// Un produit de l'historique rappelé ajoute une ligne rouge « Rappel : … » en tête.
// Le composant est compilé à part : seulement des éléments @expo/ui/swift-ui, rien d'extérieur.
import { Text, VStack, HStack, Image, Spacer } from "@expo/ui/swift-ui";
import { font, foregroundStyle, padding } from "@expo/ui/swift-ui/modifiers";
import { createWidget } from "expo-widgets";

const BayyinWidget = (props, environment) => {
  "widget";
  const GREEN = "#14805A";
  const MUTED = "#5D6A63";
  const COL = { ok: "#1E9A5B", doubt: "#EE8A1F", bad: "#E0423A", other: "#97A39C" };
  const fam = (environment && environment.widgetFamily) || "systemSmall";
  const n = props.n || 0;
  const w = props.words || {};
  const recent = props.recent || [];
  const alert = props.alert || "";
  // Jauge de la part halal en dix crans (le texte se dessine partout, même sur l'écran verrouillé)
  const gauge = (size) => {
    const k = Math.round((props.share || 0) / 10);
    return (
      <HStack>
        <Text modifiers={[font({ weight: "bold", size }), foregroundStyle(COL.ok)]}>{"▰".repeat(k)}</Text>
        <Text modifiers={[font({ weight: "bold", size }), foregroundStyle("#C9D3CD")]}>{"▱".repeat(10 - k)}</Text>
      </HStack>
    );
  };
  const alertRow = alert ? (
    <HStack>
      <Image systemName="exclamationmark.triangle.fill" color={COL.bad} />
      <Text modifiers={[font({ weight: "bold", size: 12 }), foregroundStyle(COL.bad)]}>{` ${alert}`}</Text>
      <Spacer />
    </HStack>
  ) : null;
  const counts = (
    <HStack>
      {props.ok ? <Text modifiers={[font({ weight: "bold", size: 12 }), foregroundStyle(COL.ok)]}>{`● ${props.ok}  `}</Text> : null}
      {props.doubt ? <Text modifiers={[font({ weight: "bold", size: 12 }), foregroundStyle(COL.doubt)]}>{`● ${props.doubt}  `}</Text> : null}
      {props.bad ? <Text modifiers={[font({ weight: "bold", size: 12 }), foregroundStyle(COL.bad)]}>{`● ${props.bad}`}</Text> : null}
    </HStack>
  );
  const head = (
    <HStack>
      <Image systemName="checkmark.seal.fill" color={GREEN} />
      <Text modifiers={[font({ weight: "bold", size: 15 }), foregroundStyle(GREEN)]}>Bayyin</Text>
      <Spacer />
    </HStack>
  );
  const scan = (
    <HStack>
      <Image systemName="barcode.viewfinder" color={GREEN} />
      <Text modifiers={[font({ weight: "semibold", size: 13 }), foregroundStyle(GREEN)]}>{props.scan || "Scanner"}</Text>
      <Spacer />
    </HStack>
  );
  const row = (r, i) => (
    <HStack key={String(i)}>
      <Text modifiers={[font({ weight: "bold", size: 12 }), foregroundStyle(COL[r.g] || COL.other)]}>●</Text>
      <Text modifiers={[font({ weight: "semibold", size: 13 })]}>{` ${r.name || ""}`}</Text>
      <Spacer />
      <Text modifiers={[font({ weight: "bold", size: 11 }), foregroundStyle(COL[r.g] || COL.other)]}>{r.label || ""}</Text>
    </HStack>
  );
  const bigRow = (r, i) => (
    <HStack key={String(i)}>
      <Text modifiers={[font({ weight: "bold", size: 14 }), foregroundStyle(COL[r.g] || COL.other)]}>●</Text>
      <VStack>
        <Text modifiers={[font({ weight: "semibold", size: 13 })]}>{` ${r.name || ""}`}</Text>
        {r.brand ? <Text modifiers={[font({ size: 11 }), foregroundStyle(MUTED)]}>{` ${r.brand}`}</Text> : null}
      </VStack>
      <Spacer />
      <Text modifiers={[font({ weight: "bold", size: 11 }), foregroundStyle(COL[r.g] || COL.other)]}>{r.label || ""}</Text>
    </HStack>
  );

  // Écran verrouillé
  if (fam === "accessoryCircular") {
    return (
      <VStack>
        <Image systemName="barcode.viewfinder" />
        <Text modifiers={[font({ weight: "bold", size: 16 })]}>{String(n)}</Text>
      </VStack>
    );
  }
  if (fam === "accessoryRectangular") {
    return (
      <VStack>
        <Text modifiers={[font({ weight: "bold", size: 14 })]}>{alert ? `⚠ ${alert}` : "Bayyin"}</Text>
        <Text modifiers={[font({ size: 12 })]}>{props.week || ""}</Text>
        <Text modifiers={[font({ size: 12 })]}>{n ? `${props.share || 0} % ${w.halal || "halal"}` : props.scan || ""}</Text>
      </VStack>
    );
  }
  if (fam === "accessoryInline") {
    return <Text>{alert ? `⚠ ${alert}` : n ? `Bayyin · ${props.week || ""}` : `Bayyin · ${props.scan || ""}`}</Text>;
  }

  // Moyen : bilan à gauche, derniers produits à droite
  if (fam === "systemMedium") {
    return (
      <HStack modifiers={[padding({ all: 4 })]}>
        <VStack>
          {head}
          <Spacer />
          <Text modifiers={[font({ weight: "bold", size: 30 })]}>{String(n)}</Text>
          <Text modifiers={[font({ size: 12 }), foregroundStyle(MUTED)]}>{props.week || ""}</Text>
          {n ? gauge(9) : null}
          {counts}
          <Spacer />
          {scan}
        </VStack>
        <Spacer />
        <VStack>
          {alertRow}
          <Text modifiers={[font({ weight: "bold", size: 12 }), foregroundStyle(MUTED)]}>{w.recent || ""}</Text>
          {recent.length ? recent.slice(0, alert ? 2 : 3).map(row) : <Text modifiers={[font({ size: 12 }), foregroundStyle(MUTED)]}>{w.none || ""}</Text>}
          <Spacer />
        </VStack>
      </HStack>
    );
  }

  // Grand : bilan et quatre derniers produits
  if (fam === "systemLarge" || fam === "systemExtraLarge") {
    return (
      <VStack modifiers={[padding({ all: 6 })]}>
        {head}
        {alertRow}
        <HStack>
          <Text modifiers={[font({ weight: "bold", size: 34 })]}>{String(n)}</Text>
          <VStack>
            <Text modifiers={[font({ size: 12 }), foregroundStyle(MUTED)]}>{props.week || ""}</Text>
            {n ? <Text modifiers={[font({ weight: "bold", size: 13 }), foregroundStyle(COL.ok)]}>{`${props.share || 0} % ${w.halal || "halal"}`}</Text> : null}
          </VStack>
          <Spacer />
          {counts}
        </HStack>
        {n ? gauge(12) : null}
        <Spacer />
        <Text modifiers={[font({ weight: "bold", size: 12 }), foregroundStyle(MUTED)]}>{w.recent || ""}</Text>
        {recent.length ? recent.slice(0, 5).map(bigRow) : <Text modifiers={[font({ size: 13 }), foregroundStyle(MUTED)]}>{w.none || ""}</Text>}
        <Spacer />
        {scan}
      </VStack>
    );
  }

  // Petit
  return (
    <VStack modifiers={[padding({ all: 4 })]}>
      {head}
      {alert ? <Text modifiers={[font({ weight: "bold", size: 11 }), foregroundStyle(COL.bad)]}>{`⚠ ${alert}`}</Text> : null}
      <Spacer />
      <Text modifiers={[font({ weight: "bold", size: 26 })]}>{String(n)}</Text>
      <Text modifiers={[font({ size: 12 }), foregroundStyle(MUTED)]}>{props.week || ""}</Text>
      {n ? gauge(8) : null}
      {n ? counts : null}
      <Spacer />
      {scan}
    </VStack>
  );
};

export default createWidget("BayyinWidget", BayyinWidget);
