// src/pages/public/PublicHome.jsx
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import SiteNav from "../../components/SiteNav.jsx";
import SiteFooter from "../../components/SiteFooter.jsx";

import { cachedGet } from "../../lib/publicApi.js";
import { ensureRenderableImage } from "../../lib/images.js";

/* ---------- Promo Rail Banner (Left/Right) ---------- */
const PROMO_RAIL_IMG = "/banners/advertise-with-us-rail-120x700.png";
const PROMO_RAIL_TO_EMAIL =
  "https://mail.google.com/mail/?view=cm&fs=1&to=knotshorts1@gmail.com&su=Advertise%20With%20Us";

const RAIL_WIDTH = 160;
const RAIL_HEIGHT = 635;
const RAIL_TOP_OFFSET = 0;
const RIGHT_RAIL_INSET = 10;

/* ---------- Canvas width ---------- */
const HOME_CANVAS_MAX = 1040;

const FALLBACK_HERO_IMAGE = "/tv-default-hero.jpg";

/* ✅ NAVY BACKGROUNDS (ONLY for: page bg + Top Stories main container) */
const NAVY_PAGE_BG = "#000e25ff";
const NAVY_PANEL_BG =
  "linear-gradient(180deg, #03102a 0%, #01081a 55%, #00030c 100%)";

/* ---------- Promo Rails ---------- */
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
          style={{ width: "100%", height: "100%", objectFit: "contain" }}
          loading="lazy"
          decoding="async"
        />
      </a>
    </div>
  );
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

function getBestTimestamp(a) {
  return (
    parseTs(a?.publishedAt) ||
    parseTs(a?.publishAt) ||
    parseTs(a?.updatedAt) ||
    parseTs(a?.createdAt) ||
    0
  );
}

function timeAgo(ts) {
  const t = typeof ts === "number" ? ts : parseTs(ts);
  if (!t) return "";
  const diff = Date.now() - t;
  const s = Math.max(0, Math.floor(diff / 1000));
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);

  if (d >= 1) return `${d} day${d > 1 ? "s" : ""} ago`;
  if (h >= 1) return `${h}h ago`;
  if (m >= 1) return `${m}m ago`;
  return `just now`;
}

function normalizeItems(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

function slugify(v) {
  return String(v || "")
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, "-")
    .replace(/-+/g, "-");
}

/**
 * ✅ HARD FILTER: keep only a given category's articles regardless of response shape.
 * Supports categorySlug, category string, categoryName, and nested category.name.
 */
function isCategoryArticle(a, categorySlug, categoryLabel) {
  const wantSlug = slugify(categorySlug);
  const wantLabel = slugify(categoryLabel);

  const slug = slugify(a?.categorySlug);

  const cat = typeof a?.category === "string" ? slugify(a.category) : slugify("");
  const catName = slugify(a?.categoryName);
  const nestedName = slugify(a?.category?.name);

  // allow categorySlug saved with spaces like "new delhi"
  const slugSpace = String(a?.categorySlug || "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ");

  const wantSpace = String(categorySlug || "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ");

  return (
    slug === wantSlug ||
    cat === wantSlug ||
    catName === wantSlug ||
    nestedName === wantSlug ||
    (wantLabel &&
      (slug === wantLabel ||
        cat === wantLabel ||
        catName === wantLabel ||
        nestedName === wantLabel)) ||
    (slugSpace && wantSpace && slugSpace === wantSpace)
  );
}

/* ---------- UI tokens ---------- */
const UI = {
  panelBorder: "1px solid rgba(255,255,255,0.10)",
  panelShadow: "0 0 0 1px rgba(0,0,0,0.25), 0 14px 50px rgba(0,0,0,0.35)",
  panelBg:
    "radial-gradient(1000px 520px at 50% 0%, rgba(120,80,255,0.12) 0%, rgba(8,18,50,0.12) 35%, rgba(0,0,0,0.14) 100%)",
  cardBg: "rgba(255,255,255,0.03)",
  linkCyan: "rgba(120,220,255,0.95)",
  muted: "rgba(255,255,255,0.70)",
  neon: "#39ff14", // ✅ neon green for time
};

