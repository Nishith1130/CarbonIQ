import { getToken, removeToken } from "./auth";

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

interface RequestOptions extends RequestInit {
  timeoutMs?: number;
}

export async function apiClient<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { timeoutMs = 15000, ...fetchOptions } = options;

  const url = endpoint.startsWith("http")
    ? endpoint
    : `${API_BASE_URL}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;

  const headers = new Headers(fetchOptions.headers || {});
  if (!headers.has("Content-Type") && !(fetchOptions.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const token = getToken();
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.status === 401) {
      removeToken();
      if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
        window.location.href = "/login?expired=1";
      }
      throw new ApiError(401, "UNAUTHORIZED", "Your session has expired. Please log in again.");
    }

    if (!response.ok) {
      let errorData: any = {};
      try {
        errorData = await response.json();
      } catch {
        // Fallback for non-JSON error responses
        errorData = { message: response.statusText };
      }

      const message =
        errorData.message ||
        errorData.detail ||
        (typeof errorData === "string" ? errorData : `Request failed with status ${response.status}`);

      throw new ApiError(
        response.status,
        errorData.code || `HTTP_${response.status}`,
        message,
        errorData.details
      );
    }

    // Check if response is JSON
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      return (await response.json()) as T;
    }

    // Fallback for blob/text
    return (await response.text()) as unknown as T;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === "AbortError") {
      throw new ApiError(408, "TIMEOUT", "Request timed out. Please try again.");
    }
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, "NETWORK_ERROR", error.message || "Failed to connect to backend server.");
  }
}
