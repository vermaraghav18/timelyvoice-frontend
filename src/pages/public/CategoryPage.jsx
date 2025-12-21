// frontend/src/pages/public/CategoryPage.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams, useNavigate, useLocation } from "react-router-dom";

import { api, cachedGet } from "../../lib/publicApi.js";
import { removeManagedHeadTags, upsertTag, setJsonLd } from "../../lib/seoHead.js";

import SiteNav from "../../components/SiteNav.jsx";
import SiteFooter from "../../components/SiteFooter.jsx";
import SectionRenderer from "../../components/sections/SectionRenderer.jsx";
import "../../styles/category.css";

import { ensureRenderableImage } from "../../lib/images.js";

/* ---------- Brand constant ---------- */
const BRAND_NAME = "The Timely Voice";

/* ✅ Desktop content width (controls left/right empty space)
   - smaller number => more empty space on sides
   - start with 920; try 860 if you want even more rail space later
*/
const DESKTOP_CONTENT_MAX = 920;

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

/* ---------- small utils ---------- */
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
      "Follow key developments in Indian politics, policy, economy and society. The Timely Voice explains complex events in simple, exam-friendly language with clear background context.",
    intro:
      "The India section of The Timely Voice tracks what is shaping the country today — from Parliament and state politics to economy, welfare schemes, foreign policy and social change. Each story is written in clear, neutral language so that students and serious readers can quickly connect the headline to the larger syllabus and real-world impact.",
  },
  world: {
    metaTitle: `World News & Geopolitics — ${BRAND_NAME}`,
    metaDescription:
      "Daily coverage of major global events, conflicts, summits and climate decisions. Built for UPSC and exam-focused readers who need clean, balanced world news explainers.",
    intro:
      "Our World section keeps you updated on the big international stories that matter for exams and for understanding geopolitics — wars and ceasefires, global summits, climate talks, trade disputes and diplomacy. Articles focus on why an event is happening, which countries are involved, and what it means for India and the wider world.",
  },
  business: {
    metaTitle: `Business & Economy News — ${BRAND_NAME}`,
    metaDescription:
      "Markets, RBI policy, trade deals and corporate moves explained in clear terms. Timely Voice Business focuses on economic trends that affect inflation, jobs and growth.",
    intro:
      "The Business section covers the Indian and global economy with a focus on how decisions on interest rates, trade deals, regulations and corporate announcements affect ordinary people. Stories highlight key numbers, long-term trends and exam-relevant concepts like GDP, inflation, fiscal policy and financial stability.",
  },
  finance: {
    metaTitle: `Finance & Markets — ${BRAND_NAME}`,
    metaDescription:
      "Track interest rates, stock markets, banking updates and policy moves that shape money flows in India and abroad, explained in simple language.",
    intro:
      "In Finance, The Timely Voice looks at how money moves through markets and banks — from RBI decisions and government borrowing to stock market volatility and global risk events. Articles aim to simplify technical terms so that even first-time readers can follow what is happening and why it matters.",
  },
  health: {
    metaTitle: `Health & Science News — ${BRAND_NAME}`,
    metaDescription:
      "Evidence-based coverage of medical research, public health alerts and lifestyle risks. Articles are written to help readers understand real-world impact, not create panic.",
    intro:
      "The Health section brings together important updates from medical research, public health agencies and major journals. We focus on how new findings relate to everyday life in India — from air pollution and lifestyle diseases to vaccines and hospital infrastructure — with clear explanations and no sensationalism.",
  },
  politics: {
    metaTitle: `Politics & Governance — ${BRAND_NAME}`,
    metaDescription:
      "Neutral, exam-focused coverage of elections, policy decisions, governance debates and constitutional issues from across India.",
    intro:
      "Politics at The Timely Voice follows elections, campaigns and policy decisions across India with a focus on governance and institutions rather than drama. Reports look at what parties promise, what is actually notified in law, and how these choices affect citizens, federalism and long-term development.",
  },
  history: {
    metaTitle: `Ancient History Timeline (4000–0 BC) — ${BRAND_NAME}`,
    metaDescription:
      "Explore a structured timeline of ancient civilizations from 4000 BC to 0 BC, with exam-ready articles on Mesopotamia, Egypt, India and more.",
    intro:
      "The History category is built as a continuous reading companion for learners who want to travel from 4000 BC to 0 BC in an organised way. Articles connect major kingdoms, wars, cultural shifts and trade routes across Mesopotamia, Egypt, India and the wider ancient world, so that dates and dynasties start making sense as one flowing story.",
  },
};

