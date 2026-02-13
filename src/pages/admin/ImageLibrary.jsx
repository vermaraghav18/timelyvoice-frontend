import { useEffect, useMemo, useRef, useState } from "react";
import { styles } from "../../App.jsx";
import { api } from "../../lib/publicApi.js";
import { getCategoriesCached } from "../../lib/categories.js";
import { useToast } from "../../providers/ToastProvider.jsx";

export default function AdminImageLibrary() {
  const toast = useToast();

  // Upload form state
  const fileRef = useRef(null);
  const [file, setFile] = useState(null);
  const [tags, setTags] = useState("iran,missile,global");
  const [category, setCategory] = useState("world");
  const [priority, setPriority] = useState(10);
  const [isUploading, setIsUploading] = useState(false);

  // Categories (used in both upload + filter)
  const [categories, setCategories] = useState([]);
  const [catsLoading, setCatsLoading] = useState(true);

  // List/Grid state
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);

  const [page, setPage] = useState(1);
  const [limit] = useState(12);

  const [filterTag, setFilterTag] = useState("");
  const [filterCategory, setFilterCategory] = useState("");

  const [listLoading, setListLoading] = useState(false);

  // ✅ Edit modal state
  const [editOpen, setEditOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [editTags, setEditTags] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editPriority, setEditPriority] = useState(10);
  const [editSaving, setEditSaving] = useState(false);

  // ✅ tag preview (plain text)
  const tagsPreviewText = useMemo(() => {
    const arr = String(tags || "")
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)
      .slice(0, 30);
    return arr.join(", ");
  }, [tags]);

  // ✅ button glow when at least one tag exists (UI only)
  const hasAtLeastOneTag = useMemo(() => {
    return String(tags || "")
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean).length > 0;
  }, [tags]);

  // ✅ inject shimmer keyframes once (UI only)
  useEffect(() => {
    const id = "tv-shimmer-style";
    if (document.getElementById(id)) return;
    const style = document.createElement("style");
    style.id = id;
    style.innerHTML = keyframes;
    document.head.appendChild(style);
  }, []);

  // Load categories from existing source
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setCatsLoading(true);
        const list = await getCategoriesCached();
        if (!alive) return;

        const safe = Array.isArray(list) ? list : [];
        setCategories(safe);

        // Keep upload default category stable
        if (!category && safe?.[0]?.slug) setCategory(safe[0].slug);
      } catch (e) {
        console.error("[ImageLibrary] categories load failed:", e);
        toast.push({
          type: "error",
          title: "Categories failed",
          message: "Could not load categories for dropdown.",
        });
      } finally {
        if (alive) setCatsLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const categoryOptions = useMemo(() => {
    return categories
      .map((c) => ({
        slug: String(c?.slug || "").trim(),
        name: String(c?.name || c?.slug || "").trim(),
      }))
      .filter((x) => x.slug);
  }, [categories]);

  async function fetchList(nextPage = page) {
    try {
      setListLoading(true);

      const params = { page: nextPage, limit };

      if (filterCategory) params.category = filterCategory;

      const tag = String(filterTag || "").trim();
      if (tag) params.tag = tag;

      const res = await api.get("/admin/image-library", { params });
      const data = res?.data;

      if (!data?.ok) throw new Error(data?.error || "Failed to load images");

      setItems(Array.isArray(data.items) ? data.items : []);
      setTotal(Number(data.total) || 0);
      setPage(Number(data.page) || nextPage || 1);
    } catch (err) {
      console.error("[ImageLibrary] list fetch failed:", err);
      const msg =
        err?.response?.data?.error ||
        err?.message ||
        "Failed to load image library.";
      toast.push({ type: "error", title: "Load failed", message: msg });
    } finally {
      setListLoading(false);
    }
  }

  useEffect(() => {
    fetchList(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterCategory, filterTag]);

  async function onUpload(e) {
    e?.preventDefault?.();

    if (!file) {
      toast.push({
        type: "warning",
        title: "Select an image",
        message: "Please choose an image file to upload.",
      });
      return;
    }

    try {
      setIsUploading(true);

      const fd = new FormData();
      fd.append("file", file);
      fd.append("tags", tags || "");
      fd.append("category", category || "");
      fd.append("priority", String(priority ?? 0));

      const res = await api.post("/admin/image-library", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const data = res?.data;
      if (!data?.ok) throw new Error(data?.error || "Upload failed");

      toast.push({
        type: "success",
        title: "Uploaded",
        message: "Image uploaded to Cloudinary and saved to Image Library.",
      });

      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
      fetchList(1);
    } catch (err) {
      console.error("[ImageLibrary] upload failed:", err);
      const msg =
        err?.response?.data?.error ||
        err?.message ||
        "Upload failed. Please try again.";
      toast.push({ type: "error", title: "Upload failed", message: msg });
    } finally {
      setIsUploading(false);
    }
  }

  async function onDelete(item) {
    if (!item?._id) return;

    const ok = window.confirm("Delete this image from Image Library (MongoDB)?");
    if (!ok) return;

    const also = window.confirm(
      "Also delete from Cloudinary?\n\n(Only click OK if you REALLY want to remove the file from Cloudinary.)"
    );

    try {
      await api.delete(`/admin/image-library/${item._id}`, {
        params: also ? { deleteFromCloudinary: true } : {},
      });

      toast.push({
        type: "success",
        title: "Deleted",
        message: also
          ? "Deleted from MongoDB and Cloudinary."
          : "Deleted from MongoDB.",
      });

      const remaining = items.length - 1;
      const maxPageAfter = Math.max(1, Math.ceil((total - 1) / limit));
      const nextPage = remaining <= 0 ? Math.min(page, maxPageAfter) : page;
      fetchList(nextPage);
    } catch (err) {
      console.error("[ImageLibrary] delete failed:", err);
      const msg =
        err?.response?.data?.error ||
        err?.message ||
        "Delete failed. Please try again.";
      toast.push({ type: "error", title: "Delete failed", message: msg });
    }
  }

  function copyText(text) {
    const t = String(text || "").trim();
    if (!t) return;

    if (navigator?.clipboard?.writeText) {
      navigator.clipboard
        .writeText(t)
        .then(() =>
          toast.push({
            type: "success",
            title: "Copied",
            message: "publicId copied.",
          })
        )
        .catch(() =>
          toast.push({
            type: "warning",
            title: "Copy failed",
            message: "Could not copy.",
          })
        );
      return;
    }

    try {
      const ta = document.createElement("textarea");
      ta.value = t;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      toast.push({
        type: "success",
        title: "Copied",
        message: "publicId copied.",
      });
    } catch {
      toast.push({
        type: "warning",
        title: "Copy failed",
        message: "Could not copy.",
      });
    }
  }

  function openEdit(it) {
    setEditItem(it);
    setEditTags(Array.isArray(it?.tags) ? it.tags.join(", ") : "");
    setEditCategory(String(it?.category || "").trim());
    setEditPriority(Number(it?.priority) || 0);
    setEditOpen(true);
  }

  function closeEdit() {
    setEditOpen(false);
    setEditItem(null);
    setEditTags("");
    setEditCategory("");
    setEditPriority(10);
    setEditSaving(false);
  }

  async function saveEdit() {
    if (!editItem?._id) return;

    try {
      setEditSaving(true);

      const payload = {
        tags: editTags,
        category: editCategory || "",
        priority: Number(editPriority) || 0,
      };

      const res = await api.patch(`/admin/image-library/${editItem._id}`, payload);
      const data = res?.data;

      if (!data?.ok) throw new Error(data?.error || "Update failed");

      toast.push({
        type: "success",
        title: "Updated",
        message: "Image updated successfully.",
      });

      closeEdit();
      fetchList(page);
    } catch (err) {
      console.error("[ImageLibrary] update failed:", err);
      toast.push({
        type: "error",
        title: "Update failed",
        message: err?.response?.data?.error || err?.message || "Failed to update image.",
      });
    } finally {
      setEditSaving(false);
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div style={styles.page}>
      {/* header intentionally empty (you removed the title/subtitle) */}
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: 12,
        }}
      />

      <div style={{ height: 12 }} />

      {/* ✅ Upload form (Stripe + Apple style) */}
      <div style={uploadWrapStyle}>
        <h3 style={sectionTitleStyle}>Upload Image to Library</h3>

        <form onSubmit={onUpload}>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            style={{ display: "none" }}
          />

          <div style={fieldLabelStyle}>Image</div>
          <div style={dropzoneStyle}>
            {!file ? <div style={shimmerOverlayStyle} /> : null}

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 4,
                minWidth: 0,
                position: "relative",
                zIndex: 1,
              }}
            >
              <div
                style={{
                  fontWeight: 900,
                  color: "#061026",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {file ? file.name : "Choose an image to upload"}
              </div>
              <div style={{ fontSize: 12, opacity: 0.78, color: "#0b2455" }}>
                {file
                  ? `${Math.round((file.size || 0) / 1024)} KB`
                  : "PNG, JPG, WEBP — single file"}
              </div>
            </div>

            <div
              style={{
                display: "flex",
                gap: 10,
                flexWrap: "wrap",
                position: "relative",
                zIndex: 1,
              }}
            >
              <button
                type="button"
                style={selectBtnStyle}
                onClick={() => fileRef.current?.click()}
              >
                Select file
              </button>

              {file ? (
                <button
                  type="button"
                  style={ghostBtnStyle}
                  onClick={() => {
                    setFile(null);
                    if (fileRef.current) fileRef.current.value = "";
                  }}
                >
                  Remove
                </button>
              ) : null}
            </div>
          </div>

          <div style={{ height: 14 }} />

          <div style={fieldLabelStyle}>Tags</div>
          <input
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="e.g. iran, missile, global"
            style={luxuryInputStyle}
          />

          {/* ✅ plain-text preview (no pills) */}
          {tagsPreviewText ? (
            <div style={tagsPreviewTextStyle}>{tagsPreviewText}</div>
          ) : null}

          <div style={{ height: 16 }} />

          <button
            type="submit"
            disabled={!file || isUploading}
            style={{
              ...(hasAtLeastOneTag ? uploadReadyBtnStyle : uploadIdleBtnStyle),
              cursor: !file || isUploading ? "not-allowed" : "pointer",
              filter: !file || isUploading
                ? "grayscale(0.25) brightness(0.85)"
                : "none",
            }}
          >
            {isUploading ? "Uploading..." : "Upload"}
          </button>
        </form>
      </div>

      <div style={{ height: 14 }} />

      {/* ✅ Library (Apple luxury white) */}
      <div style={libraryWrapStyle}>
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <h3 style={{ marginTop: 0, marginBottom: 0, fontWeight: 900, color: "#0b1220" }}>
            Library
          </h3>
          <div style={{ opacity: 0.8, fontSize: 13, color: "#0b1220" }}>
            Total: <b>{total}</b>
          </div>
        </div>

        <div style={{ height: 12 }} />

        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
          <div>
            <div style={fieldLabelStyle}>Filter by tag</div>
            <input
              type="text"
              value={filterTag}
              onChange={(e) => setFilterTag(e.target.value)}
              placeholder="e.g. iran"
              style={libraryInputStyle}
            />
          </div>

          {/* ✅ HIDDEN: Filter by category (logic unchanged) */}
          <div style={{ display: "none" }}>
            <div style={fieldLabelStyle}>Filter by category</div>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              style={librarySelectStyle}
              disabled={catsLoading}
            >
              <option value="">All</option>
              {categoryOptions.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ height: 14 }} />

        {listLoading ? (
          <div style={{ opacity: 0.85, color: "#0b1220" }}>Loading…</div>
        ) : items.length === 0 ? (
          <div style={{ opacity: 0.85, color: "#0b1220" }}>No images found.</div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
              gap: 14,
            }}
          >
            {items.map((it) => {
              const tagsText = Array.isArray(it.tags)
                ? it.tags.map((t) => String(t || "").trim()).filter(Boolean).join(", ")
                : "";

              return (
                <div key={it._id} style={itemCardStyle}>
                  {/* ✅ EDGE-TO-EDGE IMAGE (no inner container, no radius) */}
                  <img
                    src={it.url}
                    alt={it.publicId}
                    style={itemImageStyle}
                    loading="lazy"
                  />

                  <div style={itemBodyStyle}>
                    {/* ✅ HIDDEN: Category + Priority (logic unchanged) */}
                    <div style={{ display: "none" }}>
                      <div style={metaRowStyle}>
                        <div style={metaLineStyle}>
                          <span style={metaLabelStyle}>Category</span>
                          <span style={metaValueStyle}>{it.category || "-"}</span>
                        </div>
                        <div style={metaLineStyle}>
                          <span style={metaLabelStyle}>Priority</span>
                          <span style={metaValueStyle}>{Number(it.priority) || 0}</span>
                        </div>
                      </div>
                    </div>

                    <div style={{ height: 2 }} />

                    {/* ✅ Tags as plain text (comma-separated, less bold) */}
                    <div style={tagsLineStyle}>
                      <div style={metaLabelStyle}>Tags</div>
                      <div style={{ height: 6 }} />
                      <div style={tagsPlainTextStyle}>{tagsText ? tagsText : "-"}</div>
                    </div>

                    <div style={{ height: 12 }} />

                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                      <button
                        type="button"
                        style={actionPillStyle}
                        onClick={() => copyText(it.publicId)}
                        title="Copy publicId"
                      >
                        Copy publicId
                      </button>

                      <a
                        href={it.url}
                        target="_blank"
                        rel="noreferrer"
                        style={{ ...actionPillStyle, textDecoration: "none" }}
                        title="Open image"
                      >
                        Open
                      </a>

                      <button
                        type="button"
                        style={editGlowBtnStyle}
                        onClick={() => openEdit(it)}
                        title="Edit tags/category/priority"
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        style={dangerPillStyle}
                        onClick={() => onDelete(it)}
                        title="Delete"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div style={{ height: 16 }} />

        {/* Pagination */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div style={{ opacity: 0.8, fontSize: 13, color: "#0b1220" }}>
            Page <b>{page}</b> / <b>{totalPages}</b>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button
              type="button"
              style={actionPillStyle}
              disabled={page <= 1 || listLoading}
              onClick={() => fetchList(page - 1)}
            >
              Prev
            </button>
            <button
              type="button"
              style={actionPillStyle}
              disabled={page >= totalPages || listLoading}
              onClick={() => fetchList(page + 1)}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* ✅ Edit Modal (logic unchanged; styling unchanged) */}
      {editOpen && (
        <div style={modalOverlayStyle} onClick={closeEdit}>
          <div style={modalCardStyle} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0 }}>Edit Image</h3>
              <button type="button" style={miniBtnStyle} onClick={closeEdit}>
                ✕
              </button>
            </div>

            <div style={{ height: 10 }} />

            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.9)" }}>
              <b>publicId:</b> {editItem?.publicId || "-"}
            </div>

            <div style={{ height: 14 }} />

            <label style={labelStyle}>Tags (comma separated)</label>
            <input
              value={editTags}
              onChange={(e) => setEditTags(e.target.value)}
              placeholder="e.g. parliament, debate, budget"
              style={inputStyle}
            />

            <div style={{ height: 12 }} />

            <label style={labelStyle}>Category</label>
            <select
              value={editCategory}
              onChange={(e) => setEditCategory(e.target.value)}
              style={inputStyle}
              disabled={catsLoading}
            >
              <option value="">(empty)</option>
              {catsLoading ? (
                <option value="">Loading categories…</option>
              ) : (
                categoryOptions.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.name}
                  </option>
                ))
              )}
            </select>

            <div style={{ height: 12 }} />

            <label style={labelStyle}>Priority</label>
            <input
              type="number"
              value={editPriority}
              onChange={(e) => setEditPriority(e.target.value)}
              style={inputStyle}
              min={0}
            />

            <div style={{ height: 16 }} />

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button type="button" style={miniBtnStyle} onClick={closeEdit} disabled={editSaving}>
                Cancel
              </button>
              <button
                type="button"
                style={{ ...miniBtnStyle, borderColor: "rgba(80,200,120,0.45)" }}
                onClick={saveEdit}
                disabled={editSaving}
              >
                {editSaving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* =========================
   EXISTING DARK INPUTS (modal)
   ========================= */
const labelStyle = { fontSize: 13, opacity: 0.8, marginBottom: 6 };

const inputStyle = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid rgba(255,255,255,0.18)",
  background: "#0f223b",
  color: "#ffffff",
  outline: "none",
};

const miniBtnStyle = {
  padding: "8px 10px",
  borderRadius: 10,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(255,255,255,0.06)",
  color: "inherit",
  fontWeight: 700,
  fontSize: 12,
  cursor: "pointer",
};

/* =========================
   MODAL
   ========================= */
const modalOverlayStyle = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.6)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 9999,
  padding: 16,
};

