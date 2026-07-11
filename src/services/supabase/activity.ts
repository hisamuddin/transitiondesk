import { supabase } from "./client";

export async function logActivity(
  userId: string | undefined,
  eventType: string,
  metadata: Record<string, unknown> = {},
  entityType?: string,
  entityId?: string
) {
  if (!supabase || !userId) {
    return;
  }

  await supabase.from("activity_events").insert({
    user_id: userId,
    event_type: eventType,
    entity_type: entityType,
    entity_id: entityId,
    metadata
  });
}
