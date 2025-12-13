// src/pages/admin/TagsPage.jsx
import { useEffect, useMemo, useState } from "react";
import { api } from "../../lib/publicApi";
import { useToast } from "../../providers/ToastProvider.jsx";

export default function TagsPage() {
  const toast = useToast();

  // raw list loaded from server (full list; backend doesn't paginate)
  const [all, setAll] = useState([]);
  const [loading, setLoading] = useState(false);

  // filters + paging (client-side)
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  // create form
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");

  // inline edit
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editSlug, setEditSlug] = useState("");

  // debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), 350);
    return () => clearTimeout(t);
  }, [q]);

  // load full list (server returns entire array)
  async function load() {
    setLoading(true);
    try {
      const res = await api.get("/tags");
      const arr = Array.isArray(res.data) ? res.data : (res.data?.items || []);
      setAll(arr || []);
    } catch (e) {
      toast.push({ type: "error", title: "Load failed", message: String(e?.response?.data?.message || e.message) });
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  // filter + sort (name asc) on client
  const filtered = useMemo(() => {
    const term = debouncedQ.toLowerCase();
    const base = term
      ? all.filter(t =>
          (t.name || "").toLowerCase().includes(term) ||
          (t.slug || "").toLowerCase().includes(term)
        )
      : all.slice();
    // stable sort by name
    return base.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }, [all, debouncedQ]);

  // paging slice
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const pageClamped = Math.min(page, totalPages);
  const paged = useMemo(() => {
    const start = (pageClamped - 1) * limit;
    return filtered.slice(start, start + limit);
  }, [filtered, pageClamped, limit]);

  // create
  async function onCreate(e) {
    e.preventDefault();
    if (!name.trim()) {
      toast.push({ type: "warning", title: "Name is required" });
      return;
    }
    try {
      const body = { name: name.trim() };
      if (slug.trim()) body.slug = slug.trim();
      await api.post("/tags", body);
      toast.push({ type: "success", title: "Tag created" });
      setName(""); setSlug("");
      setPage(1);
      load();
    } catch (e) {
      const msg = e?.response?.status === 409
        ? "Duplicate slug."
        : (e?.response?.data?.message || e.message);
      toast.push({ type: "error", title: "Create failed", message: String(msg) });
    }
  }

  // edit
  function startEdit(tag) {
    setEditId(tag._id);
    setEditName(tag.name || "");
    setEditSlug(tag.slug || "");
  }
  function cancelEdit() {
    setEditId(null);
    setEditName(""); setEditSlug("");
  }
  async function saveEdit(id) {
    if (!editName.trim()) {
      toast.push({ type: "warning", title: "Name is required" });
      return;
    }
    try {
      const body = { name: editName.trim() };
      body.slug = editSlug.trim() || undefined;
      await api.patch(`/tags/${id}`, body);
      toast.push({ type: "success", title: "Changes saved" });
      cancelEdit();
      load();
    } catch (e) {
      const msg = e?.response?.status === 409
        ? "Duplicate slug."
        : (e?.response?.data?.message || e.message);
      toast.push({ type: "error", title: "Update failed", message: String(msg) });
    }
  }

  // delete
  async function remove(id) {
    if (!confirm("Delete this tag? This cannot be undone.")) return;
    try {
      await api.delete(`/tags/${id}`);
      toast.push({ type: "success", title: "Tag deleted" });
      load();
    } catch (e) {
      const msg = e?.response?.data?.message || e.message;
      toast.push({ type: "error", title: "Delete failed", message: String(msg) });
    }
  }

  // reset page if filters change
  useEffect(() => { setPage(1); }, [debouncedQ, limit]);

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <header style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, margin: 0 }}>Tags</h1>
      </header>

      {/* Create */}
      <form onSubmit={onCreate} style={{ border: "1px solid #eee", borderRadius: 12, padding: 12, background: "#fff" }}>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>Create Tag</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <input value={name} onChange={(e)=>setName(e.target.value)} placeholder="Name *" style={inp} />
          <input value={slug} onChange={(e)=>setSlug(e.target.value)} placeholder="Slug (optional)" style={inp} />
        </div>
        <div style={{ marginTop: 8 }}>
          <button type="submit" style={btnPrimary}>Create</button>
        </div>
      </form>

      {/* Filters */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <input
          value={q}
          onChange={(e)=> setQ(e.target.value)}
          placeholder="Search tags…"
          style={{ ...inp, maxWidth: 360 }}
        />
        <label style={{ fontSize: 12, color: "#666" }}>Rows</label>
        <select value={limit} onChange={(e)=> setLimit(Number(e.target.value))} style={sel}>
          {[10,20,50,100].map(n => <option key={n} value={n}>{n}</option>)}
        </select>
      </div>

      {/* Table */}
      <div style={{ overflow: "auto", border: "1px solid #eee", borderRadius: 12, background: "#fff" }}>
        <table style={{ width: "100%", fontSize: 14, borderCollapse: "collapse" }}>
          <thead style={{ background: "#f9fafb", textAlign: "left" }}>
            <tr>
              <th style={th}>Name</th>
              <th style={th}>Slug</th>
              <th style={th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td style={td} colSpan={3}>Loading…</td></tr>}
            {!loading && paged.length === 0 && <tr><td style={td} colSpan={3}>&mdash; No tags &mdash;</td></tr>}
            {!loading && paged.map((t) => (
              <tr key={t._id} style={{ borderTop: "1px solid #f0f0f0" }}>
                <td style={td}>
                  {editId === t._id
                    ? <input value={editName} onChange={(e)=>setEditName(e.target.value)} style={inp} />
                    : <strong>{t.name}</strong>}
                </td>
                <td style={td}>
                  {editId === t._id
                    ? <input value={editSlug} onChange={(e)=>setEditSlug(e.target.value)} style={inp} />
                    : <span style={{ color: "#666" }}>{t.slug}</span>}
                </td>
                <td style={td}>
                  {editId === t._id ? (
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={()=>saveEdit(t._id)} style={btnPrimary} type="button">Save</button>
                      <button onClick={cancelEdit} style={btnGhost} type="button">Cancel</button>
                    </div>
                  ) : (
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={()=>startEdit(t)} style={btnGhost} type="button">Edit</button>
                      <button onClick={()=>remove(t._id)} style={btnDanger} type="button">Delete</button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pager */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: 12, color: "#666" }}>Total: {total}</div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button disabled={pageClamped<=1} onClick={()=>setPage(p=>Math.max(1,p-1))} style={btnGhost}>Prev</button>
          <span style={{ fontSize: 13 }}>Page {pageClamped} / {totalPages}</span>
          <button disabled={pageClamped>=totalPages} onClick={()=>setPage(p=>Math.min(totalPages,p+1))} style={btnGhost}>Next</button>
        </div>
      </div>
    </div>
  );
}

/* ---------- styles ---------- */
const inp = {
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid #e5e7eb",
  outline: "none",
  width: "100%",
};
const sel = { ...inp, width: 84, paddingRight: 8 };
const th = { padding: 10, fontWeight: 600, fontSize: 13, borderBottom: "1px solid #eee" };
const td = { padding: 10, verticalAlign: "top" };
const btnBase = {
  padding: "8px 12px",
  borderRadius: 10,
  border: "1px solid #e5e7eb",
  background: "#f8fafc",
  cursor: "pointer",
  fontSize: 13,
};
const btnPrimary = { ...btnBase, background: "#1D9A8E", color: "#fff", borderColor: "#1D9A8E" };
const btnDanger  = { ...btnBase, background: "#fef2f2", borderColor: "#fee2e2", color: "#b91c1c" };
const btnGhost   = { ...btnBase, background: "#fff" };
