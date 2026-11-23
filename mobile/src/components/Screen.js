// Page d'onglet : défilement vertical, marges, zone sûre en haut et barre de titre en verre dépoli
// qui apparaît quand on fait défiler (title).
import React, { createContext } from "react";
import { View, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { C } from "../theme";
import { useNavBar } from "./NavBar";

export const ScrollY = createContext(null);

export default function Screen({ children, gap = 20, title = "Bayyin" }) {
  const insets = useSafeAreaInsets();
  const nav = useNavBar(title);
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollY.Provider value={nav.y}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: insets.top + 16, paddingBottom: insets.bottom + 120, gap }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        {...nav.scroll}
      >
        {children}
      </ScrollView>
      </ScrollY.Provider>
      {nav.bar}
    </View>
  );
}
