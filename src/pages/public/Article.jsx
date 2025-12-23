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

import RelatedStories from '../../components/RelatedStories.jsx';

import { ensureRenderableImage } from '../../lib/images';

/* =========================================================
  ✅ AdSense (Article)
  + ✅ Top responsive ad under title/source
  + ✅ In-article (fluid) ads (3 minimum, 4 if long)
  ========================================================= */
const ADS_CLIENT = 'ca-pub-8472487092329023';

// ✅ Article top responsive ad
const ADS_ARTICLE_TOP = '5588476743';

// ✅ In-article (fluid) slots
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

/** ✅ Top responsive display ad (below title/source, above time/date)
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

    if (ins.getAttribute('data-adsbygoogle-status') === 'done') return;
    if (ins.querySelector('iframe')) return;

    if (ins.dataset.requested === '1') return;
    ins.dataset.requested = '1';

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

    if (ins.getAttribute('data-adsbygoogle-status') === 'done') return;
    if (ins.querySelector('iframe')) return;

    if (ins.dataset.requested === '1') return;
    ins.dataset.requested = '1';

    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {}
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

function toPlayableVideoSrc(url = '') {
  const raw = String(url || '').trim();
  if (!raw) return '';
  if (/\.mp4(\?|#|$)/i.test(raw)) return raw;
  if (raw.includes('/video/upload/')) return raw;
  return '';
}

// --- Publisher/site constants (used in JSON-LD) ---
const SITE_NAME = 'The Timely Voice';

const SITE_URL =
  typeof window !== 'undefined' ? window.location.origin : 'https://example.com';
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

function normalizeBody(htmlOrText = '') {
  let s = String(htmlOrText || '').trim();
  if (!s) return '';

  s = s.replace(/^#{1,6}\s*/gm, '');
  s = s.replace(/\*\*(.+?)\*\*/g, '$1');
  s = s.replace(/\*(.+?)\*/g, '$1');

  if (/(<(p|h1|h2|h3|h4|h5|ul|ol|li|blockquote|br|span|div|mark)[\s>])/i.test(s)) {
    return s;
  }

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

    const headingMatch = line.match(/^(#{1,3})\s+(.*)$/);
    if (headingMatch) {
      flushParagraph();
      flushList();
      const hashes = headingMatch[1].length;
      const text = headingMatch[2].trim();
      const hLevel = Math.min(4, hashes + 1);
      blocks.push(`<h${hLevel}>${text}</h${hLevel}>`);
      continue;
    }

    const bulletMatch = line.match(/^([-*•])\s+(.*)$/);
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

    if (listType) flushList();
    paraLines.push(line);
  }

  flushParagraph();
  flushList();

  let html = blocks.join('');
  html = html.replace(/<p>\s*<\/p>/gi, '');
  if (!html) return s ? `<p>${s}</p>` : '';
  return html;
}

function splitParagraphs(normalizedHtml = '') {
  if (!normalizedHtml) return [];
  return normalizedHtml
    .split(/<\/p>/i)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => (chunk.endsWith('</p>') ? chunk : `${chunk}</p>`));
}

