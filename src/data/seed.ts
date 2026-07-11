import {
  FollowUpTask,
  Interview,
  Opportunity,
  ResumeVersion,
  SyncRun,
  SyncSource
} from "../types/career";

export const opportunities: Opportunity[] = [
  {
    id: "opp-figma",
    company: "Figma",
    role: "Senior Product Designer",
    stage: "interviewing",
    source: "linkedin",
    location: "Remote",
    compensation: "$185k - $220k",
    nextAction: "Prepare portfolio story for the workflow redesign case study.",
    followUpDueAt: "2026-07-15T10:00:00+05:30",
    createdAt: "2026-07-08T09:00:00+05:30",
    updatedAt: "2026-07-11T08:30:00+05:30",
    resumeVersionId: "resume-saas",
    coverLetterId: "cover-figma",
    matchScore: 88,
    contactName: "Maya Chen",
    contactChannel: "LinkedIn",
    notes: "Recruiter values design systems plus product strategy."
  },
  {
    id: "opp-microsoft",
    company: "Microsoft",
    role: "Product Designer II",
    stage: "recruiter",
    source: "emailParsing",
    location: "Bengaluru",
    compensation: "Competitive",
    nextAction: "Reply with availability for recruiter screen.",
    followUpDueAt: "2026-07-12T12:00:00+05:30",
    createdAt: "2026-07-09T09:00:00+05:30",
    updatedAt: "2026-07-11T07:45:00+05:30",
    resumeVersionId: "resume-enterprise",
    matchScore: 81,
    contactName: "Anika Rao",
    contactChannel: "Email",
    notes: "Email parser found recruiter thread and role description."
  },
  {
    id: "opp-ramp",
    company: "Ramp",
    role: "Design Systems Designer",
    stage: "applied",
    source: "browserExtension",
    location: "New York",
    nextAction: "Send recruiter follow-up and attach Resume v4.",
    followUpDueAt: "2026-07-11T17:00:00+05:30",
    createdAt: "2026-07-05T19:30:00+05:30",
    updatedAt: "2026-07-10T15:20:00+05:30",
    resumeVersionId: "resume-saas",
    coverLetterId: "cover-ramp",
    matchScore: 78,
    contactName: "Leo Grant",
    contactChannel: "Email",
    notes: "Browser extension captured application confirmation page."
  },
  {
    id: "opp-cano",
    company: "Canva",
    role: "Product Design Lead",
    stage: "offer",
    source: "indeed",
    location: "Sydney or Remote",
    compensation: "$210k package",
    nextAction: "Compare offer against current role and prepare negotiation notes.",
    createdAt: "2026-06-22T11:00:00+05:30",
    updatedAt: "2026-07-10T14:10:00+05:30",
    resumeVersionId: "resume-leadership",
    matchScore: 92,
    contactName: "Nora Patel",
    contactChannel: "Email",
    notes: "Strong culture fit. Needs relocation policy check."
  }
];

export const resumes: ResumeVersion[] = [
  {
    id: "resume-saas",
    title: "v4 SaaS Product",
    focus: "Growth, workflows, systems, and collaboration products",
    matchScore: 88,
    usedForOpportunityIds: ["opp-figma", "opp-ramp"],
    updatedAt: "2026-07-10T13:00:00+05:30"
  },
  {
    id: "resume-enterprise",
    title: "v3 Enterprise Platforms",
    focus: "Enterprise UX, accessibility, and cross-functional delivery",
    matchScore: 81,
    usedForOpportunityIds: ["opp-microsoft"],
    updatedAt: "2026-07-09T15:00:00+05:30"
  },
  {
    id: "resume-leadership",
    title: "v2 Design Leadership",
    focus: "Team leadership, strategy, and stakeholder alignment",
    matchScore: 92,
    usedForOpportunityIds: ["opp-cano"],
    updatedAt: "2026-07-07T16:00:00+05:30"
  }
];

export const interviews: Interview[] = [
  {
    id: "interview-figma",
    opportunityId: "opp-figma",
    company: "Figma",
    title: "Portfolio review",
    startsAt: "2026-07-16T14:00:00+05:30",
    durationMinutes: 60,
    format: "video",
    prepQuestions: [
      "Why Figma now?",
      "How do you work with PMs and engineering?",
      "What tradeoff did you make in the workflow redesign?",
      "What would you improve in Figma for enterprise teams?"
    ]
  },
  {
    id: "interview-microsoft",
    opportunityId: "opp-microsoft",
    company: "Microsoft",
    title: "Recruiter screen",
    startsAt: "2026-07-14T11:30:00+05:30",
    durationMinutes: 30,
    format: "phone",
    prepQuestions: [
      "What role scope are you targeting?",
      "What products or teams interest you?",
      "What timeline are you working with?"
    ]
  }
];

export const followUps: FollowUpTask[] = [
  {
    id: "follow-ramp",
    opportunityId: "opp-ramp",
    label: "Send recruiter follow-up",
    dueAt: "2026-07-11T17:00:00+05:30",
    completed: false
  },
  {
    id: "follow-microsoft",
    opportunityId: "opp-microsoft",
    label: "Reply with availability",
    dueAt: "2026-07-12T12:00:00+05:30",
    completed: false
  }
];

export const syncSources: SyncSource[] = [
  {
    id: "linkedin",
    label: "LinkedIn",
    connected: true,
    lastSyncedAt: "2026-07-11T08:42:00+05:30",
    importedCount: 16
  },
  {
    id: "naukri",
    label: "Naukri",
    connected: true,
    lastSyncedAt: "2026-07-11T08:35:00+05:30",
    importedCount: 7
  },
  {
    id: "indeed",
    label: "Indeed",
    connected: true,
    lastSyncedAt: "2026-07-11T08:28:00+05:30",
    importedCount: 11
  },
  {
    id: "browserExtension",
    label: "Browser extension",
    connected: true,
    lastSyncedAt: "2026-07-11T08:50:00+05:30",
    importedCount: 9
  },
  {
    id: "emailParsing",
    label: "Email parsing",
    connected: true,
    lastSyncedAt: "2026-07-11T08:47:00+05:30",
    importedCount: 5
  }
];

export const syncRuns: SyncRun[] = [
  {
    id: "sync-1",
    source: "linkedin",
    startedAt: "2026-07-11T08:42:00+05:30",
    status: "completed",
    importedCount: 3,
    mappedFields: ["company", "role", "stage", "location", "contact"]
  },
  {
    id: "sync-2",
    source: "emailParsing",
    startedAt: "2026-07-11T08:47:00+05:30",
    status: "normalizing",
    importedCount: 1,
    mappedFields: ["company", "role", "followUpDueAt", "contact"]
  }
];
