// frontend/src/pages/admin/autmotion/XQueuePage.jsx
import { useEffect, useState } from "react";
import { api } from "../../../App.jsx";

const thtd = { borderBottom: "1px solid #e5e7eb", padding: "10px", textAlign: "left" };
const btn = { padding: "8px 12px", border: "1px solid #e5e7eb", background: "#fff", borderRadius: 8, cursor: "pointer" };
const btnPrimary = { ...btn, background: "#1D9A8E", color: "#fff", borderColor: "#1D9A8E" };

export default function XQueuePage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      setLoading(true);
      setError("");
      const r = await api.get("/api/automation/x/items?limit=100");
      setItems(r.data.rows || []);
    } catch (e) {
      setError(e?.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function doExtract(id) {
    if (busy) return;
    setBusy(true);
    try {
      await api.post(`/api/automation/x/items/${id}/extract`);
      await load();
    } catch (e) {
      alert("Extract failed: " + (e?.response?.data?.error || e.message));
    } finally { setBusy(false); }
  }

  async function doGenerate(id) {
    if (busy) return;
    setBusy(true);
    try {
      await api.post(`/api/automation/x/items/${id}/generate`);
      await load();
    } catch (e) {
      alert("Generate failed: " + (e?.response?.data?.error || e.message));
    } finally { setBusy(false); }
  }

  async function doDraft(id) {
    if (busy) return;
    setBusy(true);
    try {
      await api.post(`/api/automation/x/items/${id}/draft`);
      alert("Draft created in Articles.");
      await load();
    } catch (e) {
      alert("Draft failed: " + (e?.response?.data?.error || e.message));
    } finally { setBusy(false); }
  }

  return (
    <div style={{ padding: 20 }}>
      <h1 style={{ fontSize: 22, marginBottom: 16 }}>Autmotion › X Queue</h1>

      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <button style={btn} onClick={load}>Refresh</button>
      </div>

      {error && <div style={{ color: "#b91c1c", marginBottom: 8 }}>{error}</div>}
      {loading ? <div>Loading...</div> : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={thtd}>Tweet</th>
              <th style={thtd}>Handle</th>
              <th style={thtd}>Time</th>
              <th style={thtd}>Status</th>
              <th style={thtd}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => {
              // de-dupe URLs to avoid repeats; still render stable, unique keys
              const urlList = Array.from(new Set((it?.urls || []).filter(Boolean)));
              return (
                <tr key={it._id}>
                  <td style={thtd}>
                    <div style={{ whiteSpace: "pre-wrap" }}>{it.text}</div>
                    {!!urlList.length && (
                      <div style={{ marginTop: 6, fontSize: 12, opacity: .8 }}>
                        {urlList.map((u, i) => (
                          <div key={`${it._id}-url-${i}`}>
                            <a href={u} target="_blank" rel="noreferrer">{u}</a>
                          </div>
                        ))}
                      </div>
                    )}
                  </td>
                  <td style={thtd}>@{it.handle}</td>
                  <td style={thtd}>{new Date(it.tweetedAt).toLocaleString()}</td>
                  <td style={thtd}>{it.status}</td>
                  <td style={thtd}>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button style={btn} onClick={() => doExtract(it._id)}>Extract</button>
                      <button style={btn} onClick={() => doGenerate(it._id)}>Generate</button>
                      <button style={btnPrimary} onClick={() => doDraft(it._id)}>Draft</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
