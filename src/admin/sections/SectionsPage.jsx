// frontend/src/admin/sections/SectionsPage.jsx
import { useEffect, useMemo, useState } from "react";
import { listSections, createSection, updateSection, deleteSection } from "./sections.api.js";
import SectionForm from "./SectionForm.jsx";

export default function SectionsPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  // Create modal
  const [showCreate, setShowCreate] = useState(false);

  // Edit modal
  const [showEdit, setShowEdit] = useState(false);
  const [editRow, setEditRow] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const data = await listSections();
      setRows(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  /* -----------------------------
   * Helpers
   * --------------------------- */
  function buildPayload(data) {
    // Defensive normalization so custom/side/target are preserved and numbers are coerced
    const custom = data.custom ?? {};
    return {
      title: data.title || "",
      slug: data.slug || "",
      template: data.template || "",
      capacity: Number(data.capacity ?? 0),

      // 🔑 KEEP THESE KEYS
      side: data.side ?? "", // "left" | "right" | ""
      custom: {
        ...custom,
        ...(custom.afterNth !== "" && custom.afterNth != null ? { afterNth: Number(custom.afterNth) } : {}),
        ...(custom.startAfter != null ? { startAfter: Number(custom.startAfter) } : {}),
        ...(custom.containerMax != null ? { containerMax: Number(custom.containerMax) } : {}),
        ...(custom.heroImgHeight != null ? { heroImgHeight: Number(custom.heroImgHeight) } : {}),
        ...(custom.tileMinHeight != null ? { tileMinHeight: Number(custom.tileMinHeight) } : {}),
      },
      target: data.target || { type: "", value: "" }, // e.g., { type: "category", value: "sports" }
      feed: data.feed || { mode: "auto" },
      pins: Array.isArray(data.pins) ? data.pins : [],
      moreLink: data.moreLink || "",
      placementIndex: Number(data.placementIndex ?? 0),
      enabled: Boolean(data.enabled),
    };
  }

  /* -----------------------------
   * CREATE
   * --------------------------- */
  async function handleCreate(data) {
    const payload = buildPayload(data);
    await createSection(payload);
    setShowCreate(false);
    await load();
  }

  /* -----------------------------
   * EDIT
   * --------------------------- */
  function openEdit(row) {
    setEditRow(row || null);
    setShowEdit(true);
  }

  async function handleEditSubmit(data) {
    if (!editRow?._id) return;
    const payload = buildPayload(data);
    await updateSection(editRow._id, payload);
    setShowEdit(false);
    setEditRow(null);
    await load();
  }

  /* -----------------------------
   * ENABLE / DISABLE
   * --------------------------- */
  async function toggleEnabled(row) {
    if (!row?._id) return;
    await updateSection(row._id, { enabled: !row.enabled });
    await load();
  }

  /* -----------------------------
   * ORDER UP/DOWN
   * --------------------------- */
  async function move(row, dir) {
    const sorted = [...rows].sort((a, b) => (a.placementIndex ?? 0) - (b.placementIndex ?? 0));
    const idx = sorted.findIndex((r) => r._id === row._id);
    const swapIdx = idx + dir;
    if (idx < 0 || swapIdx < 0 || swapIdx >= sorted.length) return;

    const a = sorted[idx];
    const b = sorted[swapIdx];

    await updateSection(a._id, { placementIndex: b.placementIndex ?? 0 });
    await updateSection(b._id, { placementIndex: a.placementIndex ?? 0 });
    await load();
  }

  /* -----------------------------
   * DELETE
   * --------------------------- */
  async function removeRow(row) {
    if (!row?._id) return;
    if (!confirm(`Delete section "${row.title || row.slug}"?`)) return;
    await deleteSection(row._id);
    await load();
  }

  /* -----------------------------
   * TABLE
   * --------------------------- */
  const body = useMemo(() => {
    if (loading) return <p>Loading…</p>;
    if (!rows.length) return <p>No sections yet.</p>;

    const sorted = [...rows].sort((a, b) => (a.placementIndex ?? 0) - (b.placementIndex ?? 0));

    return (
      <table className="w-full border text-sm">
        <thead>
          <tr className="bg-gray-50">
            <th className="text-left p-2 border">Order</th>
            <th className="text-left p-2 border">Title</th>
            <th className="text-left p-2 border">Template</th>
            <th className="text-left p-2 border">Capacity</th>
            <th className="text-left p-2 border">Target</th>
            <th className="text-left p-2 border">Side</th>
            <th className="text-left p-2 border">After&nbsp;Nth</th>
            <th className="text-left p-2 border">Skip&nbsp;N</th>
            <th className="text-left p-2 border">Hero&nbsp;H / Tile&nbsp;H / Max&nbsp;W</th>
            <th className="text-left p-2 border">More</th>
            <th className="text-left p-2 border">Enabled</th>
            <th className="text-left p-2 border">Actions</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((r, i) => (
            <tr key={r._id || r.slug || i}>
              <td className="p-2 border">
                <div className="flex gap-1">
                  <button
                    className="px-2 py-1 border rounded"
                    onClick={() => move(r, -1)}
                    disabled={i === 0}
                    title="Move up"
                  >
                    ↑
                  </button>
                  <button
                    className="px-2 py-1 border rounded"
                    onClick={() => move(r, +1)}
                    disabled={i === sorted.length - 1}
                    title="Move down"
                  >
                    ↓
                  </button>
                </div>
              </td>

              <td className="p-2 border">
                <div className="font-medium">{r.title || "(untitled)"}</div>
                <div className="text-gray-500">{r.slug}</div>
              </td>

              <td className="p-2 border">{r.template}</td>
              <td className="p-2 border">{r.capacity}</td>

              <td className="p-2 border">
                {r.target?.type} → {r.target?.value}
              </td>

              <td className="p-2 border">{r.side || "—"}</td>

              <td className="p-2 border">{r.custom?.afterNth ?? "—"}</td>

              <td className="p-2 border">
                {typeof r.custom?.startAfter === "number" ? r.custom.startAfter : "—"}
              </td>

              <td className="p-2 border text-xs">
                {[
                  r.custom?.heroImgHeight ? `H:${r.custom.heroImgHeight}` : null,
                  r.custom?.tileMinHeight ? `tH:${r.custom.tileMinHeight}` : null,
                  r.custom?.containerMax ? `W:${r.custom.containerMax}` : null,
                ]
                  .filter(Boolean)
                  .join(" ") || "—"}
              </td>

              <td className="p-2 border">{r.moreLink || "—"}</td>

              <td className="p-2 border">
                <button
                  className={`px-2 py-1 rounded ${
                    r.enabled ? "bg-green-600 text-white" : "bg-gray-200"
                  }`}
                  onClick={() => toggleEnabled(r)}
                >
                  {r.enabled ? "On" : "Off"}
                </button>
              </td>

              <td className="p-2 border">
                {/* 🔵 Edit button */}
                <button
                  className="px-2 py-1 border rounded mr-2"
                  onClick={() => openEdit(r)}
                  title="Edit section"
                >
                  Edit
                </button>

                <button
                  className="px-2 py-1 border rounded"
                  onClick={() => removeRow(r)}
                  title="Delete section"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }, [rows, loading]);

  /* -----------------------------
   * RENDER
   * --------------------------- */
  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Sections</h1>
        <button
          className="px-3 py-2 rounded bg-black text-white"
          onClick={() => setShowCreate(true)}
        >
          + New Section
        </button>
      </div>

      {body}

      {/* CREATE MODAL */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-4 w-[640px] max-w-[95vw]">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-medium">Create Section</h2>
              <button onClick={() => setShowCreate(false)} className="px-2 py-1">
                ✕
              </button>
            </div>

            <SectionForm key="create" onSubmit={handleCreate} onCancel={() => setShowCreate(false)} />
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {showEdit && editRow && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-4 w-[640px] max-w-[95vw]">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-medium">Edit Section</h2>
              <button
                onClick={() => {
                  setShowEdit(false);
                  setEditRow(null);
                }}
                className="px-2 py-1"
              >
                ✕
              </button>
            </div>

            <SectionForm
              key={editRow._id || editRow.slug || "edit"}
              initial={{
                title: editRow.title || "",
                slug: editRow.slug || "",
                template: editRow.template || "",
                capacity: editRow.capacity ?? 0,
                side: editRow.side ?? "",
                custom: editRow.custom ?? {},
                target: editRow.target || { type: "", value: "" },
                feed: editRow.feed || { mode: "auto" },
                pins: Array.isArray(editRow.pins) ? editRow.pins : [],
                moreLink: editRow.moreLink || "",
                placementIndex: editRow.placementIndex ?? 0,
                enabled: !(editRow.enabled === false),
              }}
              onSubmit={handleEditSubmit}
              onCancel={() => {
                setShowEdit(false);
                setEditRow(null);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
