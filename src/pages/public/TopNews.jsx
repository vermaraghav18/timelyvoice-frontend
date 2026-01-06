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

/* ✅ Robust timestamp parser */
function parseTs(v) {
  if (!v) return 0;
  if (typeof v === "number") return v < 1e12 ? v * 1000 : v;
  const s = String(v).trim();
  if (!s) return 0;
  const t = Date.parse(s.includes("T") ? s : s.replace(" ", "T"));
  return Number.isFinite(t) ? t : 0;
}

function timeAgo(ts) {
  const t = typeof ts === "number" ? ts : parseTs(ts);
  if (!t) return "";
  const diff = Date.now() - t;
  if (diff < 0) return "just now";
  const m = Math.floor(diff / 60000);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d >= 1) return `${d}d ago`;
  if (h >= 1) return `${h}h ago`;
  if (m >= 1) return `${m}m ago`;
  return "just now";
}

function bestTs(a) {
  return (
    parseTs(a?.publishedAt) ||
    parseTs(a?.publishAt) ||
    parseTs(a?.updatedAt) ||
    parseTs(a?.createdAt) ||
    0
  );
}

/* ---------- badge colors ---------- */
function badgeClass(cat) {
  const c = String(cat || "").toLowerCase();
  if (c === "world") return "tn-badge-world";
  if (c === "india") return "tn-badge-india";
  if (c === "general") return "tn-badge-general";
  if (c === "finance" || c === "business") return "tn-badge-finance";
  if (c === "entertainment") return "tn-badge-entertainment";
  if (c === "health") return "tn-badge-health";
  if (c === "punjab") return "tn-badge-punjab";
  if (["new delhi", "newdelhi", "delhi"].includes(c))
    return "tn-badge-newdelhi";
  return "tn-badge-default";
}

export default function TopNews() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const data = await cachedGet("/top-news", {
        params: { page: 1, limit: 50 },
      });
      setItems(data?.items || []);
      setLoading(false);
    })();
  }, []);

  return (
    <>
      <div className="tn-nav-sticky">
        <SiteNav />
      </div>

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
                    <Link to={href} className="tn-bcard-media">
                      <span className={`tn-bcard-badge ${badgeClass(cat)}`}>
                        {cat}
                      </span>

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

                    <Link to={href} className="tn-bcard-title">
                      {a.title}
                    </Link>

                    <div className="tn-bcard-source">timelyvoice.com</div>

                    {summary && (
                      <Link to={href} className="tn-bcard-summary">
                        {summary}
                      </Link>
                    )}

                    <div className="tn-bcard-footer">
                      <span className="tn-bcard-time">
                        {timeAgo(ts) || "—"}
                      </span>
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
