// src/pages/admin/automation/XSourcesPage.jsx
import { useEffect, useRef, useState } from "react";
import { useToast } from "../../../providers/ToastProvider.jsx";
import { getToken } from "../../../App";

const API_ORIGIN =
  (typeof window !== "undefined" && window.__API_ORIGIN__) ||
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_ORIGIN) ||
  "http://localhost:4000";

function authHeaders() {
  const t = getToken();
  const base = t ? { Authorization: `Bearer ${t}` } : {};
  return { ...base, ...(window.__API_HEADERS__ || {}) };
}

async function apiFetch(path, opts = {}) {
  const url = path.startsWith("http") ? path : `${API_ORIGIN}${path}`;
  const res = await fetch(url, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
      ...(opts.headers || {}),
    },
    credentials: "include",
  });
  if (res.status === 404) return { notFound: true };
  if (res.status === 401) {
    const txt = await res.text().catch(() => "");
    throw new Error(txt || "Unauthorized (need admin token)");
  }
  if (!res.ok) {
    const msg = await res.text().catch(() => "");
    throw new Error(msg || `HTTP ${res.status}`);
  }
  const ct = res.headers.get("content-type") || "";
  return ct.includes("application/json") ? res.json() : res.text();
}

export default function XSourcesPage() {
  const toast = useToast();
  const [sources, setSources] = useState([]);
  const [handle, setHandle] = useState("");
  const [label, setLabel] = useState("");
  const [loading, setLoading] = useState(false);

  const mounted = useRef(true);
  useEffect(() => () => { mounted.current = false; }, []);

  async function load() {
    setLoading(true);
    try {
      const data = await apiFetch(`/api/automation/x/sources`);
      if (!mounted.current) return;
      if (data?.notFound) {
        setSources([]);
        return;
      }
      setSources(Array.isArray(data?.items) ? data.items : data || []);
    } catch (e) {
      toast.push({ type: "error", title: "Load failed", message: String(e.message || e) });
      if (mounted.current) setSources([]);
    } finally {
      if (mounted.current) setLoading(false);
    }
  }

  async function addSource() {
    const body = {
      handle: handle.replace(/^@/, "").trim(),
      label: label.trim() || undefined,
      enabled: true,
    };
    if (!body.handle) {
      toast.push({ type: "warning", title: "Handle required" });
      return;
    }
    try {
      await apiFetch(`/api/automation/x/sources`, { method: "POST", body: JSON.stringify(body) });
      setHandle("");
      setLabel("");
      load();
      toast.push({ type: "success", title: "Source added" });
    } catch (e) {
      toast.push({ type: "error", title: "Add failed", message: String(e.message || e) });
    }
  }

  async function toggleEnabled(id, enabled) {
    try {
      await apiFetch(`/api/automation/x/sources/${id}`, { method: "PATCH", body: JSON.stringify({ enabled }) });
      load();
    } catch (e) {
      toast.push({ type: "error", title: "Update failed", message: String(e.message || e) });
    }
  }

  async function remove(id) {
    try {
      await apiFetch(`/api/automation/x/sources/${id}`, { method: "DELETE" });
      load();
    } catch (e) {
      toast.push({ type: "error", title: "Delete failed", message: String(e.message || e) });
    }
  }

  useEffect(() => { load(); }, []);

  return (
    <div style={{ maxWidth: 980, margin: "0 auto" }}>
      <h1>Automotion › X Sources</h1>

      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <input
          placeholder="@handle"
          value={handle}
          onChange={(e) => setHandle(e.target.value)}
          style={inp}
        />
        <input
          placeholder="Label (optional)"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          style={inp}
        />
        <button onClick={addSource} style={btn(true)}>Add</button>
        <button onClick={load} disabled={loading} style={btn()}>{loading ? "Loading…" : "Refresh"}</button>
      </div>

      <div style={{ border: "1px solid #eee", borderRadius: 12, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead style={{ background: "#f9fafb" }}>
            <tr>
              <th style={th}>Handle</th>
              <th style={th}>Label</th>
              <th style={th}>Enabled</th>
              <th style={th}>Defaults</th>
              <th style={th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sources.length === 0 && (
              <tr><td colSpan={5} style={td}>No sources yet.</td></tr>
            )}
            {sources.map((s) => (
              <tr key={s._id} style={{ borderTop: "1px solid #f0f0f0" }}>
                <td style={td}>@{s.handle}</td>
                <td style={td}>{s.label || "—"}</td>
                <td style={td}>
                  <label style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                    <input
                      type="checkbox"
                      checked={!!s.enabled}
                      onChange={(e) => toggleEnabled(s._id, e.target.checked)}
                    />
                    <span>{s.enabled ? "Enabled" : "Disabled"}</span>
                  </label>
                </td>
                <td style={td}>
                  author: {s.defaultAuthor || "—"}<br />
                  category: {s.defaultCategory || "—"}
                </td>
                <td style={td}>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => remove(s._id)} style={btn()}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const inp = { padding: "8px 10px", border: "1px solid #e5e7eb", borderRadius: 8, width: 260 };
const th = { textAlign: "left", padding: 10, fontWeight: 600, fontSize: 13, borderBottom: "1px solid #eee" };
const td = { padding: 10, verticalAlign: "top" };
const btn = (primary = false) => ({
  padding: "8px 12px",
  borderRadius: 10,
  border: "1px solid #e5e7eb",
  background: primary ? "#1D9A8E" : "#fff",
  color: primary ? "#fff" : "#111",
  cursor: "pointer",
  fontSize: 13,
});
