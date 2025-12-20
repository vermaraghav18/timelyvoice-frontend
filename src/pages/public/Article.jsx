// src/pages/public/Article.jsx
import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';

import { api, styles, removeManagedHeadTags } from '../../App.jsx';

import {
  upsertTag,
  addJsonLd,
  buildDescriptionClient,
  buildCanonicalFromLocation,
} from '../../lib/seoHead.js';

import { pushAd } from '../../lib/adsense.js';

import SiteNav from '../../components/SiteNav.jsx';
import SiteFooter from '../../components/SiteFooter.jsx';
import CommentThread from '../../components/comments/CommentThread.jsx';
import CommentForm from '../../components/comments/CommentForm.jsx';
// import ShareBar from '../../components/ShareBar.jsx'; // currently unused

import { track } from '../../lib/analytics';
import useReadComplete from '../../hooks/useReadComplete.js';

// reuse homepage rails
import SectionRenderer from '../../components/sections/SectionRenderer.jsx';
import RelatedStories from '../../components/RelatedStories.jsx';
import '../../styles/rails.css';

import { ensureRenderableImage } from '../../lib/images';

// --- Video helpers (Drive share -> direct playable url) ---
function getDriveFileId(url = '') {
  const s = String(url || '');
  const m = s.match(/\/d\/([^/]+)/) || s.match(/[?&]id=([^&]+)/);
  return m ? m[1] : '';
}
function toDriveDirectUrl(url = '') {
  const id = getDriveFileId(url);
  if (!id) return url;
  return `https://drive.google.com/uc?export=download&id=${id}`;
}

/* ---------- Brand constant ---------- */
const BRAND_NAME = 'The Timely Voice';

/* ---------- Google AdSense (Article page ONLY: in-article fluid) ---------- */
const ADS_CLIENT = 'ca-pub-8472487092329023';

// In-article (fluid) slots
const ADS_ARTICLE_INARTICLE_1 = '6745877256';
const ADS_ARTICLE_INARTICLE_2 = '2220308886';
const ADS_ARTICLE_INARTICLE_3 = '7281063871';
const ADS_ARTICLE_INARTICLE_4 = '5967982203';

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

/* ---------------- In-article (fluid) AdSense ---------------- */
function InArticleAd({ slot, id }) {
  useEffect(() => {
    pushAd();
  }, []);

  return (
    <div className="tv-inarticle-ad" aria-label="advertisement">
      <ins
        className="adsbygoogle"
        style={{ display: 'block', textAlign: 'center' }}
        data-ad-layout="in-article"
        data-ad-format="fluid"
        data-ad-client={ADS_CLIENT}
        data-ad-slot={slot}
        id={id}
      />
    </div>
  );
}

// --- Publisher/site constants (used in JSON-LD) ---
const SITE_NAME = 'The Timely Voice';

const SITE_URL =
  typeof window !== 'undefined' ? window.location.origin : 'https://example.com';
// Use a square logo that actually exists and is at least 112x112. 512x512 PNG/SVG recommended.
const SITE_LOGO = `${SITE_URL}/logo-512.png`;

// Local hero fallback (from /public)
const FALLBACK_HERO_IMAGE = '/tv-default-hero.jpg';

/* ---------- helpers ---------- */
const toTitleCase = (s = '') =>
  s
    ? String(s)
        .replace(/[-_]+/g, ' ')
        .replace(/\b\w/g, (m) => m.toUpperCase())
        .trim()
    : '';