const modalCardStyle = {
  width: "min(720px, 96vw)",
  borderRadius: 16,
  border: "1px solid rgba(255,255,255,0.18)",
  background: "#0b1626",
  padding: 18,
  boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
  color: "#ffffff",
};

/* =========================
   UPLOAD (Stripe + Apple)
   ========================= */
const uploadWrapStyle = {
  background:
    "radial-gradient(1200px 250px at 20% 0%, rgba(59,130,246,0.10), rgba(255,255,255,0.72)), rgba(255,255,255,0.72)",
  border: "1px solid rgba(15, 23, 42, 0.10)",
  borderRadius: 0, // ✅ zero rounded corners
  padding: 18,
  boxShadow: "0 12px 34px rgba(2,6,23,0.06)",
};

const sectionTitleStyle = { marginTop: 0, marginBottom: 14, fontWeight: 900 };

const fieldLabelStyle = {
  fontSize: 12,
  opacity: 0.78,
  marginBottom: 8,
  fontWeight: 800,
  color: "#0b1220",
};

const luxuryInputStyle = {
  width: "100%",
  padding: "12px 12px",
  borderRadius: 14,
  border: "1px solid rgba(15, 23, 42, 0.12)",
  background: "rgba(255,255,255,0.92)",
  color: "#0b1220",
  outline: "none",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.65)",
};

