import { GoogleUser } from "../../types/auth";

export function getGoogleClientId() {
  return "";
}

export async function renderGoogleButton(
  _container: HTMLElement,
  _clientId: string,
  _onAuthenticated: (user: GoogleUser) => void
) {
  throw new Error("Google web sign-in is only available in the hosted web demo.");
}
