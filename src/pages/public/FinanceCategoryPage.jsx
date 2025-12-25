// src/pages/public/FinanceCategoryPage.jsx
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { api } from "../../App.jsx";
import { upsertTag, removeManagedHeadTags } from "../../lib/seoHead.js";
import { ensureRenderableImage } from "../../lib/images.js";

// ✅ AdSense helper (same as TopNews)
import { pushAd } from "../../lib/adsense.js";

import SiteNav from "../../components/SiteNav.jsx";
import SiteFooter from "../../components/SiteFooter.jsx";
import "../public/TopNews.css"; // ✅ reuse the same styling

import SectionRenderer from "../../components/sections/SectionRenderer.jsx";

const FALLBACK_HERO_IMAGE = "/tv-default-hero.jpg";

/* ---------- helpers ---------- */
const normPath = (p = "") => String(p).trim().replace(/\/+$/, "") || "/";
const toTitleCase = (x = "") =>
  x ? x.charAt(0).toUpperCase() + x.slice(1).toLowerCase() : x;

function timeAgo(input) {
  const d = input ? new Date(input) : null;
  if (!d || isNaN(d)) return "";
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} minute${m === 1 ? "" : "s"} ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hour${h === 1 ? "" : "s"} ago`;
  const dsy = Math.floor(h / 24);
  if (dsy < 30) return `${dsy} day${dsy === 1 ? "" : "s"} ago`;
  const mo = Math.floor(dsy / 30);
  if (mo < 12) return `${mo} month${mo === 1 ? "" : "s"} ago`;
  const y = Math.floor(mo / 12);
  return `${y} year${y === 1 ? "" : "s"} ago`;
}

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

function articleHref(slug) {
  if (!slug) return "#";
  if (/^https?:\/\//i.test(slug)) return slug;
  if (slug.startsWith("/article/")) return slug;
  return `/article/${slug}`;
}

function getCategoryLabel(article, fallback) {
  const cat = article?.category;

  if (cat && typeof cat === "object") {
    return cat.name || cat.slug || fallback;
  }

  if (typeof cat === "string") {
    if (/^[0-9a-fA-F]{24}$/.test(cat)) return fallback;
    return cat;
  }

  return fallback;
}

/* ---------- Cloudinary optimizer (same as TopNews) ---------- */
function optimizeCloudinary(url, width = 520) {
  if (!url || !url.includes("/upload/")) return url;
  return url.replace("/upload/", `/upload/f_auto,q_auto,w_${width}/`);
}

/* =========================================================
   ✅ TOPNEWS STYLE ADS + PROMO BANNERS (replicated)
   ========================================================= */

/* ---------- AdSense (TopNews in-feed) ---------- */
const ADS_CLIENT = "ca-pub-8472487092329023";
const ADS_SLOT_INFEED_DESKTOP = "8428632191"; // TopNews InFeed Desktop
const ADS_SLOT_INFEED_MOBILE = "6748719010"; // TopNews InFeed Mobile

/* ---------- Promo Rail Banner (Left/Right) ---------- */
const PROMO_RAIL_IMG = "/banners/advertise-with-us-rail-120x700.png";
const PROMO_RAIL_TO_EMAIL =
  "https://mail.google.com/mail/?view=cm&fs=1&to=knotshorts1@gmail.com&su=Advertise%20With%20Us";

/* ---------- Inline promo banner ---------- */
const PROMO_INLINE_IMG = "/banners/advertise-with-us-inline.png";
const PROMO_INLINE_TO_EMAIL = PROMO_RAIL_TO_EMAIL;

/* Rails fixed settings */
const RAIL_WIDTH = 160;
const RAIL_HEIGHT = 635;
const RAIL_TOP_OFFSET = 0;
const RIGHT_RAIL_INSET = 10;

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

/* ✅ In-feed AdSense block (between cards) */
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

/* ✅ Inline promo banner component */
function PromoInlineBanner() {
  return (
    <li className="tn-promo" aria-label="promo banner">
      <a
        href={PROMO_INLINE_TO_EMAIL}
        target="_blank"
        rel="noopener noreferrer"
        className="tn-promo-link"
        aria-label="Advertise with us - email"
      >
        <img
          src={PROMO_INLINE_IMG}
          alt="Advertise with us"
          className="tn-promo-img"
          loading="lazy"
          decoding="async"
        />
      </a>
    </li>
  );
}

/* ✅ Fixed promo rails */
function PromoRailFixed({ side = "left" }) {
  return (
    <div
      style={{
        position: "fixed",
        top: RAIL_TOP_OFFSET,
        [side]: side === "right" ? RIGHT_RAIL_INSET : -5,
        width: RAIL_WIDTH,
        height: RAIL_HEIGHT,
        zIndex: 9999,
      }}
      aria-label={`${side} promo rail`}
    >
      <a
        href={PROMO_RAIL_TO_EMAIL}
        target="_blank"
        rel="noopener noreferrer"
        style={{ display: "block", width: RAIL_WIDTH, height: RAIL_HEIGHT }}
        aria-label="Advertise with us - email"
      >
        <img
          src={PROMO_RAIL_IMG}
          alt="Advertise with us"
          style={{
            width: "100%",
            height: "100%",
            display: "block",
            objectFit: "contain",
          }}
          loading="lazy"
          decoding="async"
        />
      </a>
    </div>
  );
}

/* ---------- layout styles ---------- */
const pageWrap = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "flex-start",
  marginTop: 16,
  marginBottom: 40,
};

// ✅ single column like TopNews stage
const singleColWrap = { width: "100%", maxWidth: 1080, padding: "0 12px" };

/* ---------- PAGE ---------- */
export default function FinanceCategoryPage({
  categorySlug = "finance",
  displayName = "Finance",
}) {
  const { pathname } = useLocation();
  const pagePath = normPath(pathname);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [pageSections, setPageSections] = useState([]);

  // ✅ show rails only if enough viewport width
  const [showRails, setShowRails] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(min-width: 1280px)").matches
      : false
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(min-width: 1280px)");
    const onChange = (e) => setShowRails(e.matches);

    mq.addEventListener?.("change", onChange);
    mq.addListener?.(onChange);

    return () => {
      mq.removeEventListener?.("change", onChange);
      mq.removeListener?.(onChange);
    };
  }, []);

  const canonical = useMemo(() => {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}${pathname}`;
  }, [pathname]);

  /* ---------- SEO ---------- */
  useEffect(() => {
    removeManagedHeadTags();
    upsertTag("title", {}, { textContent: `${displayName} — The Timely Voice` });
    upsertTag("meta", {
      name: "description",
      content: `${displayName} headlines and latest stories — newest first.`,
    });
    if (canonical) upsertTag("link", { rel: "canonical", href: canonical });
  }, [canonical, displayName]);

  /* ---------- FETCH ARTICLES ---------- */
  useEffect(() => {
    let alive = true;

    async function fetchArticles() {
      setLoading(true);
      setErr("");
      setItems([]);

      const raw = String(categorySlug || "").trim();
      const effective = raw || toTitleCase(displayName || "");

      try {
        const r = await api.get(
          `/public/categories/${encodeURIComponent(effective)}/articles`,
          { params: { limit: 60 }, validateStatus: () => true }
        );

        if (!alive) return;

        if (r.status === 200 && Array.isArray(r?.data?.items)) {
          setItems(r.data.items);
          return;
        }

        setErr("No stories found for this category.");
      } catch {
        if (alive) setErr("Failed to load stories");
      } finally {
        if (alive) setLoading(false);
      }
    }

    fetchArticles();
    return () => {
      alive = false;
    };
  }, [categorySlug, displayName]);

  /* ---------- PAGE SECTIONS ---------- */
  useEffect(() => {
    let cancel = false;

    (async () => {
      try {
        const res = await api.get("/sections", {
          params: { path: pagePath },
          validateStatus: () => true,
        });

        const list = Array.isArray(res.data) ? res.data : [];
        const filtered = list
          .filter(
            (s) =>
              s?.enabled !== false &&
              s?.target?.type === "path" &&
              normPath(s?.target?.value) === pagePath
          )
          .sort((a, b) => (a.placementIndex ?? 0) - (b.placementIndex ?? 0));

        if (!cancel) setPageSections(filtered);
      } catch {
        if (!cancel) setPageSections([]);
      }
    })();

    return () => {
      cancel = true;
    };
  }, [pagePath]);

  // ✅ TopNews rules
  const AD_EVERY = 5;
  const PROMO_EVERY = 7;

  const listWithAds = useMemo(() => {
    const out = [];
    for (let i = 0; i < items.length; i++) {
      out.push({ kind: "article", item: items[i], idx: i });

      const notLast = i !== items.length - 1;

      const isAfterAdN = (i + 1) % AD_EVERY === 0;
      if (isAfterAdN && notLast) out.push({ kind: "ad", idx: i });

      const isAfterPromoN = (i + 1) % PROMO_EVERY === 0;
      if (isAfterPromoN && notLast) out.push({ kind: "promo", idx: i });
    }
    return out;
  }, [items]);

  return (
    <>
      <SiteNav />

      {/* ✅ Fixed promo rails like TopNews */}
      {showRails && (
        <>
          <PromoRailFixed side="left" />
          <PromoRailFixed side="right" />
        </>
      )}

      <div style={pageWrap}>
        <div style={singleColWrap}>
          <main className="container">
            {pageSections.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                {pageSections.map((sec) => (
                  <div
                    key={sec._id || sec.id || sec.slug}
                    style={{ marginBottom: 12 }}
                  >
                    <SectionRenderer section={sec} />
                  </div>
                ))}
              </div>
            )}

            {loading && <div className="tn-status">Loading…</div>}
            {err && <div className="tn-error">{err}</div>}

            {!loading && !err && (
              <ul className="tn-list">
                {listWithAds.map((row) => {
                  if (row.kind === "ad") return <InFeedAd key={`ad-${row.idx}`} />;
                  if (row.kind === "promo")
                    return <PromoInlineBanner key={`promo-${row.idx}`} />;

                  const a = row.item;
                  const href = articleHref(a.slug);

                  const catLabel = getCategoryLabel(a, displayName);
                  const pillBg = CAT_COLORS[catLabel] || "#4B5563";
                  const summary = a.summary || a.description || a.excerpt || "";

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

                        {summary ? (
                          <Link
                            to={href}
                            className="tn-summary"
                            style={{
                              display: "block",
                              textDecoration: "none",
                              color: "inherit",
                            }}
                            aria-label={`Open: ${a.title}`}
                          >
                            {summary}
                          </Link>
                        ) : null}

                        <div className="tn-divider" />

                        <div className="tn-meta">
                          <span className="tn-source">
                            The Timely Voice • Updated{" "}
                            {timeAgo(
                              a.updatedAt || a.publishedAt || a.publishAt || a.createdAt
                            )}
                          </span>
                        </div>
                      </div>

                      <Link to={href} className="tn-thumb">
                        <span className="tn-badge">
                          <span className="tn-pill" style={{ background: pillBg }}>
                            {catLabel}
                          </span>
                        </span>

                        <img
                          src={thumbSrc}
                          alt={a.imageAlt || a.title || ""}
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
        </div>
      </div>

      <SiteFooter />
    </>
  );
}
