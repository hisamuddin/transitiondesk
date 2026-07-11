import { StyleSheet, Text, View } from "react-native";

import { colors } from "../theme/colors";
import { AppCard } from "./AppCard";

type MetricCardProps = {
  label: string;
  value: string | number;
  caption: string;
  tone?: "default" | "blue" | "green" | "amber" | "violet";
};

export function MetricCard({ label, value, caption, tone = "default" }: MetricCardProps) {
  return (
    <AppCard tone={tone} style={styles.card}>
      <View style={styles.content}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>{value}</Text>
        <Text style={styles.caption}>{caption}</Text>
      </View>
    </AppCard>
  );
}

const styles = StyleSheet.create({
  card: {
    flexBasis: "47%",
    flexGrow: 1
  },
  content: {
    gap: 6,
    minHeight: 84
  },
  label: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "700"
  },
  value: {
    color: colors.ink,
    fontSize: 30,
    fontWeight: "900",
    lineHeight: 34
  },
  caption: {
    color: colors.muted,
    fontSize: 12
  }
});
