// src/pages/public/FinanceCategoryPage.jsx
import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { api, removeManagedHeadTags, upsertTag } from '../../App.jsx';
import SiteNav from '../../components/SiteNav.jsx';
import SiteFooter from '../../components/SiteFooter.jsx';
// Reuse the same CSS as Top News so visuals match exactly
import '../public/TopNews.css';

// If you want to keep using SectionRenderer for path head banners or rails later, import it.
// (We’ll load path head_* banners just like before; rails are optional and off by default)
import SectionRenderer from '../../components/sections/SectionRenderer.jsx';

/* ---------- identical helpers ---------- */
const normPath = (p = '') => String(p).trim().replace(/\/+$/, '') || '/';
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

const CAT_COLORS = {
  World: 'linear-gradient(135deg, #3B82F6 0%, #0073ff 100%)',
  Politics: 'linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%)',
  Business: 'linear-gradient(135deg, #10B981 0%, #34D399 100%)',
  Entertainment: 'linear-gradient(135deg, #A855F7 0%, rgb(119, 0, 255))',
  General: 'linear-gradient(135deg, #6B7280 0%, #9CA3AF 100%)',
  Health: 'linear-gradient(135deg, #EF4444 0%, #F87171 100%)',
  Science: 'linear-gradient(135deg, #22D3EE 0%, #67E8F9 100%)',
  Sports: 'linear-gradient(135deg, #abcc16 0%, #9dff00 100%)',
  Tech: 'linear-gradient(135deg, #FB7185 0%, #FDA4AF 100%)',
};

function articleHref(slug) {
  if (!slug) return '#';
  if (/^https?:\/\//i.test(slug)) return slug;
  if (slug.startsWith('/article/')) return slug;
  if (slug.startsWith('/')) return `/article${slug}`;
  return `/article/${slug}`;
}

/* ---------- FINANCE/BUSINESS page (TopNews layout clone) ---------- */
export default function FinanceCategoryPage({
  categorySlug = 'finance',        // comes from App.jsx: 'finance' or 'Business'
  displayName = 'Finance',
}) {
  const { pathname } = useLocation();
  const pagePath = normPath(pathname);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  // Path head_* banners (you can add head banners targeted to /category/Business or /category/finance)
  const [pageSections, setPageSections] = useState([]);

  // Use actual URL for canonical so both /category/Business and /category/finance are correct
  const canonical = useMemo(
    () => (typeof window !== 'undefined' ? `${window.location.origin}${pathname}` : ''),
    [pathname]
  );

  // Basic SEO
  useEffect(() => {
    removeManagedHeadTags();
    upsertTag('title', {}, { textContent: `${displayName} — NewsSite` });
    upsertTag('meta', {
      name: 'description',
      content: `${displayName} headlines and latest stories — newest first.`,
    });
    if (canonical) upsertTag('link', { rel: 'canonical', href: canonical });
  }, [canonical, displayName]);

  // Load articles with slug tolerance: try raw, lower, TitleCase
  const toTitleCase = (x = '') => (x ? x.charAt(0).toUpperCase() + x.slice(1).toLowerCase() : x);
  useEffect(() => {
    let alive = true;

    async function fetchArticles() {
      setLoading(true);
      setErr('');
      setItems([]);

      const raw = String(categorySlug || '');
      const candidates = Array.from(new Set([raw, raw.toLowerCase(), toTitleCase(raw)]));

      try {
        for (const cat of candidates) {
          const res = await api.get('/articles', {
            params: { category: cat, limit: 60 },
            validateStatus: () => true,
          });
          const arr = Array.isArray(res?.data?.items) ? res.data.items : [];
          if (!alive) return;
          if (arr.length) {
            setItems(arr);
            break;
          }
        }
      } catch (e) {
        if (alive) setErr('Failed to load stories');
      } finally {
        if (alive) setLoading(false);
      }
    }

    fetchArticles();
    return () => {
      alive = false;
    };
  }, [categorySlug]);

  // Path-scoped head_* sections (optional, kept from your earlier version)
  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const res = await api.get('/sections', { params: { path: pagePath } });
        const items = Array.isArray(res.data) ? res.data : [];
        const filtered = items.filter(
          (s) => s?.enabled !== false && s?.target?.type === 'path' && normPath(s?.target?.value) === pagePath
        );
        filtered.sort((a, b) => (a.placementIndex ?? 0) - (b.placementIndex ?? 0));
        if (!cancel) setPageSections(filtered);
      } catch {
        if (!cancel) setPageSections([]);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [pagePath]);

  return (
    <>
      <SiteNav />

      <main className="container">
        {/* Optional: if you want a visible page title, bump .tn-title font-size in TopNews.css */}
        <h1 className="tn-title">{displayName}</h1>

        {/* Path head banners (if any) */}
        {pageSections.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            {pageSections.map((sec) => (
              <div key={sec._id || sec.id || sec.slug} style={{ marginBottom: 12 }}>
                <SectionRenderer section={sec} />
              </div>
            ))}
          </div>
        )}

        {loading && <div className="tn-status">Loading…</div>}
        {err && <div className="tn-error">{err}</div>}

        {!loading && !err && (
          <>
            {items.length === 0 ? (
              <div className="tn-status">No {displayName.toLowerCase()} stories yet.</div>
            ) : (
              <ul className="tn-list">
                {items.map((a) => {
                  const href = articleHref(a.slug);
                  const pillBg = CAT_COLORS[a.category] || '#4B5563';
                  const summary = a.summary || a.description || a.excerpt || '';

                  return (
                    <li className="tn-item" key={a._id || a.id || a.slug}>
                      <div className="tn-left">
                        <Link to={href} className="tn-item-title">
                          {a.title}
                        </Link>

                        {summary && (
                          <Link
                            to={href}
                            className="tn-summary"
                            style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}
                            aria-label={`Open: ${a.title}`}
                          >
                            {summary}
                          </Link>
                        )}

                        {/* Divider line */}
                        <div className="tn-divider" />

                        {/* Centered meta (source + time) */}
                        <div className="tn-meta">
                          <span className="tn-source">
                            The Timely Voice • Updated {timeAgo(a.updatedAt || a.publishedAt || a.publishAt || a.createdAt)}
                          </span>
                        </div>
                      </div>

                      <Link to={href} className="tn-thumb">
                        <span className="tn-badge">
                          <span className="tn-pill" style={{ background: pillBg }}>
                            {a.category || displayName}
                          </span>
                        </span>

                        {a.imageUrl ? (
                          <img src={a.imageUrl} alt={a.imageAlt || a.title || ''} loading="lazy" />
                        ) : (
                          <div className="tn-thumb ph" />
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}
      </main>

      <SiteFooter />
    </>
  );
}
