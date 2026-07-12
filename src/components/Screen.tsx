import { ReactNode, useEffect, useMemo, useState } from "react";
import { Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { useAuthUser, useSignOut } from "./AuthGate";
import { opportunities as demoOpportunities } from "../data/seed";
import { loadUserOpportunitiesQuietly } from "../services/supabase/opportunities";
import { TransitionProfile, getEmptyTransitionProfile, loadTransitionProfile } from "../services/supabase/transitionData";
import { colors } from "../theme/colors";
import { Opportunity } from "../types/career";

export function Screen({ children, onRefresh }: { children: ReactNode; onRefresh?: () => Promise<void> | void }) {
  const user = useAuthUser();
  const signOut = useSignOut();
  const [syncedOpportunities, setSyncedOpportunities] = useState<Opportunity[]>([]);
  const [transitionProfile, setTransitionProfile] = useState<TransitionProfile>(getEmptyTransitionProfile());
  const [targetOpen, setTargetOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const isDemo = user?.authProvider === "demo";
  const userStorageKey = user?.id ?? user?.email;

  useEffect(() => {
    let active = true;

    async function loadTargetContext() {
      if (!userStorageKey || isDemo) {
        setSyncedOpportunities(isDemo ? demoOpportunities : []);
        return;
      }

      try {
        const [records, profile] = await Promise.all([
          user?.id ? loadUserOpportunitiesQuietly(user.id) : Promise.resolve(null),
          loadTransitionProfile(userStorageKey)
        ]);
        if (active) {
          setSyncedOpportunities(records ?? []);
          setTransitionProfile(profile);
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
  }, [isDemo, user?.id, userStorageKey]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    function handleProfileSaved(event: Event) {
      setTransitionProfile((event as CustomEvent<TransitionProfile>).detail);
    }

    window.addEventListener("transitiondesk:profile-saved", handleProfileSaved);
    return () => window.removeEventListener("transitiondesk:profile-saved", handleProfileSaved);
  }, []);

  const targetOpportunity = useMemo(() => pickTargetOpportunity(syncedOpportunities), [syncedOpportunities]);
  const savedTargetLabel = transitionProfile.desiredRoles
    ? `${transitionProfile.currentRole || "Current role"} -> ${transitionProfile.desiredRoles}`
    : "";
  const targetLabel = savedTargetLabel || (targetOpportunity
    ? `${targetOpportunity.role} at ${targetOpportunity.company}`
    : "Target role not synced yet");
  const candidateName = user?.name || user?.email || "Candidate";
  const targetNeedsReview = !savedTargetLabel && (targetOpportunity ? needsRoleReview(targetOpportunity.role) : true);

  async function handleRefresh() {
    setRefreshing(true);
    try {
      if (onRefresh) {
        await onRefresh();
      } else if (Platform.OS === "web" && typeof window !== "undefined") {
        window.location.reload();
      }
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.blue} />}
        showsVerticalScrollIndicator={false}
      >
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
        </View>
        {targetOpen ? (
          <View style={[styles.targetPanel, targetNeedsReview && styles.targetPanelAttention]}>
            <View style={styles.panelHeader}>
              <Text style={styles.panelHeading}>Profile</Text>
              <Pressable style={styles.signOutButton} onPress={signOut}>
                <Ionicons name="log-out-outline" size={15} color={colors.red} />
                <Text style={styles.signOutText}>{isDemo ? "Exit demo" : "Sign out"}</Text>
              </Pressable>
            </View>
            <View style={styles.panelRow}>
              <Text style={styles.panelLabel}>Candidate</Text>
              <Text style={styles.panelValue}>{candidateName}</Text>
            </View>
            <View style={styles.panelRow}>
              <Text style={styles.panelLabel}>Target</Text>
              <Text style={styles.panelValue}>{targetLabel}</Text>
            </View>
            <View style={styles.panelGrid}>
              <View style={styles.panelGridItem}>
                <Text style={styles.panelLabel}>Current company</Text>
                <Text style={styles.panelValue}>{transitionProfile.currentCompany || "Not saved"}</Text>
              </View>
              <View style={styles.panelGridItem}>
                <Text style={styles.panelLabel}>CTC target</Text>
                <Text style={styles.panelValue}>
                  {transitionProfile.currentCtc || transitionProfile.expectedCtc
                    ? `${transitionProfile.currentCtc || "Current?"} -> ${transitionProfile.expectedCtc || "Expected?"}`
                    : "Not saved"}
                </Text>
              </View>
            </View>
            <View style={styles.panelGrid}>
              <View style={styles.panelGridItem}>
                <Text style={styles.panelLabel}>Resignation</Text>
                <Text style={styles.panelValue}>{transitionProfile.resignationDate || "Not saved"}</Text>
              </View>
              <View style={styles.panelGridItem}>
                <Text style={styles.panelLabel}>Last working day</Text>
                <Text style={styles.panelValue}>{transitionProfile.lastWorkingDay || "Not saved"}</Text>
              </View>
            </View>
            <View style={styles.panelGrid}>
              <View style={styles.panelGridItem}>
                <Text style={styles.panelLabel}>Interview time</Text>
                <Text style={styles.panelValue}>{transitionProfile.interviewAvailability || "Not saved"}</Text>
              </View>
              <View style={styles.panelGridItem}>
                <Text style={styles.panelLabel}>Confidential</Text>
                <Text style={styles.panelValue}>{transitionProfile.confidential ? "On" : "Off"}</Text>
              </View>
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
  panelHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  panelHeading: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "900"
  },
  signOutButton: {
    alignItems: "center",
    backgroundColor: colors.redSoft,
    borderColor: "#fecaca",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    minHeight: 34,
    paddingHorizontal: 10
  },
  signOutText: {
    color: colors.red,
    fontSize: 12,
    fontWeight: "900"
  },
  panelRow: {
    gap: 3
  },
  panelGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10
  },
  panelGridItem: {
    flexBasis: 180,
    flexGrow: 1,
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
