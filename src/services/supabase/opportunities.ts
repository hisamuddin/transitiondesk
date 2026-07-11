import { Opportunity } from "../../types/career";
import { logActivity } from "./activity";
import { supabase } from "./client";

function fromRow(row: any): Opportunity {
  return {
    id: row.id,
    company: row.company,
    role: row.role,
    stage: row.stage,
    source: row.source,
    location: row.location ?? "Remote",
    compensation: row.compensation,
    nextAction: row.next_action ?? "Review opportunity.",
    followUpDueAt: row.follow_up_due_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    matchScore: row.match_score ?? 0,
    notes: row.notes ?? "",
    sourceAccountId: row.source_account_id ?? undefined,
    sourceJobId: row.source_job_id ?? undefined,
    fingerprint: row.fingerprint ?? undefined,
    lastSourceSyncAt: row.last_source_sync_at ?? undefined,
    attachments: row.attachments ?? []
  };
}

export async function loadUserOpportunities(userId: string | undefined) {
  if (!supabase || !userId) {
    return null;
  }

  const { data, error } = await supabase
    .from("opportunities")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (error) {
    throw error;
  }

  await logActivity(userId, "view_pipeline", { count: data?.length ?? 0 });
  return (data ?? []).map(fromRow);
}

export async function seedUserOpportunities(userId: string, opportunities: Opportunity[]) {
  if (!supabase) {
    return;
  }

  const rows = opportunities.map((opportunity) => ({
    user_id: userId,
    company: opportunity.company,
    role: opportunity.role,
    stage: opportunity.stage,
    source: opportunity.source,
    location: opportunity.location,
    compensation: opportunity.compensation,
    next_action: opportunity.nextAction,
    follow_up_due_at: opportunity.followUpDueAt,
    match_score: opportunity.matchScore,
    notes: opportunity.notes,
    source_account_id: opportunity.sourceAccountId,
    source_job_id: opportunity.sourceJobId,
    fingerprint: opportunity.fingerprint,
    last_source_sync_at: opportunity.lastSourceSyncAt,
    attachments: opportunity.attachments ?? []
  }));

  await supabase.from("opportunities").upsert(rows, { onConflict: "user_id,fingerprint" });
  await logActivity(userId, "seed_opportunities", { count: rows.length });
}
