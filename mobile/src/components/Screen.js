// Page d'onglet : défilement vertical, marges et zone sûre en haut.
import React from "react";
import { ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { C } from "../theme";

export default function Screen({ children, gap = 20 }) {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: C.bg }}
      contentContainerStyle={{ paddingHorizontal: 20, paddingTop: insets.top + 16, paddingBottom: 40, gap }}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  );
}
