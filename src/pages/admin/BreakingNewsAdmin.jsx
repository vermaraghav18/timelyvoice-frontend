// frontend/src/pages/admin/BreakingNewsAdmin.jsx
import { useEffect, useMemo, useState } from 'react';
import { api, styles, removeManagedHeadTags, upsertTag } from '../../App.jsx';

export default function BreakingNewsAdmin() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ headline: '', url: '', active: true, priority: 0 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const sorted = useMemo(
    () => [...items].sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0) || (b.createdAt || '').localeCompare(a.createdAt || '')),
    [items]
  );

  const load = () => {
    setLoading(true);
    setErr('');
    api.get('/breaking', { params: { all: 1 }, validateStatus: () => true })
      .then(res => setItems(Array.isArray(res.data) ? res.data : []))
      .catch(e => setErr(e?.response?.data?.message || e?.message || 'Failed to load'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    removeManagedHeadTags();
    upsertTag('title', {}, { textContent: 'Admin — Breaking News' });
    load();
  }, []);

  const onCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErr('');
    try {
      const payload = {
        headline: form.headline.trim(),
        url: (form.url || '').trim(),
        active: !!form.active,
        priority: Number(form.priority) || 0,
      };
      if (!payload.headline) throw new Error('Headline is required');
      await api.post('/breaking', payload, { validateStatus: () => true });
      setForm({ headline: '', url: '', active: true, priority: 0 });
      load();
    } catch (e) {
      setErr(e?.response?.data?.message || e?.message || 'Failed to create');
    } finally {
      setSaving(false);
    }
  };

  const onUpdate = async (id, patch) => {
    setErr('');
    try {
      await api.patch(`/breaking/${id}`, patch, { validateStatus: () => true });
      load();
    } catch (e) {
      setErr(e?.response?.data?.message || e?.message || 'Failed to update');
    }
  };

  const onDelete = async (id) => {
    if (!confirm('Delete this breaking item?')) return;
    setErr('');
    try {
      await api.delete(`/breaking/${id}`, { validateStatus: () => true });
      load();
    } catch (e) {
      setErr(e?.response?.data?.message || e?.message || 'Failed to delete');
    }
  };

  const bump = (id, dir) => {
    const current = items.find(i => i._id === id);
    if (!current) return;
    const newPriority = (Number(current.priority) || 0) + (dir === 'up' ? -1 : 1);
    onUpdate(id, { priority: newPriority });
  };

  return (
    <main style={styles.page}>
      <h1>Breaking News</h1>
      <p style={styles.muted}>Manage the red “Breaking” strip in the header.</p>

      {err && <div className="mb-3" style={{ ...styles.card, borderColor: '#fee2e2', background: '#fff1f2', color: '#991b1b' }}>{err}</div>}

      {/* Create form */}
      <form onSubmit={onCreate} style={{ ...styles.card, display: 'grid', gap: 8 }}>
        <div>
          <label style={{ fontSize: 12, fontWeight: 600 }}>Headline</label>
          <input
            style={styles.input}
            value={form.headline}
            onChange={(e) => setForm(s => ({ ...s, headline: e.target.value }))}
            placeholder="e.g., Cyclone weakens after landfall; alerts remain in coastal areas"
            required
          />
        </div>
        <div>
          <label style={{ fontSize: 12, fontWeight: 600 }}>URL (optional)</label>
          <input
            style={styles.input}
            value={form.url}
            onChange={(e) => setForm(s => ({ ...s, url: e.target.value }))}
            placeholder="/article/cyclone-update" />
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="checkbox"
              checked={!!form.active}
              onChange={(e) => setForm(s => ({ ...s, active: e.target.checked }))}
            />
            Active
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            Priority
            <input
              type="number"
              value={form.priority}
              onChange={(e) => setForm(s => ({ ...s, priority: e.target.value }))}
              style={{ ...styles.input, width: 120, margin: 0 }}
            />
          </label>
          <button disabled={saving} style={{ ...styles.button }}>
            {saving ? 'Creating…' : 'Create'}
          </button>
        </div>
      </form>

      {/* List */}
      <section style={{ ...styles.card }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <h3 style={styles.h3}>All items</h3>
          <button onClick={load} style={styles.button}>Reload</button>
        </div>

        {loading ? (
          <p>Loading…</p>
        ) : sorted.length === 0 ? (
          <p className="opacity-70">No breaking items yet.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="min-w-full" style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
              <thead>
                <tr style={{ textAlign: 'left' }}>
                  <th style={{ padding: 10 }}>Headline</th>
                  <th style={{ padding: 10, width: 240 }}>URL</th>
                  <th style={{ padding: 10, width: 100 }}>Active</th>
                  <th style={{ padding: 10, width: 100 }}>Priority</th>
                  <th style={{ padding: 10, width: 180 }}></th>
                </tr>
              </thead>
              <tbody>
                {sorted.map(row => (
                  <tr key={row._id} style={{ borderTop: '1px solid #eee' }}>
                    <td style={{ padding: 10 }}>{row.headline}</td>
                    <td style={{ padding: 10, color: '#2563eb' }}>{row.url || '—'}</td>
                    <td style={{ padding: 10 }}>
                      <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                        <input
                          type="checkbox"
                          checked={!!row.active}
                          onChange={(e) => onUpdate(row._id, { active: e.target.checked })}
                        />
                        {row.active ? 'Active' : 'Hidden'}
                      </label>
                    </td>
                    <td style={{ padding: 10 }}>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <button title="Move up" onClick={() => bump(row._id, 'up')} style={styles.button}>↑</button>
                        <button title="Move down" onClick={() => bump(row._id, 'down')} style={styles.button}>↓</button>
                        <input
                          type="number"
                          value={row.priority ?? 0}
                          onChange={(e) => onUpdate(row._id, { priority: e.target.value })}
                          style={{ ...styles.input, width: 90, margin: 0 }}
                        />
                      </div>
                    </td>
                    <td style={{ padding: 10 }}>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          onClick={() => {
                            const h = prompt('Edit headline', row.headline || '');
                            if (h == null) return;
                            onUpdate(row._id, { headline: h });
                          }}
                          style={styles.button}
                        >
                          Edit
                        </button>
                        <button onClick={() => onDelete(row._id)} style={styles.danger}>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
