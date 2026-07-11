import { connectedAccounts as demoAccounts, sourceEvents as demoEvents, syncRuns as demoRuns } from "../../data/seed";
import {
  ConnectedAccount,
  Opportunity,
  SourceEvent,
  SourceType,
  SyncRun,
  SyncRunStatus
} from "../../types/career";
import {
  createSourceEvent,
  defaultSyncMethodForProvider,
  descriptionForProvider,
  getDemoRawApplications,
  labelForProvider,
  normalizeApplication
} from "../sync/syncEngine";
import { logActivity } from "./activity";
import { supabase } from "./client";

function mapAccount(row: any): ConnectedAccount {
  return {
    id: row.id,
    userId: row.user_id,
    provider: row.provider,
    label: labelForProvider(row.provider),
    method: row.sync_method,
    status: row.status,
    externalAccountId: row.external_account_id,
    tokenReference: row.token_reference,
    scopes: row.scopes ?? [],
    importedCount: row.imported_count ?? 0,
    lastSyncedAt: row.last_synced_at,
    syncState: row.sync_state,
    notes: row.notes
  };
}

function mapRun(row: any): SyncRun {
  return {
    id: row.id,
    source: row.provider,
    startedAt: row.started_at,
    status: row.status,
    importedCount: row.imported_count ?? 0,
    mappedFields: row.mapped_fields ?? [],
    updatedCount: row.updated_count ?? 0,
    skippedCount: row.skipped_count ?? 0,
    errorMessage: row.error_message ?? undefined
  };
}

function mapEvent(row: any): SourceEvent {
  return {
    id: row.id,
    userId: row.user_id,
    provider: row.provider,
    eventType: row.event_type,
    opportunityId: row.opportunity_id,
    fingerprint: row.fingerprint,
    payload: row.payload ?? {},
    createdAt: row.created_at
  };
}

export async function loadConnectedAccounts(userId: string | undefined) {
  if (!userId) {
    return [];
  }

  if (!supabase) {
    return demoAccounts;
  }

  try {
    const { data, error } = await supabase
      .from("connected_accounts")
      .select("*")
      .eq("user_id", userId)
      .order("provider", { ascending: true });

    if (error) {
      throw error;
    }

    return (data ?? []).map(mapAccount);
  } catch {
    return demoAccounts;
  }
}

export async function connectPortalAccount(userId: string | undefined, provider: SourceType) {
  if (!userId) {
    return null;
  }

  const nextAccount = {
    user_id: userId,
    provider,
    status: "connected",
    sync_method: defaultSyncMethodForProvider(provider),
    external_account_id: `${provider}-workspace-${userId.slice(0, 8)}`,
    token_reference: `${provider}-demo-token`,
    scopes: defaultSyncMethodForProvider(provider) === "official_api" ? ["applications.read"] : ["mail.read"],
    imported_count: 0,
    sync_state: defaultSyncMethodForProvider(provider) === "official_api" ? "Ready for API sync" : "Email fallback active",
    notes: descriptionForProvider(provider)
  };

  if (!supabase) {
    await logActivity(userId, "connect_source", { provider, method: nextAccount.sync_method }, "connected_account", provider);
    return {
      id: `acct-${provider}-${userId.slice(0, 8)}`,
      ...nextAccount,
      label: labelForProvider(provider),
      method: nextAccount.sync_method,
      status: "connected" as const,
      importedCount: 0,
      syncState: nextAccount.sync_state
    };
  }

  try {
    const { data, error } = await supabase
      .from("connected_accounts")
      .upsert(nextAccount, { onConflict: "user_id,provider" })
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    await logActivity(userId, "connect_source", { provider, method: nextAccount.sync_method }, "connected_account", data.id);
    return mapAccount(data);
  } catch {
    await logActivity(userId, "connect_source_demo", { provider, method: nextAccount.sync_method }, "connected_account", provider);
    return {
      id: `acct-${provider}-${userId.slice(0, 8)}`,
      userId,
      provider,
      label: labelForProvider(provider),
      method: nextAccount.sync_method,
      status: "connected",
      externalAccountId: nextAccount.external_account_id,
      tokenReference: nextAccount.token_reference,
      scopes: nextAccount.scopes,
      importedCount: 0,
      syncState: nextAccount.sync_state,
      notes: nextAccount.notes
    };
  }
}

export async function loadSyncRuns(userId: string | undefined) {
  if (!userId) {
    return [];
  }

  if (!supabase) {
    return demoRuns;
  }

  try {
    const { data, error } = await supabase
      .from("sync_runs")
      .select("*")
      .eq("user_id", userId)
      .order("started_at", { ascending: false })
      .limit(10);

    if (error) {
      throw error;
    }

    return (data ?? []).map(mapRun);
  } catch {
    return demoRuns;
  }
}

export async function loadSourceEvents(userId: string | undefined, opportunityId?: string) {
  if (!userId) {
    return [];
  }

  if (!supabase) {
    return opportunityId ? demoEvents.filter((event) => event.opportunityId === opportunityId) : demoEvents;
  }

  let query = supabase
    .from("source_events")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(25);

  if (opportunityId) {
    query = query.eq("opportunity_id", opportunityId);
  }

  try {
    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return (data ?? []).map(mapEvent);
  } catch {
    return opportunityId ? demoEvents.filter((event) => event.opportunityId === opportunityId) : demoEvents;
  }
}

