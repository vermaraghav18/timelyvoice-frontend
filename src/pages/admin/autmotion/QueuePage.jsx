// frontend/src/pages/admin/autmotion/QueuePage.jsx
import { useEffect, useMemo, useState } from "react";
import axios from "axios";

const thtd = { borderBottom: "1px solid #e5e7eb", padding: "10px", textAlign: "left" };
const btn = { padding: "8px 12px", border: "1px solid #e5e7eb", background: "#fff", borderRadius: 8, cursor: "pointer" };
const btnPrimary = { ...btn, background: "#1D9A8E", color: "#fff", borderColor: "#1D9A8E" };

export default function QueuePage() {
  const api = useMemo(() => axios.create({ baseURL: "" }), []);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [active, setActive] = useState(null); // item opened in drawer
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/api/automation/items?limit=50");
      setItems(res.data || []);
    } catch (e) {
      setError("Failed to load items");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function open(it) { setActive(it); }
  function updateLocal(updated) {
    setItems(prev => prev.map(x => x._id === updated._id ? updated : x));
    if (active && active._id === updated._id) setActive(updated);
  }

  async function doExtract(id) {
    setBusy(true);
    try {
      const { data } = await api.post(`/api/automation/items/${id}/extract`);
      updateLocal(data);
    } catch (e) {
      alert("Extract failed");
    } finally {
      setBusy(false);
    }
  }
  async function doGenerate(id) {
    setBusy(true);
    try {
      const { data } = await api.post(`/api/automation/items/${id}/generate`);
      updateLocal(data);
    } catch (e) {
      const msg = e?.response?.data?.error || e.message;
      alert("Generate failed: " + msg);
    } finally {
      setBusy(false);
    }
  }
  async function doMarkReady(id) {
    setBusy(true);
    try {
      const { data } = await api.post(`/api/automation/items/${id}/mark-ready`);
      updateLocal(data);
    } catch (e) {
      alert("Mark ready failed");
    } finally {
      setBusy(false);
    }
  }
  async function doDraft(id) {
    setBusy(true);
    try {
      const { data } = await api.post(`/api/automation/items/${id}/draft`);
      alert("Draft created. Open it in Articles.");
      // Optionally refresh list so status becomes 'drafted'
      await load();
      // close drawer
      setActive(null);
    } catch (e) {
      const msg = e?.response?.data?.error || e.message;
      alert("Create Draft failed: " + msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ padding: 20 }}>
      <h1 style={{ fontSize: 22, marginBottom: 16 }}>Autmotion › Queue</h1>

      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <button style={btn} onClick={load}>Refresh</button>
      </div>

      {error && <div style={{ color: "#b91c1c", marginBottom: 8 }}>{error}</div>}
      {loading ? "Loading…" : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={thtd}>Status</th>
              <th style={thtd}>Title</th>
              <th style={thtd}>Source</th>
              <th style={thtd}>Published</th>
              <th style={thtd}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={it._id}>
                <td style={thtd}>{it.status}</td>
                <td style={thtd}>
                  <a href={it.link} target="_blank" rel="noreferrer">{it.rawTitle || it.generated?.title || "(no title)"}</a>
                </td>
                <td style={thtd}>{it.extract?.site || it.sourceName || "-"}</td>
                <td style={thtd}>{it.publishedAt ? new Date(it.publishedAt).toLocaleString() : "-"}</td>
                <td style={{ ...thtd, display: "flex", gap: 8 }}>
                  <button style={btn} onClick={() => open(it)}>Preview</button>
                  <button style={btn} disabled={busy} onClick={() => doExtract(it._id)}>Extract</button>
                  <button style={btn} disabled={busy} onClick={() => doGenerate(it._id)}>Generate</button>
                  <button style={btn} disabled={busy} onClick={() => doMarkReady(it._id)}>Mark Ready</button>
                  <button style={btnPrimary} disabled={busy || !it.generated} onClick={() => doDraft(it._id)}>Create Draft</button>
                </td>
              </tr>
            ))}
            {!items.length && <tr><td style={thtd} colSpan={5}>No items yet.</td></tr>}
          </tbody>
        </table>
      )}

      {/* Right-side drawer */}
      {active && (
        <div style={{
          position: "fixed", right: 0, top: 0, bottom: 0, width: "min(700px, 90vw)",
          background: "#fff", borderLeft: "1px solid #e5e7eb", boxShadow: "-6px 0 24px rgba(0,0,0,.06)", padding: 16, overflowY: "auto", zIndex: 50
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <h2 style={{ fontSize: 18, margin: 0 }}>Preview</h2>
            <button style={btn} onClick={() => setActive(null)}>Close</button>
          </div>

          <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 12 }}>
            Source: <a href={active.link} target="_blank" rel="noreferrer">{active.sourceName || "Link"}</a> • Status: {active.status}
          </div>

          <section style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: 16, marginBottom: 8 }}>Extracted Text</h3>
            <pre style={{ whiteSpace: "pre-wrap", background: "#f9fafb", border: "1px solid #e5e7eb", padding: 12, borderRadius: 8, maxHeight: 240, overflow: "auto" }}>
              {active.extract?.text || "(no extract yet — click Extract)"}
            </pre>
          </section>

          <section style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: 16, marginBottom: 8 }}>Generated JSON</h3>
            <pre style={{ whiteSpace: "pre-wrap", background: "#f9fafb", border: "1px solid #e5e7eb", padding: 12, borderRadius: 8, maxHeight: 320, overflow: "auto" }}>
              {active.generated ? JSON.stringify(active.generated, null, 2) : "(no JSON yet — click Generate)"}
            </pre>

            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button style={btn} disabled={busy} onClick={() => doExtract(active._id)}>Extract</button>
              <button style={btn} disabled={busy} onClick={() => doGenerate(active._id)}>Generate</button>
              <button style={btn} disabled={busy} onClick={() => doMarkReady(active._id)}>Mark Ready</button>
              <button style={btnPrimary} disabled={busy || !active.generated} onClick={() => doDraft(active._id)}>Create Draft</button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
