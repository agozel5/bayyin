// Widget iOS (expo-widgets, SwiftUI) : « Scanner un produit » et le bilan de la semaine.
// Le composant est compilé à part : seulement des éléments @expo/ui/swift-ui, rien d'extérieur.
import { Text, VStack, HStack, Image, Spacer } from "@expo/ui/swift-ui";
import { font, foregroundStyle, padding } from "@expo/ui/swift-ui/modifiers";
import { createWidget } from "expo-widgets";

const BayyinWidget = (props) => {
  "widget";
  return (
    <VStack modifiers={[padding({ all: 4 })]}>
      <HStack>
        <Image systemName="checkmark.seal.fill" color="#14805A" />
        <Text modifiers={[font({ weight: "bold", size: 15 }), foregroundStyle("#14805A")]}>Bayyin</Text>
        <Spacer />
      </HStack>
      <Spacer />
      <Text modifiers={[font({ weight: "bold", size: 22 })]}>{String(props.n || 0)}</Text>
      <Text modifiers={[font({ size: 12 }), foregroundStyle("#5D6A63")]}>{props.week || ""}</Text>
      <Spacer />
      <HStack>
        <Image systemName="barcode.viewfinder" color="#14805A" />
        <Text modifiers={[font({ weight: "semibold", size: 13 }), foregroundStyle("#14805A")]}>{props.scan || "Scanner"}</Text>
      </HStack>
    </VStack>
  );
};

export default createWidget("BayyinWidget", BayyinWidget);