const tagsPreviewTextStyle = {
  marginTop: 10,
  fontSize: 13,
  fontWeight: 500,
  color: "rgba(11,18,32,0.78)",
  lineHeight: 1.45,
};

const dropzoneStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  padding: 14,
  borderRadius: 0, // ✅ zero rounded corners
  border: "1px dashed rgba(59,130,246,0.55)",
  background:
    "linear-gradient(120deg, rgba(0,102,255,0.18), rgba(0,153,255,0.10), rgba(255,255,255,0.72))",
  position: "relative",
  overflow: "hidden",
  boxShadow: "0 12px 28px rgba(0,102,255,0.12)",
};

const shimmerOverlayStyle = {
  position: "absolute",
  inset: -40,
  background:
    "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(147,197,253,0.55) 45%, rgba(255,255,255,0) 70%)",
  transform: "skewX(-18deg) translateX(-35%)",
  animation: "tvShimmer 2.2s infinite",
  pointerEvents: "none",
};

const selectBtnStyle = {
  padding: "10px 12px",
  borderRadius: 0, // ✅ zero rounded corners
  border: "1px solid rgba(2,6,23,0.10)",
  background: "rgba(255,255,255,0.95)",
  color: "#0b1220",
  fontWeight: 900,
  cursor: "pointer",
  boxShadow: "0 8px 18px rgba(2,6,23,0.08)",
};

