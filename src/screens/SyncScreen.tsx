import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from "react-native";

import { AppCard } from "../components/AppCard";
import { useAuthUser } from "../components/AuthGate";
import { MetricCard } from "../components/MetricCard";
import { Screen } from "../components/Screen";
import { logActivity } from "../services/supabase/activity";
import { supabase } from "../services/supabase/client";
import {
  connectPortalAccount,
  loadConnectedAccounts,
  loadSyncRuns,
  syncConnectedAccount
} from "../services/supabase/sync";
import { summarizeSyncHealth } from "../services/sync/syncEngine";
import { colors } from "../theme/colors";
import { ConnectedAccount, SourceType, SyncRun } from "../types/career";

const providerOrder: SourceType[] = ["emailParsing", "browserExtension", "manual"];

export function SyncScreen() {
  const user = useAuthUser();
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
  const [runs, setRuns] = useState<SyncRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyProvider, setBusyProvider] = useState<SourceType | null>(null);
  const [error, setError] = useState("");
  const [autoConnectAttempted, setAutoConnectAttempted] = useState(false);

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    refreshWorkspace();
  }, [user?.id]);

  useEffect(() => {
    logActivity(user?.id, "view_sync", {
      activePortalCount: accounts.filter((account) => providerOrder.includes(account.provider) && account.status === "connected").length
    });
  }, [accounts, user?.id]);

  useEffect(() => {
    if (!user?.id || !user.providerToken || loading || autoConnectAttempted) {
      return;
    }

    const shouldAutoConnect = typeof window !== "undefined"
      && new URLSearchParams(window.location.search).get("gmailConnect") === "1";

    if (!shouldAutoConnect) {
      return;
    }

    setAutoConnectAttempted(true);
    window.history.replaceState({}, document.title, window.location.pathname);

    const account = accounts.find((item) => item.provider === "emailParsing");
    if (account?.status === "connected") {
      return;
    }

    completeGmailConnect();
  }, [accounts, autoConnectAttempted, loading, user?.id, user?.providerToken]);

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

    if (provider !== "emailParsing") {
      Alert.alert(
        labelFor(provider),
        provider === "browserExtension"
          ? "Browser Sync is planned as a real capture flow from your browser session and confirmation pages. It is not live yet."
          : "Manual Import will land as a CSV and resume package importer. It is not live yet."
      );
      return;
    }

    setBusyProvider(provider);
    setError("");

    try {
      if (!user.providerToken) {
        await requestGmailReconnect();
        return;
      }

      await completeGmailConnect();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : `Could not connect ${labelFor(provider)}.`);
    } finally {
      setBusyProvider(null);
    }
  }

  async function completeGmailConnect() {
    if (!user?.id || !user.providerToken) {
      await requestGmailReconnect();
      return;
    }

    setBusyProvider("emailParsing");
    setError("");

    try {
      await connectPortalAccount(user.id, "emailParsing", { gmailAccessToken: user.providerToken });
      await refreshWorkspace();
      Alert.alert("Email sync connected", "Gmail inbox access is now linked to this workspace.");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Could not connect Email Sync.");
    } finally {
      setBusyProvider(null);
    }
  }

  async function handleSync(provider: SourceType) {
    if (!user?.id) {
      return;
    }

    if (provider !== "emailParsing") {
      Alert.alert("Not live yet", `${labelFor(provider)} is still planned and does not sync real data yet.`);
      return;
    }

    setBusyProvider(provider);
    setError("");

    try {
      if (!user.providerToken) {
        await requestGmailReconnect();
        return;
      }

      const result = await syncConnectedAccount(user.id, provider, { gmailAccessToken: user.providerToken });
      await refreshWorkspace();
      Alert.alert(
        "Sync completed",
        `Email Sync imported ${result?.run.importedCount ?? 0} records into the unified database.`
      );
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : `Could not sync ${labelFor(provider)}.`);
    } finally {
      setBusyProvider(null);
    }
  }

  const visibleAccounts = accounts.filter((account) => providerOrder.includes(account.provider));
  const visibleRuns = runs.filter((run) => providerOrder.includes(run.source));
  const health = summarizeSyncHealth(visibleAccounts, visibleRuns);

  return (
    <Screen>
      <View>
        <Text style={styles.eyebrow}>Unified sync</Text>
        <Text style={styles.title}>Honest sync sources</Text>
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
          Google signs the user in. Gmail sync is live now and pulls job-related emails into one canonical opportunity model.
          Browser Sync and Manual Import are shown honestly as next steps, not as fake integrations.
        </Text>
      </AppCard>

      {error ? (
        <AppCard tone="amber">
          <Text style={styles.rowMeta}>{error}</Text>
        </AppCard>
      ) : null}

      <View style={styles.sectionRow}>
        <Text style={styles.sectionTitle}>Available sync methods</Text>
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
        const account = visibleAccounts.find((item) => item.provider === provider);
        const isConnected = account?.status === "connected" || account?.status === "attention";
        const isBusy = busyProvider === provider;
        const isLive = provider === "emailParsing";

        return (
          <AppCard key={provider}>
            <View style={styles.row}>
              <View style={styles.rowCopy}>
                <Text style={styles.rowTitle}>{account?.label ?? labelFor(provider)}</Text>
                <Text style={styles.rowMeta}>{account?.notes ?? defaultCardCopy(provider, isConnected)}</Text>
                <Text style={styles.rowMeta}>
                  {isLive
                    ? `Method: ${formatMethod(account?.method)} ${account?.lastSyncedAt ? `- Last sync ${new Date(account.lastSyncedAt).toLocaleString()}` : ""}`
                    : "Status: planned next phase"}
                </Text>
              </View>
              <Text style={[styles.status, isLive ? styleForStatus(account?.status).container : styles.planned, isLive ? styleForStatus(account?.status).text : styles.plannedText]}>
                {isLive ? labelForStatus(account?.status) : "Planned"}
              </Text>
            </View>

            {isLive ? (
              <View style={styles.actions}>
                <Pressable
                  style={[styles.primaryButton, isBusy && styles.buttonDisabled]}
                  onPress={() => handleConnect(provider)}
                  disabled={isBusy}
                >
                  <Text style={styles.primaryButtonText}>{isConnected ? "Reconnect Gmail" : "Connect Gmail"}</Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.secondaryButton,
                    (!isConnected || isBusy) && styles.buttonDisabled,
                    !isConnected && styles.secondaryButtonDisabled
                  ]}
                  onPress={() => handleSync(provider)}
                  disabled={!isConnected || isBusy}
                >
                  <Text style={[styles.secondaryButtonText, !isConnected && styles.secondaryButtonTextDisabled]}>
                    {isBusy ? "Working..." : "Sync inbox"}
                  </Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.placeholderRow}>
                <Ionicons name="time-outline" size={16} color={colors.muted} />
                <Text style={styles.placeholderText}>
                  {provider === "browserExtension"
                    ? "Next we can add browser capture from confirmation pages or a Chrome extension."
                    : "Next we can add CSV upload for exported applications, resumes, and notes."}
                </Text>
              </View>
            )}
          </AppCard>
        );
      })}

      <Text style={styles.sectionTitle}>Recent sync runs</Text>
      {visibleRuns.map((run) => (
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
    browserExtension: "Browser Sync",
    emailParsing: "Email Sync",
    manual: "Manual Import"
  }[provider];
}

function defaultCardCopy(provider: SourceType, isConnected: boolean) {
  if (provider === "emailParsing") {
    return isConnected
      ? "Gmail-based application sync is ready and can pull recruiter emails, confirmations, and interview updates."
      : "Connect Gmail to sync real application emails into the unified pipeline.";
  }

  if (provider === "browserExtension") {
    return "This will become a real browser capture flow for job confirmations and saved applications.";
  }

  return "This will become a real CSV import flow for exported applications, resumes, and notes.";
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

async function requestGmailReconnect() {
  if (!supabase || typeof window === "undefined") {
    return;
  }

  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${window.location.origin}/MainTabs/Sync?gmailConnect=1`,
      scopes: [
        "openid",
        "email",
        "profile",
        "https://www.googleapis.com/auth/gmail.readonly"
      ].join(" "),
      queryParams: {
        access_type: "offline",
        include_granted_scopes: "true",
        prompt: "consent"
      }
    }
  });

  if (error) {
    throw error;
  }
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
  planned: {
    backgroundColor: colors.background,
    borderColor: colors.line,
    borderWidth: 1
  },
  plannedText: {
    color: colors.muted
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
  },
  placeholderRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    marginTop: 14
  },
  placeholderText: {
    color: colors.muted,
    flex: 1,
    fontSize: 13,
    lineHeight: 19
  }
});
