import { createClient } from "@supabase/supabase-js";

const env = process.env as unknown as Record<string, string | undefined>;

declare global {
  interface Window {
    __APP_CONFIG__?: {
      adminEmails?: string;
      googleClientId?: string;
      supabaseAnonKey?: string;
      supabaseUrl?: string;
    };
  }
}

const runtimeConfig = typeof window === "undefined" ? undefined : window.__APP_CONFIG__;

export const supabaseUrl = runtimeConfig?.supabaseUrl ?? env.EXPO_PUBLIC_SUPABASE_URL ?? "";
export const supabaseAnonKey = runtimeConfig?.supabaseAnonKey ?? env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";
export const adminEmails = (runtimeConfig?.adminEmails ?? env.EXPO_PUBLIC_ADMIN_EMAILS ?? "")
  .split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: true,
        persistSession: true
      }
    })
  : null;
