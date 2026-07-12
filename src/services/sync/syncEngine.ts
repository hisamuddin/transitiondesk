import { connectedAccounts, opportunities, sourceEvents, syncRuns, syncSources } from "../../data/seed";
import {
  ConnectedAccount,
  ConnectionStatus,
  Opportunity,
  SourceEvent,
  SourceType,
  SyncMethod,
  SyncRun,
  SyncSource
} from "../../types/career";

export type RawJobApplication = {
  source: SourceType;
  sourceJobId: string;
  companyName?: string;
  employer?: string;
  jobTitle?: string;
  title?: string;
  status?: string;
  city?: string;
  contact?: string;
  notes?: string;
  roleResponsibilities?: string[];
  interviewStartsAt?: string;
  interviewDetails?: string;
  sourceSubject?: string;
  sourceSnippet?: string;
  sourceReceivedAt?: string;
  sourceLinks?: string[];
  jobPostingUrl?: string;
  applicationUrl?: string;
  extractionConfidence?: number;
  attachments?: string[];
  receivedAt?: string;
};

const providerLabels: Record<SourceType, string> = {
  linkedin: "LinkedIn",
  naukri: "Naukri",
  indeed: "Indeed",
  shine: "Shine",
  browserExtension: "Browser extension",
  emailParsing: "Email parsing",
  manual: "Manual"
};

const providerMethods: Record<SourceType, SyncMethod> = {
  linkedin: "official_api",
  naukri: "email_fallback",
  indeed: "official_api",
  shine: "email_fallback",
  browserExtension: "manual_import",
  emailParsing: "email_fallback",
  manual: "manual_import"
};

const providerDescriptions: Record<SourceType, string> = {
  linkedin: "Uses a saved portal connection to import application timelines.",
  naukri: "Uses mailbox parsing while the direct integration remains limited.",
  indeed: "Imports applications and stage changes from an account connection.",
  shine: "Starts with mailbox-based syncing for interview and status updates.",
  browserExtension: "Captures browser confirmation pages into the sync pipeline.",
  emailParsing: "Parses recruiter emails and application updates into normalized records.",
  manual: "Manual records created directly inside the workspace."
};

const stageMap: Record<string, Opportunity["stage"]> = {
  saved: "saved",
  applied: "applied",
  screen: "recruiter",
  recruiter: "recruiter",
  interview: "interviewing",
  interviewing: "interviewing",
  offer: "offer",
  rejected: "closed",
  closed: "closed"
};

const demoRawApplications: Record<SourceType, RawJobApplication[]> = {
  linkedin: [
    {
      source: "linkedin",
      sourceJobId: "li-23991",
      companyName: "Figma",
      jobTitle: "Senior Product Designer",
      status: "interview",
      city: "Remote",
      contact: "Maya Chen",
      notes: "Portfolio review scheduled after recruiter screen.",
      roleResponsibilities: ["Lead workflow redesign discovery", "Partner with product and engineering on systems", "Present design tradeoffs clearly"],
      interviewStartsAt: "2026-07-16T14:00:00+05:30",
      interviewDetails: "Portfolio review with product design panel.",
      extractionConfidence: 91,
      attachments: ["resume-saas.pdf", "case-study-portfolio.pdf"]
    }
  ],
  naukri: [
    {
      source: "naukri",
      sourceJobId: "naukri-771",
      employer: "Atlassian",
      title: "Senior UX Designer",
      status: "applied",
      city: "Bengaluru",
      contact: "Hiring Team",
      notes: "Imported from email fallback after application confirmation.",
      roleResponsibilities: ["Improve enterprise collaboration flows", "Create accessible product experiences", "Document design decisions for distributed teams"],
      extractionConfidence: 76,
      attachments: ["resume-enterprise.pdf"]
    }
  ],
  indeed: [
    {
      source: "indeed",
      sourceJobId: "indeed-9918",
      companyName: "Canva",
      jobTitle: "Product Design Lead",
      status: "offer",
      city: "Sydney or Remote",
      contact: "Nora Patel",
      notes: "Offer stage refreshed from source connection.",
      roleResponsibilities: ["Lead product design strategy", "Mentor designers", "Drive cross-functional roadmap decisions"],
      extractionConfidence: 88,
      attachments: ["offer-summary.pdf"]
    }
  ],
  shine: [
    {
      source: "shine",
      sourceJobId: "shine-112",
      employer: "PhonePe",
      title: "Lead Product Designer",
      status: "screen",
      city: "Bengaluru",
      contact: "Recruiting Ops",
      notes: "Imported through Shine email fallback.",
      roleResponsibilities: ["Own product design for payment journeys", "Coordinate with PM and engineering", "Use research to improve conversion"],
      extractionConfidence: 73,
      attachments: ["resume-leadership.pdf"]
    }
  ],
  browserExtension: [
    {
      source: "browserExtension",
      sourceJobId: "browser-ramp-51",
      employer: "Ramp",
      title: "Design Systems Designer",
      status: "applied",
      city: "New York",
      contact: "Leo Grant",
      notes: "Captured from browser confirmation page.",
      roleResponsibilities: ["Build reusable design-system patterns", "Improve component documentation", "Partner with frontend platform teams"],
      extractionConfidence: 82,
      attachments: ["resume-saas.pdf"]
    }
  ],
  emailParsing: [
    {
      source: "emailParsing",
      sourceJobId: "mail-microsoft-thread-1",
      employer: "Microsoft",
      title: "Product Designer II",
      status: "recruiter",
      city: "Bengaluru",
      contact: "Anika Rao",
      notes: "Parsed from recruiter availability request.",
      roleResponsibilities: ["Design enterprise product workflows", "Collaborate with research and engineering", "Prepare for stakeholder reviews"],
      interviewStartsAt: "2026-07-14T11:30:00+05:30",
      interviewDetails: "Recruiter screen parsed from availability email.",
      extractionConfidence: 84,
      attachments: []
    }
  ],
  manual: []
};

