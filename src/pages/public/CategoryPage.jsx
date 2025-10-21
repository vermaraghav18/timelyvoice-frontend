// src/pages/public/CategoryPage.jsx
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useNavigate, useLocation } from 'react-router-dom';
import { api, removeManagedHeadTags, upsertTag } from '../../App.jsx';
import SiteNav from '../../components/SiteNav.jsx';
import SiteFooter from '../../components/SiteFooter.jsx';

// Sections renderer
import SectionRenderer from '../../components/sections/SectionRenderer.jsx';
import '../../styles/rails.css';

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

const singleColWrap = {
  width: '100%',
  maxWidth: 760,
  padding: '0 12px',
};

const railCol = { minWidth: 0 };
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

const titleStyle = { margin: 0, fontSize: 18, fontWeight: 500, lineHeight: 1.3, color: '#ffffffff' ,fontFamily: "'Merriweather Sans', sans-serif",};
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

// increased image height
const leadImg = {
  width: '100%',
  height: 320, // was 240
  objectFit: 'cover',
  borderRadius: 2,
  display: 'block',
  marginBottom: 10,
};

const leadH = { margin: '0 0 6px', fontSize: 21, lineHeight: 1.25, fontWeight: 600, color: '#ffffffff' };
const leadMeta = { marginTop: 6, fontSize: 12, color: '#ee6affff', display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' };

// bigger summary + clickable
const leadSummary = { fontSize: 18, color: '#b9b9b9ff', marginTop: 6, lineHeight: 1.6 };

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
      {/* 1) Title */}
      <Link to={articleUrl} style={{ textDecoration: 'none', color: 'inherit' }}>
        <h2 style={leadH}>{a.title}</h2>
      </Link>

      {/* 2) Image */}
      {img && (
        <Link to={articleUrl} style={{ display: 'block' }}>
          <img src={img} alt={a.imageAlt || a.title || ''} style={leadImg} loading="lazy" />
        </Link>
      )}

      {/* 3) Summary — clickable */}
      {summary && (
        <Link to={articleUrl} style={{ textDecoration: 'none', color: 'inherit' }}>
          <p style={leadSummary}>{summary}</p>
        </Link>
      )}

      {/* Meta */}
      <div style={leadMeta}>
        <span>Updated {timeAgo(updated)}</span>
      </div>
    </div>
  );
}

/* ---------- Article Row (rest) ---------- */
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

/* ---------- helper: interleave rails after every N items (mobile) ---------- */
function interleaveAfterEveryN(items, inserts, n) {
  const out = [];
  let j = 0;
  for (let i = 0; i < items.length; i++) {
    out.push({ type: 'article', data: items[i] });
    if ((i + 1) % n === 0 && j < inserts.length) {
      out.push({ type: 'rail', data: inserts[j++] });
    }
  }
  while (j < inserts.length) {
    out.push({ type: 'rail', data: inserts[j++] });
  }
  return out;
}

