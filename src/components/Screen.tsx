import { ReactNode, useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { useAuthUser, useSignOut } from "./AuthGate";
import { opportunities as demoOpportunities } from "../data/seed";
import { loadUserOpportunitiesQuietly } from "../services/supabase/opportunities";
import { colors } from "../theme/colors";
import { Opportunity } from "../types/career";

export function Screen({ children }: { children: ReactNode }) {
  const user = useAuthUser();
  const signOut = useSignOut();
  const [syncedOpportunities, setSyncedOpportunities] = useState<Opportunity[]>([]);
  const [targetOpen, setTargetOpen] = useState(false);
  const isDemo = user?.authProvider === "demo";

  useEffect(() => {
    let active = true;

    async function loadTargetContext() {
      if (!user?.id || isDemo) {
        setSyncedOpportunities(isDemo ? demoOpportunities : []);
        return;
      }

      try {
        const records = await loadUserOpportunitiesQuietly(user.id);
        if (active) {
          setSyncedOpportunities(records ?? []);
        }
      } catch {
        if (active) {
          setSyncedOpportunities([]);
        }
      }
    }

    loadTargetContext();
    return () => {
      active = false;
    };
  }, [isDemo, user?.id]);

  const targetOpportunity = useMemo(() => pickTargetOpportunity(syncedOpportunities), [syncedOpportunities]);
  const targetLabel = targetOpportunity
    ? `${targetOpportunity.role} at ${targetOpportunity.company}`
    : "Target role not synced yet";
  const candidateName = user?.name || user?.email || "Candidate";
  const targetNeedsReview = targetOpportunity ? needsRoleReview(targetOpportunity.role) : true;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={styles.brand}>Transition Desk</Text>
            <Text style={styles.account} numberOfLines={1}>
              {user?.email ?? "Career transition workspace"}
            </Text>
          </View>
          <Pressable style={styles.targetChip} onPress={() => setTargetOpen((current) => !current)}>
            <Ionicons name="person-circle-outline" size={18} color={colors.blue} />
            <View style={styles.targetCopy}>
              <Text style={styles.targetName} numberOfLines={1}>{candidateName}</Text>
              <Text style={styles.targetRole} numberOfLines={1}>{targetLabel}</Text>
            </View>
            <Ionicons name={targetOpen ? "chevron-up" : "chevron-down"} size={16} color={colors.muted} />
          </Pressable>
          {user?.authProvider !== "demo" ? (
            <Pressable style={styles.iconButton} onPress={signOut}>
              <Ionicons name="log-out-outline" size={18} color={colors.red} />
            </Pressable>
          ) : null}
        </View>
        {targetOpen ? (
          <View style={[styles.targetPanel, targetNeedsReview && styles.targetPanelAttention]}>
            <View style={styles.panelRow}>
              <Text style={styles.panelLabel}>Candidate</Text>
              <Text style={styles.panelValue}>{candidateName}</Text>
            </View>
            <View style={styles.panelRow}>
              <Text style={styles.panelLabel}>Target</Text>
              <Text style={styles.panelValue}>{targetLabel}</Text>
            </View>
            <View style={styles.panelRow}>
              <Text style={styles.panelLabel}>Next action</Text>
              <Text style={styles.panelValue}>
                {targetOpportunity?.nextAction ?? "Reconnect Gmail, sync inbox, then choose the role to focus on."}
              </Text>
            </View>
            {targetNeedsReview ? (
              <Text style={styles.reviewNote}>
                Role title needs review from the source email or job link.
              </Text>
            ) : null}
          </View>
        ) : null}
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

function pickTargetOpportunity(opportunities: Opportunity[]) {
  const active = opportunities.filter((opportunity) => opportunity.stage !== "closed");
  return active.sort((left, right) => {
    const leftDate = Date.parse(left.interviewStartsAt ?? left.followUpDueAt ?? left.updatedAt);
    const rightDate = Date.parse(right.interviewStartsAt ?? right.followUpDueAt ?? right.updatedAt);
    return rightDate - leftDate;
  })[0];
}

function needsRoleReview(role: string) {
  return /application update|role mentioned|imported application|not synced/i.test(role);
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: colors.background,
    flex: 1
  },
  content: {
    gap: 14,
    padding: 16,
    paddingBottom: 112
  },
  header: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12
  },
  headerCopy: {
    flex: 1,
    paddingRight: 10
  },
  brand: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: "900"
  },
  account: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 3
  },
  targetChip: {
    alignItems: "center",
    backgroundColor: colors.blueSoft,
    borderColor: "#bdd1f4",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    maxWidth: 420,
    minHeight: 42,
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  targetCopy: {
    flexShrink: 1,
    minWidth: 120
  },
  targetName: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: "900"
  },
  targetRole: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 2
  },
  iconButton: {
    alignItems: "center",
    backgroundColor: colors.redSoft,
    borderRadius: 8,
    height: 38,
    justifyContent: "center",
    width: 38
  },
  targetPanel: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
    padding: 14
  },
  targetPanelAttention: {
    backgroundColor: colors.amberSoft,
    borderColor: "#efd59a"
  },
  panelRow: {
    gap: 3
  },
  panelLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  panelValue: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "800"
  },
  reviewNote: {
    color: colors.amber,
    fontSize: 12,
    fontWeight: "800",
    marginTop: 2
  }
});