const ghostBtnStyle = {
  padding: "10px 12px",
  borderRadius: 0, // ✅ zero rounded corners
  border: "1px solid rgba(2,6,23,0.10)",
  background: "rgba(255,255,255,0.70)",
  color: "#0b1220",
  fontWeight: 900,
  cursor: "pointer",
};

const uploadIdleBtnStyle = {
  padding: "12px 16px",
  borderRadius: 0, // ✅ zero rounded corners
  border: "1px solid rgba(2,6,23,0.10)",
  background: "rgba(2,6,23,0.10)",
  color: "rgba(2,6,23,0.55)",
  fontWeight: 900,
  letterSpacing: 0.2,
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.6)",
};

const uploadReadyBtnStyle = {
  padding: "12px 16px",
  borderRadius: 0, // ✅ zero rounded corners
  border: "1px solid rgba(0,153,255,0.85)",
  background:
    "linear-gradient(135deg, rgba(0, 92, 255, 1) 0%, rgba(0, 153, 255, 1) 55%, rgba(0, 255, 200, 0.85) 120%)",
  color: "#ffffff",
  fontWeight: 950,
  letterSpacing: 0.2,
  boxShadow:
    "0 18px 40px rgba(0,92,255,0.55), 0 0 0 5px rgba(0,153,255,0.18), inset 0 1px 0 rgba(255,255,255,0.22)",
  textShadow: "0 1px 1px rgba(0,0,0,0.22)",
};

