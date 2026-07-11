import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import { AppCard } from "../components/AppCard";
import { Screen } from "../components/Screen";
import { opportunities, resumes } from "../data/seed";
import { draftCoverLetter } from "../services/ai/careerAssistant";
import { pickCareerDocument } from "../services/documents/documentStorage";
import { colors } from "../theme/colors";

export function DocumentsScreen() {
  const [assistantText, setAssistantText] = useState("");
  const topOpportunity = opportunities[0];

  async function handleImportDocument() {
    const document = await pickCareerDocument();
    if (document) {
      Alert.alert("Document saved", document.name);
    }
  }

  async function handleDraftCoverLetter() {
    const draft = await draftCoverLetter(topOpportunity);
    setAssistantText(draft);
  }

  return (
    <Screen>
      <View>
        <Text style={styles.eyebrow}>File storage and AI</Text>
        <Text style={styles.title}>Document studio</Text>
      </View>

      <AppCard tone="green">
        <Text style={styles.cardLabel}>Best match</Text>
        <Text style={styles.bigScore}>{resumes[0].matchScore}%</Text>
        <Text style={styles.meta}>Resume versions are linked back to the opportunities where each file was sent.</Text>
      </AppCard>

      <View style={styles.actions}>
        <Pressable style={styles.button} onPress={handleImportDocument}>
          <Text style={styles.buttonText}>Import resume</Text>
        </Pressable>
        <Pressable style={styles.button} onPress={handleDraftCoverLetter}>
          <Text style={styles.buttonText}>Draft cover letter</Text>
        </Pressable>
      </View>

      {resumes.map((resume) => (
        <AppCard key={resume.id}>
          <View style={styles.row}>
            <View style={styles.copy}>
              <Text style={styles.rowTitle}>{resume.title}</Text>
              <Text style={styles.meta}>{resume.focus}</Text>
            </View>
            <Text style={styles.score}>{resume.matchScore}%</Text>
          </View>
          <Text style={styles.used}>Used for {resume.usedForOpportunityIds.length} opportunities</Text>
        </AppCard>
      ))}

      {assistantText ? (
        <AppCard tone="blue">
          <Text style={styles.rowTitle}>Assistant draft</Text>
          <Text style={styles.meta}>{assistantText}</Text>
        </AppCard>
      ) : null}
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
    fontSize: 30,
    fontWeight: "900",
    marginTop: 4
  },
  cardLabel: {
    color: colors.green,
    fontSize: 13,
    fontWeight: "800"
  },
  bigScore: {
    color: colors.green,
    fontSize: 46,
    fontWeight: "900",
    lineHeight: 52,
    marginTop: 6
  },
  meta: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 5
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
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between"
  },
  copy: {
    flex: 1
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
  used: {
    color: colors.blue,
    fontSize: 12,
    fontWeight: "800",
    marginTop: 10
  }
});
