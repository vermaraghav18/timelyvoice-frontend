// frontend/src/pages/public/CategoryPage.jsx
import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useNavigate, useLocation } from "react-router-dom";

import { cachedGet } from "../../lib/publicApi.js";
import { removeManagedHeadTags, upsertTag, setJsonLd } from "../../lib/seoHead.js";

import SiteNav from "../../components/SiteNav.jsx";
import SiteFooter from "../../components/SiteFooter.jsx";
import SectionRenderer from "../../components/sections/SectionRenderer.jsx";

import "../../styles/category.css"; // keep (rails/layout-critical)
import "../../styles/categoryHub.css"; // NEW

import { ensureRenderableImage } from "../../lib/images.js";

/* ---------- Brand constant ---------- */
const BRAND_NAME = "The Timely Voice";

/* ✅ Desktop content width (normal target) */
const DESKTOP_CONTENT_MAX = 1100;

/* ✅ Content padding inside the center column */
const CONTENT_PAD_X = 14;

/* ---------- AdSense: Category inline card ---------- */
const ADS_CLIENT = "ca-pub-8472487092329023";
const ADS_SLOT_INLINE = "5931257525"; // category_fitin_ad (300x300)

/* ---------- Promo Rail Banner (Left/Right) ---------- */
const PROMO_RAIL_IMG = "/banners/advertise-with-us-rail-120x700.png";
const PROMO_RAIL_TO_EMAIL =
  "https://mail.google.com/mail/?view=cm&fs=1&to=knotshorts1@gmail.com&su=Advertise%20With%20Us";

/* ---------- ✅ Inline promo banner (after every 7th article card) ---------- */
const PROMO_INLINE_IMG = "/banners/advertise-with-us-inline.png";
const PROMO_INLINE_TO_EMAIL = PROMO_RAIL_TO_EMAIL;

/**
 * ✅ IMPORTANT:
 * These rails are "fixed" to the viewport edges.
 * DO NOT TOUCH.
 */
const RAIL_WIDTH = 150;
const RAIL_HEIGHT = 635;
const RAIL_TOP_OFFSET = 0;

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
  const baseName = category?.name || humanizeSlug(key || "News").trim() || "News";

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

/* ---------- deterministic shuffle (stable “Trending”) ---------- */
function hashSeed(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function mulberry32(a) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function shuffleDeterministic(items, seedStr) {
  const arr = items.slice();
  const rand = mulberry32(hashSeed(seedStr));
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/* ---------- Article row (feed) ---------- */
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

/* ✅ robust title fallback (fixes “no title showing”) */
function getSafeTitle(a) {
  const t =
    (typeof a?.title === "string" && a.title.trim()) ||
    (typeof a?.headline === "string" && a.headline.trim()) ||
    (typeof a?.name === "string" && a.name.trim()) ||
    "";
  return t || "Untitled";
}

function ArticleRow({ a }) {
  const title = getSafeTitle(a);
  const articleUrl = `/article/${encodeURIComponent(a.slug)}`;

  const categorySlug = normalizeCategorySlugFromArticle(a);
  const categoryName = displayNameFromSlug(categorySlug);
  const categoryUrl = `/category/${encodeURIComponent(categorySlug)}`;

  const updated = a.updatedAt || a.publishedAt || a.publishAt || a.createdAt;

  const thumbRaw = ensureRenderableImage(a);
  const thumb = toCloudinaryOptimized(thumbRaw, 360);

  return (
    <article className="hubRowCard">
      <div className="hubRowInner">
        <div className="hubRowText">
          <Link to={articleUrl} className="hubRowTitleLink">
            <h3 className="hubRowTitle">{title}</h3>
          </Link>

          <div className="hubMeta">
            <Link to={categoryUrl} className="hubMetaCat">
              {categoryName}
            </Link>
            <span className="hubMetaDot" aria-hidden>
              •
            </span>
            <span className="hubMetaTime">Updated {timeAgo(updated)}</span>
          </div>
        </div>

        {thumb && (
          <Link to={articleUrl} className="hubRowThumbLink">
            <img
              src={thumb}
              alt={a.imageAlt || title || ""}
              className="hubRowThumb"
              loading="lazy"
              decoding="async"
            />
          </Link>
        )}
      </div>
    </article>
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
    } catch {}
  }, []);

  return (
    <div className="hubAdSlot" aria-label="advertisement">
      <div className="hubAdSlotLabel">ADVERTISEMENT</div>
      <div className="hubAdSlotInner">
        <ins
          className="adsbygoogle"
          style={{ display: "inline-block", width: 300, height: 300, margin: 0 }}
          data-ad-client={ADS_CLIENT}
          data-ad-slot={ADS_SLOT_INLINE}
        />
      </div>
    </div>
  );
}

