// frontend/src/lib/api.js
import axios from "axios";

/* ---------------- Base URL ---------------- */
const RAW_BASE =
  import.meta.env.VITE_API_BASE_URL ??
  import.meta.env.VITE_API_BASE ??
  "/api";

export const API_BASE = String(RAW_BASE || "/api").replace(/\/+$/, "");

/* ------------- Token helpers -------------- */
function readToken() {
  return (
    localStorage.getItem("adminToken") ||
    localStorage.getItem("token") ||
    null
  );
}

export function authHeader(token) {
  const t = token || readToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
}

/* ------- Path normalization (key fix) ------ */
function normalizePathForApiBase(path) {
  // absolute URL? leave it alone
  if (/^https?:\/\//i.test(path)) return path;

  let p = path.startsWith("/") ? path : `/${path}`;

  // If base ends with /api and path begins with /api -> strip the leading /api
  if (API_BASE.endsWith("/api") && p === "/api") p = "/";
  else if (API_BASE.endsWith("/api") && p.startsWith("/api/")) p = p.slice(4); // remove leading '/api'

  return p;
}

/* ---------------- Axios client ------------- */
export const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

// Inject token + fix duplicate /api for axios requests
api.interceptors.request.use((config) => {
  const token = readToken();
  if (token && !config.headers?.Authorization) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }

  if (typeof config.url === "string") {
    config.url = normalizePathForApiBase(config.url);
  }
  return config;
});

export default api;

/* -------------- Fetch helpers -------------- */
async function doFetch(path, init = {}) {
  const norm = normalizePathForApiBase(path);
  const url = `${API_BASE}${norm}`;
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

  try {
    return await res.json();
  } catch {
    return await res.text();
  }
}

export function apiGET(path, headers = {}) {
  return doFetch(path, { method: "GET", headers });
}

export function apiJSON(method, path, body, headers = {}) {
  return doFetch(path, {
    method,
    headers: { "Content-Type": "application/json", ...headers },
    body: body != null ? JSON.stringify(body) : undefined,
  });
}

export function apiMultipart(path, formData, headers = {}) {
  return doFetch(path, {
    method: "POST",
    headers, // let browser set multipart boundary
    body: formData,
  });
}

/* --- Back-compat thin wrappers --- */
export function apiGet(path) {
  return apiGET(path);
}

export function apiPost(path, body) {
  return apiJSON("POST", path, body);
}
