import React, { useEffect, useMemo, useState } from "react";
import { apiJSON, authHeader } from "../lib/api";
import MediaPickerModal from "./MediaPickerModal";
import GoogleSnippetPreview from "../components/GoogleSnippetPreview"; // adjust if your path differs

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

  // Keep locals in sync when parent article changes (e.g. after PATCH elsewhere)
  useEffect(() => {
    setImageAlt(article?.imageAlt || "");
    setMetaTitle(article?.metaTitle || "");
    setMetaDesc(article?.metaDesc || "");
    setOgImage(article?.ogImage || "");
  }, [article?.imageAlt, article?.metaTitle, article?.metaDesc, article?.ogImage]);

  const H = authHeader(token);

  // Choose/replace cover image
  async function setCoverFromMedia(m) {
    const payload = {
      imageUrl: m.url || "",
      imagePublicId: m.publicId || "",
    };
    // If your media service returns a server-generated OG variant, use it
    if (m.ogUrl) payload.ogImage = m.ogUrl;
    // Removing cover also clears OG if no dedicated OG set
    if (!m.url && !m.publicId) payload.ogImage = "";

    const updated = await apiJSON("PATCH", `/api/articles/${article.id}`, payload, H);
    setArticle(updated);
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

      {/* ===== Cover Section ===== */}
      <section className="border rounded-xl p-4 space-y-3">
        <h3 className="font-semibold">Cover</h3>

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
        ) : (
          <div className="text-sm text-gray-500">No cover selected</div>
        )}

        <div className="flex gap-2">
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
        </div>

        {/* Alt text input (UI + persistence) */}
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

        {/* Optional hint when OG is set */}
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
              <img
                src={ogImage}
                alt=""
                className="max-h-28 rounded border"
              />
            ) : article?.imageUrl ? (
              <div className="text-xs text-gray-500">
                No OG override set — social will fall back to your cover image.
              </div>
            ) : (
              <div className="text-xs text-gray-500">
                No OG override set.
              </div>
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
