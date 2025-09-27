import { useEffect, useRef, useState } from 'react';
import {
  Routes, Route, Link, useNavigate, useParams, useLocation,
  useSearchParams, Navigate
} from 'react-router-dom';
import axios from 'axios';

// ===== API base =====
// In Vercel, set: VITE_API_BASE = https://news-site-backend-6qbu.onrender.com
// Locally, it will fall back to http://localhost:4000
const API_BASE =
  import.meta.env.VITE_API_BASE ||
  (location.hostname === 'localhost' ? 'http://localhost:4000' : '');

// Create axios instance
const api = axios.create({ baseURL: API_BASE });

// Token helpers
const tokenKey = 'news_admin_token';
function getToken() { return localStorage.getItem(tokenKey) || ''; }
function setToken(t) { localStorage.setItem(tokenKey, t); }
function clearToken() { localStorage.removeItem(tokenKey); }

// NEW: Admin preview helpers
const previewKey = 'geoPreviewCountry';
function getPreviewCountry() {
  return localStorage.getItem(previewKey) || '';
}
function setPreviewCountry(val) {
  if (val) localStorage.setItem(previewKey, val.toUpperCase());
  else localStorage.removeItem(previewKey);
}

// Attach token to ALL /api requests (GET included)
api.interceptors.request.use((config) => {
  if (config.url?.startsWith('/api/')) {
    const t = getToken();
    if (t) config.headers['Authorization'] = `Bearer ${t}`;

    // NEW: send preview header only if admin token exists
    const preview = getPreviewCountry();
    if (t && preview) {
      config.headers['X-Geo-Preview-Country'] = preview.toUpperCase();
    }
  }
  return config;
});

// Styles
const styles = {
  page: { maxWidth: 980, margin: '0 auto', padding: 24, fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto' },
  nav: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 12, flexWrap: 'wrap' },
  link: { textDecoration: 'none', color: '#1B4965', fontWeight: 600 },
  button: { padding: '10px 14px', borderRadius: 10, border: '1px solid #e5e7eb', background: '#f8fafc', cursor: 'pointer' },
  danger: { padding: '10px 14px', borderRadius: 10, border: '1px solid #fee2e2', background: '#fef2f2', cursor: 'pointer' },
  badge: { marginLeft: 8, padding: '2px 8px', borderRadius: 999, fontSize: 12, background: '#eef2ff', border: '1px solid #e5e7eb' },
  card: { border: '1px solid #eee', borderRadius: 12, padding: 16, background: '#fff', boxShadow: '0 1px 1px rgba(0,0,0,0.02)', marginBottom: 12 },
  h3: { margin: '0 0 6px' }, p: { margin: '8px 0 0' }, muted: { color: '#666' }, hr: { border: 0, height: 1, background: '#f0f0f0', margin: '12px 0' },
  input: { width: '100%', padding: 10, borderRadius: 10, border: '1px solid #e5e7eb', outline: 'none', marginBottom: 8 }
};

const CATEGORIES = ['All','General','Politics','Business','Tech','Sports','Entertainment','World'];

