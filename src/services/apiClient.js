import { requestJson } from "./httpClient";

const SESSION_STORAGE_KEY = "foodfinder_session_v1";

function readSession() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.id) return null;
    return parsed;
  } catch {
    return null;
  }
}

function buildHeaders(extraHeaders = {}) {
  const session = readSession();
  const headers = {
    "Content-Type": "application/json",
    ...extraHeaders,
  };
  if (session?.id) {
    headers["x-user-id"] = String(session.id);
  }
  if (session?.role) {
    headers["x-user-role"] = String(session.role);
  }
  return headers;
}

function buildUrl(path, params) {
  const url = new URL(path, window.location.origin);
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    url.searchParams.set(key, String(value));
  });
  return `${url.pathname}${url.search}`;
}

export async function apiRequest(path, options = {}) {
  const method = options.method || "GET";
  const params = options.params || null;
  const body = options.body;
  const url = buildUrl(path, params);

  const response = await requestJson(url, {
    method,
    headers: buildHeaders(options.headers || {}),
    body: body !== undefined ? JSON.stringify(body) : undefined,
    timeoutMs: options.timeoutMs || 10000,
  });

  if (!response.ok) {
    const message = response.data?.message || `Request failed (${response.status})`;
    throw new Error(message);
  }

  if (response.data?.ok === false) {
    throw new Error(response.data.message || "Request rejected");
  }

  return response.data;
}
