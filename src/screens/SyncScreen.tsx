import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from "react-native";

import { AppCard } from "../components/AppCard";
import { useAuthUser } from "../components/AuthGate";
import { MetricCard } from "../components/MetricCard";
import { Screen } from "../components/Screen";
import { logActivity } from "../services/supabase/activity";
import {
  connectPortalAccount,
  loadConnectedAccounts,
  loadSyncRuns,
  syncConnectedAccount
} from "../services/supabase/sync";
import { summarizeSyncHealth } from "../services/sync/syncEngine";
import { colors } from "../theme/colors";
import { ConnectedAccount, SourceType, SyncRun } from "../types/career";

const providerOrder: SourceType[] = ["linkedin", "naukri", "indeed", "shine"];

export function SyncScreen() {
  const user = useAuthUser();
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
  const [runs, setRuns] = useState<SyncRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyProvider, setBusyProvider] = useState<SourceType | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    refreshWorkspace();
  }, [user?.id]);

  useEffect(() => {
    logActivity(user?.id, "view_sync", { activePortalCount: accounts.filter((account) => account.status === "connected").length });
  }, [accounts, user?.id]);

  async function refreshWorkspace() {
    if (!user?.id) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const [nextAccounts, nextRuns] = await Promise.all([loadConnectedAccounts(user.id), loadSyncRuns(user.id)]);
      setAccounts(nextAccounts);
      setRuns(nextRuns);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Could not load sync workspace.");
    } finally {
      setLoading(false);
    }
  }

  async function handleConnect(provider: SourceType) {
    if (!user?.id) {
      return;
    }

    setBusyProvider(provider);
    setError("");

    try {
      await connectPortalAccount(user.id, provider);
      await refreshWorkspace();
      Alert.alert("Source connected", `${labelFor(provider)} is now linked to this workspace.`);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : `Could not connect ${labelFor(provider)}.`);
    } finally {
      setBusyProvider(null);
    }
  }

  async function handleSync(provider: SourceType) {
    if (!user?.id) {
      return;
    }

    setBusyProvider(provider);
    setError("");

    try {
      const result = await syncConnectedAccount(user.id, provider);
      await refreshWorkspace();
      Alert.alert(
        "Sync completed",
        `${labelFor(provider)} imported ${result?.run.importedCount ?? 0} records into the unified database.`
      );
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : `Could not sync ${labelFor(provider)}.`);
    } finally {
      setBusyProvider(null);
    }
  }

  const health = summarizeSyncHealth(accounts, runs);

  return (
    <Screen>
      <View>
        <Text style={styles.eyebrow}>Job portal sync</Text>
        <Text style={styles.title}>Connect accounts</Text>
      </View>

      <View style={styles.metrics}>
        <MetricCard label="Sources" value={health.activePortalCount} caption="connected" />
        <MetricCard label="Imported" value={health.importedCount} caption="normalized records" tone="green" />
        <MetricCard label="Fallback" value={health.fallbackSourceCount} caption="email driven" tone="amber" />
      </View>

      <AppCard>
        <View style={styles.flowHeader}>
          <Ionicons name="git-network-outline" size={24} color={colors.blue} />
          <Text style={styles.flowTitle}>Normalize and map fields</Text>
        </View>
        <Text style={styles.flowText}>
          Google signs the user in. Each portal is then linked separately, synced into one canonical opportunity model, and tracked
          with raw source events plus sync history.
        </Text>
      </AppCard>

      {error ? (
        <AppCard tone="amber">
          <Text style={styles.rowMeta}>{error}</Text>
        </AppCard>
      ) : null}

      <View style={styles.sectionRow}>
        <Text style={styles.sectionTitle}>Connected portals</Text>
        <Pressable style={styles.refreshButton} onPress={refreshWorkspace}>
          <Text style={styles.refreshButtonText}>Refresh</Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator color={colors.blue} />
          <Text style={styles.rowMeta}>Loading sync workspace...</Text>
        </View>
      ) : null}

      {!loading && providerOrder.map((provider) => {
        const account = accounts.find((item) => item.provider === provider);
        const isBusy = busyProvider === provider;

        return (
          <AppCard key={provider}>
            <View style={styles.row}>
              <View style={styles.rowCopy}>
                <Text style={styles.rowTitle}>{account?.label ?? labelFor(provider)}</Text>
                <Text style={styles.rowMeta}>
                  {account?.notes ?? "No connection yet. Connect the portal to start importing opportunities."}
                </Text>
                <Text style={styles.rowMeta}>
                  Method: {formatMethod(account?.method)} {account?.lastSyncedAt ? `- Last sync ${new Date(account.lastSyncedAt).toLocaleString()}` : ""}
                </Text>
              </View>
              <Text style={[styles.status, styleForStatus(account?.status).container, styleForStatus(account?.status).text]}>
                {labelForStatus(account?.status)}
              </Text>
            </View>

            <View style={styles.actions}>
              <Pressable
                style={[styles.primaryButton, isBusy && styles.buttonDisabled]}
                onPress={() => handleConnect(provider)}
                disabled={isBusy}
              >
                <Text style={styles.primaryButtonText}>{account ? "Reconnect" : "Connect"}</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.secondaryButton,
                  (!account || isBusy) && styles.buttonDisabled,
                  !account && styles.secondaryButtonDisabled
                ]}
                onPress={() => handleSync(provider)}
                disabled={!account || isBusy}
              >
                <Text style={[styles.secondaryButtonText, !account && styles.secondaryButtonTextDisabled]}>
                  {isBusy ? "Working..." : "Sync now"}
                </Text>
              </Pressable>
            </View>
          </AppCard>
        );
      })}

      <Text style={styles.sectionTitle}>Recent sync runs</Text>
      {runs.map((run) => (
        <AppCard key={run.id} tone={run.status === "completed" ? "green" : run.status === "failed" ? "amber" : "blue"}>
          <Text style={styles.rowTitle}>{labelFor(run.source)}</Text>
          <Text style={styles.rowMeta}>
            {run.status} - imported {run.importedCount} - updated {run.updatedCount ?? 0} - mapped {run.mappedFields.join(", ")}
          </Text>
          {run.errorMessage ? <Text style={styles.rowMeta}>{run.errorMessage}</Text> : null}
        </AppCard>
      ))}
    </Screen>
  );
}

