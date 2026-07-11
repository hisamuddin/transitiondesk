import { opportunities, syncRuns, syncSources } from "../../data/seed";
import { Opportunity, SourceType, SyncRun } from "../../types/career";

type RawJobApplication = {
  source: SourceType;
  companyName?: string;
  employer?: string;
  jobTitle?: string;
  title?: string;
  status?: string;
  city?: string;
  contact?: string;
};

const stageMap: Record<string, Opportunity["stage"]> = {
  saved: "saved",
  applied: "applied",
  screen: "recruiter",
  interview: "interviewing",
  offer: "offer",
  rejected: "closed"
};

export function listSyncSources() {
  return syncSources;
}

export function listRecentSyncRuns(): SyncRun[] {
  return syncRuns;
}

export function normalizeApplication(raw: RawJobApplication): Opportunity {
  const company = raw.companyName ?? raw.employer ?? "Unknown company";
  const role = raw.jobTitle ?? raw.title ?? "Untitled role";
  const stage = stageMap[String(raw.status ?? "saved").toLowerCase()] ?? "saved";
  const now = new Date().toISOString();

  return {
    id: `opp-${company.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now()}`,
    company,
    role,
    stage,
    source: raw.source,
    location: raw.city ?? "Remote",
    nextAction: stage === "applied" ? "Set a follow-up reminder." : "Review imported application.",
    createdAt: now,
    updatedAt: now,
    matchScore: 70,
    contactName: raw.contact,
    contactChannel: raw.contact ? "Imported contact" : undefined,
    notes: "Imported through sync engine after field normalization."
  };
}

export function summarizeSyncHealth() {
  const importedCount = syncSources.reduce((total, source) => total + source.importedCount, 0);
  const activePortalCount = syncSources.filter((source) => source.connected).length;
  const latestRun = syncRuns[0];

  return {
    activePortalCount,
    importedCount,
    latestStatus: latestRun?.status ?? "queued",
    normalizedOpportunities: opportunities.length
  };
}
