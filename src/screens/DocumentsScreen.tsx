import { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import { AppCard } from "../components/AppCard";
import { useAuthUser } from "../components/AuthGate";
import { Screen } from "../components/Screen";
import { opportunities as demoOpportunities } from "../data/seed";
import { draftCoverLetter } from "../services/ai/careerAssistant";
import { pickCareerDocument } from "../services/documents/documentStorage";
import { logActivity } from "../services/supabase/activity";
import { loadUserOpportunitiesQuietly } from "../services/supabase/opportunities";
import { SavedResumeVersion, loadResumeVersions, saveResumeVersion } from "../services/supabase/transitionData";
import { colors } from "../theme/colors";
import { Opportunity } from "../types/career";

type ImportedDocument = {
  name: string;
  mimeType?: string;
  uri: string;
};

export function DocumentsScreen() {
  const user = useAuthUser();
  const isDemo = user?.authProvider === "demo";
  const userStorageKey = user?.id ?? user?.email;
  const [assistantText, setAssistantText] = useState("");
  const [opportunities, setOpportunities] = useState<Opportunity[]>(isDemo ? demoOpportunities : []);
  const [importedDocuments, setImportedDocuments] = useState<ImportedDocument[]>([]);
  const [resumeVersions, setResumeVersions] = useState<SavedResumeVersion[]>([]);

  useEffect(() => {
    let active = true;

    async function loadDocumentsContext() {
      if (!userStorageKey || isDemo) {
        setOpportunities(isDemo ? demoOpportunities : []);
        return;
      }

      try {
        const [records, savedResumes] = await Promise.all([
          user?.id ? loadUserOpportunitiesQuietly(user.id) : Promise.resolve(null),
          loadResumeVersions(userStorageKey)
        ]);
        if (active) {
          setOpportunities(records ?? []);
          setResumeVersions(savedResumes);
        }
      } catch {
        if (active) {
          setOpportunities([]);
          setResumeVersions([]);
        }
      }
    }

    loadDocumentsContext();
    return () => {
      active = false;
    };
  }, [isDemo, user?.id, userStorageKey]);

  const documentSummary = useMemo(
    () => buildDocumentSummary(opportunities, importedDocuments, resumeVersions),
    [importedDocuments, opportunities, resumeVersions]
  );
  const topOpportunity = documentSummary.bestOpportunity ?? opportunities[0] ?? (isDemo ? demoOpportunities[0] : undefined);

  async function handleImportDocument() {
    const document = await pickCareerDocument();
    if (document) {
      const importedDocument = {
        name: document.name,
        mimeType: document.mimeType,
        uri: document.uri
      };
      setImportedDocuments((current) => [importedDocument, ...current]);
      const resumeVersion = {
        id: `${Date.now()}-${document.name}`,
        fileName: document.name,
        mimeType: document.mimeType,
        targetRole: topOpportunity?.role ?? "General job switch resume",
        versionNumber: resumeVersions.length + 1,
        uploadedAt: new Date().toISOString(),
        sourceOpportunityId: topOpportunity?.id,
        notes: topOpportunity ? `Prepared for ${topOpportunity.company}` : "Imported by candidate"
      } satisfies SavedResumeVersion;
      setResumeVersions((current) => [resumeVersion, ...current]);
      await saveResumeVersion(userStorageKey, resumeVersion);
      logActivity(user?.id, "import_document", { name: document.name, mimeType: document.mimeType });
      Alert.alert("Resume version saved", `${document.name} is now v${resumeVersion.versionNumber} in your resume library.`);
    }
  }

  async function handleDraftCoverLetter() {
    if (!topOpportunity) {
      Alert.alert("Sync an opportunity first", "A cover letter needs a real company and role from your pipeline.");
      return;
    }

    const draft = await draftCoverLetter(topOpportunity);
    await logActivity(user?.id, "draft_cover_letter", { company: topOpportunity.company }, "opportunity", topOpportunity.id);
    setAssistantText(draft);
  }

  return (
    <Screen>
      <View>
        <Text style={styles.eyebrow}>Candidate documents</Text>
        <Text style={styles.title}>Document studio</Text>
        <Text style={styles.subhead}>
          Resume, JD, and attachment evidence from your synced applications.
        </Text>
      </View>

      <AppCard tone={documentSummary.readinessScore >= 70 ? "green" : "amber"}>
        <Text style={styles.cardLabel}>Application packet readiness</Text>
        <Text style={[styles.bigScore, documentSummary.readinessScore >= 70 ? styles.greenText : styles.amberText]}>
          {documentSummary.readinessScore}%
        </Text>
        <Text style={styles.meta}>
          {documentSummary.totalAttachments > 0
            ? `${documentSummary.totalAttachments} email attachment${documentSummary.totalAttachments === 1 ? "" : "s"} linked to synced opportunities.`
            : "No resume or job description attachments were found in synced Gmail messages yet."}
        </Text>
      </AppCard>

      <View style={styles.actions}>
        <Pressable style={styles.button} onPress={handleImportDocument}>
          <Text style={styles.buttonText}>Import resume</Text>
        </Pressable>
        <Pressable style={styles.button} onPress={handleDraftCoverLetter}>
          <Text style={styles.buttonText}>Draft cover letter</Text>
        </Pressable>
      </View>

      <View style={styles.metrics}>
        <Metric label="Synced roles" value={String(opportunities.length)} />
        <Metric label="Attachments" value={String(documentSummary.totalAttachments)} />
        <Metric label="Resume versions" value={String(resumeVersions.length)} />
        <Metric label="Job links" value={String(documentSummary.linkedOpportunities)} />
        <Metric label="Needs docs" value={String(documentSummary.missingDocumentCount)} />
      </View>

      <AppCard>
        <Text style={styles.rowTitle}>Best candidate focus</Text>
        <Text style={styles.meta}>
          {documentSummary.bestOpportunity
            ? `${documentSummary.bestOpportunity.role} at ${documentSummary.bestOpportunity.company}`
            : "Sync Gmail to identify the role that should drive resume tailoring."}
        </Text>
        <View style={styles.detailList}>
          <Detail label="Contact" value={formatContact(documentSummary.bestOpportunity)} />
          <Detail label="Evidence" value={formatEvidence(documentSummary.bestOpportunity)} />
          <Detail label="Next action" value={documentSummary.bestOpportunity?.nextAction ?? "Reconnect Gmail, sync inbox, then attach the current resume."} />
        </View>
      </AppCard>

      <AppCard>
        <Text style={styles.rowTitle}>Resume version library</Text>
        {resumeVersions.length > 0 ? (
          resumeVersions.map((resume) => (
            <View key={resume.id} style={styles.attachmentRow}>
              <View style={styles.copy}>
                <Text style={styles.attachmentName}>v{resume.versionNumber} - {resume.fileName}</Text>
                <Text style={styles.meta}>{resume.targetRole || "Target role not set"} - uploaded {formatDate(resume.uploadedAt)}</Text>
                {resume.notes ? <Text style={styles.meta}>{resume.notes}</Text> : null}
              </View>
              <Text style={styles.badge}>Resume</Text>
            </View>
          ))
        ) : (
          <Text style={styles.meta}>
            No resume versions saved yet. Import your latest resume and the app will store it as a version tied to your current best-fit opportunity.
          </Text>
        )}
      </AppCard>

      <AppCard>
        <Text style={styles.rowTitle}>Email attachments found</Text>
        {documentSummary.attachmentRows.length > 0 ? (
          documentSummary.attachmentRows.map((row) => (
            <View key={`${row.opportunityId}-${row.name}`} style={styles.attachmentRow}>
              <View style={styles.copy}>
                <Text style={styles.attachmentName}>{row.name}</Text>
                <Text style={styles.meta}>{row.company} - {row.role}</Text>
              </View>
              <Text style={styles.badge}>Email</Text>
            </View>
          ))
        ) : (
          <Text style={styles.meta}>
            No attachments are stored for the synced opportunities. After reconnecting Gmail, the next inbox sync will read message parts and list resume, JD, and PDF filenames here when present.
          </Text>
        )}
      </AppCard>

      {importedDocuments.length > 0 ? (
        <AppCard tone="blue">
          <Text style={styles.rowTitle}>Imported by candidate</Text>
          {importedDocuments.map((document) => (
            <View key={document.uri} style={styles.attachmentRow}>
              <Text style={styles.attachmentName}>{document.name}</Text>
              <Text style={styles.badge}>Local</Text>
            </View>
          ))}
        </AppCard>
      ) : null}

      <AppCard tone={documentSummary.actions.length > 0 ? "amber" : "green"}>
        <Text style={styles.rowTitle}>Recommended next actions</Text>
        {documentSummary.actions.map((action) => (
          <Text key={action} style={styles.actionItem}>{action}</Text>
        ))}
      </AppCard>

      {assistantText ? (
        <AppCard tone="blue">
          <Text style={styles.rowTitle}>Assistant draft</Text>
          <Text style={styles.meta}>{assistantText}</Text>
        </AppCard>
      ) : null}
    </Screen>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <AppCard style={styles.metricCard}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </AppCard>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detail}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

function buildDocumentSummary(
  opportunities: Opportunity[],
  importedDocuments: ImportedDocument[],
  resumeVersions: SavedResumeVersion[]
) {
  const attachmentRows = opportunities.flatMap((opportunity) =>
    (opportunity.attachments ?? []).map((name) => ({
      company: opportunity.company,
      name,
      opportunityId: opportunity.id,
      role: opportunity.role
    }))
  );
  const linkedOpportunities = opportunities.filter((opportunity) =>
    Boolean(opportunity.jobPostingUrl || opportunity.applicationUrl || (opportunity.sourceLinks?.length ?? 0) > 0)
  ).length;
  const opportunitiesWithDocuments = opportunities.filter((opportunity) =>
    (opportunity.attachments?.length ?? 0) > 0 || opportunity.resumeVersionId || opportunity.coverLetterId
  ).length;
  const missingDocumentCount = Math.max(opportunities.length - opportunitiesWithDocuments, 0);
  const bestOpportunity = [...opportunities].sort((left, right) => scoreOpportunity(right) - scoreOpportunity(left))[0];
  const readinessScore = opportunities.length === 0
    ? resumeVersions.length > 0 || importedDocuments.length > 0 ? 35 : 0
    : Math.min(100, Math.round(((opportunitiesWithDocuments + linkedOpportunities + resumeVersions.length + importedDocuments.length) / (opportunities.length * 2 + 2)) * 100));

  const actions = [
    opportunities.length === 0 ? "Sync Gmail inbox to create real opportunity records." : "",
    resumeVersions.length === 0 ? "Import at least one current resume so applications can be tied back to resume versions." : "",
    attachmentRows.length === 0 ? "Reconnect Gmail and sync again to capture resume, JD, or PDF attachment filenames." : "",
    missingDocumentCount > 0 ? `Attach or import the resume used for ${missingDocumentCount} synced role${missingDocumentCount === 1 ? "" : "s"}.` : "",
    linkedOpportunities < opportunities.length ? "Open source job links and confirm role title, recruiter contact, and responsibilities." : "",
    bestOpportunity?.dataQualityNotes?.length ? `Review data quality for ${bestOpportunity.company}: ${bestOpportunity.dataQualityNotes[0]}` : ""
  ].filter(Boolean);

  return {
    actions: actions.length > 0 ? actions : ["Documents look connected to the current application set."],
    attachmentRows,
    bestOpportunity,
    linkedOpportunities,
    missingDocumentCount,
    readinessScore,
    totalAttachments: attachmentRows.length
  };
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "recently";
  }
  return date.toLocaleDateString();
}

function scoreOpportunity(opportunity: Opportunity) {
  return opportunity.matchScore
    + ((opportunity.attachments?.length ?? 0) * 10)
    + (opportunity.jobPostingUrl || opportunity.applicationUrl ? 8 : 0)
    + (opportunity.contactEmail || opportunity.contactName ? 5 : 0)
    - (needsRoleReview(opportunity.role) ? 12 : 0);
}

function needsRoleReview(role: string) {
  return /application update|role mentioned|imported application|not synced/i.test(role);
}

function formatContact(opportunity?: Opportunity) {
  if (!opportunity) {
    return "No contact synced yet";
  }
  return opportunity.contactEmail ?? opportunity.contactName ?? opportunity.contactChannel ?? "No recruiter contact found in email metadata yet";
}

function formatEvidence(opportunity?: Opportunity) {
  if (!opportunity) {
    return "No Gmail evidence available yet";
  }
  const pieces = [
    opportunity.sourceSubject ? "email subject" : "",
    opportunity.sourceReceivedAt ? "received date" : "",
    opportunity.jobPostingUrl ? "job link" : "",
    opportunity.applicationUrl ? "application link" : "",
    (opportunity.attachments?.length ?? 0) > 0 ? "attachment" : ""
  ].filter(Boolean);
  return pieces.length > 0 ? pieces.join(", ") : "Only basic email metadata is available";
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
  subhead: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6
  },
  cardLabel: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: "800"
  },
  bigScore: {
    fontSize: 46,
    fontWeight: "900",
    lineHeight: 52,
    marginTop: 6
  },
  greenText: {
    color: colors.green
  },
  amberText: {
    color: colors.amber
  },
  meta: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 5
  },
  actions: {
    flexDirection: "row",
    gap: 10
  },
  button: {
    alignItems: "center",
    backgroundColor: colors.blue,
    borderRadius: 8,
    flex: 1,
    justifyContent: "center",
    minHeight: 46,
    paddingHorizontal: 12
  },
  buttonText: {
    color: colors.surface,
    fontSize: 13,
    fontWeight: "900"
  },
  metrics: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10
  },
  metricCard: {
    flexBasis: 150,
    flexGrow: 1
  },
  metricValue: {
    color: colors.ink,
    fontSize: 28,
    fontWeight: "900"
  },
  metricLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "800",
    marginTop: 4,
    textTransform: "uppercase"
  },
  rowTitle: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "800"
  },
  detailList: {
    gap: 10,
    marginTop: 12
  },
  detail: {
    gap: 3
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
    fontWeight: "700"
  },
  attachmentRow: {
    alignItems: "center",
    borderTopColor: colors.line,
    borderTopWidth: 1,
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
    marginTop: 12,
    paddingTop: 12
  },
  copy: {
    flex: 1
  },
  attachmentName: {
    color: colors.ink,
    flex: 1,
    fontSize: 14,
    fontWeight: "800"
  },
  badge: {
    backgroundColor: colors.blueSoft,
    borderRadius: 8,
    color: colors.blue,
    fontSize: 12,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: 10,
    paddingVertical: 5
  },
  actionItem: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 20,
    marginTop: 10
  }
});
