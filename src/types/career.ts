export type OpportunityStage =
  | "saved"
  | "applied"
  | "recruiter"
  | "interviewing"
  | "offer"
  | "closed";

export type SourceType =
  | "linkedin"
  | "naukri"
  | "indeed"
  | "shine"
  | "browserExtension"
  | "emailParsing"
  | "manual";

export type SyncMethod = "official_api" | "email_fallback" | "manual_import";
export type ConnectionStatus = "not_connected" | "connected" | "attention";
export type SyncRunStatus = "queued" | "normalizing" | "completed" | "failed";

export type Opportunity = {
  id: string;
  company: string;
  role: string;
  stage: OpportunityStage;
  source: SourceType;
  location: string;
  compensation?: string;
  nextAction: string;
  followUpDueAt?: string;
  createdAt: string;
  updatedAt: string;
  resumeVersionId?: string;
  coverLetterId?: string;
  matchScore: number;
  contactName?: string;
  contactChannel?: string;
  contactEmail?: string;
  notes: string;
  roleResponsibilities?: string[];
  interviewStartsAt?: string;
  interviewDetails?: string;
  sourceSubject?: string;
  sourceSnippet?: string;
  sourceReceivedAt?: string;
  sourceLinks?: string[];
  jobPostingUrl?: string;
  applicationUrl?: string;
  dataQualityNotes?: string[];
  extractionConfidence?: number;
  sourceAccountId?: string;
  sourceJobId?: string;
  fingerprint?: string;
  lastSourceSyncAt?: string;
  attachments?: string[];
};

export type ResumeVersion = {
  id: string;
  title: string;
  focus: string;
  matchScore: number;
  fileUri?: string;
  usedForOpportunityIds: string[];
  updatedAt: string;
};

export type Interview = {
  id: string;
  opportunityId: string;
  company: string;
  title: string;
  startsAt: string;
  durationMinutes: number;
  format: "phone" | "video" | "onsite" | "takeHome";
  calendarEventId?: string;
  prepQuestions: string[];
};

export type FollowUpTask = {
  id: string;
  opportunityId: string;
  label: string;
  dueAt: string;
  completed: boolean;
};

export type SyncSource = {
  id: SourceType | "emailParsing";
  label: string;
  connected: boolean;
  lastSyncedAt?: string;
  importedCount: number;
  method?: SyncMethod;
  status?: ConnectionStatus;
  description?: string;
};

export type SyncRun = {
  id: string;
  startedAt: string;
  status: SyncRunStatus;
  source: SourceType;
  importedCount: number;
  mappedFields: string[];
  updatedCount?: number;
  skippedCount?: number;
  errorMessage?: string;
};

export type DashboardStats = {
  activeCount: number;
  applicationsThisWeek: number;
  interviewCount: number;
  followUpsDue: number;
  averageMatchScore: number;
};

export type ConnectedAccount = {
  id: string;
  userId?: string;
  provider: SourceType;
  label: string;
  method: SyncMethod;
  status: ConnectionStatus;
  externalAccountId?: string;
  tokenReference?: string;
  scopes: string[];
  importedCount: number;
  lastSyncedAt?: string;
  syncState?: string;
  notes?: string;
};

export type SourceEvent = {
  id: string;
  userId?: string;
  provider: SourceType | "emailParsing";
  eventType: string;
  opportunityId?: string;
  fingerprint: string;
  payload: Record<string, unknown>;
  createdAt: string;
};
