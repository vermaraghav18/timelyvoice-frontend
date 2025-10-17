// frontend/src/pages/admin/autmotion/FeedsPage.jsx
import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { apiGet, apiPost } from "../../../lib/api"; // ⬅️ NEW: helper for controls API

const tableStyle = { width: "100%", borderCollapse: "collapse" };
const thtd = { borderBottom: "1px solid #e5e7eb", padding: "10px", textAlign: "left" };
const btn = { padding: "8px 12px", border: "1px solid #e5e7eb", background: "#fff", borderRadius: 8, cursor: "pointer" };
const btnPrimary = { ...btn, background: "#1D9A8E", color: "#fff", borderColor: "#1D9A8E" };
const input = { border: "1px solid #e5e7eb", borderRadius: 8, padding: "8px 10px", width: "100%" };
const chip = (ok) => ({ display: "inline-block", padding: "2px 8px", borderRadius: 999, background: ok ? "#DCFCE7" : "#FEE2E2", color: ok ? "#065F46" : "#991B1B", fontSize: 12 });

/** ===== AUTMOTION CONTROLS (Start / Stop / Run-now) ===== */
function Controls() {
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);
  const [intervalSec, setIntervalSec] = useState(300);

  const load = async () => {
    try {
      const s = await apiGet("/api/automation/status");
      setStatus(s);
      if (s?.intervalSec) setIntervalSec(s.intervalSec);
    } catch (e) {
      console.error(e);
    }
  };

  const start = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await apiPost("/api/automation/control/start", { intervalSec });
      await load();
    } finally { setBusy(false); }
  };

  const stop = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await apiPost("/api/automation/control/stop");
      await load();
    } finally { setBusy(false); }
  };

  const runNow = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await apiPost("/api/automation/control/run-now");
      await load();
      alert("Run started. Refresh Activity/Queue in a few seconds to see results.");
    } finally { setBusy(false); }
  };

  useEffect(() => { load(); }, []);

  return (
    <div style={{
      display: "flex",
      gap: 12,
      alignItems: "center",
      padding: "8px 0",
      flexWrap: "wrap",
      marginBottom: 8
    }}>
      <span style={{ fontSize: 14, opacity: .75 }}>
        {status?.running ? "Status: Running" : "Status: Stopped"}
        {status?.inFlight ? " • In progress…" : ""}
        {status?.nextRun ? ` • Next: ${new Date(status.nextRun).toLocaleString()}` : ""}
        {status?.lastRun ? ` • Last: ${new Date(status.lastRun).toLocaleString()}` : ""}
      </span>

      <label style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
        Interval (sec):
        <input
          type="number"
          min={30}
          step={30}
          value={intervalSec}
          onChange={e => setIntervalSec(parseInt(e.target.value || "300", 10))}
          style={{ width: 100 }}
        />
      </label>

      {status?.running ? (
        <button disabled={busy} onClick={stop} style={btn}>Stop</button>
      ) : (
        <button disabled={busy} onClick={start} style={btnPrimary}>Start</button>
      )}
      <button disabled={busy} onClick={runNow} style={btn}>Run now</button>
    </div>
  );
}
/** ===== END CONTROLS ===== */

