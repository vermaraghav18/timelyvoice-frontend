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

      const params = {
        page: nextPage,
        limit,
      };

      if (filterCategory) params.category = filterCategory;

      // Backend tag filter is exact tag match (array contains).
      // We keep it simple: send the exact tag string.
      const tag = String(filterTag || "").trim();
      if (tag) params.tag = tag;

      const res = await api.get("/admin/image-library", { params });
      const data = res?.data;

      if (!data?.ok) {
        throw new Error(data?.error || "Failed to load images");
      }

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

  // Load list initially + whenever filters change
  useEffect(() => {
    // Reset to page 1 when filters change
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
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      const data = res?.data;
      if (!data?.ok) throw new Error(data?.error || "Upload failed");

      toast.push({
        type: "success",
        title: "Uploaded",
        message: "Image uploaded to Cloudinary and saved to Image Library.",
      });

      // Reset only file (admin often uploads many with same tags/category)
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";

      // Refresh list so admin can SEE it immediately
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

      // Refresh current page (if page becomes empty, fallback to prev page)
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
          toast.push({ type: "success", title: "Copied", message: "publicId copied." })
        )
        .catch(() =>
          toast.push({ type: "warning", title: "Copy failed", message: "Could not copy." })
        );
      return;
    }

    // Fallback
    try {
      const ta = document.createElement("textarea");
      ta.value = t;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      toast.push({ type: "success", title: "Copied", message: "publicId copied." });
    } catch {
      toast.push({ type: "warning", title: "Copy failed", message: "Could not copy." });
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div style={styles.page}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
        <h1 style={{ margin: 0 }}>Image Library</h1>
        <div style={{ opacity: 0.75, fontSize: 13 }}>
          Upload to Cloudinary, metadata in MongoDB (tags live in DB)
        </div>
      </div>

      <div style={{ height: 12 }} />

      {/* ✅ Upload form */}
      <div style={styles.card}>
        <h3 style={{ marginTop: 0 }}>Upload Image to Library</h3>

        <form onSubmit={onUpload}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {/* File */}
            <div>
              <div style={labelStyle}>Image file</div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                style={inputStyle}
              />
              {file ? (
                <div style={{ marginTop: 6, fontSize: 13, opacity: 0.85 }}>
                  Selected: <b>{file.name}</b> ({Math.round((file.size || 0) / 1024)} KB)
                </div>
              ) : null}
            </div>

            {/* Priority */}
            <div>
              <div style={labelStyle}>Priority</div>
              <input
                type="number"
                value={priority}
                onChange={(e) => setPriority(Number(e.target.value))}
                style={inputStyle}
                min={0}
              />
              <div style={{ marginTop: 6, fontSize: 12, opacity: 0.75 }}>
                Higher priority images are preferred by auto-picker.
              </div>
            </div>

            {/* Tags */}
            <div>
              <div style={labelStyle}>Tags (comma separated)</div>
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="iran, missile, global"
                style={inputStyle}
              />
              <div style={{ marginTop: 6, fontSize: 12, opacity: 0.75 }}>
                Example: <code>usa, carrier, navy</code>
              </div>
            </div>

            {/* Category */}
            <div>
              <div style={labelStyle}>Category</div>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                style={inputStyle}
                disabled={catsLoading}
              >
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
            </div>
          </div>

          <div style={{ height: 12 }} />

          <button
            type="submit"
            disabled={!file || isUploading}
            style={{
              ...btnStyle,
              opacity: !file || isUploading ? 0.65 : 1,
              cursor: !file || isUploading ? "not-allowed" : "pointer",
            }}
          >
            {isUploading ? "Uploading..." : "Upload Image"}
          </button>
        </form>
      </div>

      <div style={{ height: 12 }} />

      {/* ✅ Filters + Grid/List */}
      <div style={styles.card}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
          <h3 style={{ marginTop: 0, marginBottom: 0 }}>Library</h3>
          <div style={{ opacity: 0.75, fontSize: 13 }}>
            Total: <b>{total}</b>
          </div>
        </div>

        <div style={{ height: 12 }} />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <div style={labelStyle}>Filter by tag</div>
            <input
              type="text"
              value={filterTag}
              onChange={(e) => setFilterTag(e.target.value)}
              placeholder="e.g. iran"
              style={inputStyle}
            />
          </div>

          <div>
            <div style={labelStyle}>Filter by category</div>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              style={inputStyle}
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

        <div style={{ height: 12 }} />

        {listLoading ? (
          <div style={{ opacity: 0.85 }}>Loading…</div>
        ) : items.length === 0 ? (
          <div style={{ opacity: 0.85 }}>No images found.</div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
              gap: 12,
            }}
          >
            {items.map((it) => (
              <div key={it._id} style={cardStyle}>
                <div style={{ borderRadius: 12, overflow: "hidden", background: "rgba(255,255,255,0.04)" }}>
                  <img
                    src={it.url}
                    alt={it.publicId}
                    style={{ width: "100%", height: 160, objectFit: "cover", display: "block" }}
                    loading="lazy"
                  />
                </div>

                <div style={{ height: 10 }} />

                <div style={{ fontSize: 12, opacity: 0.85 }}>
                  <div>
                    <b>Category:</b> {it.category || "-"}
                  </div>
                  <div>
                    <b>Priority:</b> {Number(it.priority) || 0}
                  </div>
                </div>

                <div style={{ height: 8 }} />

                <div style={{ fontSize: 12, opacity: 0.9 }}>
                  <b>Tags:</b>{" "}
                  {Array.isArray(it.tags) && it.tags.length ? it.tags.join(", ") : "-"}
                </div>

                <div style={{ height: 10 }} />

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button
                    type="button"
                    style={miniBtnStyle}
                    onClick={() => copyText(it.publicId)}
                    title="Copy publicId"
                  >
                    Copy publicId
                  </button>

                  <a
                    href={it.url}
                    target="_blank"
                    rel="noreferrer"
                    style={{ ...miniBtnStyle, textDecoration: "none", display: "inline-flex", alignItems: "center" }}
                    title="Open image"
                  >
                    Open
                  </a>

                  <button
                    type="button"
                    style={{ ...miniBtnStyle, borderColor: "rgba(255,80,80,0.35)" }}
                    onClick={() => onDelete(it)}
                    title="Delete"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ height: 14 }} />

        {/* Pagination */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div style={{ opacity: 0.75, fontSize: 13 }}>
            Page <b>{page}</b> / <b>{totalPages}</b>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              style={miniBtnStyle}
              disabled={page <= 1 || listLoading}
              onClick={() => fetchList(page - 1)}
            >
              Prev
            </button>
            <button
              type="button"
              style={miniBtnStyle}
              disabled={page >= totalPages || listLoading}
              onClick={() => fetchList(page + 1)}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const labelStyle = { fontSize: 13, opacity: 0.8, marginBottom: 6 };

const inputStyle = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(255,255,255,0.04)",
  color: "inherit",
  outline: "none",
};

const btnStyle = {
  padding: "10px 14px",
  borderRadius: 10,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(255,255,255,0.06)",
  color: "inherit",
  fontWeight: 700,
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

const cardStyle = {
  borderRadius: 14,
  border: "1px solid rgba(255,255,255,0.10)",
  background: "rgba(255,255,255,0.03)",
  padding: 12,
};