function getCategoryCopy(slug, category) {
  const key = String(slug || "").toLowerCase();
  const baseName =
    category?.name || humanizeSlug(key || "News").trim() || "News";

  const fallbackMetaTitle = `${baseName} News & Analysis — ${BRAND_NAME}`;
  const fallbackMetaDescription = `Latest ${baseName.toLowerCase()} stories, context and exam-ready explainers from ${BRAND_NAME}.`;
  const fallbackIntro = `Explore the latest ${baseName.toLowerCase()} headlines with clean, neutral reporting and short explainers that help you connect the news to the bigger picture.`;

  const overrides = CATEGORY_COPY_STATIC[key] || {};
  return {
    displayName: baseName,
    metaTitle: overrides.metaTitle || fallbackMetaTitle,
    metaDescription: overrides.metaDescription || fallbackMetaDescription,
    intro: overrides.intro || fallbackIntro,
  };
}

/* ---------- Cloudinary perf transform helper ---------- */
function toCloudinaryOptimized(url, width = 520) {
  const u = String(url || "");
  if (!u) return "";
  if (!u.includes("/upload/")) return u;
  return u.replace("/upload/", `/upload/f_auto,q_auto,w_${width}/`);
}

/* ---------- layout ---------- */
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

const listStyle = { display: "flex", flexDirection: "column", gap: 8 };

const cardStyle = {
  background: "linear-gradient(135deg, #001236 0%, #001e49ff 100%)",
  borderRadius: 1,
  border: "0px solid #e5e7eb",
  padding: 10,
  boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
};

const rowLayout = (hasThumb) => ({
  display: "grid",
  gridTemplateColumns: hasThumb ? "1fr 110px" : "1fr",
  gap: 8,
  alignItems: "center",
});

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

/* ---------- Lead Card (first story) ---------- */
const leadCardWrap = {
  marginBottom: 14,
  background: "#001236ff",
  border: "0px solid #e5e7eb",
  borderRadius: 1,
  padding: 12,
  boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
};

const leadImg = {
  width: "100%",
  height: 320,
  objectFit: "cover",
  borderRadius: 2,
  display: "block",
  marginBottom: 10,
};

const leadH = {
  margin: "0 0 6px",
  fontSize: 21,
  lineHeight: 1.25,
  fontWeight: 600,
  color: "#ffffffff",
};

const leadMeta = {
  marginTop: 6,
  fontSize: 12,
  color: "#ee6affff",
  display: "flex",
  gap: 6,
  alignItems: "center",
  flexWrap: "wrap",
};

const leadSummary = {
  fontSize: 18,
  color: "#b9b9b9ff",
  marginTop: 6,
  lineHeight: 1.6,
};

function LeadCard({ a }) {
  if (!a) return null;
  const articleUrl = `/article/${encodeURIComponent(a.slug)}`;
  const updated = a.updatedAt || a.publishedAt || a.publishAt || a.createdAt;

  const imgRaw = ensureRenderableImage(a);
  const img = toCloudinaryOptimized(imgRaw, 1200);

  const summary =
    a.summary ||
    a.excerpt ||
    a.description ||
    a.seoDescription ||
    (typeof a.body === "string"
      ? a.body.replace(/<[^>]*>/g, "").slice(0, 220)
      : "");

  return (
    <div style={leadCardWrap}>
      <Link to={articleUrl} style={{ textDecoration: "none", color: "inherit" }}>
        <h2 style={leadH}>{a.title}</h2>
      </Link>
      {img && (
        <Link to={articleUrl} style={{ display: "block" }}>
          <img
            src={img}
            alt={a.imageAlt || a.title || ""}
            style={leadImg}
            loading="lazy"
            decoding="async"
          />
        </Link>
      )}
      {summary && (
        <Link to={articleUrl} style={{ textDecoration: "none", color: "inherit" }}>
          <p style={leadSummary}>{summary}</p>
        </Link>
      )}
      <div style={leadMeta}>
        <span>Updated {timeAgo(updated)}</span>
      </div>
    </div>
  );
}

/* ---------- Article Row (rest) ---------- */
function getCategoryName(a) {
  const raw =
    typeof a?.category === "string" ? a.category : a?.category?.name ?? "General";
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
    india: "India",
  };
  return map[String(raw || "General").trim().toLowerCase()] || (raw || "General");
}

