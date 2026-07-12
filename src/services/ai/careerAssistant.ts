import { Opportunity, ResumeVersion } from "../../types/career";

const env = process.env as unknown as Record<string, string | undefined>;
const apiKey = env.EXPO_PUBLIC_OPENAI_API_KEY;

async function callAssistant(prompt: string) {
  if (!apiKey) {
    return "";
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "gpt-4.1-mini",
      input: prompt
    })
  });

  if (!response.ok) {
    throw new Error(`AI request failed with ${response.status}`);
  }

  const data = await response.json();
  return data.output_text ?? "No suggestion was returned.";
}

export function buildResumeMatchPrompt(opportunity: Opportunity, resume: ResumeVersion) {
  return [
    "Score this resume version for the opportunity and suggest three concrete edits.",
    `Company: ${opportunity.company}`,
    `Role: ${opportunity.role}`,
    `Known notes: ${opportunity.notes}`,
    `Resume: ${resume.title} - ${resume.focus}`
  ].join("\n");
}

export function buildCoverLetterPrompt(opportunity: Opportunity) {
  return [
    "Draft a concise, specific cover letter opening for this job application.",
    `Company: ${opportunity.company}`,
    `Role: ${opportunity.role}`,
    `Why this role: ${opportunity.notes}`
  ].join("\n");
}

export function buildFollowUpPrompt(opportunity: Opportunity) {
  return [
    "Draft a warm follow-up message for this job application.",
    `Company: ${opportunity.company}`,
    `Role: ${opportunity.role}`,
    `Contact: ${opportunity.contactName ?? "recruiter"}`,
    `Next action: ${opportunity.nextAction}`
  ].join("\n");
}

export async function suggestResumeImprovements(opportunity: Opportunity, resume: ResumeVersion) {
  return callAssistant(buildResumeMatchPrompt(opportunity, resume));
}

export async function draftCoverLetter(opportunity: Opportunity) {
  const aiDraft = await callAssistant(buildCoverLetterPrompt(opportunity));
  if (aiDraft) {
    return aiDraft;
  }

  return [
    `Hi ${opportunity.contactName ?? "Recruiter"},`,
    "",
    `I am interested in the ${opportunity.role} opportunity at ${opportunity.company}. My background aligns with the role through ${summarizeFit(opportunity)}.`,
    "",
    "I would be happy to discuss how my experience can help the team. Please let me know a convenient time to connect.",
    "",
    "Regards"
  ].join("\n");
}

export async function draftFollowUp(opportunity: Opportunity) {
  const aiDraft = await callAssistant(buildFollowUpPrompt(opportunity));
  if (aiDraft) {
    return aiDraft;
  }

  return [
    `Hi ${opportunity.contactName ?? "there"},`,
    "",
    `I wanted to check whether there is any update regarding my application for the ${opportunity.role} position at ${opportunity.company}.`,
    "I remain interested in the opportunity and would appreciate any feedback or next steps.",
    "",
    "Regards"
  ].join("\n");
}

function summarizeFit(opportunity: Opportunity) {
  const responsibilities = opportunity.roleResponsibilities?.slice(0, 3).join(", ");
  return responsibilities || opportunity.notes || "relevant engineering, product, and execution experience";
}
