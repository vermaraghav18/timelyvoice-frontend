// frontend/src/lib/api.js
import axios from "axios";

/**
 * Base API URL:
 * - Prefer VITE_API_BASE_URL, then VITE_API_BASE, else default to '/api'
 * - Strip any trailing slash to avoid '//' when concatenating paths
 */
const RAW_BASE =
  import.meta.env.VITE_API_BASE_URL ??
  import.meta.env.VITE_API_BASE ??
  "/api";

export const API_BASE = String(RAW_BASE || "/api").replace(/\/+$/, "");

/**
 * Read auth token (keep both keys to be compatible with existing code)
 */
function readToken() {
  return (
    localStorage.getItem("adminToken") ||
    localStorage.getItem("token") ||
    null
  );
}

/**
 * Axios client (preferred)
 */
export const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

// Attach Authorization header automatically if token is present
api.interceptors.request.use((config) => {
  const token = readToken();
  if (token && !config.headers?.Authorization) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;

/**
 * Small helpers for places that already used fetch.
 * All of these prefix `API_BASE` and include credentials + Authorization.
 */

export function authHeader(token) {
  const t = token || readToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
}

async function doFetch(path, init = {}) {
  const url = `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
  const token = readToken();
  const headers = {
    ...(init.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  const res = await fetch(url, {
    credentials: "include",
    ...init,
    headers,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${init.method || "GET"} ${url} failed: ${res.status} ${text}`);
  }
  // try json; if it fails, return raw text
  try {
    return await res.json();
  } catch {
    return await res.text();
  }
}

export async function apiGET(path, headers = {}) {
  return doFetch(path, { method: "GET", headers });
}

export async function apiJSON(method, path, body, headers = {}) {
  return doFetch(path, {
    method,
    headers: { "Content-Type": "application/json", ...headers },
    body: body != null ? JSON.stringify(body) : undefined,
  });
}

export async function apiMultipart(path, formData, headers = {}) {
  // Let the browser set the multipart boundary; do not set Content-Type
  return doFetch(path, {
    method: "POST",
    headers,
    body: formData,
  });
}

/**
 * Backwards-compat thin wrappers (keep names you already used).
 * NOTE: These now also prefix API_BASE so you can pass relative paths like '/sections'.
 */
export async function apiGet(path) {
  return apiGET(path);
}

export async function apiPost(path, body) {
  return apiJSON("POST", path, body);
}