/* ---------- Category Page ---------- */
export default function CategoryPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const pagePath = normPath(pathname);

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

  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(max-width: 720px)').matches : false
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

  const canonical = useMemo(() => `${window.location.origin}/category/${slug}`, [slug]);

  /* fetch category + articles */
  useEffect(() => {
    let alive = true;
    setLoading(true);
    setNotFound(false);

    Promise.all([
      api.get(`/api/categories/slug/${encodeURIComponent(slug)}`, { validateStatus: () => true }),
      api.get(`/api/articles`, {
        params: { category: slug, limit: 50 },
        validateStatus: () => true,
      }),
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

    if (slug) {
      upsertTag('link', {
        rel: 'alternate',
        type: 'application/rss+xml',
        title: `Timely Voice — ${category?.name || slug}`,
        href: `${window.location.origin}/rss/${encodeURIComponent(slug)}.xml`,
      });
    }
  }, [category, canonical, slug]);

  /* fetch sections for THIS page path (head_*) */
  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const res = await api.get('/api/sections', { params: { path: pagePath } });
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

  // ====== PLAN sections (category-scoped) ======

  // Head banners for this path (top-only)
  const headBlocks = pageSections.filter((s) => s.template?.startsWith('head_'));

  // Rails (left/right)
  const rails = useMemo(() => {
    return (planSections || [])
      .filter((s) => s?.template?.startsWith('rail_') && s?.enabled !== false)
      .sort((a, b) => (a.placementIndex ?? 0) - (b.placementIndex ?? 0));
  }, [planSections]);

  const leftRails = rails.filter((s) => (s.side || 'right') === 'left');
  const rightRails = rails.filter((s) => (s.side || 'right') === 'right');

  // All non-rail, non-head blocks from the plan
  const mainBlocks = useMemo(() => {
    return (planSections || [])
      .filter(
        (s) =>
          s?.enabled !== false &&
          !String(s?.template || '').startsWith('rail_') &&
          !String(s?.template || '').startsWith('head_')
      )
      .sort((a, b) => (a.placementIndex ?? 0) - (b.placementIndex ?? 0));
  }, [planSections]);

  // Split into top vs. inset (afterNth)
  const { topBlocks, insetBlocks } = useMemo(() => {
    const tops = [];
    const insets = [];
    for (const s of mainBlocks) {
      const nRaw = s?.custom?.afterNth;
      const n = nRaw === '' || nRaw == null ? null : Number(nRaw);
      if (!Number.isFinite(n) || n <= 0) tops.push(s); // blank or 0 -> top
      else insets.push({ ...s, __after: n });
    }
    // keep declared order for tops; for insets sort by afterNth then placementIndex
    insets.sort((a, b) => (a.__after - b.__after) || ((a.placementIndex ?? 0) - (b.placementIndex ?? 0)));
    return { topBlocks: tops, insetBlocks: insets };
  }, [mainBlocks]);

  // fetch the plan
  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        setRailsLoading(true);
        setRailsError('');
        const res = await api.get('/api/sections/plan', {
          params: { targetType: 'category', targetValue: String(slug || '').toLowerCase() },
        });
        const rows = Array.isArray(res.data) ? res.data : [];
        if (!cancel) setPlanSections(rows);
      } catch (e) {
        if (!cancel) {
          setRailsError('Failed to load rails');
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
  const hasAnyRails = leftRails.length > 0 || rightRails.length > 0;

  const LEFT_FIRST_PULLUP = 0;
  const RIGHT_FIRST_PULLUP = 0;

  const infeed = useMemo(() => {
    if (!isMobile) return null;
    return interleaveAfterEveryN(rest, rails, 8);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMobile, rest, rails]);

  const isWorldCategory = String(slug || '').toLowerCase() === 'world';

  // helper to render any inset blocks that should appear after index idx (1-based)
  const renderInsetAfter = (idx) => {
    const blocks = insetBlocks.filter((b) => b.__after === idx);
    if (!blocks.length) return null;
    return blocks.map((sec) => (
      <div key={sec._id || sec.id || sec.slug} style={{ margin: '12px 0' }}>
        <SectionRenderer section={sec} />
      </div>
    ));
  };

  return (
    <>
      <SiteNav />

      <div style={pageWrap}>
        {/* Full-width page head banners bound to this path */}
        {headBlocks.map((sec) => (
          <div
            key={sec._id || sec.id || sec.slug}
            style={{ width: '100%', maxWidth: 1200, padding: '0 12px', marginBottom: 12 }}
          >
            <SectionRenderer section={sec} />
          </div>
        ))}

        {/* DESKTOP/TABLET 3-col layout with side rails */}
        {!isMobile && hasAnyRails ? (
          <div style={gridWrap}>
            {/* LEFT RAIL */}
            <aside style={railCol}>
              {railsLoading && <div style={{ padding: 8 }}>Loading rails…</div>}
              {!railsLoading && railsError && <div style={{ padding: 8, color: 'crimson' }}>{railsError}</div>}
              {!railsLoading && !railsError &&
                leftRails.map((sec, i) => (
                  <div key={sec._id || sec.id || sec.slug || i} style={{ marginTop: i === 0 ? LEFT_FIRST_PULLUP : 12 }}>
                    <SectionRenderer section={sec} />
                  </div>
                ))
              }
            </aside>

            {/* MAIN COLUMN */}
            <main style={mainCol}>
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
                  {/* TOP non-rail blocks (no afterNth / afterNth=0) */}
                  {topBlocks.map((sec) => (
                    <div key={sec._id || sec.id || sec.slug} style={{ marginBottom: 12 }}>
                      <SectionRenderer section={sec} />
                    </div>
                  ))}

                  {/* Article list */}
                  {(!articles || articles.length === 0) ? (
                    <p style={{ textAlign: 'center' }}>No articles yet.</p>
                  ) : (
                    <>
                      <LeadCard a={lead} />

                      {/* Ads after the lead card (visible only on World) */}
                      {isWorldCategory && (
                        <>
                          <div style={{ margin: '12px 0', textAlign: 'center' }}>
                            <AdSenseAuto slot={ADS_SLOT_MAIN} />
                          </div>

                          <div style={{ margin: '12px 0' }}>
                            <AdSenseInArticle />
                          </div>
                        </>
                      )}

                      <div style={listStyle}>
                        {rest.map((a, idx) => (
                          <div key={a._id || a.id || a.slug || idx}>
                            <ArticleRow a={a} />

                            {/* 🔽 Insert any blocks whose custom.afterNth === idx+1 */}
                            {renderInsetAfter(idx + 1)}

                            {isWorldCategory && idx === 2 && (
                              <div style={{ margin: '12px 0' }}>
                                <AdSenseFluidKey />
                              </div>
                            )}

                            {isWorldCategory && idx === 4 && (
                              <div style={{ margin: '12px 0', textAlign: 'center' }}>
                                <AdSenseAuto slot={ADS_SLOT_SECOND} />
                              </div>
                            )}
                          </div>
                        ))}
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
            <aside style={railCol}>
              {railsLoading && <div style={{ padding: 8 }}>Loading rails…</div>}
              {!railsLoading && railsError && <div style={{ padding: 8, color: 'crimson' }}>{railsError}</div>}
              {!railsLoading && !railsError &&
                rightRails.map((sec, i) => (
                  <div key={sec._id || sec.id || sec.slug || i} style={{ marginTop: i === 0 ? RIGHT_FIRST_PULLUP : 12 }}>
                    <SectionRenderer section={sec} />
                  </div>
                ))
              }
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
                  Try another category or go back to the <Link to="/">home page</Link>.
                </p>
              </>
            )}

            {!loading && !notFound && (
              <>
                {/* TOP non-rail blocks */}
                {topBlocks.map((sec) => (
                  <div key={sec._id || sec.id || sec.slug} style={{ marginBottom: 12 }}>
                    <SectionRenderer section={sec} />
                  </div>
                ))}

                {(!articles || articles.length === 0) ? (
                  <p style={{ textAlign: 'center' }}>No articles yet.</p>
                ) : (
                  <>
                    <LeadCard a={lead} />

                    {/* Ads after the lead card (mobile/single-col) */}
                    {isWorldCategory && (
                      <>
                        <div style={{ margin: '12px 0', textAlign: 'center' }}>
                          <AdSenseAuto slot={ADS_SLOT_MAIN} />
                        </div>
                        <div style={{ margin: '12px 0' }}>
                          <AdSenseInArticle />
                        </div>
                      </>
                    )}

                    {/* If MOBILE: interleave rails after every 8; else: normal list */}
                    {isMobile ? (
                      <div style={listStyle}>
                        {(infeed || []).map((block, idx) =>
                          block.type === 'article' ? (
                            <div key={(block.data._id || block.data.id || block.data.slug || idx) + '-a'}>
                              <ArticleRow a={block.data} />

                              {/* inset after on mobile single-column too */}
                              {renderInsetAfter(idx + 1)}

                              {isWorldCategory && idx === 3 && (
                                <div style={{ margin: '12px 0' }}>
                                  <AdSenseFluidKey />
                                </div>
                              )}

                              {isWorldCategory && idx === 8 && (
                                <div style={{ margin: '12px 0', textAlign: 'center' }}>
                                  <AdSenseAuto slot={ADS_SLOT_SECOND} />
                                </div>
                              )}
                            </div>
                          ) : (
                            <div
                              key={(block.data._id || block.data.id || block.data.slug || idx) + '-r'}
                              style={{ margin: '4px 0' }}
                            >
                              <SectionRenderer section={block.data} />
                            </div>
                          )
                        )}
                      </div>
                    ) : (
                      <div style={listStyle}>
                        {rest.map((a, idx) => (
                          <div key={a._id || a.id || a.slug || idx}>
                            <ArticleRow a={a} />

                            {/* inset after for desktop single column */}
                            {renderInsetAfter(idx + 1)}

                            {isWorldCategory && idx === 2 && (
                              <div style={{ margin: '12px 0' }}>
                                <AdSenseFluidKey />
                              </div>
                            )}

                            {isWorldCategory && idx === 4 && (
                              <div style={{ margin: '12px 0', textAlign: 'center' }}>
                                <AdSenseAuto slot={ADS_SLOT_SECOND} />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* bottom: auto-relaxed */}
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