export function listSyncSources(): SyncSource[] {
  return syncSources;
}

export function listRecentSyncRuns(): SyncRun[] {
  return syncRuns;
}

export function listDemoConnectedAccounts(): ConnectedAccount[] {
  return connectedAccounts;
}

export function listDemoSourceEvents(): SourceEvent[] {
  return sourceEvents;
}

export function buildFingerprint(raw: RawJobApplication) {
  const company = (raw.companyName ?? raw.employer ?? "unknown-company").toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const role = (raw.jobTitle ?? raw.title ?? "untitled-role").toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return `${raw.source}::${raw.sourceJobId}::${company}::${role}`;
}

export function normalizeApplication(raw: RawJobApplication, sourceAccountId?: string): Opportunity {
  const company = raw.companyName ?? raw.employer ?? "Unknown company";
  const role = raw.jobTitle ?? raw.title ?? "Untitled role";
  const stage = stageMap[String(raw.status ?? "saved").toLowerCase()] ?? "saved";
  const now = new Date().toISOString();

  return {
    id: `opp-${buildFingerprint(raw)}`,
    company,
    role,
    stage,
    source: raw.source,
    location: raw.city ?? "Remote",
    nextAction: stage === "applied" ? "Set a follow-up reminder." : "Review imported application.",
    createdAt: raw.receivedAt ?? now,
    updatedAt: now,
    matchScore: stage === "offer" ? 92 : stage === "interviewing" ? 86 : 78,
    contactName: raw.contact,
    contactChannel: raw.contact ? providerLabels[raw.source] : undefined,
    notes: raw.notes ?? "Imported through sync engine after field normalization.",
    roleResponsibilities: raw.roleResponsibilities,
    interviewStartsAt: raw.interviewStartsAt,
    interviewDetails: raw.interviewDetails,
      sourceSubject: raw.sourceSubject,
      sourceSnippet: raw.sourceSnippet,
      sourceReceivedAt: raw.sourceReceivedAt,
      sourceLinks: raw.sourceLinks,
      jobPostingUrl: raw.jobPostingUrl,
      applicationUrl: raw.applicationUrl,
      extractionConfidence: raw.extractionConfidence,
    sourceAccountId,
    sourceJobId: raw.sourceJobId,
    fingerprint: buildFingerprint(raw),
    lastSourceSyncAt: now,
    attachments: raw.attachments
  };
}

export function defaultSyncMethodForProvider(provider: SourceType): SyncMethod {
  return providerMethods[provider];
}

export function labelForProvider(provider: SourceType) {
  return providerLabels[provider];
}

export function descriptionForProvider(provider: SourceType) {
  return providerDescriptions[provider];
}

export function statusFromConnection(connected: boolean): ConnectionStatus {
  return connected ? "connected" : "not_connected";
}

export function getDemoRawApplications(provider: SourceType) {
  return demoRawApplications[provider];
}

export function createSourceEvent(userId: string, provider: SourceType, opportunity: Opportunity): SourceEvent {
  return {
    id: `event-${provider}-${opportunity.sourceJobId ?? Date.now()}`,
    userId,
    provider,
    eventType: "application_imported",
    opportunityId: opportunity.id,
    fingerprint: opportunity.fingerprint ?? "",
    payload: {
      company: opportunity.company,
      role: opportunity.role,
      stage: opportunity.stage,
      sourceAccountId: opportunity.sourceAccountId,
      jobPostingUrl: opportunity.jobPostingUrl,
      applicationUrl: opportunity.applicationUrl,
      interviewStartsAt: opportunity.interviewStartsAt,
      extractionConfidence: opportunity.extractionConfidence
    },
    createdAt: new Date().toISOString()
  };
}

export function summarizeSyncHealth(
  accounts: ConnectedAccount[] = connectedAccounts,
  runs: SyncRun[] = syncRuns,
  normalizedOpportunities: Opportunity[] = opportunities
) {
  const importedCount = accounts.reduce((total, source) => total + source.importedCount, 0);
  const activePortalCount = accounts.filter((source) => source.status === "connected").length;
  const latestRun = runs[0];
  const fallbackSourceCount = accounts.filter((source) => source.method === "email_fallback").length;

  return {
    activePortalCount,
    importedCount,
    latestStatus: latestRun?.status ?? "queued",
    normalizedOpportunities: normalizedOpportunities.length,
    fallbackSourceCount
  };
}