// ✅ NEW: compact prop to reduce desktop height only (kept from your current code)
function ArticleRow({ a, compact = false }) {
  const articleUrl = `/article/${encodeURIComponent(a.slug)}`;
  const categoryName = getCategoryName(a);
  const categoryUrl = `/category/${encodeURIComponent(toSlug(categoryName))}`;
  const updated = a.updatedAt || a.publishedAt || a.publishAt || a.createdAt;

  const thumbRaw = ensureRenderableImage(a);
  const thumb = toCloudinaryOptimized(thumbRaw, compact ? 300 : 360);

  const cardS = compact ? { ...cardStyle, padding: 8 } : cardStyle;
  const titleS = compact ? { ...titleStyle, fontSize: 16, lineHeight: 1.2 } : titleStyle;
  const metaS = compact ? { ...metaRow, marginTop: 6 } : metaRow;

  const rowS = compact
    ? {
        display: "grid",
        gridTemplateColumns: thumb ? "1fr 96px" : "1fr",
        gap: 6,
        alignItems: "center",
      }
    : rowLayout(!!thumb);

  const thumbS = compact
    ? { ...thumbStyle, width: 96, height: 64 }
    : thumbStyle;

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

export default function CategoryPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { pathname, search } = location;
  const pagePath = normPath(pathname);

  // ✅ Pagination removed: always use one request, big limit
  const page = 1;
  const limit = 500;

  const [category, setCategory] = useState(null);
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [pageSections, setPageSections] = useState([]);
  const [planSections, setPlanSections] = useState([]);
  const [railsLoading, setRailsLoading] = useState(false);
  const [railsError, setRailsError] = useState("");

  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia("(max-width: 720px)").matches : false
  );

  const [isNarrow, setIsNarrow] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia("(max-width: 1200px)").matches : false
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mqMobile = window.matchMedia("(max-width: 720px)");
    const mqNarrow = window.matchMedia("(max-width: 1200px)");

    const onMobile = (e) => setIsMobile(e.matches);
    const onNarrow = (e) => setIsNarrow(e.matches);

    mqMobile.addEventListener?.("change", onMobile);
    mqMobile.addListener?.(onMobile);

    mqNarrow.addEventListener?.("change", onNarrow);
    mqNarrow.addListener?.(onNarrow);

    return () => {
      mqMobile.removeEventListener?.("change", onMobile);
      mqMobile.removeListener?.(onMobile);

      mqNarrow.removeEventListener?.("change", onNarrow);
      mqNarrow.removeListener?.(onNarrow);
    };
  }, []);

  const normalizedSlug = useMemo(() => toSlug(slug), [slug]);

  const canonical = useMemo(() => {
    const origin = typeof window !== "undefined" ? window.location.origin : "https://timelyvoice.com";
    return `${origin}/category/${encodeURIComponent(normalizedSlug)}`;
  }, [normalizedSlug]);

  const categoryCopy = useMemo(() => getCategoryCopy(normalizedSlug, category), [normalizedSlug, category]);

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

  /* fetch category + articles (cached where safe) */
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
          if (newSlug) navigate({ pathname: `/category/${newSlug}`, search }, { replace: true });
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
          {
            params: { category: effectiveSlug, page, limit },
            validateStatus: () => true,
          },
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

    if (slug) {
      upsertTag("link", {
        rel: "alternate",
        type: "application/rss+xml",
        title: `Timely Voice — ${category?.name || slug}`,
        href: `${window.location.origin}/rss/${encodeURIComponent(normalizedSlug)}.xml`,
      });
    }

    try {
      const { displayName } = categoryCopy;

      const coll = {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: metaTitle,
        description: metaDescription,
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
    insets.sort((a, b) => a.__after - b.__after || (a.placementIndex ?? 0) - (b.placementIndex ?? 0));
    return { topBlocks: tops, insetBlocks: insets };
  }, [mainBlocks]);

  /* plan sections cached */
  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        setRailsLoading(true);
        setRailsError("");

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
      } catch (e) {
        if (!cancel) {
          setRailsError("Failed to load rails");
          setPlanSections([]);
        }
        console.error(e);
      } finally {
        if (!cancel) setRailsLoading(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [slug]);

  const lead = articles?.[0] || null;
  const rest = Array.isArray(articles) && articles.length > 1 ? articles.slice(1) : [];

  const renderInsetAfter = (idx) => {
    const blocks = insetBlocks.filter((b) => b.__after === idx);
    if (!blocks.length) return null;
    return blocks.map((sec) => (
      <div key={sec._id || sec.id || sec.slug} style={{ margin: "12px 0" }}>
        <SectionRenderer section={sec} />
      </div>
    ));
  };

  // ✅ THIS is the key: shrink content width on desktop, keep mobile same
  const contentWrapStyle = useMemo(() => {
    return {
      width: "100%",
      maxWidth: isMobile ? 1200 : DESKTOP_CONTENT_MAX,
      padding: isMobile ? "0 12px" : "0 12px",
    };
  }, [isMobile]);

  // ✅ Also shrink the head blocks wrapper to match the content width (desktop)
  const headWrapStyle = useMemo(() => {
    return {
      width: "100%",
      maxWidth: isMobile ? 1200 : DESKTOP_CONTENT_MAX,
      padding: "0 12px",
      marginBottom: 12,
    };
  }, [isMobile]);

  return (
    <>
      <SiteNav />

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
                      <Link to="/top-news">Top News</Link> or <Link to="/world">World</Link> while you wait.
                    </p>
                  </>
                ) : (
                  <>
                    <LeadCard a={lead} />

                    <div style={listStyle}>
                      {rest.map((a, idx) => (
                        <div key={a._id || a.id || a.slug || idx}>
                          {/* ✅ compact ONLY on laptop/desktop */}
                          <ArticleRow a={a} compact={!isMobile} />
                          {renderInsetAfter(idx + 1)}
                        </div>
                      ))}
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
