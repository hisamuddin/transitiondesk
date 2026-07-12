import { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import { AppCard } from "../components/AppCard";
import { useAuthUser } from "../components/AuthGate";
import { Screen } from "../components/Screen";
import { interviews as demoInterviews } from "../data/seed";
import { addInterviewToCalendar } from "../services/calendar/calendarService";
import { logActivity } from "../services/supabase/activity";
import { loadUserOpportunitiesQuietly } from "../services/supabase/opportunities";
import { colors } from "../theme/colors";
import { Interview, Opportunity } from "../types/career";

function formatInterviewTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    month: "short"
  }).format(new Date(value));
}

export function InterviewsScreen() {
  const user = useAuthUser();
  const isDemo = user?.authProvider === "demo";
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);

  useEffect(() => {
    refreshInterviews();
  }, [isDemo, user?.id]);

  async function refreshInterviews() {
    if (!user?.id || isDemo) {
      setOpportunities([]);
      return;
    }

    try {
      setOpportunities(await loadUserOpportunitiesQuietly(user.id) ?? []);
    } catch {
      setOpportunities([]);
    }
  }

  const interviews = useMemo(() => {
    if (isDemo) {
      return demoInterviews;
    }

    return opportunities
      .filter((opportunity) => opportunity.interviewStartsAt)
      .map((opportunity) => opportunityToInterview(opportunity));
  }, [isDemo, opportunities]);

  async function handleAddToCalendar(interview: Interview) {
    try {
      await addInterviewToCalendar(interview);
      await logActivity(user?.id, "add_interview_to_calendar", { company: interview.company }, "interview", interview.id);
      Alert.alert("Added", `${interview.company} interview was added to your calendar.`);
    } catch (error) {
      Alert.alert("Calendar unavailable", error instanceof Error ? error.message : "Could not add event.");
    }
  }

  async function handlePrepDone(interview: Interview) {
    await logActivity(user?.id, "interview_prep_done", {
      company: interview.company,
      title: interview.title,
      startsAt: interview.startsAt
    }, "interview", interview.id);
    Alert.alert("Prep logged", "This prep action was saved to recent activity.");
  }

  return (
    <Screen onRefresh={refreshInterviews}>
      <View>
        <Text style={styles.eyebrow}>Reminders and automation</Text>
        <Text style={styles.title}>Interview planner</Text>
      </View>

      {interviews.length === 0 ? (
        <AppCard>
          <Text style={styles.rowTitle}>No interviews synced yet</Text>
          <Text style={styles.meta}>
            Sync Gmail or update an opportunity with interview date details. Interview cards will appear here with prep prompts and calendar actions.
          </Text>
        </AppCard>
      ) : null}

      {interviews.map((interview) => (
        <AppCard key={interview.id} tone="blue">
          <Text style={styles.time}>{formatInterviewTime(interview.startsAt)}</Text>
          <Text style={styles.rowTitle}>{interview.company} {interview.title}</Text>
          <Text style={styles.meta}>{interview.durationMinutes} minutes - {interview.format}</Text>

          <Text style={styles.sectionTitle}>Prep questions</Text>
          {interview.prepQuestions.map((question) => (
            <Text key={question} style={styles.question}>- {question}</Text>
          ))}

          <View style={styles.actions}>
            <Pressable style={styles.button} onPress={() => handleAddToCalendar(interview)}>
              <Text style={styles.buttonText}>Add to calendar</Text>
            </Pressable>
            <Pressable style={styles.secondaryButton} onPress={() => handlePrepDone(interview)}>
              <Text style={styles.secondaryButtonText}>Log prep done</Text>
            </Pressable>
          </View>
        </AppCard>
      ))}
    </Screen>
  );
}

function opportunityToInterview(opportunity: Opportunity): Interview {
  return {
    id: `interview-${opportunity.id}`,
    opportunityId: opportunity.id,
    company: opportunity.company,
    title: opportunity.interviewDetails ?? `${opportunity.role} interview`,
    startsAt: opportunity.interviewStartsAt!,
    durationMinutes: 45,
    format: opportunity.interviewDetails?.toLowerCase().includes("phone") ? "phone" : "video",
    prepQuestions: [
      `Why ${opportunity.company}?`,
      `How does your experience fit ${opportunity.role}?`,
      ...(opportunity.roleResponsibilities?.slice(0, 3).map((responsibility) => `Prepare story for: ${responsibility}`) ?? [])
    ]
  };
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
  time: {
    color: colors.blue,
    fontSize: 13,
    fontWeight: "900"
  },
  rowTitle: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: "900",
    marginTop: 8
  },
  meta: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4
  },
  sectionTitle: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "900",
    marginTop: 16
  },
  question: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 5
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16
  },
  button: {
    alignItems: "center",
    backgroundColor: colors.blue,
    borderRadius: 8,
    flex: 1,
    justifyContent: "center",
    minHeight: 46
  },
  buttonText: {
    color: colors.surface,
    fontWeight: "900"
  },
  secondaryButton: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    minHeight: 46
  },
  secondaryButtonText: {
    color: colors.blue,
    fontWeight: "900"
  }
});
