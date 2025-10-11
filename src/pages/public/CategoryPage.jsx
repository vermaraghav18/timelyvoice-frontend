// src/pages/public/CategoryPage.jsx
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useNavigate, useLocation } from 'react-router-dom';
import { api, removeManagedHeadTags, upsertTag } from '../../App.jsx';
import SiteNav from '../../components/SiteNav.jsx';
import SiteFooter from '../../components/SiteFooter.jsx';

// reuse homepage rails (only for page-scoped head_* blocks; no sidebars)
import SectionRenderer from '../../components/sections/SectionRenderer.jsx';
import '../../styles/rails.css';

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
const normPath = (p = '') =>
  String(p).trim().replace(/\/+$/, '') || '/'; // remove trailing slash (except root)

/* ---------- layout (single column) ---------- */
const outerContainer = {
  display: 'flex',
  justifyContent: 'center',
  marginTop: 40,
  marginBottom: 40,
  fontFamily: "'Newsreader', serif",
  paddingTop: 5,
};
const mainWrapper = {
  width: '100%',
  maxWidth: 760,          // tighter single-column read
  padding: '0 12px',
};

const listStyle = { display: 'flex', flexDirection: 'column', gap: 8 };

const cardStyle = {
  background: '#001236ff',
  borderRadius: 1,
  border: '0px solid #e5e7eb',
  padding: 10,
  boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
};

// keep in sync with thumbnail width (110px)
const rowLayout = (hasThumb) => ({
  display: 'grid',
  gridTemplateColumns: hasThumb ? '1fr 110px' : '1fr',
  gap: 8,
  alignItems: 'center',
});

const titleStyle = { margin: 0, fontSize: 15, fontWeight: 400, lineHeight: 1.3, color: '#ffffffff' };
const metaRow = {
  marginTop: 14,
  fontSize: 12,
  color: '#6b7280',
  display: 'flex',
  gap: 4,
  alignItems: 'center',
  flexWrap: 'wrap',
};
const catLink = { color: '#1d4ed8', textDecoration: 'none', fontWeight: 600 };
const thumbStyle = { width: 110, height: 75, objectFit: 'cover', borderRadius: 1, display: 'block' };

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
  height: 240,
  objectFit: 'cover',
  borderRadius: 2,
  display: 'block',
  marginBottom: 10,
};
const leadH = { margin: '0 0 6px', fontSize: 21, lineHeight: 1.25, fontWeight: 600, color: '#ffffffff' };
const leadMeta = { marginTop: 6, fontSize: 12, color: '#ee6affff', display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' };
const leadSummary = { fontSize: 15, color: '#b9b9b9ff', marginTop: 4 };

function LeadCard({ a }) {
  if (!a) return null;
  const articleUrl = `/article/${encodeURIComponent(a.slug)}`;
  const updated = a.updatedAt || a.publishedAt || a.publishAt || a.createdAt;
  const img = a.heroUrl || a.ogImage || a.imageUrl || a.thumbUrl || null;
  const summary =
    a.summary ||
    a.excerpt ||
    a.description ||
    a.seoDescription ||
    (typeof a.body === 'string' ? a.body.replace(/<[^>]*>/g, '').slice(0, 220) : '');

  return (
    <div style={leadCardWrap}>
      {img && (
        <Link to={articleUrl}>
          <img src={img} alt={a.imageAlt || a.title || ''} style={leadImg} loading="lazy" />
        </Link>
      )}
      <Link to={articleUrl} style={{ textDecoration: 'none', color: 'inherit' }}>
        <h2 style={leadH}>{a.title}</h2>
      </Link>
      {summary && <p style={leadSummary}>{summary}</p>}
      <div style={leadMeta}>
        <span>Updated {timeAgo(updated)}</span>
      </div>
    </div>
  );
}

/* ---------- Article Row (rest of the list) ---------- */
function ArticleRow({ a }) {
  const articleUrl = `/article/${encodeURIComponent(a.slug)}`;
  const categoryName = a.category || 'General';
  const categoryUrl = `/category/${encodeURIComponent(toSlug(categoryName))}`;
  const updated = a.updatedAt || a.publishedAt || a.publishAt || a.createdAt;
  const thumb = a.thumbUrl || a.ogImage || a.imageUrl || null;

  return (
    <div style={cardStyle}>
      <div style={rowLayout(!!thumb)}>
        <div style={{ minWidth: 0 }}>
          <Link to={articleUrl} style={{ textDecoration: 'none', color: 'inherit' }}>
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
            <img src={thumb} alt={a.imageAlt || a.title || ''} style={thumbStyle} loading="lazy" />
          </Link>
        )}
      </div>
    </div>
  );
}

