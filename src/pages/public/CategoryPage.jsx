// frontend/src/pages/public/CategoryPage.jsx
import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useNavigate, useLocation } from "react-router-dom";

import { cachedGet } from "../../lib/publicApi.js";
import {
  removeManagedHeadTags,
  upsertTag,
  setJsonLd,
} from "../../lib/seoHead.js";

import SiteNav from "../../components/SiteNav.jsx";
import SiteFooter from "../../components/SiteFooter.jsx";
import SectionRenderer from "../../components/sections/SectionRenderer.jsx";
import "../../styles/category.css";

import { ensureRenderableImage } from "../../lib/images.js";

/* ---------- Brand constant ---------- */
const BRAND_NAME = "The Timely Voice";

/* ✅ Desktop content width (normal target) */
const DESKTOP_CONTENT_MAX = 920;

/* ✅ Content padding inside the center column */
const CONTENT_PAD_X = 12;

/* ---------- AdSense: Category inline card ---------- */
const ADS_CLIENT = "ca-pub-8472487092329023";
const ADS_SLOT_INLINE = "5931257525"; // category_fitin_ad (300x300)

/* ---------- Promo Rail Banner (Left/Right) ---------- */
const PROMO_RAIL_IMG = "/banners/advertise-with-us-rail-120x700.png";
const PROMO_RAIL_TO_EMAIL =
  "https://mail.google.com/mail/?view=cm&fs=1&to=knotshorts1@gmail.com&su=Advertise%20With%20Us";

/* ---------- ✅ NEW: Inline promo banner (after every 7th article card) ---------- */
const PROMO_INLINE_IMG = "/banners/advertise-with-us-inline.png";
const PROMO_INLINE_TO_EMAIL = PROMO_RAIL_TO_EMAIL;

/**
 * ✅ IMPORTANT:
 * These rails are "fixed" to the viewport edges.
 * Adjust this if your SiteNav height changes.
 */
const RAIL_WIDTH = 150;
const RAIL_HEIGHT = 635;

const RAIL_TOP_OFFSET = 0; // ✅ push rails to the very top edge

/* ---------- helper: relative time ---------- */
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

const toSlug = (s = "") =>
  String(s)
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const normPath = (p = "") => String(p).trim().replace(/\/+$/, "") || "/";

/* ---------- timestamp normalization & sorting (LATEST FIRST) ---------- */
function parseTs(v) {
  if (!v) return 0;
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  const s = String(v).trim();
  if (/^\d+$/.test(s)) return Number(s);
  const withT = s.replace(
    /^(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2}:\d{2})/,
    "$1T$2"
  );
  const t = Date.parse(withT);
  return Number.isFinite(t) ? t : 0;
}

function normalizeArticlesLatestFirst(items = []) {
  return items
    .filter(Boolean)
    .map((i, idx) => {
      const candidates = [
        i.publishedAt,
        i.publishAt,
        i.updatedAt,
        i.updated_at,
        i.createdAt,
        i.created_at,
        i.pubDate,
        i.timestamp,
      ];
      const best = Math.max(...candidates.map(parseTs), 0);
      return { ...i, _ts: best, _idx: idx };
    })
    .sort((a, b) => {
      if (b._ts !== a._ts) return b._ts - a._ts;
      return a._idx - b._idx;
    });
}

