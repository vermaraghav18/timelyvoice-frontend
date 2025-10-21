// src/App.jsx
import { useEffect, lazy, Suspense } from 'react';

import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import axios from 'axios';

// Import global CSS helpers
import './styles/home.css';
import './styles/aspectRatio.css';
import './styles/typography.css';
import './styles/scroll-optimizations.css';


// Public pages (lazy)
const NotFound = lazy(() => import('./pages/public/NotFound.jsx'));
const SearchPage = lazy(() => import('./pages/public/SearchPage.jsx'));
const PublicHome = lazy(() => import('./pages/public/PublicHome.jsx'));
const CategoryPage = lazy(() => import('./pages/public/CategoryPage.jsx'));
const TagPage = lazy(() => import('./pages/public/TagPage.jsx'));
const ReaderArticle = lazy(() => import('./pages/public/Article.jsx'));
const TopNews = lazy(() => import('./pages/public/TopNews.jsx'));

// Admin pages (lazy)
const AdminShell = lazy(() => import('./layouts/AdminShell.jsx'));
const AdminDashboard = lazy(() => import('./pages/admin/Dashboard.jsx'));
const AdminMedia = lazy(() => import('./pages/admin/MediaLibrary.jsx'));
const ArticlesPage = lazy(() => import('./pages/admin/ArticlesPage.jsx'));
const CategoriesPage = lazy(() => import('./pages/admin/CategoriesPage.jsx'));
const TagsPage = lazy(() => import('./pages/admin/TagsPage.jsx'));
const SettingsPage = lazy(() => import('./pages/admin/SettingsPage.jsx'));
const CommentsPage = lazy(() => import('./pages/admin/CommentsPage.jsx'));
const BreakingNewsAdmin = lazy(() => import('./pages/admin/BreakingNewsAdmin.jsx'));
const TickerAdmin = lazy(() => import('./pages/admin/TickerAdmin.jsx'));
const SectionsPage = lazy(() => import('./admin/sections/SectionsPage.jsx'));
const SectionsV2Page = lazy(() => import('./admin/sectionsV2/SectionsV2Page.jsx'));
// Autmotion (lazy)
const AutmotionFeedsPage = lazy(() => import('./pages/admin/autmotion/FeedsPage.jsx'));
const AutmotionQueuePage = lazy(() => import('./pages/admin/autmotion/QueuePage.jsx'));
const AutmotionDraftsPage = lazy(() => import('./pages/admin/autmotion/DraftsPage.jsx'));

const AutmotionXSourcesPage = lazy(() => import('./pages/admin/autmotion/XSourcesPage.jsx'));
const AutmotionXQueuePage = lazy(() => import('./pages/admin/autmotion/XQueuePage.jsx'));


// Analytics
import { initAnalytics, notifyRouteChange, track } from './lib/analytics';

// Error boundary
import ErrorBoundary from './components/ErrorBoundary.jsx';

/* ============ API base ============ */
const isLocalHost = ['localhost', '127.0.0.1'].includes(location.hostname);
const API_BASE =
  import.meta.env.VITE_API_BASE || (isLocalHost ? 'http://localhost:4000' : '');

export const api = axios.create({ baseURL: API_BASE });

/* ============ Auth token helpers ============ */
const tokenKey = 'news_admin_token';
export function getToken() { return localStorage.getItem(tokenKey) || ''; }
export function setToken(t) { localStorage.setItem(tokenKey, t); }
export function clearToken() { localStorage.removeItem(tokenKey); }

/* ============ Admin preview helpers ============ */
const previewKey = 'geoPreviewCountry';
export function getPreviewCountry() {
  return localStorage.getItem(previewKey) || '';
}
export function setPreviewCountry(val) {
  if (val) localStorage.setItem(previewKey, val.toUpperCase());
  else localStorage.removeItem(previewKey);
}

/* Attach token + preview to ALL /api requests */
api.interceptors.request.use((config) => {
  if (config.url?.startsWith('/api/')) {
    const t = getToken();
    if (t) config.headers['Authorization'] = `Bearer ${t}`;
    const preview = getPreviewCountry();
    if (t && preview) {
      config.headers['X-Geo-Preview-Country'] = preview.toUpperCase();
    }
  }
  return config;
});

