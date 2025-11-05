import React, { useEffect, useMemo, useState } from "react";

let API_BASE = "/api";
try { API_BASE = import.meta?.env?.VITE_API_BASE || "/api"; } catch {}



async function apiFetch(path, { method = "GET", body, headers = {} } = {}) {
  const baseHeaders =
    (typeof window !== "undefined" &&
      typeof window.__API_HEADERS__ === "function" &&
      window.__API_HEADERS__()) ||
    {
      "Content-Type": "application/json",
      Authorization:
        localStorage.getItem("token")
          ? `Bearer ${localStorage.getItem("token")}`
          : undefined,
    };

  // normalize URL: add API_BASE unless it's already absolute
  const url =
    /^https?:\/\//i.test(path)
      ? path
      : `${API_BASE}${path.startsWith("/") ? "" : "/"}${path}`;

  const res = await fetch(url, {
    method,
    headers: { ...baseHeaders, ...headers },
    body: body ? JSON.stringify(body) : undefined,
    credentials: "include",
  });

  // friendlier error when server returns HTML (dev server or 404 page)
  const ctype = res.headers.get("content-type") || "";
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `${res.status} ${res.statusText}`);
  }
  if (!/application\/json/i.test(ctype)) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Expected JSON but got "${ctype || "unknown"}". First bytes: ${text.slice(0, 60)}`
    );
  }
  return res.json();
}

function fmtTimeIST(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
  } catch {
    return iso;
  }
}

/* =========================
   TWITTER-DARK THEME STYLES
   ========================= */
const BG = "#000";            // page background (pure black)
const CARD = "#0b0f14";       // table/card background
const BORDER = "#1e293b";     // subtle border (dark slate)
const TEXT = "#ffffff";       // white text
const SUBTLE = "rgba(255,255,255,0.7)";

const btnBase = {
  padding: "10px 14px",
  borderRadius: 999,
  backgroundImage: "linear-gradient(90deg, #1da1f2 0%, #0d8ddc 100%)",
  color: TEXT,
  fontWeight: 900,
  fontSize: 14,
  border: "none",
  cursor: "pointer",
  boxShadow: "0 2px 10px rgba(29,161,242,0.25)",
  transition: "transform .06s ease",
};
const btn = { ...btnBase };
const btnPrimary = { ...btnBase };   // same gradient, primary action
const btnWarn = { ...btnBase };      // per your spec, ALL buttons blue gradient

const th = {
  textAlign: "left",
  fontWeight: 900,
  fontSize: 13,
  padding: "12px 10px",
  borderBottom: `1px solid ${BORDER}`,
  color: TEXT,
  background: "#0a0f14",
};
const td = {
  fontSize: 14,
  padding: "12px 10px",
  borderBottom: `1px solid ${BORDER}`,
  verticalAlign: "top",
  color: TEXT,
  fontWeight: 900,
};
const cap = { fontSize: 12, opacity: 0.85, color: SUBTLE, fontWeight: 900 };

const inputDark = {
  padding: 8,
  borderRadius: 10,
  border: `1px solid ${BORDER}`,
  background: "#0f1419",
  color: TEXT,
  fontWeight: 900,
  outline: "none",
};

export default function XQueuePage() {
  const [items, setItems] = useState([]);
  const [sinceHours, setSinceHours] = useState(12);
  const [handleFilter, setHandleFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      params.set("limit", "100");
      params.set("sinceHours", String(sinceHours || 12));
      if (handleFilter.trim()) params.set("handle", handleFilter.replace(/^@/, ""));
      const data = await apiFetch(`/automation/x/items?${params.toString()}`);
      setItems(Array.isArray(data.rows) ? data.rows : []);
      setLastUpdated(new Date().toISOString());
    } catch (e) {
      setError(e.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  // call backend to fetch from X for all enabled sources
  async function fetchAllSources() {
    try {
      await apiFetch(`/automation/x/sources/fetch-all`, { method: "POST" });
    } catch (e) {
      window.toast?.error?.(e.message) || console.warn(e);
    } finally {
      await load();
    }
  }

  useEffect(() => {
    load();
    const refreshId = setInterval(load, 60000);       // UI refresh every 60s
    const fetchId = setInterval(fetchAllSources, 180000); // fetch every 3 min
    return () => { clearInterval(refreshId); clearInterval(fetchId); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sinceHours, handleFilter]);

  async function doAction(id, kind) {
    try {
      setBusyId(id);
      if (kind === "run") {
        const r = await apiFetch(`/automation/x/items/${id}/run`, { method: "POST" });
        window.toast?.success?.("Draft created") || alert(`Draft created (article ${r?.articleId || "?"})`);
      } else if (kind === "extract") {
        await apiFetch(`/automation/x/items/${id}/extract`, { method: "POST" });
        window.toast?.success?.("Extracted") || alert("Extracted");
      } else if (kind === "generate") {
        await apiFetch(`/automation/x/items/${id}/generate`, { method: "POST" });
        window.toast?.success?.("Generated") || alert("Generated");
      } else if (kind === "draft") {
        const r = await apiFetch(`/automation/x/items/${id}/draft`, { method: "POST" });
        window.toast?.success?.("Draft created") || alert(`Draft created (article ${r?.articleId || "?"})`);
      }
      await load();
    } catch (e) {
      window.toast?.error?.(e.message) || alert(e.message);
    } finally {
      setBusyId(null);
    }
  }

  const rows = useMemo(() => items, [items]);

  return (
    <div
      style={{
        padding: 20,
        background: BG,
        minHeight: "100vh",
        color: TEXT,
        fontWeight: 900,
      }}
    >
      <h2 style={{ margin: 0, marginBottom: 12, color: TEXT, fontWeight: 900 }}>
        Twitter / X Queue
      </h2>

      <div
        style={{
          display: "flex",
          gap: 12,
          alignItems: "center",
          marginBottom: 12,
          flexWrap: "wrap",
          color: TEXT,
          fontWeight: 900,
        }}
      >
        <label style={{ fontSize: 13, color: TEXT, fontWeight: 900 }}>
          Window:&nbsp;
          <select
            value={sinceHours}
            onChange={(e) => setSinceHours(Number(e.target.value))}
            style={{ ...inputDark }}
          >
            <option value={6}>Last 6 hours</option>
            <option value={12}>Last 12 hours</option>
            <option value={24}>Last 24 hours</option>
            <option value={48}>Last 48 hours</option>
          </select>
        </label>

        <label style={{ fontSize: 13, color: TEXT, fontWeight: 900 }}>
          Handle:&nbsp;
          <input
            placeholder="@narendramodi (optional)"
            value={handleFilter}
            onChange={(e) => setHandleFilter(e.target.value)}
            style={{ ...inputDark, minWidth: 240 }}
          />
        </label>

        <button
          style={btn}
          onClick={load}
          disabled={loading}
          onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.98)")}
          onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
        >
          {loading ? "Refreshing…" : "Refresh now"}
        </button>

        {/* Fetch from X now (all enabled sources), then reload list */}
        <button
          style={btn}
          onClick={fetchAllSources}
          disabled={loading}
          onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.98)")}
          onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
        >
          {loading ? "Fetching…" : "Fetch latest"}
        </button>

        <div style={{ marginLeft: "auto", ...cap }}>
          {lastUpdated ? `Last updated: ${fmtTimeIST(lastUpdated)} IST` : ""}
        </div>
      </div>

      {error ? (
        <div
          style={{
            background: "#2a0b0b",
            border: `1px solid ${BORDER}`,
            color: TEXT,
            padding: 12,
            borderRadius: 10,
            marginBottom: 12,
            fontWeight: 900,
          }}
        >
          {error}
        </div>
      ) : null}

      <div
        style={{
          overflowX: "auto",
          background: CARD,
          border: `1px solid ${BORDER}`,
          borderRadius: 12,
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={th}>Tweet</th>
              <th style={th}>Media</th>
              <th style={th}>When</th>
              <th style={th}>Status</th>
              <th style={th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {!loading && rows.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  style={{
                    ...td,
                    textAlign: "center",
                    padding: 30,
                    color: SUBTLE,
                  }}
                >
                  No tweets in this window.
                </td>
              </tr>
            ) : null}

            {rows.map((it) => (
              <tr key={it._id}>
                <td style={td}>
                  <div style={{ marginBottom: 6 }}>
                    <span style={{ fontWeight: 900, color: TEXT }}>
                      @{it.handle}
                    </span>{" "}
                    <span style={cap}>• {it.xId}</span>
                  </div>
                  <div style={{ whiteSpace: "pre-wrap", color: TEXT }}>
                    {it.text}
                  </div>

                  {Array.isArray(it.urls) && it.urls.length > 0 ? (
                    <div
                      style={{
                        marginTop: 6,
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 8,
                      }}
                    >
                      {it.urls.map((u, i) => (
                        <a
                          key={`${u}#${i}`}
                          href={u}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            fontSize: 12,
                            color: TEXT,
                            textDecoration: "underline",
                            fontWeight: 900,
                          }}
                        >
                          {u}
                        </a>
                      ))}
                    </div>
                  ) : null}
                </td>

                <td style={td}>
                  {Array.isArray(it.media) && it.media.length > 0 ? (
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {it.media.slice(0, 3).map((m, idx) =>
                        m?.url ? (
                          <a
                            key={`${m.url || "media"}#${idx}`}
                            href={m.url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <img
                              src={m.url}
                              alt=""
                              style={{
                                width: 96,
                                height: 96,
                                objectFit: "cover",
                                borderRadius: 12,
                                border: `1px solid ${BORDER}`,
                                background: "#0f1419",
                              }}
                            />
                          </a>
                        ) : (
                          <span key={`type#${idx}`} style={cap}>
                            {m.type}
                          </span>
                        )
                      )}
                    </div>
                  ) : (
                    <span style={cap}>—</span>
                  )}
                </td>

                <td style={td}>
                  <div style={{ color: TEXT }}>{fmtTimeIST(it.tweetedAt)}</div>
                  <div style={{ ...cap }}>
                    {new Date(it.tweetedAt).toLocaleTimeString("en-IN", {
                      timeZone: "Asia/Kolkata",
                    })}
                  </div>
                </td>

                <td style={td}>
                  <span
                    style={{
                      ...cap,
                      textTransform: "uppercase",
                      fontWeight: 900,
                    }}
                  >
                    {it.status || "new"}
                  </span>
                </td>

                <td style={td}>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button
                      style={btnPrimary}
                      onClick={() => doAction(it._id, "run")}
                      disabled={busyId === it._id}
                      title="Extract → Generate → Draft"
                      onMouseDown={(e) =>
                        (e.currentTarget.style.transform = "scale(0.98)")
                      }
                      onMouseUp={(e) =>
                        (e.currentTarget.style.transform = "scale(1)")
                      }
                    >
                      {busyId === it._id ? "Running…" : "Run"}
                    </button>

                    <button
                      style={btn}
                      onClick={() => doAction(it._id, "extract")}
                      disabled={busyId === it._id}
                      onMouseDown={(e) =>
                        (e.currentTarget.style.transform = "scale(0.98)")
                      }
                      onMouseUp={(e) =>
                        (e.currentTarget.style.transform = "scale(1)")
                      }
                    >
                      Extract
                    </button>
                    <button
                      style={btn}
                      onClick={() => doAction(it._id, "generate")}
                      disabled={busyId === it._id}
                      onMouseDown={(e) =>
                        (e.currentTarget.style.transform = "scale(0.98)")
                      }
                      onMouseUp={(e) =>
                        (e.currentTarget.style.transform = "scale(1)")
                      }
                    >
                      Generate
                    </button>
                    <button
                      style={btnWarn}
                      onClick={() => doAction(it._id, "draft")}
                      disabled={busyId === it._id}
                      onMouseDown={(e) =>
                        (e.currentTarget.style.transform = "scale(0.98)")
                      }
                      onMouseUp={(e) =>
                        (e.currentTarget.style.transform = "scale(1)")
                      }
                    >
                      Draft
                    </button>
                  </div>
                </td>
              </tr>
            ))}

            {loading ? (
              <tr>
                <td
                  colSpan={5}
                  style={{
                    ...td,
                    textAlign: "center",
                    padding: 20,
                    color: SUBTLE,
                  }}
                >
                  Loading…
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
