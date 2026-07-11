import { ReactNode, useEffect, useRef, useState } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";

import { getGoogleClientId, renderGoogleButton } from "../services/auth/googleWebAuth";
import { colors } from "../theme/colors";
import { GoogleUser } from "../types/auth";

type AuthGateProps = {
  children: ReactNode;
};

export function AuthGate({ children }: AuthGateProps) {
  const [user, setUser] = useState<GoogleUser | null>(null);
  const [error, setError] = useState("");
  const buttonContainer = useRef<any>(null);
  const clientId = getGoogleClientId();

  useEffect(() => {
    if (Platform.OS !== "web" || !buttonContainer.current || !clientId || user) {
      return;
    }

    renderGoogleButton(buttonContainer.current as HTMLElement, clientId, setUser).catch((caughtError) => {
      setError(caughtError instanceof Error ? caughtError.message : "Google sign-in failed.");
    });
  }, [clientId, user]);

  if (user || Platform.OS !== "web") {
    return <>{children}</>;
  }

  return (
    <View style={styles.page}>
      <View style={styles.panel}>
        <Text style={styles.eyebrow}>Google OAuth required</Text>
        <Text style={styles.title}>Career Transition OS</Text>
        <Text style={styles.copy}>
          Sign in with Google to open your private job transition workspace.
        </Text>

        {clientId ? (
          <View ref={buttonContainer} style={styles.googleButton} />
        ) : (
          <View style={styles.setupBox}>
            <Text style={styles.setupTitle}>Google Client ID needed</Text>
            <Text style={styles.setupText}>
              Set EXPO_PUBLIC_GOOGLE_CLIENT_ID in the hosted environment with a Google OAuth Web Client ID.
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
    marginTop: 24
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
