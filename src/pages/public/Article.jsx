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

/* ===========================
   ✅ AdSense constants
=========================== */
const ADS_CLIENT = 'ca-pub-8472487092329023';

// Page-skin (desktop)
const ADS_ARTICLE_SKIN_LEFT = '4645299855';
const ADS_ARTICLE_SKIN_RIGHT = '9565635808';

// In-content
const ADS_ARTICLE_INCONTENT_DESKTOP = '9270940575';
const ADS_ARTICLE_INCONTENT_MOBILE = '4494817112';

/** ✅ safe "push" for adsense (doesn't crash SSR) */
function pushAd() {
  try {
    if (typeof window === 'undefined') return;
    (window.adsbygoogle = window.adsbygoogle || []).push({});
  } catch {}
}

/** ✅ In-article AdSense slot (one slot at a time) */
function AdSlot({
  slotId = 'in-article',
  client = ADS_CLIENT,
  slot = ADS_ARTICLE_INCONTENT_DESKTOP,
  minHeight = 90,
}) {
  useEffect(() => {
    pushAd();
  }, []);

  return (
    <div style={{ display: 'flex', justifyContent: 'center', margin: '18px 0' }}>
      <ins
        className="adsbygoogle"
        style={{ display: 'block', width: '100%', minHeight, textAlign: 'center' }}
        data-ad-client={client}
        data-ad-slot={slot}
        data-ad-format="auto"
        data-full-width-responsive="true"
        id={slotId}
      />
    </div>
  );
}

/** ✅ Page-skin ad (desktop only) */
function SkinAd({ side = 'left', slot }) {
  useEffect(() => {
    pushAd();
  }, []);

  return (
    <aside className={`article-skin article-skin-${side}`}>
      <ins
        className="adsbygoogle"
        style={{ display: 'block', width: 160, minHeight: 600 }}
        data-ad-client={ADS_CLIENT}
        data-ad-slot={slot}
        data-ad-format="auto"
      />
    </aside>
  );
}

// --- Video helpers (Drive share -> direct playable url) ---
function getDriveFileId(url = '') {
  const s = String(url || '').trim();
  if (!s) return '';
  const byPath = s.match(/\/file\/d\/([^/]+)/);
  const byParam = s.match(/[?&]id=([^&]+)/);
  return (byPath && byPath[1]) || (byParam && byParam[1]) || '';
}