/* =========================
   LIBRARY (Apple luxury white)
   ========================= */
const libraryWrapStyle = {
  background:
    "linear-gradient(180deg, rgba(255,255,255,0.92), rgba(248,250,252,0.92))",
  border: "1px solid rgba(15, 23, 42, 0.10)",
  borderRadius: 0, // ✅ zero rounded corners
  padding: 18,
  boxShadow: "0 12px 34px rgba(2,6,23,0.06)",
};

const libraryInputStyle = {
  width: "100%",
  padding: "12px 12px",
  borderRadius: 0, // ✅ zero rounded corners
  border: "1px solid rgba(15, 23, 42, 0.12)",
  background: "rgba(255,255,255,0.94)",
  color: "#0b1220",
  outline: "none",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.75)",
};

const librarySelectStyle = {
  ...libraryInputStyle,
  appearance: "auto",
};

const itemCardStyle = {
  borderRadius: 0, // ✅ zero rounded corners
  overflow: "hidden",
  border: "1px solid rgba(15, 23, 42, 0.10)",
  background: "rgba(255,255,255,0.92)",
  boxShadow: "0 14px 34px rgba(2,6,23,0.07)",
};

const itemImageStyle = {
  width: "100%",
  height: 200,
  objectFit: "cover",
  display: "block",
  borderRadius: 0,
};