/* ---------- Category intro + SEO copy helpers ---------- */
function humanizeSlug(slug = "") {
  return String(slug || "")
    .split("-")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

const CATEGORY_COPY_STATIC = {
  india: {
    metaTitle: `India News — ${BRAND_NAME}`,
    metaDescription:
      "Follow key developments in India — policy, society, economy and governance — explained in clear, neutral language with helpful background context.",
    intro:
      "The India section of The Timely Voice covers what is shaping the country today — from government decisions and public policy to social issues and national debates. Each story is written in simple, neutral language so readers can quickly understand the headline and its real-world impact.",
  },
  world: {
    metaTitle: `World News & Geopolitics — ${BRAND_NAME}`,
    metaDescription:
      "Daily coverage of major global events, conflicts, summits and climate decisions, explained clearly for exam-focused and serious readers.",
    intro:
      "Our World section keeps you updated on big international stories — wars and ceasefires, global summits, climate talks, trade disputes and diplomacy. Articles focus on why an event is happening, who is involved, and what it means for India and the wider world.",
  },
  health: {
    metaTitle: `Health News — ${BRAND_NAME}`,
    metaDescription:
      "Evidence-based health coverage — research updates, public health alerts and lifestyle risks — explained clearly without sensationalism.",
    intro:
      "The Health section brings together important updates from medical research and public health sources. We focus on what the findings mean in real life — with simple explanations, practical context, and no panic-driven headlines.",
  },
  finance: {
    metaTitle: `Finance & Markets — ${BRAND_NAME}`,
    metaDescription:
      "Track markets, RBI policy, banking updates and key economic moves that shape money flows in India and abroad, explained in simple language.",
    intro:
      "In Finance, The Timely Voice covers money, markets and policy — from RBI decisions and inflation trends to stock market movements and banking updates. The goal is to simplify technical terms so you can follow what’s happening and why it matters.",
  },
  entertainment: {
    metaTitle: `Entertainment News — ${BRAND_NAME}`,
    metaDescription:
      "Film, OTT and celebrity updates with clean reporting, context and a focus on what audiences are watching and discussing.",
    intro:
      "Our Entertainment section tracks film and OTT releases, industry trends, and major pop-culture moments. We keep it clear, factual and easy to read — without unnecessary drama.",
  },
  history: {
    metaTitle: `History — ${BRAND_NAME}`,
    metaDescription:
      "Explore history through structured timelines and readable explainers designed for learners and serious readers.",
    intro:
      "The History category is built as a reading companion for learners who want chronology and clarity. Articles connect events, kingdoms and shifts over time so that dates and themes make sense as one continuous story.",
  },
  "new-delhi": {
    metaTitle: `New Delhi News — ${BRAND_NAME}`,
    metaDescription:
      "Local updates from New Delhi — civic issues, governance, public services and major city developments.",
    intro:
      "New Delhi coverage focuses on what affects people on the ground — civic updates, governance decisions, public services and major city developments — presented in clear, factual language.",
  },
  punjab: {
    metaTitle: `Punjab News — ${BRAND_NAME}`,
    metaDescription:
      "Punjab updates — state news, governance, society, economy and local developments that matter.",
    intro:
      "Punjab coverage highlights state-level developments — governance decisions, society, economy and local issues — written simply so you can understand the story fast.",
  },
  general: {
    metaTitle: `Top Stories & Updates — ${BRAND_NAME}`,
    metaDescription:
      "General news and top updates across topics — clean reporting and quick explainers from The Timely Voice.",
    intro:
      "General is where we publish important updates that cut across categories — quick, clear stories with the key context you need.",
  },
};

function getCategoryCopy(slug, category) {
  const key = String(slug || "").toLowerCase();
  const baseName =
    category?.name || humanizeSlug(key || "News").trim() || "News";

  const fallbackMetaTitle = `${baseName} News & Analysis — ${BRAND_NAME}`;
  const fallbackMetaDescription = `Latest ${baseName.toLowerCase()} stories, context and explainers from ${BRAND_NAME}.`;
  const fallbackIntro = `Explore the latest ${baseName.toLowerCase()} headlines with clean reporting and short explainers that help you connect the news to the bigger picture.`;

  const overrides = CATEGORY_COPY_STATIC[key] || {};
  return {
    displayName: baseName,
    metaTitle: overrides.metaTitle || fallbackMetaTitle,
    metaDescription: overrides.metaDescription || fallbackMetaDescription,
    intro: overrides.intro || fallbackIntro,
  };
}

function toCloudinaryOptimized(url, width = 520) {
  const u = String(url || "");
  if (!u) return "";
  if (!u.includes("/upload/")) return u;
  return u.replace("/upload/", `/upload/f_auto,q_auto,w_${width}/`);
}

/* ---------- layout styles ---------- */
const TOP_GAP = 16;

const pageWrap = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "flex-start",
  paddingTop: 0,
  marginTop: TOP_GAP,
  marginBottom: 40,
  fontFamily: "'Newsreader', serif",
};

