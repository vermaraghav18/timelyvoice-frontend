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

/* =========================================================
  ✅ AdSense (ONLY In-article Fluid ads for Article page)
  + ✅ NEW: Top responsive ad under title/source
  ========================================================= */
const ADS_CLIENT = 'ca-pub-8472487092329023';

// ✅ NEW: Article top responsive ad (from your AdSense screenshot)
const ADS_ARTICLE_TOP = '5588476743';

// ✅ Your In-article (fluid) slots
const ADS_INARTICLE_1 = '6745877256';
const ADS_INARTICLE_2 = '2220308886';
const ADS_INARTICLE_3 = '7281063871';
const ADS_INARTICLE_4 = '5967982203';

/* Load AdSense script once (safe in SPA) */
function ensureAdsenseScript(client) {
  if (typeof document === 'undefined') return;
  const src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`;
  const exists = Array.from(document.scripts).some((s) => s.src === src);
  if (exists) return;

  const s = document.createElement('script');
  s.async = true;
  s.src = src;
  s.crossOrigin = 'anonymous';
  document.head.appendChild(s);
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

/** ✅ NEW: Top responsive display ad (below title/source, above time/date)
 * - responsive for mobile + desktop
 * - prevents double-push TagError (status + iframe + requested flag)
 */
function ArticleTopAd({ slot = ADS_ARTICLE_TOP, client = ADS_CLIENT }) {
  const insRef = useRef(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    ensureAdsenseScript(client);

    const ins = insRef.current;
    if (!ins) return;

    // ✅ Already processed by AdSense
    if (ins.getAttribute('data-adsbygoogle-status') === 'done') return;

    // ✅ If AdSense already injected an iframe, never push again
    if (ins.querySelector('iframe')) return;

    // ✅ Mark as requested to avoid React re-render double push
    if (ins.dataset.requested === '1') return;
    ins.dataset.requested = '1';

    // Push now + delayed push (SPA timing)
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {}
    const t = setTimeout(() => {
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch {}
    }, 350);

    return () => clearTimeout(t);
  }, [slot, client]);

  return (
    <div className="tv-article-topad" aria-label="Advertisement">
      <ins
        ref={insRef}
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client={client}
        data-ad-slot={slot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
}

/** ✅ In-article (fluid) Ad unit
 * Fixes:
 * - prevents double-push TagError by checking iframe + status + requested flag
 * - keeps ad inside layout on mobile (CSS below)
 */
function InArticleAd({
  slotId,
  slot,
  client = ADS_CLIENT,
  fullBleedOnMobile = false,
  isMobile = false,
}) {
  const insRef = useRef(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    ensureAdsenseScript(client);

    const ins = insRef.current;
    if (!ins) return;

    // ✅ Already processed by AdSense
    if (ins.getAttribute('data-adsbygoogle-status') === 'done') return;

    // ✅ If AdSense already injected an iframe, never push again
    if (ins.querySelector('iframe')) return;

    // ✅ Mark as requested to avoid React re-render double push
    if (ins.dataset.requested === '1') return;
    ins.dataset.requested = '1';

    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      // keep quiet in prod
    }
  }, [slot, client]);

  const wrapClass = [
    'tv-inarticle-wrap',
    fullBleedOnMobile && isMobile ? 'tv-inarticle-wrap--fullbleed' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={wrapClass} aria-label="Advertisement">
      <ins
        ref={insRef}
        className="adsbygoogle"
        style={{ display: 'block', textAlign: 'center' }}
        data-ad-layout="in-article"
        data-ad-format="fluid"
        data-ad-client={client}
        data-ad-slot={slot}
        id={slotId}
      />
    </div>
  );
}

/* =========================================================
  Article helpers
  ========================================================= */

// --- Video helpers (Drive share -> direct playable url) ---
function getDriveFileId(url = '') {
  const s = String(url || '').trim();
  if (!s) return '';
  const byPath = s.match(/\/file\/d\/([^/]+)/);
  const byParam = s.match(/[?&]id=([^&]+)/);
  return (byPath && byPath[1]) || (byParam && byParam[1]) || '';
}

function toPlayableVideoSrc(url = '') {
  const raw = String(url || '').trim();
  if (!raw) return '';

  // ✅ allow mp4 OR Cloudinary video URLs
  if (/\.mp4(\?|#|$)/i.test(raw)) return raw;
  if (raw.includes('/video/upload/')) return raw;

  return '';
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
function estimateReadingTime(text = '', wpm = 200) {
  const plain = String(text).replace(/<[^>]*>/g, ' ');
  const words = plain.trim().split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.ceil(words / wpm));
  return { minutes, words };
}

/** Normalize article body:
 * - If it already contains HTML (<p>, <h2>, <ul>…), keep it as-is.
 * - Otherwise interpret simple markdown-like syntax:
 *   # Heading     → <h2>
 *   ## Subhead    → <h3>
 *   - item / * / • → <ul><li>item</li>…>
 *   1. item       → <ol><li>item</li>…>
 *   Blank lines   → paragraphs (<p>…</p>)
 */
function normalizeBody(htmlOrText = '') {
  let s = String(htmlOrText || '').trim();
  if (!s) return '';

  // 1) Strip markdown-style heading hashes at the start of lines.
  s = s.replace(/^#{1,6}\s*/gm, '');

  // 2) Strip markdown bold/italic markers but keep the inner text.
  s = s.replace(/\*\*(.+?)\*\*/g, '$1');
  s = s.replace(/\*(.+?)\*/g, '$1');

  // 3) If it already looks like HTML, return cleaned string directly.
  if (/(<(p|h1|h2|h3|h4|h5|ul|ol|li|blockquote|br|span|div|mark)[\s>])/i.test(s)) {
    return s;
  }

  // 4) Otherwise, treat it as simple markdown-ish text and build HTML
  const lines = s.replace(/\r\n?/g, '\n').split('\n');

  const blocks = [];
  let paraLines = [];
  let listItems = [];
  let listType = null; // 'ul' or 'ol'

  const flushParagraph = () => {
    if (!paraLines.length) return;
    const text = paraLines.join(' ').trim();
    if (text) blocks.push(`<p>${text}</p>`);
    paraLines = [];
  };

  const flushList = () => {
    if (!listItems.length) return;
    const tag = listType === 'ol' ? 'ol' : 'ul';
    const inner = listItems.map((li) => `<li>${li}</li>`).join('');
    blocks.push(`<${tag}>${inner}</${tag}>`);
    listItems = [];
    listType = null;
  };

  for (const raw of lines) {
    const line = raw.trim();

    if (!line) {
      flushParagraph();
      flushList();
      continue;
    }

    // Headings: #, ##, ### -> h2, h3, h4
    const headingMatch = line.match(/^(#{1,3})\s+(.*)$/);
    if (headingMatch) {
      flushParagraph();
      flushList();
      const hashes = headingMatch[1].length;
      const text = headingMatch[2].trim();
      const hLevel = Math.min(4, hashes + 1); // # → h2, ## → h3, ### → h4
      blocks.push(`<h${hLevel}>${text}</h${hLevel}>`);
      continue;
    }

    // Bullets: -, *, •
    const bulletMatch = line.match(/^([-*•])\s+(.*)$/);
    // Ordered: 1. item / 1) item
    const orderedMatch = line.match(/^(\d+)[.)]\s+(.*)$/);

    if (bulletMatch || orderedMatch) {
      flushParagraph();
      const text = (bulletMatch ? bulletMatch[2] : orderedMatch[2]).trim();
      const nextType = orderedMatch ? 'ol' : 'ul';

      if (!listType) {
        listType = nextType;
      } else if (listType !== nextType) {
        flushList();
        listType = nextType;
      }

      listItems.push(text);
      continue;
    }

    // Normal text line
    if (listType) flushList();
    paraLines.push(line);
  }

  // Flush any trailing structures
  flushParagraph();
  flushList();

  let html = blocks.join('');
  html = html.replace(/<p>\s*<\/p>/gi, '');
  if (!html) return s ? `<p>${s}</p>` : '';
  return html;
}

/** Split normalized HTML into array of paragraph HTML strings */
function splitParagraphs(normalizedHtml = '') {
  if (!normalizedHtml) return [];
  return normalizedHtml
    .split(/<\/p>/i)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => (chunk.endsWith('</p>') ? chunk : `${chunk}</p>`));
}

/** 🔧 Helper to choose the visible byline:
 * - Prefer author if present
 * - Otherwise use source (but ignore "Automation")
 * - Otherwise fall back to "News Desk"
 */
const BRAND_NEWS_DESK = 'Timely Voice News Desk';

function pickByline(doc = {}) {
  const author = (doc.author ?? '').toString().trim();
  const source = (doc.source ?? '').toString().trim();

  if (author) return author;
  if (source && source.toLowerCase() !== 'automation') return source;
  return BRAND_NEWS_DESK;
}

function AuthorBox({ article }) {
  if (!article) return null;

  const byline = pickByline(article);
  const isBrand = byline.toLowerCase().includes('timely voice');
  const displayName = isBrand ? 'Timely Voice News' : byline;

  return (
    <section
      style={{
        marginTop: 24,
        marginBottom: 16,
        padding: 16,
        borderRadius: 0,
        border: '1px solid rgba(148,163,184,0.6)',
        background: 'linear-gradient(145deg, rgba(15,23,42,0.95), rgba(30,64,175,0.9))',
        boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
      }}
    >
      <div
        style={{
          fontFamily: 'Arial, sans-serif',
          fontWeight: 'bold',
          fontSize: 16,
          color: '#e5f0ff',
          marginBottom: 10,
        }}
      >
        Reported by {displayName}
      </div>

      <p
        style={{
          margin: 0,
          fontSize: 14,
          lineHeight: 1.7,
          color: '#cbd5f5',
          fontFamily: 'Arial, sans-serif',
        }}
      >
        Timely Voice News relies on information from government releases, regulators, courts,
        accredited media and other publicly available sources. While editorial checks are applied
        for accuracy, clarity and neutrality, all content is provided strictly on an “as is” basis
        for general information and educational purposes only. It does not constitute financial,
        legal, medical or any other professional advice. The Timely Voice, its editors and
        contributors make no representation or warranty as to the completeness, timeliness or
        reliability of the information and accept no liability for any loss arising from reliance
        on it. Readers are advised to verify facts with original documents or consult a qualified
        professional before acting on any information contained herein.
      </p>
    </section>
  );
}

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

  // Comments loader
  async function loadComments(articleSlug) {
    const { data } = await api.get(`/public/articles/${encodeURIComponent(articleSlug)}/comments`, {
      validateStatus: () => true,
    });
    setComments(Array.isArray(data) ? data : []);
  }

  const bodyRef = useRef(null);
  useReadComplete({
    id: article?.id || article?._id,
    slug: article?.slug,
    title: article?.title,
  });

  const canonical = useMemo(
    () => buildCanonicalFromLocation(['article', String(slug || '').toLowerCase()]),
    [slug]
  );

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
        const res = await api.get('/sections/plan', {
          params: { sectionType: 'homepage' },
          validateStatus: () => true,
        });

        if (!cancel) {
          const rows = Array.isArray(res.data) ? res.data : [];
          setHomeSections(rows);
          setRailsError('');
        }
      } catch {
        if (!cancel) {
          setHomeSections([]);
          setRailsError('Failed to load rails');
        }
      } finally {
        if (!cancel) setRailsLoading(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, []);

  /* ---------- fetch article ---------- */
  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setStatus('loading');

        const res = await api.get(`/articles/slug/${encodeURIComponent(slug)}`, {
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
        upsertTag('meta', { property: 'article:modified_time', content: modifiedIso });

        // Open Graph / Twitter
        const ogImage = ensureRenderableImage(doc);

        // Brand on social
        upsertTag('meta', { property: 'og:site_name', content: SITE_NAME });

        upsertTag('meta', { property: 'og:type', content: 'article' });
        upsertTag('meta', { property: 'og:title', content: title });
        upsertTag('meta', { property: 'og:description', content: String(desc).slice(0, 200) });
        upsertTag('meta', { property: 'og:url', content: canonical });
        if (ogImage) upsertTag('meta', { property: 'og:image', content: ogImage });

        upsertTag('meta', {
          name: 'twitter:card',
          content: ogImage ? 'summary_large_image' : 'summary',
        });
        upsertTag('meta', { name: 'twitter:title', content: title });
        upsertTag('meta', { name: 'twitter:description', content: String(desc).slice(0, 200) });
        if (ogImage) upsertTag('meta', { name: 'twitter:image', content: ogImage });

        // Optional author meta
        const authorNameMeta = (doc.author && String(doc.author).trim()) || 'Timely Voice News';
        upsertTag('meta', { name: 'author', content: authorNameMeta });

        // ---------- JSON-LD: Strong NewsArticle + Breadcrumb ----------
        const categoryObj = doc.category ?? null;
        const categoryName =
          categoryObj && typeof categoryObj === 'object'
            ? categoryObj.name || 'General'
            : categoryObj || 'General';
        const categorySlug =
          categoryObj && typeof categoryObj === 'object'
            ? categoryObj.slug || categoryName
            : categoryName;

        const authorName = (doc.author && String(doc.author).trim()) || 'Timely Voice News';

        const authorNode = authorName.toLowerCase().includes('timely voice')
          ? { '@type': 'Organization', name: authorName }
          : { '@type': 'Person', name: authorName };

        const publisherNode = {
          '@type': 'Organization',
          name: SITE_NAME,
          url: SITE_URL,
          logo: { '@type': 'ImageObject', url: SITE_LOGO, width: 512, height: 512 },
        };

        const articleNode = {
          '@context': 'https://schema.org',
          '@type': 'NewsArticle',
          mainEntityOfPage: { '@type': 'WebPage', '@id': canonical },
          headline: doc.title,
          description: String(desc).slice(0, 200),
          image: ogImage ? [ogImage] : undefined,
          datePublished: publishedIso,
          dateModified: modifiedIso,
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
              ? [
                  {
                    '@type': 'ListItem',
                    position: 2,
                    name: categoryName,
                    item: `${SITE_URL}/category/${encodeURIComponent(categorySlug)}`,
                  },
                ]
              : []),
            {
              '@type': 'ListItem',
              position: categoryName ? 3 : 2,
              name: doc.title,
              item: canonical,
            },
          ],
        };

        addJsonLd({ '@context': 'https://schema.org', '@graph': [articleNode, breadcrumbNode] });

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
          const r1 = await api.get('/articles', {
            params: { page: 1, limit: 8, category: categoryName },
            validateStatus: () => true,
          });
          let pool = (r1.data?.items || []).filter((a) => a.slug !== doc.slug);

          if (pool.length < 4) {
            const r2 = await api.get('/articles', {
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

  /* ---------- derived ---------- */
  const displayDate =
    article?.updatedAt || article?.publishedAt || article?.publishAt || article?.createdAt;

  const rawImageUrl = ensureRenderableImage(article);
  const imageAlt = article?.imageAlt || article?.title || '';

  const heroSrc = rawImageUrl || FALLBACK_HERO_IMAGE;

  /* ---------- layout ---------- */
  const outerContainer = {
    display: 'flex',
    justifyContent: 'center',
    marginTop: isMobile ? 16 : 32,
    marginBottom: isMobile ? 24 : 40,
    fontFamily: "'Newsreader', serif",
    position: 'relative',
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

  const centerColumn = {
    flex: isMobile ? '1 1 auto' : '0 0 740px',
    width: isMobile ? '100%' : 'auto',
  };

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

  const timeText = {
    color: '#ffffffff',
    fontSize: isMobile ? 14 : 15,
    fontWeight: 500,
  };

  const summaryBox = {
    background: '#003a7cff',
    border: '0',
    color: '#ffffff',
    borderRadius: 0,
    padding: isMobile ? 12 : 16,
    fontSize: isMobile ? 17 : 18,
    lineHeight: 1.75,
    margin: '0 0 16px',
    boxShadow: '0 8px 20px 0 #000, 0 0 0 1px rgba(255,255,255,0.06)',
  };

  const articleBodyWrapper = { maxWidth: '70ch', margin: '0 auto' };

  const prose = {
    fontSize: isMobile ? 19 : 'clamp(19px, 2.2vw, 22px)',
    lineHeight: 1.9,
    color: '#ffffffff',
  };

  // ---- BODY PREP ----
  const normalizedBody = useMemo(
    () => normalizeBody(article?.bodyHtml || article?.body || ''),
    [article?.bodyHtml, article?.body]
  );
  const paragraphs = useMemo(() => splitParagraphs(normalizedBody), [normalizedBody]);

  /* =========================================================
    ✅ Ad placement rule:
    - 3 ads minimum, 4 if long articles
    - spaced by reading chunks (roughly 10–15 lines)
    ========================================================= */
  function stripHtml(html = '') {
    return String(html || '')
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function wordCountFromHtml(html = '') {
    const t = stripHtml(html);
    if (!t) return 0;
    return t.split(' ').filter(Boolean).length;
  }

  const adPlanByAfterIndex = useMemo(() => {
    const slots = [ADS_INARTICLE_1, ADS_INARTICLE_2, ADS_INARTICLE_3, ADS_INARTICLE_4];

    const totalParas = paragraphs.length;
    if (totalParas <= 0) return {};

    const wc = paragraphs.map((p) => wordCountFromHtml(p));
    const totalWords = wc.reduce((a, b) => a + b, 0);

    // 4 ads only for longer stories
    const desiredAds = totalWords >= 900 ? 4 : 3;

    const FIRST_AD_AFTER_WORDS = 150; // don't show immediately at top
    const MIN_GAP_WORDS = 200; // target spacing between ads
    const MAX_GAP_WORDS = 280; // force a placement if we overshoot

    const placements = []; // paragraph indices where we place an ad AFTER that paragraph
    let sinceLast = 0;
    let cumulative = 0;

    for (let i = 0; i < totalParas; i++) {
      cumulative += wc[i];
      sinceLast += wc[i];

      // First ad gate
      if (placements.length === 0) {
        if (cumulative >= FIRST_AD_AFTER_WORDS) {
          placements.push(i);
          sinceLast = 0;
        }
        continue;
      }

      // Next ads by gap
      if (placements.length < desiredAds) {
        if (sinceLast >= MIN_GAP_WORDS) {
          placements.push(i);
          sinceLast = 0;
        } else if (sinceLast >= MAX_GAP_WORDS) {
          placements.push(i);
          sinceLast = 0;
        }
      }
    }

    // Fallback: guarantee desiredAds placements using % positions
    const pickIndex = (ratio) =>
      Math.min(totalParas - 1, Math.max(0, Math.floor((totalParas - 1) * ratio)));

    const fallbackTargets = desiredAds === 4 ? [0.30, 0.55, 0.78, 0.92] : [0.33, 0.66, 0.88];

    const uniqPush = (idx) => {
      if (idx < 0 || idx >= totalParas) return;
      if (!placements.includes(idx)) placements.push(idx);
    };

    for (const r of fallbackTargets) {
      if (placements.length >= desiredAds) break;
      uniqPush(pickIndex(r));
    }

    // still short? push towards end
    while (placements.length < desiredAds) {
      uniqPush(totalParas - 1);
      if (placements.length >= desiredAds) break;
      uniqPush(Math.max(0, totalParas - 2));
      if (placements.length >= desiredAds) break;
      uniqPush(Math.max(0, totalParas - 3));
      break;
    }

    placements.sort((a, b) => a - b);

    const map = {};
    for (let k = 0; k < Math.min(desiredAds, placements.length); k++) {
      const afterIndex = placements[k];
      const slot = slots[k];
      if (!map[afterIndex]) map[afterIndex] = [];
      map[afterIndex].push(slot);
    }

    return map;
  }, [paragraphs]);

  // --- 404 SEO handling (must always define hooks in same order) ---
  useEffect(() => {
    if (status === 'notfound') {
      removeManagedHeadTags();
      upsertTag('meta', { name: 'robots', content: 'noindex, follow' });
      upsertTag('title', {}, { textContent: `Story not found — ${SITE_NAME}` });
    }
  }, [status]);

  if (status === 'notfound') {
    return (
      <>
        <SiteNav />
        <main id="content" className="container">
          <div style={{ padding: 24 }}>
            <h1 style={{ fontWeight: 700, marginBottom: 8 }}>Story Not Available</h1>
            <p>This story isn’t available right now. Explore the latest headlines below.</p>
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
      {/* Styles scoped to this page */}
      <style>{`
        /* =========================
          Article typography
          ========================= */
        .article-body{
          overflow-x: hidden; /* prevents any accidental horizontal overflow */
        }

        .article-body p {
          font-weight: 100;
          margin: 1.25em 0;
          line-height: 1.85;
          font-size: 19px;
          color: #e8ecf1;
        }

        /* ✅ REMOVED: Drop-cap first-letter rule */

        /* ✅ NEW: Top ad (under title/source) – responsive & safe */
        .tv-article-topad{
          width: 100%;
          max-width: 100%;
          margin: 10px 0 10px;
          overflow: hidden;
        }
        .tv-article-topad ins.adsbygoogle{
          display: block !important;
          width: 100% !important;
          max-width: 100% !important;
          overflow: hidden !important;
        }
        .tv-article-topad iframe{
          width: 100% !important;
          max-width: 100% !important;
        }

        /* MAIN HEADLINES (h2) – orange highlight bar */
        .article-body h2 {
          font-size: 22px;
          margin-top: 1.8em;
          margin-bottom: 0.8em;
          padding: 6px 10px;
          color: #000000;
          background-color: #ff9800;
          display: inline-block;
          border-radius: 3px;
          border-left: none;
        }

        /* Optional: smaller subheads (h3) – lighter style */
        .article-body h3 {
          font-size: 19px;
          margin-top: 1.6em;
          margin-bottom: 0.6em;
          color: #ffdd73;
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

        /* INLINE HIGHLIGHT: yellow for important words */
        .article-body .hl-key,
        .article-body mark {
          background-color: #ffe766;
          color: #000000;
          padding: 0 2px;
          border-radius: 2px;
        }

        /* INLINE HERO IMAGE – FLOAT LEFT ON DESKTOP */
        .article-hero-inline {
          float: left;
          width: 40%;
          max-width: 320px;
          margin: 0 18px 10px 0;
        }

        /* Bigger HERO when it's a video */
        .article-hero-inline.article-hero-video {
          width: 62%;
          max-width: 520px;
        }

        .article-hero-inline img {
          display: block;
          width: 100%;
          height: auto;
          border-radius: 1px;
          background: #f1f5f9;
        }

        .article-hero-inline video {
          display: block;
          width: 100%;
          height: auto;
          border-radius: 1px;
          background: #000;
          object-fit: cover;
        }

        .article-hero-inline figcaption {
          color: #64748b;
          font-size: 14px;
          margin-top: 4px;
        }

        @media (max-width: 767px) {
          .article-hero-inline {
            float: none;
            width: 100%;
            max-width: 100%;
            margin: 0 0 12px 0;
          }

          .article-hero-inline.article-hero-video {
            width: 100%;
            max-width: 100%;
          }
        }

        /* =========================
          ✅ In-article Ads (fluid)
          Fix: never overflow layout
          ========================= */
        .article-body .tv-inarticle-wrap{
          clear: both;             /* critical: prevents float squeeze from hero */
          width: 100%;
          max-width: 100%;
          display: block;
          margin: 18px 0;
          overflow: hidden;        /* critical: clips any weird iframe overflow */
        }

        .article-body .tv-inarticle-wrap ins.adsbygoogle{
          display: block !important;
          width: 100% !important;
          max-width: 100% !important;
          overflow: hidden !important;
        }

        .article-body .tv-inarticle-wrap iframe{
          width: 100% !important;
          max-width: 100% !important;
        }

        /* ✅ Safe "full bleed" mode without 100vw (prevents iOS overflow) */
        .article-body .tv-inarticle-wrap--fullbleed{
          width: 100%;
          max-width: 100%;
          margin-left: 0;
          margin-right: 0;
          padding-left: 0;
          padding-right: 0;
          overflow: hidden;
        }
      `}</style>

      <SiteNav />

      <div style={outerContainer}>
        <div style={mainWrapper}>
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

              <div style={sourceRow}>By {pickByline(article)}</div>

              {/* ✅ NEW: Responsive ad under title/source, above time/date */}
              <ArticleTopAd slot={ADS_ARTICLE_TOP} client={ADS_CLIENT} />

              <div style={timeShareBar}>
                <small style={timeText}>
                  {displayDate ? `Updated on: ${new Date(displayDate).toLocaleString()}` : ''}
                  {reading.minutes ? (
                    <>
                      {' • '}
                      <span
                        style={{
                          color: '#ee6affff',
                          fontWeight: 500,
                          fontSize: isMobile ? 16 : 18,
                        }}
                      >
                        {reading.minutes} min read
                      </span>
                    </>
                  ) : (
                    ''
                  )}
                </small>
              </div>

              {article.summary && <div style={summaryBox}>{article.summary}</div>}

              {/* Inline hero floated left inside article body */}
              <div
                ref={bodyRef}
                className="article-body google-anno-skip"
                style={{ ...prose, ...articleBodyWrapper }}
              >
                {/* If video exists, it REPLACES the hero image */}
                {(() => {
                  const playable = toPlayableVideoSrc(article?.videoUrl);

                  if (playable) {
                    return (
                      <figure className="article-hero-inline article-hero-video">
                        <video src={playable} autoPlay loop muted playsInline preload="metadata" />
                      </figure>
                    );
                  }

                  if (!heroSrc) return null;

                  return (
                    <figure className="article-hero-inline">
                      <img
                        src={heroSrc}
                        alt={imageAlt || 'The Timely Voice'}
                        fetchPriority="high"
                        decoding="async"
                        loading="eager"
                        width="640"
                        height="360"
                        onError={(e) => {
                          if (e.currentTarget.dataset.fallback !== '1') {
                            e.currentTarget.dataset.fallback = '1';
                            e.currentTarget.src = FALLBACK_HERO_IMAGE;
                          }
                        }}
                      />
                      {article.imageAlt ? <figcaption>{article.imageAlt}</figcaption> : null}
                    </figure>
                  );
                })()}

                {/* ✅ In-article (fluid) ads: 3 minimum, 4 for long articles, spaced by reading chunks */}
                {paragraphs.length === 0
                  ? null
                  : paragraphs.map((html, i) => {
                      const slots = adPlanByAfterIndex[i] || [];
                      const uniqSlots = Array.from(new Set(slots.filter(Boolean)));

                      return (
                        <div key={`p-${i}`}>
                          <div dangerouslySetInnerHTML={{ __html: html }} />

                          {uniqSlots.map((slot, k) => (
                            <InArticleAd
                              key={`ad-${i}-${k}-${slot}`}
                              slotId={`tv-inarticle-${slot}-${i}-${k}`}
                              slot={slot}
                              isMobile={isMobile}
                              fullBleedOnMobile={true}
                            />
                          ))}
                        </div>
                      );
                    })}
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
            </article>

            {/* Leave a comment MUST be the last visible section */}
            <section style={{ marginTop: 24 }}>
              <CommentForm slug={article.slug} onSubmitted={() => loadComments(article.slug)} />
              <CommentThread comments={comments} />
            </section>
          </main>

          {/* RIGHT RAILS (even indices) — hidden on mobile */}
          {!isMobile && (
            <aside style={{ flex: '0 0 260px' }}>
              <div
                className="rail-wrap"
                style={{ display: 'flow-root', marginTop: 0, paddingTop: 0 }}
              >
                {railsLoading && <div style={{ padding: 8 }}>Loading rails…</div>}
                {!railsLoading && railsError && (
                  <div style={{ padding: 8, color: 'crimson' }}>{railsError}</div>
                )}
                {!railsLoading &&
                  !railsError &&
                  homeSections
                    .filter((s) => s.template?.startsWith('rail_'))
                    .filter((_, i) => i % 2 === 0)
                    .map((sec, i) => (
                      <div
                        key={sec.id || sec._id || sec.slug}
                        style={{ marginTop: i === 0 ? 0 : 12 }}
                      >
                        <SectionRenderer section={sec} />
                      </div>
                    ))}
              </div>
            </aside>
          )}
        </div>
      </div>

      <SiteFooter />
    </>
  );
}
