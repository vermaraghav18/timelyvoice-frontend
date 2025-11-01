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
// import ShareBar from '../../components/ShareBar.jsx'; // currently unused

import { track } from '../../lib/analytics';
import useReadComplete from '../../hooks/useReadComplete.js';

// reuse homepage rails
import SectionRenderer from '../../components/sections/SectionRenderer.jsx';
import RelatedStories from '../../components/RelatedStories.jsx';
import '../../styles/rails.css';

// --- Publisher/site constants (used in JSON-LD) ---
const SITE_NAME = 'NewsSite';
const SITE_URL  = typeof window !== 'undefined' ? window.location.origin : 'https://example.com';
// Use a square logo that actually exists and is at least 112x112. 512x512 PNG/SVG recommended.
const SITE_LOGO = `${SITE_URL}/logo-512.png`;

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

/** Normalize article body to paragraphs */
function normalizeBody(htmlOrText = '') {
  let s = String(htmlOrText || '').trim();
  if (!/<p[\s>]/i.test(s)) {
    s = s
      .replace(/\r\n?/g, '\n')
      .split(/\n{2,}/g)
      .map(p => p.trim())
      .filter(Boolean)
      .map(p => `<p>${p}</p>`)
      .join('');
  }
  s = s.replace(/<p>\s*<\/p>/gi, '');
  return s;
}

/** Split normalized HTML into array of paragraph HTML strings */
function splitParagraphs(normalizedHtml = '') {
  if (!normalizedHtml) return [];
  return normalizedHtml
    .split(/<\/p>/i)
    .map(chunk => chunk.trim())
    .filter(Boolean)
    .map(chunk => (chunk.endsWith('</p>') ? chunk : `${chunk}</p>`));
}

/** Simple in-article AdSense slot */
function AdSlot({ slotId = 'in-article-1', client = 'ca-pub-XXXXXXXXXXXXXXX', slot = '1234567890' }) {
  useEffect(() => {
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {}
  }, []);
  return (
    <div style={{ display: 'flex', justifyContent: 'center', margin: '16px 0' }}>
      <ins
        className="adsbygoogle"
        style={{ display: 'block', textAlign: 'center', minHeight: 90 }}
        data-ad-client={client}
        data-ad-slot={slot}
        data-ad-format="auto"
        data-full-width-responsive="true"
        data-adtest="on"   /* remove when live */
        id={slotId}
      />
    </div>
  );
}
/* ----------------------------------- */