const itemBodyStyle = {
  padding: 14,
  color: "#0b1220",
};

const metaRowStyle = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 10,
};

const metaLineStyle = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
};

const metaLabelStyle = {
  fontSize: 11,
  fontWeight: 900,
  letterSpacing: 0.25,
  textTransform: "uppercase",
  opacity: 0.55,
};

const metaValueStyle = {
  fontSize: 14,
  fontWeight: 900,
  color: "#0b1220",
};

const tagsLineStyle = {
  borderTop: "1px solid rgba(15,23,42,0.08)",
  paddingTop: 12,
};

const tagsPlainTextStyle = {
  fontSize: 13,
  fontWeight: 500, // ✅ less bold
  color: "rgba(11,18,32,0.78)",
  lineHeight: 1.45,
  wordBreak: "break-word",
};

/* ✅ IMPORTANT: actionPillStyle MUST be above editGlowBtnStyle */
const actionPillStyle = {
  padding: "10px 12px",
  borderRadius: 0, // ✅ zero rounded corners
  border: "1px solid rgba(15, 23, 42, 0.12)",
  background: "rgba(255,255,255,0.92)",
  color: "#0b1220",
  fontWeight: 900,
  fontSize: 12,
  cursor: "pointer",
  boxShadow: "0 10px 22px rgba(2,6,23,0.06)",
};

/* ✅ Edit button: light yellow + deep glowing border */
const editGlowBtnStyle = {
  ...actionPillStyle,
  background: "rgba(255, 245, 180, 0.95)", // light yellow fill
  color: "#2a2000",
  border: "1px solid rgba(255, 200, 0, 0.85)", // thin deep yellow border
  boxShadow:
    "0 10px 22px rgba(255, 200, 0, 0.22), 0 0 0 3px rgba(255, 200, 0, 0.18), 0 0 18px rgba(255, 190, 0, 0.35)",
};

const dangerPillStyle = {
  ...actionPillStyle,
  border: "1px solid rgba(239, 68, 68, 0.35)",
  background: "rgba(239, 68, 68, 0.08)",
  color: "#991b1b",
};

/* =========================
   KEYFRAMES
   ========================= */
const keyframes = `
@keyframes tvShimmer {
  0%   { transform: skewX(-18deg) translateX(-65%); opacity: 0.55; }
  50%  { opacity: 0.95; }
  100% { transform: skewX(-18deg) translateX(65%); opacity: 0.55; }
}
`;