const listStyle = { display: "flex", flexDirection: "column", gap: 0 };
const itemWrap = { width: "100%", marginBottom: 8 };

const adWrap = {
  width: "100%",
  margin: "12px 0 2px",
  textAlign: "center",
  lineHeight: 0,
};

const inlineBannerWrap = {
  width: "100%",
  margin: "12px 0 10px",
  lineHeight: 0,
};

const inlineBannerImg = {
  width: "100%",
  height: "auto",
  display: "block",
  borderRadius: 8,
};

const cardStyle = {
  background: "linear-gradient(135deg, #001236 0%, #001e49ff 100%)",
  borderRadius: 1,
  border: "0px solid #e5e7eb",
  padding: 10,
  boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
};

const titleStyle = {
  margin: 0,
  fontSize: 18,
  fontWeight: 500,
  lineHeight: 1.3,
  color: "#ffffffff",
  fontFamily: "'Merriweather Sans', sans-serif",
};

const metaRow = {
  marginTop: 14,
  fontSize: 12,
  color: "#6b7280",
  display: "flex",
  gap: 4,
  alignItems: "center",
  flexWrap: "wrap",
};

const catLink = {
  color: "#1d4ed8",
  textDecoration: "none",
  fontWeight: 600,
};

const thumbStyle = {
  width: 110,
  height: 75,
  objectFit: "cover",
  borderRadius: 1,
  display: "block",
};

const firstWrap = { marginBottom: 14, padding: 0 };

const firstTitle = {
  margin: "0 0 10px",
  fontSize: 26,
  lineHeight: 1.15,
  fontWeight: 800,
  color: "#ffffff",
  fontFamily: "'Merriweather Sans', sans-serif",
};

const firstImg = (isMobile) => ({
  width: "100%",
  height: isMobile ? 260 : 380,
  objectFit: "cover",
  borderRadius: 2,
  display: "block",
  marginBottom: 10,
});

const firstSummary = {
  fontSize: 18,
  color: "#b9b9b9ff",
  marginTop: 6,
  lineHeight: 1.6,
};

const firstMeta = {
  marginTop: 8,
  fontSize: 12,
  color: "#ee6affff",
  display: "flex",
  gap: 6,
  alignItems: "center",
  flexWrap: "wrap",
};

function FirstArticle({ a, isMobile }) {
  if (!a) return null;

  const articleUrl = `/article/${encodeURIComponent(a.slug)}`;
  const updated = a.updatedAt || a.publishedAt || a.publishAt || a.createdAt;

  const imgRaw = ensureRenderableImage(a);
  const img = toCloudinaryOptimized(imgRaw, 1400);

  const summary =
    a.summary ||
    a.excerpt ||
    a.description ||
    a.seoDescription ||
    (typeof a.body === "string"
      ? a.body.replace(/<[^>]*>/g, "").slice(0, 260)
      : "");

  return (
    <div style={firstWrap}>
      <Link to={articleUrl} style={{ textDecoration: "none", color: "inherit" }}>
        <h1 style={firstTitle}>{a.title}</h1>
      </Link>

      {img && (
        <Link to={articleUrl} style={{ display: "block" }}>
          <img
            src={img}
            alt={a.imageAlt || a.title || ""}
            style={firstImg(isMobile)}
            loading="lazy"
            decoding="async"
          />
        </Link>
      )}

      {summary && (
        <Link to={articleUrl} style={{ textDecoration: "none", color: "inherit" }}>
          <p style={firstSummary}>{summary}</p>
        </Link>
      )}

      <div style={firstMeta}>
        <span>Updated {timeAgo(updated)}</span>
      </div>
    </div>
  );
}

