// frontend/src/pages/public/TopNews.jsx
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { cachedGet } from "../../lib/publicApi.js";
import { upsertTag, removeManagedHeadTags } from "../../lib/seoHead.js";
import { ensureRenderableImage } from "../../lib/images.js";
import { pushAd } from "../../lib/adsense.js";

import SiteNav from "../../components/SiteNav.jsx";
import SiteFooter from "../../components/SiteFooter.jsx";
import BrandMark from "../../components/BrandMark.jsx"; // ✅ NEW
import "./TopNews.css";

const FALLBACK_HERO_IMAGE = "/tv-default-hero.jpg";

/* ---------- AdSense (TopNews in-feed) ---------- */
const ADS_CLIENT = "ca-pub-8472487092329023";
const ADS_SLOT_INFEED_DESKTOP = "8428632191";
const ADS_SLOT_INFEED_MOBILE = "6748719010";

/* ---------- Promo Rail ---------- */
const PROMO_RAIL_IMG = "/banners/advertise-with-us-rail-120x700.png";
const PROMO_RAIL_TO_EMAIL =
  "https://mail.google.com/mail/?view=cm&fs=1&to=knotshorts1@gmail.com&su=Advertise%20With%20Us";

const PROMO_INLINE_IMG = "/banners/advertise-with-us-inline.png";
const PROMO_INLINE_TO_EMAIL = PROMO_RAIL_TO_EMAIL;

const RAIL_WIDTH = 160;
const RAIL_HEIGHT = 635;
const RAIL_TOP_OFFSET = 0;
const RIGHT_RAIL_INSET = 10;

/* ---------- Category colors ---------- */
const CAT_COLORS = {
  World: "linear-gradient(135deg,#3B82F6,#0073ff)",
  Politics: "linear-gradient(135deg,#F59E0B,#FBBF24)",
  Business: "linear-gradient(135deg,#10B981,#34D399)",
  Entertainment: "linear-gradient(135deg,#A855F7,#7700ff)",
  Sports: "linear-gradient(135deg,#EF4444,#F87171)",
  Health: "linear-gradient(135deg,#06B6D4,#22D3EE)",
  Technology: "linear-gradient(135deg,#6366F1,#818CF8)",
  Science: "linear-gradient(135deg,#14B8A6,#2DD4BF)",
  India: "linear-gradient(135deg,#F97316,#FB923C)",
  Opinion: "linear-gradient(135deg,#7C3AED,#2563EB)",
  General: "linear-gradient(135deg,#000e5f,#000661)",
};

const CAT_SOLID = {
  World: "#0073ff",
  Politics: "#F59E0B",
  Business: "#10B981",
  Entertainment: "#A855F7",
  Sports: "#EF4444",
  Health: "#06B6D4",
  Technology: "#6366F1",
  Science: "#14B8A6",
  India: "#F97316",
  Opinion: "#7C3AED",
  General: "#ff1919",
};

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

                const color =
                  CAT_COLORS[cat] ||
                  "linear-gradient(135deg,#4B5563 0%, #111827 100%)";
                const solid = CAT_SOLID[cat] || "#ffffff";

                const ts = bestTs(a);

                return (
                  <li className="tn-bcard" key={a._id || a.slug}>
                    <Link to={href} className="tn-bcard-media">
                      <span
                        className="tn-bcard-ribbon"
                        style={{ background: color }}
                      />
                      <span
                        className="tn-bcard-badge"
                        style={{ background: color }}
                      >
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

                      <span className="tn-bcard-overlay" />

                      <div
                        className="tn-bcard-headline"
                        style={{ "--tn-firstline": solid }}
                      >
                        {a.title}
                      </div>
                    </Link>

                    {(a.summary || a.description) && (
                      <Link
                        to={href}
                        className="tn-bcard-summary"
                        style={{ "--tn-quote": solid }}
                      >
                        <span className="tn-bcard-summary-text">
                          {a.summary || a.description}
                        </span>
                        <span className="tn-bcard-readmore">...Read More</span>
                      </Link>
                    )}

                    <div className="tn-bcard-footer">
                      <span className="tn-bcard-time">{timeAgo(ts) || "—"}</span>

                      {/* ✅ NEW: mini logo + domain together */}
                    <span className="tn-bcard-siteWrap">
  <BrandMark size="sm" text="timelyvoice.com" />
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
