// Page d'onglet : défilement vertical, marges, zone sûre en haut et barre de titre en verre dépoli
// qui apparaît quand on fait défiler (title).
import React from "react";
import { View, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { C } from "../theme";
import { useNavBar } from "./NavBar";

export default function Screen({ children, gap = 20, title = "Bayyin" }) {
  const insets = useSafeAreaInsets();
  const nav = useNavBar(title);
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: insets.top + 16, paddingBottom: insets.bottom + 120, gap }}
        keyboardShouldPersistTaps="handled"
        {...nav.scroll}
      >
        {children}
      </ScrollView>
      {nav.bar}
    </View>
  );
}