/* ---------- Top 2 grid ---------- */
const topGridWrap = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 12,
  marginBottom: 14,
};

const topCard = {
  background: "#001236ff",
  border: "0px solid #e5e7eb",
  borderRadius: 1,
  padding: 10,
  boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
  overflow: "hidden",
};

const topImg = {
  width: "100%",
  height: 190,
  objectFit: "cover",
  borderRadius: 2,
  display: "block",
  marginTop: 8,
};

const topTitle = {
  margin: 0,
  fontSize: 18,
  lineHeight: 1.25,
  fontWeight: 700,
  color: "#ffffff",
};

const topMeta = {
  marginTop: 8,
  fontSize: 12,
  color: "#ee6affff",
  display: "flex",
  gap: 6,
  alignItems: "center",
  flexWrap: "wrap",
};

const topSummary = {
  marginTop: 8,
  fontSize: 14,
  lineHeight: 1.5,
  color: "#cbd5ff",
  display: "-webkit-box",
  WebkitLineClamp: 3,
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
};

function TopCard({ a }) {
  if (!a) return null;
  const articleUrl = `/article/${encodeURIComponent(a.slug)}`;
  const updated = a.updatedAt || a.publishedAt || a.publishAt || a.createdAt;

  const imgRaw = ensureRenderableImage(a);
  const img = toCloudinaryOptimized(imgRaw, 900);

  const summary =
    a.summary ||
    a.excerpt ||
    a.description ||
    a.seoDescription ||
    (typeof a.body === "string"
      ? a.body.replace(/<[^>]*>/g, "").slice(0, 170)
      : "");

  return (
    <div style={topCard}>
      <Link to={articleUrl} style={{ textDecoration: "none", color: "inherit" }}>
        <h2 style={topTitle}>{a.title}</h2>
      </Link>

      {img && (
        <Link to={articleUrl} style={{ display: "block" }}>
          <img
            src={img}
            alt={a.imageAlt || a.title || ""}
            style={topImg}
            loading="lazy"
            decoding="async"
          />
        </Link>
      )}

      {summary && (
        <Link to={articleUrl} style={{ textDecoration: "none", color: "inherit" }}>
          <p style={topSummary}>{summary}</p>
        </Link>
      )}

      <div style={topMeta}>
        <span>Updated {timeAgo(updated)}</span>
      </div>
    </div>
  );
}

function TwoUpGrid({ a1, a2, isMobile }) {
  if (!a1 && !a2) return null;

  if (isMobile) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 14 }}>
        {a1 && <TopCard a={a1} />}
        {a2 && <TopCard a={a2} />}
      </div>
    );
  }

  if (a1 && !a2) return <TopCard a={a1} />;
  if (!a1 && a2) return <TopCard a={a2} />;

  return (
    <div style={topGridWrap}>
      <TopCard a={a1} />
      <TopCard a={a2} />
    </div>
  );
}

/* ---------- Article Row ---------- */
const ALLOWED_SLUGS = new Set([
  "india",
  "world",
  "health",
  "finance",
  "history",
  "new-delhi",
  "punjab",
  "entertainment",
  "general",
]);

function normalizeCategorySlugFromArticle(a) {
  const rawSlug =
    (typeof a?.categorySlug === "string" && a.categorySlug) ||
    (typeof a?.category === "string" ? a.category : "") ||
    (typeof a?.category?.slug === "string" ? a.category.slug : "") ||
    (typeof a?.category?.name === "string" ? a.category.name : "");

  const s = toSlug(rawSlug);

  if (s === "business") return "finance";
  if (s === "politics") return "india";
  if (!ALLOWED_SLUGS.has(s)) return "general";
  return s;
}

