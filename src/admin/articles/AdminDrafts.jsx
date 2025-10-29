import React, { useEffect, useMemo, useRef, useState } from 'react';
import { api, styles } from '../../App';

export default function AdminDrafts() {
  // ────────────────────────────────────────────────────────────────────────────
  // Drafts (existing functionality — unchanged)
  // ────────────────────────────────────────────────────────────────────────────
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  // ────────────────────────────────────────────────────────────────────────────
  // Feeds (existing, but we remove the old “Fetch” usage)
  // ────────────────────────────────────────────────────────────────────────────
  const [feeds, setFeeds] = useState([]);
  const [newUrl, setNewUrl] = useState('');
  const [newName, setNewName] = useState('');       // NEW: optional label
  const [newCat, setNewCat] = useState('General');

  // ────────────────────────────────────────────────────────────────────────────
  // NEW: Live Incoming Items (from RSS) to “Run” selectively
  // ────────────────────────────────────────────────────────────────────────────
  const [items, setItems] = useState([]);
  const [itemsLoading, setItemsLoading] = useState(true);
  const pollRef = useRef(null);

  // Helpers
  const toast = (m) => alert(m);

  // ────────────────────────────────────────────────────────────────────────────
  // Load Drafts (existing)
  // ────────────────────────────────────────────────────────────────────────────
  async function loadDrafts() {
    setLoading(true);
    setErr('');
    try {
      const r = await fetch(`${api}/api/admin/articles/drafts`);
      const j = await r.json();
      setDrafts(j || []);
    } catch (e) {
      setErr(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Load Feeds (existing; no manual fetch button anymore)
  // ────────────────────────────────────────────────────────────────────────────
  async function loadFeeds() {
    const r = await fetch(`${api}/api/automation/feeds`);
    const j = await r.json();
    setFeeds(Array.isArray(j) ? j : []);
  }

  // ────────────────────────────────────────────────────────────────────────────
  // NEW: Load incoming items (status fetched|extr|gen)
  // ────────────────────────────────────────────────────────────────────────────
  async function loadItems() {
    setItemsLoading(true);
    try {
      const qs = encodeURI('status=fetched,extr,gen&limit=200');
      const r = await fetch(`${api}/api/automation/items?${qs}`);
      const j = await r.json();
      setItems(Array.isArray(j) ? j : []);
    } catch (e) {
      // noop
    } finally {
      setItemsLoading(false);
    }
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Add a feed row
  // ────────────────────────────────────────────────────────────────────────────
  async function addFeed() {
    if (!newUrl.trim()) return toast('Enter an RSS URL');
    const body = {
      name: newName?.trim() || new URL(newUrl).hostname,
      url: newUrl.trim(),
      defaultCategory: newCat || 'General',
    };
    const r = await fetch(`${api}/api/automation/feeds`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!r.ok) return toast('Failed to add feed');
    setNewUrl(''); setNewName('');
    await loadFeeds();
  }

  // ────────────────────────────────────────────────────────────────────────────
  // NEW: “Add” (enable auto) per feed row
  //      This is just a PATCH that sets enabled=true
  // ────────────────────────────────────────────────────────────────────────────
  async function enableFeed(id) {
    const r = await fetch(`${api}/api/automation/feeds/${id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ enabled: true }),
    });
    if (!r.ok) return toast('Failed to enable');
    await loadFeeds();
  }

  // Optionally allow disabling/removing too
  async function disableFeed(id) {
    const r = await fetch(`${api}/api/automation/feeds/${id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ enabled: false }),
    });
    if (!r.ok) return toast('Failed to disable');
    await loadFeeds();
  }

  async function removeFeed(id) {
    if (!confirm('Remove this feed?')) return;
    const r = await fetch(`${api}/api/automation/feeds/${id}`, { method: 'DELETE' });
    if (!r.ok) return toast('Failed to remove');
    await loadFeeds();
  }

  // ────────────────────────────────────────────────────────────────────────────
  // NEW: Run just one item end-to-end
  // ────────────────────────────────────────────────────────────────────────────
  async function runOne(itemId) {
    const r = await fetch(`${api}/api/automation/items/${itemId}/run`, { method: 'POST' });
    if (!r.ok) return toast('Run failed');
    toast('Processed! It will appear in Drafts shortly.');
    await loadItems();
    await loadDrafts();
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Mount: initial loads + polling for items
  // ────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    loadDrafts();
    loadFeeds();
    loadItems();

    // NEW: auto refresh the list (every 45s)
    pollRef.current = setInterval(loadItems, 45000);
    return () => clearInterval(pollRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ────────────────────────────────────────────────────────────────────────────
  // Render
  // ────────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: 20 }}>
      <h1 style={{ fontSize: 24, marginBottom: 16 }}>AI Drafts Review</h1>

      {/* FEED MANAGER */}
      <div style={{ border: '1px solid #eee', borderRadius: 8, padding: 16, marginBottom: 24 }}>
        <h3 style={{ marginTop: 0 }}>Feed Manager</h3>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          <input
            style={styles.input}
            placeholder="https://example.com/rss.xml"
            value={newUrl}
            onChange={e => setNewUrl(e.target.value)}
          />
          <input
            style={styles.input}
            placeholder="Optional name (shown as Source)"
            value={newName}
            onChange={e => setNewName(e.target.value)}
          />
          <select style={styles.input} value={newCat} onChange={e => setNewCat(e.target.value)}>
            <option>General</option>
            <option>Business</option>
            <option>Tech</option>
            <option>Sports</option>
            <option>World</option>
            <option>Entertainment</option>
          </select>
          <button style={styles.button} onClick={addFeed}>Add Feed</button>
        </div>

        <div style={{ fontSize: 12, color: '#555', marginBottom: 8 }}>
          Click <b>Add</b> next to a feed to subscribe it to auto-ingestion. New items will appear below automatically.
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px 160px', gap: 8, fontWeight: 600 }}>
          <div>URL</div><div>Category</div><div>Actions</div>
        </div>

        {feeds.map(f => (
          <div key={f._id} style={{ display: 'grid', gridTemplateColumns: '1fr 160px 160px', gap: 8, padding: '8px 0', borderTop: '1px solid #eee' }}>
            <div>
              <div style={{ fontWeight: 500 }}>{f.name || f.url}</div>
              <div style={{ fontSize: 12, color: '#666' }}>{f.url}</div>
            </div>
            <div>{f.defaultCategory || 'General'}</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {!f.enabled ? (
                <button style={styles.button} onClick={() => enableFeed(f._id)}>Add</button>
              ) : (
                <button style={styles.button} onClick={() => disableFeed(f._id)}>Added (Auto)</button>
              )}
              <button style={styles.button} onClick={() => removeFeed(f._id)}>Remove</button>
            </div>
          </div>
        ))}
      </div>

      {/* NEW: INCOMING ITEMS */}
      <div style={{ border: '1px solid #eee', borderRadius: 8, padding: 16, marginBottom: 24 }}>
        <h3 style={{ marginTop: 0 }}>Incoming Articles (auto)</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 220px 180px 120px', gap: 8, fontWeight: 600 }}>
          <div>Title</div><div>Source</div><div>Published</div><div>Actions</div>
        </div>

        {itemsLoading ? <div>Loading…</div> : (
          items.length === 0 ? <div style={{ padding: '8px 0' }}>No items yet.</div> : items.map(it => (
            <div key={it._id} style={{ display: 'grid', gridTemplateColumns: '1fr 220px 180px 120px', gap: 8, padding: '8px 0', borderTop: '1px solid #eee' }}>
              <div>
                <div style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {it.rawTitle || '(no title)'}
                </div>
                <div style={{ fontSize: 12, color: '#666', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {it.link}
                </div>
              </div>
              <div>{it.sourceName || '—'}</div>
              <div>{it.publishedAt ? new Date(it.publishedAt).toLocaleString() : '—'}</div>
              <div>
                <button style={styles.button} onClick={() => runOne(it._id)}>Run</button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* EXISTING Drafts table below remains as you have it */}
      {/* ... your existing Drafts list/editor/publish UI ... */}
    </div>
  );
}
