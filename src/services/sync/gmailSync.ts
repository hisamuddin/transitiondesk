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

type GoogleTokenInfo = {
  scope?: string;
  expires_in?: string;
  error?: string;
  error_description?: string;
};

const GMAIL_API_BASE = "https://gmail.googleapis.com/gmail/v1/users/me";
const GOOGLE_TOKENINFO_URL = "https://www.googleapis.com/oauth2/v3/tokeninfo";
const GMAIL_MESSAGE_LIMIT = 12;
const GMAIL_READONLY_SCOPE = "https://www.googleapis.com/auth/gmail.readonly";

export async function fetchGmailProfile(accessToken: string) {
  await assertGmailScope(accessToken);
  return gmailFetch<GmailProfile>(`${GMAIL_API_BASE}/profile`, accessToken);
}

export async function fetchGmailApplications(accessToken: string) {
  await assertGmailScope(accessToken);

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

async function assertGmailScope(accessToken: string) {
  const response = await fetch(`${GOOGLE_TOKENINFO_URL}?${new URLSearchParams({ access_token: accessToken }).toString()}`);
  const tokenInfo = (await response.json().catch(() => ({}))) as GoogleTokenInfo;

  if (!response.ok || tokenInfo.error) {
    const description = tokenInfo.error_description ?? tokenInfo.error ?? "Google could not validate the Gmail token.";
    throw new Error(`Google token check failed: ${description}. Click Connect Gmail and approve Gmail inbox access again.`);
  }

  const scopes = new Set((tokenInfo.scope ?? "").split(/\s+/).filter(Boolean));
  if (!scopes.has(GMAIL_READONLY_SCOPE)) {
    throw new Error(
      `Google token is missing Gmail scope. Received scopes: ${tokenInfo.scope || "none"}. Click Connect Gmail and approve Gmail inbox access.`
    );
  }
}

async function gmailFetch<T>(url: string, accessToken: string) {
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    const body = await response.text();
    const detail = safeGoogleError(body);
    if (response.status === 401 || response.status === 403) {
      throw new Error(`Gmail API rejected the request (${response.status}): ${detail}`);
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
    roleResponsibilities: inferResponsibilities(snippet),
    interviewStartsAt: inferInterviewDate(fullText, message.internalDate),
    interviewDetails: inferInterviewDetails(fullText),
    sourceSubject: subject,
    sourceSnippet: snippet,
    sourceReceivedAt: message.internalDate ? new Date(Number(message.internalDate)).toISOString() : undefined,
    extractionConfidence: scoreExtraction({ company, role, status, snippet }),
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

function inferResponsibilities(snippet: string) {
  const normalized = snippet.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return undefined;
  }

  const responsibilityText = extractWithPatterns(normalized, [
    /(?:responsibilities|what you'll do|you will|role includes)[: -]\s*([^.]*(?:\.[^.]*){0,2})/i,
    /(?:looking for|seeking)\s+(?:someone|a candidate)?\s*(?:who can|to)\s+([^.]*(?:\.[^.]*){0,2})/i
  ]);

  if (!responsibilityText) {
    return undefined;
  }

  const items = responsibilityText
    .split(/(?:;|\s-\s|\s\|\s|,\s(?=(?:lead|own|build|design|partner|manage|create|develop|drive)\b))/i)
    .map((item) => item.trim().replace(/^[*-]\s*/, ""))
    .filter((item) => item.length > 10)
    .slice(0, 3);

  return items.length ? items : [responsibilityText];
}

function inferInterviewDate(text: string, internalDate?: string) {
  if (!/(interview|availability|schedule|screen|call|meet)/i.test(text)) {
    return undefined;
  }

  const base = internalDate ? new Date(Number(internalDate)) : new Date();
  const tomorrow = /tomorrow/i.test(text);
  const nextWeek = /next week/i.test(text);
  const explicitDate = text.match(/\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s+\d{1,2}\b/i)?.[0];
  const time = text.match(/\b\d{1,2}(?::\d{2})?\s*(?:am|pm)\b/i)?.[0];

  const date = new Date(base);
  if (tomorrow) {
    date.setDate(date.getDate() + 1);
  } else if (nextWeek) {
    date.setDate(date.getDate() + 7);
  } else if (explicitDate) {
    const parsed = new Date(`${explicitDate} ${base.getFullYear()} ${time ?? ""}`);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  } else {
    return undefined;
  }

  if (time) {
    const parsedTime = time.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i);
    if (parsedTime) {
      let hours = Number(parsedTime[1]);
      const minutes = Number(parsedTime[2] ?? "0");
      const meridiem = parsedTime[3].toLowerCase();
      if (meridiem === "pm" && hours < 12) {
        hours += 12;
      }
      if (meridiem === "am" && hours === 12) {
        hours = 0;
      }
      date.setHours(hours, minutes, 0, 0);
    }
  }

  return date.toISOString();
}

function inferInterviewDetails(text: string) {
  if (!/(interview|availability|schedule|screen|call|meet)/i.test(text)) {
    return undefined;
  }

  const format = /(zoom|teams|google meet|video)/i.test(text)
    ? "Video interview"
    : /(phone|call)/i.test(text)
      ? "Phone screen"
      : "Interview";

  const duration = text.match(/\b(\d{2,3})\s*(?:min|minutes)\b/i)?.[0];
  return [format, duration].filter(Boolean).join(" - ");
}

function scoreExtraction(input: { company?: string; role?: string; status: string; snippet: string }) {
  let score = 45;
  if (input.company) {
    score += 20;
  }
  if (input.role) {
    score += 20;
  }
  if (input.status !== "saved") {
    score += 10;
  }
  if (input.snippet.length > 80) {
    score += 5;
  }
  return Math.min(score, 95);
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

function safeGoogleError(body: string) {
  try {
    const parsed = JSON.parse(body) as { error?: { message?: string; status?: string; details?: Array<{ reason?: string }> } };
    const reason = parsed.error?.details?.map((detail) => detail.reason).filter(Boolean).join(", ");
    const status = parsed.error?.status;
    return [parsed.error?.message, status, reason ? `reason: ${reason}` : ""].filter(Boolean).join(" ");
  } catch {
    return body;
  }
}
