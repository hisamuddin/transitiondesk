import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { AppCard } from "../components/AppCard";
import { useAuthUser } from "../components/AuthGate";
import { MetricCard } from "../components/MetricCard";
import { Screen } from "../components/Screen";
import { AdminAnalytics, loadAdminAnalytics, loadRecentActivity } from "../services/supabase/analytics";
import { isSupabaseConfigured } from "../services/supabase/client";
import { colors } from "../theme/colors";

export function AdminScreen() {
  const user = useAuthUser();
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [activity, setActivity] = useState<any[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user?.isAdmin || !isSupabaseConfigured) {
      return;
    }

    Promise.all([loadAdminAnalytics(), loadRecentActivity()])
      .then(([nextAnalytics, nextActivity]) => {
        setAnalytics(nextAnalytics);
        setActivity(nextActivity);
      })
      .catch((caughtError) => {
        setError(caughtError instanceof Error ? caughtError.message : "Could not load admin analytics.");
      });
  }, [user]);

  if (!user?.isAdmin) {
    return (
      <Screen>
        <Text style={styles.eyebrow}>Admin</Text>
        <Text style={styles.title}>Access restricted</Text>
        <AppCard>
          <Text style={styles.meta}>Your email is not listed in EXPO_PUBLIC_ADMIN_EMAILS.</Text>
        </AppCard>
      </Screen>
    );
  }

  if (!isSupabaseConfigured) {
    return (
      <Screen>
        <Text style={styles.eyebrow}>Admin</Text>
        <Text style={styles.title}>Database not connected</Text>
        <AppCard tone="amber">
          <Text style={styles.meta}>Set Supabase environment variables to view live user and activity analytics.</Text>
        </AppCard>
      </Screen>
    );
  }

  return (
    <Screen>
      <View>
        <Text style={styles.eyebrow}>Admin analytics</Text>
        <Text style={styles.title}>Usage dashboard</Text>
      </View>

      {error ? (
        <AppCard tone="amber">
          <Text style={styles.meta}>{error}</Text>
        </AppCard>
      ) : null}

      <View style={styles.metrics}>
        <MetricCard label="Users" value={analytics?.total_users ?? "-"} caption="total signups" />
        <MetricCard label="Active" value={analytics?.active_users_7d ?? "-"} caption="last 7 days" tone="green" />
        <MetricCard label="Opps" value={analytics?.total_opportunities ?? "-"} caption="tracked roles" tone="blue" />
        <MetricCard label="Events" value={analytics?.total_activity_events ?? "-"} caption="activity logs" tone="violet" />
        <MetricCard label="Links" value={analytics?.total_connected_accounts ?? "-"} caption="connected sources" tone="amber" />
        <MetricCard label="Syncs" value={analytics?.total_sync_runs ?? "-"} caption="run history" tone="green" />
      </View>

      <Text style={styles.sectionTitle}>Recent activity</Text>
      <AppCard>
        <View style={styles.tableHeader}>
          <Text style={[styles.tableCell, styles.tableHeadCell]}>Event</Text>
          <Text style={[styles.tableCell, styles.tableHeadCell]}>User</Text>
          <Text style={[styles.tableCell, styles.tableHeadCell]}>Time</Text>
        </View>
        {activity.slice(0, 12).map((event) => (
          <View key={event.id} style={styles.tableRow}>
            <Text style={styles.tableCell} numberOfLines={1}>{event.event_type}</Text>
            <Text style={styles.tableCell} numberOfLines={1}>{event.profiles?.email ?? "Unknown user"}</Text>
            <Text style={styles.tableCell} numberOfLines={1}>{new Date(event.created_at).toLocaleString()}</Text>
          </View>
        ))}
        {activity.length === 0 ? <Text style={styles.meta}>No recent activity found.</Text> : null}
      </AppCard>
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
  },
  meta: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 5
  },
  tableHeader: {
    backgroundColor: colors.background,
    borderRadius: 8,
    flexDirection: "row",
    paddingHorizontal: 10,
    paddingVertical: 10
  },
  tableRow: {
    borderTopColor: colors.line,
    borderTopWidth: 1,
    flexDirection: "row",
    paddingHorizontal: 10,
    paddingVertical: 10
  },
  tableCell: {
    color: colors.ink,
    flex: 1,
    fontSize: 12,
    fontWeight: "700"
  },
  tableHeadCell: {
    color: colors.muted,
    fontWeight: "900",
    textTransform: "uppercase"
  }
});
