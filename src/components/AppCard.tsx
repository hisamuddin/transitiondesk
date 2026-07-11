import { ReactNode } from "react";
import { StyleSheet, StyleProp, View, ViewStyle } from "react-native";

import { colors } from "../theme/colors";

type AppCardProps = {
  children: ReactNode;
  tone?: "default" | "blue" | "green" | "amber" | "violet";
  style?: StyleProp<ViewStyle>;
};

export function AppCard({ children, tone = "default", style }: AppCardProps) {
  return <View style={[styles.card, tone !== "default" && styles[tone], style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 8,
    backgroundColor: colors.surface,
    padding: 16
  },
  blue: {
    backgroundColor: colors.blueSoft,
    borderColor: "#bdd1f4"
  },
  green: {
    backgroundColor: colors.greenSoft,
    borderColor: "#bce8d8"
  },
  amber: {
    backgroundColor: colors.amberSoft,
    borderColor: "#efd59a"
  },
  violet: {
    backgroundColor: colors.violetSoft,
    borderColor: "#d6cdfa"
  }
});
