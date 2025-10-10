// components/SeoFields.tsx
import React, { useMemo } from "react";
import GoogleSnippetPreview from "./GoogleSnippetPreview";

const TITLE_SOFT_LIMIT = 60;     // warn above this
const DESC_SOFT_LIMIT  = 160;    // warn above this

type Props = {
  slug?: string;
  values: {
    title: string;          // article title (fallback)
    summary: string;        // article summary (fallback)
    imageUrl?: string;      // main image (fallback for og:image)
    metaTitle: string;
    metaDesc: string;
    ogImage: string;
    imageAlt: string;
  };
  onChange: (patch: Partial<Props["values"]>) => void;
  siteBaseUrl?: string;     // e.g. http://localhost:5173
};

export default function SeoFields({ slug = "your-slug", values, onChange, siteBaseUrl = "http://localhost:5173" }: Props) {
  const effectiveTitle = values.metaTitle?.trim() || values.title?.trim() || "";
  const effectiveDesc  = values.metaDesc?.trim()  || values.summary?.trim() || "";
  const effectiveOg    = values.ogImage?.trim()   || values.imageUrl || "";

  const titleOver = effectiveTitle.length > TITLE_SOFT_LIMIT;
  const descOver  = effectiveDesc.length  > DESC_SOFT_LIMIT;

  const pageUrl = useMemo(() => `${siteBaseUrl}/article/${encodeURIComponent(slug)}`, [siteBaseUrl, slug]);

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">SEO</h3>

      {/* Meta title */}
      <div>
        <label className="block text-sm font-medium mb-1">Meta Title</label>
        <input
          className="w-full rounded-lg border p-2"
          placeholder="Custom title for search & social (optional)"
          value={values.metaTitle}
          onChange={(e) => onChange({ metaTitle: e.target.value })}
          maxLength={80} // backend truncates to 80 anyway
        />
        <div className={`text-xs mt-1 ${titleOver ? "text-red-600" : "text-gray-500"}`}>
          {effectiveTitle.length}/{TITLE_SOFT_LIMIT} (soft limit)
          {titleOver && " – Consider shortening for best display in Google."}
        </div>
        <div className="text-xs text-gray-500 mt-1">
          Fallback: article title (“{values.title || "Untitled"}”)
        </div>
      </div>

      {/* Meta description */}
      <div>
        <label className="block text-sm font-medium mb-1">Meta Description</label>
        <textarea
          className="w-full rounded-lg border p-2"
          placeholder="1–2 sentences that entice a click (optional)"
          rows={3}
          value={values.metaDesc}
          onChange={(e) => onChange({ metaDesc: e.target.value })}
          maxLength={200} // backend truncates to 200
        />
        <div className={`text-xs mt-1 ${descOver ? "text-red-600" : "text-gray-500"}`}>
          {effectiveDesc.length}/{DESC_SOFT_LIMIT} (soft limit)
          {descOver && " – Consider shortening for best display in Google."}
        </div>
        <div className="text-xs text-gray-500 mt-1">
          Fallback: summary preview from the article body.
        </div>
      </div>

      {/* Open Graph override */}
      <div className="grid md:grid-cols-2 gap-4 items-end">
        <div>
          <label className="block text-sm font-medium mb-1">OG Image (optional)</label>
          <input
            className="w-full rounded-lg border p-2"
            placeholder="https://… (leave blank to use article image)"
            value={values.ogImage}
            onChange={(e) => onChange({ ogImage: e.target.value })}
          />
          <div className="text-xs text-gray-500 mt-1">
            Fallback: article image. Recommended 1200×630.
          </div>
        </div>

        <div className="justify-self-end">
          {effectiveOg ? (
            <img src={effectiveOg} alt="" className="max-h-28 rounded-lg border" />
          ) : (
            <div className="h-28 w-48 rounded-lg border grid place-items-center text-xs text-gray-400">
              No OG image
            </div>
          )}
        </div>
      </div>

      {/* Image alt */}
      <div>
        <label className="block text-sm font-medium mb-1">Image Alt Text</label>
        <input
          className="w-full rounded-lg border p-2"
          placeholder="Describe the image for accessibility & SEO"
          value={values.imageAlt}
          onChange={(e) => onChange({ imageAlt: e.target.value })}
        />
        <div className="text-xs text-gray-500 mt-1">
          Good alt text helps accessibility and can aid image search.
        </div>
      </div>

      {/* Live Google preview */}
      <div className="pt-2">
        <div className="text-sm font-medium mb-2">Google Result Preview</div>
        <GoogleSnippetPreview
          url={pageUrl}
          title={effectiveTitle || "Preview title"}
          description={effectiveDesc || "Preview description will appear here."}
        />
      </div>
    </div>
  );
}