/* ---------- CATEGORY block (Hero + Top Stories 4 cards) ---------- */
function CategoryTopStoriesBlock({ items = [], label = "India", slug = "india" }) {
  const hero = items[0];
  const top4 = items.slice(1, 5);

  const heroTs = hero ? getBestTimestamp(hero) : 0;
  const updatedLabel = heroTs ? `UPDATED ${timeAgo(heroTs).toUpperCase()}` : "UPDATED";

  const heroImg = hero ? ensureRenderableImage(hero) : "";
  const heroSrc = heroImg || FALLBACK_HERO_IMAGE;

  const labelUpper = String(label || "").toUpperCase();
  const categoryLink = `/category/${slugify(slug)}`;

  return (
    <section
      style={{
        width: "100%",
        margin: "6px auto 14px",
        maxWidth: HOME_CANVAS_MAX,
        padding: "0 12px",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          border: UI.panelBorder,

          /* ✅ CHANGE: Top Stories main container bg -> NAVY */
          background: NAVY_PANEL_BG,

          boxShadow: UI.panelShadow,
          padding: 14,
        }}
      >
        <div style={{ marginBottom: 10 }}>
          <span
            style={{
              display: "inline-block",
              padding: "8px 14px",
              fontWeight: 900,
              letterSpacing: "0.10em",
              fontSize: 16,
              color: "#ffffff",
              background: "linear-gradient(135deg,#2dd4bf 0%,#10b981 100%)",
              border: "1px solid rgba(0,0,0,0.55)",
              boxShadow: "3px 3px 0 rgba(0,0,0,0.85)",
              textTransform: "uppercase",
            }}
          >
            {labelUpper}
          </span>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 10,
            alignItems: "center",
            marginBottom: 10,
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              fontSize: 12,
              letterSpacing: "0.12em",
              color: UI.muted,
              textTransform: "uppercase",
            }}
          >
            {updatedLabel}
          </div>

          <Link
            to={categoryLink}
            style={{
              fontSize: 13,
              color: UI.linkCyan,
              textDecoration: "none",
              letterSpacing: "0.02em",
              whiteSpace: "nowrap",
            }}
          >
            View All {labelUpper} &nbsp;›
          </Link>
        </div>

        {/* ✅ MOBILE RESPONSIVE HERO GRID (Top Stories main container) */}
        <div
          className="__tv-top-hero"
          style={{
            display: "grid",
            gridTemplateColumns: "1.25fr 0.75fr",
            gap: 14,
            alignItems: "start",
          }}
        >
          <div style={{ minWidth: 0 }}>
            {hero ? (
              <>
                <Link
                  to={articleHref(hero.slug)}
                  style={{
                    display: "block",
                    color: "rgba(255,255,255,0.95)",
                    textDecoration: "none",
                    fontWeight: 500,
                    fontSize: "clamp(22px, 2.4vw, 32px)",
                    lineHeight: 1.08,
                    letterSpacing: "-0.02em",
                    marginBottom: 8,
                  }}
                >
                  {hero.title || "Untitled"}
                </Link>

                <div style={{ color: "rgba(255,255,255,0.75)", fontSize: 13, marginBottom: 8 }}>
                  The Timely Voice
                </div>

                <div
                  style={{
                    color: "rgba(255,255,255,0.80)",
                    fontSize: 14,
                    lineHeight: 1.6,
                    maxWidth: 660,
                  }}
                >
                  {String(hero.summary || hero.description || "").trim()}
                </div>
              </>
            ) : (
              <div style={{ color: "rgba(255,255,255,0.75)" }}>Loading {label} feature…</div>
            )}
          </div>

          <div
            className="__tv-top-hero-imgbox"
            style={{
              border: "1px solid rgba(0,0,0,0.75)",
              boxShadow: "5px 5px 0 rgba(0,0,0,0.80)",
              overflow: "hidden",
              background: "rgba(0,0,0,0.20)",
              minHeight: 220,
              maxHeight: 240,
              alignSelf: "center",
              borderRadius: 0,
            }}
          >
            <Link to={hero ? articleHref(hero.slug) : "#"} style={{ display: "block", height: "100%" }}>
              <img
                src={heroSrc}
                alt={hero?.imageAlt || hero?.title || "The Timely Voice"}
                style={{
                  width: "100%",
                  height: "100%",
                  display: "block",
                  objectFit: "cover",
                }}
                loading="lazy"
                decoding="async"
                onError={(e) => {
                  e.currentTarget.src = FALLBACK_HERO_IMAGE;
                }}
              />
            </Link>
          </div>
        </div>

        <div style={{ height: 1, background: "rgba(255,255,255,0.10)", margin: "14px 0 10px" }} />

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 10,
            marginBottom: 10,
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              fontSize: 14,
              letterSpacing: "0.12em",
              color: "rgba(255,255,255,0.80)",
              textTransform: "uppercase",
            }}
          >
            TOP STORIES
          </div>

          <Link
            to={categoryLink}
            style={{
              fontSize: 13,
              color: UI.linkCyan,
              textDecoration: "none",
              letterSpacing: "0.02em",
              whiteSpace: "nowrap",
            }}
          >
            View All {labelUpper} &nbsp;›
          </Link>
        </div>

        <div
          className="__tv-top4-grid"
          style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 10 }}
        >
          {top4.map((a) => {
            const ts = getBestTimestamp(a);
            const badge = timeAgo(ts);
            const img = ensureRenderableImage(a) || FALLBACK_HERO_IMAGE;

            return (
              <article
                key={a._id || a.id || a.slug}
                style={{
                  border: UI.panelBorder,

                  /* ✅ DO NOT TOUCH TEAL columns/cards */
                  background: "#008080",

                  boxShadow: "6px 6px 0 rgba(0,0,0,0.75)",
                  overflow: "hidden",
                  minWidth: 0,
                  borderRadius: 0,
                }}
              >
                <Link
                  to={articleHref(a.slug)}
                  style={{
                    position: "relative",
                    display: "block",
                    height: 140,
                    overflow: "hidden",
                    borderBottom: "1px solid rgba(0,0,0,0.65)",
                  }}
                >
                  <img
                    src={img}
                    alt={a.imageAlt || a.title || "The Timely Voice"}
                    loading="lazy"
                    decoding="async"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      display: "block",
                    }}
                    onError={(e) => {
                      e.currentTarget.src = FALLBACK_HERO_IMAGE;
                    }}
                  />

                  <span
                    style={{
                      position: "absolute",
                      top: 8,
                      left: 8,
                      padding: "5px 8px",
                      fontSize: 11,
                      fontWeight: 500,
                      color: "#fff",
                      background: "rgba(0,0,0,0.65)",
                      border: "1px solid rgba(0,0,0,0.9)",
                      boxShadow: "2px 2px 0 rgba(0,0,0,0.85)",
                    }}
                  >
                    {badge}
                  </span>
                </Link>

                <div style={{ padding: 10 }}>
                  <Link
                    to={articleHref(a.slug)}
                    style={{
                      color: "rgba(255,255,255,0.95)",
                      textDecoration: "none",
                      fontWeight: 500,
                      fontSize: 14.5,
                      lineHeight: 1.22,
                      display: "block",
                      marginBottom: 6,
                    }}
                  >
                    {a.title || "Untitled"}
                  </Link>

                  <div style={{ color: UI.muted, fontSize: 11.5 }}>{timeAgo(ts)}</div>
                </div>
              </article>
            );
          })}
        </div>

        {/* ✅ Only Top Stories container responsiveness added (hero stack + top4 grid) */}
        <style>{`
          @media (max-width: 900px){
            .__tv-top-hero{
              grid-template-columns: 1fr !important;
            }
            .__tv-top-hero-imgbox{
              max-height: none !important;
              min-height: 220px !important;
              height: 220px !important;
              align-self: stretch !important;
            }
          }

          @media (max-width: 520px){
            .__tv-top-hero-imgbox{
              height: 210px !important;
              min-height: 210px !important;
            }
          }

          @media (max-width: 980px){
            .__tv-top4-grid { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
          }
          @media (max-width: 520px){
            .__tv-top4-grid { grid-template-columns: 1fr !important; }
          }
        `}</style>
      </div>
    </section>
  );
}

