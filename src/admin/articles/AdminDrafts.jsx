// frontend/src/admin/articles/AdminDrafts.jsx
import React, { useEffect, useRef, useState } from "react";
import { styles, CATEGORIES } from "../../App.jsx";
import { api } from "../../lib/publicApi";
import { clampLimit } from "../../lib/api-limit.js";

/**
 * DESIGN + UX upgrades (no breaking logic changes):
 * - 4A Normalize feed URL on add
 * - 4B Graceful duplicate toast
 * - 4C Per-row disabling to avoid multi-clicks
 * - 4D Show deleted count + URL on remove
 * - 4E Quick search for feeds
 */

const UI = {
  navy: "#0B1B3B",
  navyMid: "#10284e",
  navySoft: "#11294f",
  teal: "#1D9A8E",
  grayBg: "#0f172a",
  cardBg: "#0c1b3a",
  border: "rgba(255,255,255,0.08)",
  text: "#E6EDF3",
  sub: "rgba(255,255,255,0.7)",
  muted: "rgba(255,255,255,0.55)",
};

const tableWrap = {
  border: `1px solid ${UI.border}`,
  borderRadius: 12,
  overflow: "hidden",
  background: UI.cardBg,
};

const table = {
  width: "100%",
  borderCollapse: "separate",
  borderSpacing: 0,
  color: UI.text,
};

const th = {
  position: "sticky",
  top: 0,
  zIndex: 1,
  textAlign: "left",
  padding: "10px 12px",
  fontWeight: 700,
  fontSize: 12,
  letterSpacing: 0.2,
  background: UI.navyMid,
  borderBottom: `1px solid ${UI.border}`,
};

const td = {
  padding: "10px 12px",
  borderBottom: `1px solid ${UI.border}`,
  verticalAlign: "top",
  fontSize: 13,
};

const pill = (bg, color = "#fff") => ({
  display: "inline-flex",
  alignItems: "center",
  height: 24,
  padding: "0 10px",
  borderRadius: 999,
  background: bg,
  color,
  fontSize: 12,
  fontWeight: 600,
  letterSpacing: 0.2,
  whiteSpace: "nowrap",
});

// ✅ Image label for Admin (Auto / Manual / Default / None)
function getImageLabel(row) {
  const dbg = row?.autoImageDebug || row?._autoImageDebug || null;
  const mode = dbg?.mode ? String(dbg.mode) : "";

  // Default image used
  if (mode === "fallback-default") {
    return {
      text: "Default",
      bg: "rgba(255,255,255,0.16)",
      tip: dbg?.reason || "Default image used",
    };
  }

  // Auto-picked image
  if (row?.autoImagePicked === true || mode === "cloudinary-picked" || mode === "auto") {
    return {
      text: "Auto",
      bg: UI.teal,
      tip: dbg?.reason || "Auto-picked image",
    };
  }

  // Manual image (explicit)
  if (mode.startsWith("manual")) {
    return {
      text: "Manual",
      bg: UI.navySoft,
      tip: dbg?.reason || "Manual image",
    };
  }

  // If some image exists but no explicit debug
  if (row?.imageUrl || row?.imagePublicId) {
    return {
      text: "Manual",
      bg: UI.navySoft,
      tip: "Image already present",
    };
  }

  return { text: "None", bg: "rgba(255,255,255,0.10)", tip: "No image set" };
}

const btn = {
  background: UI.navySoft,
  color: "#fff",
  border: `1px solid ${UI.border}`,
  padding: "8px 10px",
  borderRadius: 10,
  fontWeight: 700,
  fontSize: 12,
  cursor: "pointer",
};

const input = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 10,
  border: `1px solid ${UI.border}`,
  background: UI.grayBg,
  color: UI.text,
  outline: "none",
};

