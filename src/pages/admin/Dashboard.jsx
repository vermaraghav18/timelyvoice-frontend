import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  api, styles, CATEGORIES, uploadImageViaCloudinary,
  getToken, setToken, clearToken, setPreviewCountry, getPreviewCountry
} from '../../App.jsx';
import TodayAnalyticsCard from '../../components/admin/TodayAnalyticsCard.jsx';

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
  const [status, setStatus] = useState('published');
  const [publishAt, setPublishAt] = useState(() => {
    const d = new Date(); d.setSeconds(0,0); return d.toISOString().slice(0,16);
  });

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
        imageUrl = uploaded.url; imagePublicId = uploaded.publicId;
      }
      const res = await api.post('/api/articles', {
        title, summary, author, body, category, imageUrl, imagePublicId,
        status, publishAt, geoMode,
        geoAreas: geoAreasInput.split(/[,;\n]/g).map(s => s.trim()).filter(Boolean)
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

      <select value={status} onChange={(e)=>setStatus(e.target.value)} style={styles.input}>
        <option value="published">Published</option>
        <option value="draft">Draft</option>
      </select>
      <input type="datetime-local" value={publishAt} onChange={(e)=>setPublishAt(e.target.value)} style={styles.input} />

      <select value={geoMode} onChange={(e)=>setGeoMode(e.target.value)} style={styles.input}>
        <option value="global">GEO: global (no restriction)</option>
        <option value="include">GEO: include (ONLY show in listed regions)</option>
        <option value="exclude">GEO: exclude (HIDE in listed regions)</option>
      </select>
      <textarea rows={3} placeholder="GEO Areas e.g. country:IN, state:IN:DL, city:IN:Delhi"
                value={geoAreasInput} onChange={(e)=>setGeoAreasInput(e.target.value)}
                style={{ ...styles.input, resize: 'vertical' }} />
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
  const [status, setStatus] = useState(a.status || 'published');
  const [publishAt, setPublishAt] = useState((a.publishAt ? new Date(a.publishAt) : new Date(new Date().setSeconds(0,0))).toISOString().slice(0,16));
  const [geoMode, setGeoMode] = useState(a.geoMode || 'global');
  const [geoAreasInput, setGeoAreasInput] = useState((a.geoAreas || []).join(', '));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const save = async () => {
    setSaving(true); setError('');
    try {
      let imageUrl = a.imageUrl, imagePublicId = a.imagePublicId;
      if (imageFile) {
        const uploaded = await uploadImageViaCloudinary(imageFile);
        imageUrl = uploaded.url; imagePublicId = uploaded.publicId;
      }
      const res = await api.patch(`/api/articles/${a.id}`, {
        title, summary, author, body, category, imageUrl, imagePublicId,
        status, publishAt, geoMode,
        geoAreas: geoAreasInput.split(/[,;\n]/g).map(s => s.trim()).filter(Boolean)
      });
      onUpdated(res.data);
      setEditing(false); setImageFile(null);
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

        <select value={status} onChange={(e)=>setStatus(e.target.value)} style={styles.input}>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
        </select>
        <input type="datetime-local" value={publishAt} onChange={(e)=>setPublishAt(e.target.value)} style={styles.input} />

        <select value={geoMode} onChange={(e)=>setGeoMode(e.target.value)} style={styles.input}>
          <option value="global">GEO: global</option>
          <option value="include">GEO: include</option>
          <option value="exclude">GEO: exclude</option>
        </select>
        <textarea rows={3} placeholder="GEO Areas" value={geoAreasInput} onChange={(e)=>setGeoAreasInput(e.target.value)} style={{ ...styles.input, resize: 'vertical' }} />

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
          {a.geoMode && a.geoMode !== 'global' && (
            <span style={{ ...styles.badge, background: a.geoMode === 'include' ? '#e6f7ff' : '#fff7e6' }}>
              {a.geoMode}: {(a.geoAreas || []).join(', ')}
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

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [articles, setArticles] = useState([]);
  const [ready, setReady] = useState(false);
  const [geoPreview, setGeoPreview] = useState(getPreviewCountry());

  const fetchArticles = async () => {
    const res = await api.get('/api/articles', { params: { page: 1, limit: 200, all: 1 } });
    setArticles(res.data.items);
  };

  useEffect(() => {
    if (!getToken()) { setReady(true); return; }
    fetchArticles().finally(() => setReady(true));
  }, []);

  const onChangePreview = async (val) => {
    setGeoPreview(val);
    setPreviewCountry(val);
    await fetchArticles();
  };

  if (!getToken()) return <LoginForm onLoggedIn={() => { fetchArticles(); setReady(true); }} />;
  if (!ready) return <div style={{ padding: 24 }}>Loading…</div>;

  return (
    <div style={styles.page}>
      <div style={styles.nav}>
        <h1 style={{ margin: 0 }}>🔐 Admin</h1>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
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
          <Link to="/admin/media" style={styles.link}>Media</Link>
          <button onClick={() => { clearToken(); navigate(0); }} style={styles.button}>Log out</button>
        </div>
      </div>

      {/* 🔹 Today Analytics card */}
      <TodayAnalyticsCard />

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
