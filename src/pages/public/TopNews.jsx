// frontend/src/pages/public/TopNews.jsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { cachedGet } from "../../lib/publicApi.js";
import { ensureRenderableImage } from "../../lib/images.js";

import SiteNav from "../../components/SiteNav.jsx";
import SiteFooter from "../../components/SiteFooter.jsx";
import "./TopNews.css";

const FALLBACK_HERO_IMAGE = "/tv-default-hero.jpg";

/* ---------- helpers ---------- */
function getCategoryName(a) {
  const s = a?.category || a?.categoryName || a?.categorySlug;
  return s ? String(s).charAt(0).toUpperCase() + String(s).slice(1) : "World";
}

function articleHref(slug) {
  if (!slug) return "#";
  return slug.startsWith("/article/") ? slug : `/article/${slug}`;
}

/* ✅ Robust timestamp parser (prevents 1970/20458d bug) */
function parseTs(v) {
  if (!v) return 0;

  // backend might send number (seconds or ms)
  if (typeof v === "number") {
    // seconds -> ms
    if (v < 1e12) return v * 1000;
    return v;
  }

  const s = String(v).trim();
  if (!s) return 0;

  // handle "YYYY-MM-DD HH:mm:ss" by converting to ISO-ish
  const normalized = s.includes("T") ? s : s.replace(" ", "T");
  const t = Date.parse(normalized);

  return Number.isFinite(t) ? t : 0;
}

/* ✅ Guard invalid/future times */
function timeAgo(ts) {
  const t = typeof ts === "number" ? ts : parseTs(ts);
  if (!t || !Number.isFinite(t)) return ""; // prevent 1970 huge numbers

  const diff = Date.now() - t;
  if (diff < 0) return "just now"; // if server clock ahead

  const s = Math.floor(diff / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);

  if (d >= 1) return `${d}d ago`;
  if (h >= 1) return `${h}h ago`;
  if (m >= 1) return `${m}m ago`;
  return "just now";
}

/* ✅ Pick the best available timestamp for the card */
function bestTs(a) {
  return (
    parseTs(a?.publishedAt) ||
    parseTs(a?.publishAt) ||
    parseTs(a?.updatedAt) ||
    parseTs(a?.createdAt) ||
    0
  );
}

export default function TopNews() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const data = await cachedGet("/top-news", { params: { page: 1, limit: 50 } });
      setItems(data?.items || []);
      setLoading(false);
    })();
  }, []);

  return (
    <>
      <SiteNav />

      <div className="tn-shell">
        <div className="tn-stage">
          <main className="tn-container">
            {loading && <div className="tn-status">Loading…</div>}

            <ul className="tn-list">
              {items.map((a) => {
                const href = articleHref(a.slug);
                const cat = getCategoryName(a);
                const ts = bestTs(a);
                const summary = a.summary || a.description || "";

                return (
                  <li className="tn-bcard" key={a._id || a.slug}>
                    {/* ✅ IMAGE ON TOP */}
                    <Link to={href} className="tn-bcard-media" aria-label={a.title}>
                      <span className="tn-bcard-badge">{cat}</span>

                      <img
                        src={ensureRenderableImage(a) || FALLBACK_HERO_IMAGE}
                        className="tn-bcard-img"
                        alt={a.title}
                        loading="lazy"
                        decoding="async"
                        onError={(e) => {
                          e.currentTarget.src = FALLBACK_HERO_IMAGE;
                        }}
                      />
                    </Link>

                    {/* ✅ TITLE BELOW IMAGE (ALL WHITE) */}
                    <Link
                      to={href}
                      className="tn-bcard-title"
                      aria-label={`Read: ${a.title}`}
                    >
                      {a.title}
                    </Link>

                    {/* ✅ FULL SUMMARY BELOW TITLE (NO QUOTES, NO READ MORE, NO CLAMP) */}
                    {summary && (
                      <Link to={href} className="tn-bcard-summary" aria-label="Open article">
                        {summary}
                      </Link>
                    )}

                    <div className="tn-bcard-footer">
                      <span className="tn-bcard-time">{timeAgo(ts) || "—"}</span>

                      {/* ✅ Plain text instead of BrandMark */}
                      <span className="tn-bcard-site">timelyvoice.com</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </main>
        </div>
      </div>

      <SiteFooter />
    </>
  );
}
