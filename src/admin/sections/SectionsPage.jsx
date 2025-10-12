import { useEffect, useMemo, useState } from "react";
import { listSections, createSection, updateSection, deleteSection } from "./sections.api.js";
import SectionForm from "./SectionForm.jsx";

export default function SectionsPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  async function load() {
    setLoading(true);
    try { setRows(await listSections()); } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  async function handleCreate(data) {
  // Build an explicit payload so custom/side never get dropped
  const payload = {
    title: data.title,
    slug: data.slug,
    template: data.template,
    capacity: data.capacity,

    // 🔑 keep these — backend needs them
    side: data.side ?? "",
    custom: data.custom ?? {},

    target: data.target,
    feed: data.feed,
    pins: data.pins,
    moreLink: data.moreLink,
    placementIndex: data.placementIndex,
    enabled: data.enabled,
    
  };

  // One-time debug: verify we're sending custom
  console.log("DEBUG create payload:", payload);

  await createSection(payload);
  setShowCreate(false);
  await load();
}


  async function toggleEnabled(row) {
    if (!row._id) return;
    await updateSection(row._id, { enabled: !row.enabled });
    await load();
  }

  async function move(row, dir) {
    const sorted = [...rows].sort((a,b)=>a.placementIndex-b.placementIndex);
    const idx = sorted.findIndex(r => r._id === row._id);
    const swapIdx = idx + dir;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;
    const a = sorted[idx], b = sorted[swapIdx];
    await updateSection(a._id, { placementIndex: b.placementIndex });
    await updateSection(b._id, { placementIndex: a.placementIndex });
    await load();
  }

  async function removeRow(row) {
    if (!row._id) return;
    if (!confirm(`Delete section "${row.title}"?`)) return;
    await deleteSection(row._id);
    await load();
  }

  const body = useMemo(() => {
    if (loading) return <p>Loading…</p>;
    if (!rows.length) return <p>No sections yet.</p>;
    const sorted = [...rows].sort((a,b)=>a.placementIndex - b.placementIndex);

    return (
      <table className="w-full border text-sm">
        <thead>
          <tr className="bg-gray-50">
            <th className="text-left p-2 border">Order</th>
            <th className="text-left p-2 border">Title</th>
            <th className="text-left p-2 border">Template</th>
            <th className="text-left p-2 border">Capacity</th>
            <th className="text-left p-2 border">Target</th>
            <th className="text-left p-2 border">More</th>
            <th className="text-left p-2 border">Enabled</th>
            <th className="text-left p-2 border">Actions</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((r, i) => (
            <tr key={r._id || r.slug}>
              <td className="p-2 border">
                <div className="flex gap-1">
                  <button className="px-2 py-1 border rounded" onClick={()=>move(r, -1)} disabled={i===0}>↑</button>
                  <button className="px-2 py-1 border rounded" onClick={()=>move(r, +1)} disabled={i===sorted.length-1}>↓</button>
                </div>
              </td>
              <td className="p-2 border">{r.title}</td>
              <td className="p-2 border">{r.template}</td>
              <td className="p-2 border">{r.capacity}</td>
              <td className="p-2 border">{r.target?.type} → {r.target?.value}</td>
              <td className="p-2 border">{r.moreLink}</td>
              <td className="p-2 border">
                <button className={`px-2 py-1 rounded ${r.enabled ? "bg-green-600 text-white" : "bg-gray-200"}`}
                  onClick={()=>toggleEnabled(r)}>
                  {r.enabled ? "On" : "Off"}
                </button>
              </td>
              <td className="p-2 border">
                <button className="px-2 py-1 border rounded" onClick={()=>removeRow(r)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }, [rows, loading]);

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Homepage Sections</h1>
        <button className="px-3 py-2 rounded bg-black text-white" onClick={()=>setShowCreate(true)}>+ New Section</button>
      </div>

      {body}

      {showCreate && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center">
          <div className="bg-white rounded-xl p-4 w-[640px] max-w-[95vw]">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-medium">Create Section</h2>
              <button onClick={()=>setShowCreate(false)} className="px-2 py-1">✕</button>
            </div>
            <SectionForm
              onSubmit={handleCreate}
              onCancel={()=>setShowCreate(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
