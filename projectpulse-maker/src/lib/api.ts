// REST API client for TaskFlow Pro.
// Base URL is configurable via VITE_API_BASE_URL. When unset, the app uses
// the in-memory template data layer so the UI is fully explorable.
import { toast } from "sonner";

export const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, "") || "";
export const USE_MOCK = !API_BASE_URL;

const TOKEN_KEY = "tfp.accessToken";
const REFRESH_KEY = "tfp.refreshToken";
const USER_KEY = "tfp.user";

export const tokenStore = {
  get: () => (typeof window === "undefined" ? null : localStorage.getItem(TOKEN_KEY)),
  getRefresh: () => (typeof window === "undefined" ? null : localStorage.getItem(REFRESH_KEY)),
  set: (access: string, refresh: string) => {
    localStorage.setItem(TOKEN_KEY, access);
    localStorage.setItem(REFRESH_KEY, refresh);
  },
  clear: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
  },
  setUser: (u: unknown) => localStorage.setItem(USER_KEY, JSON.stringify(u)),
  getUser: <T = unknown>(): T | null => {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as T) : null;
  },
};

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public payload?: unknown,
  ) {
    super(message);
  }
}

export interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  auth?: boolean;
  query?: Record<string, string | number | boolean | undefined>;
}

export async function apiRequest<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { body, auth = true, query, headers, ...rest } = opts;
  const url = new URL(`${API_BASE_URL}/api/v1${path.startsWith("/") ? path : `/${path}`}`);
  if (query) {
    Object.entries(query).forEach(([k, v]) => {
      if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
    });
  }

  const finalHeaders: Record<string, string> = {
    Accept: "application/json",
    ...(body && !(body instanceof FormData) ? { "Content-Type": "application/json" } : {}),
    ...((headers as Record<string, string>) || {}),
  };
  if (auth) {
    const token = tokenStore.get();
    if (token) finalHeaders.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(url.toString(), {
    ...rest,
    headers: finalHeaders,
    body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 204 || res.status === 244) return undefined as T;
  const text = await res.text();
  const payload = text ? safeJson(text) : undefined;

  if (!res.ok) {
    const msg = (payload as { message?: string })?.message || res.statusText || "Request failed";
    if (res.status === 401) tokenStore.clear();
    throw new ApiError(res.status, msg, payload);
  }
  return payload as T;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export function showApiError(err: unknown, fallback = "Something went wrong") {
  const msg = err instanceof Error ? err.message : fallback;
  toast.error(msg);
}
