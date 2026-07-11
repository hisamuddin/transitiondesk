import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors } from "../theme/colors";
import { Opportunity } from "../types/career";

type OpportunityCardProps = {
  opportunity: Opportunity;
  onPress: () => void;
};

const stageLabels: Record<Opportunity["stage"], string> = {
  saved: "Saved",
  applied: "Applied",
  recruiter: "Recruiter",
  interviewing: "Interview",
  offer: "Offer",
  closed: "Closed"
};

export function OpportunityCard({ opportunity, onPress }: OpportunityCardProps) {
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.mark}>
        <Text style={styles.markText}>{opportunity.company.slice(0, 1)}</Text>
      </View>
      <View style={styles.copy}>
        <Text style={styles.company}>{opportunity.company}</Text>
        <Text style={styles.role}>{opportunity.role}</Text>
        <Text style={styles.action} numberOfLines={1}>{opportunity.nextAction}</Text>
      </View>
      <View style={styles.pill}>
        <Text style={styles.pillText}>{stageLabels[opportunity.stage]}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    padding: 14
  },
  mark: {
    alignItems: "center",
    backgroundColor: colors.blueSoft,
    borderRadius: 8,
    height: 42,
    justifyContent: "center",
    width: 42
  },
  markText: {
    color: colors.blue,
    fontSize: 18,
    fontWeight: "900"
  },
  copy: {
    flex: 1,
    gap: 2
  },
  company: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "800"
  },
  role: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: "600"
  },
  action: {
    color: colors.muted,
    fontSize: 12
  },
  pill: {
    backgroundColor: colors.greenSoft,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  pillText: {
    color: colors.green,
    fontSize: 11,
    fontWeight: "800"
  }
});
