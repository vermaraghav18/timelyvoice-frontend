// src/pages/admin/ArticlesPage.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { api } from "../../lib/publicApi";
import PasteImporter from "../../components/PasteImporter.jsx";
import { useToast } from "../../providers/ToastProvider.jsx";
import { getToken } from "../../utils/auth";

// 🔁 Default Cloudinary fallback hero (admin preview only)
const DEFAULT_IMAGE_URL = "/tv-default-hero.jpg";

// ✅ Admin: only allow these 9 categories, always in this order
const ALLOWED_CATEGORY_SLUGS = [
  "india",
  "world",
  "health",
  "finance",
  "history",
  "new-delhi",
  "punjab",
  "entertainment",
  "general",
];

const CATEGORY_ORDER = new Map(
  ALLOWED_CATEGORY_SLUGS.map((slug, i) => [slug, i])
);

function normalizeSlug(v) {
  return String(v || "").trim().toLowerCase();
}

function categoryNameFromSlug(categories, slug) {
  const s = normalizeSlug(slug);
  return categories.find((c) => normalizeSlug(c?.slug) === s)?.name || "General";
}

function normalizeCloudinaryUrl(raw = "") {
  try {
    const input = String(raw || "").trim();
    if (!input) return "";

    const u = new URL(input);
    if (!/\.cloudinary\.com$/.test(u.hostname)) return input; // not cloudinary

    const parts = u.pathname.split("/").filter(Boolean);
    const iUpload = parts.findIndex((p) => p === "upload");
    if (iUpload === -1) return input;

    // Everything after "upload": [transforms...], [maybe version], [public_id parts...]
    let after = parts.slice(iUpload + 1);

    // remove version segments anywhere like v123456
    after = after.filter((seg) => !/^v\d+$/.test(seg));

    // detect transform segments (Cloudinary transformations)
    const looksLikeTransform = (s) => {
      if (!s) return false;
      // Most transforms contain commas OR start with known transform keys
      if (s.includes(",")) return true;
      return /^(c_|w_|h_|g_|q_|f_|fl_|e_|a_|r_|b_|bo_|dpr_|ar_|t_|l_|u_|x_|y_|z_|o_)/.test(
        s
      );
    };

    // ✅ drop ALL leading transform segments, not just one
    while (after.length && looksLikeTransform(after[0])) {
      after = after.slice(1);
    }

    // rebuild clean path
    const cleanPath = ["", ...parts.slice(0, iUpload + 1), ...after].join("/");

    u.search = ""; // drop ?_a=... etc
    u.pathname = cleanPath;

    return u.toString();
  } catch {
    return String(raw || "").trim();
  }
}

// ✅ If admin pastes ImageLibrary publicId instead of URL,
// resolve it via backend to the stored Cloudinary URL (versioned).
async function resolveImageInputToUrl(api, raw = "") {
  const input = String(raw || "").trim();
  if (!input) return { url: "", publicId: "" };

  // If it's already a URL, just normalize it.
  if (/^https?:\/\//i.test(input) || input.startsWith("data:") || input.startsWith("blob:")) {
    return { url: normalizeCloudinaryUrl(input), publicId: "" };
  }

  // Treat it as Cloudinary publicId (strip extension if user pasted one)
  const publicId = input.replace(/\s+/g, "").replace(/\.(jpg|jpeg|png|webp|gif|avif)$/i, "");

  // First try: resolve via ImageLibrary DB (BEST – returns the correct versioned URL)
  try {
    const res = await api.get("/admin/image-library/resolve", { params: { publicId } });
    const data = res?.data;
    if (data?.ok && data?.url) {
      return { url: normalizeCloudinaryUrl(data.url), publicId: data.publicId || publicId };
    }
  } catch (e) {
    // ignore - fallback below
  }

  // Fallback: attempt non-versioned Cloudinary delivery URL (may 404 on your account)
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  if (cloudName) {
    return { url: `https://res.cloudinary.com/${cloudName}/image/upload/${publicId}`, publicId };
  }

  // Last resort: return as-is (prevents crashing)
  return { url: input, publicId };
}

// ——— Admin-only: add a cache-buster so the preview <img> refreshes instantly ———
function withCacheBust(url = "", seed = Date.now()) {

  if (!url) return "";
  try {
    // Support absolute AND relative URLs
    const u = new URL(
      url,
      typeof window !== "undefined" ? window.location.origin : "http://localhost"
    );
    u.searchParams.set("_cb", String(seed));
    return u.toString();
  } catch {
    // relative or non-URL string – fall back to string concat
    const sep = url.includes("?") ? "&" : "?";
    return `${url}${sep}_cb=${encodeURIComponent(seed)}`;
  }
}

// ——— Normalize video URLs (Google Drive → direct file) ———
// ——— Video helpers (Drive → embed preview; otherwise direct video URL) ———
function getDriveFileId(url = "") {
  const s = String(url || "").trim();
  if (!s) return "";
  const byPath = s.match(/\/file\/d\/([^/]+)/); // /file/d/<ID>/view
  const byParam = s.match(/[?&]id=([^&]+)/); // ?id=<ID>
  return (byPath && byPath[1]) || (byParam && byParam[1]) || "";
}

function toPlayableVideoSrc(url = "") {
  const raw = String(url || "").trim();
  if (!raw) return "";

  // Google Drive share -> direct downloadable file URL (best effort)
  if (raw.includes("drive.google.com")) {
    const id = getDriveFileId(raw);
    if (id) return `https://drive.google.com/uc?export=download&id=${id}`;
  }

  // Cloudinary mp4 or any direct mp4 url
  return raw;
}

// ——— Helper: convert Date → value for <input type="datetime-local"> in LOCAL time ———
function toLocalInputValue(date = new Date()) {
  if (!date) return "";
  const d = new Date(date);
  // Make toISOString() output local time instead of UTC for this date
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16); // "YYYY-MM-DDTHH:mm"
}