/* ---------- Cloudinary upload helper ---------- */
async function uploadImageViaCloudinary(file) {
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

/* -------------------- URL helpers -------------------- */
function useUrlState() {
  const [searchParams, setSearchParams] = useSearchParams();
  const q = searchParams.get('q') || '';
  const page = Math.max(parseInt(searchParams.get('page') || '1', 10), 1);
  const set = (next) =>
    setSearchParams(prev => {
      const p = new URLSearchParams(prev);
      if ('q' in next) (next.q ? p.set('q', next.q) : p.delete('q'));
      if ('page' in next) (next.page ? p.set('page', String(next.page)) : p.delete('page'));
      return p;
    }, { replace: true });
  return { q, page, set };
}

/* -------------------- GEO helpers (NEW) -------------------- */
function parseGeoAreas(input = '') {
  return input
    .split(/[,;\n]/g)
    .map(s => s.trim())
    .filter(Boolean);
}
function formatGeoAreas(arr = []) {
  return Array.isArray(arr) ? arr.join(', ') : '';
}

/* -------------------- Public list (infinite scroll) -------------------- */
function PublicList() {
  const params = useParams(); // optional :cat
  const { q, page, set } = useUrlState();
  const navigate = useNavigate();

  let urlCat = params.cat ? decodeURIComponent(params.cat) : 'All';
  if (!CATEGORIES.includes(urlCat)) urlCat = 'All';

  const [items, setItems] = useState([]);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const PAGE_SIZE = 5;

  const sentinelRef = useRef(null);
  const fetchingRef = useRef(false); // prevents double triggers

  // when cat or q changes, reset to page=1 (via URL) & clear list
  useEffect(() => {
    set({ page: 1 }); // keep q as-is
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlCat, q]);

  // fetch data whenever page OR filters change
  useEffect(() => {
    let ignore = false;
    (async () => {
      setLoading(true); setError('');
      fetchingRef.current = true;
      try {
        const query = { page, limit: PAGE_SIZE };
        if (q.trim()) query.q = q.trim();
        if (urlCat !== 'All') query.category = urlCat;
        const res = await api.get('/api/articles', { params: query });
        if (ignore) return;

        setHasMore(res.data.hasMore);
        setItems(prev => (page === 1 ? res.data.items : [...prev, ...res.data.items]));
      } catch {
        if (!ignore) setError('Failed to load articles');
      } finally {
        if (!ignore) { setLoading(false); fetchingRef.current = false; }
      }
    })();
    return () => { ignore = true; };
  }, [page, q, urlCat]);

  // IntersectionObserver to auto-load next page
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    if (!hasMore || loading) return;

    const obs = new IntersectionObserver((entries) => {
      const entry = entries[0];
      if (entry.isIntersecting && !fetchingRef.current && hasMore) {
        fetchingRef.current = true; // lock until fetch finishes
        set({ page: page + 1 });
      }
    }, { root: null, rootMargin: '400px 0px', threshold: 0 });

    obs.observe(el);
    return () => obs.disconnect();
  }, [page, hasMore, loading, set]);

  const changeCategory = (next) => {
    const path = next === 'All' ? '/' : `/category/${encodeURIComponent(next)}`;
    navigate(path + window.location.search);
  };

  // ---------- Default SEO for list pages (ADD) ----------
  useEffect(() => {
    const homeUrl = window.location.origin + (urlCat === 'All' ? '/' : `/category/${encodeURIComponent(urlCat)}`);
    document.title = urlCat === 'All' ? 'My News — Latest headlines' : `My News — ${urlCat}`;
    upsertTag('link', { rel: 'canonical', href: homeUrl }, 'rel');
    upsertTag('meta', { name: 'description', content: 'Latest politics, business, tech, sports and world news.' });
    // Optional OG baseline for lists
    upsertTag('meta', { property: 'og:type', content: 'website' }, 'property');
    upsertTag('meta', { property: 'og:title', content: document.title }, 'property');
    upsertTag('meta', { property: 'og:description', content: 'Latest politics, business, tech, sports and world news.' }, 'property');
    upsertTag('meta', { property: 'og:url', content: homeUrl }, 'property');
  }, [urlCat]);
  // ---------- End default SEO ----------

  return (
    <div style={styles.page}>
      <div style={styles.nav}>
        <h1 style={{ margin: 0 }}>🗞️ My News</h1>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select value={urlCat} onChange={(e)=>changeCategory(e.target.value)} style={{ ...styles.input, margin: 0, width: 180 }}>
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
          <input
            placeholder="Search…"
            value={q}
            onChange={(e)=> set({ q: e.target.value, page: 1 })}
            style={{...styles.input, margin: 0, minWidth: 260}}
          />
          <Link to="/admin" style={styles.link}>Admin</Link>
        </div>
      </div>

      {error && <div style={{ color: 'crimson', marginBottom: 12 }}>{error}</div>}

      <section>
        {items.length === 0 && !loading ? (
          <div style={styles.card}><div style={styles.muted}>No articles found.</div></div>
        ) : items.map(a => (
          <Link key={a.id} to={`/article/${a.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
            <article style={{ ...styles.card, display: 'grid', gridTemplateColumns: a.imageUrl ? '140px 1fr' : '1fr', gap: 12 }}>
              {a.imageUrl && <img src={a.imageUrl} alt="" style={{ width: 140, height: 90, objectFit: 'cover', borderRadius: 8 }} />}
              <div>
                <h3 style={styles.h3}>{a.title}</h3>
                <small style={styles.muted}>
                  {new Date(a.publishedAt).toLocaleString()} • {a.author} • {(a.category || 'General')}
                </small>
                <p style={styles.p}>{a.summary}</p>
              </div>
            </article>
          </Link>
        ))}
      </section>

      {/* sentinel for infinite scroll */}
      <div ref={sentinelRef} style={{ height: 1 }} />

      {loading && <div style={{ padding: 12, textAlign: 'center' }}>Loading…</div>}
      {!hasMore && items.length > 0 && <div style={{ padding: 12, textAlign: 'center', color: '#666' }}>You’re all caught up.</div>}
    </div>
  );
}

/* ---------- SEO head helpers (ADDED) ---------- */
function upsertTag(tagName, attrs = {}, keyAttr = 'name') {
  const head = document.head;
  const selector = Object.entries(attrs)
    .filter(([k,_]) => k === keyAttr)
    .map(([k,v]) => `${tagName}[${k}="${v}"]`)[0];
  let el = selector ? head.querySelector(selector) : null;
  if (!el) {
    el = document.createElement(tagName);
    el.setAttribute('data-managed', 'seo');
    head.appendChild(el);
  }
  Object.entries(attrs).forEach(([k,v]) => {
    if (v === null || v === undefined) el.removeAttribute(k);
    else el.setAttribute(k, v);
  });
  return el;
}
function removeManagedHeadTags() {
  document.querySelectorAll('head [data-managed="seo"]').forEach(n => n.remove());
}
function setJsonLd(obj) {
  document.querySelectorAll('script[type="application/ld+json"][data-managed="seo"]').forEach(n => n.remove());
  const s = document.createElement('script');
  s.type = 'application/ld+json';
  s.setAttribute('data-managed', 'seo');
  s.text = JSON.stringify(obj);
  document.head.appendChild(s);
}

// --- Description helpers (ADD after setJsonLd) ---
function stripHtmlClient(s = '') {
  return String(s).replace(/<[^>]*>/g, '');
}
function buildDescriptionClient(doc = {}) {
  const raw = (doc.summary && doc.summary.trim())
    || stripHtmlClient(doc.body || '').slice(0, 200);
  return String(raw).replace(/\s+/g, ' ').slice(0, 160);
}

/* -------------------- Article page -------------------- */
function ArticlePage() {
  const { slug } = useParams();
  const [article, setArticle] = useState(null);
  const [error, setError] = useState('');
  const location = useLocation();

  useEffect(() => {
    (async () => {
      try {
        setError('');
        const res = await api.get(`/api/articles/slug/${slug}`);
        setArticle(res.data);
        document.title = `${res.data.title} – My News`;

        // ---------- Inject SEO head tags (ADDED) ----------
        const url = `${window.location.origin}/article/${res.data.slug}`;
        const desc = buildDescriptionClient(res.data);

        // Canonical
        upsertTag('link', { rel: 'canonical', href: url }, 'rel');

        // Meta description (ADD)
        upsertTag('meta', { name: 'description', content: desc });

        // Open Graph
        upsertTag('meta', { property: 'og:type', content: 'article' }, 'property');
        upsertTag('meta', { property: 'og:title', content: res.data.title }, 'property');
        upsertTag('meta', { property: 'og:description', content: desc }, 'property');
        upsertTag('meta', { property: 'og:url', content: url }, 'property');
        if (res.data.imageUrl) {
          upsertTag('meta', { property: 'og:image', content: res.data.imageUrl }, 'property');
        }

        // Twitter cards
        upsertTag('meta', { name: 'twitter:card', content: res.data.imageUrl ? 'summary_large_image' : 'summary' });
        upsertTag('meta', { name: 'twitter:title', content: res.data.title });
        upsertTag('meta', { name: 'twitter:description', content: desc });
        if (res.data.imageUrl) {
          upsertTag('meta', { name: 'twitter:image', content: res.data.imageUrl });
        }

        // hreflang alternates (self-refs for now; server sitemap also has hreflang)
        ['x-default','en-US','en-IN'].forEach(code => {
          upsertTag('link', { rel: 'alternate', hreflang: code, href: url }, 'hreflang');
        });

        // JSON-LD (NewsArticle)
        setJsonLd({
          "@context": "https://schema.org",
          "@type": "NewsArticle",
          "headline": res.data.title,
          "datePublished": new Date(res.data.publishedAt || res.data.createdAt || Date.now()).toISOString(),
          "dateModified": new Date(res.data.updatedAt || res.data.publishedAt || res.data.createdAt || Date.now()).toISOString(),
          "author": [{ "@type": "Person", "name": res.data.author }],
          "articleSection": res.data.category || "General",
          "image": res.data.imageUrl ? [res.data.imageUrl] : undefined,
          "mainEntityOfPage": { "@type": "WebPage", "@id": url },
          "url": url,
          "description": res.data.summary || ""
        });
        // ---------- End SEO head tags ----------
      } catch {
        setError('Article not found');
      }
    })();
    return () => {
      document.title = 'My News';
      removeManagedHeadTags(); // cleanup SEO tags we injected
    };
  }, [slug, location.key]);

  if (error) return <div style={{ ...styles.page, color: 'crimson' }}>{error}</div>;
  if (!article) return <div style={{ padding: 24 }}>Loading…</div>;

  return (
    <div style={styles.page}>
      <div style={styles.nav}>
        <Link to="/" style={styles.link}>← Back to home</Link>
        <span />
      </div>
      <article style={styles.card}>
        {article.imageUrl && (
          <img src={article.imageUrl} alt="" style={{ width: '100%', maxHeight: 420, objectFit: 'cover', borderRadius: 12, marginBottom: 12 }} />
        )}
        <h1 style={{ marginTop: 0 }}>{article.title}</h1>
        <small style={styles.muted}>
          {new Date(article.publishedAt).toLocaleString()} • {article.author} • {(article.category || 'General')}
        </small>
        <hr style={styles.hr} />
        <p style={{ lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{article.body}</p>
      </article>
    </div>
  );
}

/* -------------------- Admin -------------------- */
function LoginForm({ onLoggedIn }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res = await api.post('/api/auth/login', { password });
      setToken(res.data.token);
      onLoggedIn();
    } catch (err) {
      setError(err?.response?.data?.error || 'Login failed');
    } finally { setLoading(false); }
  };
  return (
    <form onSubmit={submit} style={{ ...styles.card, maxWidth: 420, margin: '48px auto' }}>
      <h2 style={{ marginTop: 0 }}>Admin Login</h2>
      {error && <div style={{ color: 'crimson', marginBottom: 8 }}>{error}</div>}
      <input type="password" placeholder="Admin password" value={password} onChange={e=>setPassword(e.target.value)} style={styles.input} />
      <button disabled={!password || loading} style={styles.button}>{loading ? 'Signing in…' : 'Sign in'}</button>
    </form>
  );
}

function NewArticle({ onCreated }) {
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [author, setAuthor] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState('General');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');

  // NEW: status + publishAt
  const [status, setStatus] = useState('published');
  const [publishAt, setPublishAt] = useState(() => {
    const d = new Date();
    d.setSeconds(0, 0); // minute precision
    return d.toISOString().slice(0,16);
  });

  // NEW: GEO fields
  const [geoMode, setGeoMode] = useState('global');
  const [geoAreasInput, setGeoAreasInput] = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const disabled = !title.trim() || !summary.trim() || !author.trim() || !body.trim() || !category.trim() || saving;

  const submit = async (e) => {
    e.preventDefault();
    if (disabled) return;
    setSaving(true); setError('');
    try {
      let imageUrl = ''; let imagePublicId = '';
      if (imageFile) {
        const uploaded = await uploadImageViaCloudinary(imageFile);
        imageUrl = uploaded.url;
        imagePublicId = uploaded.publicId;
      }
      const res = await api.post('/api/articles', {
        title, summary, author, body, category, imageUrl, imagePublicId,
        status,
        publishAt,
        // NEW: GEO fields
        geoMode,
        geoAreas: parseGeoAreas(geoAreasInput)
      });
      onCreated?.(res.data);
      setTitle(''); setSummary(''); setAuthor(''); setBody(''); setCategory('General');
      setImageFile(null); setImagePreview('');
      setStatus('published');
      const d = new Date(); d.setSeconds(0,0); setPublishAt(d.toISOString().slice(0,16));
      setGeoMode('global'); setGeoAreasInput('');
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'Failed to publish article');
    } finally { setSaving(false); }
  };

  return (
    <form onSubmit={submit} style={styles.card}>
      <h3 style={styles.h3}>Create Article</h3>
      {error ? <div style={{ color: 'crimson', marginBottom: 8 }}>{error}</div> : null}
      <input placeholder="Title" value={title} onChange={(e)=>setTitle(e.target.value)} style={styles.input} />
      <input placeholder="Summary" value={summary} onChange={(e)=>setSummary(e.target.value)} style={styles.input} />
      <input placeholder="Author" value={author} onChange={(e)=>setAuthor(e.target.value)} style={styles.input} />
      <select value={category} onChange={(e)=>setCategory(e.target.value)} style={styles.input}>
        {CATEGORIES.filter(c => c !== 'All').map(c => <option key={c}>{c}</option>)}
      </select>

      {/* NEW: status + publish datetime */}
      <select value={status} onChange={(e)=>setStatus(e.target.value)} style={styles.input}>
        <option value="published">Published</option>
        <option value="draft">Draft</option>
      </select>
      <input
        type="datetime-local"
        value={publishAt}
        onChange={(e)=>setPublishAt(e.target.value)}
        style={styles.input}
      />

      {/* NEW: GEO controls */}
      <select value={geoMode} onChange={(e)=>setGeoMode(e.target.value)} style={styles.input}>
        <option value="global">GEO: global (no restriction)</option>
        <option value="include">GEO: include (ONLY show in listed regions)</option>
        <option value="exclude">GEO: exclude (HIDE in listed regions)</option>
      </select>
      <textarea
        rows={3}
        placeholder="GEO Areas e.g. country:IN, state:IN:DL, city:IN:Delhi"
        value={geoAreasInput}
        onChange={(e)=>setGeoAreasInput(e.target.value)}
        style={{ ...styles.input, resize: 'vertical' }}
      />
      <small style={{ color: '#666', display: 'block', marginBottom: 8 }}>
        Tokens: <code>country:CC</code>, <code>state:CC:REGION</code>, <code>city:CC:CityName</code>. Example: <code>country:IN</code>
      </small>

      <div style={{ marginBottom: 8 }}>
        <input type="file" accept="image/*" onChange={(e)=> {
          const f = e.target.files?.[0];
          setImageFile(f || null);
          setImagePreview(f ? URL.createObjectURL(f) : '');
        }} style={{ marginBottom: 8 }} />
        {imagePreview && <img src={imagePreview} alt="preview" style={{ width: 220, height: 140, objectFit: 'cover', borderRadius: 8 }} />}
      </div>
      <textarea placeholder="Body" value={body} onChange={(e)=>setBody(e.target.value)} rows={6} style={{ ...styles.input, resize: 'vertical' }} />
      <button disabled={disabled} style={{ ...styles.button, opacity: disabled ? 0.6 : 1 }}>
        {saving ? 'Publishing…' : (status === 'draft' ? 'Save draft' : 'Publish')}
      </button>
    </form>
  );
}

function AdminRow({ a, onUpdated, onDeleted }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(a.title);
  const [summary, setSummary] = useState(a.summary);
  const [author, setAuthor] = useState(a.author);
  const [category, setCategory] = useState(a.category || 'General');
  const [body, setBody] = useState(a.body);
  const [imageFile, setImageFile] = useState(null);

  // NEW: status + publishAt
  const [status, setStatus] = useState(a.status || 'published');
  const [publishAt, setPublishAt] = useState(
    (a.publishAt ? new Date(a.publishAt) : new Date(new Date().setSeconds(0,0))).toISOString().slice(0,16)
  );

  // NEW: GEO fields
  const [geoMode, setGeoMode] = useState(a.geoMode || 'global');
  const [geoAreasInput, setGeoAreasInput] = useState(formatGeoAreas(a.geoAreas || []));

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const save = async () => {
    setSaving(true); setError('');
    try {
      let imageUrl = a.imageUrl;
      let imagePublicId = a.imagePublicId;
      if (imageFile) {
        const uploaded = await uploadImageViaCloudinary(imageFile);
        imageUrl = uploaded.url;
        imagePublicId = uploaded.publicId;
      }
      const res = await api.patch(`/api/articles/${a.id}`, {
        title, summary, author, body, category, imageUrl, imagePublicId,
        status, publishAt,
        // NEW: GEO fields
        geoMode,
        geoAreas: parseGeoAreas(geoAreasInput)
      });
      onUpdated(res.data);
      setEditing(false);
      setImageFile(null);
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'Failed to save');
    } finally { setSaving(false); }
  };

  const del = async () => {
    const ok = window.confirm(`Delete "${a.title}"? This cannot be undone.`);
    if (!ok) return;
    try { await api.delete(`/api/articles/${a.id}`); onDeleted(a.id); }
    catch (err) { alert(err?.response?.data?.error || 'Failed to delete'); }
  };

  if (editing) {
    return (
      <article className="admin-row" style={styles.card}>
        <h3 style={styles.h3}>Edit: {a.title}</h3>
        {error && <div style={{ color: 'crimson', marginBottom: 8 }}>{error}</div>}
        <input value={title} onChange={e=>setTitle(e.target.value)} style={styles.input} />
        <input value={summary} onChange={e=>setSummary(e.target.value)} style={styles.input} />
        <input value={author} onChange={e=>setAuthor(e.target.value)} style={styles.input} />
        <select value={category} onChange={e=>setCategory(e.target.value)} style={styles.input}>
          {CATEGORIES.filter(c => c !== 'All').map(c => <option key={c}>{c}</option>)}
        </select>

        {/* NEW: status + publishAt */}
        <select value={status} onChange={(e)=>setStatus(e.target.value)} style={styles.input}>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
        </select>
        <input
          type="datetime-local"
          value={publishAt}
          onChange={(e)=>setPublishAt(e.target.value)}
          style={styles.input}
        />

        {/* NEW: GEO controls */}
        <select value={geoMode} onChange={(e)=>setGeoMode(e.target.value)} style={styles.input}>
          <option value="global">GEO: global (no restriction)</option>
          <option value="include">GEO: include (ONLY show in listed regions)</option>
          <option value="exclude">GEO: exclude (HIDE in listed regions)</option>
        </select>
        <textarea
          rows={3}
          placeholder="GEO Areas e.g. country:IN, state:IN:DL, city:IN:Delhi"
          value={geoAreasInput}
          onChange={(e)=>setGeoAreasInput(e.target.value)}
          style={{ ...styles.input, resize: 'vertical' }}
        />

        {a.imageUrl && <img src={a.imageUrl} alt="" style={{ width: 220, height: 140, objectFit: 'cover', borderRadius: 8, marginBottom: 8 }} />}
        <input type="file" accept="image/*" onChange={(e)=>setImageFile(e.target.files?.[0] || null)} style={{ marginBottom: 8 }} />
        <textarea value={body} onChange={e=>setBody(e.target.value)} rows={6} style={{ ...styles.input, resize: 'vertical' }} />
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={save} disabled={saving} style={styles.button}>{saving ? 'Saving…' : 'Save'}</button>
          <button onClick={()=>setEditing(false)} style={styles.button}>Cancel</button>
          <button onClick={del} style={styles.danger}>Delete</button>
          <Link to={`/article/${a.slug}`} style={styles.link}>View</Link>
        </div>
      </article>
    );
  }

  // Non-edit view: show draft/scheduled badges for clarity
  const isScheduled = a.status === 'published' && a.publishAt && new Date(a.publishAt) > new Date();
  const isDraft = a.status === 'draft';

  return (
    <article style={{ ...styles.card, display: 'grid', gridTemplateColumns: a.imageUrl ? '140px 1fr' : '1fr', gap: 12 }}>
      {a.imageUrl && <img src={a.imageUrl} alt="" style={{ width: 140, height: 90, objectFit: 'cover', borderRadius: 8 }} />}
      <div>
        <h3 style={styles.h3}>{a.title}</h3>
        <small style={styles.muted}>
          {new Date(a.publishedAt).toLocaleString()} • {a.author} • {(a.category || 'General')}
          {isDraft && <span style={{ ...styles.badge, background: '#fff7ed' }}>draft</span>}
          {isScheduled && <span style={{ ...styles.badge, background: '#eff6ff' }}>scheduled {new Date(a.publishAt).toLocaleString()}</span>}
          {/* NEW: tiny GEO badge */}
          {a.geoMode && a.geoMode !== 'global' && (
            <span style={{ ...styles.badge, background: a.geoMode === 'include' ? '#e6f7ff' : '#fff7e6' }}>
              {a.geoMode}: {formatGeoAreas(a.geoAreas)}
            </span>
          )}
        </small>
        <p style={styles.p}>{a.summary}</p>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={()=>setEditing(true)} style={styles.button}>Edit</button>
          <button onClick={del} style={styles.danger}>Delete</button>
          <Link to={`/article/${a.slug}`} style={styles.link}>View</Link>
        </div>
      </div>
    </article>
  );
}

function AdminPage() {
  const navigate = useNavigate();
  const [articles, setArticles] = useState([]);
  const [ready, setReady] = useState(false);

  // NEW: admin preview state
  const [geoPreview, setGeoPreview] = useState(getPreviewCountry());

  const fetchArticles = async () => {
    // NEW: all=1 to include drafts & scheduled
    const res = await api.get('/api/articles', { params: { page: 1, limit: 200, all: 1 } });
    setArticles(res.data.items);
  };

  useEffect(() => {
    if (!getToken()) { setReady(true); return; }
    fetchArticles().finally(() => setReady(true));
  }, []);

  // NEW: when admin changes preview, persist and refresh list
  const onChangePreview = async (val) => {
    setGeoPreview(val);
    setPreviewCountry(val);
    await fetchArticles(); // reflects preview on any endpoints that honor it
  };

  if (!getToken()) return <LoginForm onLoggedIn={() => { fetchArticles(); }} />;
  if (!ready) return <div style={{ padding: 24 }}>Loading…</div>;

  return (
    <div style={styles.page}>
      <div style={styles.nav}>
        <h1 style={{ margin: 0 }}>🔐 Admin</h1>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* NEW: Admin preview control */}
          <label style={{ fontSize: 12, color: '#555' }}>Preview as country</label>
          <select
            value={geoPreview}
            onChange={(e) => onChangePreview(e.target.value)}
            style={{ ...styles.input, margin: 0, width: 180 }}
            title="Only affects your admin preview; public users are filtered by real IP."
          >
            <option value="">(none)</option>
            <option value="IN">IN (India)</option>
            <option value="US">US (United States)</option>
            <option value="GB">GB (United Kingdom)</option>
            <option value="CA">CA (Canada)</option>
            <option value="AU">AU (Australia)</option>
            <option value="DE">DE (Germany)</option>
            <option value="AE">AE (UAE)</option>
          </select>

          <Link to="/" style={styles.link}>← Back to site</Link>
          <button onClick={() => { clearToken(); navigate(0); }} style={styles.button}>Log out</button>
        </div>
      </div>

      <NewArticle onCreated={(a)=>setArticles(prev => [a, ...prev])} />

      <div>
        {articles.map(a => (
          <AdminRow
            key={a.id}
            a={a}
            onUpdated={(updated) => setArticles(prev => prev.map(x => x.id === updated.id ? updated : x))}
            onDeleted={(id) => setArticles(prev => prev.filter(x => x.id !== id))}
          />
        ))}
      </div>
    </div>
  );
}

/* -------------------- Router -------------------- */
export default function App() {
  return (
    <Routes>
      <Route path="/" element={<PublicList />} />
      <Route path="/category/:cat" element={<PublicList />} />
      <Route path="/article/:slug" element={<ArticlePage />} />
      <Route path="/admin" element={<AdminPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
