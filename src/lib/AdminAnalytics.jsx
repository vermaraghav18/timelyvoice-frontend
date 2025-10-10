// frontend/src/lib/AdminAnalytics.jsx
// Admin analytics with auto-rollup for "today", auto-refresh, CSV export,
// path search+sort, trend sparkline, Top UTMs and Top Countries tables.

import React, { useEffect, useMemo, useRef, useState } from "react";

const API_BASE =
  (typeof window !== "undefined" && window.API_BASE) ||
  (import.meta.env && import.meta.env.VITE_API_BASE) ||
  `${location.protocol}//${location.hostname}:4000`;

async function getJSON(path) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "GET",
    cache: "no-store",
    credentials: "include",
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`GET ${path} failed: ${res.status} ${t}`);
  }
  return res.json();
}

const fmt = (n) => (n == null ? "—" : Number(n).toLocaleString());
const fmtIso = (d) => new Date(d).toISOString().replace(/\.\d+Z$/, "Z");
const todayUtc = () => new Date().toISOString().slice(0, 10);

function Card({ children, style }) {
  return (
    <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 12, ...style }}>
      {children}
    </div>
  );
}

function Sparkline({ points }) {
  if (!points || !points.length) return null;
  const w = 120, h = 28, p = 2;
  const xs = points.map((_, i) => i);
  const ys = points.map((pt) => Number(pt.value || 0));
  const min = Math.min(...ys);
  const max = Math.max(...ys);
  const scaleX = (i) => p + (i * (w - 2 * p)) / Math.max(1, xs.length - 1);
  const scaleY = (v) => (max === min ? h / 2 : h - p - ((v - min) * (h - 2 * p)) / (max - min));
  const d = xs.map((i, idx) => `${idx === 0 ? "M" : "L"}${scaleX(i)},${scaleY(ys[idx])}`).join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: "block" }}>
      <path d={d} fill="none" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}