export default function ArticlesPage() {
  const toast = useToast();
  const navigate = useNavigate();

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
    category: "general",
    homepagePlacement: "none",

    status: "draft",
    publishAt: "",
    imageUrl: "",
    imagePublicId: "",
    // NEW: optional video URL (Google Drive / Cloudinary)
    videoUrl: "",
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
    year: "",
    era: "BC",

    sourceImageUrl: "",
    sourceImageFrom: "",
  });

  // Figure out if the selected category is "History"
  const historyCategory = useMemo(
    () =>
      categories.find(
        (c) =>
          (c.slug || "").toLowerCase() === "history" ||
          (c.name || "").toLowerCase() === "history"
      ),
    [categories]
  );

  const isHistorySelected = normalizeSlug(form.category) === "history";

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

  // NEW: Image candidates cache (for next/prev arrows on hero preview)
  // imgCandidates: { [id]: { list: [], idx: 0, loading: boolean, error?: string } }
  const [imgCandidates, setImgCandidates] = useState({});


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
        const raw = Array.isArray(payload) ? payload : payload.items || payload.data || [];

        const filtered = raw
          .filter((c) => ALLOWED_CATEGORY_SLUGS.includes(normalizeSlug(c?.slug)))
          .sort((a, b) => {
            const ai = CATEGORY_ORDER.get(normalizeSlug(a?.slug)) ?? 999;
            const bi = CATEGORY_ORDER.get(normalizeSlug(b?.slug)) ?? 999;
            return ai - bi;
          });

        setCategories(filtered);
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

  // ---------- NEW: category resolver ----------

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
      setImgCandidates({}); // reset candidate cache on fresh list load

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
        toast.push({
          type: "success",
          title: "Deleted",
          message: `${ids.length} article(s)`,
        });
        if (data.items.length === ids.length && page > 1) setPage((p) => p - 1);
      } catch (e) {
        toast.push({
          type: "error",
          title: "Some deletes failed",
          message: "Refreshing list…",
        });
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
      toast.push({
        type: "success",
        title: "Updated",
        message: `${ids.length} article(s)`,
      });
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
      category: normalizeSlug(categories[0]?.slug) || "general",
      homepagePlacement: "none",

      status: "draft",
      publishAt: toLocalInputValue(),
      imageUrl: "",
      imagePublicId: "",
      videoUrl: "", // NEW
      imageAlt: "",
      metaTitle: "",
      metaDesc: "",
      ogImage: "",
      tags: [],
      geoMode: "global",
      geoAreasText: "",
      year: "",
      era: "BC",

      // ✅ NEW: publisher source fields (read-only)
      sourceImageUrl: "",
      sourceImageFrom: "",
      sourceUrl: "",
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
      const geoAreasText = Array.isArray(a.geo?.areas) ? a.geo.areas.join(", ") : "";

      setEditingId(id);
      setForm({
        title: a.title || "",
        slug: a.slug || "",
        summary: a.summary || "",
        author: a.author || "",
        body: a.body || "",
        category:
          normalizeSlug(a.categorySlug) ||
          normalizeSlug(a.category?.slug) ||
          normalizeSlug(a.category?.name) ||
          normalizeSlug(a.category) ||
          "general",
        homepagePlacement: normalizePlacement(a.homepagePlacement || "none"),

        status: a.status || "published",
        publishAt: a.publishedAt ? toLocalInputValue(a.publishedAt) : "",
        imageUrl: a.imageUrl || "",
        imagePublicId: a.imagePublicId || "",
        videoUrl: a.videoUrl || "", // NEW
        imageAlt: a.imageAlt || "",
        metaTitle: a.metaTitle || "",
        metaDesc: a.metaDesc || "",
        ogImage: a.ogImage || "",
        tags: Array.isArray(a.tags) ? a.tags : [],
        geoMode: a.geoMode || "global",
        geoAreasText,
        year: a.year ?? "",
        era: a.era || "BC",

        // ✅ NEW: publisher source fields (read-only)
        sourceImageUrl: a.sourceImageUrl || "",
        sourceImageFrom: a.sourceImageFrom || "",
        sourceUrl: a.sourceUrl || "",
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
          body: form.body,
          categorySlug: normalizeSlug(form.category) || "general",
          category: categoryNameFromSlug(categories, form.category),
          homepagePlacement: normalizePlacement(form.homepagePlacement || "none"),

          status: form.status === "published" ? "published" : "draft",
          publishedAt: form.publishAt ? new Date(form.publishAt).toISOString() : undefined,
          imageUrl: normalizeCloudinaryUrl(form.imageUrl) || undefined,
          imagePublicId: form.imagePublicId || undefined,
          videoUrl: form.videoUrl || undefined, // NEW
          imageAlt: form.imageAlt || undefined,

          // ✅ ADD THESE
          sourceImageUrl: form.sourceImageUrl || undefined,
          sourceImageFrom: form.sourceImageFrom || undefined,
          sourceUrl: form.sourceUrl || undefined,

          metaTitle: form.metaTitle ? String(form.metaTitle).slice(0, META_TITLE_MAX) : undefined,
          metaDesc: form.metaDesc ? String(form.metaDesc).slice(0, META_DESC_MAX) : undefined,
          ogImage: normalizeCloudinaryUrl(form.ogImage) || undefined,
          tags: parseTags(tagsInput),
          geo: {
            mode: form.geoMode || "global",
            areas: parseGeoAreas(form.geoAreasText),
          },
          year: form.year ? Number(form.year) : undefined,
          era: form.era || "BC",
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
      // First normalize the basic fields
      let imageUrl = normalizeCloudinaryUrl(form.imageUrl) || undefined;
      let imagePublicId = form.imagePublicId || undefined;
      let ogImage = normalizeCloudinaryUrl(form.ogImage) || undefined;

      // If user pasted a Google Drive URL, import it via backend
      if (imageUrl && imageUrl.includes("drive.google.com")) {
        try {
          const res = await api.post("/admin/articles/import-image-from-url", { url: imageUrl });
          const data = res && res.data ? res.data : res;
          if (data && data.url && data.publicId) {
            imageUrl = data.url; // Cloudinary URL
            imagePublicId = data.publicId; // Cloudinary publicId
            if (!ogImage) ogImage = data.url;
          }
        } catch (err) {
          console.error("import-image-from-url failed", err);
          toast.push({
            type: "error",
            title: "Image import failed",
            message:
              "Could not import image from Google Drive link. The article will be saved without changing the image.",
          });
        }
      }

      // build a clean payload the backend expects
      const payload = {
        title: form.title?.trim(),
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
        categorySlug: normalizeSlug(form.category) || "general",
        category: categoryNameFromSlug(categories, form.category),
        homepagePlacement: normalizePlacement(form.homepagePlacement || "none"),

        status: form.status === "published" ? "published" : "draft",
        publishedAt: form.publishAt ? new Date(form.publishAt).toISOString() : undefined,
        imageUrl, // now Cloudinary if it was Drive
        imagePublicId, // now Cloudinary if it was Drive
        videoUrl: form.videoUrl || undefined, // NEW
        imageAlt: form.imageAlt || undefined,

        // ✅ ADD THESE
        sourceImageUrl: form.sourceImageUrl || undefined,
        sourceImageFrom: form.sourceImageFrom || undefined,
        sourceUrl: form.sourceUrl || undefined,

        metaTitle: form.metaTitle ? String(form.metaTitle).slice(0, META_TITLE_MAX) : undefined,
        metaDesc: form.metaDesc ? String(form.metaDesc).slice(0, META_DESC_MAX) : undefined,
        ogImage, // will use Cloudinary URL if we just imported
        tags: parseTags(tagsInput),
        geo: {
          mode: form.geoMode || "global",
          areas: parseGeoAreas(form.geoAreasText),
        },
        year: form.year ? Number(form.year) : undefined,
        era: form.era || "BC",
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
        err?.details
          ? typeof err.details === "string"
            ? err.details
            : JSON.stringify(err.details)
          : "";
      toast.push({
        type: "error",
        title: "Save failed",
        message: details ? `${msg}: ${details}` : msg,
      });
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
    if (!test || geoMode === "global" || !Array.isArray(geoAreas) || geoAreas.length === 0)
      return true;
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
      const syncOg = !!(imgEdits[id]?.syncOg ?? true);

      // ✅ Convert pasted value (URL OR publicId) -> real URL
      const resolved = await resolveImageInputToUrl(api, value || "");
      const finalUrl = resolved.url || "";
      const finalPublicId = resolved.publicId || "";

      const payload = syncOg
        ? { imageUrl: finalUrl, ogImage: finalUrl, ...(finalPublicId ? { imagePublicId: finalPublicId } : {}) }
        : { imageUrl: finalUrl, ...(finalPublicId ? { imagePublicId: finalPublicId } : {}) };

      const res = await api.patch(`/admin/articles/${id}`, payload);
      const updated = res?.data || {};

      // Server value wins
      const nextImage = updated.imageUrl ?? finalUrl ?? "";
      const nextOg = updated.ogImage ?? (syncOg ? nextImage : updated.ogImage || "");

      updateItemsLocal((a) =>
        a._id === id
          ? {
              ...a,
              imageUrl: nextImage,
              ogImage: nextOg,
              imagePublicId: updated.imagePublicId ?? finalPublicId ?? a.imagePublicId,
              updatedAt: new Date().toISOString(),
            }
          : a
      );

      setImgState(id, { value: nextImage, saving: "saved" });
      setTimeout(() => setImgState(id, { saving: "idle" }), 900);
    } catch (e) {
      console.warn("image quick-save failed", e?.response?.data || e);
      setImgState(id, { saving: "error" });
    }
  }, 800);
}

