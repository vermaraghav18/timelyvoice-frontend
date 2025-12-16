// frontend/src/pages/public/TopNews.jsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { api, cachedGet } from "../../lib/publicApi.js";
import { upsertTag, removeManagedHeadTags } from "../../lib/seoHead.js";

import SiteNav from "../../components/SiteNav.jsx";
import SiteFooter from "../../components/SiteFooter.jsx";
import "./TopNews.css";

import { ensureRenderableImage } from "../../lib/images.js";

const FALLBACK_HERO_IMAGE = "/tv-default-hero.jpg";

const CAT_COLORS = {
  World: "linear-gradient(135deg, #3B82F6 0%, #0073ff 100%)",
  Politics: "linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%)",
  Business: "linear-gradient(135deg, #10B981 0%, #34D399 100%)",
  Entertainment: "linear-gradient(135deg, #A855F7 0%, rgb(119, 0, 255))",
  General: "linear-gradient(135deg, #6B7280 0%, #9CA3AF 100%)",
  Health: "linear-gradient(135deg, #EF4444 0%, #F87171 100%)",
  Science: "linear-gradient(135deg, #22D3EE 0%, #67E8F9 100%)",
  Sports: "linear-gradient(135deg, #abcc16 0%, #9dff00 100%)",
  Tech: "linear-gradient(135deg, #FB7185 0%, #FDA4AF 100%)",
};

/* ---------- Cloudinary optimizer ---------- */
function optimizeCloudinary(url, width = 520) {
  if (!url || !url.includes("/upload/")) return url;
  return url.replace("/upload/", `/upload/f_auto,q_auto,w_${width}/`);
}

/* ---------- Video helpers ---------- */
function getDriveFileId(url = "") {
  const s = String(url || "").trim();
  if (!s) return "";
  const byPath = s.match(/\/file\/d\/([^/]+)/);
  const byParam = s.match(/[?&]id=([^&]+)/);
  return (byPath && byPath[1]) || (byParam && byParam[1]) || "";
}

function getVideoPreview(url = "") {
  const raw = String(url || "").trim();
  if (!raw) return { kind: "none", src: "" };

  // Only allow real mp4 streams
  if (raw.endsWith(".mp4")) {
    return { kind: "direct", src: raw };
  }

  // Disable Drive videos (not preview-safe)
  return { kind: "none", src: "" };
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

function normalizeTopNews(items = []) {
  return items
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

function getCategoryName(a) {
  const raw =
    a?.category?.name ??
    (typeof a?.category === "string" ? a.category : "General");
  const map = {
    world: "World",
    politics: "Politics",
    business: "Business",
    entertainment: "Entertainment",
    general: "General",
    health: "Health",
    science: "Science",
    sports: "Sports",
    tech: "Tech",
    technology: "Tech",
  };
  return map[String(raw).toLowerCase()] || "General";
}

export default function TopNews() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  /* ---------- SEO ---------- */
  useEffect(() => {
    removeManagedHeadTags();

    document.title = "Top News — The Timely Voice";
    const canonical = `${window.location.origin}/top-news`;

    upsertTag("link", { rel: "canonical", href: canonical });
    upsertTag("meta", {
      name: "description",
      content: "All the latest headlines across categories, newest first.",
    });
  }, []);

  /* ---------- Fetch (cached) ---------- */
  useEffect(() => {
    let cancel = false;

    (async () => {
      try {
        setLoading(true);
        setErr("");

        const data = await cachedGet(
          "/top-news",
          { params: { page: 1, limit: 50, mode: "public" } },
          30_000 // ✅ 30s cache
        );

        if (!cancel) {
          const sorted = normalizeTopNews(data?.items || []);
          setItems(sorted);
        }
      } catch (e) {
        if (!cancel) setErr("Failed to load top news");
      } finally {
        if (!cancel) setLoading(false);
      }
    })();

    return () => {
      cancel = true;
    };
  }, []);

  return (
    <>
      <SiteNav />

      <main className="container">
        <h1 className="tn-title">Top News</h1>

        {loading && <div className="tn-status">Loading…</div>}
        {err && <div className="tn-error">{err}</div>}

        {!loading && !err && (
          <ul className="tn-list">
            {items.map((a) => {
              const href = articleHref(a.slug);
              const catName = getCategoryName(a);
              const color = CAT_COLORS[catName] || "#4B5563";

              const rawImage = ensureRenderableImage(a);
              const thumbSrc = optimizeCloudinary(
                rawImage || FALLBACK_HERO_IMAGE,
                520
              );

              const hasVideo = !!a.videoUrl;
              const video = hasVideo ? getVideoPreview(a.videoUrl) : null;

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
                    <span className="tn-badge">
                      <span className="tn-pill" style={{ background: color }}>
                        {catName}
                      </span>
                    </span>

                   {hasVideo && video.kind === "direct" ? (
  <video
    src={video.src}
    autoPlay
    muted
    loop
    playsInline
    preload="metadata"
    poster={thumbSrc}
    style={{ width: "100%", height: "100%", objectFit: "cover" }}
  />
) : (
  <img
    src={thumbSrc}
    alt={a.imageAlt || a.title || "The Timely Voice"}
    loading="lazy"
    decoding="async"
    onError={(e) => {
      e.currentTarget.src = FALLBACK_HERO_IMAGE;
    }}
  />
)}

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
