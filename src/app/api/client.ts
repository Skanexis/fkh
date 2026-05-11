const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000";

export interface ApiEnvelope<T> {
  data: T;
  meta?: unknown;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

type TokenGetter = () => string | null;
type RefreshHandler = () => Promise<boolean>;

let getAccessToken: TokenGetter = () => localStorage.getItem("fkh_access_token");
let refreshHandler: RefreshHandler | null = null;

export function configureApiAuth(getter: TokenGetter, refresh?: RefreshHandler) {
  getAccessToken = getter;
  refreshHandler = refresh ?? null;
}

export async function apiRequest<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
  const headers = new Headers(init.headers);
  const token = getAccessToken();

  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (!(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
  });

  if (response.status === 401 && retry && refreshHandler && (await refreshHandler())) {
    return apiRequest<T>(path, init, false);
  }

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiError(
      response.status,
      payload?.error?.code ?? "API_ERROR",
      payload?.error?.message ?? "Request failed",
    );
  }

  return payload?.data as T;
}

export { API_BASE_URL };
