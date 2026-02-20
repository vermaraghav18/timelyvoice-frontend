// src/pages/admin/ImageLibrary.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { styles } from "../../App.jsx";
import { api } from "../../lib/publicApi.js";
import { getCategoriesCached } from "../../lib/categories.js";
import { useToast } from "../../providers/ToastProvider.jsx";

export default function AdminImageLibrary() {
  const toast = useToast();

  // Upload form state
  const fileRef = useRef(null);
  const [files, setFiles] = useState([]); // ✅ multi upload
  const [tags, setTags] = useState("");
  const [category, setCategory] = useState("world");
  const [priority, setPriority] = useState(10);
  const [isUploading, setIsUploading] = useState(false);

  // Categories (used in both upload + filter)
  const [categories, setCategories] = useState([]);
  const [catsLoading, setCatsLoading] = useState(true);

  // List/Grid state + infinite scroll
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);

  const [page, setPage] = useState(1);
  const [limit] = useState(18);
  const [hasMore, setHasMore] = useState(true);

  const [filterTag, setFilterTag] = useState("");
  const [filterCategory, setFilterCategory] = useState("");

  const [listLoading, setListLoading] = useState(false);
  const loadingRef = useRef(false);
  const sentinelRef = useRef(null);

  // ✅ Edit modal state
  const [editOpen, setEditOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [editTags, setEditTags] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editPriority, setEditPriority] = useState(10);
  const [editSaving, setEditSaving] = useState(false);

  // ✅ Google Drive picker state (selection behaves like local files)
  const [driveOpen, setDriveOpen] = useState(false);
  const [driveLoading, setDriveLoading] = useState(false);
  const [driveFiles, setDriveFiles] = useState([]);
  const [driveQuery, setDriveQuery] = useState("");
  const [driveSelected, setDriveSelected] = useState(() => new Set());

  const openDrivePicker = async () => {
    try {
      setDriveLoading(true);
      setDriveOpen(true);
      setDriveQuery("");
      setDriveSelected(new Set());

      const res = await api.get("/admin/image-library/drive/files");
      const data = res?.data;
      if (!data?.ok) throw new Error(data?.error || "Failed to load Drive files");

      setDriveFiles(Array.isArray(data.files) ? data.files : []);
    } catch (e) {
      console.error("[ImageLibrary] drive list failed:", e);
      toast.push({
        type: "error",
        title: "Drive failed",
        message: e?.response?.data?.error || e?.message || "Could not load Drive images.",
      });
      setDriveOpen(false);
    } finally {
      setDriveLoading(false);
    }
  };

  const closeDrivePicker = () => setDriveOpen(false);

  const toggleDriveSelect = (id) => {
    setDriveSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // ✅ Apply selection: close modal, keep fileIds ready for Upload button
  const applyDriveSelection = () => {
    // If user picked from Drive, clear local input to avoid confusion
    setFiles([]);
    if (fileRef.current) fileRef.current.value = "";
    setDriveOpen(false);
  };

  const clearAllSelections = () => {
    setFiles([]);
    if (fileRef.current) fileRef.current.value = "";
    setDriveSelected(new Set());
  };

  // ✅ tags preview as plain text (upload UI)
  const tagsPreviewText = useMemo(() => {
    const arr = String(tags || "")
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)
      .slice(0, 30);
    return arr.join(", ");
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

  // Load categories
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setCatsLoading(true);
        const list = await getCategoriesCached();
        if (!alive) return;

        const safe = Array.isArray(list) ? list : [];
        setCategories(safe);

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

  // ✅ Fetch one page and append (infinite scroll)
  async function fetchPage(nextPage, { replace = false } = {}) {
    if (loadingRef.current) return;
    if (!hasMore && !replace) return;

    loadingRef.current = true;
    setListLoading(true);

    try {
      const params = { page: nextPage, limit };

      if (filterCategory) params.category = filterCategory;

      const tag = String(filterTag || "").trim();
      if (tag) params.tag = tag;

      const res = await api.get("/admin/image-library", { params });
      const data = res?.data;

      if (!data?.ok) throw new Error(data?.error || "Failed to load images");

      const newItems = Array.isArray(data.items) ? data.items : [];
      const newTotal = Number(data.total) || 0;

      setTotal(newTotal);
      setPage(Number(data.page) || nextPage || 1);

      setItems((prev) => {
        if (replace) return newItems;

        const seen = new Set(prev.map((x) => x?._id));
        const merged = [...prev];
        for (const it of newItems) {
          if (!seen.has(it?._id)) merged.push(it);
        }
        return merged;
      });

      // best-effort hasMore
      const prevCount = replace ? 0 : items.length;
      const loadedCount = prevCount + newItems.length;
      const more = newItems.length > 0 && (newTotal ? loadedCount < newTotal : true);

      setHasMore(more);
    } catch (err) {
      console.error("[ImageLibrary] list fetch failed:", err);
      const msg =
        err?.response?.data?.error ||
        err?.message ||
        "Failed to load image library.";
      toast.push({ type: "error", title: "Load failed", message: msg });
    } finally {
      setListLoading(false);
      loadingRef.current = false;
    }
  }

  // Reset list on filters change
  useEffect(() => {
    setItems([]);
    setTotal(0);
    setPage(1);
    setHasMore(true);
    fetchPage(1, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterCategory, filterTag]);

  // Infinite scroll observer
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;

    const obs = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (!first?.isIntersecting) return;
        if (listLoading) return;
        if (!hasMore) return;
        fetchPage(page + 1, { replace: false });
      },
      { root: null, rootMargin: "800px 0px", threshold: 0.01 }
    );

    obs.observe(el);
    return () => obs.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, hasMore, listLoading, filterCategory, filterTag]);

  // ✅ Upload button: either local upload OR drive import (with same tags input)
  async function onUpload(e) {
    e?.preventDefault?.();

    const localCount = Array.isArray(files) ? files.length : 0;
    const driveCount = driveSelected?.size || 0;

    if (localCount === 0 && driveCount === 0) {
      toast.push({
        type: "warning",
        title: "Select images",
        message: "Please choose images from PC or Google Drive.",
      });
      return;
    }

    try {
      setIsUploading(true);

      // ✅ CASE 1: Local upload (existing behavior)
      if (localCount > 0) {
        const fd = new FormData();
        for (const f of files) fd.append("files", f);

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
          message: `${localCount} image(s) uploaded to Cloudinary and saved to Image Library.`,
        });

        setFiles([]);
        if (fileRef.current) fileRef.current.value = "";
        setTags("");
      } else {
        // ✅ CASE 2: Drive import (NEW behavior)
        const ids = Array.from(driveSelected || []);
        const payload = {
          fileIds: ids,
          tags: tags || "",
          category: category || "",
          priority: Number(priority) || 0,
        };

        const res = await api.post("/admin/image-library/drive/import", payload, {
  timeout: 120000, // ✅ allow enough time for Drive download + Cloudinary upload
});

        const data = res?.data;
        if (!data?.ok) throw new Error(data?.error || "Drive import failed");

        toast.push({
          type: "success",
          title: "Imported",
          message: `${ids.length} image(s) imported from Drive and saved to Image Library.`,
        });

        setDriveSelected(new Set());
        setTags("");
      }

      // refresh list from page 1
      setItems([]);
      setTotal(0);
      setPage(1);
      setHasMore(true);
      fetchPage(1, { replace: true });
    } catch (err) {
      console.error("[ImageLibrary] upload/import failed:", err);
     const apiErr = err?.response?.data;
const msg =
  apiErr?.error ||
  (Array.isArray(apiErr?.failed) && apiErr.failed[0]?.error
    ? apiErr.failed[0].error
    : null) ||
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
        message: also ? "Deleted from MongoDB and Cloudinary." : "Deleted from MongoDB.",
      });

      setItems((prev) => prev.filter((x) => x?._id !== item._id));
      setTotal((t) => Math.max(0, Number(t || 0) - 1));
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
            message: "Image URL copied.",
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
        message: "Image URL copied.",
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
  const rawTags = it?.tags;

  const tagsText = Array.isArray(rawTags)
    ? rawTags.map((t) => String(t || "").trim()).filter(Boolean).join(", ")
    : typeof rawTags === "string"
    ? rawTags
    : "";

  setEditItem(it);
  setEditTags(tagsText);
  setEditCategory(String(it?.category || category || "").trim()); // fallback to current category
  setEditPriority(Number(it?.priority ?? 10));
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
};


      const res = await api.patch(`/admin/image-library/${editItem._id}`, payload);
      const data = res?.data;

      if (!data?.ok) throw new Error(data?.error || "Update failed");

      toast.push({
        type: "success",
        title: "Updated",
        message: "Image updated successfully.",
      });

      // update locally
      setItems((prev) =>
        prev.map((x) =>
          x?._id === editItem._id
         ? {
    ...x,
    tags: String(editTags || "")
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean),
  }

            : x
        )
      );

      closeEdit();
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

  return (
    <div
      style={{
        ...styles.page,
        maxWidth: "none",
        margin: 0,
        paddingLeft: 0,
        paddingRight: 0,
      }}
    >
      <div style={pageMaxWrapStyle}>
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            gap: 12,
          }}
        />

        <div style={{ height: 12 }} />

        <div style={uploadWrapStyle}>
          <h3 style={sectionTitleStyle}>Upload Image to Library</h3>

          <form onSubmit={onUpload}>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple // ✅ allow multi-select
              onChange={(e) => {
                const list = Array.from(e.target.files || []);
                setFiles(list);
                // ✅ local select should override drive selection
                setDriveSelected(new Set());
              }}
              style={{ display: "none" }}
            />

            <div style={fieldLabelStyle}>Image</div>
            <div style={dropzoneStyle}>
              {files.length === 0 && (driveSelected?.size || 0) === 0 ? (
                <div style={shimmerOverlayStyle} />
              ) : null}

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
                  {files.length > 0
                    ? `${files.length} image(s) selected`
                    : (driveSelected?.size || 0) > 0
                    ? `${driveSelected.size} image(s) selected (Google Drive)`
                    : "Choose image(s) to upload"}
                </div>

                <div style={{ fontSize: 12, opacity: 0.78, color: "#0b2455" }}>
                  {files.length > 0
                    ? `${Math.round(
                        files.reduce((sum, f) => sum + (f.size || 0), 0) / 1024
                      )} KB total`
                    : (driveSelected?.size || 0) > 0
                    ? "Selected from Google Drive"
                    : "PNG, JPG, WEBP — multiple allowed"}
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
                  onClick={() => {
                    setDriveSelected(new Set());
                    fileRef.current?.click();
                  }}
                >
                  Select file
                </button>

                <button
                  type="button"
                  style={ghostBtnStyle}
                  onClick={openDrivePicker}
                  title="Pick images from Google Drive folder"
                >
                  Choose from Drive
                </button>

                {files.length > 0 || (driveSelected?.size || 0) > 0 ? (
                  <button type="button" style={ghostBtnStyle} onClick={clearAllSelections}>
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
              placeholder="Leave empty to auto-generate (or type comma-separated tags)"
              style={luxuryInputStyle}
            />

            {tagsPreviewText ? (
              <div style={tagsPreviewTextStyle}>{tagsPreviewText}</div>
            ) : null}

            <div style={{ height: 16 }} />

            <button
              type="submit"
              disabled={(files.length === 0 && (driveSelected?.size || 0) === 0) || isUploading}
              style={{
                ...((files.length > 0 || (driveSelected?.size || 0) > 0) && !isUploading
                  ? uploadReadyBtnStyle
                  : uploadIdleBtnStyle),
                cursor:
                  (files.length === 0 && (driveSelected?.size || 0) === 0) || isUploading
                    ? "not-allowed"
                    : "pointer",
                filter:
                  (files.length === 0 && (driveSelected?.size || 0) === 0) || isUploading
                    ? "grayscale(0.25) brightness(0.85)"
                    : "none",
              }}
            >
              {isUploading ? "Uploading..." : "Upload"}
            </button>
          </form>
        </div>

        <div style={{ height: 14 }} />

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

          {items.length === 0 && listLoading ? (
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
                  ? it.tags
                      .map((t) => String(t || "").trim())
                      .filter(Boolean)
                      .join(", ")
                  : "";

                return (
                  <div key={it._id} style={itemCardStyle}>
                    <img src={it.url} alt={it.publicId} style={itemImageStyle} loading="lazy" />

                    <div style={itemBodyStyle}>
                      {/* ✅ TAGS header row with Copy Image URL on the right */}
                      <div style={tagsHeaderRowStyle}>
                        <div style={metaLabelStyle}>Tags</div>

                        <button
                          type="button"
                          style={copyMiniRightStyle}
                          onClick={() => copyText(it.url)}
                          title="Copy full image URL"
                        >
                          Copy Image URL
                        </button>
                      </div>

                      <div style={{ height: 6 }} />

                      <div style={tagsPlainTextStyle}>{tagsText ? tagsText : "-"}</div>

                      <div style={{ height: 12 }} />

                      {/* ✅ other 3 buttons stay where they are */}
                      <div style={btnRow3Style}>
                        <a
                          href={it.url}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            ...actionPillSmallStyle,
                            textDecoration: "none",
                            display: "inline-flex",
                            alignItems: "center",
                          }}
                          title="Open image"
                        >
                          Open
                        </a>

                        <button
                          type="button"
                          style={editGlowSmallBtnStyle}
                          onClick={() => openEdit(it)}
                          title="Edit tags/category/priority"
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          style={dangerSmallPillStyle}
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

          <div style={{ height: 14 }} />

          {items.length > 0 && listLoading ? (
            <div style={{ opacity: 0.75, color: "#0b1220" }}>Loading more…</div>
          ) : null}

          {!hasMore && items.length > 0 ? (
            <div style={{ opacity: 0.65, color: "#0b1220" }}>End of library.</div>
          ) : null}

          <div ref={sentinelRef} style={{ height: 1 }} />
        </div>

        {/* ✅ Edit modal (leave your existing modal content as you had) */}
       {editOpen && (
  <div style={modalOverlayStyle} onClick={closeEdit}>
    <div style={modalCardStyle} onClick={(e) => e.stopPropagation()}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
        <h3 style={{ margin: 0, fontWeight: 900 }}>Edit Image</h3>

        <button
          type="button"
          style={miniBtnStyle}
          onClick={closeEdit}
          disabled={editSaving}
          title="Close"
        >
          ✕
        </button>
      </div>

      <div style={{ height: 12 }} />

      {/* Preview */}
      {editItem?.url ? (
        <img
          src={editItem.url}
          alt={editItem.publicId || "image"}
          style={{
            width: "100%",
            height: 240,
            objectFit: "cover",
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.12)",
          }}
          referrerPolicy="no-referrer"
          crossOrigin="anonymous"
        />
      ) : null}

      <div style={{ height: 12 }} />

      {/* URL row */}
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ fontSize: 12, opacity: 0.85 }}>
          {editItem?.publicId ? <b>{editItem.publicId}</b> : null}
        </div>

        {editItem?.url ? (
          <button
            type="button"
            style={miniBtnStyle}
            onClick={() => copyText(editItem.url)}
            title="Copy image URL"
          >
            Copy URL
          </button>
        ) : null}
      </div>

      <div style={{ height: 14 }} />

      {/* Fields */}
      <div style={labelStyle}>Tags (comma separated)</div>
      <textarea
  value={editTags}
  onChange={(e) => setEditTags(e.target.value)}
  placeholder="e.g. india, politics, parliament"
  style={{
    ...inputStyle,
    resize: "none",
    overflow: "hidden",          // ✅ no scrollbar
    whiteSpace: "pre-wrap",
    overflowWrap: "anywhere",
    lineHeight: 1.4,
    minHeight: 120,              // ✅ good for mobile
  }}
  onInput={(e) => {
    e.target.style.height = "auto";
    e.target.style.height = `${e.target.scrollHeight}px`;  // ✅ grow to fit all text
  }}
  ref={(el) => {
    if (!el) return;
    // ✅ set correct height on first open too
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }}
/>



      <div style={{ height: 12 }} />

      {/* Actions */}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, flexWrap: "wrap" }}>
        <button type="button" style={miniBtnStyle} onClick={closeEdit} disabled={editSaving}>
          Cancel
        </button>

        <button
          type="button"
          style={{
            ...miniBtnStyle,
            background: "rgba(59,130,246,0.18)",
            border: "1px solid rgba(59,130,246,0.35)",
          }}
          onClick={saveEdit}
          disabled={editSaving}
        >
          {editSaving ? "Saving..." : "Save"}
        </button>
      </div>
    </div>
  </div>
)}


        {/* ✅ Drive picker modal (select only; import happens on Upload) */}
        {driveOpen && (
          <div style={modalOverlayStyle} onClick={closeDrivePicker}>
            <div style={modalCardStyle} onClick={(e) => e.stopPropagation()}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 style={{ margin: 0 }}>Choose from Google Drive</h3>
                <button type="button" style={miniBtnStyle} onClick={closeDrivePicker} disabled={isUploading}>
                  ✕
                </button>
              </div>

              <div style={{ height: 10 }} />

              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.9)" }}>
                Select images here, then click <b>Select</b>. Add tags in the main form, then click <b>Upload</b>.
              </div>

              <div style={{ height: 12 }} />

              <input
                value={driveQuery}
                onChange={(e) => setDriveQuery(e.target.value)}
                placeholder="Search by file name…"
                style={inputStyle}
              />

              <div style={{ height: 12 }} />

              <div
                style={{
                  maxHeight: 420,
                  overflow: "auto",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: 12,
                }}
              >
                {driveLoading ? (
                  <div style={{ padding: 12, color: "rgba(255,255,255,0.85)" }}>Loading Drive images…</div>
                ) : (
                  (driveFiles || [])
                    .filter((f) => {
                      const q = String(driveQuery || "").trim().toLowerCase();
                      if (!q) return true;
                      return String(f?.name || "").toLowerCase().includes(q);
                    })
                    .map((f) => {
                      const id = f?.id;
                      const checked = driveSelected?.has?.(id);
                      return (
                        <div
                          key={id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            padding: 10,
                            borderBottom: "1px solid rgba(255,255,255,0.08)",
                          }}
                        >
                          <input type="checkbox" checked={!!checked} onChange={() => toggleDriveSelect(id)} />

                          {f?.thumbnailLink ? (
                            <img
                              src={f.thumbnailLink}
                              alt={f?.name || "drive-image"}
                              style={{ width: 54, height: 40, objectFit: "cover", borderRadius: 8 }}
                              referrerPolicy="no-referrer"
                              crossOrigin="anonymous"
                            />
                          ) : (
                            <div
                              style={{
                                width: 54,
                                height: 40,
                                borderRadius: 8,
                                background: "rgba(255,255,255,0.08)",
                              }}
                            />
                          )}

                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div
                              style={{
                                fontSize: 13,
                                fontWeight: 800,
                                color: "#fff",
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                            >
                              {f?.name || "(no name)"}
                            </div>
                            <div style={{ fontSize: 11, opacity: 0.85, color: "rgba(255,255,255,0.8)" }}>
                              {f?.modifiedTime ? new Date(f.modifiedTime).toLocaleString() : ""}
                            </div>
                          </div>

                          {f?.webViewLink ? (
                            <a
                              href={f.webViewLink}
                              target="_blank"
                              rel="noreferrer"
                              style={{ fontSize: 12, color: "rgba(255,255,255,0.9)" }}
                            >
                              Open
                            </a>
                          ) : null}
                        </div>
                      );
                    })
                )}
              </div>

              <div style={{ height: 14 }} />

              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", flexWrap: "wrap" }}>
                <button type="button" style={miniBtnStyle} onClick={closeDrivePicker} disabled={isUploading}>
                  Cancel
                </button>

                <button
                  type="button"
                  style={miniBtnStyle}
                  onClick={() => setDriveSelected(new Set())}
                  disabled={isUploading}
                >
                  Clear
                </button>

                <button type="button" style={selectBtnStyle} onClick={applyDriveSelection} disabled={isUploading}>
                  Select ({driveSelected?.size || 0})
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
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
   PAGE WRAP
   ========================= */
const pageMaxWrapStyle = {
  width: "100%",
  maxWidth: "none",
  margin: 0,
  paddingLeft: 12,
  paddingRight: 12,
};

/* =========================
   UPLOAD
   ========================= */
const uploadWrapStyle = {
  background:
    "radial-gradient(1200px 250px at 20% 0%, rgba(59,130,246,0.10), rgba(255,255,255,0.72)), rgba(255,255,255,0.72)",
  border: "1px solid rgba(15, 23, 42, 0.10)",
  borderRadius: 0,
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
  borderRadius: 0,
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
  borderRadius: 0,
  border: "1px solid rgba(2,6,23,0.10)",
  background: "rgba(255,255,255,0.95)",
  color: "#0b1220",
  fontWeight: 900,
  cursor: "pointer",
  boxShadow: "0 8px 18px rgba(2,6,23,0.08)",
};

const ghostBtnStyle = {
  padding: "10px 12px",
  borderRadius: 0,
  border: "1px solid rgba(2,6,23,0.10)",
  background: "rgba(255,255,255,0.70)",
  color: "#0b1220",
  fontWeight: 900,
  cursor: "pointer",
};

const uploadIdleBtnStyle = {
  padding: "12px 16px",
  borderRadius: 0,
  border: "1px solid rgba(2,6,23,0.10)",
  background: "rgba(2,6,23,0.10)",
  color: "rgba(2,6,23,0.55)",
  fontWeight: 900,
  letterSpacing: 0.2,
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.6)",
};

const uploadReadyBtnStyle = {
  padding: "12px 16px",
  borderRadius: 0,
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
   LIBRARY
   ========================= */
const libraryWrapStyle = {
  background:
    "linear-gradient(180deg, rgba(255,255,255,0.92), rgba(248,250,252,0.92))",
  border: "1px solid rgba(15, 23, 42, 0.10)",
  borderRadius: 0,
  padding: 18,
  boxShadow: "0 12px 34px rgba(2,6,23,0.06)",
};

const libraryInputStyle = {
  width: "100%",
  padding: "12px 12px",
  borderRadius: 0,
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
  borderRadius: 0,
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

/* ✅ TAGS header row */
const tagsHeaderRowStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
  borderTop: "1px solid rgba(15,23,42,0.08)",
  paddingTop: 12,
};

const metaLabelStyle = {
  fontSize: 11,
  fontWeight: 900,
  letterSpacing: 0.25,
  textTransform: "uppercase",
  opacity: 0.55,
};

const tagsPlainTextStyle = {
  fontSize: 13,
  fontWeight: 500,
  color: "rgba(11,18,32,0.78)",
  lineHeight: 1.45,
  wordBreak: "break-word",
};

/* ✅ Copy button on right of Tags heading */
const copyMiniRightStyle = {
  padding: "6px 8px",
  borderRadius: 0,
  border: "1px solid rgba(15, 23, 42, 0.14)",
  background: "rgba(255,255,255,0.92)",
  color: "#0b1220",
  fontWeight: 900,
  fontSize: 11,
  cursor: "pointer",
  whiteSpace: "nowrap",
  lineHeight: 1,
  boxShadow: "0 10px 22px rgba(2,6,23,0.05)",
};

/* ✅ Bottom 3 buttons row */
const btnRow3Style = {
  display: "flex",
  gap: 8,
  flexWrap: "nowrap",
  alignItems: "center",
  justifyContent: "space-between",
};

const actionPillSmallStyle = {
  padding: "8px 8px",
  borderRadius: 0,
  border: "1px solid rgba(15, 23, 42, 0.12)",
  background: "rgba(255,255,255,0.92)",
  color: "#0b1220",
  fontWeight: 900,
  fontSize: 11,
  cursor: "pointer",
  boxShadow: "0 10px 22px rgba(2,6,23,0.06)",
  whiteSpace: "nowrap",
  lineHeight: 1,
  flex: "1 1 0",
  minWidth: 0,
  textAlign: "center",
};

const editGlowSmallBtnStyle = {
  ...actionPillSmallStyle,
  background: "rgba(255, 245, 180, 0.95)",
  color: "#2a2000",
  border: "1px solid rgba(255, 200, 0, 0.85)",
  boxShadow:
    "0 10px 22px rgba(255, 200, 0, 0.22), 0 0 0 3px rgba(255, 200, 0, 0.18), 0 0 18px rgba(255, 190, 0, 0.35)",
};

const dangerSmallPillStyle = {
  ...actionPillSmallStyle,
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
