const API_BASE = (import.meta as any).env?.VITE_API_BASE || "/api";
const TOKEN_KEY = "rp_token";
const ADMIN_CODE_KEY = "rp_admin_code";

export class ApiError extends Error {
  status: number;
  payload: unknown;
  constructor(status: number, message: string, payload: unknown) {
    super(message);
    this.status = status;
    this.payload = payload;
  }
}

export async function api<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem(TOKEN_KEY);
  const adminCode = localStorage.getItem(ADMIN_CODE_KEY);
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(adminCode ? { "x-admin-code": adminCode } : {}),
      ...(init.headers || {}),
    },
    ...init,
  });
  const isJson = res.headers.get("content-type")?.includes("application/json");
  const body = isJson ? await res.json().catch(() => ({})) : await res.text();
  if (!res.ok) {
    const message = (isJson && (body as any)?.error) || res.statusText || "Erreur reseau";
    throw new ApiError(res.status, message, body);
  }
  return body as T;
}
