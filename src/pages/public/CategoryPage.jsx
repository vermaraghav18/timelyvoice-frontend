// frontend/src/pages/public/CategoryPage.jsx
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams, useNavigate, useLocation } from 'react-router-dom';

// ✅ single, correctly-cased import from app.jsx (no duplicates)
import {
  api,
  removeManagedHeadTags,
  upsertTag,
  setJsonLd,
  buildCanonicalFromLocation,
} from '../../App.jsx';

import SiteNav from '../../components/SiteNav.jsx';
import SiteFooter from '../../components/SiteFooter.jsx';
import SectionRenderer from '../../components/sections/SectionRenderer.jsx';
import '../../styles/rails.css';

// ✅ correct extension to avoid resolver duplicates
import { ensureRenderableImage } from '../../lib/images.js';

/* ---------- Brand constant ---------- */
const BRAND_NAME = 'The Timely Voice';

/* ---------- Google AdSense: lightweight blocks ---------- */
const ADS_CLIENT = 'ca-pub-8472487092329023';
const ADS_SLOT_MAIN = '3149743917';
const ADS_SLOT_SECOND = '3149743917';
const ADS_SLOT_FLUID_KEY = '1442744724';
const ADS_SLOT_IN_ARTICLE = '9569163673';
const ADS_SLOT_AUTORELAXED = '2545424475';