function PathsTable({ items = [] }) {
  return (
    <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, overflow: "hidden", marginTop: 12 }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead style={{ background: "#f3f4f6", textAlign: "left" }}>
          <tr>
            {["Path","Page Views","Scroll","Heartbeat","Read Complete","Uniques","Read Seconds"].map((h) => (
              <th key={h} style={{ padding: 8, fontWeight: 600, fontSize: 13 }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.length ? (
            items.map((p) => (
              <tr key={p.path}>
                <td style={{ padding: 8, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 13 }}>{p.path}</td>
                <td style={{ padding: 8 }}>{fmt(p.page_view)}</td>
                <td style={{ padding: 8 }}>{fmt(p.scroll)}</td>
                <td style={{ padding: 8 }}>{fmt(p.heartbeat)}</td>
                <td style={{ padding: 8 }}>{fmt(p.read_complete)}</td>
                <td style={{ padding: 8 }}>{fmt(p.uniques)}</td>
                <td style={{ padding: 8 }}>{fmt(p.readSeconds)}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={7} style={{ padding: 12, color: "#666" }}>No paths for this day.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default function AdminAnalytics() {
  const [health, setHealth] = useState(null);
  const [items, setItems] = useState([]);      // daily docs (last 7)
  const [trend, setTrend] = useState([]);      // 14-day page_view
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // search/sort for today's byPath
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState("page_view");
  const [sortDir, setSortDir] = useState("desc");

  const lastEnsureRef = useRef(0);

  async function loadHealthAndList() {
    const [h, list, t] = await Promise.all([
      getJSON("/analytics/health"),
      getJSON("/analytics/daily?limit=7"),
      getJSON("/analytics/trend?metric=page_view&days=14"),
    ]);
    setHealth(h);
    setItems(list.items || []);
    setTrend(t.items || []);
  }

  async function loadDaily(date) {
    const one = await getJSON(`/analytics/daily/${encodeURIComponent(date)}`);
    return one.daily || {};
  }

  async function forceRollup(date) {
    await getJSON(`/analytics/rollup/daily?date=${encodeURIComponent(date)}`);
  }

  async function ensureFreshToday() {
    const now = Date.now();
    if (now - lastEnsureRef.current < 30000) return;
    lastEnsureRef.current = now;

    const d = todayUtc();
    await forceRollup(d);
    await loadHealthAndList();
    try {
      const doc = await loadDaily(d);
      setItems((prev) => {
        const rest = (prev || []).filter((x) => x.date !== d);
        return [{ ...doc }, ...rest];
      });
    } catch {}
  }

  useEffect(() => {
    (async () => {
      try {
        setError("");
        await loadHealthAndList();
        await ensureFreshToday();
      } catch (e) {
        setError(String(e.message || e));
      }
    })();
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      ensureFreshToday();
    }, 60000);
    return () => clearInterval(id);
  }, []);

  const todayDoc = useMemo(
    () => items.find((d) => d.date === todayUtc()) || items[0] || null,
    [items]
  );

  const filteredPaths = useMemo(() => {
    if (!todayDoc) return [];
    let arr = Array.isArray(todayDoc.byPath) ? [...todayDoc.byPath] : [];
    if (search.trim()) {
      const s = search.toLowerCase();
      arr = arr.filter((p) => (p.path || "").toLowerCase().includes(s));
    }
    const dir = sortDir === "asc" ? 1 : -1;
    const key = sortKey;
    const aNum = (x) => Number(x?.[key] || 0);
    arr.sort((a, b) => (aNum(a) - aNum(b)) * dir);
    return arr;
  }, [todayDoc, search, sortKey, sortDir]);

  return (
    <div style={{ maxWidth: 1100, margin: "24px auto", padding: "0 12px", fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif" }}>
      <h1 style={{ margin: "0 0 16px" }}>Analytics (Last 7 Days)</h1>

      <Card>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
          <Card>
            <div style={{ fontSize: 12, color: "#666", textTransform: "uppercase" }}>Last Hour</div>
            <div style={{ fontSize: 18, fontWeight: 600 }}>{fmt(health?.lastHour)}</div>
          </Card>
          <Card>
            <div style={{ fontSize: 12, color: "#666", textTransform: "uppercase" }}>Today (Page Views) — Trend</div>
            <div style={{ marginTop: 4, color: "#4b5563" }}>
              <Sparkline points={trend} />
            </div>
          </Card>
          <Card>
            <div style={{ fontSize: 12, color: "#666", textTransform: "uppercase" }}>Total (approx)</div>
            <div style={{ fontSize: 18, fontWeight: 600 }}>{fmt(health?.totalApprox)}</div>
          </Card>
          <Card>
            <div style={{ fontSize: 12, color: "#666", textTransform: "uppercase" }}>Today’s Doc</div>
            <div style={{ fontSize: 14 }}>
              {todayDoc ? (
                <>
                  <div><b>Date:</b> {todayDoc.date}</div>
                  <div style={{ fontSize: 12, color: "#666" }}>
                    generatedAt: {todayDoc.generatedAt ? fmtIso(todayDoc.generatedAt) : "—"}
                  </div>
                </>
              ) : "—"}
            </div>
          </Card>
        </div>

        <div style={{ marginTop: 12, display: "flex", gap: 8, alignItems: "center" }}>
          <button
            onClick={async () => {
              try {
                setBusy(true);
                setError("");
                await ensureFreshToday();
              } catch (e) {
                setError(String(e.message || e)); 
              } finally {
                setBusy(false);
              }
            }}
            disabled={busy}
            style={{ padding: "8px 12px", border: "1px solid #e5e7eb", borderRadius: 8, background: busy ? "#f3f4f6" : "#fff" }}
          >
            {busy ? "Refreshing…" : "Refresh Today (Recompute)"}
          </button>

          <button
            onClick={async () => {
              try {
                setError("");
                await loadHealthAndList();
              } catch (e) {
                setError(String(e.message || e));
              }
            }}
            style={{ padding: "8px 12px", border: "1px solid #e5e7eb", borderRadius: 8, background: "#fff" }}
          >
            Reload
          </button>

          <a href={`${API_BASE}/analytics/daily/${todayUtc()}.csv`} style={{ marginLeft: "auto", textDecoration: "underline" }}>
            Export CSV (today)
          </a>
        </div>

        {error && <div style={{ marginTop: 8, color: "#b91c1c", fontSize: 13 }}>{error}</div>}
      </Card>

      {/* Today — Totals */}
      {todayDoc && (
        <Card style={{ marginTop: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Today — Totals</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 8 }}>
            {[
              ["Events", todayDoc.totals?.events],
              ["Page Views", todayDoc.totals?.page_view],
              ["Scroll", todayDoc.totals?.scroll],
              ["Heartbeat", todayDoc.totals?.heartbeat],
              ["Read Complete", todayDoc.totals?.read_complete],
              ["Uniques", todayDoc.totals?.uniqueVisitors ?? todayDoc.totals?.uniques ?? todayDoc.totals?.unique],
            ].map(([label, value]) => (
              <Card key={label}>
                <div style={{ fontSize: 12, color: "#666", textTransform: "uppercase" }}>{label}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ fontSize: 18, fontWeight: 600 }}>{fmt(value)}</div>
                  {label === "Page Views" && <div style={{ color: "#4b5563" }}><Sparkline points={trend} /></div>}
                </div>
              </Card>
            ))}
          </div>
        </Card>
      )}

      {/* Top UTMs */}
      {todayDoc?.topUTMs?.length > 0 && (
        <Card style={{ marginTop: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Top UTMs (Today)</div>
          <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead style={{ background: "#f3f4f6", textAlign: "left" }}>
                <tr>
                  {["Source", "Medium", "Campaign", "Page Views", "Read Complete", "Uniques"].map((h) => (
                    <th key={h} style={{ padding: 8, fontWeight: 600, fontSize: 13 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {todayDoc.topUTMs.map((r, i) => (
                  <tr key={i}>
                    <td style={{ padding: 8 }}>{r.source || "—"}</td>
                    <td style={{ padding: 8 }}>{r.medium || "—"}</td>
                    <td style={{ padding: 8 }}>{r.campaign || "—"}</td>
                    <td style={{ padding: 8 }}>{fmt(r.page_view)}</td>
                    <td style={{ padding: 8 }}>{fmt(r.read_complete)}</td>
                    <td style={{ padding: 8 }}>{fmt(r.uniques)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* NEW: Top Countries */}
      {todayDoc?.topCountries?.length > 0 && (
        <Card style={{ marginTop: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Top Countries (Today)</div>
          <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead style={{ background: "#f3f4f6", textAlign: "left" }}>
                <tr>
                  {["Country", "Page Views", "Uniques"].map((h) => (
                    <th key={h} style={{ padding: 8, fontWeight: 600, fontSize: 13 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {todayDoc.topCountries.map((r, i) => (
                  <tr key={i}>
                    <td style={{ padding: 8 }}>{r.country || "—"}</td>
                    <td style={{ padding: 8 }}>{fmt(r.page_view)}</td>
                    <td style={{ padding: 8 }}>{fmt(r.uniques)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Controls for today's per-path table */}
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 16 }}>
        <input
          placeholder="Search path…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ padding: "8px", border: "1px solid #e5e7eb", borderRadius: 6, minWidth: 220 }}
        />
        <select value={sortKey} onChange={(e) => setSortKey(e.target.value)} style={{ padding: "8px", border: "1px solid #e5e7eb", borderRadius: 6 }}>
          {["page_view","read_complete","uniques","readSeconds","events","scroll","heartbeat"].map((k) => (
            <option key={k} value={k}>{k}</option>
          ))}
        </select>
        <select value={sortDir} onChange={(e) => setSortDir(e.target.value)} style={{ padding: "8px", border: "1px solid #e5e7eb", borderRadius: 6 }}>
          <option value="desc">desc</option>
          <option value="asc">asc</option>
        </select>
      </div>

      {/* Today's per-path table */}
      <PathsTable items={filteredPaths} />

      {items && items.length > 1 && (
        <div style={{ marginTop: 24 }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Recent days</div>
          <div style={{ display: "grid", gap: 12 }}>
            {items
              .filter((d) => d.date !== (todayDoc?.date || ""))
              .map((doc) => (
                <Card key={doc.date}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                    <div style={{ fontSize: 16, fontWeight: 600 }}>{doc.date}</div>
                    <div style={{ color: "#666", fontSize: 12 }}>
                      generatedAt: {doc.generatedAt ? fmtIso(doc.generatedAt) : "-"}
                    </div>
                  </div>
                </Card>
              ))}
          </div>
        </div>
      )}

      <div style={{ marginTop: 12, fontSize: 12, color: "#666" }}>
        <code>[AdminAnalytics] API_BASE = {API_BASE}</code>
      </div>
    </div>
  );
}
