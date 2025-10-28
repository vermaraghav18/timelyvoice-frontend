// frontend/src/admin/AdsPage.jsx
import { useEffect, useMemo, useState } from "react";
import { api, styles as base, getToken } from "../App.jsx";
import "./ads.css";

// Small helpers
const TGT_OPTIONS = [
  { v: "homepage", label: "Homepage" },
  { v: "category", label: "Category" },
  { v: "path",     label: "Path" },
];

const FILTER_OPTIONS = [
  { v: "all",       label: "All targets" },
  { v: "homepage",  label: "Homepage only" },
  { v: "category",  label: "Categories only" },
  { v: "path",      label: "Paths only" },
];

function Field({ label, hint, error, children }) {
  return (
    <label className="f-field">
      <div className="f-label">
        <span>{label}</span>
        {hint ? <small>{hint}</small> : null}
      </div>
      {children}
      {error ? <div className="f-error">{error}</div> : null}
    </label>
  );
}

function EmptyState({ onNew }) {
  return (
    <div className="empty">
      <div className="empty-glow" />
      <h3>No ads yet</h3>
      <p>Add your first placement—image URL, link, where to show, and its index.</p>
      <button className="btn btn-primary" onClick={onNew}>+ New Ad</button>
    </div>
  );
}

function AdCard({ ad, onEdit, onToggle, onDelete, deletingId }) {
  // Prefer top-level fields; fall back to legacy custom.*
  const img  = ad.imageUrl || ad.custom?.imageUrl || "";
  const link = ad.linkUrl  || ad.custom?.link      || "";
  const afterNth = ad.custom?.afterNth;

  return (
    <div className="card ad-card fade-in">
      <div className="ad-thumb">
        {img ? <img src={img} alt="" /> : <div className="ad-thumb-ph">No image</div>}
      </div>

      <div className="ad-main">
        <div className="ad-row">
          <span className={`badge ${ad.enabled ? "ok" : "muted"}`}>
            {ad.enabled ? "Enabled" : "Disabled"}
          </span>
          <span className="badge">{String(ad.target?.type || "-")}</span>
          {ad.target?.value ? <span className="badge">{ad.target.value}</span> : null}
          <span className="badge ind">#{Number(ad.placementIndex ?? 0)}</span>
          {typeof afterNth === "number" && afterNth > 0 ? (
            <span className="badge">after {afterNth}</span>
          ) : null}
        </div>

        <div className="ad-link">
          <a href={link || "#"} target="_blank" rel="noreferrer">
            {link || "—"}
          </a>
        </div>

        {ad.notes ? <div className="ad-notes">{ad.notes}</div> : null}

        <div className="ad-actions">
          <button className="btn" onClick={() => onEdit(ad)}>Edit</button>
          <button
            className={`btn ${ad.enabled ? "btn-warn" : "btn-ok"}`}
            onClick={() => onToggle(ad)}
          >
            {ad.enabled ? "Disable" : "Enable"}
          </button>
          <button
            className="btn danger"
            onClick={() => onDelete(ad._id)}
            disabled={deletingId === ad._id}
            title="Delete this ad"
          >
            {deletingId === ad._id ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState(null);

  // Filters
  const [fltType, setFltType] = useState("all");
  const [fltValue, setFltValue] = useState("");

  // Editor state
  const [form, setForm] = useState(() => ({
    _id: null,
    imageUrl: "",
    linkUrl: "",
    targetType: "homepage",
    targetValue: "",
    placementIndex: 0,
    enabled: true,
    notes: "",
    // NEW: UI field for inserting after the Nth article
    afterNth: "", // keep as string for input; convert to number on save
  }));
  const editing = Boolean(form._id || form.imageUrl || form.linkUrl || form.notes || form.afterNth);

  // LOAD
  useEffect(() => {
    let dead = false;
    (async () => {
      try {
        setLoading(true); setError("");
        const res = await api.get("/api/admin/ads", {
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        if (!dead) setItems(Array.isArray(res.data) ? res.data : []);
      } catch (e) {
        const msg =
          e?.response?.status === 401
            ? "Please log in again (401)."
            : (e?.response?.data?.error || "Failed to load ads");
        if (!dead) setError(msg);
        console.error(e);
      } finally { if (!dead) setLoading(false); }
    })();
    return () => { dead = true; };
  }, []);

  const filtered = useMemo(() => {
    let list = [...items];
    if (fltType !== "all") {
      list = list.filter((ad) => ad.target?.type === fltType);
    }
    const v = fltValue.trim().toLowerCase();
    if (v) {
      list = list.filter((ad) =>
        String(ad.target?.value || "").toLowerCase().includes(v)
      );
    }
    return list.sort((a, b) => (a.placementIndex ?? 0) - (b.placementIndex ?? 0));
  }, [items, fltType, fltValue]);

  function startNew() {
    setForm({
      _id: null,
      imageUrl: "",
      linkUrl: "",
      targetType: "homepage",
      targetValue: "",
      placementIndex: 0,
      enabled: true,
      notes: "",
      afterNth: "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function startEdit(ad) {
    setForm({
      _id: ad._id,
      // Prefer top-level fields; fall back to legacy custom.*
      imageUrl: ad.imageUrl || ad.custom?.imageUrl || "",
      linkUrl:  ad.linkUrl  || ad.custom?.link      || "",
      targetType: ad.target?.type || "homepage",
      targetValue: ad.target?.value || "",
      placementIndex: Number(ad.placementIndex ?? 0),
      enabled: ad.enabled !== false,
      notes: ad.notes || "",
      // pull from ad.custom.afterNth if present; keep as string for input
      afterNth:
        typeof ad?.custom?.afterNth === "number"
          ? String(ad.custom.afterNth)
          : (ad?.custom?.afterNth ?? "") // if somehow string in DB
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function toggleEnabled(ad) {
    try {
      const res = await api.patch(`/api/admin/ads/${ad._id}`, { enabled: !ad.enabled }, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      setItems((prev) => prev.map((x) => (x._id === ad._id ? res.data : x)));
    } catch (e) {
      console.error(e);
      alert("Failed to toggle");
    }
  }

  async function handleDelete(id) {
    if (!id) return;
    const ok = window.confirm("Delete this ad permanently?");
    if (!ok) return;
    setDeletingId(id);
    try {
      await api.delete(`/api/admin/ads/${id}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      setItems((prev) => prev.filter((x) => x._id !== id));
    } catch (e) {
      console.error(e);
      alert("Failed to delete ad");
    } finally {
      setDeletingId(null);
    }
  }

  // Simple validation
  const vErr = {};
  if (!form.imageUrl.trim()) vErr.imageUrl = "Image URL required";
  if (!form.linkUrl.trim()) vErr.linkUrl = "Link URL required";
  if (!["homepage", "category", "path"].includes(form.targetType))
    vErr.targetType = "Invalid target type";
  if (form.targetType !== "homepage" && !form.targetValue.trim())
    vErr.targetValue = "Required for category/path";
  // afterNth is optional; if present must be >= 1
  if (form.afterNth !== "" && Number(form.afterNth) < 1) {
    vErr.afterNth = "Must be 1 or more (or leave blank)";
  }

  async function save() {
    if (Object.keys(vErr).length) return;
    try {
      setSaving(true);

      const payload = {
        imageUrl: form.imageUrl.trim(),
        linkUrl: form.linkUrl.trim(),
        placementIndex: Number(form.placementIndex || 0),
        enabled: !!form.enabled,
        notes: form.notes || "",
        target: {
          type: form.targetType,
          value: form.targetType === "homepage" ? "" : form.targetValue.trim(),
        },
        // NEW: send afterNth via custom
        custom: {
          afterNth:
            form.afterNth === "" || form.afterNth == null
              ? undefined
              : Number(form.afterNth),
        },
      };

      let res;
      if (form._id) {
        res = await api.patch(`/api/admin/ads/${form._id}`, payload, {
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        setItems((prev) => prev.map((x) => (x._id === form._id ? res.data : x)));
      } else {
        res = await api.post("/api/admin/ads", payload, {
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        setItems((prev) => [...prev, res.data]);
      }
      // reset editor
      startNew();
    } catch (e) {
      console.error(e);
      alert("Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="ads-wrap">
      {/* Header */}
      <header className="ads-header">
        <div className="shine" />
        <h1>Ads</h1>
        <p>Manage image ads and their placements. Fully responsive & live preview.</p>
      </header>

      {/* Editor */}
      <section className="panel glass slide-down">
        <div className="panel-head">
          <h3>{form._id ? "Edit Ad" : "New Ad"}</h3>
          <div className="panel-actions">
            <button className="btn" onClick={startNew}>+ New</button>
            <button className="btn btn-primary" disabled={saving || Object.keys(vErr).length} onClick={save}>
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>

        <div className="editor-grid">
          <div className="editor-form">
            <Field label="Image URL" hint="Any aspect ratio" error={vErr.imageUrl}>
              <input
                className="inp"
                placeholder="https://…"
                value={form.imageUrl}
                onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))}
              />
            </Field>

            <Field label="Link URL" hint="Where to send the user" error={vErr.linkUrl}>
              <input
                className="inp"
                placeholder="https://…"
                value={form.linkUrl}
                onChange={(e) => setForm((f) => ({ ...f, linkUrl: e.target.value }))}
              />
            </Field>

            <div className="grid-2">
              <Field label="Target Type" error={vErr.targetType}>
                <select
                  className="inp"
                  value={form.targetType}
                  onChange={(e) => setForm((f) => ({ ...f, targetType: e.target.value }))}
                >
                  {TGT_OPTIONS.map((o) => (
                    <option key={o.v} value={o.v}>{o.label}</option>
                  ))}
                </select>
              </Field>

              <Field
                label="Target Value"
                hint={`"" for homepage, "sports" for category, "/about" for path`}
                error={vErr.targetValue}
              >
                <input
                  className="inp"
                  placeholder={
                    form.targetType === "homepage"
                      ? "—"
                      : (form.targetType === "category" ? "sports" : "/path")
                  }
                  value={form.targetType === "homepage" ? "" : form.targetValue}
                  onChange={(e) => setForm((f) => ({ ...f, targetValue: e.target.value }))}
                  disabled={form.targetType === "homepage"}
                />
              </Field>
            </div>

            <div className="grid-2">
              <Field label="Placement Index" hint="Smaller = earlier">
                <input
                  type="number"
                  className="inp"
                  value={form.placementIndex}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, placementIndex: Number(e.target.value || 0) }))
                  }
                />
              </Field>

              <Field label="Enabled">
                <div className="switch">
                  <input
                    id="ad-enabled"
                    type="checkbox"
                    checked={form.enabled}
                    onChange={(e) => setForm((f) => ({ ...f, enabled: e.target.checked }))}
                  />
                  <label htmlFor="ad-enabled" />
                </div>
              </Field>
            </div>

            {/* NEW: afterNth input */}
            <Field
              label="Insert after Nth article"
              hint='Leave blank to show above the list; "5" inserts after the 5th article'
              error={vErr.afterNth}
            >
              <input
                className="inp"
                type="number"
                min="1"
                placeholder="e.g., 5"
                value={form.afterNth}
                onChange={(e) => setForm((f) => ({ ...f, afterNth: e.target.value }))}
              />
            </Field>

            <Field label="Notes (optional)">
              <textarea
                className="inp"
                rows={3}
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </Field>
          </div>

          {/* Live Preview */}
          <div className="editor-preview">
            <div className="preview-head">Preview</div>
            <div className="preview-body">
              {form.imageUrl ? (
                <a href={form.linkUrl || "#"} target="_blank" rel="noreferrer" className="ad-preview">
                  <img src={form.imageUrl} alt="" />
                </a>
              ) : (
                <div className="preview-ph">Add an Image URL to preview</div>
              )}
              <div className="preview-meta">
                <span>{form.targetType}</span>
                {form.targetType !== "homepage" && form.targetValue ? (
                  <span> • {form.targetValue}</span>
                ) : null}
                <span> • index #{Number(form.placementIndex || 0)}</span>
                {form.afterNth !== "" ? <span> • after {form.afterNth}</span> : null}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Filters */}
      <section className="panel glass">
        <div className="filters">
          <div className="grid-3">
            <div>
              <label className="lbl">Filter Target Type</label>
              <select className="inp" value={fltType} onChange={(e) => setFltType(e.target.value)}>
                {FILTER_OPTIONS.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="lbl">Filter Target Value</label>
              <input
                className="inp"
                placeholder={`"", "sports", or "/path"`}
                value={fltValue}
                onChange={(e) => setFltValue(e.target.value)}
              />
            </div>
            <div className="flt-actions">
              <button className="btn" onClick={() => { setFltType("all"); setFltValue(""); }}>
                Reset
              </button>
              <button className="btn btn-primary" onClick={startNew}>+ New Ad</button>
            </div>
          </div>
        </div>
      </section>

      {/* List */}
      <section className="list">
        {loading ? (
          <div className="loading">Loading…</div>
        ) : error ? (
          <div className="error">{error}</div>
        ) : filtered.length === 0 ? (
          <EmptyState onNew={startNew} />
        ) : (
          <div className="grid-cards">
            {filtered.map((ad) => (
              <AdCard
                key={ad._id}
                ad={ad}
                onEdit={startEdit}
                onToggle={toggleEnabled}
                onDelete={handleDelete}
                deletingId={deletingId}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