/* ---------- Category Page (single-column; no homepage rails) ---------- */
export default function CategoryPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { pathname } = useLocation(); // e.g. "/category/world"
  const pagePath = normPath(pathname);

  const [category, setCategory] = useState(null);
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // page-scoped sections (for /category/<slug>) — keep only if you want head_* blocks
  const [pageSections, setPageSections] = useState([]);

  const canonical = useMemo(() => `${window.location.origin}/category/${slug}`, [slug]);

  /* fetch category + articles */
  useEffect(() => {
    let alive = true;
    setLoading(true);
    setNotFound(false);

    Promise.all([
      api.get(`/api/categories/slug/${encodeURIComponent(slug)}`, { validateStatus: () => true }),
      api.get(`/api/articles?category=${encodeURIComponent(slug)}`, { validateStatus: () => true }),
    ])
      .then(([cRes, aRes]) => {
        if (!alive) return;

        if (cRes?.status === 308 && cRes?.data?.redirectTo) {
          navigate(cRes.data.redirectTo, { replace: true });
          return;
        }

        if (cRes.status === 200 && cRes.data) setCategory(cRes.data);
        else setNotFound(true);

        if (aRes.status === 200 && Array.isArray(aRes.data?.items)) setArticles(aRes.data.items);
        else setArticles([]);
      })
      .catch(() => {
        if (!alive) return;
        setNotFound(true);
        setArticles([]);
      })
      .finally(() => alive && setLoading(false));

    return () => {
      alive = false;
    };
  }, [slug, navigate]);

  /* SEO */
  useEffect(() => {
    removeManagedHeadTags();
    const title = category ? `${category.name} — NewsSite` : `Category — NewsSite`;
    const desc = category?.description || `Latest ${category?.name || ''} stories on NewsSite`.trim();
    upsertTag('title', {}, { textContent: title });
    upsertTag('meta', { name: 'description', content: desc || 'Browse category on NewsSite' });
    upsertTag('link', { rel: 'canonical', href: canonical });
  }, [category, canonical]);

  /* fetch sections for THIS page path (head_v1/head_v2 etc.) — optional */
  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const res = await api.get('/api/sections', { params: { path: pagePath } });
        const items = Array.isArray(res.data) ? res.data : [];

        // Strictly keep sections that belong to THIS path + are enabled
        const filtered = items.filter(
          (s) =>
            s?.enabled !== false &&
            s?.target?.type === 'path' &&
            normPath(s?.target?.value) === pagePath
        );

        // Dedupe by _id and sort by placementIndex (default 0)
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
      } catch (e) {
        if (!cancel) setPageSections([]);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [pagePath]);

  // only page “banner” blocks (e.g., head_v1/head_v2). No homepage rails.
  const headBlocks = pageSections.filter((s) => s.template?.startsWith('head_'));

  // split first article (lead) and the rest
  const lead = articles?.[0] || null;
  const rest = Array.isArray(articles) && articles.length > 1 ? articles.slice(1) : [];

  return (
    <>
      <SiteNav />
      <div style={outerContainer}>
        <div style={mainWrapper}>
          {/* MAIN COLUMN (single) */}
          {loading && <p>Loading…</p>}

          {!loading && notFound && (
            <>
              <h2>Category not found</h2>
              <p>
                Try another category or go back to the <Link to="/">home page</Link>.
              </p>
            </>
          )}

          {!loading && !notFound && (
            <>
              {/* page-scoped head sections (always on top, before the list) */}
              {headBlocks.map((sec) => (
                <div key={sec._id || sec.id || sec.slug} style={{ marginBottom: 12 }}>
                  <SectionRenderer section={sec} />
                </div>
              ))}

              {(!articles || articles.length === 0) ? (
                <p style={{ textAlign: 'center' }}>No articles yet.</p>
              ) : (
                <>
                  <LeadCard a={lead} />
                  <div style={listStyle}>
                    {rest.map((a) => (
                      <ArticleRow key={a._id || a.id || a.slug} a={a} />
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
      <SiteFooter />
    </>
  );
}
