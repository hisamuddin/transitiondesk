import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";
import { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { AppCard } from "../components/AppCard";
import { useAuthUser } from "../components/AuthGate";
import { MetricCard } from "../components/MetricCard";
import { OpportunityCard } from "../components/OpportunityCard";
import { Screen } from "../components/Screen";
import { opportunities as demoOpportunities } from "../data/seed";
import { RootStackParamList } from "../navigation/types";
import { loadUserOpportunities } from "../services/supabase/opportunities";
import { loadConnectedAccounts } from "../services/supabase/sync";
import { logActivity } from "../services/supabase/activity";
import {
  TransitionProfile,
  calculateLastWorkingDay,
  getEmptyTransitionProfile,
  loadTransitionProfile,
  saveTransitionProfile
} from "../services/supabase/transitionData";
import { colors } from "../theme/colors";
import { ConnectedAccount, Opportunity, OpportunityStage } from "../types/career";

type Navigation = NativeStackNavigationProp<RootStackParamList> & { navigate: (screen: string, params?: unknown) => void };

const funnelStages: Array<{ label: string; stage: OpportunityStage }> = [
  { label: "Saved", stage: "saved" },
  { label: "Applied", stage: "applied" },
  { label: "Recruiter", stage: "recruiter" },
  { label: "Interview", stage: "interviewing" },
  { label: "Offer", stage: "offer" }
];

const lifecycleSteps = [
  "Switch decision",
  "Profile",
  "Applications",
  "Recruiter",
  "Interviews",
  "Offer",
  "Resignation",
  "Notice",
  "BGV",
  "Joining"
];

export function DashboardScreen() {
  const navigation = useNavigation<Navigation>();
  const user = useAuthUser();
  const isDemo = user?.authProvider === "demo";
  const userStorageKey = user?.id ?? user?.email;
  const [workspaceOpportunities, setWorkspaceOpportunities] = useState<Opportunity[]>(isDemo ? demoOpportunities : []);
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
  const [profile, setProfile] = useState<TransitionProfile>(getEmptyTransitionProfile());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("gmailConnect") === "1") {
      navigation.navigate("Sync");
      return;
    }

    refreshDashboard();
  }, [isDemo, navigation, user?.id, userStorageKey]);

  async function refreshDashboard() {
    if (!userStorageKey || isDemo) {
      setWorkspaceOpportunities(isDemo ? demoOpportunities : []);
      return;
    }

    await Promise.all([
      user?.id ? loadUserOpportunities(user.id) : Promise.resolve(null),
      user?.id ? loadConnectedAccounts(user.id) : Promise.resolve([]),
      loadTransitionProfile(userStorageKey)
    ])
      .then(([nextOpportunities, nextAccounts, nextProfile]) => {
        setWorkspaceOpportunities(nextOpportunities ?? []);
        setAccounts(nextAccounts);
        setProfile(nextProfile);
      })
      .catch(() => {
        setWorkspaceOpportunities([]);
      });
  }

  const analytics = useMemo(() => buildTransitionAnalytics(workspaceOpportunities, profile), [profile, workspaceOpportunities]);
  const active = workspaceOpportunities.filter((opportunity) => opportunity.stage !== "closed");
  const attention = [...active]
    .sort((left, right) => (left.followUpDueAt ?? "9999").localeCompare(right.followUpDueAt ?? "9999"))
    .slice(0, 3);

  useEffect(() => {
    logActivity(user?.id, "view_dashboard", {
      activeCount: active.length,
      daysLeft: analytics.daysLeft,
      readinessScore: analytics.readinessScore
    });
  }, [active.length, analytics.daysLeft, analytics.readinessScore, user?.id]);

  function updateProfile(field: keyof TransitionProfile, value: string) {
    setProfile((current) => {
      const next = { ...current, [field]: value };
      if (field === "resignationDate" || field === "noticePeriodDays") {
        next.lastWorkingDay = calculateLastWorkingDay(next.resignationDate, next.noticePeriodDays);
      }
      return next;
    });
  }

  async function handleSaveProfile() {
    setSaving(true);
    try {
      await saveTransitionProfile(userStorageKey, profile);
      await logActivity(user?.id, "save_transition_profile", {
        currentRole: profile.currentRole,
        desiredRoles: profile.desiredRoles,
        resignationDate: profile.resignationDate,
        lastWorkingDay: profile.lastWorkingDay
      });
      Alert.alert("Transition profile saved", "Your notice-period and target-role details are now part of the dashboard.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen onRefresh={refreshDashboard}>
      <View>
        <Text style={styles.eyebrow}>Job transition dashboard</Text>
        <Text style={styles.title}>Notice, applications, recruiters, and offers</Text>
      </View>

      <AppCard tone="blue">
        <View style={styles.heroRow}>
          <View style={styles.heroCopy}>
            <Text style={styles.cardLabel}>Job switch readiness</Text>
            <Text style={styles.heroTitle}>{analytics.readinessScore}% ready</Text>
            <Text style={styles.heroText}>
              {profile.currentRole || profile.desiredRoles
                ? `${profile.currentRole || "Current role missing"} -> ${profile.desiredRoles || "target role missing"}`
                : "Save your transition profile to unlock notice-period and role-match analytics."}
            </Text>
          </View>
          <View style={styles.scoreRing}>
            <Text style={styles.scoreRingValue}>{analytics.readinessScore}</Text>
            <Text style={styles.scoreRingLabel}>score</Text>
          </View>
        </View>
      </AppCard>

      <AppCard>
        <Text style={styles.sectionTitle}>Lifecycle</Text>
        <View style={styles.lifecycle}>
          {lifecycleSteps.map((step, index) => (
            <View
              key={step}
              style={[
                styles.lifecycleStep,
                index <= analytics.lifecycleIndex && styles.lifecycleStepActive
              ]}
            >
              <Text style={[styles.lifecycleText, index <= analytics.lifecycleIndex && styles.lifecycleTextActive]}>{step}</Text>
            </View>
          ))}
        </View>
      </AppCard>

      <AppCard>
        <Text style={styles.sectionTitle}>Transition data</Text>
        <View style={styles.formGrid}>
          <Field
            label="Current company"
            onChangeText={(value) => updateProfile("currentCompany", value)}
            placeholder="Current employer"
            value={profile.currentCompany}
          />
          <Field
            label="Resignation date"
            onChangeText={(value) => updateProfile("resignationDate", value)}
            placeholder="YYYY-MM-DD"
            value={profile.resignationDate}
          />
          <Field
            label="Notice period"
            keyboardType="numeric"
            onChangeText={(value) => updateProfile("noticePeriodDays", value.replace(/[^0-9]/g, ""))}
            placeholder="X days"
            value={profile.noticePeriodDays}
          />
          <Field
            label="Current role"
            onChangeText={(value) => updateProfile("currentRole", value)}
            placeholder="Backend Engineer"
            value={profile.currentRole}
          />
          <Field
            label="Experience"
            keyboardType="numeric"
            onChangeText={(value) => updateProfile("experienceYears", value.replace(/[^0-9.]/g, ""))}
            placeholder="7"
            value={profile.experienceYears}
          />
          <Field
            label="Desired roles"
            onChangeText={(value) => updateProfile("desiredRoles", value)}
            placeholder="DevOps, Cloud Engineer"
            value={profile.desiredRoles}
          />
          <Field
            label="Current CTC"
            onChangeText={(value) => updateProfile("currentCtc", value)}
            placeholder="28 LPA"
            value={profile.currentCtc}
          />
          <Field
            label="Expected CTC"
            onChangeText={(value) => updateProfile("expectedCtc", value)}
            placeholder="35 LPA"
            value={profile.expectedCtc}
          />
          <Field
            label="Locations"
            onChangeText={(value) => updateProfile("preferredLocations", value)}
            placeholder="Bengaluru, Hyderabad, Remote"
            value={profile.preferredLocations}
          />
          <Field
            label="Work mode"
            onChangeText={(value) => updateProfile("workMode", value)}
            placeholder="Remote / Hybrid / Office"
            value={profile.workMode}
          />
          <Field
            label="Technologies"
            onChangeText={(value) => updateProfile("technologies", value)}
            placeholder=".NET, Azure, Kubernetes"
            value={profile.technologies}
          />
          <Field
            label="Interview time"
            onChangeText={(value) => updateProfile("interviewAvailability", value)}
            placeholder="Weekdays after 7 PM"
            value={profile.interviewAvailability}
          />
          <Field
            label="Joining timeline"
            onChangeText={(value) => updateProfile("joiningTimeline", value)}
            placeholder="After notice period / early release"
            value={profile.joiningTimeline}
          />
          <Field
            label="Reason to switch"
            onChangeText={(value) => updateProfile("switchReason", value)}
            placeholder="Growth, compensation, tech stack"
            value={profile.switchReason}
          />
          <Pressable
            style={[styles.confidentialToggle, profile.confidential && styles.confidentialToggleActive]}
            onPress={() => setProfile((current) => ({ ...current, confidential: !current.confidential }))}
          >
            <Text style={[styles.confidentialText, profile.confidential && styles.confidentialTextActive]}>
              {profile.confidential ? "Confidential search on" : "Confidential search off"}
            </Text>
          </Pressable>
        </View>
        <View style={styles.saveRow}>
          <View>
            <Text style={styles.detailLabel}>Last working day</Text>
            <Text style={styles.detailValue}>{profile.lastWorkingDay || "Auto-calculated after date and notice period"}</Text>
          </View>
          <Pressable style={styles.primaryButton} onPress={handleSaveProfile} disabled={saving}>
            <Text style={styles.primaryButtonText}>{saving ? "Saving..." : "Save profile"}</Text>
          </Pressable>
        </View>
      </AppCard>

      <View style={styles.metrics}>
        <MetricCard label="Days left" value={analytics.daysLeftLabel} caption="notice period" tone="amber" />
        <MetricCard label="Applications" value={analytics.applicationsDuringNotice} caption="sent during notice" />
        <MetricCard label="Interviews" value={analytics.interviewsBeforeLastDay} caption="before last working day" tone="green" />
        <MetricCard label="Offers" value={analytics.offersReceived} caption="received" tone="violet" />
      </View>

      <AppCard>
        <Text style={styles.sectionTitle}>Transition timeline</Text>
        <View style={styles.timeline}>
          <View style={styles.timelineTrack} />
          <TimelinePoint label="Resigned" value={profile.resignationDate || "Not set"} tone="red" />
          <TimelinePoint label="Notice period" value={String(analytics.daysLeftLabel)} tone="blue" />
          <TimelinePoint label="Last working day" value={profile.lastWorkingDay || "Not set"} tone="green" />
        </View>
      </AppCard>

      <AppCard>
        <Text style={styles.sectionTitle}>Transition funnel</Text>
        <View style={styles.funnel}>
          {funnelStages.map((stage) => (
            <View key={stage.stage} style={styles.funnelStep}>
              <Text style={styles.funnelCount}>{analytics.funnel[stage.stage] ?? 0}</Text>
              <Text style={styles.funnelLabel}>{stage.label}</Text>
            </View>
          ))}
        </View>
      </AppCard>

      <View style={styles.split}>
        <AppCard style={styles.splitCard}>
          <Text style={styles.sectionTitle}>Role match</Text>
          <Text style={styles.bigInsight}>{analytics.roleMatchRate}%</Text>
          <Text style={styles.meta}>desired vs applied roles</Text>
          <Text style={styles.smallInsight}>{analytics.roleMatchLabel}</Text>
        </AppCard>
        <AppCard style={styles.splitCard}>
          <Text style={styles.sectionTitle}>Recruiter engagement</Text>
          <Text style={styles.bigInsight}>{analytics.recruiterResponseRate}%</Text>
          <Text style={styles.meta}>contacts found in pipeline</Text>
          <Text style={styles.smallInsight}>
            {analytics.contactsSynced} recruiter contact{analytics.contactsSynced === 1 ? "" : "s"} synced from email metadata.
          </Text>
        </AppCard>
      </View>

      <AppCard>
        <Text style={styles.sectionTitle}>Calendar heatmap</Text>
        <Text style={styles.meta}>Peak application days from synced application dates.</Text>
        <View style={styles.heatmap}>
          {analytics.heatmap.map((day) => (
            <View key={day.label} style={styles.heatmapDay}>
              <View style={[styles.heatmapCell, { opacity: day.opacity }]} />
              <Text style={styles.heatmapLabel}>{day.label}</Text>
              <Text style={styles.heatmapCount}>{day.count}</Text>
            </View>
          ))}
        </View>
      </AppCard>

      <AppCard tone="green">
        <Text style={styles.sectionTitle}>Weekly summary</Text>
        <Text style={styles.smallInsight}>
          {analytics.applicationsThisWeek} applications this week, {analytics.responsesThisWeek} recruiter responses, and {analytics.interviewsThisWeek} interview touchpoints.
        </Text>
        <Text style={styles.meta}>
          {accounts.length > 0
            ? `${accounts.filter((account) => account.status === "connected").length} connected source${accounts.length === 1 ? "" : "s"} are feeding this view.`
            : "Connect Gmail to make this summary reflect your real inbox activity."}
        </Text>
      </AppCard>

      <Text style={styles.sectionTitle}>Needs attention</Text>
      {attention.length > 0 ? (
        attention.map((opportunity) => (
          <OpportunityCard
            key={opportunity.id}
            opportunity={opportunity}
            onPress={() => {
              logActivity(user?.id, "open_opportunity", { company: opportunity.company }, "opportunity", opportunity.id);
              navigation.navigate("OpportunityDetail", { opportunityId: opportunity.id });
            }}
          />
        ))
      ) : (
        <AppCard>
          <Text style={styles.meta}>No live opportunities yet. Sync Gmail or add applications to start tracking the transition funnel.</Text>
        </AppCard>
      )}
    </Screen>
  );
}

function Field({
  keyboardType,
  label,
  onChangeText,
  placeholder,
  value
}: {
  keyboardType?: "default" | "numeric";
  label: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  value: string;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        keyboardType={keyboardType}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        style={styles.input}
        value={value}
      />
    </View>
  );
}

function TimelinePoint({ label, tone, value }: { label: string; tone: "red" | "blue" | "green"; value: string }) {
  return (
    <View style={styles.timelinePoint}>
      <View style={[styles.timelineDot, styles[tone]]} />
      <Text style={styles.timelineLabel}>{label}</Text>
      <Text style={styles.timelineValue}>{value}</Text>
    </View>
  );
}

function buildTransitionAnalytics(opportunities: Opportunity[], profile: TransitionProfile) {
  const today = startOfDay(new Date());
  const resignationDate = parseDate(profile.resignationDate);
  const lastWorkingDay = parseDate(profile.lastWorkingDay);
  const applicationsDuringNotice = opportunities.filter((opportunity) =>
    isWithinRange(parseDate(opportunity.sourceReceivedAt ?? opportunity.createdAt), resignationDate, lastWorkingDay)
  ).length;
  const interviewsBeforeLastDay = opportunities.filter((opportunity) =>
    opportunity.interviewStartsAt && (!lastWorkingDay || parseDate(opportunity.interviewStartsAt)! <= lastWorkingDay)
  ).length;
  const offersReceived = opportunities.filter((opportunity) => opportunity.stage === "offer").length;
  const contactsSynced = opportunities.filter((opportunity) => opportunity.contactEmail || opportunity.contactName).length;
  const recruiterResponseRate = opportunities.length === 0 ? 0 : Math.round((contactsSynced / opportunities.length) * 100);
  const desiredRoles = profile.desiredRoles
    .split(",")
    .map((role) => role.trim().toLowerCase())
    .filter(Boolean);
  const roleMatches = desiredRoles.length === 0
    ? 0
    : opportunities.filter((opportunity) => desiredRoles.some((role) => opportunity.role.toLowerCase().includes(role))).length;
  const roleMatchRate = opportunities.length === 0 ? 0 : Math.round((roleMatches / opportunities.length) * 100);
  const daysLeft = lastWorkingDay ? Math.max(0, Math.ceil((lastWorkingDay.getTime() - today.getTime()) / 86400000)) : null;
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - 6);
  const applicationsThisWeek = opportunities.filter((opportunity) =>
    isWithinRange(parseDate(opportunity.sourceReceivedAt ?? opportunity.createdAt), weekStart, today)
  ).length;
  const responsesThisWeek = opportunities.filter((opportunity) =>
    (opportunity.contactEmail || opportunity.contactName) && isWithinRange(parseDate(opportunity.updatedAt), weekStart, today)
  ).length;
  const interviewsThisWeek = opportunities.filter((opportunity) =>
    opportunity.interviewStartsAt && isWithinRange(parseDate(opportunity.interviewStartsAt), weekStart, today)
  ).length;
  const profileFields = [
    profile.resignationDate,
    profile.noticePeriodDays,
    profile.lastWorkingDay,
    profile.currentRole,
    profile.currentCompany,
    profile.currentCtc,
    profile.expectedCtc,
    profile.experienceYears,
    profile.desiredRoles,
    profile.preferredLocations,
    profile.workMode,
    profile.technologies,
    profile.interviewAvailability,
    profile.joiningTimeline,
    profile.switchReason
  ].filter(Boolean).length;
  const lifecycleIndex = offersReceived > 0 ? 5
    : interviewsBeforeLastDay > 0 ? 4
      : contactsSynced > 0 ? 3
        : opportunities.some((opportunity) => opportunity.stage === "applied") ? 2
          : profileFields >= 4 ? 1
            : 0;
  const readinessScore = Math.min(100, Math.round(
    (profileFields / 14) * 45
    + Math.min(opportunities.length, 10) * 3
    + Math.min(contactsSynced, 5) * 3
    + Math.min(interviewsBeforeLastDay, 3) * 5
  ));

  return {
    applicationsDuringNotice,
    applicationsThisWeek,
    contactsSynced,
    daysLeft,
    daysLeftLabel: daysLeft === null ? "Set dates" : daysLeft,
    funnel: funnelStages.reduce<Record<string, number>>((counts, stage) => {
      counts[stage.stage] = opportunities.filter((opportunity) => opportunity.stage === stage.stage).length;
      return counts;
    }, {}),
    heatmap: buildHeatmap(opportunities),
    interviewsBeforeLastDay,
    interviewsThisWeek,
    lifecycleIndex,
    offersReceived,
    readinessScore,
    recruiterResponseRate,
    responsesThisWeek,
    roleMatchLabel: desiredRoles.length === 0 ? "Save desired roles to calculate match." : `${roleMatches} of ${opportunities.length} applications match your target roles.`,
    roleMatchRate
  };
}

