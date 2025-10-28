import React, { useEffect, useState } from 'react';
import { api, styles, CATEGORIES } from '../../App';



export default function AdminDrafts() {
  // Drafts state
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  // Feeds state
  const [feeds, setFeeds] = useState([]);
  const [newUrl, setNewUrl] = useState('');
  const [newCat, setNewCat] = useState('General');
  const [procN, setProcN] = useState(10);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState('');

  // Edit/preview state (your existing UI can remain)
  const [preview, setPreview] = useState(null);
  const [editId, setEditId] = useState(null);
  const [edit, setEdit] = useState({ title: '', summary: '', category: 'General', imageUrl: '' });

  function show(msg) {
    setToast(String(msg));
    setTimeout(() => setToast(''), 2500);
  }

  async function loadDrafts() {
    setLoading(true); setErr('');
    try {
      const r = await api.get('/api/admin/articles/drafts');
      setDrafts(Array.isArray(r.data) ? r.data : []);
    } catch (e) {
      setErr('Failed to load drafts');
    } finally {
      setLoading(false);
    }
  }

  async function loadFeeds() {
    try {
      const r = await api.get('/api/automation/feeds');
      setFeeds(Array.isArray(r.data) ? r.data : []);
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    loadDrafts();
    loadFeeds();
  }, []);

  // --- FEEDS: add new
  async function addFeed(e) {
    e?.preventDefault?.();
    if (!newUrl) return;
    setBusy(true);
    try {
      await api.post('/api/automation/feeds', { url: newUrl, category: newCat, active: true });
      setNewUrl('');
      await loadFeeds();
      show('Feed added');
    } catch (e) {
      show('Add feed failed');
    } finally {
      setBusy(false);
    }
  }

  // --- FEEDS: fetch items for a feed
  async function fetchFeed(feedId) {
    setBusy(true);
    try {
      await api.post(`/api/automation/feeds/${feedId}/fetch`);
      show('Fetch complete. Now process items.');
    } catch {
      show('Fetch failed');
    } finally {
      setBusy(false);
    }
  }

  // --- PROCESS: server-side process N items (fetched -> extract -> generate -> draft)
  async function processN() {
    setBusy(true);
    try {
      const r = await api.post('/api/automation/process', { limit: Number(procN || 10) });
      const ok = r?.data?.ok;
      const cnt = r?.data?.count ?? 0;
      show(ok ? `Processed ${cnt} item(s)` : 'Process failed');
      await loadDrafts();
    } catch {
      show('Process failed');
    } finally {
      setBusy(false);
    }
  }

  // --- Draft actions (simple edit/publish)
  async function openPreview(id) {
    const r = await api.get(`/api/admin/articles/${id}`);
    setPreview(r.data);
  }
  function closePreview() { setPreview(null); }

  function startEdit(row) {
    setEditId(row._id);
    setEdit({ title: row.title || '', summary: row.summary || '', category: row.category || 'General', imageUrl: row.imageUrl || '' });
  }
  function cancelEdit() { setEditId(null); }

  async function saveEdit() {
    if (!editId) return;
    setBusy(true);
    try {
      await api.patch(`/api/admin/articles/${editId}`, {
        title: edit.title,
        summary: edit.summary,
        category: edit.category,
        image: edit.imageUrl
      });
      await loadDrafts();
      setEditId(null);
      show('Saved');
    } catch {
      show('Save failed');
    } finally {
      setBusy(false);
    }
  }

  async function publish(id) {
    setBusy(true);
    try {
      await api.patch(`/api/admin/articles/${id}`, { status: 'published' });
      await loadDrafts(); // should disappear
      show('Published');
    } catch {
      show('Publish failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={styles.page}>
      <h1 style={{ marginTop: 0 }}>AI Drafts Review</h1>
      <p>Approve, edit or publish AI-generated drafts. Latest first.</p>

      {/* FEED MANAGER */}
      <div style={{ ...styles.card, background: '#f8fafc' }}>
        <h3 style={styles.h3}>Feed Manager</h3>
        <form onSubmit={addFeed} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            style={{ ...styles.input, maxWidth: 480 }}
            placeholder="https://example.com/rss.xml"
            value={newUrl}
            onChange={e => setNewUrl(e.target.value)}
          />
          <select style={{ ...styles.input, width: 200 }} value={newCat} onChange={e => setNewCat(e.target.value)}>
            {CATEGORIES.filter(c => c !== 'All').map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <button type="submit" style={styles.button} disabled={busy || !newUrl}>Add Feed</button>
        </form>

        {/* Feeds table */}
        <div style={{ marginTop: 12 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th align="left">Site</th>
                <th align="left">URL</th>
                <th align="left">Category</th>
                <th align="left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {feeds.length === 0 ? (
                <tr><td colSpan="4" style={styles.muted}>No feeds yet.</td></tr>
              ) : feeds.map(f => (
                <tr key={f._id}>
                  <td>{f.site || '-'}</td>
                  <td style={{ maxWidth: 520, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.url}</td>
                  <td>{f.category || 'General'}</td>
                  <td>
                    <button style={styles.button} disabled={busy} onClick={() => fetchFeed(f._id)}>Fetch</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Process box */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
          <label>Process</label>
          <input type="number" min="1" max="50" value={procN} onChange={e => setProcN(e.target.value)} style={{ ...styles.input, width: 80 }} />
          <span>items (fetched → extract → generate → draft)</span>
          <button style={styles.button} disabled={busy} onClick={processN}>Run</button>
        </div>
      </div>

      {toast ? <div style={{ ...styles.card, background: '#ecfeff' }}>{toast}</div> : null}

      {/* DRAFTS TABLE */}
      <div style={{ ...styles.card }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px,1fr) 160px 180px 220px', gap: 8, fontWeight: 600 }}>
          <div>Title</div><div>Category</div><div>Created</div><div>Actions</div>
        </div>
        <div style={{ marginTop: 8 }}>
          {loading ? <div>Loading…</div> :
            drafts.length === 0 ? <div style={styles.muted}>No drafts found.</div> :
              drafts.map(row => (
                <div key={row._id} style={{ display: 'grid', gridTemplateColumns: 'minmax(220px,1fr) 160px 180px 220px', gap: 8, padding: '8px 0', borderTop: '1px solid #eee' }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{row.title || '(untitled)'}</div>
                    <div style={{ fontSize: 12, color: '#666' }}>{row.slug}</div>
                    <div style={{ fontSize: 12, color: '#666' }}>{row.summary || ''}</div>
                  </div>
                  <div>{row.category || 'General'}</div>
                  <div>{new Date(row.createdAt).toLocaleString()}</div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button style={styles.button} onClick={() => openPreview(row._id)}>Preview</button>
                    <button style={styles.button} onClick={() => startEdit(row)}>✏️ Edit</button>
                    <button style={styles.button} onClick={() => publish(row._id)}>🚀 Publish</button>
                  </div>
                </div>
              ))
          }
        </div>
      </div>

      {/* PREVIEW */}
      {preview && (
        <div style={{ ...styles.card }}>
          <h3 style={styles.h3}>Preview</h3>
          <button style={styles.button} onClick={closePreview}>✖</button>
          <h2>{preview.title}</h2>
          <p style={styles.muted}>{preview.category} • {new Date(preview.createdAt).toLocaleString()}</p>
          <p>{preview.summary}</p>
          <div style={{ whiteSpace: 'pre-wrap' }}>{preview.body}</div>
        </div>
      )}

      {/* EDIT */}
      {editId && (
        <div style={{ ...styles.card }}>
          <h3 style={styles.h3}>Edit Draft</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 8, alignItems: 'center' }}>
            <label>Title</label>
            <input style={styles.input} value={edit.title} onChange={e => setEdit({ ...edit, title: e.target.value })} />
            <label>Category</label>
            <select style={styles.input} value={edit.category} onChange={e => setEdit({ ...edit, category: e.target.value })}>
              {CATEGORIES.filter(c => c !== 'All').map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <label>Summary</label>
            <textarea style={styles.input} rows={4} value={edit.summary} onChange={e => setEdit({ ...edit, summary: e.target.value })} />
            <label>Image URL</label>
            <input style={styles.input} value={edit.imageUrl} onChange={e => setEdit({ ...edit, imageUrl: e.target.value })} />
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button style={styles.button} onClick={cancelEdit}>Cancel</button>
            <button style={styles.button} onClick={saveEdit} disabled={busy}>Save</button>
          </div>
        </div>
      )}
    </div>
  );
}
