// frontend/src/lib/api.js
const API = import.meta.env.VITE_API_BASE || "http://localhost:4000";

export async function apiGET(path, headers = {}) {
  const res = await fetch(`${API}${path}`, { headers, credentials: "include" });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function apiJSON(method, path, body, headers = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
    credentials: "include",
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// For multipart uploads (if you later use /api/media/upload)
export async function apiMultipart(path, formData, headers = {}) {
  const res = await fetch(`${API}${path}`, { method: "POST", body: formData, headers, credentials: "include" });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// Simple token storage (you already have login flow)
export function authHeader(token) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}
