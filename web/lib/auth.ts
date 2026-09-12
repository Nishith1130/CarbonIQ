import { TokenResponse, User } from "./types";

const TOKEN_KEY = "carboniq_access_token";
const USER_KEY = "carboniq_user_data";
const SESSION_KEY = "carboniq_session_data";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, token);
}

export function saveSession(session: TokenResponse): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, session.access_token);
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function getSession(): TokenResponse | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as TokenResponse;
  } catch {
    return null;
  }
}

export function removeToken(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(SESSION_KEY);
}

export function getUser(): User | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export function setUser(user: User): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function isAuthenticated(): boolean {
  return !!getToken();
}