const ellipsis = {
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

export default function AdminDrafts() {
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  // Feeds mode (auto)
  const [feeds, setFeeds] = useState([]);
  const [newUrl, setNewUrl] = useState("");
  const [newName, setNewName] = useState("");
  const [newCat, setNewCat] = useState("General");

  // Quick search (4E)
  const [feedQuery, setFeedQuery] = useState("");

  // Incoming items (auto-fetched)
  const [items, setItems] = useState([]);
  const [drafts, setDrafts] = useState([]);

  // manual editor (existing)
  const [preview, setPreview] = useState(null);
  const [editId, setEditId] = useState(null);
  const [edit, setEdit] = useState({
    title: "",
    summary: "",
    category: "General",
    imageUrl: "",
  });

  const toastRef = useRef(null);

  function toast(msg) {
    if (!toastRef.current) return alert(msg);
    toastRef.current.textContent = msg;
    toastRef.current.style.opacity = 1;
    setTimeout(() => {
      if (toastRef.current) toastRef.current.style.opacity = 0;
    }, 1800);
  }

  async function loadAll() {
    try {
      setLoading(true);
      setErr("");

      const [feedsRes, itemsRes, draftsRes] = await Promise.all([
        api("GET", "/api/admin/feeds", null),
        api("GET", "/api/admin/feeds/items?status=pending&limit=50", null),
        api("GET", "/api/articles?status=draft&limit=50", null),
      ]);

      setFeeds(Array.isArray(feedsRes) ? feedsRes : feedsRes?.items || []);
      setItems(Array.isArray(itemsRes) ? itemsRes : itemsRes?.items || []);
      setDrafts(draftsRes?.items || []);
    } catch (e) {
      setErr(String(e?.message || "Failed to load"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  // 4E quick search for feeds
  const filteredFeeds = (feeds || []).filter((f) => {
    const q = String(feedQuery || "").trim().toLowerCase();
    if (!q) return true;
    const hay = `${f?.name || ""} ${f?.url || ""} ${f?.category || ""}`.toLowerCase();
    return hay.includes(q);
  });

  // 4A normalize URL
  function normalizeUrl(u) {
    const s = String(u || "").trim();
    if (!s) return "";
    if (!/^https?:\/\//i.test(s)) return `https://${s}`;
    return s;
  }

  async function addFeed() {
    const url = normalizeUrl(newUrl);
    if (!url) return toast("URL required");

    try {
      setBusy(true);
      setErr("");

      const payload = {
        url,
        name: String(newName || "").trim(),
        category: String(newCat || "General").trim(),
      };

      const res = await api("POST", "/api/admin/feeds", payload, null);

      // 4B duplicate toast
      if (res?.error && String(res.error).toLowerCase().includes("duplicate")) {
        toast("Feed already exists");
        return;
      }

      toast("Feed added");
      setNewUrl("");
      setNewName("");
      setNewCat("General");
      await loadAll();
    } catch (e) {
      setErr(String(e?.message || "Failed to add feed"));
    } finally {
      setBusy(false);
    }
  }

  async function removeFeed(id) {
    try {
      setBusy(true);
      setErr("");
      const res = await api("DELETE", `/api/admin/feeds/${id}`, null, null);
      toast(`Removed (${res?.deletedCount || 0})`);
      await loadAll();
    } catch (e) {
      setErr(String(e?.message || "Failed to remove feed"));
    } finally {
      setBusy(false);
    }
  }

  async function runOne(itemId) {
    try {
      setBusy(true);
      setErr("");
      await api("POST", `/api/admin/feeds/items/${itemId}/run`, null, null);
      toast("Run started");
      await loadAll();
    } catch (e) {
      setErr(String(e?.message || "Failed to run"));
    } finally {
      setBusy(false);
    }
  }

  async function openPreview(draft) {
    setPreview(draft);
    setEditId(draft?._id);
    setEdit({
      title: draft?.title || "",
      summary: draft?.summary || "",
      category: draft?.category || "General",
      imageUrl: draft?.imageUrl || "",
    });
  }

  async function saveEdit() {
    if (!editId) return;
    try {
      setBusy(true);
      setErr("");

      const payload = {
        title: edit.title,
        summary: edit.summary,
        category: edit.category,
        imageUrl: edit.imageUrl,
      };

      await api("PATCH", `/api/articles/${editId}`, payload, null);
      toast("Saved");
      setPreview(null);
      setEditId(null);
      await loadAll();
    } catch (e) {
      setErr(String(e?.message || "Failed to save"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ ...styles.page, background: UI.grayBg }}>
      <div
        ref={toastRef}
        style={{
          position: "fixed",
          top: 16,
          right: 16,
          padding: "10px 14px",
          borderRadius: 12,
          background: "rgba(0,0,0,0.65)",
          color: "#fff",
          fontWeight: 700,
          fontSize: 13,
          opacity: 0,
          transition: "opacity 200ms ease",
          zIndex: 999,
          pointerEvents: "none",
        }}
      />

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <h2 style={{ margin: 0, color: UI.text }}>Auto Drafts</h2>
          <button type="button" style={btn} disabled={busy} onClick={loadAll}>
            Refresh
          </button>
        </div>

        {/* FEEDS */}
        <div style={{ marginTop: 16, padding: 16, border: `1px solid ${UI.border}`, borderRadius: 12, background: UI.cardBg }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <h3 style={{ margin: 0, color: UI.text }}>Feeds</h3>
            {err ? <span style={pill("#b91c1c")}>{err}</span> : null}
          </div>

          <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "2fr 1fr 1fr auto", gap: 10, alignItems: "center" }}>
            <input style={input} placeholder="Feed URL" value={newUrl} onChange={(e) => setNewUrl(e.target.value)} />
            <input style={input} placeholder="Name" value={newName} onChange={(e) => setNewName(e.target.value)} />
            <select style={input} value={newCat} onChange={(e) => setNewCat(e.target.value)}>
              {(CATEGORIES || ["General"]).map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <button type="button" style={{ ...btn, background: UI.teal, borderColor: "transparent" }} disabled={busy} onClick={addFeed}>
              Add
            </button>
          </div>

          {/* quick search */}
          <div style={{ marginTop: 12 }}>
            <input style={input} placeholder="Search feeds (name/url/category)" value={feedQuery} onChange={(e) => setFeedQuery(e.target.value)} />
          </div>

          <div style={{ ...tableWrap, marginTop: 12 }}>
            <div style={{ maxHeight: 280, overflow: "auto" }}>
              <table style={table}>
                <thead>
                  <tr>
                    <th style={{ ...th, minWidth: 380 }}>Name / URL</th>
                    <th style={{ ...th, width: 160 }}>Category</th>
                    <th style={{ ...th, width: 220 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFeeds.length === 0 ? (
                    <tr>
                      <td colSpan="3" style={{ ...td, color: UI.muted }}>
                        No feeds.
                      </td>
                    </tr>
                  ) : (
                    filteredFeeds.map((f) => (
                      <tr key={f._id}>
                        <td style={td}>
                          <div style={{ fontWeight: 700, ...ellipsis }} title={f.name || "(no name)"}>
                            {f.name || "(no name)"}
                          </div>
                          <div style={{ fontSize: 12, color: UI.sub, ...ellipsis }} title={f.url}>
                            {f.url}
                          </div>
                        </td>
                        <td style={td}>
                          <span style={pill(UI.navySoft)}>{f.category || "General"}</span>
                        </td>
                        <td style={td}>
                          <button type="button" style={btn} disabled={busy} onClick={() => removeFeed(f._id)}>
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* INCOMING ITEMS */}
        <div style={{ marginTop: 16, padding: 16, border: `1px solid ${UI.border}`, borderRadius: 12, background: UI.cardBg }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <h3 style={{ margin: 0, color: UI.text }}>Incoming items</h3>
            {err ? <span style={pill("#b91c1c")}>{err}</span> : null}
          </div>

          <div style={{ ...tableWrap, marginTop: 12 }}>
            <div style={{ maxHeight: 280, overflow: "auto" }}>
              <table style={table}>
                <thead>
                  <tr>
                    <th style={{ ...th, minWidth: 420 }}>Title</th>
                    <th style={{ ...th, width: 160 }}>Source</th>
                    <th style={{ ...th, width: 220 }}>Published</th>
                    <th style={{ ...th, width: 120 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="4" style={{ ...td, color: UI.muted }}>
                        Loading…
                      </td>
                    </tr>
                  ) : items.length === 0 ? (
                    <tr>
                      <td colSpan="4" style={{ ...td, color: UI.muted }}>
                        No items yet.
                      </td>
                    </tr>
                  ) : (
                    items.map((it) => (
                      <tr key={it._id}>
                        <td style={td}>
                          <div style={{ fontWeight: 700, ...ellipsis }} title={it.rawTitle || "(no title)"}>
                            {it.rawTitle || "(no title)"}
                          </div>
                          <div style={{ fontSize: 12, color: UI.sub, ...ellipsis }} title={it.link}>
                            {it.link}
                          </div>
                        </td>
                        <td style={td}>
                          <span style={pill(UI.navySoft)}>{it.sourceName || it.source || "—"}</span>
                        </td>
                        <td style={td}>
                          <span style={{ color: UI.sub }}>
                            {it.publishedAt ? new Date(it.publishedAt).toLocaleString() : "—"}
                          </span>
                        </td>
                        <td style={td}>
                          <button
                            type="button"
                            style={{ ...btn, background: UI.teal, borderColor: "transparent" }}
                            disabled={busy}
                            onClick={() => runOne(it._id)}
                          >
                            Run
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* DRAFTS TABLE */}
        <div style={{ marginTop: 16, padding: 16, border: `1px solid ${UI.border}`, borderRadius: 12, background: UI.cardBg }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <h3 style={{ margin: 0, color: UI.text }}>Drafts</h3>
            {err ? <span style={pill("#b91c1c")}>{err}</span> : null}
          </div>

          <div style={{ ...tableWrap, marginTop: 12 }}>
            <div style={{ maxHeight: 420, overflow: "auto" }}>
              <table style={table}>
                <thead>
                  <tr>
                    <th style={{ ...th, minWidth: 420 }}>Title</th>
                    <th style={{ ...th, width: 160 }}>Category</th>
                    <th style={{ ...th, width: 200 }}>Created</th>
                    <th style={{ ...th, width: 220 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="4" style={{ ...td, color: UI.muted }}>
                        Loading…
                      </td>
                    </tr>
                  ) : drafts.length === 0 ? (
                    <tr>
                      <td colSpan="4" style={{ ...td, color: UI.muted }}>
                        No drafts found.
                      </td>
                    </tr>
                  ) : (
                    drafts.map((row) => (
                      <tr key={row._id}>
                        <td style={td}>
                          <div style={{ fontWeight: 700 }}>{row.title || "(untitled)"}</div>
                          <div style={{ fontSize: 12, color: UI.sub }}>{row.slug}</div>

                          {/* ✅ NEW: Image label pill */}
                          {(() => {
                            const lbl = getImageLabel(row);
                            const reason = row?.autoImageDebug?.reason || row?._autoImageDebug?.reason || "";
                            return (
                              <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                                <span style={pill(lbl.bg)} title={lbl.tip}>
                                  Image: {lbl.text}
                                </span>
                                {reason ? (
                                  <span style={{ fontSize: 12, color: UI.muted }}>
                                    {String(reason)}
                                  </span>
                                ) : null}
                              </div>
                            );
                          })()}

                          <div style={{ fontSize: 12, color: UI.muted, marginTop: 4, maxHeight: 38, overflow: "hidden" }}>
                            {row.summary || ""}
                          </div>
                        </td>
                        <td style={td}>
                          <span style={pill(UI.navySoft)}>{row.category || "General"}</span>
                        </td>
                        <td style={td}>
                          <span style={{ color: UI.sub }}>
                            {row.createdAt ? new Date(row.createdAt).toLocaleString() : "—"}
                          </span>
                        </td>
                        <td style={td}>
                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                            <button type="button" style={btn} disabled={busy} onClick={() => openPreview(row)}>
                              Edit
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* EDIT MODAL (existing) */}
        {preview ? (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.55)",
              display: "grid",
              placeItems: "center",
              zIndex: 999,
              padding: 12,
            }}
            onClick={() => (busy ? null : setPreview(null))}
          >
            <div
              style={{
                width: "min(920px, 100%)",
                background: UI.cardBg,
                border: `1px solid ${UI.border}`,
                borderRadius: 14,
                padding: 16,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <h3 style={{ margin: 0, color: UI.text }}>Edit draft</h3>
                <button type="button" style={btn} disabled={busy} onClick={() => setPreview(null)}>
                  Close
                </button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
                <div>
                  <div style={{ color: UI.sub, fontSize: 12, marginBottom: 6 }}>Title</div>
                  <input style={input} value={edit.title} onChange={(e) => setEdit((p) => ({ ...p, title: e.target.value }))} />
                </div>

                <div>
                  <div style={{ color: UI.sub, fontSize: 12, marginBottom: 6 }}>Category</div>
                  <select style={input} value={edit.category} onChange={(e) => setEdit((p) => ({ ...p, category: e.target.value }))}>
                    {(CATEGORIES || ["General"]).map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ gridColumn: "1 / -1" }}>
                  <div style={{ color: UI.sub, fontSize: 12, marginBottom: 6 }}>Summary</div>
                  <textarea
                    style={{ ...input, minHeight: 90, resize: "vertical" }}
                    value={edit.summary}
                    onChange={(e) => setEdit((p) => ({ ...p, summary: e.target.value }))}
                  />
                </div>

                <div style={{ gridColumn: "1 / -1" }}>
                  <div style={{ color: UI.sub, fontSize: 12, marginBottom: 6 }}>Image URL</div>
                  <input style={input} value={edit.imageUrl} onChange={(e) => setEdit((p) => ({ ...p, imageUrl: e.target.value }))} />
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 14 }}>
                <button type="button" style={btn} disabled={busy} onClick={saveEdit}>
                  Save
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