/* ---------- Inline promo banner component ---------- */
function PromoInlineBanner() {
  return (
    <div className="hubInlinePromo" aria-label="promo inline banner">
      <a
        href={PROMO_INLINE_TO_EMAIL}
        target="_blank"
        rel="noopener noreferrer"
        className="hubInlinePromoLink"
        aria-label="Advertise with us - email"
      >
        <img
          src={PROMO_INLINE_IMG}
          alt="Advertise with us"
          className="hubInlinePromoImg"
          loading="lazy"
          decoding="async"
        />
      </a>
    </div>
  );
}

/* ---------- ✅ FIXED Promo Rails (DO NOT TOUCH) ---------- */
function PromoRailFixed({ side = "left" }) {
  return (
    <div
      style={{
        position: "fixed",
        top: RAIL_TOP_OFFSET,
        [side]: side === "right" ? 15 : 0,
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
            objectFit: "cover",
          }}
          loading="lazy"
          decoding="async"
        />
      </a>
    </div>
  );
}

/* ---------- Small card helpers (hub) ---------- */
function HubHero({ a, labelSlug }) {
  if (!a) return null;
  const title = getSafeTitle(a);
  const articleUrl = `/article/${encodeURIComponent(a.slug)}`;
  const updated = a.updatedAt || a.publishedAt || a.publishAt || a.createdAt;

  const imgRaw = ensureRenderableImage(a);
  const img = toCloudinaryOptimized(imgRaw, 1400);

  return (
    <section className="hubHero">
      <Link to={articleUrl} className="hubHeroMediaLink">
        <div className="hubHeroMedia">
          {img && (
            <img
              src={img}
              alt={a.imageAlt || title || ""}
              className="hubHeroImg"
              loading="lazy"
              decoding="async"
            />
          )}
          <div className="hubHeroOverlay">
            <span className="hubPill">{displayNameFromSlug(labelSlug)}</span>
            <h2 className="hubHeroTitle">{title}</h2>
            <div className="hubHeroMeta">Updated {timeAgo(updated)}</div>
          </div>
        </div>
      </Link>
    </section>
  );
}

function HubHeadlineList({ items = [] }) {
  if (!items.length) return null;
  return (
    <section className="hubHeadlines">
      <ul className="hubHeadlinesList">
        {items.map((a, i) => {
          const title = getSafeTitle(a);
          const articleUrl = `/article/${encodeURIComponent(a.slug)}`;
          return (
            <li key={a._id || a.id || a.slug || i} className="hubHeadlinesItem">
              <Link to={articleUrl} className="hubHeadlinesLink">
                {title}
              </Link>
            </li>
          );
        })}
      </ul>
      <div className="hubPagerMock" aria-hidden>
        <span className="hubPagerBtn">‹</span>
        <span className="hubPagerBtn">2</span>
        <span className="hubPagerBtn">›</span>
      </div>
    </section>
  );
}

function HubMiniCard({ a }) {
  if (!a) return null;
  const title = getSafeTitle(a);
  const articleUrl = `/article/${encodeURIComponent(a.slug)}`;
  const updated = a.updatedAt || a.publishedAt || a.publishAt || a.createdAt;

  const imgRaw = ensureRenderableImage(a);
  const img = toCloudinaryOptimized(imgRaw, 520);

  return (
    <article className="hubMiniCard">
      <Link to={articleUrl} className="hubMiniCardLink">
        {img ? (
          <img
            src={img}
            alt={a.imageAlt || title || ""}
            className="hubMiniImg"
            loading="lazy"
            decoding="async"
          />
        ) : null}
        <div className="hubMiniText">
          <h4 className="hubMiniTitle">{title}</h4>
          <div className="hubMiniMeta">• {timeAgo(updated)}</div>
        </div>
      </Link>
    </article>
  );
}

