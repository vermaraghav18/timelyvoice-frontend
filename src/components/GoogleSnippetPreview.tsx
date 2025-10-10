// components/GoogleSnippetPreview.tsx
import React from "react";

type Props = {
  url?: string;                 // e.g. https://example.com/article/slug
  title: string;                // what you plan to use for <title> / og:title
  description: string;          // meta description
};

export default function GoogleSnippetPreview({ url = "https://example.com/article/your-slug", title, description }: Props) {
  return (
    <div className="rounded-xl border p-4 bg-white">
      <div className="text-sm text-gray-500 mb-1">{url}</div>
      <div className="text-[#1a0dab] text-xl leading-6 truncate">{title || "Preview title"}</div>
      <div className="text-[#4d5156] text-sm mt-1 line-clamp-3">
        {description || "Preview of your meta description will appear here."}
      </div>
    </div>
  );
}
