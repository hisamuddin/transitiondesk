import { supabase } from "./client";

export type AdminAnalytics = {
  active_users_7d: number;
  total_activity_events: number;
  total_connected_accounts: number;
  total_interviews: number;
  total_opportunities: number;
  total_sync_runs: number;
  total_users: number;
};

export async function loadAdminAnalytics(): Promise<AdminAnalytics | null> {
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase.from("admin_analytics").select("*").single();

  if (error) {
    throw error;
  }

  return data;
}

export async function loadRecentActivity() {
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("activity_events")
    .select("id,event_type,entity_type,metadata,created_at,profiles(email,name)")
    .order("created_at", { ascending: false })
    .limit(25);

  if (error) {
    throw error;
  }

  return data ?? [];
}
