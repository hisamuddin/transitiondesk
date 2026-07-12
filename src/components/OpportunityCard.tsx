import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors } from "../theme/colors";
import { Opportunity } from "../types/career";

type OpportunityCardProps = {
  opportunity: Opportunity;
  onPress: () => void;
};

const stageLabels: Record<Opportunity["stage"], string> = {
  saved: "Saved",
  applied: "Applied",
  recruiter: "Recruiter",
  interviewing: "Interview",
  offer: "Offer",
  closed: "Closed"
};

const sourceLabels: Record<Opportunity["source"], string> = {
  linkedin: "LinkedIn",
  naukri: "Naukri",
  indeed: "Indeed",
  shine: "Shine",
  browserExtension: "Browser",
  emailParsing: "Email",
  manual: "Manual"
};

export function OpportunityCard({ opportunity, onPress }: OpportunityCardProps) {
  const [isPreviewVisible, setPreviewVisible] = useState(false);
  const hasPreviewDetails = Boolean(
    opportunity.roleResponsibilities?.length
      || opportunity.interviewStartsAt
      || opportunity.interviewDetails
      || opportunity.sourceSubject
      || opportunity.jobPostingUrl
      || opportunity.extractionConfidence
  );

  return (
    <View style={[styles.card, isPreviewVisible && styles.cardActive]}>
      <Pressable style={styles.summaryRow} onPress={onPress}>
        <View style={styles.mark}>
          <Text style={styles.markText}>{opportunity.company.slice(0, 1)}</Text>
        </View>
        <View style={styles.copy}>
          <Text style={styles.company}>{opportunity.company}</Text>
          <Text style={styles.role}>{opportunity.role}</Text>
          <Text style={styles.source}>{sourceLabels[opportunity.source]}</Text>
          <Text style={styles.action} numberOfLines={1}>{opportunity.nextAction}</Text>
        </View>
        <View style={styles.pill}>
          <Text style={styles.pillText}>{stageLabels[opportunity.stage]}</Text>
        </View>
      </Pressable>

      <View style={styles.cardActions}>
        {hasPreviewDetails ? (
          <Pressable style={styles.previewToggle} onPress={() => setPreviewVisible((current) => !current)}>
            <Text style={styles.previewToggleText}>{isPreviewVisible ? "Hide details" : "Show details"}</Text>
          </Pressable>
        ) : (
          <Text style={styles.noPreviewText}>More details after next Gmail sync</Text>
        )}
        {isPreviewVisible ? (
          <Pressable style={styles.openButton} onPress={onPress}>
            <Text style={styles.openButtonText}>Open</Text>
          </Pressable>
        ) : null}
      </View>

      {hasPreviewDetails && isPreviewVisible ? (
        <View style={styles.preview}>
          {opportunity.interviewStartsAt || opportunity.interviewDetails ? (
            <View style={styles.previewRow}>
              <Text style={styles.previewLabel}>Interview</Text>
              <Text style={styles.previewValue}>
                {[formatDateTime(opportunity.interviewStartsAt), opportunity.interviewDetails].filter(Boolean).join(" - ")}
              </Text>
            </View>
          ) : null}

          {opportunity.roleResponsibilities?.length ? (
            <View style={styles.previewBlock}>
              <Text style={styles.previewLabel}>Responsibilities</Text>
              {opportunity.roleResponsibilities.slice(0, 3).map((item) => (
                <Text key={item} style={styles.previewBullet}>- {item}</Text>
              ))}
            </View>
          ) : null}

          {opportunity.sourceSubject ? (
            <View style={styles.previewRow}>
              <Text style={styles.previewLabel}>Email</Text>
              <Text style={styles.previewValue} numberOfLines={2}>{opportunity.sourceSubject}</Text>
            </View>
          ) : null}

          {opportunity.jobPostingUrl ? (
            <View style={styles.previewRow}>
              <Text style={styles.previewLabel}>Job link</Text>
              <Text style={styles.previewValue} numberOfLines={1}>{opportunity.jobPostingUrl}</Text>
            </View>
          ) : null}

          {opportunity.extractionConfidence ? (
            <Text style={styles.confidence}>Parsed confidence {opportunity.extractionConfidence}%</Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function formatDateTime(value?: string) {
  if (!value) {
    return "";
  }

  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short"
  }).format(new Date(value));
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
    padding: 14
  },
  cardActive: {
    borderColor: colors.blue,
    shadowColor: colors.blue,
    shadowOpacity: 0.12,
    shadowRadius: 12
  },
  summaryRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12
  },
  mark: {
    alignItems: "center",
    backgroundColor: colors.blueSoft,
    borderRadius: 8,
    height: 42,
    justifyContent: "center",
    width: 42
  },
  markText: {
    color: colors.blue,
    fontSize: 18,
    fontWeight: "900"
  },
  copy: {
    flex: 1,
    gap: 2
  },
  company: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "800"
  },
  role: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: "600"
  },
  action: {
    color: colors.muted,
    fontSize: 12
  },
  source: {
    color: colors.blue,
    fontSize: 11,
    fontWeight: "800"
  },
  pill: {
    backgroundColor: colors.greenSoft,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  pillText: {
    color: colors.green,
    fontSize: 11,
    fontWeight: "800"
  },
  cardActions: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10
  },
  previewToggle: {
    alignItems: "center",
    backgroundColor: colors.blueSoft,
    borderRadius: 8,
    minHeight: 34,
    paddingHorizontal: 12
  },
  previewToggleText: {
    color: colors.blue,
    fontSize: 12,
    fontWeight: "900",
    lineHeight: 34
  },
  noPreviewText: {
    color: colors.muted,
    fontSize: 12
  },
  openButton: {
    alignItems: "center",
    backgroundColor: colors.blue,
    borderRadius: 8,
    minHeight: 34,
    paddingHorizontal: 14
  },
  openButtonText: {
    color: colors.surface,
    fontSize: 12,
    fontWeight: "900",
    lineHeight: 34
  },
  preview: {
    borderTopColor: colors.line,
    borderTopWidth: 1,
    gap: 10,
    paddingTop: 12
  },
  previewRow: {
    gap: 3
  },
  previewBlock: {
    gap: 4
  },
  previewLabel: {
    color: colors.blue,
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  previewValue: {
    color: colors.ink,
    fontSize: 13,
    lineHeight: 18
  },
  previewBullet: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 17
  },
  confidence: {
    alignSelf: "flex-start",
    backgroundColor: colors.blueSoft,
    borderRadius: 999,
    color: colors.blue,
    fontSize: 11,
    fontWeight: "800",
    overflow: "hidden",
    paddingHorizontal: 9,
    paddingVertical: 5
  }
});