function buildHeatmap(opportunities: Opportunity[]) {
  const counts = new Map<string, number>();
  opportunities.forEach((opportunity) => {
    const date = parseDate(opportunity.sourceReceivedAt ?? opportunity.createdAt);
    if (!date) {
      return;
    }
    const key = date.toLocaleDateString(undefined, { weekday: "short" });
    counts.set(key, (counts.get(key) ?? 0) + 1);
  });
  const max = Math.max(...Array.from(counts.values()), 1);
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((label) => {
    const count = counts.get(label) ?? 0;
    return {
      count,
      label,
      opacity: 0.18 + (count / max) * 0.82
    };
  });
}

function parseDate(value?: string) {
  if (!value) {
    return null;
  }

  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? startOfDay(new Date(timestamp)) : null;
}

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function isWithinRange(date: Date | null, start: Date | null, end: Date | null) {
  if (!date) {
    return false;
  }
  if (start && date < start) {
    return false;
  }
  if (end && date > end) {
    return false;
  }
  return true;
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
  heroRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 16,
    justifyContent: "space-between"
  },
  heroCopy: {
    flex: 1
  },
  heroTitle: {
    color: colors.ink,
    fontSize: 24,
    fontWeight: "900",
    marginTop: 8
  },
  heroText: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6
  },
  scoreRing: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.blue,
    borderRadius: 8,
    borderWidth: 2,
    height: 76,
    justifyContent: "center",
    width: 86
  },
  scoreRingValue: {
    color: colors.blue,
    fontSize: 26,
    fontWeight: "900"
  },
  scoreRingLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase"
  },
  sectionTitle: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: "900"
  },
  formGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 12
  },
  lifecycle: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12
  },
  lifecycleStep: {
    backgroundColor: colors.background,
    borderColor: colors.line,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8
  },
  lifecycleStepActive: {
    backgroundColor: colors.greenSoft,
    borderColor: "#bce8d8"
  },
  lifecycleText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "800"
  },
  lifecycleTextActive: {
    color: colors.green
  },
  field: {
    flexBasis: 220,
    flexGrow: 1,
    gap: 6
  },
  fieldLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  input: {
    backgroundColor: colors.background,
    borderColor: colors.line,
    borderRadius: 8,
    borderWidth: 1,
    color: colors.ink,
    fontSize: 14,
    minHeight: 44,
    paddingHorizontal: 12
  },
  confidentialToggle: {
    alignItems: "center",
    backgroundColor: colors.background,
    borderColor: colors.line,
    borderRadius: 8,
    borderWidth: 1,
    flexBasis: 220,
    flexGrow: 1,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: 12
  },
  confidentialToggleActive: {
    backgroundColor: colors.violetSoft,
    borderColor: "#d6cdfa"
  },
  confidentialText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "900"
  },
  confidentialTextActive: {
    color: colors.violet
  },
  saveRow: {
    alignItems: "center",
    borderTopColor: colors.line,
    borderTopWidth: 1,
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
    marginTop: 14,
    paddingTop: 14
  },
  detailLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  detailValue: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "800",
    marginTop: 3
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: colors.blue,
    borderRadius: 8,
    minHeight: 42,
    justifyContent: "center",
    paddingHorizontal: 18
  },
  primaryButtonText: {
    color: colors.surface,
    fontSize: 13,
    fontWeight: "900"
  },
  metrics: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10
  },
  timeline: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 18,
    minHeight: 94
  },
  timelineTrack: {
    backgroundColor: colors.line,
    height: 5,
    left: 40,
    position: "absolute",
    right: 40,
    top: 20
  },
  timelinePoint: {
    alignItems: "center",
    flex: 1,
    gap: 6
  },
  timelineDot: {
    borderColor: colors.surface,
    borderRadius: 999,
    borderWidth: 4,
    height: 32,
    width: 32
  },
  red: {
    backgroundColor: colors.red
  },
  blue: {
    backgroundColor: colors.blue
  },
  green: {
    backgroundColor: colors.green
  },
  timelineLabel: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: "900",
    textAlign: "center"
  },
  timelineValue: {
    color: colors.muted,
    fontSize: 12,
    textAlign: "center"
  },
  funnel: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12
  },
  funnelStep: {
    backgroundColor: colors.blueSoft,
    borderColor: "#bdd1f4",
    borderRadius: 8,
    borderWidth: 1,
    flexBasis: 120,
    flexGrow: 1,
    padding: 12
  },
  funnelCount: {
    color: colors.blue,
    fontSize: 24,
    fontWeight: "900"
  },
  funnelLabel: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: "800",
    marginTop: 4
  },
  split: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10
  },
  splitCard: {
    flexBasis: 260,
    flexGrow: 1
  },
  bigInsight: {
    color: colors.ink,
    fontSize: 34,
    fontWeight: "900",
    marginTop: 10
  },
  smallInsight: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 20,
    marginTop: 10
  },
  meta: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 5
  },
  heatmap: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12
  },
  heatmapDay: {
    alignItems: "center",
    flex: 1,
    gap: 5
  },
  heatmapCell: {
    backgroundColor: colors.amber,
    borderRadius: 6,
    height: 40,
    width: "100%"
  },
  heatmapLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "800"
  },
  heatmapCount: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: "900"
  }
});
