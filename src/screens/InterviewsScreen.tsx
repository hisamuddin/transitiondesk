import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import { AppCard } from "../components/AppCard";
import { useAuthUser } from "../components/AuthGate";
import { Screen } from "../components/Screen";
import { interviews } from "../data/seed";
import { addInterviewToCalendar } from "../services/calendar/calendarService";
import { logActivity } from "../services/supabase/activity";
import { colors } from "../theme/colors";

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
  async function handleAddToCalendar(interviewId: string) {
    const interview = interviews.find((item) => item.id === interviewId);
    if (!interview) {
      return;
    }

    try {
      await addInterviewToCalendar(interview);
      await logActivity(user?.id, "add_interview_to_calendar", { company: interview.company }, "interview", interview.id);
      Alert.alert("Added", `${interview.company} interview was added to your calendar.`);
    } catch (error) {
      Alert.alert("Calendar unavailable", error instanceof Error ? error.message : "Could not add event.");
    }
  }

  return (
    <Screen>
      <View>
        <Text style={styles.eyebrow}>Reminders and automation</Text>
        <Text style={styles.title}>Interview planner</Text>
      </View>

      {interviews.map((interview) => (
        <AppCard key={interview.id} tone="blue">
          <Text style={styles.time}>{formatInterviewTime(interview.startsAt)}</Text>
          <Text style={styles.rowTitle}>{interview.company} {interview.title}</Text>
          <Text style={styles.meta}>{interview.durationMinutes} minutes - {interview.format}</Text>

          <Text style={styles.sectionTitle}>Prep questions</Text>
          {interview.prepQuestions.map((question) => (
            <Text key={question} style={styles.question}>- {question}</Text>
          ))}

          <Pressable style={styles.button} onPress={() => handleAddToCalendar(interview.id)}>
            <Text style={styles.buttonText}>Add to calendar</Text>
          </Pressable>
        </AppCard>
      ))}
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
  button: {
    alignItems: "center",
    backgroundColor: colors.blue,
    borderRadius: 8,
    minHeight: 46,
    justifyContent: "center",
    marginTop: 16
  },
  buttonText: {
    color: colors.surface,
    fontWeight: "900"
  }
});
