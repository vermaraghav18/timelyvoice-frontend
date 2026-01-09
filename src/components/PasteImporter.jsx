// src/components/PasteImporter.jsx
import { useState } from "react";
import yaml from "js-yaml";

// Helper: Date → "YYYY-MM-DDTHH:mm" in LOCAL time (for datetime-local input)
function toLocalInputValue(date = new Date()) {
  if (!date) return "";
  const d = new Date(date);
  // Adjust so that toISOString() reflects local time instead of UTC
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

// Accept both JSON and YAML; return a plain object or throw.
function parseAny(text) {
  const raw = (text || "").trim();
  if (!raw) throw new Error("Paste JSON or YAML");
  if (raw.startsWith("{") || raw.startsWith("[")) {
    return JSON.parse(raw);
  }
  return yaml.load(raw);
}

// ✅ NEW: normalize category/categorySlug into the slug format the form expects
// "New Delhi" -> "new-delhi"
function toCategorySlug(v) {
  const s = String(v || "").trim().toLowerCase();
  if (!s) return "";
  return s
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Normalize pasted data into the shape your ArticlesPage form expects.
// { title, slug, summary, author, category, status, publishAt,
//   imageUrl, imagePublicId, imageAlt, metaTitle, metaDesc, ogImage,
//   geoMode, geoAreasText, tags[], body }
function normalize(obj) {
  const d = obj || {};

  // Allow nested shapes e.g. { seo: { metaTitle, metaDescription, ogImageUrl, imageAlt } }
  const seo = d.seo || {};
  const geo = d.geo || {};

  // ─────────────────────────────────────────────────────────────
  // publishAt: we NO LONGER override the form's current value.
  // If JSON has publishAt/publishedAt, we convert it, but leave it
  // as undefined so ArticlesPage keeps its own default "now".
  // If you want a specific schedule, change it in the form UI.
  // ─────────────────────────────────────────────────────────────
  let publishAt;
  const rawPublishAt = d.publishAt ?? d.publishedAt;
  if (rawPublishAt) {
    try {
      const dt = new Date(rawPublishAt);
      if (!isNaN(dt)) {
        // If you ever want to use it, this is the correct local format:
        publishAt = toLocalInputValue(dt);
      }
    } catch (_) {
      // ignore parse errors, leave publishAt undefined
    }
  }
  // NOTE: we deliberately do NOT fall back to "now" here; the form already has it.

  // tags: accept string "a,b" or array
  let tags = d.tags;
  if (typeof tags === "string") {
    tags = tags
      .split(/[,\s]+/g)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  if (!Array.isArray(tags)) tags = [];

  // geo areas: accept array or string; form keeps a TEXT field "geoAreasText"
  let geoAreasText = d.geoAreasText;
  if (!geoAreasText) {
    const arr = geo.areas || d.geoAreas || [];
    if (Array.isArray(arr)) geoAreasText = arr.join(", ");
    else if (typeof arr === "string") geoAreasText = arr;
  }

  return {
    title: d.title || "",
    slug: d.slug || "",
    summary: d.summary || d.excerpt || "",
    author: d.author || "",

    // ✅ FIX: form expects category as a slug value (e.g. "india", "new-delhi")
    // Prefer categorySlug if provided; else derive from category name.
    // Fallback to "general" (slug) to match your dropdown values.
    category: toCategorySlug(d.categorySlug || d.category) || "general",

    status: (d.status || "published").toLowerCase(),

    // IMPORTANT: may be undefined. ArticlesPage.onApply uses:
    // publishAt: d.publishAt ?? f.publishAt
    // so if this is undefined, it keeps the existing form value (usually "now").
    publishAt,

    imageUrl: d.imageUrl || d.cover?.url || "",
    imagePublicId: d.imagePublicId || "",
    imageAlt: d.imageAlt || seo.imageAlt || d.cover?.alt || "",

    metaTitle: d.metaTitle || seo.metaTitle || "",
    metaDesc: d.metaDesc || d.metaDescription || seo.metaDescription || "",
    ogImage: d.ogImage || seo.ogImageUrl || "",

    geoMode: (d.geoMode || geo.mode || "global").toLowerCase(),
    geoAreasText: geoAreasText || "",

    tags,
    body: d.body || "",
  };
}

export default function PasteImporter({ onApply }) {
  const [raw, setRaw] = useState("");
  const [err, setErr] = useState(null);

  const handleApply = () => {
    try {
      setErr(null);
      const parsed = parseAny(raw);
      const norm = normalize(parsed);
      onApply(norm);
    } catch (e) {
      setErr(e?.message || "Invalid input");
    }
  };

  return (
    <div
      style={{
        border: "1px dashed #cbd5e1",
        borderRadius: 12,
        padding: 12,
        background: "#f8fafc",
        marginBottom: 10,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 8,
        }}
      >
        <div style={{ fontWeight: 600 }}>Paste JSON/YAML</div>
        <div style={{ fontSize: 12, color: "#64748b" }}>
          Tip: paste once → auto-fills all fields
        </div>
      </div>
      <textarea
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        rows={6}
        placeholder={`Example:
title: Shubman Gill becomes India’s top run-scorer in current WTC
slug: shubman-gill-india-top-runscorer-wtc
summary: ...
category: Sports
status: Published
publishAt: 2025-10-11T07:11:00+05:30
imageUrl: https://cdn.example.com/gill.jpg
seo:
  imageAlt: Shubman Gill raises his bat...
  metaTitle: Shubman Gill tops India’s run charts in current WTC
  ogImageUrl: https://cdn.example.com/gill-og.jpg
  metaDescription: ...
geo:
  mode: Global
  areas: ["country:IN"]
tags: ["cricket","WTC","Shubman Gill","India","sports"]
body: |
  ...`}
        style={{
          width: "100%",
          padding: 10,
          borderRadius: 10,
          border: "1px solid #e2e8f0",
          marginTop: 8,
        }}
      />
      {err && (
        <div style={{ color: "#b91c1c", fontSize: 12, marginTop: 6 }}>
          {err}
        </div>
      )}
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <button
          onClick={handleApply}
          style={{
            padding: "6px 10px",
            borderRadius: 8,
            background: "#1D9A8E",
            color: "#fff",
            border: 0,
          }}
        >
          Fill Form
        </button>
        <button
          onClick={() => {
            setRaw("");
            setErr(null);
          }}
          style={{
            padding: "6px 10px",
            borderRadius: 8,
            background: "#fff",
            border: "1px solid #e2e8f0",
          }}
        >
          Clear
        </button>
      </div>
    </div>
  );
}