function toPlayableVideoSrc(url = "") {
  const raw = String(url || "").trim();
  if (!raw) return "";

  // ✅ allow mp4 OR Cloudinary video URLs
  if (/\.mp4(\?|#|$)/i.test(raw)) return raw;
  if (raw.includes("/video/upload/")) return raw;

  return "";
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
    if (listType) {
      flushList();
    }
    paraLines.push(line);
  }

  // Flush any trailing structures
  flushParagraph();
  flushList();

  let html = blocks.join('');
  html = html.replace(/<p>\s*<\/p>/gi, '');
  if (!html) {
    return s ? `<p>${s}</p>` : '';
  }
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
  if (source && source.toLowerCase() !== 'automation') {
    return source;
  }
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
        background:
          'linear-gradient(145deg, rgba(15,23,42,0.95), rgba(30,64,175,0.9))',
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
        Timely Voice News relies on information from government releases,
        regulators, courts, accredited media and other publicly available
        sources. While editorial checks are applied for accuracy, clarity and
        neutrality, all content is provided strictly on an “as is” basis for
        general information and educational purposes only. It does not
        constitute financial, legal, medical or any other professional advice.
        The Timely Voice, its editors and contributors make no representation or
        warranty as to the completeness, timeliness or reliability of the
        information and accept no liability for any loss arising from reliance
        on it. Readers are advised to verify facts with original documents or
        consult a qualified professional before acting on any information
        contained herein.
      </p>
    </section>
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

  // Comments loader
  async function loadComments(articleSlug) {
    const { data } = await api.get(
      `/public/articles/${encodeURIComponent(articleSlug)}/comments`,
      { validateStatus: () => true }
    );

    setComments(Array.isArray(data) ? data : []);
  }

  const bodyRef = useRef(null);
  useReadComplete({
    id: article?.id || article?._id,
    slug: article?.slug,
    title: article?.title,
  });

  const canonical = useMemo(
    () =>
      buildCanonicalFromLocation(['article', String(slug || '').toLowerCase()]),
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
      } catch (e) {
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

        const res = await api.get(
          `/articles/slug/${encodeURIComponent(slug)}`,
          {
            validateStatus: (s) => (s >= 200 && s < 300) || s === 308,
            headers: { 'Cache-Control': 'no-cache' },
          }
        );
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

        const title =
          (doc.metaTitle && doc.metaTitle.trim()) || doc.title || 'Article';
        const desc =
          (doc.metaDesc && doc.metaDesc.trim()) ||
          buildDescriptionClient({ bodyHtml, summary: doc.summary });

        upsertTag('title', {}, { textContent: `${title} — ${SITE_NAME}` });
        upsertTag('meta', {
          name: 'description',
          content: String(desc).slice(0, 155),
        });
        upsertTag('link', { rel: 'canonical', href: canonical });

        // Article date metas for FB/OG/SEO
        const publishedIso = new Date(
          doc.publishedAt || doc.publishAt || doc.createdAt || Date.now()
        ).toISOString();
        const modifiedIso = new Date(
          doc.updatedAt ||
            doc.publishedAt ||
            doc.publishAt ||
            doc.createdAt ||
            Date.now()
        ).toISOString();
        upsertTag('meta', {
          property: 'article:published_time',
          content: publishedIso,
        });
        upsertTag('meta', {
          property: 'article:modified_time',
          content: modifiedIso,
        });

        // Open Graph / Twitter
        const ogImage = ensureRenderableImage(doc);

        // Prefer metaTitle for social titles (falls back to page <title>)
        const ogTitle = (doc.metaTitle && doc.metaTitle.trim()) || title;

        // Brand on social
        upsertTag('meta', { property: 'og:site_name', content: SITE_NAME });

        upsertTag('meta', { property: 'og:type', content: 'article' });
        upsertTag('meta', { property: 'og:title', content: title });
        upsertTag('meta', {
          property: 'og:description',
          content: String(desc).slice(0, 200),
        });
        upsertTag('meta', { property: 'og:url', content: canonical });
        if (ogImage) upsertTag('meta', { property: 'og:image', content: ogImage });

        upsertTag('meta', {
          name: 'twitter:card',
          content: ogImage ? 'summary_large_image' : 'summary',
        });
        upsertTag('meta', { name: 'twitter:title', content: title });
        upsertTag('meta', {
          name: 'twitter:description',
          content: String(desc).slice(0, 200),
        });
        if (ogImage) upsertTag('meta', { name: 'twitter:image', content: ogImage });

        // Optional author meta (helps some parsers) – prefers doc.author only
        const authorNameMeta =
          (doc.author && String(doc.author).trim()) || 'Timely Voice News';
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

        const authorName =
          (doc.author && String(doc.author).trim()) || 'Timely Voice News';

        const authorNode = authorName.toLowerCase().includes('timely voice')
          ? { '@type': 'Organization', name: authorName }
          : { '@type': 'Person', name: authorName };

        const datePublishedISO = publishedIso;
        const dateModifiedISO = modifiedIso;

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
            {
              '@type': 'ListItem',
              position: 1,
              name: 'Home',
              item: `${SITE_URL}/`,
            },
            ...(categoryName
              ? [
                  {
                    '@type': 'ListItem',
                    position: 2,
                    name: categoryName,
                    item: `${SITE_URL}/category/${encodeURIComponent(
                      categorySlug
                    )}`,
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

        addJsonLd({
          '@context': 'https://schema.org',
          '@graph': [articleNode, breadcrumbNode],
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
    article?.updatedAt ||
    article?.publishedAt ||
    article?.publishAt ||
    article?.createdAt;

  const rawImageUrl = ensureRenderableImage(article);
  const imageAlt = article?.imageAlt || article?.title || '';

  const heroSrc = rawImageUrl || FALLBACK_HERO_IMAGE;

  // rails: alternate right, left, right, left…
  const rails = homeSections.filter((s) => s.template?.startsWith('rail_'));
  const rightRails = rails.filter((_, i) => i % 2 === 0);

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

  const centerColumn = {
    flex: isMobile ? '1 1 auto' : '0 0 740px',
    width: isMobile ? '100%' : 'auto',
  };
  const rightColumn = { flex: '0 0 260px' };

  const railWrapFix = { display: 'flow-root', marginTop: 0, paddingTop: 0 };

  const renderRails = (items) =>
    items.map((sec, i) => (
      <div
        key={sec.id || sec._id || sec.slug}
        style={{ marginTop: i === 0 ? 0 : 12 }}
      >
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

  // ✅ Decide which in-content slot to use (mobile vs desktop)
  const INCONTENT_SLOT = isMobile ? ADS_ARTICLE_INCONTENT_MOBILE : ADS_ARTICLE_INCONTENT_DESKTOP;

  return (
    <>
      {/* ✅ Desktop page-skin ads (fixed) */}
      {!isMobile && (
        <>
          <SkinAd side="left" slot={ADS_ARTICLE_SKIN_LEFT} />
          <SkinAd side="right" slot={ADS_ARTICLE_SKIN_RIGHT} />
        </>
      )}

      {/* Styles scoped to .article-body for professional rhythm */}
      <style>{`
  /* ✅ Page skin positioning */
  .article-skin{
    position: fixed;
    top: 140px;
    width: 160px;
    z-index: 9;
  }
  .article-skin-left{ left: 10px; }
  .article-skin-right{ right: 10px; }

  /* hide skins on smaller screens just in case */
  @media (max-width: 1024px){
    .article-skin{ display: none !important; }
  }

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

  /* ✅ Bigger HERO when it's a video (only affects video) */
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

  /* ✅ NEW: hero video uses same layout as hero image */
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

              {/* NEW: inline hero floated left inside article body */}
              <div
                ref={bodyRef}
                className="article-body"
                style={{ ...prose, ...articleBodyWrapper }}
              >
                {/* ✅ FIX: If video exists, it REPLACES the hero image */}
                {(() => {
                  const playable = toPlayableVideoSrc(article?.videoUrl);

                  // If video exists, show only video (bigger)
                  if (playable) {
                    return (
                      <figure className="article-hero-inline article-hero-video">
                        <video
                          src={playable}
                          autoPlay
                          loop
                          muted
                          playsInline
                          preload="metadata"
                        />
                      </figure>
                    );
                  }

                  // Otherwise show hero image
                  if (!heroSrc) return null;

                  return (
                    <figure className="article-hero-inline">
                      <img
                        src={heroSrc}
                        alt={imageAlt || "The Timely Voice"}
                        fetchPriority="high"
                        decoding="async"
                        loading="eager"
                        width="640"
                        height="360"
                        onError={(e) => {
                          if (e.currentTarget.dataset.fallback !== "1") {
                            e.currentTarget.dataset.fallback = "1";
                            e.currentTarget.src = FALLBACK_HERO_IMAGE;
                          }
                        }}
                      />
                      {article.imageAlt ? <figcaption>{article.imageAlt}</figcaption> : null}
                    </figure>
                  );
                })()}

                {paragraphs.length === 0
                  ? null
                  : paragraphs.map((html, i) => {
                      // ✅ Insert ads:
                      // 1) after paragraph 2 (i===1)
                      // 2) then every 4 paragraphs (after 6,10,14...) => i===5,9,13...
                      const showAd = i === 1 || (i > 1 && (i - 1) % 4 === 0);

                      return (
                        <div key={`p-${i}`}>
                          <div dangerouslySetInnerHTML={{ __html: html }} />

                          {showAd && (
                            <AdSlot
                              slotId={`in-article-${i}`}
                              slot={INCONTENT_SLOT}
                              client={ADS_CLIENT}
                              minHeight={isMobile ? 250 : 90}
                            />
                          )}
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
              <div className="rail-wrap" style={{ display: 'flow-root', marginTop: 0, paddingTop: 0 }}>
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
