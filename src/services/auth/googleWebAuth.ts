import { GoogleUser } from "../../types/auth";

type GoogleCredentialResponse = {
  credential?: string;
};

type GoogleAccounts = {
  id: {
    initialize: (config: {
      client_id: string;
      callback: (response: GoogleCredentialResponse) => void;
    }) => void;
    renderButton: (
      element: HTMLElement,
      options: {
        shape: "rectangular";
        size: "large";
        text: "signin_with";
        theme: "outline";
        width: number;
      }
    ) => void;
  };
};

declare global {
  interface Window {
    __GOOGLE_CLIENT_ID__?: string;
    google?: {
      accounts: GoogleAccounts;
    };
  }
}

const scriptId = "google-identity-services";

function decodeJwtPayload(token: string): GoogleUser {
  const payload = token.split(".")[1];
  const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
  const decoded = JSON.parse(window.atob(normalized));

  return {
    email: decoded.email,
    name: decoded.name ?? decoded.email,
    picture: decoded.picture
  };
}

export function getGoogleClientId() {
  const env = process.env as unknown as Record<string, string | undefined>;
  return window.__GOOGLE_CLIENT_ID__ ?? env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ?? "";
}

export function loadGoogleIdentityScript() {
  return new Promise<void>((resolve, reject) => {
    if (window.google?.accounts) {
      resolve();
      return;
    }

    const existingScript = document.getElementById(scriptId);
    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(), { once: true });
      existingScript.addEventListener("error", () => reject(new Error("Could not load Google sign-in.")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.id = scriptId;
    script.async = true;
    script.defer = true;
    script.src = "https://accounts.google.com/gsi/client";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Could not load Google sign-in."));
    document.head.appendChild(script);
  });
}

export async function renderGoogleButton(
  container: HTMLElement,
  clientId: string,
  onAuthenticated: (user: GoogleUser) => void
) {
  await loadGoogleIdentityScript();

  window.google?.accounts.id.initialize({
    client_id: clientId,
    callback: (response) => {
      if (response.credential) {
        onAuthenticated(decodeJwtPayload(response.credential));
      }
    }
  });

  window.google?.accounts.id.renderButton(container, {
    shape: "rectangular",
    size: "large",
    text: "signin_with",
    theme: "outline",
    width: 300
  });
}
