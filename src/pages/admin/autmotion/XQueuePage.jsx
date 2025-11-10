import { useEffect, useRef, useState } from "react";
import { api, getToken } from "../../../App";
import { useToast } from "../../../providers/ToastProvider.jsx";

function authHeaders() {
  const t = getToken();
  const base = t ? { Authorization: `Bearer ${t}` } : {};
  return { ...base, ...(window.__API_HEADERS__ || {}) };
}

export default function XQueuePage() {
  const toast = useToast();

  const [sinceHours, setSinceHours] = useState(12);
  const [handle, setHandle] = useState("");
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);

  const mounted = useRef(true);
  useEffect(() => () => { mounted.current = false; }, []);

  async function load() {
    setLoading(true);
    try {
      const params = {
        limit: 100,
        sinceHours,
        ...(handle?.trim() ? { handle: handle.replace(/^@/, "").trim() } : {}),
      };
      const res = await api.get("/automation/x/items", {
        params,
        headers: authHeaders(),
      });
      const data = res?.data;
      if (!mounted.current) return;
      setItems(Array.isArray(data?.items) ? data.items : data || []);
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || "Load failed";
      if (!mounted.current) return;
      setItems([]);
      toast.push({ type: "error", title: "Load failed", message: msg });
    } finally {
      if (mounted.current) setLoading(false);
    }
  }

  async function doStep(id, step) {
    try {
      await api.post(`/automation/x/queue/${id}/${step}`, null, { headers: authHeaders() });
      toast.push({ type: "success", title: `Step ${step}`, message: "Done" });
      load();
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || "Failed";
      toast.push({ type: "error", title: `Step ${step} failed`, message: msg });
    }
  }

  async function fetchLatest() {
    try {
      await api.post("/automation/x/sources/fetch-all", null, { headers: authHeaders() });
      toast.push({ type: "success", title: "Fetch", message: "Requested pull for all sources" });
      load();
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || "Fetch failed";
      toast.push({ type: "error", title: "Fetch failed", message: msg });
    }
  }

  useEffect(() => { load(); /* on mount */ }, []);

  return (
    <div style={{ maxWidth: 980, margin: "0 auto" }}>
      <h1>Twitter / X Queue</h1>

      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
        <label>
          Window:&nbsp;
          <select value={sinceHours} onChange={(e) => setSinceHours(Number(e.target.value))}>
            {[6, 12, 24, 48, 72].map((h) => (
              <option key={h} value={h}>Last {h} hours</option>
            ))}
          </select>
        </label>

        <input
          placeholder="Handle (optional, e.g. @MEAIndia)"
          value={handle}
          onChange={(e) => setHandle(e.target.value)}
          style={{ width: 280, padding: "8px 10px", border: "1px solid #e5e7eb", borderRadius: 8 }}
        />

        <button onClick={load} disabled={loading} style={btn()}>
          {loading ? "Loading…" : "Refresh now"}
        </button>
        <button onClick={fetchLatest} style={btn(true)}>Fetch latest</button>
      </div>

      <pre style={{ background: "#0b1020", color: "#e2e8f0", padding: 8, borderRadius: 8, fontSize: 12 }}>
        {loading ? "Loading…" : JSON.stringify({ count: items.length }, null, 0)}
      </pre>

      <div style={{ marginTop: 12, border: "1px solid #eee", borderRadius: 12, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead style={{ background: "#f9fafb" }}>
            <tr>
              <th style={th}>Tweet</th>
              <th style={th}>Media</th>
              <th style={th}>When</th>
              <th style={th}>Status</th>
              <th style={th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr><td colSpan={5} style={td}>No tweets in this window.</td></tr>
            )}
            {items.map((it) => (
              <tr key={it._id} style={{ borderTop: "1px solid #f0f0f0" }}>
                <td style={td}>{it.text || "—"}</td>
                <td style={td}>{(it.media || []).join(", ") || "—"}</td>
                <td style={td}>{it.createdAt ? new Date(it.createdAt).toLocaleString() : "—"}</td>
                <td style={td}>{it.status || "new"}</td>
                <td style={td}>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => doStep(it._id, "extract")} style={btn()}>extract</button>
                    <button onClick={() => doStep(it._id, "generate")} style={btn()}>generate</button>
                    <button onClick={() => doStep(it._id, "draft")} style={btn(true)}>draft</button>
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
