import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

import { AppCard } from "../components/AppCard";
import { MetricCard } from "../components/MetricCard";
import { Screen } from "../components/Screen";
import { listRecentSyncRuns, listSyncSources, summarizeSyncHealth } from "../services/sync/syncEngine";
import { colors } from "../theme/colors";

export function SyncScreen() {
  const sources = listSyncSources();
  const runs = listRecentSyncRuns();
  const health = summarizeSyncHealth();

  return (
    <Screen>
      <View>
        <Text style={styles.eyebrow}>Job portal sync</Text>
        <Text style={styles.title}>Sync engine</Text>
      </View>

      <View style={styles.metrics}>
        <MetricCard label="Sources" value={health.activePortalCount} caption="connected" />
        <MetricCard label="Imported" value={health.importedCount} caption="applications" tone="green" />
      </View>

      <AppCard>
        <View style={styles.flowHeader}>
          <Ionicons name="git-network-outline" size={24} color={colors.blue} />
          <Text style={styles.flowTitle}>Normalize and map fields</Text>
        </View>
        <Text style={styles.flowText}>
          LinkedIn, Naukri, Indeed, browser extension captures, and parsed emails become one opportunity record with stage,
          contact, next action, document links, reminders, and analytics.
        </Text>
      </AppCard>

      <Text style={styles.sectionTitle}>Sources</Text>
      {sources.map((source) => (
        <AppCard key={source.id}>
          <View style={styles.row}>
            <View>
              <Text style={styles.rowTitle}>{source.label}</Text>
              <Text style={styles.rowMeta}>{source.importedCount} imported records</Text>
            </View>
            <Text style={[styles.status, source.connected ? styles.connected : styles.disconnected]}>
              {source.connected ? "Connected" : "Off"}
            </Text>
          </View>
        </AppCard>
      ))}

      <Text style={styles.sectionTitle}>Recent sync runs</Text>
      {runs.map((run) => (
        <AppCard key={run.id} tone={run.status === "completed" ? "green" : "amber"}>
          <Text style={styles.rowTitle}>{run.source}</Text>
          <Text style={styles.rowMeta}>{run.status} - {run.importedCount} imported - {run.mappedFields.join(", ")}</Text>
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
  metrics: {
    flexDirection: "row",
    gap: 10
  },
  flowHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10
  },
  flowTitle: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: "900"
  },
  flowText: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 10
  },
  sectionTitle: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: "900",
    marginTop: 4
  },
  row: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12
  },
  rowTitle: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "800",
    textTransform: "capitalize"
  },
  rowMeta: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 3
  },
  status: {
    borderRadius: 999,
    fontSize: 12,
    fontWeight: "800",
    overflow: "hidden",
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  connected: {
    backgroundColor: colors.greenSoft,
    color: colors.green
  },
  disconnected: {
    backgroundColor: colors.redSoft,
    color: colors.red
  }
});
