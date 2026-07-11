import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { AppCard } from "../components/AppCard";
import { useAuthUser } from "../components/AuthGate";
import { MetricCard } from "../components/MetricCard";
import { OpportunityCard } from "../components/OpportunityCard";
import { Screen } from "../components/Screen";
import { followUps, interviews, opportunities } from "../data/seed";
import { RootStackParamList } from "../navigation/types";
import { loadUserOpportunities } from "../services/supabase/opportunities";
import { loadConnectedAccounts } from "../services/supabase/sync";
import { logActivity } from "../services/supabase/activity";
import { colors } from "../theme/colors";
import { ConnectedAccount, Opportunity } from "../types/career";

type Navigation = NativeStackNavigationProp<RootStackParamList>;

export function DashboardScreen() {
  const navigation = useNavigation<Navigation>();
  const user = useAuthUser();
  const [workspaceOpportunities, setWorkspaceOpportunities] = useState<Opportunity[]>(opportunities);
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);

  const active = workspaceOpportunities.filter((opportunity) => opportunity.stage !== "closed");
  const followUpsDue = followUps.filter((task) => !task.completed);
  const attention = [...active]
    .sort((left, right) => (left.followUpDueAt ?? "9999").localeCompare(right.followUpDueAt ?? "9999"))
    .slice(0, 3);

  useEffect(() => {
    if (!user?.id) {
      return;
    }

    Promise.all([loadUserOpportunities(user.id), loadConnectedAccounts(user.id)])
      .then(([nextOpportunities, nextAccounts]) => {
        if (nextOpportunities && nextOpportunities.length > 0) {
          setWorkspaceOpportunities(nextOpportunities);
        }
        setAccounts(nextAccounts);
      })
      .catch(() => {
        setWorkspaceOpportunities(opportunities);
      });
  }, [user?.id]);

  useEffect(() => {
    logActivity(user?.id, "view_dashboard", { activeCount: active.length, followUpsDue: followUpsDue.length });
  }, [active.length, followUpsDue.length, user?.id]);

  return (
    <Screen>
      <View>
        <Text style={styles.eyebrow}>From Job A to Job B</Text>
        <Text style={styles.title}>What needs attention right now?</Text>
      </View>

      <AppCard tone="blue">
        <Text style={styles.cardLabel}>Active transition workspace</Text>
        <Text style={styles.heroTitle}>Senior product design search</Text>
        <Text style={styles.heroText}>
          {accounts.length > 0
            ? `${accounts.filter((account) => account.status === "connected").length} connected sources are feeding your unified pipeline.`
            : "Portal sync, reminders, resumes, interviews, and offer notes in one mobile flow."}
        </Text>
      </AppCard>

      <View style={styles.metrics}>
        <MetricCard label="Active" value={active.length} caption="open opportunities" />
        <MetricCard label="Due" value={followUpsDue.length} caption="follow-ups waiting" tone="amber" />
        <MetricCard label="Calls" value={interviews.length} caption="scheduled" tone="green" />
        <MetricCard label="Match" value="85%" caption="avg resume score" tone="violet" />
      </View>

      <Text style={styles.sectionTitle}>Needs attention</Text>
      {attention.map((opportunity) => (
        <OpportunityCard
          key={opportunity.id}
          opportunity={opportunity}
          onPress={() => {
            logActivity(user?.id, "open_opportunity", { company: opportunity.company }, "opportunity", opportunity.id);
            navigation.navigate("OpportunityDetail", { opportunityId: opportunity.id });
          }}
        />
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
    lineHeight: 36,
    marginTop: 4
  },
  cardLabel: {
    color: colors.blue,
    fontSize: 13,
    fontWeight: "800"
  },
  heroTitle: {
    color: colors.ink,
    fontSize: 21,
    fontWeight: "900",
    marginTop: 8
  },
  heroText: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6
  },
  metrics: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10
  },
  sectionTitle: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: "900",
    marginTop: 4
  }
});
