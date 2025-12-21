// frontend/src/pages/public/TopNews.jsx
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { cachedGet } from "../../lib/publicApi.js";
import { upsertTag, removeManagedHeadTags } from "../../lib/seoHead.js";
import { ensureRenderableImage } from "../../lib/images.js";

// ✅ AdSense helper (already used elsewhere in your project)
import { pushAd } from "../../lib/adsense.js";

import SiteNav from "../../components/SiteNav.jsx";
import SiteFooter from "../../components/SiteFooter.jsx";
import "./TopNews.css";

const FALLBACK_HERO_IMAGE = "/tv-default-hero.jpg";

/* ---------- AdSense (TopNews page-skin + in-feed) ---------- */
const ADS_CLIENT = "ca-pub-8472487092329023";

// page-skin (already working)
const ADS_SLOT_SKIN_LEFT = "1900265755";
const ADS_SLOT_SKIN_RIGHT = "6961020746";

// ✅ In-feed units between cards (from your screenshots)
const ADS_SLOT_INFEED_DESKTOP = "8428632191"; // TopNews InFeed Desktop
const ADS_SLOT_INFEED_MOBILE = "6748719010"; // TopNews InFeed Mobile

/* Load AdSense script once (safe in SPA) */
function ensureAdsenseScript(client) {
  if (typeof document === "undefined") return;

  const src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`;
  const exists = Array.from(document.scripts).some((s) => s.src === src);
  if (exists) return;

  const s = document.createElement("script");
  s.async = true;
  s.src = src;
  s.crossOrigin = "anonymous";
  document.head.appendChild(s);
}

function PageSkinAd({ side, slot }) {
  useEffect(() => {
    ensureAdsenseScript(ADS_CLIENT);

    // SPA timing: push now + delayed push
    pushAd();
    const t = setTimeout(() => pushAd(), 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slot]);

  return (
    <aside className={`tn-skin tn-skin--${side}`} aria-label={`Ad ${side}`}>
      <ins
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client={ADS_CLIENT}
        data-ad-slot={slot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </aside>
  );
}

/* ✅ In-feed AdSense block (between cards) */
function useIsMobile(breakpointPx = 720) {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia?.(`(max-width: ${breakpointPx}px)`)?.matches ?? false;
  });

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;

    const mq = window.matchMedia(`(max-width: ${breakpointPx}px)`);
    const onChange = () => setIsMobile(mq.matches);

    setIsMobile(mq.matches);

    if (mq.addEventListener) mq.addEventListener("change", onChange);
    else mq.addListener(onChange);

    return () => {
      if (mq.removeEventListener) mq.removeEventListener("change", onChange);
      else mq.removeListener(onChange);
    };
  }, [breakpointPx]);

  return isMobile;
}

function InFeedAd() {
  const isMobile = useIsMobile(720);
  const slot = isMobile ? ADS_SLOT_INFEED_MOBILE : ADS_SLOT_INFEED_DESKTOP;

  useEffect(() => {
    ensureAdsenseScript(ADS_CLIENT);

    // SPA timing: push now + delayed push
    pushAd();
    const t = setTimeout(() => pushAd(), 450);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slot, isMobile]);

  return (
    <li className="tn-ad">
      <div className="tn-ad-inner" aria-label="Advertisement">
        <ins
          className="adsbygoogle"
          style={{ display: "block" }}
          data-ad-client={ADS_CLIENT}
          data-ad-slot={slot}
          data-ad-format="auto"
          data-full-width-responsive="true"
        />
      </div>
    </li>
  );
}

const CAT_COLORS = {
  World: "linear-gradient(135deg, #3B82F6 0%, #0073ff 100%)",
  Politics: "linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%)",
  Business: "linear-gradient(135deg, #10B981 0%, #34D399 100%)",
  Entertainment: "linear-gradient(135deg, #A855F7 0%, rgb(119, 0, 255))",
  Sports: "linear-gradient(135deg, #EF4444 0%, #F87171 100%)",
  Health: "linear-gradient(135deg, #06B6D4 0%, #22D3EE 100%)",
  Technology: "linear-gradient(135deg, #6366F1 0%, #818CF8 100%)",
  Science: "linear-gradient(135deg, #14B8A6 0%, #2DD4BF 100%)",
  India: "linear-gradient(135deg, #F97316 0%, #FB923C 100%)",
};

function getCategoryName(a) {
  // Works for: { category: "Business" }, {categoryName}, {category: {name}}, {categorySlug}, etc.
  if (a?.category && typeof a.category === "string" && a.category.trim()) {
    const s = String(a.category).trim();
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
  if (a?.categoryName) return String(a.categoryName);
  if (a?.category?.name) return String(a.category.name);
  if (a?.categorySlug) {
    const s = String(a.categorySlug).trim();
    if (!s) return "World";
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
  return "World";
}


/* ---------- Cloudinary optimizer ---------- */
function optimizeCloudinary(url, width = 520) {
  if (!url || !url.includes("/upload/")) return url;
  return url.replace("/upload/", `/upload/f_auto,q_auto,w_${width}/`);
}

/* ---------- Video helpers ---------- */
function getVideoPreview(url = "") {
  const raw = String(url || "").trim();
  if (!raw) return { kind: "none", src: "" };
  if (raw.endsWith(".mp4")) return { kind: "direct", src: raw };
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
          30_000
        );

        if (!cancel) setItems(normalizeTopNews(data?.items || []));
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

  // ✅ Insert one in-feed ad after every N cards
  const AD_EVERY = 5;

  const listWithAds = useMemo(() => {
    const out = [];
    for (let i = 0; i < items.length; i++) {
      out.push({ kind: "article", item: items[i], idx: i });

      const isAfterN = (i + 1) % AD_EVERY === 0;
      const notLast = i !== items.length - 1;

      if (isAfterN && notLast) out.push({ kind: "ad", idx: i });
    }
    return out;
  }, [items]);

  return (
    <>
      <SiteNav />

      {/* ✅ Left/Right skins (no chips) */}
      <div className="tn-shell">
        <PageSkinAd side="left" slot={ADS_SLOT_SKIN_LEFT} />
        <PageSkinAd side="right" slot={ADS_SLOT_SKIN_RIGHT} />

        <main className="tn-container">
          {loading && <div className="tn-status">Loading…</div>}
          {err && <div className="tn-error">{err}</div>}

          {!loading && !err && (
            <ul className="tn-list">
              {listWithAds.map((row) => {
                if (row.kind === "ad") {
                  return <InFeedAd key={`ad-${row.idx}`} />;
                }

                const a = row.item;
                const href = articleHref(a.slug);
                const catName = getCategoryName(a);
                const color = CAT_COLORS[catName] || "#4B5563";

                const rawImage = ensureRenderableImage(a);
                const thumbSrc = optimizeCloudinary(rawImage || FALLBACK_HERO_IMAGE, 520);

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

                      <div className="tn-divider" />

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
      </div>

      <SiteFooter />
    </>
  );
}