/* ---------- CATEGORY Latest News (LEFT: 2 stacked featured + RIGHT: 4 list) ---------- */
function CategoryLatestNewsBlock({ items = [], label = "India", slug = "india" }) {
  const leftTop = items[0];
  const leftBottom = items[1];
  const list4 = items.slice(2, 6);

  const labelUpper = String(label || "").toUpperCase();
  const categoryLink = `/category/${slugify(slug)}`;

  // Desktop panel height (controls the whole 2-column block)
  const LATEST_PANEL_H = 420;

  // Thumb sizes (keep your look)
  const RIGHT_THUMB_W = 96;
  const RIGHT_THUMB_H = 64;

  function FeaturedRow({ item }) {
    const img = item ? ensureRenderableImage(item) : "";
    const src = img || FALLBACK_HERO_IMAGE;

    return (
      <article
        className="__tv-latest-card"
        style={{
          border: UI.panelBorder,
          background: "rgba(55, 10, 10, 0.85)",
          boxShadow: "6px 6px 0 rgba(0,0,0,0.90)",
          overflow: "hidden",
          minWidth: 0,
          borderRadius: 0,
          height: "100%",
          minHeight: 0,
        }}
      >
        <Link
          to={item ? articleHref(item.slug) : "#"}
          className="__tv-featured-row"
          style={{
            display: "grid",
            gridTemplateColumns: "280px 1fr",
            gap: 12,
            textDecoration: "none",
            color: "inherit",
            alignItems: "stretch",
            height: "100%",
            minHeight: 0,
          }}
        >
          <div
            className="__tv-featured-img"
            style={{
              width: "100%",
              height: "100%",
              borderRight: "1px solid rgba(0,0,0,0.65)",
              background: "rgba(0,0,0,0.20)",
              overflow: "hidden",
              minHeight: 0,
            }}
          >
            <img
              src={src}
              alt={item?.imageAlt || item?.title || "The Timely Voice"}
              style={{
                width: "100%",
                height: "100%",
                display: "block",
                objectFit: "cover",
              }}
              loading="lazy"
              decoding="async"
              onError={(e) => {
                e.currentTarget.src = FALLBACK_HERO_IMAGE;
              }}
            />
          </div>

          <div
            className="__tv-featured-body"
            style={{
              padding: "10px 12px 10px 0",
              minWidth: 0,
              minHeight: 0,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            <div
              className="__tv-featured-title"
              style={{
                color: "rgba(255,255,255,0.98)",
                fontWeight: 800,
                fontSize: 16,
                lineHeight: 1.25,
                marginBottom: 6,
                display: "-webkit-box",
                WebkitLineClamp: 3,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {item?.title || "Loading…"}
            </div>

            <div
              className="__tv-featured-summary"
              style={{
                color: "rgba(255,255,255,0.75)",
                fontSize: 12.5,
                lineHeight: 1.55,
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
                textOverflow: "ellipsis",
                marginBottom: 10,
              }}
            >
              {String(item?.summary || item?.description || "").trim()}
            </div>

            <div
              style={{
                marginTop: "auto",
                color: UI.neon,
                fontSize: 14,
                fontWeight: 200,
                textShadow: "0 0 10px rgba(231, 255, 20, 0.35)",
                whiteSpace: "nowrap",
              }}
            >
              {item ? timeAgo(getBestTimestamp(item)) : ""}
            </div>
          </div>
        </Link>
      </article>
    );
  }

  return (
    <section
      style={{
        width: "100%",
        margin: "0 auto 28px",
        maxWidth: HOME_CANVAS_MAX,
        padding: "0 12px",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          border: UI.panelBorder,

          /* ✅ DO NOT TOUCH RED container */
          background: "#ff0022",

          boxShadow: UI.panelShadow,
          padding: 14,
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 10,
            marginBottom: 10,
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              fontSize: 20,
              fontWeight: 800,
              letterSpacing: "0.14em",
              color: "#ffffff",
              textTransform: "uppercase",
            }}
          >
            LATEST NEWS
          </div>

          <Link
            to={categoryLink}
            style={{
              fontSize: 13,
              color: "#ffffff",
              textDecoration: "none",
              letterSpacing: "0.02em",
              whiteSpace: "nowrap",
            }}
          >
            View All {labelUpper} &nbsp;›
          </Link>
        </div>

        {/* ✅ Equal-height 2-column grid */}
        <div
          className="__tv-latest-2col"
          style={{
            display: "grid",
            gridTemplateColumns: "1.05fr 0.95fr",
            gap: 12,
            alignItems: "stretch",
            minWidth: 0,
            height: LATEST_PANEL_H,
          }}
        >
          {/* LEFT: 2 equal rows */}
          <div
            className="__tv-latest-left"
            style={{
              display: "grid",
              gridTemplateRows: "1fr 1fr",
              gap: 12,
              minWidth: 0,
              minHeight: 0,
            }}
          >
            <FeaturedRow item={leftTop} />
            <FeaturedRow item={leftBottom} />
          </div>

          {/* RIGHT: 4 equal rows */}
          <div
            className="__tv-latest-right"
            style={{
              display: "grid",
              gridTemplateRows: "repeat(4, 1fr)",
              gap: 12,
              minWidth: 0,
              minHeight: 0,
            }}
          >
            {list4.map((a, idx) => {
              const ts = getBestTimestamp(a);
              const img = ensureRenderableImage(a) || FALLBACK_HERO_IMAGE;

              return (
                <article
                  key={a._id || a.id || a.slug || idx}
                  style={{
                    border: UI.panelBorder,
                    background: "rgba(55, 10, 10, 0.92)",
                    boxShadow: "6px 6px 0 rgba(0,0,0,0.90)",
                    overflow: "hidden",
                    minWidth: 0,
                    borderRadius: 0,
                    height: "100%",
                    minHeight: 0,
                    display: "flex",
                  }}
                >
                  <Link
                    to={articleHref(a.slug)}
                    className="__tv-right-row"
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 96px",
                      gap: 10,
                      padding: "12px 12px",
                      textDecoration: "none",
                      color: "inherit",
                      alignItems: "center",
                      width: "100%",
                      minHeight: 0,
                    }}
                  >
                    <div style={{ minWidth: 0, minHeight: 0, overflow: "hidden" }}>
                      <div
                        className="__tv-right-title"
                        style={{
                          color: "rgba(255,255,255,0.98)",
                          fontWeight: 700,
                          fontSize: 14,
                          lineHeight: 1.25,
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                        }}
                      >
                        {a.title || "Untitled"}
                      </div>

                      <div
                        style={{
                          color: UI.neon,
                          fontSize: 12,
                          fontWeight: 200,
                          marginTop: 6,
                          textShadow: "0 0 10px rgba(231, 255, 20, 0.35)",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {timeAgo(ts)}
                      </div>
                    </div>

                    <div
                      className="__tv-right-thumb"
                      style={{
                        width: RIGHT_THUMB_W,
                        height: RIGHT_THUMB_H,
                        border: "1px solid rgba(0,0,0,0.65)",
                        overflow: "hidden",
                        background: "rgba(0,0,0,0.20)",
                        borderRadius: 0,
                        justifySelf: "end",
                      }}
                    >
                      <img
                        src={img}
                        alt={a.imageAlt || a.title || "The Timely Voice"}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          display: "block",
                        }}
                        loading="lazy"
                        decoding="async"
                        onError={(e) => {
                          e.currentTarget.src = FALLBACK_HERO_IMAGE;
                        }}
                      />
                    </div>
                  </Link>
                </article>
              );
            })}
          </div>
        </div>

        <style>{`
          @media (max-width: 980px){
            .__tv-latest-2col { 
              grid-template-columns: 1fr !important;
              height: auto !important;
            }
            .__tv-latest-left { order: 1; }
            .__tv-latest-right { order: 2; }
          }

          @media (max-width: 640px){
            .__tv-featured-row { grid-template-columns: 1fr !important; }
            .__tv-featured-img{
              width: 100% !important;
              height: 230px !important;
              border-right: none !important;
              border-bottom: 1px solid rgba(0,0,0,0.65) !important;
            }
            .__tv-featured-body { padding: 10px 12px !important; }
          }

          /* ✅ FIX: keep RIGHT 4 cards in laptop-style layout even on mobile */
          @media (max-width: 520px){
            .__tv-right-row { 
              grid-template-columns: 1fr 96px !important;
              gap: 10px !important;
              padding: 10px 10px !important;
            }
            .__tv-right-thumb {
              width: 96px !important;
              height: 64px !important;
              justifySelf: end !important;
            }
          }
        `}</style>
      </div>
    </section>
  );
}

/* ---------- CATEGORY Trending News (TWO LISTS: left + right) ---------- */
function CategoryTrendingBlock({ items = [], label = "India", slug = "india" }) {
  const cards = items.slice(0, 8);

  const leftCol = cards.slice(0, 4);
  const rightCol = cards.slice(4, 8);

  const labelUpper = String(label || "").toUpperCase();
  const categoryLink = `/category/${slugify(slug)}`;

  // ✅ rank-based blue shades: 1 = lightest, 10 = darkest
  const rankBlueBg = (rank) => {
    const r = Math.max(1, Math.min(10, Number(rank) || 1));
    const t = (r - 1) / 9;
    const alpha = 0.10 + t * 0.26; // 0.10 .. 0.36
    return `rgba(0, 128, 255, ${alpha})`;
  };

  // ✅ FIXED HEIGHTS: both list containers always identical (desktop)
  const ROW_H = 94; // fixed row height
  const LIST_H = ROW_H * 4; // 4 rows

  function RankRow({ item, rank, isFirst }) {
    const img = ensureRenderableImage(item) || FALLBACK_HERO_IMAGE;
    const ts = getBestTimestamp(item);

    return (
      <Link
        to={articleHref(item.slug)}
        style={{
          display: "grid",

          /* 🔧 FIX: tighter rank column */
          gridTemplateColumns: "36px 1fr 70px",

          gap: 10,

          /* 🔧 FIX: reduce side padding */
          padding: "10px 10px",

          textDecoration: "none",
          color: "inherit",
          alignItems: "center",
          borderTop: isFirst ? "none" : "1px solid rgba(255,255,255,0.10)",
          height: ROW_H,
          boxSizing: "border-box",
          overflow: "hidden",
          background: rankBlueBg(rank),
          borderLeft: `3px solid rgba(0, 180, 255, ${
            0.25 + ((Math.max(1, Math.min(10, Number(rank) || 1)) - 1) / 9) * 0.35
          })`,
        }}
      >
        {/* 🔢 Rank number — tightly packed */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span
            style={{
              color: "#ffffff",
              fontWeight: 900,
              fontSize: 18,
              letterSpacing: "0",
              lineHeight: 1,
            }}
          >
            {String(rank).padStart(2, "0")}
          </span>
        </div>

        {/* 📰 Title — now gets MORE WIDTH */}
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              color: "rgba(255,255,255,0.97)",
              fontWeight: 700,
              fontSize: 14,
              lineHeight: 1.3,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
              textOverflow: "ellipsis",
              marginBottom: 6,
            }}
          >
            {item.title || "Untitled"}
          </div>

          <div
            style={{
              color: UI.muted,
              fontSize: 12,
              lineHeight: 1.2,
              whiteSpace: "nowrap",
            }}
          >
            {timeAgo(ts)}
          </div>
        </div>

        {/* 🖼 Thumbnail — unchanged */}
        <div
          style={{
            width: 70,
            height: 50,
            border: "1px solid rgba(0,0,0,0.65)",
            overflow: "hidden",
            background: "rgba(0,0,0,0.20)",
            borderRadius: 0,
            justifySelf: "end",
          }}
        >
          <img
            src={img}
            alt={item.imageAlt || item.title || "The Timely Voice"}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            loading="lazy"
            decoding="async"
            onError={(e) => {
              e.currentTarget.src = FALLBACK_HERO_IMAGE;
            }}
          />
        </div>
      </Link>
    );
  }

  return (
    <section
      style={{
        width: "100%",
        margin: "0 auto 28px",
        maxWidth: HOME_CANVAS_MAX,
        padding: "0 12px",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          border: UI.panelBorder,
          background: UI.panelBg,
          boxShadow: UI.panelShadow,
          padding: 14,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 10,
            marginBottom: 10,
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              fontSize: 14,
              letterSpacing: "0.12em",
              color: "rgba(255,255,255,0.80)",
              textTransform: "uppercase",
            }}
          >
            TRENDING NEWS
          </div>

          <Link
            to={categoryLink}
            style={{
              fontSize: 13,
              color: UI.linkCyan,
              textDecoration: "none",
              letterSpacing: "0.02em",
              whiteSpace: "nowrap",
            }}
          >
            View All {labelUpper} &nbsp;›
          </Link>
        </div>

        <div
          className="__tv-trending-lists"
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 14,
            alignItems: "start",
            minWidth: 0,
          }}
        >
          <div
            className="__tv-trending-list"
            style={{
              border: UI.panelBorder,
              background: UI.cardBg,
              boxShadow: "6px 6px 0 rgba(0,0,0,0.75)",
              overflow: "hidden",
              minWidth: 0,
              borderRadius: 0,
              height: LIST_H,
            }}
          >
            {leftCol.map((a, i) => (
              <RankRow key={a._id || a.id || a.slug || i} item={a} rank={i + 1} isFirst={i === 0} />
            ))}
          </div>

          <div
            className="__tv-trending-list"
            style={{
              border: UI.panelBorder,
              background: UI.cardBg,
              boxShadow: "6px 6px 0 rgba(0,0,0,0.75)",
              overflow: "hidden",
              minWidth: 0,
              borderRadius: 0,
              height: LIST_H,
            }}
          >
            {rightCol.map((a, i) => (
              <RankRow key={a._id || a.id || a.slug || i} item={a} rank={i + 5} isFirst={i === 0} />
            ))}
          </div>
        </div>

        <style>{`
          @media (max-width: 980px){
            .__tv-trending-lists { grid-template-columns: 1fr !important; }
            .__tv-trending-list { height: auto !important; }
          }
        `}</style>
      </div>
    </section>
  );
}

