// frontend/src/pages/admin/autmotion/XSourcesPage.jsx
import { useEffect, useMemo, useState } from "react";
import { api } from "../../../App.jsx";

const thtd = { borderBottom: "1px solid #e5e7eb", padding: "10px", textAlign: "left" };
const btn = { padding: "8px 12px", border: "1px solid #e5e7eb", background: "#fff", borderRadius: 8, cursor: "pointer" };
const btnPrimary = { ...btn, background: "#1D9A8E", color: "#fff", borderColor: "#1D9A8E" };
const input = { border: "1px solid #e5e7eb", borderRadius: 8, padding: "8px 10px", width: "100%" };

export default function XSourcesPage() {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState({
    handle: "",
    label: "",
    enabled: true,
    defaultAuthor: "Desk",
    defaultCategory: "Politics",
    geoMode: "Global",
    geoAreas: "",
  });
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    const r = await api.get("/api/automation/x/sources");
    setRows(r.data.rows || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function addSource() {
    const payload = {
      handle: form.handle.replace(/^@/, ""),
      label: form.label,
      enabled: form.enabled,
      defaultAuthor: form.defaultAuthor,
      defaultCategory: form.defaultCategory,
      geo: { mode: form.geoMode, areas: form.geoAreas.split(",").map(s=>s.trim()).filter(Boolean) },
    };
    await api.post("/api/automation/x/sources", payload);
    setForm({ ...form, handle: "", label: "" });
    load();
  }

  async function fetchNow(id) {
    await api.post(`/api/automation/x/sources/${id}/fetch`);
    alert("Fetched latest tweets.");
    load();
  }

  async function toggleEnabled(row) {
    await api.patch(`/api/automation/x/sources/${row._id}`, { enabled: !row.enabled });
    load();
  }

  async function del(id) {
    if (!confirm("Delete this handle?")) return;
    await api.delete(`/api/automation/x/sources/${id}`);
    load();
  }

  return (
    <div style={{ padding: 20 }}>
      <h1 style={{ fontSize: 22, marginBottom: 16 }}>Autmotion › X Sources</h1>

      <div style={{ display: "grid", gridTemplateColumns: "200px 200px 160px 200px 200px 120px", gap: 8, marginBottom: 12 }}>
        <input style={input} placeholder="@MEAIndia" value={form.handle} onChange={e=>setForm(f=>({...f, handle:e.target.value}))} />
        <input style={input} placeholder="Label (optional)" value={form.label} onChange={e=>setForm(f=>({...f, label:e.target.value}))} />
        <select style={input} value={form.defaultCategory} onChange={e=>setForm(f=>({...f, defaultCategory:e.target.value}))}>
          <option>Politics</option><option>Economy</option><option>World</option><option>India</option>
        </select>
        <input style={input} placeholder="Author" value={form.defaultAuthor} onChange={e=>setForm(f=>({...f, defaultAuthor:e.target.value}))} />
        <select style={input} value={form.geoMode} onChange={e=>setForm(f=>({...f, geoMode:e.target.value}))}>
          <option>Global</option><option>India</option><option>Targeted</option>
        </select>
        <button style={btnPrimary} onClick={addSource}>Add</button>
      </div>

      {loading ? <div>Loading...</div> : (
        <table style={{ width:"100%", borderCollapse:"collapse" }}>
          <thead>
            <tr>
              <th style={thtd}>Handle</th>
              <th style={thtd}>Label</th>
              <th style={thtd}>Enabled</th>
              <th style={thtd}>Defaults</th>
              <th style={thtd}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r=>(
              <tr key={r._id}>
                <td style={thtd}>@{r.handle}</td>
                <td style={thtd}>{r.label || "-"}</td>
                <td style={thtd}>
                  <button style={btn} onClick={()=>toggleEnabled(r)}>{r.enabled ? "On" : "Off"}</button>
                </td>
                <td style={thtd}>
                  <div>Author: {r.defaultAuthor}</div>
                  <div>Category: {r.defaultCategory}</div>
                  <div>GEO: {r.geo?.mode} {r.geo?.areas?.length ? `(${r.geo.areas.join(", ")})` : ""}</div>
                </td>
                <td style={thtd}>
                  <div style={{display:"flex", gap:8}}>
                    <button style={btn} onClick={()=>fetchNow(r._id)}>Fetch</button>
                    <button style={btn} onClick={()=>del(r._id)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