function setCandidateState(id, patch) {
  setImgCandidates((prev) => ({
    ...prev,
    [id]: {
      ...(prev[id] || { list: [], idx: 0, loading: false, error: "", prefetched: false }),
      ...patch,
    },
  }));
}


async function ensureCandidatesLoaded(article) {
  const id = article?._id;
  if (!id) return null;

  const existing = imgCandidates[id];
  if (existing?.loading) return existing;
  if (Array.isArray(existing?.list) && existing.list.length) return existing;

  // Only makes sense if there are tags
  if (!Array.isArray(article?.tags) || article.tags.length === 0) {
    setCandidateState(id, { list: [], idx: 0, loading: false, error: "no_tags", prefetched: true });

    // ✅ Prefetch image candidates so it never shows "No matches" on first render
useEffect(() => {
  if (loading) return;
  const items = data?.items || [];
  if (!items.length) return;

  // Prefetch only for articles with tags
  for (const a of items) {
    const id = a?._id;
    if (!id) continue;

    const hasTags = Array.isArray(a.tags) && a.tags.length > 0;
    if (!hasTags) continue;

    const st = imgCandidates[id];
    if (st?.loading) continue;
    if (st?.prefetched) continue;        // ✅ only once
    if (Array.isArray(st?.list) && st.list.length) continue;

    // Fire and forget (ensureCandidatesLoaded updates state)
    ensureCandidatesLoaded(a);
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [loading, data.items]);


    return { list: [], idx: 0, loading: false, error: "no_tags" };
  }

  try {
    setCandidateState(id, { loading: true, error: "" });
    const res = await api.get(`/admin/articles/${id}/image-candidates?limit=24`);
    const list = Array.isArray(res?.data?.candidates) ? res.data.candidates : [];
    setCandidateState(id, { list, idx: 0, loading: false, error: "", prefetched: true });

    return { list, idx: 0, loading: false, error: "" };
  } catch (e) {
    console.warn("image-candidates fetch failed", e?.response?.data || e);
    setCandidateState(id, { list: [], idx: 0, loading: false, error: "failed", prefetched: true });

    return { list: [], idx: 0, loading: false, error: "failed" };
  }
}

async function cycleCandidate(article, dir) {
  const id = article?._id;
  if (!id) return;

  const st = await ensureCandidatesLoaded(article);
  const list = st?.list || [];
  if (list.length <= 1) return;

  const currentIdx = Number(imgCandidates[id]?.idx ?? 0);
  const nextIdx = (currentIdx + dir + list.length) % list.length;

  setCandidateState(id, { idx: nextIdx });

  const next = list[nextIdx];
  if (next?.url) {
    // Immediate: set value + save (also sets imagePublicId if resolvable)
    setImgState(id, { value: next.url });
    scheduleSaveImage(id, next.url);
  }
}

function renderImageCycleControls(article) {
  const id = article?._id;
  if (!id) return null;

  const st = imgCandidates[id] || { list: [], idx: 0, loading: false };
  const count = Array.isArray(st.list) ? st.list.length : 0;

  const hasTags = Array.isArray(article?.tags) && article.tags.length > 0;
  if (!hasTags) return null;

  const btn = {
    width: 28,
    height: 28,
    borderRadius: 28,
    border: "1px solid rgba(255,255,255,0.6)",
    background: "rgba(0,0,0,0.55)",
    color: "#fff",
    fontWeight: 800,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    lineHeight: 1,
    userSelect: "none",
  };

  return (
    <div
      style={{
        position: "absolute",
        top: 8,
        left: 8,
        right: 8,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
        pointerEvents: "none",
      }}
    >
      <button
        type="button"
        title="Previous matching image"
        style={{ ...btn, pointerEvents: "auto", opacity: st.loading ? 0.6 : 1 }}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          cycleCandidate(article, -1);
        }}
      >
        ◀
      </button>

      <div
        style={{
          pointerEvents: "none",
          fontSize: 11,
          padding: "4px 8px",
          borderRadius: 999,
          background: "rgba(0,0,0,0.55)",
          border: "1px solid rgba(255,255,255,0.35)",
          color: "#fff",
          opacity: count ? 1 : 0.85,
          whiteSpace: "nowrap",
        }}
      >
        {st.loading
  ? "Loading…"
  : count
  ? `${(st.idx || 0) + 1}/${count}`
  : st.prefetched
  ? "No matches"
  : "…"}

      </div>

      <button
        type="button"
        title="Next matching image"
        style={{ ...btn, pointerEvents: "auto", opacity: st.loading ? 0.6 : 1 }}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          cycleCandidate(article, +1);
        }}
      >
        ▶
      </button>
    </div>
  );
}


  function onChangeQuickImage(id, value) {

    setImgState(id, { value });
    scheduleSaveImage(id, value);
  }

  // ⬇⬇ NEW: force this article to use the default image from backend
  async function handleUseDefaultImage(id) {
    try {
      setImgState(id, { saving: "saving" });

      const res = await api.post(`/admin/articles/${id}/use-default-image`);
      const data = res?.data || {};

      const nextImage = data.imageUrl || DEFAULT_IMAGE_URL;
      const syncOg = !!(imgEdits[id]?.syncOg ?? true);
      const nextOg = data.ogImage || (syncOg ? nextImage : "");

      updateItemsLocal((a) =>
        a._id === id
          ? {
              ...a,
              imageUrl: nextImage,
              ogImage: nextOg,
              imagePublicId: data.imagePublicId || a.imagePublicId,
              thumbImage: data.thumbImage || a.thumbImage,
              updatedAt: new Date().toISOString(),
            }
          : a
      );

      setImgState(id, { value: nextImage, saving: "saved" });
      setTimeout(() => setImgState(id, { saving: "idle" }), 900);
    } catch (e) {
      console.error("default image failed", e?.response?.data || e);
      setImgState(id, { saving: "error" });
      toast.push({
        type: "error",
        title: "Default image failed",
        message: String(e?.response?.data?.error || e.message || e),
      });
    }
  }
  // ⬇⬇ NEW: re-run ImageLibrary auto-pick for this article (clears image then repicks)
  async function handleRepickImage(id) {
    try {
      setImgState(id, { saving: "saving" });

      const res = await api.post(`/admin/articles/${id}/repick-image`);
      const data = res?.data || {};
      const a = data.article || null;

      if (!a) {
        throw new Error("repick returned no article");
      }

      const nextImage = (a.imageUrl || "").trim() || DEFAULT_IMAGE_URL;
      const nextOg = (a.ogImage || "").trim() || nextImage;
      const nextThumb = (a.thumbImage || "").trim() || nextImage;

      updateItemsLocal((row) =>
        row._id === id
          ? {
              ...row,
              imageUrl: nextImage,
              ogImage: nextOg,
              thumbImage: nextThumb,
              imagePublicId: a.imagePublicId || row.imagePublicId,
              autoImageDebug: a.autoImageDebug || row.autoImageDebug,
              updatedAt: new Date().toISOString(),
            }
          : row
      );

      setImgState(id, { value: nextImage, saving: "saved" });
      setTimeout(() => setImgState(id, { saving: "idle" }), 900);

      toast.push({
        type: "success",
        title: "Auto image re-picked",
        message: "Picked the best ImageLibrary match for this article.",
      });
    } catch (e) {
      console.error("repick image failed", e?.response?.data || e);
      setImgState(id, { saving: "error" });
      toast.push({
        type: "error",
        title: "Re-pick failed",
        message: String(e?.response?.data?.error || e.message || e),
      });
    }
  }



  // ⬇⬇ NEW: generate an AI hero image for this article
  async function handleGenerateAiImage(id) {
    try {
      setImgState(id, { saving: "saving" });

      const res = await api.post(`/admin/articles/${id}/ai-image`);
      const data = res?.data || {};

      // Backend returns these fields from your curl test
      const nextImage = data.imageUrl || "";
      const nextOg = data.ogImage || nextImage || "";
      const nextThumb = data.thumbImage || nextImage || "";

      updateItemsLocal((a) =>
        a._id === id
          ? {
              ...a,
              imageUrl: nextImage || a.imageUrl,
              ogImage: nextOg || a.ogImage,
              thumbImage: nextThumb || a.thumbImage,
              imagePublicId: data.imagePublicId || a.imagePublicId,
              updatedAt: new Date().toISOString(),
            }
          : a
      );

      // Keep inline editor in sync
      setImgState(id, {
        value: nextImage || imgEdits[id]?.value || "",
        saving: "saved",
      });

      setTimeout(() => setImgState(id, { saving: "idle" }), 900);

      toast.push({
        type: "success",
        title: "AI image created",
        message: "Hero image updated from AI generator.",
      });
    } catch (e) {
      console.error("ai image failed", e?.response?.data || e);
      setImgState(id, { saving: "error" });
      toast.push({
        type: "error",
        title: "AI image failed",
        message: String(e?.response?.data?.error || e.message || e),
      });
    }
  }

  return (
    <div className="admin-articles-root" style={{ display: "grid", gap: 12 }}>
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
          style={{
            ...btnPrimary,
            opacity: isAdmin ? 1 : 0.6,
            pointerEvents: isAdmin ? "auto" : "none",
          }}
        >
          Publish
        </button>

        <button
          onClick={() => bulkAction("unpublish")}
          style={{
            ...btnGhost,
            opacity: isAdmin ? 1 : 0.6,
            pointerEvents: isAdmin ? "auto" : "none",
          }}
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
            <option key={c.slug} value={normalizeSlug(c.slug)}>
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
    flexDirection: "column",
    alignItems: "center",   // ✅ center horizontally
    gap: 10,
    justifySelf: "center",  // ✅ center inside grid column
  }}
