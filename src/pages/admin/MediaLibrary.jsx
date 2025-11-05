import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, styles, getToken } from '../../App.jsx';

export default function AdminMedia() {
  const [ready, setReady] = useState(false);
  const [items, setItems] = useState([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [urlUpload, setUrlUpload] = useState('');
  const [msg, setMsg] = useState('');

  const fetchMedia = async () => {
    setLoading(true);
    try {
      const res = await api.get('/media', { params: { page: 1, limit: 50, q: q || undefined } });
      setItems(res.data.items || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!getToken()) { setReady(true); return; }
    fetchMedia().finally(() => setReady(true));
  }, []);

  const uploadRemote = async (e) => {
    e.preventDefault();
    if (!urlUpload.trim()) return;
    setMsg('Uploading…');
    try {
      await api.post('/media/remote', { url: urlUpload.trim() });
      setUrlUpload('');
      await fetchMedia();
      setMsg('Uploaded ✓');
    } catch (err) {
      setMsg(err?.response?.data?.error || 'Upload failed');
    }
  };

  const del = async (id) => {
    if (!window.confirm('Delete this media item?')) return;
    try {
      await api.delete(`/media/${id}`);
      await fetchMedia();
    } catch (err) {
      alert(err?.response?.data?.error || 'Delete failed');
    }
  };

  if (!getToken()) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>You must log in from <Link to="/admin" style={styles.link}>Admin</Link> first.</div>
      </div>
    );
  }
  if (!ready) return <div style={{ padding: 24 }}>Loading…</div>;

  return (
    <div style={styles.page}>
      <div style={styles.nav}>
        <h1 style={{ margin: 0 }}>🖼️ Media Library</h1>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <Link to="/admin" style={styles.link}>← Back to Admin</Link>
        </div>
      </div>

      <form onSubmit={uploadRemote} style={{ ...styles.card, display: 'grid', gap: 8 }}>
        <h3 style={styles.h3}>Upload via URL</h3>
        <input placeholder="https://example.com/image.jpg" value={urlUpload} onChange={(e)=>setUrlUpload(e.target.value)} style={styles.input} />
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button style={styles.button}>Upload</button>
          {msg && <small style={{ color: '#555' }}>{msg}</small>}
        </div>
      </form>

      <div style={styles.card}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
          <input placeholder="Search media…" value={q} onChange={(e)=>setQ(e.target.value)} style={{ ...styles.input, margin: 0 }} />
          <button onClick={fetchMedia} style={styles.button} disabled={loading}>{loading ? 'Searching…' : 'Search'}</button>
        </div>

        {items.length === 0 ? (
          <div style={{ color: '#666' }}>No media yet.</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
            {items.map(m => (
              <div key={m._id} style={{ border: '1px solid #eee', borderRadius: 10, padding: 8 }}>
                <img src={m.url} alt="" style={{ width: '100%', height: 120, objectFit: 'cover', borderRadius: 8 }} />
                <div style={{ fontSize: 12, color: '#555', marginTop: 6 }}>
                  {m.width}×{m.height} • {(m.bytes/1024).toFixed(0)} KB
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <button onClick={()=>navigator.clipboard.writeText(m.url)} style={styles.button}>Copy URL</button>
                  <button onClick={()=>del(m._id)} style={styles.danger}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
