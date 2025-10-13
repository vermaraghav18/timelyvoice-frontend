// src/pages/public/Article.jsx
import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import {
  api,
  styles,
  removeManagedHeadTags,
  upsertTag,
  setJsonLd,
  buildDescriptionClient,
} from '../../App.jsx';
import SiteNav from '../../components/SiteNav.jsx';
import SiteFooter from '../../components/SiteFooter.jsx';
import CommentThread from '../../components/comments/CommentThread.jsx';
import CommentForm from '../../components/comments/CommentForm.jsx';
import ShareBar from '../../components/ShareBar.jsx';

import { track } from '../../lib/analytics';
import useReadComplete from '../../hooks/useReadComplete.js';

// reuse homepage rails
import SectionRenderer from '../../components/sections/SectionRenderer.jsx';
import '../../styles/rails.css';

/* ---------- helpers ---------- */
function estimateReadingTime(text = '', wpm = 200) {
  const plain = String(text).replace(/<[^>]*>/g, ' ');
  const words = plain.trim().split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.ceil(words / wpm));
  return { minutes, words };
}

/** Simple viewport hook: returns true when width < breakpoint */
function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth < breakpoint : false
  );
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < breakpoint);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [breakpoint]);
  return isMobile;
}
/* ----------------------------------- */