/* ---------- Category section wrapper: fetch + render 3 containers ---------- */
function CategorySection({ label, slug }) {
  const [topItems, setTopItems] = useState([]);
  const [latestItems, setLatestItems] = useState([]);
  const [trendingItems, setTrendingItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancel = false;

    const sortByBestTs = (arr) =>
      arr
        .map((a, idx) => ({ ...a, __ts: getBestTimestamp(a), __i: idx }))
        .sort((a, b) => (b.__ts === a.__ts ? a.__i - b.__i : b.__ts - a.__ts));

    const dedupeByIdAcross = (topArr, latestArr, trendingArr) => {
      const used = new Set();
      const pick = (arr) =>
        arr.filter((a) => {
          const id = String(a?._id || a?.id || a?.slug || "");
          if (!id || used.has(id)) return false;
          used.add(id);
          return true;
        });

      return {
        top: pick(topArr),
        latest: pick(latestArr),
        trending: pick(trendingArr),
      };
    };

    const fetchPlacement = async (placement, limit) => {
      const baseParams = {
        mode: "public",
        homepagePlacement: placement,
        limit,
        page: 1,
        status: "published",
      };

      // ✅ HOTFIX: backend honors `category` reliably; `categorySlug` is unreliable
      // 1) Try category (label) first, e.g. "India"
      let data = await cachedGet("/articles", { params: { ...baseParams, category: label } }, 30_000);

      let items = normalizeItems(data).filter((a) => isCategoryArticle(a, slug, label));

      // 2) Fallback to category (slug), e.g. "india"
      if (items.length === 0) {
        data = await cachedGet("/articles", { params: { ...baseParams, category: slug } }, 30_000);
        items = normalizeItems(data).filter((a) => isCategoryArticle(a, slug, label));
      }

      // 3) Last fallback to categorySlug (slug) — keep for compatibility
      if (items.length === 0) {
        data = await cachedGet(
          "/articles",
          { params: { ...baseParams, categorySlug: slug } },
          30_000
        );
        items = normalizeItems(data).filter((a) => isCategoryArticle(a, slug, label));
      }

      return items;
    };

    (async () => {
      try {
        setLoading(true);

        let topArr = [];
        let latestArr = [];
        let trendingArr = [];

        [topArr, latestArr, trendingArr] = await Promise.all([
          fetchPlacement("top", 10),
          fetchPlacement("latest", 12),
          fetchPlacement("trending", 20),
        ]);

        const topSorted = sortByBestTs(topArr);
        const latestSorted = sortByBestTs(latestArr);
        const trendingSorted = sortByBestTs(trendingArr);

        const uniq = dedupeByIdAcross(topSorted, latestSorted, trendingSorted);

        const topFinal = uniq.top.slice(0, 5); // hero + 4
        const latestFinal = uniq.latest.slice(0, 6); // 2 featured + 4 list
        const trendingFinal = uniq.trending.slice(0, 9); // rail + 8 ranked

        if (!cancel) {
          setTopItems(topFinal);
          setLatestItems(latestFinal);
          setTrendingItems(trendingFinal);
        }
      } catch {
        if (!cancel) {
          setTopItems([]);
          setLatestItems([]);
          setTrendingItems([]);
        }
      } finally {
        if (!cancel) setLoading(false);
      }
    })();

    return () => {
      cancel = true;
    };
  }, [label, slug]);

  const topStoriesSlice = useMemo(() => topItems, [topItems]);
  const latestSlice = useMemo(() => latestItems, [latestItems]);
  const trendingSlice = useMemo(() => trendingItems, [trendingItems]);

  const noStories =
    !loading && topStoriesSlice.length === 0 && latestSlice.length === 0 && trendingSlice.length === 0;

  if (noStories) {
    return (
      <div
        style={{
          maxWidth: HOME_CANVAS_MAX,
          margin: "18px auto",
          padding: "0 12px",
          color: "rgba(255,255,255,0.75)",
        }}
      >
        No {label} stories found.
      </div>
    );
  }

  return (
    <>
      <CategoryTopStoriesBlock items={topStoriesSlice} label={label} slug={slug} />
      {latestSlice.length > 0 && <CategoryLatestNewsBlock items={latestSlice} label={label} slug={slug} />}
      {trendingSlice.length > 0 && (
        <CategoryTrendingBlock items={trendingSlice} label={label} slug={slug} />
      )}
    </>
  );
}

export default function PublicHome() {
  const [showRails, setShowRails] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia("(min-width: 1280px)").matches : false
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

  const sections = useMemo(
    () => [
      { label: "India", slug: "india" },
      { label: "World", slug: "world" },
      { label: "Finance", slug: "finance" },
      { label: "General", slug: "general" },
      { label: "Entertainment", slug: "entertainment" },
      { label: "Health", slug: "health" },
      { label: "New Delhi", slug: "new-delhi" },
      { label: "Punjab", slug: "punjab" },
    ],
    []
  );

  return (
    <>
      <SiteNav />

      {showRails && (
        <>
          <PromoRailFixed side="left" />
          <PromoRailFixed side="right" />
        </>
      )}

      <div
        style={{
          minHeight: "60vh",
          padding: "10px 0 26px",

          /* ✅ CHANGE: Main public home page background -> NAVY */
          background: NAVY_PAGE_BG,
        }}
      >
        {sections.map((s) => (
          <CategorySection key={s.slug} label={s.label} slug={s.slug} />
        ))}
      </div>

      <SiteFooter />
    </>
  );
}
