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
  if (init.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
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

export function apiUploadFile<T>(
  path: string,
  file: File,
  onProgress?: (progress: number) => void,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const body = new FormData();
    const token = getAccessToken();

    body.append("file", file);
    xhr.open("POST", `${API_BASE_URL}${path}`);
    if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable || !onProgress) return;
      onProgress(Math.round((event.loaded / event.total) * 100));
    };

    xhr.onload = () => {
      const payload = parseJson(xhr.responseText);
      if (xhr.status < 200 || xhr.status >= 300) {
        reject(new ApiError(
          xhr.status,
          payload?.error?.code ?? "API_ERROR",
          payload?.error?.message ?? "Upload failed",
        ));
        return;
      }
      resolve(payload?.data as T);
    };

    xhr.onerror = () => reject(new ApiError(0, "NETWORK_ERROR", "Upload failed"));
    xhr.send(body);
  });
}

function parseJson(value: string) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export { API_BASE_URL };
