import { SourceType } from "../../types/career";
import { RawJobApplication } from "./syncEngine";

type GmailMessageListResponse = {
  messages?: Array<{
    id: string;
    threadId: string;
  }>;
};

type GmailMessageResponse = {
  id: string;
  threadId: string;
  snippet?: string;
  internalDate?: string;
  payload?: {
    headers?: Array<{
      name: string;
      value: string;
    }>;
  };
};

type GmailProfile = {
  emailAddress: string;
  historyId: string;
  messagesTotal: number;
  threadsTotal: number;
};

const GMAIL_API_BASE = "https://gmail.googleapis.com/gmail/v1/users/me";
const GMAIL_MESSAGE_LIMIT = 12;

export async function fetchGmailProfile(accessToken: string) {
  return gmailFetch<GmailProfile>(`${GMAIL_API_BASE}/profile`, accessToken);
}

export async function fetchGmailApplications(accessToken: string) {
  const query = "newer_than:365d (application OR applied OR interview OR recruiter OR hiring OR offer)";
  const list = await gmailFetch<GmailMessageListResponse>(
    `${GMAIL_API_BASE}/messages?${new URLSearchParams({
      maxResults: String(GMAIL_MESSAGE_LIMIT),
      q: query
    }).toString()}`,
    accessToken
  );

  const messages = list.messages ?? [];
  if (!messages.length) {
    return [];
  }

  const details = await Promise.all(
    messages.map((message) =>
      gmailFetch<GmailMessageResponse>(
        `${GMAIL_API_BASE}/messages/${message.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`,
        accessToken
      )
    )
  );

  const applications = details
    .map((message) => toRawApplication(message))
    .filter((item): item is RawJobApplication => item !== null);

  return applications;
}

async function gmailFetch<T>(url: string, accessToken: string) {
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    const body = await response.text();
    const detail = safeMessage(body);
    if (response.status === 401 || response.status === 403) {
      throw new Error("Gmail access is missing or expired. Reconnect Google and grant Gmail inbox access.");
    }
    throw new Error(detail ?? `Gmail request failed with status ${response.status}.`);
  }

  return response.json() as Promise<T>;
}

function toRawApplication(message: GmailMessageResponse): RawJobApplication | null {
  const subject = readHeader(message, "Subject");
  const from = readHeader(message, "From");
  const snippet = message.snippet ?? "";
  const fullText = `${subject} ${from} ${snippet}`;
  const source = inferSource(fullText);
  const company = inferCompany(subject, from, snippet, source);
  const role = inferRole(subject, snippet);
  const status = inferStatus(fullText);

  if (!company && !role && source === "emailParsing") {
    return null;
  }

  const notes = [
    subject ? `Subject: ${subject}` : "",
    from ? `From: ${from}` : "",
    snippet ? `Snippet: ${snippet}` : ""
  ]
    .filter(Boolean)
    .join(" | ");

  return {
    source,
    sourceJobId: message.id,
    companyName: company ?? "Inbox lead",
    jobTitle: role ?? "Role mentioned in email",
    status,
    notes,
    receivedAt: message.internalDate ? new Date(Number(message.internalDate)).toISOString() : undefined
  } satisfies RawJobApplication;
}

function readHeader(message: GmailMessageResponse, name: string) {
  return message.payload?.headers?.find((header) => header.name.toLowerCase() === name.toLowerCase())?.value ?? "";
}

function inferSource(text: string): SourceType {
  const normalized = text.toLowerCase();
  if (normalized.includes("linkedin")) {
    return "linkedin";
  }
  if (normalized.includes("naukri")) {
    return "naukri";
  }
  if (normalized.includes("indeed")) {
    return "indeed";
  }
  if (normalized.includes("shine")) {
    return "shine";
  }
  return "emailParsing";
}

function inferStatus(text: string) {
  const normalized = text.toLowerCase();
  if (/(not moving forward|rejected|unsuccessful|declined)/.test(normalized)) {
    return "rejected";
  }
  if (/(offer|compensation package|congratulations)/.test(normalized)) {
    return "offer";
  }
  if (/(interview|availability|schedule|panel|onsite|take-home|take home)/.test(normalized)) {
    return "interview";
  }
  if (/(recruiter|talent acquisition|talent partner|screen)/.test(normalized)) {
    return "recruiter";
  }
  if (/(application received|thanks for applying|applied|application submitted)/.test(normalized)) {
    return "applied";
  }
  return "saved";
}

function inferCompany(subject: string, from: string, snippet: string, source: SourceType) {
  const senderName = cleanSenderName(from);
  if (senderName && !isGenericSender(senderName, source)) {
    return senderName;
  }

  return (
    extractWithPatterns(subject, [
      /(?:at|with)\s+([A-Z][A-Za-z0-9&.\- ]{1,50})/i,
      /application(?:\s+to)?\s+([A-Z][A-Za-z0-9&.\- ]{1,50})/i
    ]) ??
    extractWithPatterns(snippet, [
      /(?:at|with)\s+([A-Z][A-Za-z0-9&.\- ]{1,50})/i
    ])
  );
}

function inferRole(subject: string, snippet: string) {
  return (
    extractWithPatterns(subject, [
      /for\s+([A-Z][A-Za-z0-9+\/,&()\- ]{2,80})/i,
      /role[: -]\s*([A-Z][A-Za-z0-9+\/,&()\- ]{2,80})/i,
      /position[: -]\s*([A-Z][A-Za-z0-9+\/,&()\- ]{2,80})/i
    ]) ??
    extractWithPatterns(snippet, [
      /for\s+([A-Z][A-Za-z0-9+\/,&()\- ]{2,80})/i,
      /position(?: of)?\s+([A-Z][A-Za-z0-9+\/,&()\- ]{2,80})/i
    ])
  );
}

function extractWithPatterns(text: string, patterns: RegExp[]) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    const value = match?.[1]?.trim().replace(/[|.,:;]+$/, "");
    if (value) {
      return value;
    }
  }
  return undefined;
}

function cleanSenderName(from: string) {
  const namePart = from.split("<")[0]?.trim().replace(/^"|"$/g, "");
  return namePart
    ?.replace(/\b(careers|jobs|talent|recruiting|recruitment|team|notifications?)\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function isGenericSender(sender: string, source: SourceType) {
  const normalized = sender.toLowerCase();
  if (["no-reply", "noreply", "support", "mail", "jobs", "careers"].includes(normalized)) {
    return true;
  }

  if (source === "linkedin" && normalized.includes("linkedin")) {
    return true;
  }
  if (source === "indeed" && normalized.includes("indeed")) {
    return true;
  }
  if (source === "naukri" && normalized.includes("naukri")) {
    return true;
  }
  if (source === "shine" && normalized.includes("shine")) {
    return true;
  }

  return false;
}

function safeMessage(body: string) {
  try {
    const parsed = JSON.parse(body) as { error?: { message?: string } };
    return parsed.error?.message ?? body;
  } catch {
    return body;
  }
}
