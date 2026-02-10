import React, { useEffect, useMemo, useState } from "react";
import { apiJSON, authHeader } from "../lib/api";
import MediaPickerModal from "./MediaPickerModal";
import GoogleSnippetPreview from "../components/GoogleSnippetPreview"; // adjust if your path differs

// ✅ Human-friendly UI component to display "why this image was chosen"
function AutoPickWhyBox({ title, why }) {
  const [showDetails, setShowDetails] = useState(false);

  if (!why) return null;

  // Support multiple shapes that may exist (preview vs saved vs older data)
  const mode = why?.mode || "unknown";
  const picked =
    why?.picked ||
    why?.publicId ||
    why?.chosen?.publicId ||
    why?.chosen?.url ||
    why?.url ||
    null;

  const score = typeof why?.score === "number" ? why.score : null;

  const matchedTokens =
    Array.isArray(why?.matchedTokens) && why.matchedTokens.length
      ? why.matchedTokens
      : null;

  const matchedPhrases =
    Array.isArray(why?.matchedPhrases) && why.matchedPhrases.length
      ? why.matchedPhrases
      : null;

  // Try to show a timestamp if present
  const pickedAt =
    why?.pickedAt ||
    why?.picked_at ||
    why?.picked_time ||
    why?.pickedAtIso ||
    null;

  // Build ONE simple sentence for humans
  let simpleReason = "";

  if (mode === "cloudinary-picked") {
    if (matchedPhrases?.length) {
      simpleReason = `Picked because it matched: ${matchedPhrases.join(", ")}.`;
    } else if (matchedTokens?.length) {
      simpleReason = `Picked because it matched: ${matchedTokens.join(", ")}.`;
    } else {
      simpleReason = "Picked from Cloudinary because it looked like the best match.";
    }
  } else if (mode === "fallback-default") {
    simpleReason = why?.reason
      ? `Used the default image because: ${why.reason}`
      : "Used the default image because no suitable match was found.";
  } else if (String(mode).startsWith("manual")) {
    simpleReason = "This image was chosen manually by the admin.";
  } else if (
    mode === "kept-existing" ||
    mode === "kept-existing-url" ||
    mode === "kept-existing-public-id"
  ) {
    simpleReason = "The system kept the image that was already present.";
  } else {
    simpleReason = why?.reason ? String(why.reason) : "No reason available.";
  }

  return (
    <div className="mt-3 border rounded-xl p-3 bg-gray-50">
      <div className="flex items-center justify-between">
        <div className="font-semibold text-sm">{title}</div>

        <div className="flex items-center gap-3">
          {pickedAt ? (
            <div className="text-xs text-gray-500">
              {new Date(pickedAt).toLocaleString()}
            </div>
          ) : null}

          <button
            type="button"
            className="text-xs underline text-gray-600"
            onClick={() => setShowDetails((v) => !v)}
          >
            {showDetails ? "Hide details" : "Show details"}
          </button>
        </div>
      </div>

      <div className="mt-2 text-sm text-gray-800 space-y-1">
        <div>
          <b>Why:</b> {simpleReason}
        </div>

        {picked ? (
          <div className="break-all">
            <b>Picked:</b> {String(picked)}
          </div>
        ) : null}

        {score !== null ? (
          <div>
            <b>Score:</b> {String(score)}
          </div>
        ) : null}
      </div>

      {showDetails ? (
        <div className="mt-2">
          <div className="text-xs font-semibold text-gray-600 mb-1">
            Full details
          </div>
          <pre className="text-xs bg-white border rounded-lg p-2 overflow-x-auto">
            {JSON.stringify(why, null, 2)}
          </pre>
        </div>
      ) : null}
    </div>
  );
}

// Auto hero image planner: asks backend which hero it would pick for the current draft.
function usePlanImage(article, headers) {
  const [autoPick, setAutoPick] = useState(null);
  const [autoLoading, setAutoLoading] = useState(false);
  const [autoError, setAutoError] = useState(null);

  useEffect(() => {
    const draft = {
      title: article?.title || "",
      summary: article?.summary || "",
      category: article?.category || "",
      tags: Array.isArray(article?.tags) ? article.tags : [],
      slug: article?.slug || "",
    };

    let cancelled = false;
    (async () => {
      try {
        setAutoLoading(true);
        setAutoError(null);
        const r = await fetch("/api/articles/plan-image", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(headers || {}), // pass Authorization here
          },
          body: JSON.stringify(draft),
        });
        const j = await r.json();
        if (!cancelled) setAutoPick(j);
      } catch (e) {
        if (!cancelled) setAutoError("Could not auto-pick image");
      } finally {
        if (!cancelled) setAutoLoading(false);
      }
    })();

    // re-run when the content that affects image choice changes
  }, [article?.title, article?.summary, article?.category, JSON.stringify(article?.tags || [])]);

  return { autoPick, autoLoading, autoError };
}