/* ============ UI tokens ============ */
export const styles = {
  page: { maxWidth: 980, margin: '0 auto', padding: 24, fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto' },
  nav: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 12, flexWrap: 'wrap' },
  link: { textDecoration: 'none', color: '#1B4965', fontWeight: 600 },
  button: { padding: '10px 14px', borderRadius: 10, border: '1px solid #e5e7eb', background: '#f8fafc', cursor: 'pointer' },
  danger: { padding: '10px 14px', borderRadius: 10, border: '1px solid #fee2e2', background: '#fef2f2', cursor: 'pointer' },
  badge: { marginLeft: 8, padding: '2px 8px', borderRadius: 999, fontSize: 12, background: '#eef2ff', border: '1px solid #e5e7eb' },
  card: { border: "1px solid #eee", borderRadius: 12, padding: 16, background: "#fff", boxShadow: "0 1px 1px rgba(0,0,0,0.02)", marginBottom: 12 },
  h3: { margin: '0 0 6px' },
  p: { margin: '8px 0 0' },
  muted: { color: '#666' },
  hr: { border: 0, height: 1, background: '#f0f0f0', margin: '12px 0' },
  input: { width: '100%', padding: 10, borderRadius: 10, border: '1px solid #e5e7eb', outline: 'none', marginBottom: 8 }
};

export const CATEGORIES = ['All','General','Politics','Business','Tech','Sports','Entertainment','World'];