function displayNameFromSlug(slug) {
  const map = {
    india: "India",
    world: "World",
    health: "Health",
    finance: "Finance",
    history: "History",
    "new-delhi": "New Delhi",
    punjab: "Punjab",
    entertainment: "Entertainment",
    general: "General",
  };
  return map[slug] || humanizeSlug(slug) || "General";
}

function ArticleRow({ a, compact = false }) {
  const articleUrl = `/article/${encodeURIComponent(a.slug)}`;

  const categorySlug = normalizeCategorySlugFromArticle(a);
  const categoryName = displayNameFromSlug(categorySlug);
  const categoryUrl = `/category/${encodeURIComponent(categorySlug)}`;

  const updated = a.updatedAt || a.publishedAt || a.publishAt || a.createdAt;

  const thumbRaw = ensureRenderableImage(a);
  const thumb = toCloudinaryOptimized(thumbRaw, compact ? 300 : 360);

  const cardS = compact ? { ...cardStyle, padding: 8 } : cardStyle;
  const titleS = compact ? { ...titleStyle, fontSize: 16, lineHeight: 1.2 } : titleStyle;
  const metaS = compact ? { ...metaRow, marginTop: 6 } : metaRow;

  const rowS = compact
    ? { display: "grid", gridTemplateColumns: thumb ? "1fr 96px" : "1fr", gap: 6, alignItems: "center" }
    : { display: "grid", gridTemplateColumns: thumb ? "1fr 110px" : "1fr", gap: 8, alignItems: "center" };

  const thumbS = compact ? { ...thumbStyle, width: 96, height: 64 } : thumbStyle;

  return (
    <div style={cardS}>
      <div style={rowS}>
        <div style={{ minWidth: 0 }}>
          <Link to={articleUrl} style={{ textDecoration: "none", color: "inherit" }}>
            <h3 style={titleS}>{a.title}</h3>
          </Link>

          <div style={metaS}>
            <Link to={categoryUrl} style={catLink}>
              {categoryName}
            </Link>
            <span aria-hidden>•</span>
            <span>Updated {timeAgo(updated)}</span>
          </div>
        </div>

        {thumb && (
          <Link to={articleUrl}>
            <img
              src={thumb}
              alt={a.imageAlt || a.title || ""}
              style={thumbS}
              loading="lazy"
              decoding="async"
            />
          </Link>
        )}
      </div>
    </div>
  );
}

