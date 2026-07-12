import {
  ConnectedAccount,
  FollowUpTask,
  Interview,
  Opportunity,
  ResumeVersion,
  SourceEvent,
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
    notes: "Recruiter values design systems plus product strategy.",
    roleResponsibilities: [
      "Lead workflow redesign discovery",
      "Partner with product and engineering on systems",
      "Present design tradeoffs clearly"
    ],
    interviewStartsAt: "2026-07-16T14:00:00+05:30",
    interviewDetails: "Portfolio review with product design panel.",
    sourceSubject: "Figma portfolio review confirmed",
    sourceSnippet: "Portfolio review scheduled after recruiter screen. Prepare workflow redesign story and design systems examples.",
    sourceReceivedAt: "2026-07-11T08:42:00+05:30",
    extractionConfidence: 91,
    sourceAccountId: "acct-linkedin-demo",
    sourceJobId: "li-23991",
    fingerprint: "linkedin::li-23991::figma::senior-product-designer",
    lastSourceSyncAt: "2026-07-11T08:42:00+05:30",
    attachments: ["resume-saas.pdf", "case-study-portfolio.pdf"]
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
    notes: "Email parser found recruiter thread and role description.",
    roleResponsibilities: [
      "Design enterprise product workflows",
      "Collaborate with research and engineering",
      "Prepare for stakeholder reviews"
    ],
    interviewStartsAt: "2026-07-14T11:30:00+05:30",
    interviewDetails: "Recruiter screen parsed from availability email.",
    sourceSubject: "Availability for Microsoft recruiter screen",
    sourceSnippet: "Could you share availability for a 30 minutes phone screen? The role includes enterprise product workflows and cross-functional design delivery.",
    sourceReceivedAt: "2026-07-11T08:47:00+05:30",
    extractionConfidence: 84,
    sourceAccountId: "acct-email-demo",
    sourceJobId: "mail-microsoft-thread-1",
    fingerprint: "emailParsing::mail-microsoft-thread-1::microsoft::product-designer-ii",
    lastSourceSyncAt: "2026-07-11T08:47:00+05:30"
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
    notes: "Browser extension captured application confirmation page.",
    roleResponsibilities: [
      "Build reusable design-system patterns",
      "Improve component documentation",
      "Partner with frontend platform teams"
    ],
    sourceSubject: "Ramp application submitted",
    sourceSnippet: "Application submitted for Design Systems Designer. Responsibilities include reusable patterns, documentation, and frontend partnership.",
    sourceReceivedAt: "2026-07-11T08:50:00+05:30",
    extractionConfidence: 82,
    sourceAccountId: "acct-browser-demo",
    sourceJobId: "browser-ramp-51",
    fingerprint: "browserExtension::browser-ramp-51::ramp::design-systems-designer",
    lastSourceSyncAt: "2026-07-11T08:50:00+05:30"
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
    notes: "Strong culture fit. Needs relocation policy check.",
    roleResponsibilities: [
      "Lead product design strategy",
      "Mentor designers",
      "Drive cross-functional roadmap decisions"
    ],
    sourceSubject: "Canva offer details",
    sourceSnippet: "Offer package ready for Product Design Lead. Please review compensation, relocation policy, and leadership scope.",
    sourceReceivedAt: "2026-07-10T14:10:00+05:30",
    extractionConfidence: 88,
    sourceAccountId: "acct-indeed-demo",
    sourceJobId: "indeed-9918",
    fingerprint: "indeed::indeed-9918::canva::product-design-lead",
    lastSourceSyncAt: "2026-07-11T08:28:00+05:30"
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
    importedCount: 7,
    method: "email_fallback",
    status: "connected",
    description: "Email fallback sync until a stable API account is available."
  },
  {
    id: "indeed",
    label: "Indeed",
    connected: true,
    lastSyncedAt: "2026-07-11T08:28:00+05:30",
    importedCount: 11,
    method: "official_api",
    status: "connected",
    description: "Imported through a saved account connection."
  },
  {
    id: "shine",
    label: "Shine",
    connected: false,
    importedCount: 0,
    method: "email_fallback",
    status: "not_connected",
    description: "Ready to connect through email fallback sync."
  },
  {
    id: "browserExtension",
    label: "Browser extension",
    connected: true,
    lastSyncedAt: "2026-07-11T08:50:00+05:30",
    importedCount: 9,
    method: "manual_import",
    status: "connected",
    description: "Captures application confirmation pages from the browser."
  },
  {
    id: "emailParsing",
    label: "Email parsing",
    connected: true,
    lastSyncedAt: "2026-07-11T08:47:00+05:30",
    importedCount: 5,
    method: "email_fallback",
    status: "connected",
    description: "Parses recruiter and application emails into the sync pipeline."
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
    mappedFields: ["company", "role", "followUpDueAt", "contact"],
    updatedCount: 1,
    skippedCount: 0
  }
];

export const connectedAccounts: ConnectedAccount[] = [
  {
    id: "acct-linkedin-demo",
    userId: "demo-user",
    provider: "linkedin",
    label: "LinkedIn",
    method: "official_api",
    status: "connected",
    externalAccountId: "linkedin-user-demo",
    scopes: ["r_emailaddress", "r_liteprofile"],
    importedCount: 16,
    lastSyncedAt: "2026-07-11T08:42:00+05:30",
    syncState: "Healthy",
    notes: "Official account connection ready for scheduled sync."
  },
  {
    id: "acct-naukri-demo",
    userId: "demo-user",
    provider: "naukri",
    label: "Naukri",
    method: "email_fallback",
    status: "connected",
    externalAccountId: "naukri-mailbox-demo",
    scopes: ["mail.read"],
    importedCount: 7,
    lastSyncedAt: "2026-07-11T08:35:00+05:30",
    syncState: "Email fallback active",
    notes: "Uses email parsing until direct portal access is available."
  },
  {
    id: "acct-indeed-demo",
    userId: "demo-user",
    provider: "indeed",
    label: "Indeed",
    method: "official_api",
    status: "connected",
    externalAccountId: "indeed-user-demo",
    scopes: ["applications.read"],
    importedCount: 11,
    lastSyncedAt: "2026-07-11T08:28:00+05:30",
    syncState: "Healthy"
  },
  {
    id: "acct-shine-demo",
    userId: "demo-user",
    provider: "shine",
    label: "Shine",
    method: "email_fallback",
    status: "not_connected",
    scopes: [],
    importedCount: 0,
    syncState: "Awaiting connection",
    notes: "Set up mailbox parsing to bring Shine updates into the unified database."
  }
];

export const sourceEvents: SourceEvent[] = [
  {
    id: "event-linkedin-1",
    userId: "demo-user",
    provider: "linkedin",
    eventType: "application_imported",
    opportunityId: "opp-figma",
    fingerprint: "linkedin::li-23991::figma::senior-product-designer",
    payload: { stage: "interviewing", company: "Figma", role: "Senior Product Designer" },
    createdAt: "2026-07-11T08:42:00+05:30"
  },
  {
    id: "event-email-1",
    userId: "demo-user",
    provider: "emailParsing",
    eventType: "status_update",
    opportunityId: "opp-microsoft",
    fingerprint: "emailParsing::mail-microsoft-thread-1::microsoft::product-designer-ii",
    payload: { stage: "recruiter", contact: "Anika Rao" },
    createdAt: "2026-07-11T08:47:00+05:30"
  }
];
