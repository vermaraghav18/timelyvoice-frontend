// frontend/src/pages/public/TagPage.jsx
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { upsertTag, removeManagedHeadTags } from "../../lib/seoHead.js";

import SiteNav from "../../components/SiteNav.jsx";
import SiteFooter from "../../components/SiteFooter.jsx";

import "./TopNews.css";
import { ensureRenderableImage } from "../../lib/images.js";

const FALLBACK_HERO_IMAGE = "/tv-default-hero.jpg";

/* ---------- Cloudinary optimizer ---------- */
function optimizeCloudinary(url, width = 520) {
  if (!url || !url.includes("/upload/")) return url;
  return url.replace("/upload/", `/upload/f_auto,q_auto,w_${width}/`);
}

/* ---------- utils ---------- */
function articleHref(slug) {
  if (!slug) return "#";
  if (slug.startsWith("/article/")) return slug;
  return `/article/${slug}`;
}

function parseTs(v) {
  if (!v) return 0;
  if (typeof v === "number") return v;
  const t = Date.parse(String(v).replace(" ", "T"));
  return Number.isFinite(t) ? t : 0;
}

function normalizeItems(items = []) {
  return (Array.isArray(items) ? items : [])
    .map((i, idx) => {
      const ts = Math.max(
        parseTs(i.publishedAt),
        parseTs(i.publishAt),
        parseTs(i.updatedAt),
        parseTs(i.createdAt)
      );
      return { ...i, _ts: ts, _idx: idx };
    })
    .sort((a, b) => (b._ts === a._ts ? a._idx - b._idx : b._ts - a._ts));
}

function prettifyTag(x = "") {
  const s = String(x || "").trim();
  if (!s) return "Tag";
  return s
    .split(/[-_\s]+/g)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/**
 * ✅ FIX (Issue B, robust):
 * Use an absolute fetch() to the proven working endpoint:
 *   GET https://<site>/api/articles?tag=<tag>&page=1&limit=40
 *
 * This avoids any axios/cachedGet baseURL / /api/api issues.
 */
async function fetchByTag(tag, { page = 1, limit = 40 } = {}) {
  const t = String(tag || "").trim();
  if (!t) return { items: [], total: 0 };

  const base = typeof window !== "undefined" ? window.location.origin : "";
  const url =
    `${base}/api/articles` +
    `?tag=${encodeURIComponent(t)}` +
    `&page=${encodeURIComponent(page)}` +
    `&limit=${encodeURIComponent(limit)}`;

  const r = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  const text = await r.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }

  if (!r.ok) {
    const msg = (text || "").slice(0, 140);
    throw new Error(`Tag fetch failed (${r.status}): ${msg}`);
  }

  if (Array.isArray(data?.items)) {
    return { items: data.items, total: data.total ?? data.items.length };
  }
  if (Array.isArray(data?.articles)) {
    return { items: data.articles, total: data.total ?? data.articles.length };
  }
  if (Array.isArray(data)) {
    return { items: data, total: data.length };
  }

  return { items: [], total: 0 };
}

export default function TagPage() {
  const { tag } = useParams();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const tagTitle = useMemo(() => prettifyTag(tag), [tag]);
  const canonical = useMemo(
    () => `${window.location.origin}/tag/${encodeURIComponent(tag || "")}`,
    [tag]
  );

  /* ---------- SEO ---------- */
  useEffect(() => {
    removeManagedHeadTags();
    document.title = `${tagTitle} — The Timely Voice`;

    upsertTag("link", { rel: "canonical", href: canonical });
    upsertTag("meta", {
      name: "description",
      content: `Latest stories tagged ${tagTitle}, newest first.`,
    });
  }, [tagTitle, canonical]);

  /* ---------- Fetch ---------- */
  useEffect(() => {
    let cancel = false;

    (async () => {
      try {
        setLoading(true);
        setErr("");

        const res = await fetchByTag(tag, { page: 1, limit: 40 });
        const sorted = normalizeItems(res?.items || []);

        if (!cancel) setItems(sorted);
      } catch (e) {
        if (!cancel) setErr(e?.message || "Failed to load stories for this tag");
      } finally {
        if (!cancel) setLoading(false);
      }
    })();

    return () => {
      cancel = true;
    };
  }, [tag]);

  return (
    <>
      <SiteNav />

      <main className="container">
        <h1 className="tn-title">Tag: {tagTitle}</h1>

        {loading && <div className="tn-status">Loading…</div>}
        {err && <div className="tn-error">{err}</div>}

        {!loading && !err && items.length === 0 && (
          <div className="tn-status">No stories found for this tag.</div>
        )}

        {!loading && !err && items.length > 0 && (
          <ul className="tn-list">
            {items.map((a) => {
              const href = articleHref(a.slug);
              const rawImage = ensureRenderableImage(a);
              const thumbSrc = optimizeCloudinary(
                rawImage || FALLBACK_HERO_IMAGE,
                520
              );

              return (
                <li className="tn-item" key={a._id || a.id || a.slug}>
                  <div className="tn-left">
                    <Link to={href} className="tn-item-title">
                      {a.title}
                    </Link>

                    {(a.summary || a.description) && (
                      <Link to={href} className="tn-summary">
                        {a.summary || a.description}
                      </Link>
                    )}

                    <div className="tn-divider"></div>

                    <div className="tn-meta">
                      <span className="tn-source">The Timely Voice</span>
                    </div>
                  </div>

                  <Link to={href} className="tn-thumb">
                    <img
                      src={thumbSrc}
                      alt={a.imageAlt || a.title || "The Timely Voice"}
                      loading="lazy"
                      decoding="async"
                      onError={(e) => {
                        e.currentTarget.src = FALLBACK_HERO_IMAGE;
                      }}
                    />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </main>

      <SiteFooter />
    </>
  );
}
