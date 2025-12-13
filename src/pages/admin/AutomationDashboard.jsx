// frontend/src/pages/admin/AutomationDashboard.jsx
import { useEffect, useState } from "react";
import { styles } from "../../App.jsx";
import { api } from "../../lib/publicApi";
export default function AutomationDashboard() {
  const [logs, setLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [logsError, setLogsError] = useState("");

  const [count, setCount] = useState(5);
  const [status, setStatus] = useState("draft");
  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState("");
  const [lastRun, setLastRun] = useState(null);

  async function loadLogs() {
    setLoadingLogs(true);
    setLogsError("");
    try {
      const res = await api.get("/api/admin/ai/logs?limit=50");
      setLogs(res.data?.logs || []);
    } catch (err) {
      console.error("[AutomationDashboard] loadLogs error", err);
      setLogsError(err?.response?.data?.error || err?.message || "Failed to load logs");
    } finally {
      setLoadingLogs(false);
    }
  }

  async function runBatch() {
    const n = Math.max(1, Math.min(Number(count) || 1, 20));
    setCount(n);
    setRunning(true);
    setRunError("");

    try {
      const res = await api.post("/api/admin/ai/generate-batch", {
        count: n,
        status,
      });

      const data = res.data || {};
      if (!data.ok) {
        throw new Error(data.error || "Generation failed");
      }

      setLastRun({
        created: data.created,
        articles: data.articles || [],
      });

      // Refresh logs after a successful run
      await loadLogs();
    } catch (err) {
      console.error("[AutomationDashboard] runBatch error", err);
      setRunError(err?.response?.data?.error || err?.message || "Generation failed");
    } finally {
      setRunning(false);
    }
  }

  useEffect(() => {
    loadLogs();
  }, []);

  const cardStyle = {
    ...styles.card,
    marginBottom: 20,
  };

  const tableStyle = {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: 14,
  };

  const thtd = {
    borderBottom: "1px solid #e5e7eb",
    padding: "8px 10px",
    textAlign: "left",
    verticalAlign: "top",
  };

  const badge = (ok) => ({
    display: "inline-block",
    padding: "2px 8px",
    borderRadius: 999,
    fontSize: 12,
    background: ok ? "#DCFCE7" : "#FEE2E2",
    color: ok ? "#166534" : "#991B1B",
  });

  return (
    <main style={{ padding: 24, maxWidth: 1100, margin: "0 auto" }}>
      <h1 style={{ marginBottom: 8 }}>AI Automation Dashboard</h1>
      <p style={{ ...styles.muted, marginBottom: 24 }}>
        Monitor AI-generated news batches, trigger new runs, and inspect recent logs. This page is
        separate from normal article management so AI activity doesn&apos;t mix with manual edits.
      </p>

      {/* Controls card */}
      <section style={cardStyle}>
        <h2 style={styles.h3}>Run AI batch</h2>
        <p style={{ ...styles.muted, marginBottom: 12 }}>
          Trigger a one-off AI batch: choose how many articles to generate and whether they start as
          drafts or directly published. Images will be auto-picked via your existing Google Drive → Cloudinary flow.
        </p>

        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div style={{ maxWidth: 160 }}>
            <label style={{ display: "block", fontSize: 13, marginBottom: 4 }}>Count (1–20)</label>
            <input
              type="number"
              min={1}
              max={20}
              value={count}
              onChange={(e) => setCount(e.target.value)}
              style={styles.input}
            />
          </div>

          <div style={{ maxWidth: 200 }}>
            <label style={{ display: "block", fontSize: 13, marginBottom: 4 }}>Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              style={styles.input}
            >
              <option value="draft">Draft (recommended)</option>
              <option value="published">Published</option>
            </select>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              onClick={runBatch}
              disabled={running}
              style={styles.button}
            >
              {running ? "Running…" : "Generate batch"}
            </button>

            <button
              type="button"
              onClick={loadLogs}
              disabled={loadingLogs}
              style={styles.button}
            >
              {loadingLogs ? "Refreshing…" : "Refresh logs"}
            </button>
          </div>
        </div>

        {runError && (
          <p style={{ color: "#b91c1c", marginTop: 8, fontSize: 13 }}>
            Error: {runError}
          </p>
        )}

        {lastRun && (
          <div style={{ marginTop: 12, fontSize: 13 }}>
            <div style={{ marginBottom: 4 }}>
              <span style={badge(true)}>Last run</span>{" "}
              <strong>{lastRun.created}</strong> articles created in this request.
            </div>
            <ul style={{ paddingLeft: 18, margin: 0 }}>
              {lastRun.articles.map((a) => (
                <li key={a.articleId || a.id}>
                  {a.title}{" "}
                  <span style={styles.muted}>
                    ({a.status} · slug: <code>{a.slug}</code>)
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* Logs card */}
      <section style={cardStyle}>
        <h2 style={styles.h3}>Recent AI runs</h2>
        {logsError && (
          <p style={{ color: "#b91c1c", marginBottom: 8, fontSize: 13 }}>
            Error loading logs: {logsError}
          </p>
        )}

        {loadingLogs ? (
          <p style={styles.muted}>Loading logs…</p>
        ) : logs.length === 0 ? (
          <p style={styles.muted}>No AI runs recorded yet.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thtd}>When</th>
                  <th style={thtd}>Model</th>
                  <th style={thtd}>Requested</th>
                  <th style={thtd}>Generated / Saved</th>
                  <th style={thtd}>Status</th>
                  <th style={thtd}>Duration</th>
                  <th style={thtd}>Samples</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log._id}>
                    <td style={thtd}>
                      {log.runAt
                        ? new Date(log.runAt).toLocaleString()
                        : "—"}
                    </td>
                    <td style={thtd}>{log.model || "openai/gpt-4o-mini"}</td>
                    <td style={thtd}>{log.countRequested ?? "—"}</td>
                    <td style={thtd}>
                      {log.countGenerated ?? 0} / {log.countSaved ?? 0}
                    </td>
                    <td style={thtd}>
                      <span style={badge(log.status === "success")}>
                        {log.status || "unknown"}
                      </span>
                    </td>
                    <td style={thtd}>
                      {typeof log.durationMs === "number"
                        ? `${Math.round(log.durationMs / 1000)}s`
                        : "—"}
                    </td>
                    <td style={thtd}>
                      {Array.isArray(log.samples) && log.samples.length > 0 ? (
                        <ul style={{ margin: 0, paddingLeft: 18 }}>
                          {log.samples.slice(0, 3).map((s) => (
                            <li key={s._id || s.articleId}>
                              {s.title}{" "}
                              <span style={styles.muted}>
                                ({s.status} · slug: <code>{s.slug}</code>)
                              </span>
                            </li>
                          ))}
                          {log.samples.length > 3 && (
                            <li style={styles.muted}>
                              +{log.samples.length - 3} more…
                            </li>
                          )}
                        </ul>
                      ) : (
                        <span style={styles.muted}>No samples</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
