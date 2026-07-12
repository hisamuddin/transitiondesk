import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEffect, useState } from "react";
import { Alert, Linking, Pressable, StyleSheet, Text, View } from "react-native";

import { AppCard } from "../components/AppCard";
import { useAuthUser } from "../components/AuthGate";
import { Screen } from "../components/Screen";
import { opportunities, resumes } from "../data/seed";
import { RootStackParamList } from "../navigation/types";
import { draftFollowUp, suggestResumeImprovements } from "../services/ai/careerAssistant";
import { loadUserOpportunities } from "../services/supabase/opportunities";
import { loadSourceEvents } from "../services/supabase/sync";
import { colors } from "../theme/colors";
import { Opportunity, SourceEvent } from "../types/career";

type Props = NativeStackScreenProps<RootStackParamList, "OpportunityDetail">;

export function OpportunityDetailScreen({ route }: Props) {
  const user = useAuthUser();
  const [workspaceOpportunity, setWorkspaceOpportunity] = useState<Opportunity | null>(
    opportunities.find((item) => item.id === route.params.opportunityId) ?? opportunities[0]
  );
  const [events, setEvents] = useState<SourceEvent[]>([]);
  const opportunity = workspaceOpportunity ?? opportunities[0];
  const resume = resumes.find((item) => item.id === opportunity.resumeVersionId) ?? resumes[0];
  const [assistantText, setAssistantText] = useState("");

  useEffect(() => {
    if (!user?.id) {
      return;
    }

    loadUserOpportunities(user.id)
      .then((nextOpportunities) => {
        const match = nextOpportunities?.find((item) => item.id === route.params.opportunityId);
        if (match) {
          setWorkspaceOpportunity(match);
        }
      })
      .catch(() => undefined);

    loadSourceEvents(user.id, route.params.opportunityId)
      .then((nextEvents) => setEvents(nextEvents))
      .catch(() => setEvents([]));
  }, [route.params.opportunityId, user?.id]);

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
        {opportunity.extractionConfidence ? (
          <Text style={styles.meta}>Email parse confidence: {opportunity.extractionConfidence}%</Text>
        ) : null}
        {opportunity.lastSourceSyncAt ? (
          <Text style={styles.meta}>Last sync: {new Date(opportunity.lastSourceSyncAt).toLocaleString()}</Text>
        ) : null}
      </AppCard>

      {opportunity.interviewStartsAt || opportunity.interviewDetails || opportunity.roleResponsibilities?.length ? (
        <AppCard>
          <Text style={styles.sectionTitle}>Role intelligence</Text>
          {opportunity.interviewStartsAt || opportunity.interviewDetails ? (
            <>
              <Text style={styles.rowTitle}>Interview</Text>
              <Text style={styles.meta}>
                {[formatDetailDate(opportunity.interviewStartsAt), opportunity.interviewDetails].filter(Boolean).join(" - ")}
              </Text>
            </>
          ) : null}

          {opportunity.roleResponsibilities?.length ? (
            <>
              <Text style={styles.subsectionTitle}>Responsibilities</Text>
              {opportunity.roleResponsibilities.map((item) => (
                <Text key={item} style={styles.bullet}>- {item}</Text>
              ))}
            </>
          ) : null}
        </AppCard>
      ) : null}

      <AppCard>
        <Text style={styles.sectionTitle}>Documents sent</Text>
        <View style={styles.row}>
          <Text style={styles.rowTitle}>{resume.title}</Text>
          <Text style={styles.score}>{resume.matchScore}%</Text>
        </View>
        <Text style={styles.meta}>{resume.focus}</Text>
        {opportunity.attachments?.length ? (
          <>
            <Text style={styles.subsectionTitle}>Email attachments</Text>
            {opportunity.attachments.map((attachment) => (
              <Text key={attachment} style={styles.bullet}>- {attachment}</Text>
            ))}
          </>
        ) : null}
      </AppCard>

      <AppCard>
        <Text style={styles.sectionTitle}>Contact</Text>
        <Text style={styles.rowTitle}>{opportunity.contactName ?? "No contact yet"}</Text>
        <Text style={styles.meta}>{opportunity.contactChannel ?? "Add recruiter, referrer, or hiring manager details."}</Text>
        {opportunity.contactEmail ? (
          <Pressable onPress={() => Linking.openURL(`mailto:${opportunity.contactEmail}`)}>
            <Text style={styles.inlineLink}>{opportunity.contactEmail}</Text>
          </Pressable>
        ) : null}
      </AppCard>

      <AppCard>
        <Text style={styles.sectionTitle}>Sync provenance</Text>
        {opportunity.sourceSubject ? <Text style={styles.meta}>Subject: {opportunity.sourceSubject}</Text> : null}
        {opportunity.sourceReceivedAt ? (
          <Text style={styles.meta}>Received: {new Date(opportunity.sourceReceivedAt).toLocaleString()}</Text>
        ) : null}
        {opportunity.sourceSnippet ? <Text style={styles.meta}>Snippet: {opportunity.sourceSnippet}</Text> : null}
        {opportunity.jobPostingUrl ? (
          <Pressable style={styles.linkButton} onPress={() => Linking.openURL(opportunity.jobPostingUrl!)}>
            <Text style={styles.linkButtonText}>Open job posting</Text>
          </Pressable>
        ) : null}
        {opportunity.applicationUrl && opportunity.applicationUrl !== opportunity.jobPostingUrl ? (
          <Pressable style={styles.linkButton} onPress={() => Linking.openURL(opportunity.applicationUrl!)}>
            <Text style={styles.linkButtonText}>Open application link</Text>
          </Pressable>
        ) : null}
        {opportunity.sourceLinks?.length ? (
          <>
            <Text style={styles.subsectionTitle}>Links found in email</Text>
            {opportunity.sourceLinks.slice(0, 4).map((link) => (
              <Pressable key={link} onPress={() => Linking.openURL(link)}>
                <Text style={styles.inlineLink} numberOfLines={2}>{link}</Text>
              </Pressable>
            ))}
          </>
        ) : null}
        {opportunity.dataQualityNotes?.length ? (
          <>
            <Text style={styles.subsectionTitle}>Needs review</Text>
            {opportunity.dataQualityNotes.map((note) => (
              <Text key={note} style={styles.bullet}>- {note}</Text>
            ))}
          </>
        ) : null}
        <Text style={styles.meta}>Fingerprint: {opportunity.fingerprint ?? "Pending sync fingerprint"}</Text>
        <Text style={styles.meta}>Source account: {opportunity.sourceAccountId ?? "Manual or unlinked source"}</Text>
        {events.slice(0, 2).map((event) => (
          <Text key={event.id} style={styles.meta}>
            {event.provider}: {event.eventType} at {new Date(event.createdAt).toLocaleString()}
          </Text>
        ))}
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

function formatDetailDate(value?: string) {
  if (!value) {
    return "";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
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
  subsectionTitle: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "900",
    marginTop: 14
  },
  bullet: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6
  },
  linkButton: {
    alignItems: "center",
    backgroundColor: colors.blue,
    borderRadius: 8,
    justifyContent: "center",
    marginTop: 12,
    minHeight: 42,
    paddingHorizontal: 12
  },
  linkButtonText: {
    color: colors.surface,
    fontSize: 13,
    fontWeight: "900"
  },
  inlineLink: {
    color: colors.blue,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 7
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
