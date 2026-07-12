import { supabase } from "./client";

export type TransitionProfile = {
  resignationDate: string;
  noticePeriodDays: string;
  lastWorkingDay: string;
  currentRole: string;
  currentCompany: string;
  currentCtc: string;
  expectedCtc: string;
  experienceYears: string;
  desiredRoles: string;
  preferredLocations: string;
  workMode: string;
  targetCompanies: string;
  technologies: string;
  interviewAvailability: string;
  joiningTimeline: string;
  switchReason: string;
  confidential: boolean;
};

export type SavedResumeVersion = {
  id: string;
  fileName: string;
  mimeType?: string;
  targetRole: string;
  versionNumber: number;
  uploadedAt: string;
  sourceOpportunityId?: string;
  notes?: string;
};

const emptyProfile: TransitionProfile = {
  resignationDate: "",
  noticePeriodDays: "",
  lastWorkingDay: "",
  currentRole: "",
  currentCompany: "",
  currentCtc: "",
  expectedCtc: "",
  experienceYears: "",
  desiredRoles: "",
  preferredLocations: "",
  workMode: "",
  targetCompanies: "",
  technologies: "",
  interviewAvailability: "",
  joiningTimeline: "",
  switchReason: "",
  confidential: false
};

export function getEmptyTransitionProfile() {
  return emptyProfile;
}

export function calculateLastWorkingDay(resignationDate: string, noticePeriodDays: string) {
  const days = Number.parseInt(noticePeriodDays, 10);
  const start = Date.parse(resignationDate);

  if (!Number.isFinite(start) || !Number.isFinite(days) || days < 0) {
    return "";
  }

  const lastWorkingDay = new Date(start);
  lastWorkingDay.setDate(lastWorkingDay.getDate() + days);
  return lastWorkingDay.toISOString().slice(0, 10);
}

export async function loadTransitionProfile(userId: string | undefined): Promise<TransitionProfile> {
  if (!userId) {
    return emptyProfile;
  }

  const localProfile = readLocalProfile(userId);

  if (supabase && isUuid(userId)) {
    const { data, error } = await supabase
      .from("activity_events")
      .select("metadata")
      .eq("user_id", userId)
      .eq("event_type", "transition_profile_saved")
      .order("created_at", { ascending: false })
      .limit(1);

    if (!error && data?.[0]?.metadata) {
      return normalizeTransitionProfile(data[0].metadata);
    }
  }

  return localProfile;
}

export async function saveTransitionProfile(userId: string | undefined, profile: TransitionProfile) {
  if (!userId) {
    return;
  }

  const normalized = normalizeTransitionProfile({
    ...profile,
    lastWorkingDay: profile.lastWorkingDay || calculateLastWorkingDay(profile.resignationDate, profile.noticePeriodDays)
  });

  writeLocalProfile(userId, normalized);

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("transitiondesk:profile-saved", { detail: normalized }));
  }

  if (supabase && isUuid(userId)) {
    await supabase.from("activity_events").insert({
      user_id: userId,
      event_type: "transition_profile_saved",
      entity_type: "transition_profile",
      entity_id: userId,
      metadata: normalized
    });
  }
}

export async function loadResumeVersions(userId: string | undefined): Promise<SavedResumeVersion[]> {
  if (!userId) {
    return [];
  }

  const localResumeVersions = readLocalResumeVersions(userId);

  if (supabase && isUuid(userId)) {
    const { data, error } = await supabase
      .from("activity_events")
      .select("metadata")
      .eq("user_id", userId)
      .eq("event_type", "resume_version_saved")
      .order("created_at", { ascending: false })
      .limit(25);

    if (!error && data) {
      const remoteResumeVersions = data.map((row) => normalizeResumeVersion(row.metadata)).filter(Boolean) as SavedResumeVersion[];
      return mergeResumeVersions(remoteResumeVersions, localResumeVersions);
    }
  }

  return localResumeVersions;
}

