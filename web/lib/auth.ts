import { TokenResponse } from "./types";

export function saveSession(session: TokenResponse) {
  if (typeof window !== "undefined") {
    localStorage.setItem("carboniq_session", JSON.stringify(session));
    localStorage.setItem("carboniq_token", session.access_token);
  }
}

export function getSession(): TokenResponse | null {
  if (typeof window !== "undefined") {
    const str = localStorage.getItem("carboniq_session");
    if (str) return JSON.parse(str);
  }
  return null;
}

export function getToken(): string | null {
  if (typeof window !== "undefined") {
    return localStorage.getItem("carboniq_token");
  }
  return null;
}

export function removeToken() {
  if (typeof window !== "undefined") {
    localStorage.removeItem("carboniq_session");
    localStorage.removeItem("carboniq_token");
  }
}

export function isAuthenticated(): boolean {
  return !!getToken();
}
