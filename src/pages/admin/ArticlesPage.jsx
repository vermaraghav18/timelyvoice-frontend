// src/pages/admin/ArticlesPage.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../../App";
import PasteImporter from "../../components/PasteImporter.jsx";
import { useToast } from "../../providers/ToastProvider.jsx";
import { getToken } from "../../App";

// ——— Cloudinary helpers: strip transforms, version and tracking query ———
function normalizeCloudinaryUrl(raw = "") {
  try {
    if (!raw) return "";
    const u = new URL(raw);
    if (!/\.cloudinary\.com$/.test(u.hostname)) return raw; // not cloudinary

    // Only handle classic delivery URLs: /image/upload/(...optional...)/<id>[.ext]
    const parts = u.pathname.split("/").filter(Boolean);
    const iUpload = parts.findIndex((p) => p === "upload");
    if (iUpload === -1) return raw;

    // Everything after "upload":
    // [maybe transforms], [maybe version], [public_id parts...]
    const after = parts.slice(iUpload + 1);

    // Remove a single "v1234567890" if present
    const noVersion = after.filter((seg) => !/^v\d+$/.test(seg));

    // If first remaining looks like a transform bundle, drop it
    const looksLikeTransform = (s) =>
      /(^[cfgqarstwhopdblm],)|(^c_|^w_|^h_|^g_|^q_|^f_)/.test(s) || s.includes(",");
    const trimmed =
      noVersion.length && looksLikeTransform(noVersion[0])
        ? noVersion.slice(1)
        : noVersion;

    // Rebuild path: /image/upload/<public_id...>
    const cleanPath = ["", ...parts.slice(0, iUpload + 1), ...trimmed].join("/");

    // Drop query (?_a=… etc)
    u.search = "";
    u.pathname = cleanPath;

    return u.toString();
  } catch {
    return raw;
  }
}

// ——— Admin-only: add a cache-buster so the preview <img> refreshes instantly ———
function withCacheBust(url = "", seed = Date.now()) {
  if (!url) return "";
  try {
    // Support absolute AND relative URLs
    const u = new URL(url, typeof window !== "undefined" ? window.location.origin : "http://localhost");
    u.searchParams.set("_cb", String(seed));
    return u.toString();
  } catch {
    // relative or non-URL string – fall back to string concat
    const sep = url.includes("?") ? "&" : "?";
    return `${url}${sep}_cb=${encodeURIComponent(seed)}`;
  }
}