>
  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
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

  <button onClick={openCreate} style={{ ...btnPrimary, padding: "10px 14px" }}>
    New Article
  </button>
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
          className="admin-articles-table"
          style={{
            width: "100%",
            fontSize: 14,
            borderCollapse: "collapse",
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
                const imgState =
                  imgEdits[a._id] || {
                    value: a.imageUrl || "",
                    saving: "idle",
                    syncOg: true,
                  };

                /* ✅ ADD THESE 2 LINES RIGHT HERE */
                const placement = placementLabel(a.homepagePlacement);
                const placementStyle = placementBadgeStyle(a.homepagePlacement);

                const dotColor =
                  imgState.saving === "saving"
                    ? "#f59e0b"
                    : imgState.saving === "saved"
                    ? "#10b981"
                    : imgState.saving === "error"
                    ? "#ef4444"
                    : "#d1d5db";

                const hasVideo = !!a.videoUrl;

                // NEW: RSS origin info
                const sourceUrl = a.sourceUrl || "";
                let sourceLabel = "";
                if (sourceUrl) {
                  try {
                    const u = new URL(sourceUrl);
                    sourceLabel = u.hostname.replace(/^www\./, "");
                  } catch {
                    sourceLabel = sourceUrl;
                  }
                }

                // NEW: body word count for display
                const bodyWordCount = (a.body || "").split(/\s+/).filter(Boolean).length;

                // status badge style
                const statusBadge =
                  a.status === "published"
                    ? badgeGreen
                    : a.status === "scheduled"
                    ? badgeYellow
                    : badgeGray;

                return (
                  <tr key={a._id} className="article-row-card" style={{ borderTop: "1px solid #f0f0f0" }}>
                    <td style={td}>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(a._id)}
                        onChange={() => toggleSelect(a._id)}
                      />
                    </td>
                    <td className="article-main-cell" style={td}>
                      {/* Card header: AI pill + title + inline status */}
                      <div className="article-card-header">
                        {a.source === "ai-batch" && (
                          <span className="pill-created-ai" style={aiPill}>
                            CREATED BY AI
                          </span>
                        )}
                        <div
                          className="article-title-row"
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "flex-start",
                            gap: 8,
                            flexWrap: "wrap",
                          }}
                        >
                          <div
                            style={{
                              fontWeight: 600,
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                              flexWrap: "wrap",
                              maxWidth: "100%",
                            }}
                          >
                            <span className="article-title-text" style={{ wordBreak: "break-word" }}>
                              {a.title}
                            </span>

                            {bodyWordCount > 0 && (
                              <span
                                style={{
                                  fontSize: 11,
                                  color: "#6b7280",
                                  whiteSpace: "nowrap",
                                }}
                                title={`Approx. ${bodyWordCount} words in body`}
                              >
                                · {bodyWordCount} words
                              </span>
                            )}
                          </div>
                          <div
                            style={{
                              display: "flex",
                              gap: 6,
                              alignItems: "center",
                              flexWrap: "wrap",
                            }}
                          >
                            <span className="status-inline" style={{ ...badge, ...statusBadge }}>
                              {a.status}
                            </span>

                            {placement ? (
                              <span
                                className="placement-inline"
                                style={{ ...badge, ...(placementStyle || {}) }}
                                title={`Homepage placement: ${placement}`}
                              >
                                {placement}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>

                      {sourceLabel && (
                        <div
                          className="article-source-url"
                          style={{ color: "#4b5563", fontSize: 11, marginTop: 4 }}
                        >
                          Source:{" "}
                          {sourceUrl ? (
                            <a
                              href={sourceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ color: "#2563eb", textDecoration: "none" }}
                            >
                              {sourceLabel}
                            </a>
                          ) : (
                            sourceLabel
                          )}
                        </div>
                      )}

                      {/* slug (just under title on mobile) */}
                      <div className="article-slug" style={{ color: "#666", fontSize: 12, marginTop: 6 }}>
                        {a.slug}
                      </div>

                      {/* image alt (visible under slug) – uses top-level OR seo.imageAlt */}
                      {(a.imageAlt || a.seo?.imageAlt) && (
                        <div className="article-image-alt" style={{ color: "#dc2626", fontSize: 11, marginTop: 2 }}>
                          {a.imageAlt || a.seo?.imageAlt}
                        </div>
                      )}

                      {/* tags preview */}
                      {Array.isArray(a.tags) && a.tags.length > 0 && (
                        <div
                          style={{
                            marginTop: 6,
                            display: "flex",
                            gap: 6,
                            flexWrap: "wrap",
                          }}
                        >
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

                      {/* ✅ Why this image? (autoImageDebug) */}
                        {a?.autoImageDebug ? (
                          <details style={{ marginTop: 8 }}>
                            <summary style={{ cursor: "pointer", fontWeight: 700, fontSize: 12, color: "#111827" }}>
                              Why this image?
                            </summary>
                            <pre
                              style={{
                                marginTop: 6,
                                padding: 10,
                                borderRadius: 10,
                                background: "#0b1220",
                                color: "#e5e7eb",
                                fontSize: 12,
                                overflow: "auto",
                                maxHeight: 260,
                                border: "1px solid rgba(255,255,255,0.08)",
                              }}
                            >
                              {JSON.stringify(a.autoImageDebug, null, 2)}
                            </pre>
                          </details>
                        ) : null}


                      {/* Mobile-only preview just under slug+tags */}
                      <div className="thumb-mobile-only" style={{ marginTop: 10 }}>
                        {(() => {
                          // ✅ FIX #1: STOP normalizing for display
                          const baseImage = (imgState?.value || a.imageUrl || a.thumbImage || "").trim();

                          const thumbSrc = withCacheBust(
                            baseImage || DEFAULT_IMAGE_URL,
                            a.updatedAt || Date.now()
                          );

                          const hasVideo = !!a.videoUrl;
                          const sourceImageUrl = a.sourceImageUrl || "";

                          return (
                            <div style={{ display: "grid", gap: 10 }}>
                              {/* ✅ Hero preview (your current preview) */}
                              <div
                                style={{
                                  width: "100%",
                                  maxWidth: 320,
                                  position: "relative",
                                  borderRadius: 10,
                                  overflow: "hidden",
                                  border: "1px solid #eee",
                                  background: "#000",
                                }}
                              >
                               <img
                                    src={thumbSrc}
                                    alt=""
                                    loading="lazy"
                                    decoding="async"
                                    style={{
                                      width: "100%",
                                      height: "auto",
                                      display: "block",
                                      background: "#f8fafc",
                                      objectFit: "cover",
                                    }}
                                    onError={(e) => {
                                      const tries = Number(e.currentTarget.dataset.tries || 0);

                                      if (tries === 0 && baseImage && baseImage !== DEFAULT_IMAGE_URL) {
                                        e.currentTarget.dataset.tries = "1";
                                        e.currentTarget.src = withCacheBust(DEFAULT_IMAGE_URL, Date.now());
                                        return;
                                      }

                                      if (tries === 1) {
                                        e.currentTarget.dataset.tries = "2";
                                        e.currentTarget.src = withCacheBust(DEFAULT_IMAGE_URL, Date.now() + 1);
                                        return;
                                      }

                                      e.currentTarget.src = withCacheBust(DEFAULT_IMAGE_URL, Date.now() + 2);
                                    }}
                                  />

                                  {renderImageCycleControls(a)}

                                  {hasVideo ? (
                                    <video

                                    src={toPlayableVideoSrc(a.videoUrl)}
                                    autoPlay
                                    loop
                                    muted
                                    playsInline
                                    preload="metadata"
                                    style={{
                                      position: "absolute",
                                      right: 8,
                                      bottom: 8,
                                      width: "55%",
                                      height: "40%",
                                      borderRadius: 10,
                                      border: "1px solid rgba(255,255,255,0.35)",
                                      background: "#000",
                                      objectFit: "cover",
                                      boxShadow: "0 8px 20px rgba(0,0,0,0.35)",
                                      pointerEvents: "none",
                                    }}
                                  />
                                ) : null}
                              </div>

                              {/* ✅ FIX #2: Publisher source image should NOT hide on error */}
                              {sourceImageUrl ? (
                                <div style={{ maxWidth: 320 }}>
                                  <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>
                                    Source Image (Publisher)
                                  </div>
                                  <img
                                    src={sourceImageUrl}
                                    alt="Source"
                                    loading="lazy"
                                    decoding="async"
                                    referrerPolicy="no-referrer"
                                    crossOrigin="anonymous"
                                    style={{
                                      width: "100%",
                                      height: "auto",
                                      display: "block",
                                      objectFit: "cover",
                                      borderRadius: 10,
                                      border: "1px solid rgba(0,0,0,0.08)",
                                      background: "#f8fafc",
                                    }}
                                    onError={(e) => {
                                      // ✅ DON'T HIDE IT. Show it as faded so you know it's blocked.
                                      e.currentTarget.style.opacity = "0.3";
                                      e.currentTarget.title =
                                        "Blocked by publisher (hotlink protection). Import to Cloudinary to show.";
                                    }}
                                  />
                                  <div style={{ fontSize: 12, color: "#b91c1c", marginTop: 6 }}>
                                    If this looks blank/grey → the publisher blocks direct image loading. You must
                                    import it to Cloudinary.
                                  </div>
                                </div>
                              ) : null}
                            </div>
                          );
                        })()}
                      </div>

                      {/* Quick Image URL editor (with open/default/AI image buttons) */}
                      <div style={{ marginTop: 10 }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            marginBottom: 4,
                            flexWrap: "wrap",
                          }}
                        >
                          <span style={{ fontSize: 12, color: "#555", fontWeight: 600 }}>
                            Image URL (quick)
                          </span>
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

                        <div
                          className="image-tools-desktop"
                          style={{
                            display: "flex",
                            gap: 8,
                            alignItems: "center",
                            marginTop: 6,
                            flexWrap: "wrap",
                          }}
                        >
                          <label
                            style={{
                              display: "inline-flex",
                              gap: 6,
                              alignItems: "center",
                              fontSize: 12,
                            }}
                          >
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
                                style={{
                                  textDecoration: "none",
                                  color: "#1B4965",
                                  fontSize: 12,
                                }}
                              >
                                open image ↗
                              </a>
                              <span style={{ color: "#999", fontSize: 12 }}>|</span>
                            </>
                          ) : null}

                          <button
                            type="button"
                            onClick={() =>
                              window.open(
                                `/article/${encodeURIComponent(a.slug)}`,
                                "_blank",
                                "noopener,noreferrer"
                              )
                            }
                            style={{ ...btnSmallGhost, padding: "4px 8px", fontSize: 12 }}
                            title="Open public article page"
                          >
                            open article ↗
                          </button>

                          <button
                            type="button"
                            onClick={() => handleUseDefaultImage(a._id)}
                            style={{ ...btnSmallGhost, padding: "4px 8px", fontSize: 12 }}
                            title="Force this article to use the default image"
                          >
                            default image
                          </button>

                          <button
                            type="button"
                            onClick={() => handleRepickImage(a._id)}
                            style={{ ...btnSmallGhost, padding: "4px 8px", fontSize: 12 }}
                            title="Clear current image and re-pick the best ImageLibrary match"
                          >
                            re-pick
                          </button>

                          <button
  type="button"
  onClick={() => {
    // Optional: open with a default tag filter (first tag) and category
    const tag = Array.isArray(a?.tags) && a.tags.length ? a.tags[0] : "";
    const cat = String(a?.category?.slug || a?.category || "").trim();

    const qs = new URLSearchParams();
    if (tag) qs.set("tag", tag);
    if (cat) qs.set("category", cat);

    window.open(
      `/admin/image-library${qs.toString() ? `?${qs.toString()}` : ""}`,
      "_blank",
      "noopener,noreferrer"
    );
  }}
  style={{ ...btnSmallGhost, padding: "4px 8px", fontSize: 12 }}
  title="Open Image Library (new tab)"