function stripHtml(html = '') {
  return String(html || '')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<\/?[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function splitParagraphs(htmlOrText = '') {
  const raw = String(htmlOrText || '').trim();
  if (!raw) return [];

  // If already contains <p>, split by <p> blocks
  if (/<p[\s>]/i.test(raw)) {
    const parts = raw
      .split(/<\/p>/i)
      .map((x) => x.trim())
      .filter(Boolean)
      .map((x) => (/<p[\s>]/i.test(x) ? `${x}</p>` : `<p>${x}</p>`));
    return parts;
  }

  // Otherwise split by blank lines
  return raw
    .split(/\n\s*\n+/)
    .map((x) => x.trim())
    .filter(Boolean)
    .map((x) => `<p>${x}</p>`);
}

function safeUrl(u = '') {
  try {
    const s = String(u || '').trim();
    if (!s) return '';
    // If already absolute URL
    if (/^https?:\/\//i.test(s)) return s;
    // If relative, prefix with origin
    if (typeof window !== 'undefined') return new URL(s, window.location.origin).toString();
    return s;
  } catch {
    return '';
  }
}

function isoOrNull(d) {
  try {
    const dt = d ? new Date(d) : null;
    if (!dt || isNaN(dt)) return null;
    return dt.toISOString();
  } catch {
    return null;
  }
}

function getCategoryName(article) {
  const c = article?.category;
  if (!c) return 'General';
  if (typeof c === 'string') return toTitleCase(c);
  return c?.name ? String(c.name) : 'General';
}

function getAuthorName(article) {
  return (
    article?.author?.name ||
    article?.author ||
    article?.byline ||
    article?.source ||
    BRAND_NAME
  );
}

/* ---------- Author box ---------- */
function AuthorBox({ article }) {
  const authorName = getAuthorName(article);
  const createdAt = article?.createdAt || article?.publishedAt || article?.date;
  const updatedAt = article?.updatedAt;

  return (
    <div className="card" style={{ padding: 14, marginTop: 16 }}>
      <div style={{ fontWeight: 700, marginBottom: 6 }}>About the author</div>
      <div style={{ opacity: 0.9 }}>{authorName}</div>
      <div style={{ opacity: 0.7, marginTop: 6, fontSize: 13 }}>
        {createdAt ? `Published: ${new Date(createdAt).toLocaleString()}` : ''}
        {updatedAt ? ` • Updated: ${new Date(updatedAt).toLocaleString()}` : ''}
      </div>
    </div>
  );
}

/* ---------- Main page ---------- */
export default function Article() {
  const { slug } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [article, setArticle] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | ok | notfound | error
  const [errMsg, setErrMsg] = useState('');

  const isMobile = useIsMobile(900);

  const didTrackRef = useRef(false);

  // read complete tracking
  useReadComplete({ enabled: true });

  // Fetch article
  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        setStatus('loading');
        setErrMsg('');

        const res = await api.get(`/articles/slug/${slug}`);
        const a = res?.data;

        if (!mounted) return;

        if (!a || a?.error || a?.message === 'Article not found') {
          setArticle(null);
          setStatus('notfound');
          return;
        }

        setArticle(a);
        setStatus('ok');
      } catch (e) {
        if (!mounted) return;
        const msg =
          e?.response?.data?.message ||
          e?.message ||
          'Failed to load story. Please try again.';
        setErrMsg(msg);
        setStatus(e?.response?.status === 404 ? 'notfound' : 'error');
      }
    }

    if (slug) load();
    return () => {
      mounted = false;
    };
  }, [slug]);

  // Build canonical
  const canonical = useMemo(() => buildCanonicalFromLocation(location), [location]);

  // Normalize body HTML
  const normalizedBody = useMemo(
    () => (article?.bodyHtml || article?.body || ''),
    [article?.bodyHtml, article?.body]
  );
  const paragraphs = useMemo(() => splitParagraphs(normalizedBody), [normalizedBody]);

  // Decide where to insert in-article ads (4 slots max)
  const getInArticleSlotForIndex = (i) => {
    // Insert AFTER paragraph #2, #6, #10, #14 (if they exist)
    if (i === 1) return ADS_ARTICLE_INARTICLE_1; // after 2nd
    if (i === 5) return ADS_ARTICLE_INARTICLE_2; // after 6th
    if (i === 9) return ADS_ARTICLE_INARTICLE_3; // after 10th
    if (i === 13) return ADS_ARTICLE_INARTICLE_4; // after 14th
    return null;
  };

  // --- 404 SEO handling (must always define hooks in same order) ---
  useEffect(() => {
    if (status === 'notfound') {
      removeManagedHeadTags();
      upsertTag('meta', { name: 'robots', content: 'noindex, follow' });
      upsertTag('title', {}, { textContent: `Story not found | ${BRAND_NAME}` });
    }
  }, [status]);

  // SEO tags + JSON-LD
  useEffect(() => {
    if (status !== 'ok' || !article) return;

    try {
      removeManagedHeadTags();

      const title = article?.title || 'Story';
      const categoryName = getCategoryName(article);
      const authorName = getAuthorName(article);

      const desc =
        article?.summary ||
        buildDescriptionClient(stripHtml(article?.bodyHtml || article?.body || ''), 160) ||
        `Read the latest story on ${BRAND_NAME}.`;

      // Find best hero image
      const hero =
        ensureRenderableImage(article?.imageUrl || article?.image || '') ||
        FALLBACK_HERO_IMAGE;

      const ogImage = safeUrl(hero);

      upsertTag('title', {}, { textContent: `${title} | ${BRAND_NAME}` });
      upsertTag('meta', { name: 'description', content: desc });

      upsertTag('link', { rel: 'canonical', href: canonical });

      upsertTag('meta', { property: 'og:type', content: 'article' });
      upsertTag('meta', { property: 'og:title', content: `${title} | ${BRAND_NAME}` });
      upsertTag('meta', { property: 'og:description', content: desc });
      upsertTag('meta', { property: 'og:url', content: canonical });
      upsertTag('meta', { property: 'og:image', content: ogImage });

      upsertTag('meta', { name: 'twitter:card', content: 'summary_large_image' });
      upsertTag('meta', { name: 'twitter:title', content: `${title} | ${BRAND_NAME}` });
      upsertTag('meta', { name: 'twitter:description', content: desc });
      upsertTag('meta', { name: 'twitter:image', content: ogImage });

      // JSON-LD NewsArticle
      const publishedTime = isoOrNull(article?.createdAt || article?.publishedAt || article?.date);
      const modifiedTime = isoOrNull(article?.updatedAt) || publishedTime;

      const videoUrlRaw = article?.videoUrl || article?.video || '';
      const videoUrl = videoUrlRaw ? safeUrl(toDriveDirectUrl(videoUrlRaw)) : '';

      const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'NewsArticle',
        mainEntityOfPage: {
          '@type': 'WebPage',
          '@id': canonical,
        },
        headline: title,
        description: desc,
        image: [ogImage],
        datePublished: publishedTime || new Date().toISOString(),
        dateModified: modifiedTime || publishedTime || new Date().toISOString(),
        author: [
          {
            '@type': 'Person',
            name: authorName,
          },
        ],
        publisher: {
          '@type': 'NewsMediaOrganization',
          name: SITE_NAME,
          logo: {
            '@type': 'ImageObject',
            url: SITE_LOGO,
          },
        },
        articleSection: categoryName,
      };

      if (videoUrl) {
        jsonLd.video = {
          '@type': 'VideoObject',
          name: title,
          description: desc,
          uploadDate: publishedTime || new Date().toISOString(),
          contentUrl: videoUrl,
        };
      }

      addJsonLd(jsonLd);
    } catch (e) {
      // no-op
    }
  }, [status, article, canonical]);

  // Track view once
  useEffect(() => {
    if (status !== 'ok' || !article) return;
    if (didTrackRef.current) return;
    didTrackRef.current = true;

    try {
      track('article_view', {
        slug: article?.slug || slug,
        title: article?.title || '',
        category: getCategoryName(article),
      });
    } catch {
      // no-op
    }
  }, [status, article, slug]);

  // Layout styles
  const outerContainer = useMemo(
    () => ({
      ...styles.page,
      paddingTop: 10,
    }),
    []
  );

  const mainWrapper = useMemo(
    () => ({
      display: 'flex',
      gap: 16,
      justifyContent: 'center',
      alignItems: 'flex-start',
      width: '100%',
      maxWidth: 1200,
      margin: '0 auto',
      padding: isMobile ? '0 10px' : '0 12px',
    }),
    [isMobile]
  );

  const centerColumn = useMemo(
    () => ({
      flex: 1,
      minWidth: 0,
      maxWidth: 860,
    }),
    []
  );

  // 404 UI
  if (status === 'notfound') {
    return (
      <div style={styles.page}>
        <SiteNav />
        <div className="card" style={{ maxWidth: 900, margin: '20px auto', padding: 18 }}>
          <h1 style={{ marginTop: 0 }}>Story not found</h1>
          <p style={{ opacity: 0.85 }}>
            The story you’re looking for doesn’t exist or was removed.
          </p>
          <button className="btn" onClick={() => navigate('/')}>
            Go home
          </button>
        </div>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div style={outerContainer}>
      <style>{`
  /* Make sure video/hero doesn't cause odd overflow */
  .article-hero img { max-width: 100%; height: auto; display: block; }

  /* Prevent long words/urls from breaking layout */
  .article-body { overflow-wrap: anywhere; word-break: break-word; }

  /* In-article ad spacing */
  .tv-inarticle-ad{ margin: 14px 0; }
  @media (max-width: 768px){ .tv-inarticle-ad{ margin: 12px 0; } }
`}</style>

      <SiteNav />

      <div style={outerContainer}>
        <div style={mainWrapper}>
          {/* CENTER ARTICLE */}
          <main style={centerColumn}>
            <article className="card" style={{ padding: isMobile ? 14 : 18 }}>
              {status === 'loading' && (
                <div style={{ padding: 8, opacity: 0.8 }}>Loading story…</div>
              )}

              {status === 'error' && (
                <div style={{ padding: 8 }}>
                  <div style={{ fontWeight: 700, marginBottom: 6 }}>Something went wrong</div>
                  <div style={{ opacity: 0.85 }}>{errMsg}</div>
                </div>
              )}

              {status === 'ok' && article && (
                <>
                  <header>
                    <h1 style={{ margin: '0 0 10px 0', lineHeight: 1.15 }}>
                      {article.title}
                    </h1>

                    <div style={{ opacity: 0.7, fontSize: 13, marginBottom: 10 }}>
                      {getCategoryName(article)} •{' '}
                      {article?.createdAt
                        ? new Date(article.createdAt).toLocaleString()
                        : ''}
                    </div>

                    {/* HERO IMAGE */}
                    {ensureRenderableImage(article?.imageUrl || article?.image || '') && (
                      <div className="article-hero" style={{ marginBottom: 12 }}>
                        <img
                          src={ensureRenderableImage(article?.imageUrl || article?.image || '')}
                          alt={article.title || 'Story image'}
                          style={{
                            width: '100%',
                            maxHeight: 420,
                            objectFit: 'cover',
                            borderRadius: 10,
                          }}
                          loading="eager"
                        />
                      </div>
                    )}

                    {/* VIDEO (if present) */}
                    {article?.videoUrl && (
                      <div style={{ marginBottom: 12 }}>
                        <video
                          src={toDriveDirectUrl(article.videoUrl)}
                          controls
                          playsInline
                          preload="metadata"
                          style={{
                            width: '100%',
                            borderRadius: 10,
                            background: '#000',
                          }}
                        />
                      </div>
                    )}

                    {/* SUMMARY */}
                    {article?.summary && (
                      <p style={{ marginTop: 0, opacity: 0.9, fontSize: 16 }}>
                        {article.summary}
                      </p>
                    )}
                  </header>

                  {/* BODY */}
                  <div className="article-body" style={{ marginTop: 14 }}>
                    {paragraphs.map((html, i) => (
                      <div key={`p-${i}`}>
                        <div dangerouslySetInnerHTML={{ __html: html }} />

                        {(() => {
                          const slot = getInArticleSlotForIndex(i);
                          return slot ? (
                            <InArticleAd id={`article-inarticle-${i}`} slot={slot} />
                          ) : null;
                        })()}
                      </div>
                    ))}
                  </div>

                  <AuthorBox article={article} />

                  <RelatedStories
                    currentSlug={article.slug}
                    category={
                      article?.category?.name ??
                      (typeof article?.category === 'string' ? article.category : 'General')
                    }
                    title="Related stories"
                    dense={false}
                  />
                </>
              )}
            </article>

            {/* Comments */}
            {status === 'ok' && article && (
              <div className="card" style={{ padding: 18, marginTop: 16 }}>
                <div style={{ fontWeight: 800, marginBottom: 10 }}>Comments</div>
                <CommentForm articleId={article._id} />
                <div style={{ height: 12 }} />
                <CommentThread articleId={article._id} />
              </div>
            )}
          </main>

          {/* Right rail (sections) */}
          {!isMobile && (
            <aside style={{ width: 320 }}>
              <SectionRenderer variant="rail" />
            </aside>
          )}
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}