/* ---------- Inline Ad (300×300) ---------- */
function InlineAd() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const existing = document.querySelector(
      'script[src*="pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"]'
    );

    if (!existing) {
      const s = document.createElement("script");
      s.async = true;
      s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(
        ADS_CLIENT
      )}`;
      s.crossOrigin = "anonymous";
      document.head.appendChild(s);
    }

    try {
      window.adsbygoogle = window.adsbygoogle || [];
      window.adsbygoogle.push({});
    } catch {
      // ignore
    }
  }, []);

  return (
    <div style={adWrap}>
      <ins
        className="adsbygoogle"
        style={{ display: "inline-block", width: 300, height: 300, margin: 0 }}
        data-ad-client={ADS_CLIENT}
        data-ad-slot={ADS_SLOT_INLINE}
      />
    </div>
  );
}

/* ---------- ✅ NEW: Inline promo banner component ---------- */
function PromoInlineBanner() {
  return (
    <div style={inlineBannerWrap} aria-label="promo inline banner">
      <a
        href={PROMO_INLINE_TO_EMAIL}
        target="_blank"
        rel="noopener noreferrer"
        style={{ display: "block" }}
        aria-label="Advertise with us - email"
      >
        <img
          src={PROMO_INLINE_IMG}
          alt="Advertise with us"
          style={inlineBannerImg}
          loading="lazy"
          decoding="async"
        />
      </a>
    </div>
  );
}

/* ---------- ✅ FIXED Promo Rails (edge pinned, no top gap) ---------- */
function PromoRailFixed({ side = "left" }) {
  return (
    <div
      style={{
        position: "fixed",
        top: RAIL_TOP_OFFSET,
        [side]: side === "right" ? 15 : 0, // ✅ only right banner moves left by 18px
        width: RAIL_WIDTH,
        height: RAIL_HEIGHT,
        zIndex: 50,
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
            objectFit: "cover", // ✅ fills the rail perfectly
          }}
          loading="lazy"
          decoding="async"
        />
      </a>
    </div>
  );
}

export default function CategoryPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { pathname, search } = location;
  const pagePath = normPath(pathname);

  const page = 1;
  const limit = 500;

  const [category, setCategory] = useState(null);
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [pageSections, setPageSections] = useState([]);
  const [planSections, setPlanSections] = useState([]);

  const normalizedSlug = useMemo(() => toSlug(slug), [slug]);

  const canonical = useMemo(() => {
    const origin =
      typeof window !== "undefined"
        ? window.location.origin
        : "https://timelyvoice.com";
    return `${origin}/category/${encodeURIComponent(normalizedSlug)}`;
  }, [normalizedSlug]);

  const categoryCopy = useMemo(
    () => getCategoryCopy(normalizedSlug, category),
    [normalizedSlug, category]
  );

  useEffect(() => {
    const want = `/category/${normalizedSlug}`;
    if (pathname !== want) {
      navigate({ pathname: want, search }, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [normalizedSlug]);

  function extractCanonicalSlugFromRedirect(res) {
    const p = res?.data?.redirectTo || "";
    const m = String(p).match(/\/(?:public\/)?categories\/([^/]+)/i);
    return m ? m[1] : null;
  }

  /* fetch category + articles */
  useEffect(() => {
    let alive = true;
    setLoading(true);
    setNotFound(false);

    (async () => {
      try {
        const cRes = await cachedGet(
          `/categories/slug/${encodeURIComponent(normalizedSlug)}`,
          { validateStatus: () => true },
          5 * 60_000
        );

        if (cRes?.redirectTo) {
          const newSlug = extractCanonicalSlugFromRedirect({ data: cRes });
          if (newSlug)
            navigate({ pathname: `/category/${newSlug}`, search }, { replace: true });
          return;
        }

        if (!alive) return;

        let effectiveSlug = normalizedSlug;

        if (cRes && cRes.slug) {
          setCategory(cRes);
          effectiveSlug = cRes.slug;
        } else if (cRes && cRes.status === 404) {
          setCategory(null);
          setNotFound(true);
          setArticles([]);
          return;
        } else if (cRes == null) {
          setCategory(null);
        }

        const aData = await cachedGet(
          `/articles`,
          { params: { category: effectiveSlug, page, limit }, validateStatus: () => true },
          25_000
        );

        if (!alive) return;

        if (Array.isArray(aData?.items)) {
          const sorted = normalizeArticlesLatestFirst(aData.items);
          setArticles(sorted);
        } else if (aData?.status === 404) {
          setArticles([]);
          setNotFound(true);
        } else {
          setArticles([]);
        }
      } catch {
        if (!alive) return;
        setNotFound(true);
        setArticles([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [slug, navigate, normalizedSlug, search]);

  /* SEO */
  useEffect(() => {
    removeManagedHeadTags();

    const { metaTitle, metaDescription } = categoryCopy;

    upsertTag("title", {}, { textContent: metaTitle });

    upsertTag("meta", {
      name: "description",
      content: metaDescription || "Browse latest stories on The Timely Voice.",
    });

    upsertTag("link", { rel: "canonical", href: canonical });

    upsertTag("meta", {
      name: "robots",
      content: "index,follow",
      "data-managed": "robots",
    });

    if (slug && typeof window !== "undefined") {
      upsertTag("link", {
        rel: "alternate",
        type: "application/rss+xml",
        title: `Timely Voice — ${category?.name || slug}`,
        href: `${window.location.origin}/rss/${encodeURIComponent(normalizedSlug)}.xml`,
      });
    }

    try {
      if (typeof window === "undefined") return;

      const { metaTitle: t, metaDescription: d, displayName } = categoryCopy;

      const coll = {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: t,
        description: d,
        url: canonical,
      };

      const breadcrumb = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: `${window.location.origin}/` },
          { "@type": "ListItem", position: 2, name: displayName || slug, item: canonical },
        ],
      };

      setJsonLd({ "@context": "https://schema.org", "@graph": [coll, breadcrumb] });
    } catch {}
  }, [categoryCopy, canonical, slug, normalizedSlug, category?.name]);

  /* fetch sections for THIS page path (head_*) */
  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const data = await cachedGet(
          "/sections",
          { params: { path: pagePath }, validateStatus: () => true },
          60_000
        );

        const items = Array.isArray(data) ? data : [];

        const filtered = items.filter(
          (s) =>
            s?.enabled !== false &&
            s?.target?.type === "path" &&
            normPath(s?.target?.value) === pagePath
        );

        const seen = new Set();
        const deduped = [];
        for (const s of filtered) {
          const k = s._id || s.id || s.slug;
          if (k && !seen.has(k)) {
            seen.add(k);
            deduped.push(s);
          }
        }
        deduped.sort((a, b) => (a.placementIndex ?? 0) - (b.placementIndex ?? 0));
        if (!cancel) setPageSections(deduped);
      } catch {
        if (!cancel) setPageSections([]);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [pagePath]);

  const headBlocks = pageSections.filter((s) => s.template?.startsWith("head_"));

  /* plan sections cached */
  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const data = await cachedGet(
          "/sections/plan",
          {
            params: {
              sectionType: "category",
              sectionValue: String(slug || "").toLowerCase(),
            },
            validateStatus: () => true,
          },
          60_000
        );

        const rows = Array.isArray(data) ? data : [];
        if (!cancel) setPlanSections(rows);
      } catch {
        if (!cancel) setPlanSections([]);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [slug]);

  const mainBlocks = useMemo(() => {
    return (planSections || [])
      .filter(
        (s) =>
          s?.enabled !== false &&
          !String(s?.template || "").startsWith("rail_") &&
          !String(s?.template || "").startsWith("head_")
      )
      .sort((a, b) => (a.placementIndex ?? 0) - (b.placementIndex ?? 0));
  }, [planSections]);

  const { topBlocks, insetBlocks } = useMemo(() => {
    const tops = [];
    const insets = [];
    for (const s of mainBlocks) {
      const nRaw = s?.custom?.afterNth;
      const n = nRaw === "" || nRaw == null ? null : Number(nRaw);
      if (!Number.isFinite(n) || n <= 0) tops.push(s);
      else insets.push({ ...s, __after: n });
    }
    insets.sort(
      (a, b) => a.__after - b.__after || (a.placementIndex ?? 0) - (b.placementIndex ?? 0)
    );
    return { topBlocks: tops, insetBlocks: insets };
  }, [mainBlocks]);

  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(max-width: 720px)").matches
      : false
  );

  // ✅ show rails only if enough viewport width for them
  const [showRails, setShowRails] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(min-width: 1280px)").matches
      : false
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mqMobile = window.matchMedia("(max-width: 720px)");
    const onMobile = (e) => setIsMobile(e.matches);
    mqMobile.addEventListener?.("change", onMobile);
    mqMobile.addListener?.(onMobile);

    const mqRails = window.matchMedia("(min-width: 1280px)");
    const onRails = (e) => setShowRails(e.matches);
    mqRails.addEventListener?.("change", onRails);
    mqRails.addListener?.(onRails);

    return () => {
      mqMobile.removeEventListener?.("change", onMobile);
      mqMobile.removeListener?.(onMobile);

      mqRails.removeEventListener?.("change", onRails);
      mqRails.removeListener?.(onRails);
    };
  }, []);

  const first = articles?.[0] || null;
  const second = articles?.[1] || null;
  const third = articles?.[2] || null;
  const rest = Array.isArray(articles) && articles.length > 3 ? articles.slice(3) : [];

  const renderInsetAfter = (idx) => {
    const blocks = insetBlocks.filter((b) => b.__after === idx);
    if (!blocks.length) return null;
    return blocks.map((sec) => (
      <div key={sec._id || sec.id || sec.slug} style={{ marginTop: 12 }}>
        <SectionRenderer section={sec} />
      </div>
    ));
  };

  const computedContentMax = useMemo(() => {
    if (isMobile) return 1200;
    return DESKTOP_CONTENT_MAX;
  }, [isMobile]);

  const contentWrapStyle = useMemo(() => {
    return {
      width: "100%",
      maxWidth: computedContentMax,
      padding: `0 ${CONTENT_PAD_X}px`,
    };
  }, [computedContentMax]);

  const headWrapStyle = useMemo(() => {
    return {
      width: "100%",
      maxWidth: computedContentMax,
      padding: `0 ${CONTENT_PAD_X}px`,
      marginBottom: 12,
    };
  }, [computedContentMax]);

  return (
    <>
      <SiteNav />

      {/* ✅ rails pinned to screen edges */}
      {showRails && (
        <>
          <PromoRailFixed side="left" />
          <PromoRailFixed side="right" />
        </>
      )}

      <div className="category-container">
        <div style={pageWrap}>
          {headBlocks.map((sec) => (
            <div key={sec._id || sec.id || sec.slug} style={headWrapStyle}>
              <SectionRenderer section={sec} />
            </div>
          ))}

          <div style={contentWrapStyle}>
            {loading && <p>Loading…</p>}

            {!loading && notFound && (
              <>
                <h1>{categoryCopy.displayName}</h1>
                <p style={{ marginTop: 8 }}>
                  We’re updating this section. You can read our latest{" "}
                  <Link to="/top-news">top stories</Link> in the meantime.
                </p>
              </>
            )}

            {!loading && !notFound && (
              <>
                {topBlocks.map((sec) => (
                  <div key={sec._id || sec.id || sec.slug} style={{ marginBottom: 12 }}>
                    <SectionRenderer section={sec} />
                  </div>
                ))}

                {!articles || articles.length === 0 ? (
                  <>
                    <h1>{categoryCopy.displayName}</h1>
                    <p style={{ marginTop: 8, textAlign: "center" }}>
                      New articles for this category are coming soon. Check{" "}
                      <Link to="/top-news">Top News</Link> while you wait.
                    </p>
                  </>
                ) : (
                  <>
                    <FirstArticle a={first} isMobile={isMobile} />
                    <TwoUpGrid a1={second} a2={third} isMobile={isMobile} />

                    <div style={listStyle}>
                      {rest.map((a, idx) => {
                        // Global index across the full article list:
                        // first=1, second=2, third=3, rest starts at 4
                        const globalIndex = idx + 4;

                        return (
                          <div key={a._id || a.id || a.slug || idx} style={{ width: "100%" }}>
                            <div style={itemWrap}>
                              <ArticleRow a={a} compact={!isMobile} />
                            </div>

                            {/* existing AdSense rule (kept as-is) */}
                            {(idx + 1) % 4 === 0 && <InlineAd />}

                            {/* ✅ NEW: promo banner after every 7th article card */}
                            {globalIndex % 7 === 0 && <PromoInlineBanner />}

                            {renderInsetAfter(idx + 1)}
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <SiteFooter />
    </>
  );
}