>
  Image Library
</button>


                          <button
                            type="button"
                            onClick={() => handleGenerateAiImage(a._id)}
                            style={{ ...btnSmallPrimary, padding: "4px 8px", fontSize: 12 }}
                            title="Generate an AI hero image for this article"
                          >
                            AI image
                          </button>
                        </div>
                      </div>

                      {/* Mobile-only main actions block: default / AI / delete + publish / edit */}
                      <div className="article-actions-mobile">
                        <div className="article-actions-row article-actions-row-top">
                          <button
                            type="button"
                            onClick={() => handleUseDefaultImage(a._id)}
                            style={btnSmallGhost}
                          >
                            default image
                          </button>

                          <button
                            type="button"
                            onClick={() => handleRepickImage(a._id)}
                            style={btnSmallGhost}
                          >
                            re-pick
                          </button>
                          <button
                            type="button"
                            onClick={() => handleGenerateAiImage(a._id)}
                            style={btnSmallPrimary}
                          >
                            AI image
                          </button>
                          <button type="button" onClick={() => deleteOne(a._id)} style={btnSmallDanger}>
                            Delete
                          </button>
                        </div>
                        <div className="article-actions-row article-actions-row-bottom">
                          {a.status !== "published" && (
                            <button
                              type="button"
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
                              type="button"
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
                          <button type="button" onClick={() => openEdit(a._id)} style={btnSmallGhost}>
                            Edit
                          </button>
                        </div>
                      </div>
                    </td>

                    {/* Status column (desktop only; hidden on mobile via CSS) */}
                    <td style={td}>
                      <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                        <span style={{ ...badge, ...statusBadge }}>{a.status}</span>
                        {placement ? <span style={{ ...badge, ...(placementStyle || {}) }}>{placement}</span> : null}
                      </div>
                    </td>

                    <td style={td}>{a.category?.name || a.category || "—"}</td>
                    <td style={td}>{fmt(a.publishedAt) || "—"}</td>
                    <td style={td}>{fmt(a.updatedAt)}</td>

                    {/* Preview column – desktop only */}
                    <td style={{ ...td, width: 230 }}>
                      {(() => {
                        // ✅ FIX #1: STOP normalizing for display
                        const baseImage = (imgState?.value || a.imageUrl || a.thumbImage || "").trim();

                        const thumbSrc = withCacheBust(
                          baseImage || DEFAULT_IMAGE_URL,
                          a.updatedAt || Date.now()
                        );

                        const hasVideo = !!a.videoUrl;
                        const sourceImageUrl = a.sourceImageUrl || "";

                        return (
                          <div
                            className="thumb-desktop-only"
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: 8,
                              alignItems: "flex-start",
                            }}
                          >
                            <span style={badge}>{a.category?.name || a.category || "General"}</span>

                            {/* ✅ Hero preview */}
                            <div
                              style={{
                                width: 200,
                                height: 120,
                                position: "relative",
                                borderRadius: 10,
                                overflow: "hidden",
                                border: "1px solid #eee",
                                background: "#000",
                              }}
                            >
                              <img
                                  id={`thumb-${a._id}`}
                                  src={thumbSrc}
                                  alt=""
                                  loading="lazy"
                                  decoding="async"
                                  style={{
                                    width: "100%",
                                    height: "100%",
                                    objectFit: "cover",
                                    display: "block",
                                    background: "#f8fafc",
                                  }}
                                  onError={(e) => {
                                    const tries = Number(e.currentTarget.dataset.tries || 0);
                                    if (tries === 0 && baseImage && baseImage !== DEFAULT_IMAGE_URL) {
                                      e.currentTarget.dataset.tries = "1";
                                      e.currentTarget.src = withCacheBust(DEFAULT_IMAGE_URL, Date.now());
                                      return;
                                    }
                                    if (tries === 1) {
                                      e.currentTarget.dataset.tries = "2";
                                      e.currentTarget.src = withCacheBust(DEFAULT_IMAGE_URL, Date.now() + 1);
                                      return;
                                    }
                                    e.currentTarget.src = withCacheBust(DEFAULT_IMAGE_URL, Date.now() + 2);
                                  }}
                                />

                                {renderImageCycleControls(a)}

                                {hasVideo ? (
                                  <video

                                  src={toPlayableVideoSrc(a.videoUrl)}
                                  autoPlay
                                  loop
                                  muted
                                  playsInline
                                  preload="metadata"
                                  style={{
                                    position: "absolute",
                                    right: 6,
                                    bottom: 6,
                                    width: "52%",
                                    height: "52%",
                                    borderRadius: 10,
                                    border: "1px solid rgba(255,255,255,0.35)",
                                    background: "#000",
                                    objectFit: "cover",
                                    boxShadow: "0 8px 20px rgba(0,0,0,0.35)",
                                    pointerEvents: "none",
                                  }}
                                />
                              ) : null}
                            </div>

                            {/* ✅ FIX #2: Publisher source image should NOT hide on error */}
                            {sourceImageUrl ? (
                              <div style={{ marginTop: 2, width: 200 }}>
                                <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>
                                  Source Image (Publisher)
                                </div>
                                <img
                                  src={sourceImageUrl}
                                  alt="Source"
                                  loading="lazy"
                                  decoding="async"
                                  referrerPolicy="no-referrer"
                                  crossOrigin="anonymous"
                                  style={{
                                    width: "100%",
                                    height: "auto",
                                    display: "block",
                                    objectFit: "cover",
                                    borderRadius: 10,
                                    border: "1px solid rgba(0,0,0,0.08)",
                                    background: "#f8fafc",
                                  }}
                                  onError={(e) => {
                                    // ✅ DON'T HIDE IT. Show it as faded so you know it's blocked.
                                    e.currentTarget.style.opacity = "0.3";
                                    e.currentTarget.title =
                                      "Blocked by publisher (hotlink protection). Import to Cloudinary to show.";
                                  }}
                                />
                                <div style={{ fontSize: 12, color: "#b91c1c", marginTop: 6 }}>
                                  If this looks blank/grey → the publisher blocks direct image loading. You must import
                                  it to Cloudinary.
                                </div>
                              </div>
                            ) : null}
                          </div>
                        );
                      })()}
                    </td>

                    {/* Actions column – desktop only */}
                    <td style={td}>
                      <div className="article-actions-desktop" style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
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
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            style={btnGhost}
          >
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
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  flexWrap: "wrap",
                }}
              >
                {editingId && (
                  <span
                    style={{
                      fontSize: 12,
                      color: autoSaving ? "#92400e" : "#16a34a",
                    }}
                  >
                    {autoSaving
                      ? "Saving…"
                      : autoSavedAt
                      ? `Saved ${autoSavedAt.toLocaleTimeString()}`
                      : "Autosave on"}
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
                  category: normalizeSlug(d.category ?? f.category),

                  status: d.status ?? f.status,
                  homepagePlacement: normalizePlacement(d.homepagePlacement ?? f.homepagePlacement),

                  publishAt: d.publishAt ?? f.publishAt,
                  imageUrl: d.imageUrl ?? f.imageUrl,
                  imagePublicId: d.imagePublicId ?? f.imagePublicId,
                  // ✅ ADD THESE
                  sourceImageUrl: d.sourceImageUrl ?? f.sourceImageUrl,
                  sourceImageFrom: d.sourceImageFrom ?? f.sourceImageFrom,
                  sourceUrl: d.sourceUrl ?? f.sourceUrl,
                  videoUrl: d.videoUrl ?? f.videoUrl, // NEW
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
                    value={normalizeSlug(form.category) || "general"}
                    onChange={(e) => setForm((f) => ({ ...f, category: normalizeSlug(e.target.value) }))}
                    style={inp}
                  >
                    {categories.map((c) => (
                      <option key={c.slug} value={normalizeSlug(c.slug)}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label style={lbl}>
                  Homepage Placement
                  <select
                    value={form.homepagePlacement || "none"}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, homepagePlacement: normalizePlacement(e.target.value) }))
                    }
                    style={inp}
                  >
                    <option value="none">None</option>
                    <option value="top">Top Stories</option>
                    <option value="latest">Latest News</option>
                    <option value="trending">Trending News</option>
                  </select>
                </label>

                {/* Year field – only when History category is selected */}
                {isHistorySelected && (
                  <label style={lbl}>
                    Year (BC)
                    <input
                      type="number"
                      min="0"
                      max="4000"
                      value={form.year}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          year: e.target.value,
                        }))
                      }
                      style={inp}
                      placeholder="e.g. 2500"
                    />
                    <div
                      style={{
                        fontSize: 12,
                        color: "#666",
                        marginTop: 4,
                      }}
                    >
                      Only used for History articles (treated as BC).
                    </div>
                  </label>
                )}

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
                        publishAt: s === "published" ? f.publishAt || toLocalInputValue() : f.publishAt,
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

              {/* ✅ NEW: Source Image (Publisher) — read-only */}
              {form?.sourceImageUrl ? (
                <div style={{ marginTop: 24 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>
                    Source Image (Publisher)
                  </div>

                  <img
                    src={form.sourceImageUrl}
                    alt="Source"
                    loading="lazy"
                    decoding="async"
                    referrerPolicy="no-referrer"
                    crossOrigin="anonymous"
                    style={{
                      width: "100%",
                      height: "auto",
                      display: "block",
                      objectFit: "cover",
                      borderRadius: 10,
                      border: "1px solid rgba(0,0,0,0.08)",
                      background: "#f8fafc",
                    }}
                    onError={(e) => {
                      // ✅ DON'T HIDE IT. Show it as faded so you know it's blocked.
                      e.currentTarget.style.opacity = "0.3";
                      e.currentTarget.title =
                        "Blocked by publisher (hotlink protection). Import to Cloudinary to show.";
                    }}
                  />
                  <div style={{ fontSize: 12, color: "#b91c1c", marginTop: 6 }}>
                    If this looks blank/grey → the publisher blocks direct image loading. You must import it to
                    Cloudinary.
                  </div>

                  <div style={{ marginTop: 6, fontSize: 12, opacity: 0.7 }}>
                    From: {form.sourceImageFrom || "unknown"}
                  </div>

                  {form?.sourceUrl && (
                    <a
                      href={form.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        display: "inline-block",
                        marginTop: 6,
                        fontSize: 13,
                        color: "#2563eb",
                        textDecoration: "none",
                      }}
                    >
                      Open original article ↗
                    </a>
                  )}
                </div>
              ) : null}

              {/* NEW: optional video URL */}
              <label style={lbl}>
                Video URL (optional)
                <input
                  value={form.videoUrl}
                  onChange={(e) => setForm((f) => ({ ...f, videoUrl: e.target.value }))}
                  placeholder="Paste video link (Google Drive / Cloudinary)"
                  style={inp}
                />
              </label>

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
                      setForm((f) => ({
                        ...f,
                        metaTitle: e.target.value.slice(0, META_TITLE_MAX),
                      }))
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
                <div
                  style={{
                    color: "var(--color-warning, #b45309)",
                    fontSize: 12,
                    marginTop: -4,
                  }}
                >
                  Tip: Add a short, meaningful alt description so screen readers and SEO can understand the image.
                </div>
              )}
              <label style={lbl}>
                Meta Description
                <textarea
                  rows={2}
                  value={form.metaDesc}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      metaDesc: e.target.value.slice(0, META_DESC_MAX),
                    }))
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
              <div
                style={{
                  border: "1px dashed #e5e7eb",
                  borderRadius: 12,
                  padding: 10,
                }}
              >
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    marginBottom: 6,
                  }}
                >
                  GEO Preview
                </div>
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
                <div
                  style={{
                    fontSize: 12,
                    color: "#64748b",
                    marginTop: 4,
                  }}
                >
                  Supports simple formatting:
                  <br /># Heading, ## Subheading, - bullet, 1. numbered item, **highlighted text**
                </div>
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

      {/* RESPONSIVE CSS for this page */}
      <style>{`
        .admin-articles-root {
          width: 100%;
        }

        /* Filters row: 4 columns on desktop, stacked on small screens */
        .admin-articles-filters {
          grid-template-columns: 160px 200px 1fr auto;
        }

        .thumb-mobile-only {
          display: none;
        }

        .thumb-desktop-only {
          display: flex;
        }

        .article-actions-mobile {
          display: none;
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

        /* ---------- Mobile layout for articles table ---------- */
        @media (max-width: 768px) {
          .admin-articles-table {
            min-width: 100%;
            border-collapse: separate;
            border-spacing: 0 12px;
          }

          /* Hide header row on mobile (card look) */
          .admin-articles-table thead {
            display: none;
          }

          .thumb-mobile-only {
            display: block;
          }

          .thumb-desktop-only {
            display: none;
          }

          .image-tools-desktop {
            display: none;
          }

          .article-actions-desktop {
            display: none;
          }

          .admin-articles-table tbody tr.article-row-card {
            display: block;
            border-radius: 18px;
            border: 1px solid #e5e7eb;
            background: #ffffff;
            box-shadow: 0 10px 22px rgba(15,23,42,0.08);
            overflow: hidden;
          }

          .admin-articles-table tbody tr.article-row-card > td {
            display: block;
            width: 100%;
            padding: 0;
          }

          .admin-articles-table tbody tr.article-row-card > td:first-child {
            display: none; /* hide row checkbox on small screens */
          }

          .admin-articles-table tbody tr.article-row-card > td.article-main-cell {
            padding: 14px 14px 16px;
          }

          .article-card-header {
            align-items: center;
            gap: 8px;
          }

          .article-card-header .article-title-row {
            width: 100%;
          }

          .article-card-header .article-title-text {
            font-size: 15px;
            line-height: 1.4;
          }

          .article-slug {
            font-size: 12px;
            color: #6b7280;
            margin-top: 4px;
          }

          .article-actions-mobile {
            display: flex;
            flex-direction: column;
            gap: 8px;
            margin-top: 12px;
          }

          .article-actions-mobile .article-actions-row {
            display: grid;
            gap: 8px;
          }

         .article-actions-mobile .article-actions-row-top {
          grid-template-columns: repeat(2, minmax(0, 1fr));
          }


          .article-actions-mobile .article-actions-row-bottom {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .article-actions-mobile button {
            width: 100%;
          }

          /* Hide numeric/detail columns on mobile */
          .admin-articles-table tbody tr.article-row-card > td:nth-child(3),
          .admin-articles-table tbody tr.article-row-card > td:nth-child(4),
          .admin-articles-table tbody tr.article-row-card > td:nth-child(5),
          .admin-articles-table tbody tr.article-row-card > td:nth-child(6),
          .admin-articles-table tbody tr.article-row-card > td:nth-child(7),
          .admin-articles-table tbody tr.article-row-card > td:nth-child(8) {
            display: none;
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

/* ✅ PASTE THIS BLOCK RIGHT HERE (AFTER fmt, BEFORE styles) */
function normalizePlacement(v) {
  const s = String(v || "").trim().toLowerCase();

  // accept both code values and labels
  if (s === "top" || s === "top stories") return "top";
  if (s === "latest" || s === "latest news") return "latest";
  if (s === "trending" || s === "trending news") return "trending";

  // treat none/empty as none
  if (!s || s === "none" || s === "null" || s === "undefined") return "none";

  return s; // fallback
}

function placementLabel(v) {
  const p = normalizePlacement(v);
  if (p === "top") return "Top Stories";
  if (p === "latest") return "Latest News";
  if (p === "trending") return "Trending News";
  return "";
}

function placementBadgeStyle(v) {
  const p = normalizePlacement(v);
  if (p === "top")
    return {
      background: "#ff7a00", // bright orange
      color: "#000000", // black text
      borderColor: "#000000", // black border
      fontWeight: 800, // bold
      boxShadow: "3px 3px 0 #000", // solid black shadow (hard)
    };

  if (p === "latest")
    return {
      background: "#fbff00ff", // bright orange
      color: "#000000", // black text
      borderColor: "#000000", // black border
      fontWeight: 800, // bold
      boxShadow: "3px 3px 0 #000", // solid black shadow (hard)
    };
  if (p === "trending")
    return {
      background: "#88ff00ff", // bright orange
      color: "#000000", // black text
      borderColor: "#000000", // black border
      fontWeight: 800, // bold
      boxShadow: "3px 3px 0 #000", // solid black shadow (hard)
    };
  return null;
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
const th = {
  padding: 10,
  fontWeight: 600,
  fontSize: 13,
  borderBottom: "1px solid #eee",
};
const td = { padding: 10, verticalAlign: "top" };
const lbl = { display: "grid", gap: 6, fontSize: 13, color: "#111827" };

const badge = {
  padding: "2px 8px",
  borderRadius: 999,
  fontSize: 12,
  border: "1px solid #e5e7eb",
  background: "#f3f4f6",
};
const badgeGreen = {
  background: "#f0fdf4",
  color: "#166534",
  borderColor: "#86efac",
};
const badgeYellow = {
  background: "#fffbeb",
  color: "#92400e",
  borderColor: "#fde68a",
};
const badgeGray = {
  background: "#f3f4f6",
  color: "#111827",
  borderColor: "#e5e7eb",
};

const btnBase = {
  padding: "8px 12px",
  borderRadius: 10,
  border: "1px solid #e5e7eb",
  background: "#fff",
  cursor: "pointer",
  fontSize: 13,
};
const btnGhost = { ...btnBase, background: "#fff" };
const btnPrimary = {
  ...btnBase,
  background: "#1D9A8E",
  color: "#fff",
  borderColor: "#1D9A8E",
};
const btnDanger = {
  ...btnBase,
  background: "#fef2f2",
  borderColor: "#fee2e2",
  color: "#b91c1c",
};

const btnSmallBase = {
  padding: "6px 10px",
  borderRadius: 10,
  border: "1px solid #e5e7eb",
  background: "#fff",
  cursor: "pointer",
  fontSize: 12,
};
const btnSmallGhost = { ...btnSmallBase, background: "#fff" };
const btnSmallPrimary = {
  ...btnSmallBase,
  background: "#1D9A8E",
  color: "#fff",
  borderColor: "#1D9A8E",
};
const btnSmallDanger = {
  ...btnSmallBase,
  background: "#fef2f2",
  borderColor: "#fee2e2",
  color: "#b91c1c",
};

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

/* RESPONSIVE grid helpers */
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

const aiPill = {
  padding: "4px 14px",
  borderRadius: 999,
  fontSize: 11,
  fontWeight: 700,
  background: "linear-gradient(90deg,#ec4899,#f97316)",
  color: "#ffffff",
  boxShadow: "0 0 10px rgba(236,72,153,0.7)",
  letterSpacing: 0.4,
  textTransform: "uppercase",
};