export default function ArticlesPage() {
  const toast = useToast();

  const [data, setData] = useState({ items: [], total: 0, page: 1, limit: 20 });
  const [loading, setLoading] = useState(false);

  const [status, setStatus] = useState("");
  const [category, setCategory] = useState("");
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");

  const [categories, setCategories] = useState([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [selectedIds, setSelectedIds] = useState(new Set());

  // ---- editor modal state ----
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

  // Autosave state
  const [autoSaving, setAutoSaving] = useState(false);
  const [autoSavedAt, setAutoSavedAt] = useState(null);
  const firstLoadRef = useRef(true);
  const autosaveTimerRef = useRef(null);

  // Admin gate: if no JWT token, restrict publish/unpublish.
  const isAdmin = !!(typeof window !== "undefined" && getToken());

  // Basic editor form model (includes slug + GEO + SEO fields)
  const META_TITLE_MAX = 80;
  const META_DESC_MAX = 200;

  const [form, setForm] = useState({
    title: "",
    slug: "",
    summary: "",
    author: "",
    body: "",
    category: "General",
    status: "draft",
    publishAt: "",
    imageUrl: "",
    imagePublicId: "",
    // SEO fields
    imageAlt: "",
    metaTitle: "",
    metaDesc: "",
    ogImage: "",
    // tags
    tags: [],
    // GEO
    geoMode: "global",
    geoAreasText: "",
  });
  const [tagsInput, setTagsInput] = useState("");

  // --- GEO Preview inputs (local-only helper fields)
  const [testCountry, setTestCountry] = useState("");
  const [testRegion, setTestRegion] = useState("");
  const [testCity, setTestCity] = useState("");

  // --- X-GEO Preview header controls (persisted)
  const [previewEnabled, setPreviewEnabled] = useState(false);
  const [previewCountry, setPreviewCountry] = useState("");

  // NEW: quick Image URL editor state per row
  // imgEdits: { [id]: { value, saving: 'idle'|'saving'|'saved'|'error', syncOg: boolean } }
  const [imgEdits, setImgEdits] = useState({});
  const imgTimersRef = useRef({}); // debounce timers per row

  // Restore preview prefs
  useEffect(() => {
    try {
      const enabled = localStorage.getItem("geoPreview.enabled");
      const country = localStorage.getItem("geoPreview.country");
      if (enabled != null) setPreviewEnabled(enabled === "1");
      if (country) setPreviewCountry(country);
    } catch {
      /* ignore */
    }
  }, []);
  // Persist preview prefs
  useEffect(() => {
    try {
      localStorage.setItem("geoPreview.enabled", previewEnabled ? "1" : "0");
      localStorage.setItem("geoPreview.country", previewCountry || "");
    } catch {
      /* ignore */
    }
  }, [previewEnabled, previewCountry]);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 400);
    return () => clearTimeout(t);
  }, [q]);

  // Load categories (for filter + editor select)
  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/categories", { params: { limit: 1000 } });
        const payload = res.data || {};
        setCategories(Array.isArray(payload) ? payload : (payload.items || payload.data || []));
      } catch {
        /* non-fatal */
      }
    })();
  }, []);

  useEffect(() => {
    return () => {
      Object.values(imgTimersRef.current || {}).forEach((t) => clearTimeout(t));
    };
  }, []);

  // Helper: compose headers for geo preview
  function geoHeaders() {
    if (!previewEnabled) return undefined;
    const cc = (previewCountry || "").toUpperCase().trim();
    if (!/^[A-Z]{2}$/.test(cc)) return undefined;
    return { "X-Geo-Preview-Country": cc };
  }

  // ---------- NEW: category resolver (fixes "resolveCategoryId is not defined")
  // Accepts an _id, slug, or name; returns the category _id string (or empty string).
  function resolveCategoryId(val) {
    if (!val) return "";
    // If it already looks like a Mongo ObjectId, keep it.
    if (typeof val === "string" && /^[a-f0-9]{24}$/i.test(val)) return val;
    // Try to match by slug or name.
    const match =
      categories.find((c) => c._id === val) ||
      categories.find((c) => (c.slug || "").toLowerCase() === String(val).toLowerCase()) ||
      categories.find((c) => (c.name || "").toLowerCase() === String(val).toLowerCase());
    return match?._id || "";
  }

  // Fetch articles
  const fetchArticles = async () => {
    setLoading(true);
    try {
      const res = await api.get("/admin/articles", {
        params: {
          status: status || undefined,
          category: category || undefined,
          q: debouncedQ || undefined,
          page,
          limit,
        },
        headers: geoHeaders(),
      });
      const payload = res.data || {};
      const items = payload.items || payload.data || [];
      setData({
        items,
        total: payload.total || 0,
        page: payload.page || page,
        limit: payload.limit || limit,
      });
      setSelectedIds(new Set());

      // seed quick image editors with fresh list
      const seeded = {};
      for (const a of items) {
        const id = a._id;
        seeded[id] = {
          value: a.imageUrl || "",
          saving: "idle",
          // default: keep ogImage synced to this imageUrl
          syncOg: true,
        };
      }
      setImgEdits(seeded);
    } catch (e) {
      toast.push({
        type: "error",
        title: "Load failed",
        message: String(e?.response?.data?.message || e.message),
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArticles();
    // eslint-disable-next-line
  }, [status, category, debouncedQ, page, limit, previewEnabled, previewCountry]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil((data.total || 0) / limit)),
    [data.total, limit]
  );

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const toggleSelectAll = () => {
    if ((data.items?.length || 0) === 0) return;
    const allIds = new Set(data.items.map((a) => a._id));
    const isAll = data.items.every((a) => selectedIds.has(a._id));
    setSelectedIds(isAll ? new Set() : allIds);
  };

  // -------- Optimistic helpers --------
  const updateItemsLocal = (updater) => {
    setData((prev) => ({ ...prev, items: prev.items.map(updater) }));
  };
  const removeItemsLocal = (ids) => {
    setData((prev) => {
      const items = prev.items.filter((a) => !ids.includes(a._id));
      return { ...prev, items, total: Math.max(0, (prev.total || 0) - ids.length) };
    });
  };

  // -------- Row actions (role-gated publish) --------
  async function patchOne(id, patch) {
    if ((patch.status === "published" || patch.status === "draft") && !isAdmin) {
      toast.push({
        type: "warning",
        title: "Publish restricted",
        message: "Only admins can change publish status.",
      });
      return;
    }
    if (patch.status) {
      const newStatus = patch.status;
      updateItemsLocal((a) => (a._id === id ? { ...a, status: newStatus } : a));
    }
    try {
      const body = { ...patch };
      // IMPORTANT: when publishing, also set publishedAt now
      if (body.status === "published" && !body.publishedAt) {
        body.publishedAt = new Date().toISOString();
      }
      await api.patch(`/admin/articles/${id}`, body);
      toast.push({ type: "success", title: "Saved" });
    } catch (e) {
      toast.push({
        type: "error",
        title: "Failed",
        message: String(e?.response?.data?.message || e.message),
      });
      fetchArticles();
    }
  }

  async function deleteOne(id) {
    removeItemsLocal([id]);
    try {
      await api.delete(`/admin/articles/${id}`);
      toast.push({ type: "success", title: "Deleted" });
      if (data.items.length === 1 && page > 1) setPage((p) => p - 1);
    } catch (e) {
      toast.push({
        type: "error",
        title: "Delete failed",
        message: String(e?.response?.data?.message || e.message),
      });
      fetchArticles();
    }
  }

  // -------- Bulk actions (role-gated publish) --------
  async function bulkAction(action) {
    const ids = Array.from(selectedIds);
    if (!ids.length) {
      toast.push({ type: "warning", title: "Select at least one article" });
      return;
    }
    if (action === "delete") {
      const ok = confirm(`Delete ${ids.length} article(s)? This cannot be undone.`);
      if (!ok) return;
      removeItemsLocal(ids);
      setSelectedIds(new Set());
      try {
        await Promise.all(ids.map((id) => api.delete(`/admin/articles/${id}`)));
        toast.push({ type: "success", title: "Deleted", message: `${ids.length} article(s)` });
        if (data.items.length === ids.length && page > 1) setPage((p) => p - 1);
      } catch (e) {
        toast.push({ type: "error", title: "Some deletes failed", message: "Refreshing list…" });
        fetchArticles();
      }
      return;
    }

    // publish / unpublish
    if (!isAdmin) {
      toast.push({
        type: "warning",
        title: "Publish restricted",
        message: "Only admins can publish/unpublish.",
      });
      return;
    }
    const newStatus = action === "publish" ? "published" : "draft";
    updateItemsLocal((a) => (selectedIds.has(a._id) ? { ...a, status: newStatus } : a));
    const results = await Promise.allSettled(
      ids.map((id) =>
        api.patch(`/admin/articles/${id}`, {
          status: newStatus,
          ...(newStatus === "published" ? { publishedAt: new Date().toISOString() } : {}),
        })
      )
    );
    const failed = results.filter((r) => r.status === "rejected").length;
    setSelectedIds(new Set());
    if (failed === 0) {
      toast.push({ type: "success", title: "Updated", message: `${ids.length} article(s)` });
    } else {
      toast.push({
        type: "warning",
        title: "Partial update",
        message: `${failed} failed — refreshing list`,
      });
      fetchArticles();
    }
  }

  // -------- NEW: open create / edit --------
  function openCreate() {
    setEditingId(null);
    setForm({
      title: "",
      slug: "",
      summary: "",
      author: "",
      body: "",
      category: categories[0]?._id || "",
      status: "draft",
      publishAt: new Date().toISOString().slice(0, 16),
      imageUrl: "",
      imagePublicId: "",
      imageAlt: "",
      metaTitle: "",
      metaDesc: "",
      ogImage: "",
      tags: [],
      geoMode: "global",
      geoAreasText: "",
    });
    setTagsInput("");
    setTestCountry("");
    setTestRegion("");
    setTestCity("");
    setAutoSavedAt(null);
    setShowForm(true);
    firstLoadRef.current = true;
  }

  async function openEdit(id) {
    try {
      const res = await api.get(`/admin/articles/${id}`, { headers: geoHeaders() });
      const a = res.data;

      // Turn array of geoAreas -> comma text for editor
      const geoAreasText = Array.isArray(a.geoAreas) ? a.geoAreas.join(", ") : "";

      setEditingId(id);
      setForm({
        title: a.title || "",
        slug: a.slug || "",
        summary: a.summary || "",
        author: a.author || "",
        body: a.body || "",
        category: a.category?._id || a.category || "",
        status: a.status || "published",
        publishAt: a.publishedAt ? new Date(a.publishedAt).toISOString().slice(0, 16) : "",
        imageUrl: a.imageUrl || "",
        imagePublicId: a.imagePublicId || "",
        imageAlt: a.imageAlt || "",
        metaTitle: a.metaTitle || "",
        metaDesc: a.metaDesc || "",
        ogImage: a.ogImage || "",
        tags: Array.isArray(a.tags) ? a.tags : [],
        geoMode: a.geoMode || "global",
        geoAreasText,
      });
      setTagsInput((Array.isArray(a.tags) ? a.tags : []).join(", "));
      setTestCountry("");
      setTestRegion("");
      setTestCity("");
      setAutoSavedAt(null);
      setShowForm(true);
      firstLoadRef.current = true; // skip first autosave cycle after load
    } catch (e) {
      toast.push({
        type: "error",
        title: "Load failed",
        message: String(e?.response?.data?.message || e.message),
      });
    }
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setAutoSavedAt(null);
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
  }

  // Parse helpers
  function parseTags(raw) {
    return String(raw || "")
      .split(/[,\s]+/g)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  function parseGeoAreas(raw) {
    return String(raw || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }

  // --- AUTOSAVE (only when editingId exists) ---
  useEffect(() => {
    if (!showForm || !editingId) return;
    // Skip the very first change after form load
    if (firstLoadRef.current) {
      firstLoadRef.current = false;
      return;
    }
    // Debounce 1200ms
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = setTimeout(async () => {
      try {
        setAutoSaving(true);
        const payload = {
          title: form.title?.trim(),
          slug: form.slug?.trim() || undefined,
          summary: form.summary?.trim(),
          author: form.author?.trim(),
          body: form.body, // keep full body
          category: resolveCategoryId(form.category), // ensure _id
          status: form.status === "published" ? "published" : "draft",
          publishedAt: form.publishAt ? new Date(form.publishAt).toISOString() : undefined,
          imageUrl: normalizeCloudinaryUrl(form.imageUrl) || undefined,
          imagePublicId: form.imagePublicId || undefined,
          imageAlt: form.imageAlt || undefined,
          metaTitle: form.metaTitle ? String(form.metaTitle).slice(0, META_TITLE_MAX) : undefined,
          metaDesc: form.metaDesc ? String(form.metaDesc).slice(0, META_DESC_MAX) : undefined,
          ogImage: normalizeCloudinaryUrl(form.ogImage) || undefined,
          tags: parseTags(tagsInput),
          geo: {
            mode: form.geoMode || "global",
            areas: parseGeoAreas(form.geoAreasText),
          },
        };
        // Enforce soft limits on meta fields before saving
        if (payload.metaTitle) payload.metaTitle = String(payload.metaTitle).slice(0, META_TITLE_MAX);
        if (payload.metaDesc) payload.metaDesc = String(payload.metaDesc).slice(0, META_DESC_MAX);
        await api.patch(`/admin/articles/${editingId}`, payload);
        setAutoSavedAt(new Date());
      } catch (e) {
        console.warn("autosave failed:", e?.response?.data || e);
      } finally {
        setAutoSaving(false);
      }
    }, 1200);
    return () => autosaveTimerRef.current && clearTimeout(autosaveTimerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, tagsInput, showForm, editingId]);

  async function saveForm(e) {
    e.preventDefault();
    setSaving(true);
    try {
      // build a clean payload the backend expects
      const payload = {
        title: form.title?.trim(),
        // auto-generate slug client-side if blank (prevents 400s on servers that require slug)
        slug:
          form.slug?.trim() ||
          form.title
            ?.trim()
            ?.toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "") ||
          undefined,
        summary: form.summary?.trim(),
        author: form.author?.trim() || "Staff",
        body: form.body,
        category: resolveCategoryId(form.category),
        status: form.status === "published" ? "published" : "draft",
        publishedAt: form.publishAt ? new Date(form.publishAt).toISOString() : undefined,
        imageUrl: normalizeCloudinaryUrl(form.imageUrl) || undefined,
        imagePublicId: form.imagePublicId || undefined,
        imageAlt: form.imageAlt || undefined,
        metaTitle: form.metaTitle ? String(form.metaTitle).slice(0, META_TITLE_MAX) : undefined,
        metaDesc: form.metaDesc ? String(form.metaDesc).slice(0, META_DESC_MAX) : undefined,
        ogImage: normalizeCloudinaryUrl(form.ogImage) || undefined,
        tags: parseTags(tagsInput),
        geo: {
          mode: form.geoMode || "global",
          areas: parseGeoAreas(form.geoAreasText),
        },
      };
      // Soft limits: also enforce on manual Save
      if (payload.metaTitle) payload.metaTitle = String(payload.metaTitle).slice(0, META_TITLE_MAX);
      if (payload.metaDesc) payload.metaDesc = String(payload.metaDesc).slice(0, META_DESC_MAX);

      if (editingId) {
        await api.patch(`/admin/articles/${editingId}`, payload);
        toast.push({ type: "success", title: "Updated" });
      } else {
        await api.post(`/admin/articles`, payload);
        toast.push({ type: "success", title: "Created" });
      }

      closeForm();
      fetchArticles();
    } catch (e) {
      const err = e?.response?.data;
      const msg = err?.message || err?.error || e.message || "Save failed";
      const details =
        err?.details ? (typeof err.details === "string" ? err.details : JSON.stringify(err.details)) : "";
      toast.push({ type: "error", title: "Save failed", message: details ? `${msg}: ${details}` : msg });
    } finally {
      setSaving(false);
    }
  }

  // -------- GEO Preview (same logic as backend) --------
  function matchGeoToken(token, { country, region, city } = {}) {
    if (!token) return false;
    const [kind, c, sub] = token.split(":");
    if (kind === "country") {
      return !!country && country.toUpperCase() === (c || "").toUpperCase();
    }
    if (kind === "state") {
      return (
        !!country &&
        !!region &&
        country.toUpperCase() === (c || "").toUpperCase() &&
        region.toUpperCase() === (sub || "").toUpperCase()
      );
    }
    if (kind === "city") {
      return (
        !!country &&
        !!city &&
        country.toUpperCase() === (c || "").toUpperCase() &&
        String(city).toLowerCase() === (sub || "").toLowerCase()
      );
    }
    return false;
  }
  function isAllowedForGeo(geoMode, geoAreas, test) {
    if (!test || geoMode === "global" || !Array.isArray(geoAreas) || geoAreas.length === 0) return true;
    const matches = geoAreas.some((t) => matchGeoToken(t, test));
    if (geoMode === "include") return matches;
    if (geoMode === "exclude") return !matches;
    return true;
  }

  const geoPreviewAllowed = useMemo(() => {
    const list = parseGeoAreas(form.geoAreasText);
    const test = {
      country: testCountry || undefined,
      region: testRegion || undefined,
      city: testCity || undefined,
    };
    return isAllowedForGeo(form.geoMode, list, test);
  }, [form.geoMode, form.geoAreasText, testCountry, testRegion, testCity]);

  // ---------- Quick Image URL (inline) helpers ----------
  function setImgState(id, patch) {
    setImgEdits((prev) => ({
      ...prev,
      [id]: { ...(prev[id] || { value: "", saving: "idle", syncOg: true }), ...patch },
    }));
  }

  function scheduleSaveImage(id, value) {
    // debounce per row
    if (imgTimersRef.current[id]) clearTimeout(imgTimersRef.current[id]);
    setImgState(id, { saving: "saving" });
    imgTimersRef.current[id] = setTimeout(async () => {
      try {
        // Clean Cloudinary links (strip transforms/version/_a)
        const cleaned = normalizeCloudinaryUrl(value || "");
        const syncOg = !!(imgEdits[id]?.syncOg ?? true);

        const payload = syncOg
          ? { imageUrl: cleaned, ogImage: cleaned }
          : { imageUrl: cleaned };

        const res = await api.patch(`/admin/articles/${id}`, payload);
        const updated = res?.data || {};

        // Server value (if it returns one) wins; otherwise our cleaned input
        const nextImage = updated.imageUrl ?? cleaned ?? "";
        const nextOg = updated.ogImage ?? (syncOg ? nextImage : updated.ogImage || "");

        updateItemsLocal((a) =>
          a._id === id
            ? {
                ...a,
                imageUrl: nextImage,
                ogImage: nextOg,
                // bump updatedAt so our preview cache-bust seed changes
                updatedAt: new Date().toISOString(),
              }
            : a
        );

        // Keep the input box in sync with what we saved
        setImgState(id, { value: nextImage, saving: "saved" });
        setTimeout(() => setImgState(id, { saving: "idle" }), 900);
      } catch (e) {
        console.warn("image quick-save failed", e?.response?.data || e);
        setImgState(id, { saving: "error" });
      }
    }, 800);
  }

  function onChangeQuickImage(id, value) {
    setImgState(id, { value });
    scheduleSaveImage(id, value);
  }

  return (
    <div
      className="admin-articles-root"
      style={{ display: "grid", gap: 12 }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <h1 style={{ fontSize: 24, fontWeight: 600, margin: 0 }}>
          Articles
          {previewEnabled && /^[A-Z]{2}$/.test((previewCountry || "").toUpperCase()) && (
            <span style={{ marginLeft: 10, ...badge, ...badgeYellow }}>
              Previewing as: {(previewCountry || "").toUpperCase()}
            </span>
          )}
        </h1>
        {/* Create button */}
        <button onClick={openCreate} style={btnPrimary}>
          New Article
        </button>
      </div>

      <div
        style={{
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
        }}
      >
        <button
          onClick={() => bulkAction("publish")}
          style={{ ...btnPrimary, opacity: isAdmin ? 1 : 0.6, pointerEvents: isAdmin ? "auto" : "none" }}
        >
          Publish
        </button>
        <button
          onClick={() => bulkAction("unpublish")}
          style={{ ...btnGhost, opacity: isAdmin ? 1 : 0.6, pointerEvents: isAdmin ? "auto" : "none" }}
        >
          Unpublish
        </button>
        <button onClick={() => bulkAction("delete")} style={btnDanger}>
          Delete
        </button>
      </div>

      {/* Filters */}
      <div
        className="admin-articles-filters"
        style={{
          display: "grid",
          gap: 8,
          alignItems: "center",
        }}
      >
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          style={inp}
        >
          <option value="">All status</option>
          <option value="draft">Draft</option>
          <option value="scheduled">Scheduled</option>
          <option value="published">Published</option>
        </select>

        <select
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
            setPage(1);
          }}
          style={inp}
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c._id || c.slug} value={c.slug || c.name}>
              {c.name}
            </option>
          ))}
        </select>

        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
          placeholder="Search title/summary/body…"
          style={inp}
        />

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            justifySelf: "end",
          }}
        >
          <label style={{ fontSize: 12, color: "#666" }}>Rows</label>
          <select
            value={limit}
            onChange={(e) => {
              setLimit(Number(e.target.value));
              setPage(1);
            }}
            style={{ ...inp, width: 84 }}
          >
            {[10, 20, 50, 100].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* X-Geo preview header controls */}
      <div
        style={{
          display: "flex",
          gap: 8,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <label style={{ fontSize: 13, color: "#111827" }}>
          <input
            type="checkbox"
            checked={previewEnabled}
            onChange={(e) => {
              setPreviewEnabled(e.target.checked);
              setPage(1);
            }}
            style={{ marginRight: 8 }}
          />
          Enable X-Geo Preview (admin)
        </label>
        <input
          value={previewCountry}
          onChange={(e) => setPreviewCountry(e.target.value.toUpperCase())}
          placeholder="Country code (e.g. IN, US)"
          style={{ ...inp, width: 200, textTransform: "uppercase" }}
          maxLength={2}
        />
        <button onClick={() => fetchArticles()} style={btnGhost}>
          Apply
        </button>
        <span style={{ fontSize: 12, color: "#64748b" }}>
          Sends <code>X-Geo-Preview-Country</code> on list & edit reads.
        </span>
      </div>

      <div
        style={{
          overflow: "auto",
          border: "1px solid #eee",
          borderRadius: 12,
          background: "#fff",
        }}
      >
        <table
          style={{
            width: "100%",
            fontSize: 14,
            borderCollapse: "collapse",
            minWidth: 720,
          }}
        >
          <thead
            style={{
              background: "#f9fafb",
              textAlign: "left",
            }}
          >
            <tr>
              <th style={th}>
                <input
                  type="checkbox"
                  onChange={toggleSelectAll}
                  checked={data.items.length > 0 && data.items.every((a) => selectedIds.has(a._id))}
                />
              </th>
              <th style={th}>Title</th>
              <th style={th}>Status</th>
              <th style={th}>Category</th>
              <th style={th}>Publish At</th>
              <th style={th}>Updated</th>
              <th style={th}>Preview</th>
              <th style={th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td style={td} colSpan={8}>
                  Loading…
                </td>
              </tr>
            )}
            {!loading && data.items.length === 0 && (
              <tr>
                <td style={td} colSpan={8}>
                  No articles found.
                </td>
              </tr>
            )}
            {!loading &&
              data.items.map((a) => {
                const imgState = imgEdits[a._id] || { value: a.imageUrl || "", saving: "idle", syncOg: true };
                const dotColor =
                  imgState.saving === "saving"
                    ? "#f59e0b"
                    : imgState.saving === "saved"
                    ? "#10b981"
                    : imgState.saving === "error"
                    ? "#ef4444"
                    : "#d1d5db";
                const previewUrl = a.ogImage || a.imageUrl || imgState.value || "";
                return (
                  <tr key={a._id} style={{ borderTop: "1px solid #f0f0f0" }}>
                    <td style={td}>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(a._id)}
                        onChange={() => toggleSelect(a._id)}
                      />
                    </td>
                    <td style={td}>
                      <div style={{ fontWeight: 600 }}>{a.title}</div>
                      <div style={{ color: "#666", fontSize: 12 }}>{a.slug}</div>

                      {/* tags preview (FIX: unique keys, avoid duplicate key warnings) */}
                      {Array.isArray(a.tags) && a.tags.length > 0 && (
                        <div style={{ marginTop: 6, display: "flex", gap: 6, flexWrap: "wrap" }}>
                          {a.tags.map((t, idx) => (
                            <span
                              key={`${t}-${idx}`}
                              title={`tag: ${t}`}
                              style={{
                                padding: "1px 6px",
                                fontSize: 11,
                                borderRadius: 999,
                                background: "#f1f5f9",
                                border: "1px solid #e2e8f0",
                                color: "#475569",
                              }}
                            >
                              #{t}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* NEW: Quick Image URL editor */}
                      <div style={{ marginTop: 8 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                          <span style={{ fontSize: 12, color: "#555", fontWeight: 600 }}>Image URL (quick)</span>
                          <span
                            title={imgState.saving}
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: 8,
                              background: dotColor,
                              display: "inline-block",
                            }}
                          />
                        </div>
                        <input
                          value={imgState.value}
                          onChange={(e) => onChangeQuickImage(a._id, e.target.value)}
                          placeholder="https://…"
                          style={inp}
                        />
                        <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 6, flexWrap: "wrap" }}>
                          <label style={{ display: "inline-flex", gap: 6, alignItems: "center", fontSize: 12 }}>
                            <input
                              type="checkbox"
                              checked={!!imgState.syncOg}
                              onChange={(e) => setImgState(a._id, { syncOg: e.target.checked })}
                            />
                            Also set <code>OG Image URL</code>
                          </label>
                          {imgState.value ? (
                            <>
                              <a
                                href={imgState.value}
                                target="_blank"
                                rel="noreferrer"
                                style={{ textDecoration: "none", color: "#1B4965", fontSize: 12 }}
                              >
                                open image ↗
                              </a>
                              <span style={{ color: "#999", fontSize: 12 }}>|</span>
                            </>
                          ) : null}
                          <button
                            type="button"
                            onClick={() =>
                              window.open(`/article/${encodeURIComponent(a.slug)}`, "_blank", "noopener,noreferrer")
                            }
                            style={{ ...btnSmallGhost, padding: "4px 8px", fontSize: 12 }}
                            title="Open public article page"
                          >
                            open article ↗
                          </button>
                        </div>
                      </div>
                    </td>
                    <td style={td}>
                      <span
                        style={{
                          ...badge,
                          ...(a.status === "published"
                            ? badgeGreen
                            : a.status === "scheduled"
                            ? badgeYellow
                            : badgeGray),
                        }}
                      >
                        {a.status}
                      </span>
                    </td>
                    <td style={td}>{a.category?.name || a.category || "—"}</td>
                    <td style={td}>{fmt(a.publishedAt) || "—"}</td>
                    <td style={td}>{fmt(a.updatedAt)}</td>

                    {/* Preview column */}
                    <td style={{ ...td, width: 230 }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-start" }}>
                        <span style={badge}>{a.category?.name || a.category || "General"}</span>
                        {(() => {
                          const base = previewUrl;
                          const seed =
                            (a.updatedAt ? new Date(a.updatedAt).getTime() : 0) || Date.now();
                          const thumbSrc = withCacheBust(base, seed);

                          return base ? (
                            <img
                              id={`thumb-${a._id}`}
                              src={thumbSrc}
                              alt=""
                              loading="lazy"
                              decoding="async"
                              style={{
                                width: 200,
                                height: 120,
                                objectFit: "cover",
                                borderRadius: 10,
                                border: "1px solid #eee",
                                background: "#f8fafc",
                              }}
                              onError={(e) => {
                                const tries = Number(e.currentTarget.dataset.tries || 0);
                                if (tries < 2 && base) {
                                  e.currentTarget.dataset.tries = String(tries + 1);
                                  e.currentTarget.src = withCacheBust(base, Date.now());
                                  return;
                                }
                                e.currentTarget.replaceWith(
                                  Object.assign(document.createElement("div"), {
                                    style:
                                      "width:200px;height:120px;display:grid;place-items:center;border:1px solid #eee;border-radius:10px;background:#f8fafc;color:#999;font-size:12px",
                                    innerText: "Image failed",
                                  })
                                );
                              }}
                            />
                          ) : (
                            <div
                              style={{
                                width: 200,
                                height: 120,
                                display: "grid",
                                placeItems: "center",
                                borderRadius: 10,
                                border: "1px solid #eee",
                                background: "#f8fafc",
                                color: "#999",
                                fontSize: 12,
                              }}
                            >
                              No image
                            </div>
                          );
                        })()}
                      </div>
                    </td>

                    <td style={td}>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        <button onClick={() => openEdit(a._id)} style={btnSmallGhost}>
                          Edit
                        </button>
                        {a.status !== "published" && (
                          <button
                            onClick={() => patchOne(a._id, { status: "published" })}
                            style={{
                              ...btnSmallPrimary,
                              opacity: isAdmin ? 1 : 0.6,
                              pointerEvents: isAdmin ? "auto" : "none",
                            }}
                          >
                            Publish
                          </button>
                        )}
                        {a.status === "published" && (
                          <button
                            onClick={() => patchOne(a._id, { status: "draft" })}
                            style={{
                              ...btnSmallGhost,
                              opacity: isAdmin ? 1 : 0.6,
                              pointerEvents: isAdmin ? "auto" : "none",
                            }}
                          >
                            Unpublish
                          </button>
                        )}
                        <button onClick={() => deleteOne(a._id)} style={btnSmallDanger}>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        <div style={{ fontSize: 12, color: "#666" }}>Total: {data.total}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} style={btnGhost}>
            Prev
          </button>
          <span style={{ fontSize: 13 }}>
            Page {page} / {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            style={btnGhost}
          >
            Next
          </button>
        </div>
      </div>

      {/* Editor modal/drawer */}
      {showForm && (
        <div style={modalBackdrop}>
          <div style={modalCard}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 8,
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>
                {editingId ? "Edit Article" : "Create Article"}
              </h2>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                {editingId && (
                  <span style={{ fontSize: 12, color: autoSaving ? "#92400e" : "#16a34a" }}>
                    {autoSaving ? "Saving…" : autoSavedAt ? `Saved ${autoSavedAt.toLocaleTimeString()}` : "Autosave on"}
                  </span>
                )}
                <button onClick={closeForm} style={btnGhost}>
                  Close
                </button>
              </div>
            </div>

            {/* Paste-once importer (auto-fills the form from JSON/YAML) */}
            <PasteImporter
              onApply={(d) => {
                setForm((f) => ({
                  ...f,
                  title: d.title ?? f.title,
                  slug: d.slug ?? f.slug,
                  summary: d.summary ?? f.summary,
                  author: d.author ?? f.author,
                  category: d.category ?? f.category,
                  status: d.status ?? f.status,
                  publishAt: d.publishAt ?? f.publishAt,
                  imageUrl: d.imageUrl ?? f.imageUrl,
                  imagePublicId: d.imagePublicId ?? f.imagePublicId,
                  imageAlt: d.imageAlt ?? f.imageAlt,
                  metaTitle: (d.metaTitle ?? f.metaTitle)?.slice(0, META_TITLE_MAX),
                  metaDesc: (d.metaDesc ?? f.metaDesc)?.slice(0, META_DESC_MAX),
                  ogImage: d.ogImage ?? f.ogImage,
                  geoMode: d.geoMode ?? f.geoMode,
                  geoAreasText: d.geoAreasText ?? f.geoAreasText,
                  body: d.body ?? f.body,
                }));
                setTagsInput((d.tags || []).join(", "));
              }}
            />

            <form onSubmit={saveForm} style={{ display: "grid", gap: 10 }}>
              <div style={grid2}>
                <label style={lbl}>
                  Title
                  <input
                    required
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    style={inp}
                  />
                </label>
                <label style={lbl}>
                  Author
                  <input
                    required
                    value={form.author}
                    onChange={(e) => setForm((f) => ({ ...f, author: e.target.value }))}
                    style={inp}
                  />
                </label>
              </div>

              {/* Slug (editable) */}
              <label style={lbl}>
                Slug
                <input
                  value={form.slug}
                  onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                  placeholder="leave blank to auto-generate from title"
                  style={inp}
                />
              </label>

              <label style={lbl}>
                Summary
                <textarea
                  required
                  rows={2}
                  value={form.summary}
                  onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))}
                  style={ta}
                />
              </label>

              <div style={grid3}>
                <label style={lbl}>
                  Category
                  <select
                    value={form.category}
                    onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                    style={inp}
                  >
                    {categories.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name}
                      </option>
                    ))}
                    <option value="">General</option>
                  </select>
                </label>

                <label style={lbl}>
                  Status
                  <select
                    value={form.status}
                    onChange={(e) => {
                      const s = e.target.value;
                      setForm((f) => ({
                        ...f,
                        status: s,
                        // auto-fill publishAt UI field when switching to published
                        publishAt: s === "published" ? f.publishAt || new Date().toISOString().slice(0, 16) : f.publishAt,
                      }));
                    }}
                    style={{ ...inp, opacity: isAdmin ? 1 : 0.6 }}
                    disabled={!isAdmin}
                    title={!isAdmin ? "Only admins can change publish status" : undefined}
                  >
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                  </select>
                </label>

                <label style={lbl}>
                  Publish At
                  <input
                    type="datetime-local"
                    value={form.publishAt}
                    onChange={(e) => setForm((f) => ({ ...f, publishAt: e.target.value }))}
                    style={inp}
                  />
                </label>
              </div>

              <div style={grid2}>
                <label style={lbl}>
                  Image URL
                  <input
                    value={form.imageUrl}
                    onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))}
                    style={inp}
                  />
                </label>
                <label style={lbl}>
                  Image Public ID
                  <input
                    value={form.imagePublicId}
                    onChange={(e) => setForm((f) => ({ ...f, imagePublicId: e.target.value }))}
                    style={inp}
                  />
                </label>
              </div>

              {/* SEO fields with counters */}
              <div style={{ fontWeight: 600, marginTop: 8 }}>SEO</div>
              <div style={grid3}>
                <label style={lbl}>
                  Image Alt
                  <input
                    value={form.imageAlt}
                    onChange={(e) => setForm((f) => ({ ...f, imageAlt: e.target.value }))}
                    placeholder="Describe the image (e.g. ‘Solar panels on a rooftop at sunset’)"
                    style={inp}
                  />
                </label>
                <label style={lbl}>
                  Meta Title
                  <input
                    value={form.metaTitle}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, metaTitle: e.target.value.slice(0, META_TITLE_MAX) }))
                    }
                    style={inp}
                    maxLength={META_TITLE_MAX}
                  />
                  <small style={{ color: "#64748b" }}>
                    {(form.metaTitle || "").length}/{META_TITLE_MAX}
                  </small>
                </label>
                <label style={lbl}>
                  OG Image URL
                  <input
                    value={form.ogImage}
                    onChange={(e) => setForm((f) => ({ ...f, ogImage: e.target.value }))}
                    style={inp}
                  />
                </label>
              </div>
              {form.imageUrl && !form.imageAlt && (
                <div style={{ color: "var(--color-warning, #b45309)", fontSize: 12, marginTop: -4 }}>
                  Tip: Add a short, meaningful alt description so screen readers and SEO can understand the image.
                </div>
              )}
              <label style={lbl}>
                Meta Description
                <textarea
                  rows={2}
                  value={form.metaDesc}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, metaDesc: e.target.value.slice(0, META_DESC_MAX) }))
                  }
                  style={ta}
                  maxLength={META_DESC_MAX}
                />
                <small style={{ color: "#64748b" }}>
                  {(form.metaDesc || "").length}/{META_DESC_MAX}
                </small>
              </label>

              {/* GEO section */}
              <div style={{ fontWeight: 600, marginTop: 8 }}>GEO</div>
              <div style={grid3}>
                <label style={lbl}>
                  Mode
                  <select
                    value={form.geoMode}
                    onChange={(e) => setForm((f) => ({ ...f, geoMode: e.target.value }))}
                    style={inp}
                  >
                    <option value="global">Global</option>
                    <option value="include">Include only</option>
                    <option value="exclude">Exclude these</option>
                  </select>
                </label>
                <label style={{ ...lbl, gridColumn: "span 2" }}>
                  Areas (comma separated)
                  <input
                    value={form.geoAreasText}
                    onChange={(e) => setForm((f) => ({ ...f, geoAreasText: e.target.value }))}
                    placeholder="Examples: country:IN, state:US:CA, city:IN:Bengaluru"
                    style={inp}
                  />
                </label>
              </div>

              {/* GEO Preview */}
              <div style={{ border: "1px dashed #e5e7eb", borderRadius: 12, padding: 10 }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>GEO Preview</div>
                <div style={grid3}>
                  <label style={lbl}>
                    Country (2-letter)
                    <input
                      value={testCountry}
                      onChange={(e) => setTestCountry(e.target.value.toUpperCase())}
                      style={inp}
                      placeholder="e.g. IN"
                    />
                  </label>
                  <label style={lbl}>
                    Region / State
                    <input
                      value={testRegion}
                      onChange={(e) => setTestRegion(e.target.value.toUpperCase())}
                      style={inp}
                      placeholder="e.g. KA or CA"
                    />
                  </label>
                  <label style={lbl}>
                    City
                    <input
                      value={testCity}
                      onChange={(e) => setTestCity(e.target.value)}
                      style={inp}
                      placeholder="e.g. Bengaluru"
                    />
                  </label>
                </div>
                <div style={{ marginTop: 8, fontSize: 13 }}>
                  Result:&nbsp;
                  <span style={{ ...badge, ...(geoPreviewAllowed ? badgeGreen : badgeGray) }}>
                    {geoPreviewAllowed ? "Allowed" : "Blocked"}
                  </span>
                  <span style={{ marginLeft: 8, color: "#64748b" }}>
                    mode = <code>{form.geoMode}</code>, areas = <code>{form.geoAreasText || "—"}</code>
                  </span>
                </div>
              </div>

              {/* Tags */}
              <label style={lbl}>
                Tags (comma or space separated)
                <input
                  placeholder="e.g. cricket, politics, tech"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  style={inp}
                />
              </label>
              {parseTags(tagsInput).length > 0 && (
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {parseTags(tagsInput).map((t, idx) => (
                    <span key={`${t}-${idx}`} style={chip}>
                      #{t}
                    </span>
                  ))}
                </div>
              )}

              <label style={lbl}>
                Body
                <textarea
                  rows={8}
                  value={form.body}
                  onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
                  style={ta}
                />
              </label>

              <div
                style={{
                  display: "flex",
                  gap: 8,
                  justifyContent: "flex-end",
                  marginTop: 6,
                  flexWrap: "wrap",
                }}
              >
                <button type="button" onClick={closeForm} style={btnGhost}>
                  Cancel
                </button>
                <button type="submit" disabled={saving} style={btnPrimary}>
                  {saving ? "Saving…" : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* small responsive CSS for this page */}
      <style>{`
        .admin-articles-root {
          width: 100%;
        }

        /* Filters row: 4 columns on desktop, stacked on small screens */
        .admin-articles-filters {
          grid-template-columns: 160px 200px 1fr auto;
        }

        @media (max-width: 900px) {
          .admin-articles-filters {
            grid-template-columns: 1fr 1fr;
          }
        }

        @media (max-width: 640px) {
          .admin-articles-filters {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}

/* -------- helpers -------- */
function fmt(d) {
  if (!d) return "";
  try {
    return new Date(d).toLocaleString();
  } catch {
    return String(d);
  }
}

/* -------- styles (no Tailwind) -------- */
const inp = {
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid #e5e7eb",
  outline: "none",
  width: "100%",
};
const ta = { ...inp, minHeight: 72, resize: "vertical" };
const th = { padding: 10, fontWeight: 600, fontSize: 13, borderBottom: "1px solid #eee" };
const td = { padding: 10, verticalAlign: "top" };
const lbl = { display: "grid", gap: 6, fontSize: 13, color: "#111827" };

const badge = {
  padding: "2px 8px",
  borderRadius: 999,
  fontSize: 12,
  border: "1px solid #e5e7eb",
  background: "#f3f4f6",
};
const badgeGreen = { background: "#f0fdf4", color: "#166534", borderColor: "#86efac" };
const badgeYellow = { background: "#fffbeb", color: "#92400e", borderColor: "#fde68a" };
const badgeGray = { background: "#f3f4f6", color: "#111827", borderColor: "#e5e7eb" };

const btnBase = {
  padding: "8px 12px",
  borderRadius: 10,
  border: "1px solid #e5e7eb",
  background: "#fff",
  cursor: "pointer",
  fontSize: 13,
};
const btnGhost = { ...btnBase, background: "#fff" };
const btnPrimary = { ...btnBase, background: "#1D9A8E", color: "#fff", borderColor: "#1D9A8E" };
const btnDanger = { ...btnBase, background: "#fef2f2", borderColor: "#fee2e2", color: "#b91c1c" };

const btnSmallBase = {
  padding: "6px 10px",
  borderRadius: 10,
  border: "1px solid #e5e7eb",
  background: "#fff",
  cursor: "pointer",
  fontSize: 12,
};
const btnSmallGhost = { ...btnSmallBase, background: "#fff" };
const btnSmallPrimary = { ...btnSmallBase, background: "#1D9A8E", color: "#fff", borderColor: "#1D9A8E" };
const btnSmallDanger = { ...btnSmallBase, background: "#fef2f2", borderColor: "#fee2e2", color: "#b91c1c" };

/* modal-ish */
const modalBackdrop = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.35)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 50,
  padding: 16,
};
const modalCard = {
  width: "min(980px, 100%)",
  maxHeight: "90vh",
  overflow: "auto",
  background: "#fff",
  border: "1px solid #eee",
  borderRadius: 14,
  padding: 16,
  boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
};

/* RESPONSIVE grid helpers: no logic change, they just stack nicely on small screens */
const grid2 = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 10,
};
const grid3 = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
  gap: 10,
};

const chip = {
  padding: "2px 8px",
  borderRadius: 999,
  fontSize: 12,
  border: "1px solid #e2e8f0",
  background: "#f8fafc",
  color: "#475569",
};