export default function FeedsPage() {
  const [feeds, setFeeds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    name: "",
    url: "",
    defaultCategory: "General",
    defaultAuthor: "Desk",
    geoMode: "Global",
    geoAreas: "country:IN", // comma-separated in UI; backend will convert to array
    enabled: true,
    schedule: "manual",
  });
  const [error, setError] = useState("");

  const api = useMemo(() => axios.create({ baseURL: "" }), []);

  async function loadFeeds() {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/api/automation/feeds");
      setFeeds(res.data || []);
    } catch (e) {
      setError("Failed to load feeds");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadFeeds(); }, []);

  async function createFeed(e) {
    e.preventDefault();
    setError("");
    try {
      const payload = {
        name: form.name.trim(),
        url: form.url.trim(),
        defaultCategory: form.defaultCategory,
        defaultAuthor: form.defaultAuthor || "Desk",
        geo: {
          mode: form.geoMode,
          areas: String(form.geoAreas || "").split(",").map(s => s.trim()).filter(Boolean),
        },
        enabled: !!form.enabled,
        schedule: form.schedule, // "manual" | "30m" | "hourly" | "daily"
      };
      const res = await api.post("/api/automation/feeds", payload);
      setFeeds(prev => [res.data, ...prev]);
      setShowAdd(false);
      setForm({ ...form, name: "", url: "" });
    } catch (e) {
      setError("Failed to create feed");
    }
  }

  async function toggleEnabled(feed) {
    try {
      const res = await api.patch(`/api/automation/feeds/${feed._id}`, { enabled: !feed.enabled });
      setFeeds(prev => prev.map(f => f._id === feed._id ? res.data : f));
    } catch {
      alert("Failed to update");
    }
  }

  async function deleteFeed(feed) {
    if (!confirm(`Delete feed “${feed.name}”?`)) return;
    try {
      await api.delete(`/api/automation/feeds/${feed._id}`);
      setFeeds(prev => prev.filter(f => f._id !== feed._id));
    } catch {
      alert("Failed to delete");
    }
  }

  async function fetchNow(feed) {
    try {
      await api.post(`/api/automation/feeds/${feed._id}/fetch`);
      alert("Fetch started. Check Queue/Activity tab for new items.");
    } catch {
      alert("Failed to start fetch");
    }
  }

  return (
    <div style={{ padding: 20 }}>
      <h1 style={{ fontSize: 22, marginBottom: 8 }}>Autmotion › Feeds</h1>

      {/* ⬇️ NEW: Global Start/Stop/Run-now controls */}
      <Controls />

      <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
        <button style={btnPrimary} onClick={() => setShowAdd(true)}>+ Add Feed</button>
        <button style={btn} onClick={loadFeeds}>Refresh</button>
      </div>

      {error && <div style={{ marginBottom: 12, color: "#b91c1c" }}>{error}</div>}
      {loading ? <div>Loading…</div> : (
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thtd}>Enabled</th>
              <th style={thtd}>Source</th>
              <th style={thtd}>RSS URL</th>
              <th style={thtd}>Default Category</th>
              <th style={thtd}>Geo</th>
              <th style={thtd}>Schedule</th>
              <th style={thtd}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {feeds.map(feed => (
              <tr key={feed._id}>
                <td style={thtd}>
                  <span style={chip(feed.enabled)}>{feed.enabled ? "On" : "Off"}</span>
                </td>
                <td style={thtd}>{feed.name}</td>
                <td style={thtd}><a href={feed.url} target="_blank" rel="noreferrer">{feed.url}</a></td>
                <td style={thtd}>{feed.defaultCategory}</td>
                <td style={thtd}>
                  {feed.geo?.mode} {feed.geo?.areas?.length ? `• ${feed.geo.areas.join(", ")}` : ""}
                </td>
                <td style={thtd}>{feed.schedule || "manual"}</td>
                <td style={{ ...thtd, display: "flex", gap: 8 }}>
                  <button style={btn} onClick={() => toggleEnabled(feed)}>{feed.enabled ? "Disable" : "Enable"}</button>
                  <button style={btn} onClick={() => fetchNow(feed)}>Fetch Now</button>
                  <button style={{ ...btn, borderColor: "#ef4444", color: "#b91c1c" }} onClick={() => deleteFeed(feed)}>Delete</button>
                </td>
              </tr>
            ))}
            {!feeds.length && (
              <tr><td style={thtd} colSpan={7}>No feeds yet. Click “Add Feed”.</td></tr>
            )}
          </tbody>
        </table>
      )}

      {showAdd && (
        <div style={{ marginTop: 20, border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, background: "#fff", maxWidth: 720 }}>
          <h2 style={{ fontSize: 18, marginBottom: 12 }}>Add Feed</h2>
          <form onSubmit={createFeed} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label>Name</label>
              <input style={input} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="NDTV Sports" required />
            </div>
            <div>
              <label>RSS URL</label>
              <input style={input} value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} placeholder="https://www.ndtv.com/rss/sports" required />
            </div>
            <div>
              <label>Default Category</label>
              <input style={input} value={form.defaultCategory} onChange={e => setForm(f => ({ ...f, defaultCategory: e.target.value }))} placeholder="Sports" />
            </div>
            <div>
              <label>Default Author</label>
              <input style={input} value={form.defaultAuthor} onChange={e => setForm(f => ({ ...f, defaultAuthor: e.target.value }))} placeholder="Desk" />
            </div>
            <div>
              <label>Geo Mode</label>
              <select style={input} value={form.geoMode} onChange={e => setForm(f => ({ ...f, geoMode: e.target.value }))}>
                <option value="Global">Global</option>
                <option value="Regional">Regional</option>
              </select>
            </div>
            <div>
              <label>Geo Areas (comma-separated)</label>
              <input style={input} value={form.geoAreas} onChange={e => setForm(f => ({ ...f, geoAreas: e.target.value }))} placeholder='country:IN, state:KA' />
            </div>
            <div>
              <label>Schedule</label>
              <select style={input} value={form.schedule} onChange={e => setForm(f => ({ ...f, schedule: e.target.value }))}>
                <option value="manual">Manual</option>
                <option value="30m">Every 30 minutes</option>
                <option value="hourly">Hourly</option>
                <option value="daily">Daily</option>
              </select>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input id="enabled" type="checkbox" checked={form.enabled} onChange={e => setForm(f => ({ ...f, enabled: e.target.checked }))} />
              <label htmlFor="enabled">Enabled</label>
            </div>

            <div style={{ gridColumn: "1 / -1", display: "flex", gap: 8, marginTop: 8 }}>
              <button type="submit" style={btnPrimary}>Save Feed</button>
              <button type="button" style={btn} onClick={() => setShowAdd(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