function labelFor(provider: SourceType) {
  return {
    linkedin: "LinkedIn",
    naukri: "Naukri",
    indeed: "Indeed",
    shine: "Shine",
    browserExtension: "Browser extension",
    emailParsing: "Email parsing",
    manual: "Manual"
  }[provider];
}

function formatMethod(method: ConnectedAccount["method"] | undefined) {
  return {
    official_api: "Official API",
    email_fallback: "Email fallback",
    manual_import: "Manual import"
  }[method ?? "manual_import"];
}

function labelForStatus(status: ConnectedAccount["status"] | undefined) {
  return {
    connected: "Connected",
    attention: "Needs attention",
    not_connected: "Not connected"
  }[status ?? "not_connected"];
}

function styleForStatus(status: ConnectedAccount["status"] | undefined) {
  if (status === "connected") {
    return { container: styles.connected, text: styles.connectedText };
  }

  if (status === "attention") {
    return { container: styles.attention, text: styles.attentionText };
  }

  return { container: styles.disconnected, text: styles.disconnectedText };
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
  sectionRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  sectionTitle: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: "900",
    marginTop: 4
  },
  refreshButton: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  refreshButtonText: {
    color: colors.blue,
    fontSize: 12,
    fontWeight: "800"
  },
  loadingState: {
    alignItems: "center",
    gap: 10,
    paddingVertical: 12
  },
  row: {
    gap: 12
  },
  rowCopy: {
    gap: 4
  },
  rowTitle: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "800"
  },
  rowMeta: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19
  },
  status: {
    alignSelf: "flex-start",
    borderRadius: 999,
    marginTop: 8,
    overflow: "hidden",
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  connected: {
    backgroundColor: colors.greenSoft
  },
  connectedText: {
    color: colors.green
  },
  attention: {
    backgroundColor: colors.amberSoft
  },
  attentionText: {
    color: colors.amber
  },
  disconnected: {
    backgroundColor: colors.redSoft
  },
  disconnectedText: {
    color: colors.red
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: colors.blue,
    borderRadius: 8,
    flex: 1,
    justifyContent: "center",
    minHeight: 44
  },
  primaryButtonText: {
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
    flex: 1,
    justifyContent: "center",
    minHeight: 44
  },
  secondaryButtonText: {
    color: colors.blue,
    fontSize: 13,
    fontWeight: "900"
  },
  secondaryButtonDisabled: {
    backgroundColor: colors.background
  },
  secondaryButtonTextDisabled: {
    color: colors.muted
  },
  buttonDisabled: {
    opacity: 0.6
  }
});
