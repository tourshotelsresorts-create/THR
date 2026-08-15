export const API = process.env.NEXT_PUBLIC_API_URL ?? "/thr-api";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("thr_admin_token");
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (!headers.has("content-type") && init.body) headers.set("content-type", "application/json");
  const token = getToken();
  if (token) headers.set("authorization", `Bearer ${token}`);
  const res = await fetch(`${API}${path}`, { ...init, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { message?: string }).message ?? `Failed ${res.status}`);
  return data as T;
}