// Soft display limits (Google usually truncates around here)
const TITLE_SOFT_LIMIT = 60;
const DESC_SOFT_LIMIT = 160;

// Hard backend truncation already enforced server-side: 80/200.

export default function ArticleEditor({ article, setArticle, token }) {
  const [pickerOpen, setPickerOpen] = useState(false);

  // --- Local state for cover image alt text (kept from your version)
  const [imageAlt, setImageAlt] = useState(article?.imageAlt || "");

  // --- Local state for SEO fields (save on blur like you do for alt)
  const [metaTitle, setMetaTitle] = useState(article?.metaTitle || "");
  const [metaDesc, setMetaDesc] = useState(article?.metaDesc || "");
  const [ogImage, setOgImage] = useState(article?.ogImage || "");

  // URL to import (Cloudinary or Google Drive)
  const [importUrl, setImportUrl] = useState("");

  // Keep locals in sync when parent article changes (e.g. after PATCH elsewhere)
  useEffect(() => {
    setImageAlt(article?.imageAlt || "");
    setMetaTitle(article?.metaTitle || "");
    setMetaDesc(article?.metaDesc || "");
    setOgImage(article?.ogImage || "");
  }, [article?.imageAlt, article?.metaTitle, article?.metaDesc, article?.ogImage]);

  const H = authHeader(token);

  // Ask backend for the current auto-picked hero (live preview)
  const { autoPick, autoLoading, autoError } = usePlanImage(article, H);

  // Decide what to show in the UI: manual override wins, else show auto-pick.
  const heroPublicId = article?.imagePublicId || autoPick?.publicId || null;
  const heroUrl = article?.imageUrl || autoPick?.url || null;
  const heroMode = article?.imagePublicId ? "Manual" : autoPick?.publicId ? "Auto" : "None";

  // ✅ apply auto-picked hero AND send "why" to backend via PATCH
  async function useAutoPickAsCover() {
    if (!autoPick?.url || !autoPick?.publicId) return;

    const whyPayload = autoPick?.why
      ? {
          ...autoPick.why,
          publicId: autoPick.publicId,
          url: autoPick.url,
          pickedAt: new Date().toISOString(),
        }
      : null;

    // Update UI immediately
    setArticle((prev) => ({
      ...prev,
      autoImageDebug: whyPayload || prev?.autoImageDebug,
    }));

    // Send why to backend
    await setCoverFromMedia(
      { url: autoPick.url, publicId: autoPick.publicId },
      { autoImageDebug: whyPayload }
    );
  }

  // ✅ allow extra patch fields (like autoImageDebug)
  async function setCoverFromMedia(m, extraPatch = {}) {
    const payload = {
      imageUrl: m.url || "",
      imagePublicId: m.publicId || "",
      ...extraPatch,
    };

    // If your media service returns a server-generated OG variant, use it
    if (m.ogUrl) payload.ogImage = m.ogUrl;

    // Removing cover also clears OG if no dedicated OG set
    if (!m.url && !m.publicId) payload.ogImage = "";

    // If user manually chooses/removes cover and no debug is provided, keep state consistent
    const isManualAction = Boolean(m.url || m.publicId);

    if (isManualAction && payload.autoImageDebug === undefined) {
      payload.autoImageDebug = { mode: "manual", pickedAt: new Date().toISOString() };
    }

    if (!isManualAction) {
      // Removing cover: clear debug
      payload.autoImageDebug = null;
    }

    const updated = await apiJSON("PATCH", `/api/articles/${article.id}`, payload, H);
    setArticle(updated);
  }

  // Import a cover image from any URL (Google Drive or Cloudinary)
  async function importCoverFromUrl() {
    const trimmed = (importUrl || "").trim();
    if (!trimmed) return;

    try {
      const res = await apiJSON(
        "POST",
        "/api/admin/articles/import-image-from-url",
        { url: trimmed },
        H
      );

      if (!res || res.error) {
        alert(res?.error || "Failed to import image from URL");
        return;
      }

      await setCoverFromMedia(
        {
          url: res.url,
          publicId: res.publicId,
        },
        { autoImageDebug: { mode: "manual", pickedAt: new Date().toISOString() } }
      );

      setImportUrl("");
    } catch (e) {
      console.error("importCoverFromUrl error", e);
      alert("Failed to import image from URL");
    }
  }

  // Persist alt text (on blur)
  async function saveAltText(nextAlt) {
    const updated = await apiJSON(
      "PATCH",
      `/api/articles/${article.id}`,
      { imageAlt: nextAlt },
      H
    );
    setArticle(updated);
  }

  // Persist SEO fields (each saves on blur)
  async function saveSeo(patch) {
    const updated = await apiJSON(
      "PATCH",
      `/api/articles/${article.id}`,
      patch,
      H
    );
    setArticle(updated);
  }

  // Quick action: set OG to current cover
  async function useCoverAsOg() {
    const next = article?.imageUrl || "";
    setOgImage(next);
    await saveSeo({ ogImage: next });
  }

  // Quick action: clear OG
  async function clearOg() {
    setOgImage("");
    await saveSeo({ ogImage: "" });
  }

  // Effective values used for preview (falling back to title/summary)
  const effectiveTitle = (metaTitle || article?.title || "").trim();
  const effectiveDesc = (metaDesc || article?.summary || "").trim();

  // Soft-limit warnings
  const titleOver = effectiveTitle.length > TITLE_SOFT_LIMIT;
  const descOver = effectiveDesc.length > DESC_SOFT_LIMIT;

  // Build preview URL (tweak if your site base lives elsewhere)
  const siteBaseUrl =
    (import.meta && import.meta.env && import.meta.env.VITE_SITE_URL) ||
    "http://localhost:5173";

  const previewUrl = useMemo(() => {
    const slug = article?.slug || "your-slug";
    return `${siteBaseUrl}/article/${encodeURIComponent(slug)}`;
  }, [article?.slug, siteBaseUrl]);

  return (
    <div className="space-y-8">
      {/* === Your existing fields for Title, Slug, Summary, Body go elsewhere on the page === */}

      {/* ===== Cover Section (Manual + Auto Preview) ===== */}
      <section className="border rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Cover</h3>
          <small className="opacity-70">
            {autoLoading ? "Picking…" : `${heroMode}: ${heroPublicId || "(none)"}`}
          </small>
        </div>

        {/* If a manual cover exists, show it; otherwise, show the auto suggestion if available */}
        {article.imageUrl ? (
          <div className="flex items-center gap-3">
            <img
              src={article.imageUrl}
              alt={article.imageAlt || article.title || "Cover image"}
              className="w-32 h-20 object-cover rounded"
            />
            <div className="text-sm text-gray-600 break-all">
              {article.imagePublicId}
            </div>
          </div>
        ) : autoPick?.url ? (
          <div className="flex items-center gap-3">
            <img
              src={autoPick.url}
              alt={article?.title || "Auto hero preview"}
              className="w-32 h-20 object-cover rounded"
            />
            <div className="text-sm text-gray-600 break-all">
              {autoPick.publicId}
              <div className="text-xs text-gray-500">
                (Auto suggestion from backend)
              </div>
              {autoError && (
                <div className="text-xs text-red-600">{autoError}</div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-sm text-gray-500">No cover selected</div>
        )}

        {/* ✅ show WHY (preview + saved) */}
        {!article.imageUrl && autoPick?.why ? (
          <AutoPickWhyBox title="Why the auto-picker chose this (preview)" why={autoPick.why} />
        ) : null}

        {(article?.autoImageDebug || article?._autoImageDebug) ? (
        <AutoPickWhyBox
          title="Why the auto-picker chose this (saved)"
          why={article?.autoImageDebug || article?._autoImageDebug}
        />
      ) : null}


        <div className="flex flex-wrap gap-2">
          <button
            className="border rounded px-3 py-1"
            onClick={() => setPickerOpen(true)}
          >
            Choose from Library
          </button>

          {article.imageUrl ? (
            <button
              className="border rounded px-3 py-1"
              onClick={() => setCoverFromMedia({ url: "", publicId: "" })}
            >
              Remove
            </button>
          ) : null}

          {/* Offer a 1-click apply when we only have an auto suggestion */}
          {!article.imageUrl && autoPick?.url && autoPick?.publicId ? (
            <button
              className="border rounded px-3 py-1"
              onClick={useAutoPickAsCover}
              title="Use the auto-selected image as the cover"
            >
              Use Auto Pick
            </button>
          ) : null}
        </div>

        {/* NEW: Import from URL (Google Drive / Cloudinary) */}
        <div className="mt-3 space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Image URL (Cloudinary or Google Drive)
          </label>
          <div className="flex gap-2">
            <input
              type="url"
              className="flex-1 border rounded px-3 py-2 text-sm"
              placeholder="Paste Google Drive or Cloudinary image URL here"
              value={importUrl}
              onChange={(e) => setImportUrl(e.target.value)}
            />
            <button
              type="button"
              className="border rounded px-3 py-2 text-sm whitespace-nowrap"
              onClick={importCoverFromUrl}
            >
              Import URL
            </button>
          </div>
          <p className="text-xs text-gray-500">
            You can paste a Google Drive share link (for example{" "}
            “https://drive.google.com/file/d/.../view”) or a normal Cloudinary URL.
            The system will upload it to Cloudinary and set it as the cover image.
          </p>
        </div>

        {/* Alt text input (kept exactly as before) */}
        <div className="pt-2">
          <label className="block text-sm font-medium mb-1" htmlFor="cover-alt">
            Cover image alt text
          </label>
          <input
            id="cover-alt"
            type="text"
            className="w-full border rounded px-3 py-2 text-sm"
            placeholder='Describe the image for screen readers (e.g., "Sunset over city skyline")'
            value={imageAlt}
            onChange={(e) => setImageAlt(e.target.value)}
            onBlur={() => saveAltText(imageAlt)}
          />
          <p className="text-xs text-gray-500 mt-1">
            Improves accessibility and SEO. Keep it concise and descriptive.
          </p>
        </div>

        {/* Optional hint when OG is set (kept as-is) */}
        {article.ogImage ? (
          <p className="text-xs text-gray-500">
            Social preview image (OG):{" "}
            <span className="break-all">{article.ogImage}</span>
          </p>
        ) : null}
      </section>

      <MediaPickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        token={token}
        onPicked={setCoverFromMedia}
      />

      {/* ===== SEO Section ===== */}
      <section className="border rounded-xl p-4 space-y-6">
        <h3 className="font-semibold">SEO</h3>

        {/* Meta Title */}
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="meta-title">
            Meta Title
          </label>
          <input
            id="meta-title"
            type="text"
            className="w-full border rounded px-3 py-2 text-sm"
            placeholder="Custom title for search & social (optional)"
            value={metaTitle}
            onChange={(e) => setMetaTitle(e.target.value)}
            onBlur={() => saveSeo({ metaTitle })}
            maxLength={80} // server will truncate to 80 regardless
          />
          <div className={`text-xs mt-1 ${titleOver ? "text-red-600" : "text-gray-500"}`}>
            {effectiveTitle.length}/{TITLE_SOFT_LIMIT} (soft limit)
            {titleOver && " – consider shortening for best display in Google."}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Fallback: article title.
          </div>
        </div>

        {/* Meta Description */}
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="meta-desc">
            Meta Description
          </label>
          <textarea
            id="meta-desc"
            className="w-full border rounded px-3 py-2 text-sm"
            placeholder="1–2 sentences that entice a click (optional)"
            rows={3}
            value={metaDesc}
            onChange={(e) => setMetaDesc(e.target.value)}
            onBlur={() => saveSeo({ metaDesc })}
            maxLength={200} // server will truncate to 200
          />
          <div className={`text-xs mt-1 ${descOver ? "text-red-600" : "text-gray-500"}`}>
            {effectiveDesc.length}/{DESC_SOFT_LIMIT} (soft limit)
            {descOver && " – consider shortening for best display in Google."}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Fallback: summary excerpt from the article.
          </div>
        </div>

        {/* OG Image URL */}
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="og-image">
            Open Graph Image URL
          </label>
          <div className="flex gap-2">
            <input
              id="og-image"
              type="url"
              className="w-full border rounded px-3 py-2 text-sm"
              placeholder="https://… (leave blank to use cover image)"
              value={ogImage}
              onChange={(e) => setOgImage(e.target.value)}
              onBlur={() => saveSeo({ ogImage })}
            />
            <button
              type="button"
              className="border rounded px-3 py-2 text-sm"
              onClick={useCoverAsOg}
              disabled={!article?.imageUrl}
              title={article?.imageUrl ? "Use cover image as OG" : "Select a cover first"}
            >
              Use cover
            </button>
            <button
              type="button"
              className="border rounded px-3 py-2 text-sm"
              onClick={clearOg}
            >
              Clear
            </button>
          </div>

          <div className="mt-2">
            {ogImage ? (
              <img src={ogImage} alt="" className="max-h-28 rounded border" />
            ) : article?.imageUrl ? (
              <div className="text-xs text-gray-500">
                No OG override set — social will fall back to your cover image.
              </div>
            ) : (
              <div className="text-xs text-gray-500">No OG override set.</div>
            )}
          </div>

          <p className="text-xs text-gray-500 mt-1">
            Recommended size: 1200×630.
          </p>
        </div>

        {/* Google result preview */}
        <div className="pt-2">
          <div className="text-sm font-medium mb-2">Google Result Preview</div>
          <GoogleSnippetPreview
            url={previewUrl}
            title={effectiveTitle || "Preview title"}
            description={effectiveDesc || "Preview description will appear here."}
          />
        </div>
      </section>
    </div>
  );
}
