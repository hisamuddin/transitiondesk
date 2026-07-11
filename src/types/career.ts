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
  | "browserExtension"
  | "emailParsing"
  | "manual";

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
  notes: string;
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
  id: SourceType;
  label: string;
  connected: boolean;
  lastSyncedAt?: string;
  importedCount: number;
};

export type SyncRun = {
  id: string;
  startedAt: string;
  status: "queued" | "normalizing" | "completed" | "failed";
  source: SourceType;
  importedCount: number;
  mappedFields: string[];
};

export type DashboardStats = {
  activeCount: number;
  applicationsThisWeek: number;
  interviewCount: number;
  followUpsDue: number;
  averageMatchScore: number;
};