/* ============ Cloudinary upload helper ============ */
export async function uploadImageViaCloudinary(file) {
  if (!file) return { url: '', publicId: '' };
  const sig = await api.post('/api/uploads/sign');
  const { signature, timestamp, apiKey, cloudName, folder } = sig.data;

  const form = new FormData();
  form.append('file', file);
  form.append('timestamp', timestamp);
  form.append('api_key', apiKey);
  form.append('signature', signature);
  form.append('folder', folder);

  const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`;
  const res = await fetch(uploadUrl, { method: 'POST', body: form });
  if (!res.ok) throw new Error('Cloudinary upload failed');
  const json = await res.json();
  return { url: json.secure_url, publicId: json.public_id };
}

/* ============ SEO helpers (SAFE) ============ */
/**
 * Create or update a head tag by tagName and attributes.
 * IMPORTANT: tagName must be a bare tag like 'meta' | 'link' | 'title' | 'script'.
 * Never pass CSS selectors here.
 *
 * Usage examples:
 *   upsertTag('title', {}, { textContent: 'My Title' });
 *   upsertTag('meta', { name: 'description', content: '...' });
 *   upsertTag('meta', { property: 'og:title', content: '...' });
 *   upsertTag('link', { rel: 'canonical', href: canonicalUrl });
 */
export function upsertTag(tagName, attrs = {}, { textContent } = {}) {
  if (!tagName || /[\[\]#.:]/.test(tagName)) {
    throw new Error(`upsertTag: tagName must be a bare tag (received "${tagName}")`);
  }
  const attrSelector = Object.entries(attrs)
    .map(([k, v]) => `[${k}="${String(v)}"]`)
    .join('');
  const selector = `${tagName}${attrSelector}`;
  let el = document.head.querySelector(selector);

  if (!el) {
    el = document.createElement(tagName);
    el.setAttribute('data-managed', 'seo');
    document.head.appendChild(el);
  }

  Object.entries(attrs).forEach(([k, v]) => {
    if (v === null || v === undefined) el.removeAttribute(k);
    else el.setAttribute(k, String(v));
  });

  if (typeof textContent === 'string') el.textContent = textContent;
  return el;
}

export function removeManagedHeadTags() {
  document.querySelectorAll('head [data-managed="seo"]').forEach((n) => n.remove());
}

export function setJsonLd(obj) {
  document
    .querySelectorAll('script[type="application/ld+json"][data-managed="seo"]:not([data-jsonld-id])')
    .forEach((n) => n.remove());
  const s = document.createElement('script');
  s.type = 'application/ld+json';
  s.setAttribute('data-managed', 'seo');
  s.text = JSON.stringify(obj);
  document.head.appendChild(s);
}

/** Add or replace a named JSON-LD block (kept separate by data-jsonld-id) */
export function addJsonLd(id, obj) {
  const head = document.head;
  let s = head.querySelector(
    `script[type="application/ld+json"][data-managed="seo"][data-jsonld-id="${id}"]`
  );
  if (!s) {
    s = document.createElement('script');
    s.type = 'application/ld+json';
    s.setAttribute('data-managed', 'seo');
    s.setAttribute('data-jsonld-id', id);
    head.appendChild(s);
  }
  s.text = JSON.stringify(obj);
}

export function stripHtmlClient(s = '') {
  return String(s).replace(/<[^>]*>/g, '');
}

export function buildDescriptionClient(doc = {}) {
  const raw =
    (doc.summary && doc.summary.trim()) ||
    stripHtmlClient(doc.body || doc.bodyHtml || '').slice(0, 200);
  return String(raw).replace(/\s+/g, ' ').slice(0, 160);
}

/* Helper: emit BreadcrumbList JSON-LD via addJsonLd */
export function emitBreadcrumbs(trail = []) {
  const itemListElement = trail.map((c, i) => ({
    '@type': 'ListItem',
    position: i + 1,
    name: c.name,
    item: c.url,
  }));

  addJsonLd('breadcrumbs', {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement,
  });
}

/* ============ Router ============ */
export default function App() {
  const loc = useLocation();

  // Start analytics once
  useEffect(() => {
    initAnalytics();
  }, []);

  // On every route change
  useEffect(() => {
    notifyRouteChange(loc.pathname, loc.search);
    track('page_view', { path: `${loc.pathname}${loc.search}` });
  }, [loc.pathname, loc.search]);

  // Global WebSite + SearchAction JSON-LD (re-applied on navigation)
  useEffect(() => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const siteName = 'My News';
    const searchTarget = `${origin}/search?q={search_term_string}`;

    addJsonLd('site', {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: siteName,
      url: origin || 'https://example.com',
      potentialAction: {
        '@type': 'SearchAction',
        target: searchTarget,
        'query-input': 'required name=search_term_string',
      },
    });
  }, [loc.pathname, loc.search]);

  return (
    <ErrorBoundary>
      <Suspense fallback={<div style={{padding:16}}>Loading…</div>}>
        <Routes>
          {/* Reader */}
          {/* Redirect root to Top News */}
          <Route path="/" element={<Navigate to="/top-news" replace />} />
          <Route path="/category/:slug" element={<CategoryPage />} />
          <Route path="/tag/:slug" element={<TagPage />} />
          <Route path="/article/:slug" element={<ReaderArticle />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/top-news" element={<TopNews />} />
          <Route path="*" element={<NotFound />} />

          {/* Admin */}
          <Route path="/admin" element={<AdminShell><AdminDashboard /></AdminShell>} />
          <Route path="/admin/articles" element={<AdminShell><ArticlesPage /></AdminShell>} />
          <Route path="/admin/media" element={<AdminShell><AdminMedia /></AdminShell>} />
          <Route path="/admin/categories" element={<AdminShell><CategoriesPage /></AdminShell>} />
          <Route path="/admin/tags" element={<AdminShell><TagsPage /></AdminShell>} />
          <Route path="/admin/settings" element={<AdminShell><SettingsPage /></AdminShell>} />
          <Route path="/admin/comments" element={<AdminShell><CommentsPage /></AdminShell>} />
          <Route path="/admin/breaking" element={<AdminShell><BreakingNewsAdmin /></AdminShell>} />
          <Route path="/admin/ticker" element={<AdminShell><TickerAdmin /></AdminShell>} />
          <Route path="/admin/sections" element={<AdminShell><SectionsPage /></AdminShell>} />
          <Route path="/admin/sections-v2" element={<AdminShell><SectionsV2Page /></AdminShell>} />
          {/* === Autmotion routes === */}
          <Route path="/admin/autmotion/feeds" element={<AdminShell><AutmotionFeedsPage /></AdminShell>} />
          <Route path="/admin/autmotion/queue" element={<AdminShell><AutmotionQueuePage /></AdminShell>} />
          <Route path="/admin/autmotion/drafts" element={<AdminShell><AutmotionDraftsPage /></AdminShell>} />
          <Route path="/admin/autmotion/x-sources" element={<AdminShell><AutmotionXSourcesPage /></AdminShell>} />
          <Route path="/admin/autmotion/x-queue" element={<AdminShell><AutmotionXQueuePage /></AdminShell>} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}