async function createRun(userId: string, provider: SourceType, status: SyncRunStatus = "queued") {
  if (!supabase) {
    return {
      id: `sync-${provider}-${Date.now()}`,
      source: provider,
      startedAt: new Date().toISOString(),
      status,
      importedCount: 0,
      mappedFields: []
    } satisfies SyncRun;
  }

  const { data, error } = await supabase
    .from("sync_runs")
    .insert({
      user_id: userId,
      provider,
      status,
      mapped_fields: [],
      imported_count: 0,
      updated_count: 0,
      skipped_count: 0
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return mapRun(data);
}

async function finalizeRun(runId: string, updates: Partial<SyncRun>) {
  if (!supabase) {
    return;
  }

  const payload: Record<string, unknown> = {};
  if (updates.status) {
    payload.status = updates.status;
  }
  if (updates.importedCount != null) {
    payload.imported_count = updates.importedCount;
  }
  if (updates.updatedCount != null) {
    payload.updated_count = updates.updatedCount;
  }
  if (updates.skippedCount != null) {
    payload.skipped_count = updates.skippedCount;
  }
  if (updates.mappedFields) {
    payload.mapped_fields = updates.mappedFields;
  }
  if (updates.errorMessage !== undefined) {
    payload.error_message = updates.errorMessage;
  }
  payload.finished_at = new Date().toISOString();

  const { error } = await supabase.from("sync_runs").update(payload).eq("id", runId);
  if (error) {
    throw error;
  }
}

function toOpportunityRow(userId: string, opportunity: Opportunity) {
  return {
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
  };
}

export async function syncConnectedAccount(userId: string | undefined, provider: SourceType) {
  if (!userId) {
    return null;
  }

  const rawApplications = getDemoRawApplications(provider);
  const normalized = rawApplications.map((raw) => normalizeApplication(raw, `${provider}-workspace-${userId.slice(0, 8)}`));

  if (!supabase) {
    const run = {
      id: `sync-${provider}-${Date.now()}`,
      source: provider,
      startedAt: new Date().toISOString(),
      status: "completed" as const,
      importedCount: normalized.length,
      updatedCount: normalized.length,
      mappedFields: ["company", "role", "stage", "source", "notes", "attachments"],
      skippedCount: 0
    };
    await logActivity(
      userId,
      "sync_source",
      { provider, importedCount: normalized.length, mode: defaultSyncMethodForProvider(provider) },
      "sync_run",
      run.id
    );
    return {
      run: {
        ...run,
        status: "completed" as const,
        importedCount: normalized.length,
        updatedCount: normalized.length,
        mappedFields: ["company", "role", "stage", "source", "notes", "attachments"]
      },
      opportunities: normalized,
      events: normalized.map((opportunity) => createSourceEvent(userId, provider, opportunity))
    };
  }

  try {
    const run = await createRun(userId, provider, "normalizing");
    const mappedFields = ["company", "role", "stage", "source", "notes", "attachments"];
    const rows = normalized.map((opportunity) => toOpportunityRow(userId, opportunity));
    const { data: insertedRows, error: opportunityError } = await supabase
      .from("opportunities")
      .upsert(rows, { onConflict: "user_id,fingerprint" })
      .select("*");

    if (opportunityError) {
      throw opportunityError;
    }

    const inserted = insertedRows ?? [];
    const eventRows = inserted.map((row) =>
      createSourceEvent(userId, provider, {
        ...normalized.find((item) => item.fingerprint === row.fingerprint)!,
        id: row.id
      })
    );

    const { error: eventError } = await supabase.from("source_events").insert(
      eventRows.map((event) => ({
        user_id: userId,
        provider: event.provider,
        event_type: event.eventType,
        opportunity_id: event.opportunityId,
        fingerprint: event.fingerprint,
        payload: event.payload
      }))
    );

    if (eventError) {
      throw eventError;
    }

    const { error: accountError } = await supabase
      .from("connected_accounts")
      .update({
        status: "connected",
        imported_count: inserted.length,
        last_synced_at: new Date().toISOString(),
        sync_state: "Healthy",
        notes: descriptionForProvider(provider)
      })
      .eq("user_id", userId)
      .eq("provider", provider);

    if (accountError) {
      throw accountError;
    }

    await finalizeRun(run.id, {
      status: "completed",
      importedCount: inserted.length,
      updatedCount: inserted.length,
      skippedCount: 0,
      mappedFields
    });

    await logActivity(
      userId,
      "sync_source",
      { provider, importedCount: inserted.length, mode: defaultSyncMethodForProvider(provider) },
      "sync_run",
      run.id
    );

    return {
      run: {
        ...run,
        status: "completed" as const,
        importedCount: inserted.length,
        updatedCount: inserted.length,
        mappedFields
      },
      opportunities: inserted,
      events: eventRows
    };
  } catch (error) {
    await logActivity(
      userId,
      "sync_source_demo",
      { provider, importedCount: normalized.length, mode: defaultSyncMethodForProvider(provider) },
      "sync_run",
      provider
    );
    return {
      run: {
        id: `sync-${provider}-${Date.now()}`,
        source: provider,
        startedAt: new Date().toISOString(),
        status: "completed" as const,
        importedCount: normalized.length,
        updatedCount: normalized.length,
        mappedFields: ["company", "role", "stage", "source", "notes", "attachments"],
        skippedCount: 0,
        errorMessage: error instanceof Error ? error.message : undefined
      },
      opportunities: normalized,
      events: normalized.map((opportunity) => createSourceEvent(userId, provider, opportunity))
    };
  }
}
