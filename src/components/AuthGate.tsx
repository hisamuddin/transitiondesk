import { ReactNode, createContext, useContext, useEffect, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { logActivity } from "../services/supabase/activity";
import { adminEmails, isSupabaseConfigured, supabase } from "../services/supabase/client";
import { colors } from "../theme/colors";
import { GoogleUser } from "../types/auth";
import { Session } from "@supabase/supabase-js";

type AuthGateProps = {
  children: ReactNode;
};

const GMAIL_PROVIDER_TOKEN_KEY = "transitiondesk.gmailProviderToken";
const GMAIL_PROVIDER_REFRESH_TOKEN_KEY = "transitiondesk.gmailProviderRefreshToken";
const demoUser: GoogleUser = {
  id: "demo-user",
  email: "demo@transitiondesk.local",
  isAdmin: true,
  name: "Demo User",
  authProvider: "demo"
};

const AuthContext = createContext<GoogleUser | null>(null);

export function useAuthUser() {
  return useContext(AuthContext);
}

export function AuthGate({ children }: AuthGateProps) {
  const [user, setUser] = useState<GoogleUser | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setUser(demoUser);
      setLoading(false);
      return;
    }

    if (Platform.OS !== "web" || !supabase) {
      setLoading(false);
      return;
    }

    async function hydrateSession() {
      if (!supabase) {
        setLoading(false);
        return;
      }

      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");
      const providerToken = hashParams.get("provider_token");
      const providerRefreshToken = hashParams.get("provider_refresh_token");
      const isGmailConnectReturn = new URLSearchParams(window.location.search).get("gmailConnect") === "1";

      if (accessToken && refreshToken) {
        await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken
        });
        window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
      }

      const { data } = await supabase.auth.getSession();
      rememberGmailProviderToken(
        providerToken ?? (isGmailConnectReturn ? data.session?.provider_token ?? null : null),
        providerRefreshToken ?? (isGmailConnectReturn ? data.session?.provider_refresh_token ?? null : null)
      );

      if (data.session?.user) {
        await syncProfile(
          data.session,
          providerToken ?? undefined,
          providerRefreshToken ?? undefined,
          isGmailConnectReturn
        );
      }
      setLoading(false);
    }

    hydrateSession().catch((sessionError) => {
      setError(sessionError instanceof Error ? sessionError.message : "Unable to complete Google sign in.");
      setLoading(false);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        syncProfile(session);
      } else {
        setUser(null);
      }
    });

    return () => data.subscription.unsubscribe();
  }, []);

  async function syncProfile(
    session: Session | null,
    providerTokenOverride?: string,
    providerRefreshTokenOverride?: string,
    isGmailConnectReturn = false
  ) {
    if (!session?.user) {
      return;
    }

    const id = session.user.id;
    const email = session.user.email ?? "";
    const metadata = session.user.user_metadata ?? {};
    const normalizedEmail = email.toLowerCase();
    const nextUser = {
      email,
      id,
      isAdmin: adminEmails.includes(normalizedEmail),
      name: metadata.full_name ?? metadata.name ?? email,
      picture: metadata.avatar_url ?? metadata.picture,
      providerToken:
        providerTokenOverride ??
        (isGmailConnectReturn ? session.provider_token ?? undefined : undefined) ??
        readStoredToken(GMAIL_PROVIDER_TOKEN_KEY),
      providerRefreshToken:
        providerRefreshTokenOverride ??
        (isGmailConnectReturn ? session.provider_refresh_token ?? undefined : undefined) ??
        readStoredToken(GMAIL_PROVIDER_REFRESH_TOKEN_KEY),
      authProvider: session.user.app_metadata?.provider
    } satisfies GoogleUser;

    setUser(nextUser);

    if (supabase) {
      await supabase.from("profiles").upsert({
        id,
        email,
        name: nextUser.name,
        avatar_url: nextUser.picture,
        role: nextUser.isAdmin ? "admin" : "user",
        last_login_at: new Date().toISOString()
      });
      await logActivity(id, "login", { email, provider: "google" }, "profile", id);
    }
  }

function rememberGmailProviderToken(providerToken: string | null, providerRefreshToken: string | null) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    if (providerToken) {
      window.sessionStorage.setItem(GMAIL_PROVIDER_TOKEN_KEY, providerToken);
    }
    if (providerRefreshToken) {
      window.sessionStorage.setItem(GMAIL_PROVIDER_REFRESH_TOKEN_KEY, providerRefreshToken);
    }
  } catch {
    // Session storage can be unavailable in private or restricted browser contexts.
  }
}

function readStoredToken(key: string) {
  if (typeof window === "undefined") {
    return undefined;
  }

  try {
    return window.sessionStorage.getItem(key) ?? undefined;
  } catch {
    return undefined;
  }
}

  async function signInWithGoogle() {
    if (!supabase) {
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
        scopes: ["openid", "email", "profile"].join(" "),
        queryParams: {
          include_granted_scopes: "true"
        }
      }
    });

    if (signInError) {
      setError(signInError.message);
    }
  }

  if (loading) {
    return (
      <View style={styles.page}>
        <Text style={styles.copy}>Loading secure workspace...</Text>
      </View>
    );
  }

  if (user || Platform.OS !== "web") {
    return <AuthContext.Provider value={user}>{children}</AuthContext.Provider>;
  }

  return (
    <View style={styles.page}>
      <View style={styles.panel}>
        <Text style={styles.eyebrow}>Google login required</Text>
        <Text style={styles.title}>Transition Desk</Text>
        <Text style={styles.copy}>
          Sign in with Google to open your private career transition workspace.
        </Text>

        {isSupabaseConfigured ? (
          <Pressable style={styles.googleButton} onPress={signInWithGoogle}>
            <Text style={styles.googleButtonText}>Continue with Google</Text>
          </Pressable>
        ) : (
          <View style={styles.setupBox}>
            <Text style={styles.setupTitle}>Supabase setup needed</Text>
            <Text style={styles.setupText}>
              Set EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY, and EXPO_PUBLIC_ADMIN_EMAILS in hosting.
            </Text>
          </View>
        )}

        {error ? <Text style={styles.error}>{error}</Text> : null}

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    alignItems: "center",
    backgroundColor: colors.background,
    flex: 1,
    justifyContent: "center",
    padding: 20
  },
  panel: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 8,
    borderWidth: 1,
    maxWidth: 430,
    padding: 24,
    width: "100%"
  },
  eyebrow: {
    color: colors.blue,
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  title: {
    color: colors.ink,
    fontSize: 30,
    fontWeight: "900",
    lineHeight: 36,
    marginTop: 8
  },
  copy: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 10
  },
  googleButton: {
    alignItems: "center",
    backgroundColor: colors.blue,
    borderRadius: 8,
    justifyContent: "center",
    marginTop: 24,
    minHeight: 48
  },
  googleButtonText: {
    color: colors.surface,
    fontSize: 15,
    fontWeight: "900"
  },
  setupBox: {
    backgroundColor: colors.amberSoft,
    borderColor: "#efd59a",
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 24,
    padding: 14
  },
  setupTitle: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "900"
  },
  setupText: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6
  },
  error: {
    color: colors.red,
    fontSize: 13,
    fontWeight: "700",
    marginTop: 12
  },
});
