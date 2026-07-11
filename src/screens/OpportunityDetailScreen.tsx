import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import { AppCard } from "../components/AppCard";
import { Screen } from "../components/Screen";
import { opportunities, resumes } from "../data/seed";
import { RootStackParamList } from "../navigation/types";
import { draftFollowUp, suggestResumeImprovements } from "../services/ai/careerAssistant";
import { colors } from "../theme/colors";

type Props = NativeStackScreenProps<RootStackParamList, "OpportunityDetail">;

export function OpportunityDetailScreen({ route }: Props) {
  const opportunity = opportunities.find((item) => item.id === route.params.opportunityId) ?? opportunities[0];
  const resume = resumes.find((item) => item.id === opportunity.resumeVersionId) ?? resumes[0];
  const [assistantText, setAssistantText] = useState("");

  async function handleResumeMatch() {
    const suggestion = await suggestResumeImprovements(opportunity, resume);
    setAssistantText(suggestion);
  }

  async function handleFollowUp() {
    const draft = await draftFollowUp(opportunity);
    setAssistantText(draft);
  }

  return (
    <Screen>
      <View>
        <Text style={styles.eyebrow}>{opportunity.stage}</Text>
        <Text style={styles.title}>{opportunity.company}</Text>
        <Text style={styles.subtitle}>{opportunity.role}</Text>
      </View>

      <AppCard tone="blue">
        <Text style={styles.cardLabel}>Next action</Text>
        <Text style={styles.action}>{opportunity.nextAction}</Text>
        <Text style={styles.meta}>Source: {opportunity.source} - Match: {opportunity.matchScore}%</Text>
      </AppCard>

      <AppCard>
        <Text style={styles.sectionTitle}>Documents sent</Text>
        <View style={styles.row}>
          <Text style={styles.rowTitle}>{resume.title}</Text>
          <Text style={styles.score}>{resume.matchScore}%</Text>
        </View>
        <Text style={styles.meta}>{resume.focus}</Text>
      </AppCard>

      <AppCard>
        <Text style={styles.sectionTitle}>Contact</Text>
        <Text style={styles.rowTitle}>{opportunity.contactName ?? "No contact yet"}</Text>
        <Text style={styles.meta}>{opportunity.contactChannel ?? "Add recruiter, referrer, or hiring manager details."}</Text>
      </AppCard>

      <View style={styles.actions}>
        <Pressable style={styles.button} onPress={handleResumeMatch}>
          <Text style={styles.buttonText}>AI resume match</Text>
        </Pressable>
        <Pressable style={styles.button} onPress={handleFollowUp}>
          <Text style={styles.buttonText}>Draft follow-up</Text>
        </Pressable>
      </View>

      {assistantText ? (
        <AppCard tone="green">
          <Text style={styles.sectionTitle}>Assistant output</Text>
          <Text style={styles.meta}>{assistantText}</Text>
        </AppCard>
      ) : null}

      <Pressable style={styles.secondaryButton} onPress={() => Alert.alert("Status", "Stage updates are ready for SQLite persistence.")}>
        <Text style={styles.secondaryButtonText}>Update stage</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  eyebrow: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase"
  },
  title: {
    color: colors.ink,
    fontSize: 32,
    fontWeight: "900",
    marginTop: 4
  },
  subtitle: {
    color: colors.muted,
    fontSize: 16,
    marginTop: 3
  },
  cardLabel: {
    color: colors.blue,
    fontSize: 13,
    fontWeight: "800"
  },
  action: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: "900",
    lineHeight: 26,
    marginTop: 8
  },
  meta: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8
  },
  sectionTitle: {
    color: colors.ink,
    fontSize: 17,
    fontWeight: "900"
  },
  row: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12
  },
  rowTitle: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "800"
  },
  score: {
    color: colors.green,
    fontSize: 18,
    fontWeight: "900"
  },
  actions: {
    flexDirection: "row",
    gap: 10
  },
  button: {
    alignItems: "center",
    backgroundColor: colors.blue,
    borderRadius: 8,
    flex: 1,
    minHeight: 46,
    justifyContent: "center",
    paddingHorizontal: 12
  },
  buttonText: {
    color: colors.surface,
    fontSize: 13,
    fontWeight: "900"
  },
  secondaryButton: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 46,
    justifyContent: "center"
  },
  secondaryButtonText: {
    color: colors.blue,
    fontWeight: "900"
  }
});