export async function saveResumeVersion(userId: string | undefined, resumeVersion: SavedResumeVersion) {
  if (!userId) {
    return;
  }

  const current = readLocalResumeVersions(userId);
  writeLocalResumeVersions(userId, [resumeVersion, ...current.filter((resume) => resume.id !== resumeVersion.id)]);

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("transitiondesk:resume-saved", { detail: resumeVersion }));
  }

  if (supabase && isUuid(userId)) {
    await supabase.from("activity_events").insert({
      user_id: userId,
      event_type: "resume_version_saved",
      entity_type: "resume_version",
      entity_id: resumeVersion.id,
      metadata: resumeVersion
    });
  }
}

function normalizeTransitionProfile(value: unknown): TransitionProfile {
  const record = (value ?? {}) as Record<string, unknown>;
  return {
    resignationDate: String(record.resignationDate ?? ""),
    noticePeriodDays: String(record.noticePeriodDays ?? ""),
    lastWorkingDay: String(record.lastWorkingDay ?? ""),
    currentRole: String(record.currentRole ?? ""),
    currentCompany: String(record.currentCompany ?? ""),
    currentCtc: String(record.currentCtc ?? ""),
    expectedCtc: String(record.expectedCtc ?? ""),
    experienceYears: String(record.experienceYears ?? ""),
    desiredRoles: String(record.desiredRoles ?? ""),
    preferredLocations: String(record.preferredLocations ?? ""),
    workMode: String(record.workMode ?? ""),
    targetCompanies: String(record.targetCompanies ?? ""),
    technologies: String(record.technologies ?? ""),
    interviewAvailability: String(record.interviewAvailability ?? ""),
    joiningTimeline: String(record.joiningTimeline ?? ""),
    switchReason: String(record.switchReason ?? ""),
    confidential: record.confidential === true || record.confidential === "true"
  };
}

function normalizeResumeVersion(value: unknown) {
  const record = (value ?? {}) as Record<string, unknown>;
  const fileName = String(record.fileName ?? "");
  if (!fileName) {
    return null;
  }

  return {
    id: String(record.id ?? `${Date.now()}-${fileName}`),
    fileName,
    mimeType: typeof record.mimeType === "string" ? record.mimeType : undefined,
    targetRole: String(record.targetRole ?? ""),
    versionNumber: Number(record.versionNumber ?? 1),
    uploadedAt: String(record.uploadedAt ?? new Date().toISOString()),
    sourceOpportunityId: typeof record.sourceOpportunityId === "string" ? record.sourceOpportunityId : undefined,
    notes: typeof record.notes === "string" ? record.notes : undefined
  } satisfies SavedResumeVersion;
}

function readLocalProfile(userId: string) {
  return normalizeTransitionProfile(readLocalValue(`transitiondesk.profile.${userId}`));
}

function writeLocalProfile(userId: string, profile: TransitionProfile) {
  writeLocalValue(`transitiondesk.profile.${userId}`, profile);
}

function readLocalResumeVersions(userId: string) {
  const value = readLocalValue(`transitiondesk.resumeVersions.${userId}`);
  return Array.isArray(value) ? value.map(normalizeResumeVersion).filter(Boolean) as SavedResumeVersion[] : [];
}

function writeLocalResumeVersions(userId: string, resumeVersions: SavedResumeVersion[]) {
  writeLocalValue(`transitiondesk.resumeVersions.${userId}`, resumeVersions);
}

function readLocalValue(key: string) {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeLocalValue(key: string, value: unknown) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Some browser privacy modes block local storage.
  }
}

function mergeResumeVersions(remote: SavedResumeVersion[], local: SavedResumeVersion[]) {
  const byId = new Map<string, SavedResumeVersion>();
  [...remote, ...local].forEach((resumeVersion) => byId.set(resumeVersion.id, resumeVersion));
  return Array.from(byId.values()).sort((left, right) => Date.parse(right.uploadedAt) - Date.parse(left.uploadedAt));
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