function HubGridCard({ a }) {
  if (!a) return null;
  const title = getSafeTitle(a);
  const articleUrl = `/article/${encodeURIComponent(a.slug)}`;
  const updated = a.updatedAt || a.publishedAt || a.publishAt || a.createdAt;

  const imgRaw = ensureRenderableImage(a);
  const img = toCloudinaryOptimized(imgRaw, 720);

  return (
    <article className="hubGridCard">
      <Link to={articleUrl} className="hubGridCardLink">
        {img ? (
          <img
            src={img}
            alt={a.imageAlt || title || ""}
            className="hubGridImg"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="hubGridImg hubGridImgFallback" aria-hidden />
        )}

        <div className="hubGridText">
          <h3 className="hubGridTitle">{title}</h3>
          <div className="hubGridMeta">
            <span className="hubMetaDot" aria-hidden>
              •
            </span>{" "}
            {timeAgo(updated)}
          </div>
        </div>
      </Link>
    </article>
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
        href: `${window.location.origin}/rss/${encodeURIComponent(
          normalizedSlug
        )}.xml`,
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
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: `${window.location.origin}/`,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: displayName || slug,
            item: canonical,
          },
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
        deduped.sort(
          (a, b) => (a.placementIndex ?? 0) - (b.placementIndex ?? 0)
        );
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
      (a, b) =>
        a.__after - b.__after ||
        (a.placementIndex ?? 0) - (b.placementIndex ?? 0)
    );
    return { topBlocks: tops, insetBlocks: insets };
  }, [mainBlocks]);

  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(max-width: 720px)").matches
      : false
  );

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

  /* ---------- HUB sectioning logic ----------
     ✅ REMOVED TABS (Latest/Trending/Explainers)
     We always use the latest-sorted list.
  ------------------------------------------ */
  const now = Date.now();
  const last48hTs = now - 48 * 60 * 60 * 1000;

  // Keeping these pools (not used now) is harmless, but we'll remove them to keep file clean.
  // const trendingPool = useMemo(() => { ... }, []);
  // const explainersPool = useMemo(() => { ... }, []);

  const drivingList = articles;

  const hero = drivingList?.[0] || null;
  const headlineList = drivingList.slice(1, 5);
  const featured = drivingList?.[5] || null;
  const moreTop = drivingList.slice(6, 10);

  // ✅ FULL-WIDTH Latest News (5 items) — placed UNDER the whole top grid
  const latestGrid = drivingList.slice(10, 15);

  const feedStartIndex = 14;
  const feedItems =
    drivingList.length > feedStartIndex ? drivingList.slice(feedStartIndex) : [];

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

      {showRails && (
        <>
          <PromoRailFixed side="left" />
          <PromoRailFixed side="right" />
        </>
      )}

      <div className="category-container">
        <div className="hubPage">
          <div style={contentWrapStyle}>
            {headBlocks.map((sec) => (
              <div key={sec._id || sec.id || sec.slug} style={headWrapStyle}>
                <SectionRenderer section={sec} />
              </div>
            ))}

            {loading && <p className="hubLoading">Loading…</p>}

            {!loading && notFound && (
              <div className="hubNotFound">
                <h1 className="hubTitle">{categoryCopy.displayName}</h1>
                <p className="hubMuted" style={{ marginTop: 8 }}>
                  We’re updating this section. You can read our latest{" "}
                  <Link to="/top-news" className="hubLink">
                    top stories
                  </Link>{" "}
                  in the meantime.
                </p>
              </div>
            )}

            {!loading && !notFound && (
              <>
                {topBlocks.map((sec) => (
                  <div key={sec._id || sec.id || sec.slug} className="hubTopBlock">
                    <SectionRenderer section={sec} />
                  </div>
                ))}

                {!articles || articles.length === 0 ? (
                  <div className="hubEmpty">
                    <h1 className="hubTitle">{categoryCopy.displayName}</h1>
                    <p className="hubMuted" style={{ marginTop: 8 }}>
                      New articles for this category are coming soon. Check{" "}
                      <Link to="/top-news" className="hubLink">
                        Top News
                      </Link>{" "}
                      while you wait.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* ✅ TOP GRID (Hero + Headlines + Right column) */}
                    <section className="hubTopGrid">
                      <div className="hubTopLeft">
                        <HubHero a={hero} labelSlug={normalizedSlug} />
                      </div>

                      <div className="hubTopMid">
                        <HubHeadlineList items={headlineList} />
                      </div>

                      <aside className="hubTopRight" aria-label="more top stories">
                        {featured ? (
                          <div className="hubFeatured">
                            <div className="hubFeaturedMedia">
                              <HubMiniCard a={featured} />
                            </div>
                          </div>
                        ) : null}

                        <div className="hubRightSectionTitle">More Top Stories</div>
                        <div className="hubMoreTopGrid">
                          {moreTop.map((a, i) => (
                            <HubMiniCard key={a._id || a.id || a.slug || i} a={a} />
                          ))}
                        </div>
                      </aside>
                    </section>

                    {/* ✅ MOVED: FULL-WIDTH Latest News (5 cards) */}
                    {latestGrid.length > 0 && (
                      <section className="hubHeroLatest hubHeroLatestFull">
                        <h3 className="hubHeroLatestTitle">Latest News</h3>
                        <div className="hubHeroLatestGrid">
                          {latestGrid.slice(0, 5).map((a, i) => (
                            <HubGridCard key={a._id || a.id || a.slug || i} a={a} />
                          ))}
                        </div>
                      </section>
                    )}

                    <section className="hubSection">
                      <h2 className="hubSectionTitle">Latest News</h2>

                      <div className="hubFeed">
                        {feedItems.map((a, idx) => {
                          const globalIndex = idx + (feedStartIndex + 1);

                          return (
                            <div key={a._id || a.id || a.slug || idx} style={{ width: "100%" }}>
                              <ArticleRow a={a} />

                              {(idx + 1) % 4 === 0 && <InlineAd />}

                              {globalIndex % 7 === 0 && <PromoInlineBanner />}

                              {renderInsetAfter(idx + 1)}
                            </div>
                          );
                        })}
                      </div>

                      <div className="hubLoadMoreWrap">
                        <button type="button" className="hubLoadMoreBtn">
                          Load More <span aria-hidden>›</span>
                        </button>
                      </div>
                    </section>
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