export default function ReaderArticle() {
  const { slug } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useIsMobile(768); // <— rails hidden below 768px

  const [article, setArticle] = useState(null);
  const [error, setError] = useState('');
  const [related, setRelated] = useState([]);
  const [reading, setReading] = useState({ minutes: 0, words: 0 });
  const [comments, setComments] = useState([]);

  // homepage rails plan
  const [homeSections, setHomeSections] = useState([]);
  const [railsLoading, setRailsLoading] = useState(true);
  const [railsError, setRailsError] = useState('');

  // Comments loader
  async function loadComments(articleSlug) {
    const { data } = await api.get(
      `/api/public/articles/${encodeURIComponent(articleSlug)}/comments`,
      { validateStatus: () => true }
    );
    setComments(Array.isArray(data) ? data : []);
  }

  const bodyRef = useRef(null);
  useReadComplete({ id: article?.id || article?._id, slug: article?.slug, title: article?.title });

  const canonical = useMemo(() => `${window.location.origin}/article/${slug}`, [slug]);

  /* ---------- fetch article ---------- */
  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setError('');

        const res = await api.get(`/api/articles/slug/${encodeURIComponent(slug)}`, {
          validateStatus: (s) => (s >= 200 && s < 300) || s === 308,
          headers: { 'Cache-Control': 'no-cache' },
        });
        if (!alive) return;

        if (res.status === 308 && res.data?.redirectTo) {
          navigate(res.data.redirectTo, { replace: true });
          return;
        }

        const doc = res.data;
        setArticle(doc);

        const bodyHtml = doc.bodyHtml || doc.body || '';
        const rt = estimateReadingTime(bodyHtml || doc.summary || '');
        setReading(rt);

        // ---- SEO
        removeManagedHeadTags();

        const title = (doc.metaTitle && doc.metaTitle.trim()) || doc.title || 'Article';
        const desc =
          (doc.metaDesc && doc.metaDesc.trim()) ||
          buildDescriptionClient({ bodyHtml, summary: doc.summary });

        upsertTag('title', {}, { textContent: `${title} — NewsSite` });
        upsertTag('meta', { name: 'description', content: String(desc).slice(0, 155) });
        upsertTag('link', { rel: 'canonical', href: canonical });

        // Open Graph / Twitter
        const ogImage = doc.ogImage || doc.coverImageUrl || doc.imageUrl || '';
        upsertTag('meta', { property: 'og:type', content: 'article' });
        upsertTag('meta', { property: 'og:title', content: title });
        upsertTag('meta', { property: 'og:description', content: String(desc).slice(0, 200) });
        upsertTag('meta', { property: 'og:url', content: canonical });
        if (ogImage) upsertTag('meta', { property: 'og:image', content: ogImage });

        upsertTag('meta', { name: 'twitter:card', content: ogImage ? 'summary_large_image' : 'summary' });
        upsertTag('meta', { name: 'twitter:title', content: title });
        upsertTag('meta', { name: 'twitter:description', content: String(desc).slice(0, 200) });
        if (ogImage) upsertTag('meta', { name: 'twitter:image', content: ogImage });

        // JSON-LD
        const categoryObj = doc.category || null;
 const categoryName = categoryObj?.name || categoryObj || 'General';
 const categorySlug = categoryObj?.slug || categoryName;

        const articleData = {
          '@type': 'NewsArticle',
          headline: doc.title,
          description: desc,
          image: ogImage ? [ogImage] : undefined,
          datePublished:
            new Date(doc.publishedAt || doc.publishAt || doc.createdAt || Date.now()).toISOString(),
          dateModified:
            new Date(
              doc.updatedAt || doc.publishedAt || doc.publishAt || doc.createdAt || Date.now()
            ).toISOString(),
          author: doc.author ? [{ '@type': 'Person', name: doc.author }] : undefined,
          articleSection: categoryName,
          mainEntityOfPage: { '@type': 'WebPage', '@id': canonical },
          url: canonical,
          wordCount: rt.words || undefined,
          timeRequired: `PT${Math.max(1, rt.minutes)}M`,
        };

        const breadcrumbItems = [
          { name: 'Home', url: `${window.location.origin}/` },
          ...(categoryName
            ? [{ name: categoryName, url: `${window.location.origin}/category/${encodeURIComponent(categorySlug)}` }]
            : []),
          { name: doc.title, url: canonical },
        ].map((c, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: c.name,
          item: c.url,
        }));

        setJsonLd({
          '@context': 'https://schema.org',
          '@graph': [articleData, { '@type': 'BreadcrumbList', itemListElement: breadcrumbItems }],
        });

        // analytics
        try {
          track('page_view', {
            view: 'article_detail',
            article: {
              slug: doc.slug,
              id: doc._id || doc.id,
              title: doc.title,
              category: categoryName,
              hasImage: !!ogImage,
              reading: { minutes: rt.minutes, words: rt.words },
            },
          });
        } catch {}

        // related
        try {
          const r1 = await api.get('/api/articles', {
            params: { page: 1, limit: 8, category: categoryName },
            validateStatus: () => true,
          });
          let pool = (r1.data?.items || []).filter((a) => a.slug !== doc.slug);

          if (pool.length < 4) {
            const r2 = await api.get('/api/articles', {
              params: { page: 1, limit: 8 },
              validateStatus: () => true,
            });
            const extra = (r2.data?.items || []).filter(
              (a) => a.slug !== doc.slug && !pool.find((p) => p.slug === a.slug)
            );
            pool = [...pool, ...extra];
          }

          setRelated(pool.slice(0, 4));
        } catch {
          setRelated([]);
        }
      } catch {
        if (!alive) return;
        setError('Article not found');
      }
    })();

    return () => {
      document.title = 'My News';
      removeManagedHeadTags();
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, location.key, navigate]);

  // load comments
  useEffect(() => {
    if (article?.slug) loadComments(article.slug);
  }, [article?.slug]);

  /* ---------- fetch homepage rails plan ---------- */
  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        setRailsLoading(true);
        setRailsError('');
        const res = await api.get('/api/sections/plan', {
          params: { targetType: 'homepage', targetValue: '/' },
        });
        if (!cancel) setHomeSections(Array.isArray(res.data) ? res.data : []);
      } catch (e) {
        if (!cancel) setRailsError('Failed to load rails');
        console.error(e);
      } finally {
        if (!cancel) setRailsLoading(false);
      }
    })();
    return () => { cancel = true; };
  }, []);

  if (error) {
    return (
      <>
        <SiteNav />
        <main id="content" className="container">
          <div style={{ color: 'crimson' }}>{error}</div>
        </main>
        <SiteFooter />
      </>
    );
  }

  if (!article) {
    return (
      <>
        <SiteNav />
        <main id="content" className="container">
          <div style={{ padding: 24 }}>Loading…</div>
        </main>
        <SiteFooter />
      </>
    );
  }

  /* ---------- derived ---------- */
  const displayDate = article.updatedAt || article.publishedAt || article.publishAt || article.createdAt;
  const imageUrl = article.coverImageUrl || article.imageUrl || '';
  const imageAlt = article.imageAlt || article.title || '';

  // rails: alternate right, left, right, left…
  const rails = homeSections.filter((s) => s.template?.startsWith('rail_'));
  const rightRails = rails.filter((_, i) => i % 2 === 0);
  const leftRails  = rails.filter((_, i) => i % 2 === 1);

  /* ---------- layout ---------- */
  const outerContainer = {
    display: 'flex',
    justifyContent: 'center',
    marginTop: isMobile ? 16 : 32,
    marginBottom: isMobile ? 24 : 40,
    fontFamily: "'Newsreader', serif",
  };

  const mainWrapper = {
    display: 'flex',
    flexDirection: isMobile ? 'column' : 'row',
    justifyContent: 'center',
    alignItems: isMobile ? 'stretch' : 'flex-start',
    gap: isMobile ? 12 : 8,
    width: '100%',
    maxWidth: isMobile ? 640 : 1040,
    padding: '0 12px',
  };

  // on mobile we don't render rails at all
  const leftColumn   = { flex: '0 0 260px' };
  const centerColumn = {
    flex: isMobile ? '1 1 auto' : '0 0 480px',
    width: isMobile ? '100%' : 'auto',
  };
  const rightColumn  = { flex: '0 0 260px' };

  const railWrapFix = { display: 'flow-root', marginTop: 0, paddingTop: 0 };

  const renderRails = (items) =>
    items.map((sec, i) => (
      <div key={sec.id || sec._id || sec.slug} style={{ marginTop: i === 0 ? 0 : 12 }}>
        <SectionRenderer section={sec} />
      </div>
    ));

  /* ---------- article styles ---------- */
  const titleH1 = {
    margin: '0 0 8px',
    fontSize: isMobile ? 'clamp(18px, 5.5vw, 26px)' : 'clamp(18px, 2vw, 28px)',
    lineHeight: 1.3,
    fontWeight: 600,
  };

  const sourceRow = {
    margin: isMobile ? '6px 0 12px' : '10px 0 20px',
    fontSize: isMobile ? 14 : 15,
    color: '#00ffbfff',
    fontWeight: 500,
  };

  // thin updated-time row
  const timeShareBar = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 6,
    borderTop: '1px solid #e5e7eb',
    borderBottom: '1px solid #e5e7eb',
    padding: isMobile ? '10px 0' : '12px 0',
    margin: isMobile ? '2px 0 8px' : '4px 0 8px',
    lineHeight: 1,
  };

  const timeText = { color: '#ffffffff', fontSize: isMobile ? 14 : 15, fontWeight: 500 };

  const summaryBox = {
    background: '#003a7cff',
    border: '0px solid #000000ff',
    color: '#ffffffff',
    borderRadius: 1,
    padding: isMobile ? 10 : 12,
    fontSize: isMobile ? 15 : 16,
    lineHeight: 1.5,
    margin: '0 0 12px',
  };

  const figureWrap = { margin: '0 0 12px' };
  const imgStyle = { width: '100%', height: 'auto', borderRadius: 1, background: '#f1f5f9' };
  const figCap = { color: '#64748b', fontSize: isMobile ? 14 : 16, marginTop: 6 };

  const prose = {
    fontSize: isMobile ? 16 : 'clamp(16px, 2.2vw, 18px)',
    lineHeight: 1.75,
    color: '#ffffffff',
  };

  // bottom share row
  const shareBottom = {
    marginTop: isMobile ? 10 : 12,
    paddingTop: isMobile ? 6 : 8,
    borderTop: '0px solid #e5e7eb',
  };

  return (
    <>
      <SiteNav />
      <div style={outerContainer}>
        <div style={mainWrapper}>
          {/* LEFT RAILS (odd indices) — hidden on mobile */}
          {!isMobile && (
            <aside style={leftColumn}>
              <div className="rail-wrap" style={railWrapFix}>
                {railsLoading && <div style={{ padding: 8 }}>Loading rails…</div>}
                {!railsLoading && railsError && (
                  <div style={{ padding: 8, color: 'crimson' }}>{railsError}</div>
                )}
                {!railsLoading && !railsError && renderRails(leftRails)}
              </div>
            </aside>
          )}

          {/* CENTER ARTICLE */}
          <main style={centerColumn}>
            <article
              className="card"
              style={{
                ...styles.card,
                padding: isMobile ? 12 : 16,
                marginTop: 0,
                backgroundColor: '#001236ff', // lighter, smoother blue tone
                color: '#FFFFFF',
                border: 'none',             // removes white border
                boxShadow: '0 0 0 0 transparent', // ensures no faint outline
              }}
            >
              <h1 style={titleH1}>{article.title}</h1>

              <div style={sourceRow}>By {article.source || article.author || 'News Desk'}</div>

              {/* thin updated row */}
              <div style={timeShareBar}>
                <small style={timeText}>
                  {displayDate ? `Updated on: ${new Date(displayDate).toLocaleString()}` : ''}
                  {reading.minutes ? (
                    <>
                      {' • '}
                      <span style={{ color: '#ee6affff', fontWeight: 500, fontSize: isMobile ? 16 : 18 }}>
                        {reading.minutes} min read
                      </span>
                    </>
                  ) : (
                    ''
                  )}
                </small>
              </div>

              {article.summary && <div style={summaryBox}>{article.summary}</div>}

              {imageUrl && (
                <figure style={figureWrap}>
                  <img
                    src={imageUrl}
                    alt={imageAlt}
                    fetchpriority="high"
                    decoding="async"
                    loading="eager"
                    width="1280"
                    height="720"
                    style={imgStyle}
                  />
                  {article.imageAlt ? <figcaption style={figCap}>{article.imageAlt}</figcaption> : null}
                </figure>
              )}

              <div
                ref={bodyRef}
                className="prose"
                style={prose}
                dangerouslySetInnerHTML={{ __html: article.bodyHtml || article.body || '' }}
              />

              {/* Share at the end of the article */}
             
            </article>

            {related.length > 0 && (
              <section style={{ marginTop: 16 }}>
                <h3 style={{ margin: '8px 0 12px', color: '#ffffffff', fontSize: 28, fontWeight: 700 }}>
  Related
</h3>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(220px, 1fr))',
                    gap: isMobile ? 10 : 12,
                  }}
                >
                  {related.map((a) => {
                    const rImg = a.coverImageUrl || a.imageUrl || '';
                    return (
                      <a
                        key={a._id || a.id || a.slug}
                        href={`/article/${a.slug}`}
                        style={{ textDecoration: 'none', color: 'inherit' }}
                      >
                       <article
                            style={{
                              background: '#001653ff',           // card bg
                              color: '#e9edff',                // default text on the card
                              border: '0px solid #1e2a55',     // subtle border
                              borderRadius: 1,                // nicer rounding
                              padding: isMobile ? 12 : 14,
                              boxShadow: '0 6px 24px rgba(0,0,0,.25)' // optional depth
                            }}
                          >

                          {rImg && (
                            <div className="ar-16x9" style={{ marginBottom: 8 }}>
                              <img
                                src={rImg}
                                alt={a.imageAlt || a.title || ''}
                                loading="lazy"
                                decoding="async"
                                width="640"
                                height="360"
                                style={{
                                  width: '100%',
                                  height: 'auto',
                                  borderRadius: 1,
                                  background: '#f1f5f9',
                                }}
                              />
                            </div>
                          )}
                          <div style={{ fontWeight: 600, lineHeight: 1.3 }}>{a.title}</div>
                          <small style={{ ...styles.muted, color: '#0051ffff' ,}}>

                            {a.publishedAt || a.publishAt
                              ? new Date(a.publishedAt || a.publishAt).toLocaleDateString()
                              : ''}
                          </small>
                        </article>
                      </a>
                    );
                  })}
                </div>
              </section>
            )}

            <section style={{ marginTop: 24 }}>
  <CommentForm slug={article.slug} onSubmitted={() => loadComments(article.slug)} />
  <CommentThread comments={comments} />
</section>

          </main>

          {/* RIGHT RAILS (even indices) — hidden on mobile */}
          {!isMobile && (
            <aside style={rightColumn}>
              <div className="rail-wrap" style={railWrapFix}>
                {railsLoading && <div style={{ padding: 8 }}>Loading rails…</div>}
                {!railsLoading && railsError && (
                  <div style={{ padding: 8, color: 'crimson' }}>{railsError}</div>
                )}
                {!railsLoading && !railsError && renderRails(rightRails)}
              </div>
            </aside>
          )}
        </div>
      </div>
      <SiteFooter />
    </>
  );
}