export default function ReaderArticle() {
  const { slug } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useIsMobile(768); // rails hidden below 768px

  const [article, setArticle] = useState(null);
  const [status, setStatus] = useState('loading'); // 'loading' | 'ok' | 'notfound'
  const [related, setRelated] = useState([]);
  const [reading, setReading] = useState({ minutes: 0, words: 0 });
  const [comments, setComments] = useState([]);

  // homepage rails plan
  const [homeSections, setHomeSections] = useState([]);
  const [railsLoading, setRailsLoading] = useState(true);
  const [railsError, setRailsError] = useState('');

  // (1) ===== Next-up states =====
  const [nextSlug, setNextSlug] = useState(null);
  const [nextArticle, setNextArticle] = useState(null);

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

  // Ensure the initial HTML never says "Article not found" (prevents Soft 404)
  useEffect(() => {
    removeManagedHeadTags();
    upsertTag('title', {}, { textContent: `Loading… — ${SITE_NAME}` });
    upsertTag('meta', { name: 'robots', content: 'index,follow' });
  }, [slug]);

  /* ---------- fetch homepage rails plan for sidebars ---------- */
  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        setRailsLoading(true);
        const res = await api.get('/api/sections/plan', {
          params: { sectionType: 'homepage' },
          validateStatus: () => true,
        });
        if (!cancel) {
          const rows = Array.isArray(res.data) ? res.data : [];
          setHomeSections(rows);
          setRailsError('');
        }
      } catch (e) {
        if (!cancel) {
          setHomeSections([]);
          setRailsError('Failed to load rails');
        }
      } finally {
        if (!cancel) setRailsLoading(false);
      }
    })();
    return () => { cancel = true; };
  }, []);

  /* ---------- fetch article ---------- */
  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setStatus('loading');

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
        setStatus('ok');

        const bodyHtml = doc.bodyHtml || doc.body || '';
        const rt = estimateReadingTime(bodyHtml || doc.summary || '');
        setReading(rt);

        // ---- SEO
        removeManagedHeadTags();

        const title = (doc.metaTitle && doc.metaTitle.trim()) || doc.title || 'Article';
        const desc =
          (doc.metaDesc && doc.metaDesc.trim()) ||
          buildDescriptionClient({ bodyHtml, summary: doc.summary });

        upsertTag('title', {}, { textContent: `${title} — ${SITE_NAME}` });
        upsertTag('meta', { name: 'description', content: String(desc).slice(0, 155) });
        upsertTag('link', { rel: 'canonical', href: canonical });

        // Article date metas for FB/OG/SEO
        const publishedIso = new Date(
          doc.publishedAt || doc.publishAt || doc.createdAt || Date.now()
        ).toISOString();
        const modifiedIso = new Date(
          doc.updatedAt || doc.publishedAt || doc.publishAt || doc.createdAt || Date.now()
        ).toISOString();
        upsertTag('meta', { property: 'article:published_time', content: publishedIso });
        upsertTag('meta', { property: 'article:modified_time',  content: modifiedIso  });

        // Open Graph / Twitter
        const ogImage = doc.ogImage || doc.coverImageUrl || doc.imageUrl || '';
        // Prefer metaTitle for social titles (falls back to page <title>)
        const ogTitle = (doc.metaTitle && doc.metaTitle.trim()) || title;

        // Brand on social
        upsertTag('meta', { property: 'og:site_name', content: SITE_NAME });
        // Optional: set your Twitter/X handle (uncomment and set it if you have one)
        // upsertTag('meta', { name: 'twitter:site', content: '@YourHandle' });

        upsertTag('meta', { property: 'og:type', content: 'article' });
        upsertTag('meta', { property: 'og:title', content: ogTitle });
        upsertTag('meta', { property: 'og:description', content: String(desc).slice(0, 200) });
        upsertTag('meta', { property: 'og:url', content: canonical });
        if (ogImage) upsertTag('meta', { property: 'og:image', content: ogImage });

        upsertTag('meta', { name: 'twitter:card', content: ogImage ? 'summary_large_image' : 'summary' });
        upsertTag('meta', { name: 'twitter:title', content: ogTitle });
        upsertTag('meta', { name: 'twitter:description', content: String(desc).slice(0, 200) });
        if (ogImage) upsertTag('meta', { name: 'twitter:image', content: ogImage });

        // Optional author meta (helps some parsers)
        const authorNameMeta = (doc.author && String(doc.author).trim()) || 'News Desk';
        upsertTag('meta', { name: 'author', content: authorNameMeta });

        // ---------- JSON-LD: Strong NewsArticle + Breadcrumb ----------
        const categoryObj = doc.category || null;
        const categoryName = categoryObj?.name || categoryObj || 'General';
        const categorySlug = categoryObj?.slug || categoryName;

        // Author: prefer Person; fall back to Organization “News Desk”
        const authorName = (doc.author && String(doc.author).trim()) || 'News Desk';
        const authorNode =
          authorName.toLowerCase() === 'news desk'
            ? { '@type': 'Organization', name: authorName }
            : { '@type': 'Person', name: authorName };

        // Dates (ISO)
        const datePublishedISO = publishedIso;
        const dateModifiedISO = modifiedIso;

        // Images
        // (ogImage defined above)

        // Publisher Organization node (with logo)
        const publisherNode = {
          '@type': 'Organization',
          name: SITE_NAME,
          url: SITE_URL,
          logo: {
            '@type': 'ImageObject',
            url: SITE_LOGO,
            width: 512,
            height: 512,
          },
        };

        const articleNode = {
          '@context': 'https://schema.org',
          '@type': 'NewsArticle',
          mainEntityOfPage: { '@type': 'WebPage', '@id': canonical },
          headline: doc.title,
          description: String(desc).slice(0, 200),
          image: ogImage ? [ogImage] : undefined,
          datePublished: datePublishedISO,
          dateModified: dateModifiedISO,
          author: [authorNode],
          publisher: publisherNode,
          articleSection: categoryName,
          url: canonical,
          isAccessibleForFree: true,
          wordCount: rt?.words || undefined,
          timeRequired: `PT${Math.max(1, rt?.minutes || 1)}M`,
        };

        const breadcrumbNode = {
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` },
            ...(categoryName
              ? [{ '@type': 'ListItem', position: 2, name: categoryName, item: `${SITE_URL}/category/${encodeURIComponent(categorySlug)}` }]
              : []),
            {
              '@type': 'ListItem',
              position: categoryName ? 3 : 2,
              name: doc.title,
              item: canonical,
            },
          ],
        };

        setJsonLd({ '@context': 'https://schema.org', '@graph': [articleNode, breadcrumbNode] });

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
        setStatus('notfound');
      }
    })();

    return () => {
      document.title = SITE_NAME;
      removeManagedHeadTags();
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, location.key, navigate]);

  // load comments
  useEffect(() => {
    if (article?.slug) loadComments(article.slug);
  }, [article?.slug]);

  /* ---------- (2) compute next slug from Top News order ---------- */
  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        if (!article?.slug) return;
        const res = await api.get('/api/top-news', { params: { limit: 50, page: 1 } });
        const list = Array.isArray(res?.data?.items) ? res.data.items : [];
        const idx = list.findIndex(x => x.slug === article.slug);
        if (idx !== -1 && list[idx + 1]) {
          if (!cancel) setNextSlug(list[idx + 1].slug);
        } else {
          if (!cancel) setNextSlug(null);
        }
      } catch {
        if (!cancel) setNextSlug(null);
      }
    })();
    return () => { cancel = true; };
  }, [article?.slug]);

  /* ---------- (3) fetch next article when we have nextSlug ---------- */
  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        if (!nextSlug) {
          if (!cancel) setNextArticle(null);
          return;
        }
        const res = await api.get(`/api/articles/slug/${encodeURIComponent(nextSlug)}`, {
          validateStatus: (s) => s >= 200 && s < 300,
          headers: { 'Cache-Control': 'no-cache' },
        });
        if (!cancel) setNextArticle(res.data || null);
      } catch {
        if (!cancel) setNextArticle(null);
      }
    })();
    return () => { cancel = true; };
  }, [nextSlug]);

  /* ---------- derived ---------- */
  const displayDate = article?.updatedAt || article?.publishedAt || article?.publishAt || article?.createdAt;
  const imageUrl = article?.coverImageUrl || article?.imageUrl || '';
  const imageAlt = article?.imageAlt || article?.title || '';

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
    border: '0',
    color: '#ffffff',
    borderRadius: 0,
    padding: isMobile ? 12 : 16,
    fontSize: isMobile ? 17 : 18,
    lineHeight: 1.75,
    margin: '0 0 16px',
    // fixed typo: "20pxpx" -> "20px"
    boxShadow: '0 8px 20px 0 #000, 0 0 0 1px rgba(255,255,255,0.06)',
  };

  const figureWrap = { margin: '0 0 12px' };
  const imgStyle = { width: '100%', height: 'auto', borderRadius: 1, background: '#f1f5f9' };
  const figCap = { color: '#64748b', fontSize: isMobile ? 14 : 16, marginTop: 6 };

  const articleBodyWrapper = { maxWidth: '70ch', margin: '0 auto' };

  const prose = {
    fontSize: isMobile ? 19 : 'clamp(19px, 2.2vw, 22px)',
    lineHeight: 1.9,
    color: '#ffffffff',
  };

  // const shareBottom = { marginTop: isMobile ? 10 : 12, paddingTop: isMobile ? 6 : 8, borderTop: '0px solid #e5e7eb' };

  // ---- BODY PREP ----
  const normalizedBody = useMemo(
    () => normalizeBody(article?.bodyHtml || article?.body || ''),
    [article?.bodyHtml, article?.body]
  );
  const paragraphs = useMemo(() => splitParagraphs(normalizedBody), [normalizedBody]);

  // ------- (4) Light inline renderer for "Next up" -------
  function NextArticleInline({ doc, isMobile }) {
    if (!doc) return null;

    const imageUrl = doc.coverImageUrl || doc.imageUrl || '';
    const imageAlt = doc.imageAlt || doc.title || '';
    const bodyHtml = doc.bodyHtml || doc.body || '';
    const normalized = normalizeBody(bodyHtml);
    const paras = splitParagraphs(normalized);

    const titleH = {
      margin: '0 0 8px',
      fontSize: isMobile ? 'clamp(18px, 5.5vw, 26px)' : 'clamp(18px, 2vw, 28px)',
      lineHeight: 1.3,
      fontWeight: 600,
    };
    const srcRow = {
      margin: isMobile ? '6px 0 12px' : '10px 0 20px',
      fontSize: isMobile ? 14 : 15,
      color: '#00ffbfff',
      fontWeight: 500,
    };
    const imgS = { width: '100%', height: 'auto', borderRadius: 1, background: '#f1f5f9' };
    const bodyWrap = { maxWidth: '70ch', margin: '0 auto' };
    const proseS = {
      fontSize: isMobile ? 19 : 'clamp(19px, 2.2vw, 22px)',
      lineHeight: 1.9,
      color: '#ffffffff',
    };

    return (
      <>
        {/* divider + pill heading "Next up" */}
        <div style={{ width: '100%', height: 1, background: 'rgba(255,255,255,0.25)', margin: '20px 0' }} />
        <div
          style={{
            margin: '8px 0 16px',
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
          }}
        >
          <div style={{ flex: 1, height: 2, background: 'rgba(255,255,255,0.3)', maxWidth: 140 }} />
          <span
            style={{
              background: 'linear-gradient(135deg, #abcc16 0%, #9dff00 100%)',
              color: '#000',
              fontWeight: 800,
              padding: '6px 16px',
              fontSize: 20,
              lineHeight: 1.2,
              borderRadius: 0,
              boxShadow: '3px 3px 0 rgba(0,0,0,1)',
              whiteSpace: 'nowrap',
            }}
          >
            Next up
          </span>
          <div style={{ flex: 1, height: 2, background: 'rgba(255,255,255,0.3)', maxWidth: 140 }} />
        </div>

        <article
          className="card"
          style={{
            ...styles.card,
            padding: isMobile ? 12 : 16,
            marginTop: 0,
            backgroundColor: '#001236ff',
            color: '#FFFFFF',
            border: 'none',
            boxShadow: '0 0 0 0 transparent',
          }}
        >
          <a href={`/article/${doc.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
            <h2 style={titleH}>{doc.title}</h2>
          </a>
          <div style={srcRow}>By {doc.source || doc.author || 'News Desk'}</div>
          {imageUrl && (
            <figure style={{ margin: '0 0 12px' }}>
              <img
                src={imageUrl}
                alt={imageAlt}
                loading="lazy"
                decoding="async"
                width="1280"
                height="720"
                style={imgS}
              />
              {doc.imageAlt ? (
                <figcaption style={{ color: '#64748b', fontSize: isMobile ? 14 : 16, marginTop: 6 }}>
                  {doc.imageAlt}
                </figcaption>
              ) : null}
            </figure>
          )}

          <div className="article-body" style={{ ...proseS, ...bodyWrap }}>
            {paras.map((html, i) => (
              <div key={`n-${i}`} dangerouslySetInnerHTML={{ __html: html }} />
            ))}
          </div>

          {/* continue link */}
          <div style={{ marginTop: 12 }}>
            <a
              href={`/article/${doc.slug}`}
              style={{
                display: 'inline-block',
                textDecoration: 'none',
                background: '#2e6bff',
                color: '#fff',
                padding: '10px 14px',
                border: '1px solid rgba(255,255,255,.14)',
                boxShadow: '0 8px 24px rgba(0,0,0,.25)',
                fontWeight: 700,
              }}
            >
              Continue to full article →
            </a>
          </div>
        </article>
      </>
    );
  }

  // Early returns AFTER all hooks are declared
  if (status === 'notfound') {
    return (
      <>
        <SiteNav />
        <main id="content" className="container">
          <div style={{ padding: 24 }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>This story isn’t available right now.</div>
            <div>Explore the latest headlines below.</div>
          </div>
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

  return (
    <>
      {/* Styles scoped to .article-body for professional rhythm */}
      <style>{`
        .article-body p {
          margin: 1.25em 0;
          line-height: 1.85;
          font-size: 19px;
          color: #e8ecf1;
        }
        .article-body p:first-of-type::first-letter {
          font-size: 2.6em;
          font-weight: 700;
          float: left;
          line-height: 1;
          margin-right: 8px;
          color: #00bfff;
        }
        .article-body h2 {
          font-size: 22px;
          margin-top: 1.8em;
          margin-bottom: 0.8em;
          border-left: 3px solid #00bfff;
          padding-left: 10px;
          color: #ffffff;
        }
        .article-body a {
          color: #61dafb;
          text-decoration: underline;
        }
        .article-body blockquote {
          border-left: 4px solid #00bfff;
          padding-left: 12px;
          margin: 1.6em 0;
          font-style: italic;
          color: #d4d4d4;
        }
      `}</style>

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
                backgroundColor: '#001236ff',
                color: '#FFFFFF',
                border: 'none',
                boxShadow: '0 0 0 0 transparent',
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

              {/* Structured body with inline ad after paragraph 2 */}
              <div ref={bodyRef} className="article-body" style={{ ...prose, ...articleBodyWrapper }}>
                {paragraphs.length === 0 ? null : paragraphs.map((html, i) => (
                  <div key={`p-${i}`}>
                    <div dangerouslySetInnerHTML={{ __html: html }} />
                    {i === 1 && <AdSlot slotId="in-article-1" />}
                  </div>
                ))}
              </div>

              {/* NEW: Related stories widget (improves internal linking) */}
  <RelatedStories
    currentSlug={article.slug}
   category={article?.category?.name || article?.category || 'General'}
   title="Related stories"
    dense={false}
  />

              {/* <div style={shareBottom}><ShareBar /></div> */}
            </article>

            {related.length > 0 && (
              <section style={{ marginTop: 16 }}>
                <div
                  style={{
                    margin: '8px 0 16px',
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '12px',
                  }}
                >
                  {/* left line */}
                  <div
                    style={{
                      flex: '1',
                      height: '2px',
                      background: 'rgba(255,255,255,0.3)',
                      maxWidth: '140px',
                    }}
                  ></div>

                  {/* pill */}
                  <span
                    style={{
                      background: 'linear-gradient(135deg, #abcc16 0%, #9dff00 100%)',
                      color: '#000',
                      fontWeight: 1000,
                      padding: '6px 16px',
                      fontSize: 21,
                      lineHeight: 1.2,
                      borderRadius: 0,
                      boxShadow: '5px 5px 0 rgba(0,0,0,1)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      letterSpacing: 0.2,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Keep Reading
                  </span>

                  {/* right line */}
                  <div
                    style={{
                      flex: '1',
                      height: '2px',
                      background: 'rgba(255,255,255,0.3)',
                      maxWidth: '140px',
                    }}
                  ></div>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(220px, 1fr))',
                    gap: isMobile ? 10 : 12,
                  }}
                >
                  {related.map((a) => {
                    const rImg = a.coverImageUrl || a.imageUrl || '';

                    // ——— UNIFORM CARD SIZING (MOBILE HEIGHT INCREASED) ———
                    const IMG_H = isMobile ? 230 : 150;
                    const TITLE_FS = isMobile ? 17 : 16;
                    const TITLE_LH = 1.3;
                    const TITLE_LINES = 3;
                    const TITLE_MIN_H = Math.ceil(TITLE_FS * TITLE_LH * TITLE_LINES);

                    return (
                      <a
                        key={a._id || a.id || a.slug}
                        href={`/article/${a.slug}`}
                        style={{ textDecoration: 'none', color: 'inherit' }}
                      >
                        <article
                          style={{
                            background: 'linear-gradient(135deg, #0a2a6b 0%, #163a8a 50%, #1d4ed8 100%)',
                            color: '#e9edff',
                            border: '0 none',
                            borderRadius: 0,
                            padding: 0,
                            boxShadow: '0 6px 24px rgba(0,0,0,.25)',
                            display: 'flex',
                            flexDirection: 'column',
                            height: '100%',
                            overflow: 'hidden',
                          }}
                        >
                          {rImg && (
                            <div style={{ position: 'relative' }}>
                              {/* centered pill over the image */}
                              <span
                                style={{
                                  position: 'absolute',
                                  top: 4,
                                  left: '13%',
                                  transform: 'translateX(-50%)',
                                  zIndex: 2,
                                  pointerEvents: 'none',
                                }}
                              >
                                <span
                                  style={{
                                    background: 'linear-gradient(135deg, #abcc16 0%, #9dff00 100%)',
                                    color: '#000',
                                    fontWeight: 700,
                                    padding: '2px 8px',
                                    fontSize: 12,
                                    lineHeight: 1.3,
                                    borderRadius: 0,
                                    boxShadow: '3px 3px 0 rgba(0,0,0,1)',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                  }}
                                >
                                  {a.category || 'Sports'}
                                </span>
                              </span>

                              <img
                                src={rImg}
                                alt={a.imageAlt || a.title || ''}
                                loading="lazy"
                                decoding="async"
                                width="640"
                                height={IMG_H}
                                style={{
                                  width: '100%',
                                  height: IMG_H,
                                  objectFit: 'cover',
                                  display: 'block',
                                  margin: 0,
                                  borderRadius: 0,
                                  background: '#0b1f44',
                                  flex: '0 0 auto',
                                }}
                              />
                            </div>
                          )}

                          <div style={{ padding: isMobile ? 10 : 12 }}>
                            <div
                              style={{
                                fontWeight: 600,
                                lineHeight: TITLE_LH,
                                fontSize: TITLE_FS,
                                minHeight: TITLE_MIN_H,
                                display: '-webkit-box',
                                WebkitLineClamp: TITLE_LINES,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                              }}
                            >
                              {a.title}
                            </div>
                          </div>
                        </article>
                      </a>
                    );
                  })}
                </div>
              </section>
            )}
            {/* thin divider after Keep Reading */}
            <div
              style={{
                width: '100%',
                height: '1px',
                background: 'rgba(255, 255, 255, 0.25)',
                margin: '20px 0',
              }}
            ></div>

            <section style={{ marginTop: 24 }}>
              <CommentForm slug={article.slug} onSubmitted={() => loadComments(article.slug)} />
              <CommentThread comments={comments} />
            </section>

            {/* (5) Render the inline "Next up" article after comments */}
            {nextArticle ? <NextArticleInline doc={nextArticle} isMobile={isMobile} /> : null}
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
