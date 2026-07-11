import { ReactNode } from "react";
import { ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors } from "../theme/colors";

export function Screen({ children }: { children: ReactNode }) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: colors.background,
    flex: 1
  },
  content: {
    gap: 14,
    padding: 16,
    paddingBottom: 112
  }
});