/** Byline helper */
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
  const isMobile = useIsMobile(768);

  const [article, setArticle] = useState(null);
  const [status, setStatus] = useState('loading'); // 'loading' | 'ok' | 'notfound'
  const [related, setRelated] = useState([]);
  const [reading, setReading] = useState({ minutes: 0, words: 0 });
  const [comments, setComments] = useState([]);

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

  useEffect(() => {
    removeManagedHeadTags();
    upsertTag('title', {}, { textContent: `Loading… — ${SITE_NAME}` });
    upsertTag('meta', { name: 'robots', content: 'index,follow' });
  }, [slug]);

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

        removeManagedHeadTags();

        const title = (doc.metaTitle && doc.metaTitle.trim()) || doc.title || 'Article';
        const desc =
          (doc.metaDesc && doc.metaDesc.trim()) ||
          buildDescriptionClient({ bodyHtml, summary: doc.summary });

        upsertTag('title', {}, { textContent: `${title} — ${SITE_NAME}` });
        upsertTag('meta', { name: 'description', content: String(desc).slice(0, 155) });
        upsertTag('link', { rel: 'canonical', href: canonical });

        const publishedIso = new Date(
          doc.publishedAt || doc.publishAt || doc.createdAt || Date.now()
        ).toISOString();
        const modifiedIso = new Date(
          doc.updatedAt || doc.publishedAt || doc.publishAt || doc.createdAt || Date.now()
        ).toISOString();
        upsertTag('meta', { property: 'article:published_time', content: publishedIso });
        upsertTag('meta', { property: 'article:modified_time', content: modifiedIso });

        const ogImage = ensureRenderableImage(doc);

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

        const authorNameMeta = (doc.author && String(doc.author).trim()) || 'Timely Voice News';
        upsertTag('meta', { name: 'author', content: authorNameMeta });

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

  useEffect(() => {
    if (article?.slug) loadComments(article.slug);
  }, [article?.slug]);

  const displayDate =
    article?.updatedAt || article?.publishedAt || article?.publishAt || article?.createdAt;

  const rawImageUrl = ensureRenderableImage(article);
  const imageAlt = article?.imageAlt || article?.title || '';
  const heroSrc = rawImageUrl || FALLBACK_HERO_IMAGE;

  /* ---------- layout (✅ rails removed + wider content) ---------- */
  const outerContainer = {
    display: 'flex',
    justifyContent: 'center',
    marginTop: isMobile ? 6 : 12,
    marginBottom: isMobile ? 24 : 40,
    fontFamily: "'Newsreader', serif",
    position: 'relative',
  };

  const mainWrapper = {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'stretch',
    gap: 0,
    width: '100%',
    maxWidth: isMobile ? 720 : 1180, // ✅ wider now that rails are gone
    padding: '0 12px',
  };

  const centerColumn = {
    width: '100%',
    maxWidth: isMobile ? '100%' : 980, // ✅ wider article column
    margin: '0 auto',
  };

  /* ---------- article styles ---------- */
  const titleH1 = {
    margin: '0 0 8px',
    fontSize: isMobile ? 'clamp(18px, 5.5vw, 26px)' : 'clamp(18px, 2vw, 30px)',
    lineHeight: 1.3,
    fontWeight: 600,
  };

  const sourceRow = {
    margin: isMobile ? '6px 0 12px' : '10px 0 14px',
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

  // ✅ wider readable line length now that we have more space
  const articleBodyWrapper = { maxWidth: '86ch', margin: '0 auto' };

  const prose = {
    fontSize: isMobile ? 19 : 'clamp(19px, 2.2vw, 22px)',
    lineHeight: 1.9,
    color: '#ffffffff',
  };

  const normalizedBody = useMemo(
    () => normalizeBody(article?.bodyHtml || article?.body || ''),
    [article?.bodyHtml, article?.body]
  );
  const paragraphs = useMemo(() => splitParagraphs(normalizedBody), [normalizedBody]);

  /* =========================================================
    ✅ Ad placement rule:
    - 3 ads minimum, 4 if long articles
    - spaced by reading chunks
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

    const desiredAds = totalWords >= 900 ? 4 : 3;

    const FIRST_AD_AFTER_WORDS = 150;
    const MIN_GAP_WORDS = 200;
    const MAX_GAP_WORDS = 280;

    const placements = [];
    let sinceLast = 0;
    let cumulative = 0;

    for (let i = 0; i < totalParas; i++) {
      cumulative += wc[i];
      sinceLast += wc[i];

      if (placements.length === 0) {
        if (cumulative >= FIRST_AD_AFTER_WORDS) {
          placements.push(i);
          sinceLast = 0;
        }
        continue;
      }

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
      <style>{`
        .article-body{
          overflow-x: hidden;
        }

        .article-body p {
          font-weight: 100;
          margin: 1.25em 0;
          line-height: 1.85;
          font-size: 19px;
          color: #e8ecf1;
        }

        /* ✅ Top ad – responsive & safe */
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

        .article-body .hl-key,
        .article-body mark {
          background-color: #ffe766;
          color: #000000;
          padding: 0 2px;
          border-radius: 2px;
        }

        .article-hero-inline {
          float: left;
          width: 40%;
          max-width: 360px;
          margin: 0 18px 10px 0;
        }

        .article-hero-inline.article-hero-video {
          width: 62%;
          max-width: 560px;
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

        /* ✅ In-article Ads (fluid) */
        .article-body .tv-inarticle-wrap{
          clear: both;
          width: 100%;
          max-width: 100%;
          display: block;
          margin: 18px 0;
          overflow: hidden;
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
          <main style={centerColumn}>
            <article
              className="card"
              style={{
                ...styles.card,
                borderRadius: 0,     // ✅ add this
                padding: isMobile ? 12 : 18,
                marginTop: 0,
                backgroundColor: '#001236ff',
                color: '#FFFFFF',
                border: 'none',
                boxShadow: '0 0 0 0 transparent',
              }}
            >
              <h1 style={titleH1}>{article.title}</h1>

              <div style={sourceRow}>By {pickByline(article)}</div>

              {/* ✅ Top responsive ad */}
              <ArticleTopAd slot={ADS_ARTICLE_TOP} client={ADS_CLIENT} />

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

              <div
                ref={bodyRef}
                className="article-body google-anno-skip"
                style={{ ...prose, ...articleBodyWrapper }}
              >
                {(() => {
                  const playable = toPlayableVideoSrc(article?.videoUrl);

                  // ✅ FIX: show controls and allow sound (no forced mute)
                  // Autoplay-with-sound is blocked by browsers, so we use user-initiated play.
                  if (playable) {
                    return (
                      <figure className="article-hero-inline article-hero-video">
                        <video
                          src={playable}
                          controls
                          playsInline
                          preload="metadata"
                        />
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

            <section style={{ marginTop: 24 }}>
              <CommentForm slug={article.slug} onSubmitted={() => loadComments(article.slug)} />
              <CommentThread comments={comments} />
            </section>
          </main>
        </div>
      </div>

      <SiteFooter />
    </>
  );
}