function useAdsPush(deps = []) {
  useEffect(() => {
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

function AdSenseAuto({ slot, style }) {
  useAdsPush([slot]);
  return (
    <ins
      className="adsbygoogle"
      style={{ display: 'block', ...style }}
      data-ad-client={ADS_CLIENT}
      data-ad-slot={slot}
      data-ad-format="auto"
      data-full-width-responsive="true"
    ></ins>
  );
}
function AdSenseFluidKey({ style }) {
  useAdsPush([]);
  return (
    <ins
      className="adsbygoogle"
      style={{ display: 'block', ...style }}
      data-ad-format="fluid"
      data-ad-layout-key="-ge-1b-1q-el+13l"
      data-ad-client={ADS_CLIENT}
      data-ad-slot={ADS_SLOT_FLUID_KEY}
    ></ins>
  );
}
function AdSenseInArticle({ style }) {
  useAdsPush([]);
  return (
    <ins
      className="adsbygoogle"
      style={{ display: 'block', textAlign: 'center', ...style }}
      data-ad-layout="in-article"
      data-ad-format="fluid"
      data-ad-client={ADS_CLIENT}
      data-ad-slot={ADS_SLOT_IN_ARTICLE}
    ></ins>
  );
}
function AdSenseAutoRelaxed({ style }) {
  useAdsPush([]);
  return (
    <ins
      className="adsbygoogle"
      style={{ display: 'block', ...style }}
      data-ad-format="autorelaxed"
      data-ad-client={ADS_CLIENT}
      data-ad-slot={ADS_SLOT_AUTORELAXED}
    ></ins>
  );
}
/* ---------------------------------------------------------------- */

/* ---------- helper: relative time ---------- */
function timeAgo(input) {
  const d = input ? new Date(input) : null;
  if (!d || isNaN(d)) return '';
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} minute${m === 1 ? '' : 's'} ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hour${h === 1 ? '' : 's'} ago`;
  const dsy = Math.floor(h / 24);
  if (dsy < 30) return `${dsy} day${dsy === 1 ? '' : 's'} ago`;
  const mo = Math.floor(dsy / 30);
  if (mo < 12) return `${mo} month${mo === 1 ? '' : 's'} ago`;
  const y = Math.floor(mo / 12);
  return `${y} year${y === 1 ? '' : 's'} ago`;
}

const toSlug = (s = '') =>
  String(s)
    .toLowerCase()
    .trim()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

/* ---------- small utils ---------- */
const normPath = (p = '') => String(p).trim().replace(/\/+$/, '') || '/';
const asInt = (v, d) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : d;
};

/* ---------- timestamp normalization & sorting (LATEST FIRST) ---------- */
function parseTs(v) {
  if (!v) return 0;
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  const s = String(v).trim();
  if (/^\d+$/.test(s)) return Number(s);
  // "YYYY-MM-DD HH:mm:ss+05:30" -> "YYYY-MM-DDTHH:mm:ss+05:30"
  const withT = s.replace(
    /^(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2}:\d{2})/,
    '$1T$2'
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
      return a._idx - b._idx; // stable tiebreaker
    });
}

async function fetchArticlesWithRedirect(slug, page, limit, navigate) {
  const r = await api.get(
    `/public/categories/${encodeURIComponent(slug)}/articles`,
    {
      params: { page, limit },
      validateStatus: () => true,
    }
  );
  if (r?.status === 308 && r?.data?.redirectTo) {
    const url = new URL(r.data.redirectTo, window.location.origin);
    navigate(
      { pathname: url.pathname, search: url.search },
      { replace: true }
    );
    return null; // caller returns; rerender will refetch
  }
  return r;
}

/* ---------- Category intro + SEO copy helpers ---------- */

function humanizeSlug(slug = '') {
  return String(slug || '')
    .split('-')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

const CATEGORY_COPY_STATIC = {
  india: {
    metaTitle: `India News — ${BRAND_NAME}`,
    metaDescription:
      'Follow key developments in Indian politics, policy, economy and society. The Timely Voice explains complex events in simple, exam-friendly language with clear background context.',
    intro:
      'The India section of The Timely Voice tracks what is shaping the country today — from Parliament and state politics to economy, welfare schemes, foreign policy and social change. Each story is written in clear, neutral language so that students and serious readers can quickly connect the headline to the larger syllabus and real-world impact.',
  },
  world: {
    metaTitle: `World News & Geopolitics — ${BRAND_NAME}`,
    metaDescription:
      'Daily coverage of major global events, conflicts, summits and climate decisions. Built for UPSC and exam-focused readers who need clean, balanced world news explainers.',
    intro:
      'Our World section keeps you updated on the big international stories that matter for exams and for understanding geopolitics — wars and ceasefires, global summits, climate talks, trade disputes and diplomacy. Articles focus on why an event is happening, which countries are involved, and what it means for India and the wider world.',
  },
  business: {
    metaTitle: `Business & Economy News — ${BRAND_NAME}`,
    metaDescription:
      'Markets, RBI policy, trade deals and corporate moves explained in clear terms. Timely Voice Business focuses on economic trends that affect inflation, jobs and growth.',
    intro:
      'The Business section covers the Indian and global economy with a focus on how decisions on interest rates, trade deals, regulations and corporate announcements affect ordinary people. Stories highlight key numbers, long-term trends and exam-relevant concepts like GDP, inflation, fiscal policy and financial stability.',
  },
  finance: {
    metaTitle: `Finance & Markets — ${BRAND_NAME}`,
    metaDescription:
      'Track interest rates, stock markets, banking updates and policy moves that shape money flows in India and abroad, explained in simple language.',
    intro:
      'In Finance, The Timely Voice looks at how money moves through markets and banks — from RBI decisions and government borrowing to stock market volatility and global risk events. Articles aim to simplify technical terms so that even first-time readers can follow what is happening and why it matters.',
  },
  health: {
    metaTitle: `Health & Science News — ${BRAND_NAME}`,
    metaDescription:
      'Evidence-based coverage of medical research, public health alerts and lifestyle risks. Articles are written to help readers understand real-world impact, not create panic.',
    intro:
      'The Health section brings together important updates from medical research, public health agencies and major journals. We focus on how new findings relate to everyday life in India — from air pollution and lifestyle diseases to vaccines and hospital infrastructure — with clear explanations and no sensationalism.',
  },
  politics: {
    metaTitle: `Politics & Governance — ${BRAND_NAME}`,
    metaDescription:
      'Neutral, exam-focused coverage of elections, policy decisions, governance debates and constitutional issues from across India.',
    intro:
      'Politics at The Timely Voice follows elections, campaigns and policy decisions across India with a focus on governance and institutions rather than drama. Reports look at what parties promise, what is actually notified in law, and how these choices affect citizens, federalism and long-term development.',
  },
  history: {
    metaTitle: `Ancient History Timeline (4000–0 BC) — ${BRAND_NAME}`,
    metaDescription:
      'Explore a structured timeline of ancient civilizations from 4000 BC to 0 BC, with exam-ready articles on Mesopotamia, Egypt, India and more.',
    intro:
      'The History category is built as a continuous reading companion for learners who want to travel from 4000 BC to 0 BC in an organised way. Articles connect major kingdoms, wars, cultural shifts and trade routes across Mesopotamia, Egypt, India and the wider ancient world, so that dates and dynasties start making sense as one flowing story.',
  },
};

function getCategoryCopy(slug, category) {
  const key = String(slug || '').toLowerCase();
  const baseName =
    category?.name || humanizeSlug(key || 'News').trim() || 'News';

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

/* ---------- layout ---------- */
const TOP_GAP = 16;

const pageWrap = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'flex-start',
  paddingTop: 0,
  marginTop: TOP_GAP,
  marginBottom: 40,
  fontFamily: "'Newsreader', serif",
};

const gridWrap = {
  width: '100%',
  maxWidth: 1200,
  padding: '0 12px',
  display: 'grid',
  gridTemplateColumns: '260px 1fr 260px',
  gap: 16,
};

const singleColWrap = { width: '100%', maxWidth: 760, padding: '0 12px' };

const railCol = { minWidth: 0, position: 'relative' };
const mainCol = { minWidth: 0 };

const listStyle = { display: 'flex', flexDirection: 'column', gap: 8 };

const cardStyle = {
  background: 'linear-gradient(135deg, #001236 0%, #001e49ff 100%)',
  borderRadius: 1,
  border: '0px solid #e5e7eb',
  padding: 10,
  boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
};

const rowLayout = (hasThumb) => ({
  display: 'grid',
  gridTemplateColumns: hasThumb ? '1fr 110px' : '1fr',
  gap: 8,
  alignItems: 'center',
});

const titleStyle = {
  margin: 0,
  fontSize: 18,
  fontWeight: 500,
  lineHeight: 1.3,
  color: '#ffffffff',
  fontFamily: "'Merriweather Sans', sans-serif",
};
const metaRow = {
  marginTop: 14,
  fontSize: 12,
  color: '#6b7280',
  display: 'flex',
  gap: 4,
  alignItems: 'center',
  flexWrap: 'wrap',
};
const catLink = {
  color: '#1d4ed8',
  textDecoration: 'none',
  fontWeight: 600,
};
const thumbStyle = {
  width: 110,
  height: 75,
  objectFit: 'cover',
  borderRadius: 1,
  display: 'block',
};

/* ---------- Lead Card (first story) ---------- */
const leadCardWrap = {
  marginBottom: 14,
  background: '#001236ff',
  border: '0px solid #e5e7eb',
  borderRadius: 1,
  padding: 12,
  boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
};
const leadImg = {
  width: '100%',
  height: 320,
  objectFit: 'cover',
  borderRadius: 2,
  display: 'block',
  marginBottom: 10,
};
const leadH = {
  margin: '0 0 6px',
  fontSize: 21,
  lineHeight: 1.25,
  fontWeight: 600,
  color: '#ffffffff',
};
const leadMeta = {
  marginTop: 6,
  fontSize: 12,
  color: '#ee6affff',
  display: 'flex',
  gap: 6,
  alignItems: 'center',
  flexWrap: 'wrap',
};
const leadSummary = {
  fontSize: 18,
  color: '#b9b9b9ff',
  marginTop: 6,
  lineHeight: 1.6,
};

function LeadCard({ a }) {
  if (!a) return null;
  const articleUrl = `/article/${encodeURIComponent(a.slug)}`;
  const updated =
    a.updatedAt || a.publishedAt || a.publishAt || a.createdAt;
  const img = ensureRenderableImage(a);

  const summary =
    a.summary ||
    a.excerpt ||
    a.description ||
    a.seoDescription ||
    (typeof a.body === 'string'
      ? a.body.replace(/<[^>]*>/g, '').slice(0, 220)
      : '');

  return (
    <div style={leadCardWrap}>
      <Link
        to={articleUrl}
        style={{ textDecoration: 'none', color: 'inherit' }}
      >
        <h2 style={leadH}>{a.title}</h2>
      </Link>
      {img && (
        <Link to={articleUrl} style={{ display: 'block' }}>
          <img
            src={img}
            alt={a.imageAlt || a.title || ''}
            style={leadImg}
            loading="lazy"
          />
        </Link>
      )}
      {summary && (
        <Link
          to={articleUrl}
          style={{ textDecoration: 'none', color: 'inherit' }}
        >
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
  // backend sends category as canonical NAME string
  const raw =
    typeof a?.category === 'string'
      ? a.category
      : a?.category?.name ?? 'General';
  const map = {
    world: 'World',
    politics: 'Politics',
    business: 'Business',
    entertainment: 'Entertainment',
    general: 'General',
    health: 'Health',
    science: 'Science',
    sports: 'Sports',
    tech: 'Tech',
    technology: 'Tech',
    india: 'India',
  };
  return (
    map[String(raw || 'General').trim().toLowerCase()] || (raw || 'General')
  );
}

function ArticleRow({ a }) {
  const articleUrl = `/article/${encodeURIComponent(a.slug)}`;
  const categoryName = getCategoryName(a);
  const categoryUrl = `/category/${encodeURIComponent(
    toSlug(categoryName)
  )}`;
  const updated =
    a.updatedAt || a.publishedAt || a.publishAt || a.createdAt;
  const thumb = ensureRenderableImage(a);

  return (
    <div style={cardStyle}>
      <div style={rowLayout(!!thumb)}>
        <div style={{ minWidth: 0 }}>
          <Link
            to={articleUrl}
            style={{ textDecoration: 'none', color: 'inherit' }}
          >
            <h3 style={titleStyle}>{a.title}</h3>
          </Link>
          <div style={metaRow}>
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
              alt={a.imageAlt || a.title || ''}
              style={thumbStyle}
              loading="lazy"
            />
          </Link>
        )}
      </div>
    </div>
  );
}

/* ---------- helper: interleave rails after every N items (mobile) ---------- */
function interleaveAfterEveryN(items, inserts, n) {
  const out = [];
  let j = 0;
  for (let i = 0; i < items.length; i++) {
    out.push({ type: 'article', data: items[i] });
    if ((i + 1) % n === 0 && j < inserts.length)
      out.push({ type: 'rail', data: inserts[j++] });
  }
  while (j < inserts.length) out.push({ type: 'rail', data: inserts[j++] });
  return out;
}

/* ===================== JS bottom-pin helper ===================== */
function useBottomPin(containerRef, childRef, offset = 16) {
  const styleState = useRef({});
  const [style, setStyle] = useState({});

  useEffect(() => {
    function update() {
      const container = containerRef.current;
      const el = childRef.current;
      if (!container || !el) return;

      const cRect = container.getBoundingClientRect();

      // convert to document coordinates
      const scrollY = window.scrollY || window.pageYOffset;
      const scrollX = window.scrollX || window.pageXOffset;

      const cTop = cRect.top + scrollY;
      const cBottom = cRect.bottom + scrollY;
      const cLeft = cRect.left + scrollX;
      const cWidth = cRect.width;

      const eHeight = el.offsetHeight;

      const viewportBottom = scrollY + window.innerHeight - offset;
      const elBottomNatural = cTop + eHeight;

      let nextStyle;

      if (viewportBottom <= elBottomNatural) {
        nextStyle = {
          position: 'static',
          left: 'auto',
          width: 'auto',
        };
      } else if (
        viewportBottom > elBottomNatural &&
        viewportBottom < cBottom
      ) {
        nextStyle = {
          position: 'fixed',
          left: `${cLeft}px`,
          bottom: `${offset}px`,
          width: `${cWidth}px`,
          zIndex: 1,
        };
      } else {
        nextStyle = {
          position: 'absolute',
          left: 0,
          bottom: 0,
          width: '100%',
        };
      }

      const prev = styleState.current;
      const changed =
        Object.keys(nextStyle).length !==
          Object.keys(prev || {}).length ||
        Object.keys(nextStyle).some(
          (k) => String(nextStyle[k]) !== String(prev[k])
        );
      if (changed) {
        styleState.current = nextStyle;
        setStyle(nextStyle);
      }
    }

    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [containerRef, childRef, offset]);

  return style;
}
/* ================================================================= */

/* ---------- Category Page ---------- */
export default function CategoryPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { pathname, search } = location;
  const pagePath = normPath(pathname);

  // pagination from querystring
  const searchParams = useMemo(
    () => new URLSearchParams(search),
    [search]
  );
  const page = asInt(searchParams.get('page'), 1);
  const limit = asInt(searchParams.get('limit'), 20); // default 20, backend allows up to 50

  const [category, setCategory] = useState(null);
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // page-scoped sections (for head_* blocks)
  const [pageSections, setPageSections] = useState([]);

  // category plan (rails + ALL other sections)
  const [planSections, setPlanSections] = useState([]);
  const [railsLoading, setRailsLoading] = useState(false);
  const [railsError, setRailsError] = useState('');

  const [isMobile, setIsMobile] = useState(
    () =>
      typeof window !== 'undefined'
        ? window.matchMedia('(max-width: 720px)').matches
        : false
  );
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(max-width: 720px)');
    const onChange = (e) => setIsMobile(e.matches);
    mq.addEventListener?.('change', onChange);
    mq.addListener?.(onChange);
    return () => {
      mq.removeEventListener?.('change', onChange);
      mq.removeListener?.(onChange);
    };
  }, []);

  const normalizedSlug = useMemo(() => toSlug(slug), [slug]);
  const canonical = useMemo(
    () =>
      buildCanonicalFromLocation([
        'category',
        String(slug || '').toLowerCase(),
      ]),
    [slug]
  );

  const categoryCopy = useMemo(
    () => getCategoryCopy(normalizedSlug, category),
    [normalizedSlug, category]
  );

  // Optional: client-side normalize the visible path in dev
  useEffect(() => {
    const want = `/category/${normalizedSlug}`;
    if (pathname !== want) {
      // mirror the server’s 301 canonicalization
      navigate({ pathname: want, search }, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [normalizedSlug]);

  function extractCanonicalSlugFromRedirect(res) {
    const p = res?.data?.redirectTo || '';
    // matches: /categories/<slug>  OR  /public/categories/<slug>/articles
    const m = String(p).match(
      /\/(?:public\/)?categories\/([^/]+)/i
    );
    return m ? m[1] : null;
  }

  /* fetch category + articles (slug-based, newest first) */
  useEffect(() => {
    let alive = true;
    setLoading(true);
    setNotFound(false);

    (async () => {
      try {
        // 1) Resolve category meta for the incoming slug
        let cRes = await api.get(
          `/categories/slug/${encodeURIComponent(normalizedSlug)}`,
          { validateStatus: () => true }
        );

        // If backend says 308, extract slug & navigate to FE route (NOT /api/…)
        if (cRes?.status === 308) {
          const newSlug = extractCanonicalSlugFromRedirect(cRes);
          if (newSlug) {
            navigate(
              { pathname: `/category/${newSlug}`, search },
              { replace: true }
            );
          }
          return;
        }

        if (!alive) return;

        // Determine the effective slug to fetch with (prefer canonical from category doc)
        let effectiveSlug = normalizedSlug;
        if (cRes?.status === 200 && cRes?.data?.slug) {
          setCategory(cRes.data);
          effectiveSlug = cRes.data.slug;
        } else if (cRes?.status === 404) {
          setCategory(null);
          setNotFound(true);
          setArticles([]);
          return;
        } else {
          setCategory(null);
        }

        // 2) Fetch the articles using the effective (canonical) slug
        let aRes = await api.get(
          `/public/categories/${encodeURIComponent(
            effectiveSlug
          )}/articles`,
          { params: { page, limit }, validateStatus: () => true }
        );

        // If backend says 308 here, also map to FE route
        if (aRes?.status === 308) {
          const newSlug = extractCanonicalSlugFromRedirect(aRes);
          if (newSlug) {
            navigate(
              { pathname: `/category/${newSlug}`, search },
              { replace: true }
            );
          }
          return;
        }

        if (!alive) return;

        if (aRes?.status === 200 && Array.isArray(aRes.data?.items)) {
          const sorted = normalizeArticlesLatestFirst(aRes.data.items);
          setArticles(sorted);
        } else if (aRes?.status === 404) {
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
  }, [slug, page, limit, navigate, normalizedSlug, search]);

   /* SEO */
  /* SEO */
useEffect(() => {
  removeManagedHeadTags();

  const title = category
    ? `${category.name} — NewsSite`
    : `Category — NewsSite`;

  const desc = (
    category?.description ||
    `Latest ${category?.name || ''} stories on NewsSite`
  ).trim();

  // <title>
  upsertTag('title', {}, { textContent: title });

  // description
  upsertTag('meta', {
    name: 'description',
    content: desc || 'Browse category on NewsSite',
  });

  // canonical
  upsertTag('link', {
    rel: 'canonical',
    href: canonical,
  });

  // ✅ robots: first wipe all, then set index,follow
  upsertTag('meta', { name: 'robots' }, { remove: true });
  upsertTag('meta', {
    name: 'robots',
    content: 'index,follow',
    'data-managed': 'robots',
  });

  // RSS <link rel="alternate">
  if (slug) {
    upsertTag('link', {
      rel: 'alternate',
      type: 'application/rss+xml',
      title: `Timely Voice — ${category?.name || slug}`,
      href: `${window.location.origin}/rss/${encodeURIComponent(
        normalizedSlug
      )}.xml`,
    });
  }


    // JSON-LD: CollectionPage + Breadcrumb
    try {
      const coll = {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: category
          ? `${category.name} — NewsSite`
          : 'Category — NewsSite',
        description: (
          category?.description ||
          `Latest ${category?.name || ''} stories on NewsSite`
        ).trim(),
        url: canonical,
      };

      const breadcrumb = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'Home',
            item: `${window.location.origin}/`,
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: category?.name || slug,
            item: canonical,
          },
        ],
      };

      setJsonLd({
        '@context': 'https://schema.org',
        '@graph': [coll, breadcrumb],
      });
    } catch {}
  }, [category, canonical, slug, normalizedSlug]);


  /* fetch sections for THIS page path (head_*) */
  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const res = await api.get('/sections', {
          params: { path: pagePath },
        });
        const items = Array.isArray(res.data) ? res.data : [];
        const filtered = items.filter(
          (s) =>
            s?.enabled !== false &&
            s?.target?.type === 'path' &&
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
          (a, b) =>
            (a.placementIndex ?? 0) - (b.placementIndex ?? 0)
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

  // ====== PLAN sections (category-scoped) ======
  const headBlocks = pageSections.filter((s) =>
    s.template?.startsWith('head_')
  );

  const rails = useMemo(() => {
    return (planSections || [])
      .filter(
        (s) => s?.template?.startsWith('rail_') && s?.enabled !== false
      )
      .sort(
        (a, b) =>
          (a.placementIndex ?? 0) - (b.placementIndex ?? 0)
      );
  }, [planSections]);

  const leftRails = rails.filter(
    (s) => (s.side || 'right') === 'left'
  );
  const rightRails = rails.filter(
    (s) => (s.side || 'right') === 'right'
  );

  const mainBlocks = useMemo(() => {
    return (planSections || [])
      .filter(
        (s) =>
          s?.enabled !== false &&
          !String(s?.template || '').startsWith('rail_') &&
          !String(s?.template || '').startsWith('head_')
      )
      .sort(
        (a, b) =>
          (a.placementIndex ?? 0) - (b.placementIndex ?? 0)
      );
  }, [planSections]);

  const { topBlocks, insetBlocks } = useMemo(() => {
    const tops = [];
    const insets = [];
    for (const s of mainBlocks) {
      const nRaw = s?.custom?.afterNth;
      const n =
        nRaw === '' || nRaw == null ? null : Number(nRaw);
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

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        setRailsLoading(true);
        setRailsError('');
        const res = await api.get('/sections/plan', {
          params: {
            sectionType: 'category',
            sectionValue: String(slug || '').toLowerCase(),
          },
        });

        const rows = Array.isArray(res.data) ? res.data : [];
        if (!cancel) setPlanSections(rows);
      } catch (e) {
        if (!cancel) {
          setRailsError('Failed to load rails');
          setPlanSections([]);
        }
        // eslint-disable-next-line no-console
        console.error(e);
      } finally {
        if (!cancel) setRailsLoading(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [slug]);

  // ✅ use the sorted array directly
  const lead = articles?.[0] || null;
  const rest =
    Array.isArray(articles) && articles.length > 1
      ? articles.slice(1)
      : [];
  const hasAnyRails =
    leftRails.length > 0 || rightRails.length > 0;

  const [isMobileState, setIsMobileState] = useState(false); // to trigger infeed recompute on first paint
  useEffect(() => {
    setIsMobileState(isMobile);
  }, [isMobile]);

  const infeed = useMemo(() => {
    if (!isMobile) return null;
    return interleaveAfterEveryN(rest, rails, 8);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMobileState, rest, rails]);

  const isWorldCategory =
    String(slug || '').toLowerCase() === 'world';

  // Ad positions (1-based)
  const AD_POSITIONS_DESKTOP = [6, 9, 13, 17]; // kept in case you want to tweak later
  const AD_POSITIONS_MOBILE = [7, 11, 15, 19];

  const renderInsetAfter = (idx) => {
    const blocks = insetBlocks.filter((b) => b.__after === idx);
    if (!blocks.length) return null;
    return blocks.map((sec) => (
      <div
        key={sec._id || sec.id || sec.slug}
        style={{ margin: '12px 0' }}
      >
        <SectionRenderer section={sec} />
      </div>
    ));
  };

  /* ---------- Refs + bottom pin styles ---------- */
  const gridRef = useRef(null);
  const leftAsideRef = useRef(null);
  const rightAsideRef = useRef(null);
  const leftRailRef = useRef(null);
  const rightRailRef = useRef(null);

  const BOTTOM_OFFSET = 16;
  const leftRailStyle = useBottomPin(
    leftAsideRef,
    leftRailRef,
    BOTTOM_OFFSET
  );
  const rightRailStyle = useBottomPin(
    rightAsideRef,
    rightRailRef,
    BOTTOM_OFFSET
  );

  // ---------- simple pagination controls ----------
  const gotoPage = (p) => {
    const params = new URLSearchParams(search);
    if (p <= 1) params.delete('page');
    else params.set('page', String(p));
    params.set('limit', String(limit || 20));
    navigate(
      { pathname, search: `?${params.toString()}` },
      { replace: false }
    );
  };

  const renderCategoryIntro = () =>
    categoryCopy.intro && (
      <p
        style={{
          margin: '4px 0 12px',
          fontSize: 15,
          lineHeight: 1.7,
          color: '#cbd5ff',
          maxWidth: '70ch',
        }}
      >
        {categoryCopy.intro}
      </p>
    );

  return (
    <>
      <SiteNav />

      <div style={pageWrap}>
        {headBlocks.map((sec) => (
          <div
            key={sec._id || sec.id || sec.slug}
            style={{
              width: '100%',
              maxWidth: 1200,
              padding: '0 12px',
              marginBottom: 12,
            }}
          >
            <SectionRenderer section={sec} />
          </div>
        ))}

        {/* DESKTOP/TABLET 3-col layout with side rails */}
        {!isMobile && hasAnyRails ? (
          <div style={gridWrap} ref={gridRef}>
            {/* LEFT RAIL */}
            <aside style={railCol} ref={leftAsideRef}>
              {railsLoading && (
                <div style={{ padding: 8 }}>Loading rails…</div>
              )}
              {!railsLoading && railsError && (
                <div style={{ padding: 8, color: 'crimson' }}>
                  {railsError}
                </div>
              )}
              {!railsLoading && !railsError && (
                <div ref={leftRailRef} style={leftRailStyle}>
                  {leftRails.map((sec, i) => (
                    <div
                      key={
                        sec._id || sec.id || sec.slug || i
                      }
                      style={{ marginTop: i === 0 ? 0 : 12 }}
                    >
                      <SectionRenderer section={sec} />
                    </div>
                  ))}
                </div>
              )}
            </aside>

            {/* MAIN COLUMN */}
            <main style={mainCol}>
              {loading && <p>Loading…</p>}

              {!loading && notFound && (
                <>
                  <h2>Category not found</h2>
                  <p>
                    Try another category or go back to the{' '}
                    <Link to="/">home page</Link>.
                  </p>
                </>
              )}

              {!loading && !notFound && (
                <>
                  {topBlocks.map((sec) => (
                    <div
                      key={sec._id || sec.id || sec.slug}
                      style={{ marginBottom: 12 }}
                    >
                      <SectionRenderer section={sec} />
                    </div>
                  ))}

                  {/* Intro paragraph visible on desktop too */}
                  {renderCategoryIntro()}

                  {(!articles || articles.length === 0) ? (
                    <p style={{ textAlign: 'center' }}>
                      No articles yet.
                    </p>
                  ) : (
                    <>
                      <LeadCard a={lead} />

                      <div style={listStyle}>
                        {rest.map((a, idx) => {
                          const pos = idx + 1; // 1-based
                          return (
                            <div
                              key={
                                a._id ||
                                a.id ||
                                a.slug ||
                                idx
                              }
                            >
                              <ArticleRow a={a} />
                              {renderInsetAfter(pos)}

                              {/* Delay ads until after useful content */}
                              {isWorldCategory &&
                                [6, 9, 13, 17].includes(pos) && (
                                  <>
                                    {pos === 6 && (
                                      <div
                                        style={{
                                          margin:
                                            '12px 0',
                                          textAlign:
                                            'center',
                                        }}
                                      >
                                        <AdSenseAuto
                                          slot={
                                            ADS_SLOT_MAIN
                                          }
                                        />
                                      </div>
                                    )}
                                    {pos === 9 && (
                                      <div
                                        style={{
                                          margin:
                                            '12px 0',
                                        }}
                                      >
                                        <AdSenseInArticle />
                                      </div>
                                    )}
                                    {pos === 13 && (
                                      <div
                                        style={{
                                          margin:
                                            '12px 0',
                                        }}
                                      >
                                        <AdSenseFluidKey />
                                      </div>
                                    )}
                                    {pos === 17 && (
                                      <div
                                        style={{
                                          margin:
                                            '12px 0',
                                          textAlign:
                                            'center',
                                        }}
                                      >
                                        <AdSenseAuto
                                          slot={
                                            ADS_SLOT_SECOND
                                          }
                                        />
                                      </div>
                                    )}
                                  </>
                                )}
                            </div>
                          );
                        })}
                      </div>

                      {/* simple pagination (Prev/Next) */}
                      <div
                        style={{
                          display: 'flex',
                          gap: 8,
                          justifyContent: 'center',
                          marginTop: 16,
                        }}
                      >
                        {page > 1 && (
                          <button
                            onClick={() =>
                              gotoPage(page - 1)
                            }
                            style={{
                              padding: '6px 10px',
                            }}
                          >
                            ← Newer
                          </button>
                        )}
                        {rest.length +
                          (lead ? 1 : 0) >=
                          limit && (
                          <button
                            onClick={() =>
                              gotoPage(page + 1)
                            }
                            style={{
                              padding: '6px 10px',
                            }}
                          >
                            Older →
                          </button>
                        )}
                      </div>

                      {isWorldCategory && (
                        <div style={{ margin: '16px 0' }}>
                          <AdSenseAutoRelaxed />
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
            </main>

            {/* RIGHT RAIL */}
            <aside style={railCol} ref={rightAsideRef}>
              {railsLoading && (
                <div style={{ padding: 8 }}>Loading rails…</div>
              )}
              {!railsLoading && railsError && (
                <div style={{ padding: 8, color: 'crimson' }}>
                  {railsError}
                </div>
              )}
              {!railsLoading && !railsError && (
                <div ref={rightRailRef} style={rightRailStyle}>
                  {rightRails.map((sec, i) => (
                    <div
                      key={
                        sec._id || sec.id || sec.slug || i
                      }
                      style={{ marginTop: i === 0 ? 0 : 12 }}
                    >
                      <SectionRenderer section={sec} />
                    </div>
                  ))}
                </div>
              )}
            </aside>
          </div>
        ) : (
          // SINGLE COLUMN (mobile or no rails)
          <div style={singleColWrap}>
            {loading && <p>Loading…</p>}

            {!loading && notFound && (
              <>
                <h2>Category not found</h2>
                <p>
                  Try another category or go back to the{' '}
                  <Link to="/">home page</Link>.
                </p>
              </>
            )}

            {!loading && !notFound && (
              <>
                {topBlocks.map((sec) => (
                  <div
                    key={sec._id || sec.id || sec.slug}
                    style={{ marginBottom: 12 }}
                  >
                    <SectionRenderer section={sec} />
                  </div>
                ))}

                {/* Category intro (mobile + desktop single-column) */}
                {renderCategoryIntro()}

                {(!articles || articles.length === 0) ? (
                  <p style={{ textAlign: 'center' }}>
                    No articles yet.
                  </p>
                ) : (
                  <>
                    <LeadCard a={lead} />

                    {isMobile ? (
                      <div style={listStyle}>
                        {(infeed || []).map((block, idx) =>
                          block.type === 'article' ? (
                            <div
                              key={
                                (block.data._id ||
                                  block.data.id ||
                                  block.data.slug ||
                                  idx) + '-a'
                              }
                            >
                              <ArticleRow a={block.data} />
                              {renderInsetAfter(idx + 1)}

                              {isWorldCategory &&
                                [7, 11, 15, 19].includes(
                                  idx + 1
                                ) && (
                                  <>
                                    {idx + 1 === 7 && (
                                      <div
                                        style={{
                                          margin:
                                            '12px 0',
                                          textAlign:
                                            'center',
                                        }}
                                      >
                                        <AdSenseAuto
                                          slot={
                                            ADS_SLOT_MAIN
                                          }
                                        />
                                      </div>
                                    )}
                                    {idx + 1 === 11 && (
                                      <div
                                        style={{
                                          margin:
                                            '12px 0',
                                        }}
                                      >
                                        <AdSenseInArticle />
                                      </div>
                                    )}
                                    {idx + 1 === 15 && (
                                      <div
                                        style={{
                                          margin:
                                            '12px 0',
                                        }}
                                      >
                                        <AdSenseFluidKey />
                                      </div>
                                    )}
                                    {idx + 1 === 19 && (
                                      <div
                                        style={{
                                          margin:
                                            '12px 0',
                                          textAlign:
                                            'center',
                                        }}
                                      >
                                        <AdSenseAuto
                                          slot={
                                            ADS_SLOT_SECOND
                                          }
                                        />
                                      </div>
                                    )}
                                  </>
                                )}
                            </div>
                          ) : (
                            <div
                              key={
                                (block.data._id ||
                                  block.data.id ||
                                  block.data.slug ||
                                  idx) + '-r'
                              }
                              style={{ margin: '4px 0' }}
                            >
                              <SectionRenderer
                                section={block.data}
                              />
                            </div>
                          )
                        )}
                      </div>
                    ) : (
                      <div style={listStyle}>
                        {rest.map((a, idx) => {
                          const pos = idx + 1;
                          return (
                            <div
                              key={
                                a._id ||
                                a.id ||
                                a.slug ||
                                idx
                              }
                            >
                              <ArticleRow a={a} />
                              {renderInsetAfter(pos)}

                              {isWorldCategory &&
                                [6, 9, 13, 17].includes(pos) && (
                                  <>
                                    {pos === 6 && (
                                      <div
                                        style={{
                                          margin:
                                            '12px 0',
                                          textAlign:
                                            'center',
                                        }}
                                      >
                                        <AdSenseAuto
                                          slot={
                                            ADS_SLOT_MAIN
                                          }
                                        />
                                      </div>
                                    )}
                                    {pos === 9 && (
                                      <div
                                        style={{
                                          margin:
                                            '12px 0',
                                        }}
                                      >
                                        <AdSenseInArticle />
                                      </div>
                                    )}
                                    {pos === 13 && (
                                      <div
                                        style={{
                                          margin:
                                            '12px 0',
                                        }}
                                      >
                                        <AdSenseFluidKey />
                                      </div>
                                    )}
                                    {pos === 17 && (
                                      <div
                                        style={{
                                          margin:
                                            '12px 0',
                                          textAlign:
                                            'center',
                                        }}
                                      >
                                        <AdSenseAuto
                                          slot={
                                            ADS_SLOT_SECOND
                                          }
                                        />
                                      </div>
                                    )}
                                  </>
                                )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* simple pagination (Prev/Next) */}
                    <div
                      style={{
                        display: 'flex',
                        gap: 8,
                        justifyContent: 'center',
                        marginTop: 16,
                      }}
                    >
                      {page > 1 && (
                        <button
                          onClick={() =>
                            gotoPage(page - 1)
                          }
                          style={{ padding: '6px 10px' }}
                        >
                          ← Newer
                        </button>
                      )}
                      {rest.length +
                        (lead ? 1 : 0) >=
                        limit && (
                        <button
                          onClick={() =>
                            gotoPage(page + 1)
                          }
                          style={{ padding: '6px 10px' }}
                        >
                          Older →
                        </button>
                      )}
                    </div>

                    {isWorldCategory && (
                      <div style={{ margin: '16px 0' }}>
                        <AdSenseAutoRelaxed />
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        )}
      </div>

      <SiteFooter />
    </>
  );
}
