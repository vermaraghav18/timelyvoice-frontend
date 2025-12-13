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
  letterSpacing: 0.3,
  textTransform: "uppercase",
  background: UI.navyMid,
  color: UI.text,
  borderBottom: `1px solid ${UI.border}`,
};

const td = {
  padding: "12px",
  borderBottom: `1px solid ${UI.border}`,
  verticalAlign: "top",
  fontSize: 14,
  color: UI.text,
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

const btn = {
  background: UI.navyMid,
  color: UI.text,
  border: `1px solid ${UI.border}`,
  borderRadius: 10,
  padding: "8px 12px",
  fontWeight: 600,
  fontSize: 13,
  cursor: "pointer",
};

const btnGhost = {
  ...btn,
  background: "transparent",
};

const input = {
  background: UI.cardBg,
  border: `1px solid ${UI.border}`,
  color: UI.text,
  borderRadius: 10,
  padding: "10px 12px",
  outline: "none",
};

const ellipsis = {
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

export default function AdminDrafts() {
  // Drafts
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // Edit/preview
  const [preview, setPreview] = useState(null);
  const [editId, setEditId] = useState(null);
  const [edit, setEdit] = useState({
    title: "",
    summary: "",
    category: "General",
    imageUrl: "",
  });

  // Feeds (auto mode)
  const [feeds, setFeeds] = useState([]);
  const [newUrl, setNewUrl] = useState("");
  const [newName, setNewName] = useState("");
  const [newCat, setNewCat] = useState("General");

  // Quick search (4E)
  const [feedQuery, setFeedQuery] = useState("");

  // Incoming items (auto-fetched)
  const [items, setItems] = useState([]);
  const [itemsLoading, setItemsLoading] = useState(true);
  const pollRef = useRef(null);

  // misc
  const [busy, setBusy] = useState(false);
  const [rowBusy, setRowBusy] = useState({});
  const setRowLock = (id, on = true) => setRowBusy((p) => ({ ...p, [id]: on }));

  const [toast, setToast] = useState("");
  const show = (m) => {
    setToast(String(m));
    setTimeout(() => setToast(""), 2500);
  };

  /* Loaders */
  async function loadDrafts() {
    setLoading(true);
    setErr("");
    try {
      const r = await api.get("/api/admin/articles/drafts");
      setDrafts(Array.isArray(r.data) ? r.data : []);
    } catch (e) {
      setErr("Failed to load drafts");
    } finally {
      setLoading(false);
    }
  }

  async function loadFeeds() {
    try {
      const r = await api.get("/api/automation/feeds");
      setFeeds(Array.isArray(r.data) ? r.data : []);
    } catch {
      /* ignore */
    }
  }

  async function loadItems() {
    setItemsLoading(true);
    try {
      const r = await api.get("/api/automation/items", {
        params: { status: "fetched,extr,gen", limit: clampLimit(200) },
      });
      setItems(Array.isArray(r.data) ? r.data : []);
    } catch {
      /* ignore */
    } finally {
      setItemsLoading(false);
    }
  }

  useEffect(() => {
    loadDrafts();
    loadFeeds();
    loadItems();
    pollRef.current = setInterval(loadItems, 45000);
    return () => clearInterval(pollRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Feed actions */
  async function addFeed(e) {
    e?.preventDefault?.();
    if (!newUrl.trim()) return;
    setBusy(true);
    try {
      // 4A: normalize URL (strip hash + utm*, remove trailing slash)
      let normUrl = newUrl.trim();
      try {
        const u = new URL(normUrl);
        u.hash = "";
        ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"].forEach((p) =>
          u.searchParams.delete(p)
        );
        normUrl = u.toString().replace(/\/+$/, "");
      } catch {
        // keep as typed
      }

      const body = {
        name:
          newName?.trim() ||
          (() => {
            try {
              return new URL(normUrl).hostname;
            } catch {
              return newUrl.trim();
            }
          })(),
        url: normUrl,
        defaultCategory: newCat || "General",
      };

      await api.post("/api/automation/feeds", body);
      setNewUrl("");
      setNewName("");
      await loadFeeds();
      show("Feed added");
    } catch (e2) {
      const msg = e2?.response?.data?.error || e2?.message || "";
      if (/duplicate|exists|E11000/i.test(msg)) {
        show("This feed already exists.");
        await loadFeeds();
      } else {
        show("Add feed failed");
      }
    } finally {
      setBusy(false);
    }
  }

  async function enableFeed(id) {
    setRowLock(id, true);
    try {
      await api.patch(`/api/automation/feeds/${id}`, { enabled: true });
      await api.post(`/api/automation/feeds/${id}/fetch`);
      await loadFeeds();
      await loadItems();
    } catch {
      show("Failed to enable");
    } finally {
      setRowLock(id, false);
    }
  }

  async function removeFeed(id) {
    if (!confirm("Remove this feed and any duplicates with the same URL?")) return;
    setRowLock(id, true);

    setFeeds((prev) => prev.filter((f) => f._id !== id));

    try {
      const r = await api.delete(`/api/automation/feeds/${id}`, { params: { allByUrl: 1 } });
      const deleted = r?.data?.deleted ?? 1;
      const url = r?.data?.url || "";
      show(`Removed ${deleted} feed(s) for ${url}`);
      await loadFeeds();
    } catch {
      show("Failed to remove");
      await loadFeeds();
    } finally {
      setRowLock(id, false);
    }
  }

  /* Item actions */
  async function runOne(itemId) {
    setBusy(true);
    try {
      await api.post(`/api/automation/items/${itemId}/run`);
      show("Processed! It will appear in Drafts shortly.");
      await loadItems();
      await loadDrafts();
    } catch {
      show("Run failed");
    } finally {
      setBusy(false);
    }
  }

  /* Draft actions */
  async function openPreview(id) {
    try {
      const r = await api.get(`/api/admin/articles/${id}`);
      setPreview(r.data);
    } catch {
      show("Preview failed");
    }
  }
  const closePreview = () => setPreview(null);

  function startEdit(row) {
    setEditId(row._id);
    setEdit({
      title: row.title || "",
      summary: row.summary || "",
      category: row.category || "General",
      imageUrl: row.imageUrl || "",
    });
  }
  const cancelEdit = () => setEditId(null);

  async function saveEdit() {
    if (!editId) return;
    setBusy(true);
    try {
      await api.patch(`/api/admin/articles/${editId}`, {
        title: edit.title,
        summary: edit.summary,
        category: edit.category,
        image: edit.imageUrl,
      });
      await loadDrafts();
      setEditId(null);
      show("Saved");
    } catch {
      show("Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function publish(id) {
    setBusy(true);
    try {
      await api.patch(`/api/admin/articles/${id}`, { status: "published" });
      await loadDrafts();
      show("Published");
    } catch {
      show("Publish failed");
    } finally {
      setBusy(false);
    }
  }

  const filteredFeeds = feeds.filter(
    (f) =>
      (f.name || "").toLowerCase().includes(feedQuery.toLowerCase()) ||
      (f.url || "").toLowerCase().includes(feedQuery.toLowerCase())
  );

  return (
    <div style={{ ...styles.page, background: UI.navy, color: UI.text }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: 0,
          marginBottom: 8,
        }}
      >
        <h1 style={{ margin: 0, color: UI.text }}>AI Drafts Review</h1>
        {toast ? <div style={{ ...pill(UI.teal), background: UI.teal }}>{toast}</div> : null}
      </div>
      <p style={{ color: UI.muted, marginTop: 4 }}>
        Approve, edit or publish AI-generated drafts. Latest first.
      </p>

      {/* FEED MANAGER */}
      <div
        style={{
          marginTop: 16,
          padding: 16,
          border: `1px solid ${UI.border}`,
          borderRadius: 12,
          background: UI.cardBg,
        }}
      >
        <h3 style={{ margin: 0, marginBottom: 12, color: UI.text }}>Feed Manager</h3>

        <form
          onSubmit={addFeed}
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(280px, 1fr) 220px 160px auto",
            gap: 8,
            alignItems: "center",
          }}
        >
          <input
            style={{ ...input, minWidth: 260 }}
            placeholder="https://example.com/rss.xml"
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
          />
          <input
            style={input}
            placeholder="Optional name (Source)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <select style={input} value={newCat} onChange={(e) => setNewCat(e.target.value)}>
            {CATEGORIES.filter((c) => c !== "All").map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <button
            type="submit"
            style={{ ...btn, background: UI.teal, borderColor: "transparent" }}
            disabled={busy || !newUrl}
          >
            Add Feed
          </button>
        </form>

        <div style={{ marginTop: 10 }}>
          <input
            style={{ ...input, width: "100%" }}
            placeholder="Search feeds…"
            value={feedQuery}
            onChange={(e) => setFeedQuery(e.target.value)}
          />
        </div>

        <div style={{ marginTop: 12, ...tableWrap }}>
          <div style={{ maxHeight: 360, overflow: "auto" }}>
            <table style={table}>
              <thead>
                <tr>
                  <th style={{ ...th, width: 220 }}>Source</th>
                  <th style={{ ...th, minWidth: 520 }}>URL</th>
                  <th style={{ ...th, width: 140 }}>Category</th>
                  <th style={{ ...th, width: 220 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredFeeds.length === 0 ? (
                  <tr>
                    <td colSpan="4" style={{ ...td, color: UI.muted }}>
                      No feeds match your search.
                    </td>
                  </tr>
                ) : (
                  filteredFeeds.map((f) => (
                    <tr key={f._id}>
                      <td style={td}>
                        <div style={{ fontWeight: 700 }}>{f.name || f.site || "-"}</div>
                        <div style={{ fontSize: 12, color: UI.sub }}>ID: {f._id}</div>
                      </td>
                      <td style={td}>
                        <div title={f.url} style={{ ...ellipsis }}>
                          {f.url}
                        </div>
                      </td>
                      <td style={td}>
                        <span style={pill(UI.navySoft)}>{f.defaultCategory || f.category || "General"}</span>
                      </td>
                      <td style={td}>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          {!f.enabled ? (
                            <button
                              type="button"
                              style={{ ...btn, background: UI.teal, borderColor: "transparent" }}
                              disabled={!!rowBusy[f._id]}
                              onClick={() => enableFeed(f._id)}
                            >
                              Add
                            </button>
                          ) : (
                            <span style={pill(UI.navySoft)}>Added (Auto)</span>
                          )}
                          <button
                            type="button"
                            style={btnGhost}
                            disabled={!!rowBusy[f._id]}
                            onClick={() => removeFeed(f._id)}
                          >
                            Remove
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

      {/* INCOMING ITEMS */}
      <div
        style={{
          marginTop: 16,
          padding: 16,
          border: `1px solid ${UI.border}`,
          borderRadius: 12,
          background: UI.cardBg,
        }}
      >
        <h3 style={{ margin: 0, marginBottom: 12, color: UI.text }}>Incoming Articles (auto)</h3>

        <div style={{ ...tableWrap }}>
          <div style={{ maxHeight: 420, overflow: "auto" }}>
            <table style={table}>
              <thead>
                <tr>
                  <th style={{ ...th, minWidth: 420 }}>Title</th>
                  <th style={{ ...th, width: 220 }}>Source</th>
                  <th style={{ ...th, width: 200 }}>Published</th>
                  <th style={{ ...th, width: 120 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {itemsLoading ? (
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
      <div
        style={{
          marginTop: 16,
          padding: 16,
          border: `1px solid ${UI.border}`,
          borderRadius: 12,
          background: UI.cardBg,
        }}
      >
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
                          <button type="button" style={btnGhost} onClick={() => openPreview(row._id)}>
                            Preview
                          </button>
                          <button type="button" style={btnGhost} onClick={() => startEdit(row)}>
                            ✏️ Edit
                          </button>
                          <button
                            type="button"
                            style={{ ...btn, background: UI.teal, borderColor: "transparent" }}
                            onClick={() => publish(row._id)}
                          >
                            🚀 Publish
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

      {/* PREVIEW */}
      {preview && (
        <div
          style={{
            marginTop: 16,
            padding: 16,
            border: `1px solid ${UI.border}`,
            borderRadius: 12,
            background: UI.cardBg,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ margin: 0, color: UI.text }}>Preview</h3>
            <button type="button" style={btnGhost} onClick={closePreview}>
              ✖
            </button>
          </div>
          <h2 style={{ marginTop: 8, color: UI.text }}>{preview.title}</h2>
          <p style={{ color: UI.sub }}>
            <span style={pill(UI.navySoft)}>{preview.category}</span>
            <span style={{ marginLeft: 8 }}>
              {preview.createdAt ? new Date(preview.createdAt).toLocaleString() : ""}
            </span>
          </p>
          <p style={{ color: UI.text }}>{preview.summary}</p>
          <div style={{ whiteSpace: "pre-wrap", color: UI.text }}>{preview.body}</div>
        </div>
      )}

      {/* EDIT */}
      {editId && (
        <div
          style={{
            marginTop: 16,
            padding: 16,
            border: `1px solid ${UI.border}`,
            borderRadius: 12,
            background: UI.cardBg,
          }}
        >
          <h3 style={{ margin: 0, marginBottom: 12, color: UI.text }}>Edit Draft</h3>
          <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 8, alignItems: "center" }}>
            <label>Title</label>
            <input style={input} value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} />
            <label>Category</label>
            <select
              style={input}
              value={edit.category}
              onChange={(e) => setEdit({ ...edit, category: e.target.value })}
            >
              {CATEGORIES.filter((c) => c !== "All").map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <label>Summary</label>
            <textarea
              style={{ ...input, minHeight: 96 }}
              value={edit.summary}
              onChange={(e) => setEdit({ ...edit, summary: e.target.value })}
            />
            <label>Image URL</label>
            <input
              style={input}
              value={edit.imageUrl}
              onChange={(e) => setEdit({ ...edit, imageUrl: e.target.value })}
            />
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button type="button" style={btnGhost} onClick={cancelEdit}>
              Cancel
            </button>
            <button
              type="button"
              style={{ ...btn, background: UI.teal, borderColor: "transparent" }}
              onClick={saveEdit}
              disabled={busy}
            >
              Save
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
