// frontend/src/pages/admin/TickerAdmin.jsx
import { useEffect, useMemo, useState } from 'react';
import { api, styles, removeManagedHeadTags, upsertTag } from '../../App.jsx';

const TYPE_OPTIONS = [
  { value: 'note', label: 'Note' },
  { value: 'stock', label: 'Stock' },
  { value: 'weather', label: 'Weather' },
];

export default function TickerAdmin() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const [form, setForm] = useState({
    type: 'note',
    label: '',
    value: '',
    order: 0,
    active: true,
  });

  const sorted = useMemo(
    () => [...items].sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || (b.createdAt || '').localeCompare(a.createdAt || '')),
    [items]
  );

  const load = () => {
    setLoading(true);
    setErr('');
    api.get('/ticker', { params: { all: 1 }, validateStatus: () => true })
      .then(res => setItems(Array.isArray(res.data) ? res.data : []))
      .catch(e => setErr(e?.response?.data?.message || e?.message || 'Failed to load ticker'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    removeManagedHeadTags();
    upsertTag('title', {}, { textContent: 'Admin — Ticker' });
    load();
  }, []);

  const onCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErr('');
    try {
      const payload = {
        type: form.type,
        label: String(form.label || '').trim(),
        value: String(form.value || '').trim(),
        order: Number(form.order) || 0,
        active: !!form.active,
      };
      if (!payload.label || !payload.value) throw new Error('Label and value are required');
      await api.post('/ticker', payload, { validateStatus: () => true });
      setForm({ type: 'note', label: '', value: '', order: 0, active: true });
      load();
    } catch (e) {
      setErr(e?.response?.data?.message || e?.message || 'Failed to create ticker item');
    } finally {
      setSaving(false);
    }
  };

  const onUpdate = async (id, patch) => {
    setErr('');
    try {
      await api.patch(`/ticker/${id}`, patch, { validateStatus: () => true });
      load();
    } catch (e) {
      setErr(e?.response?.data?.message || e?.message || 'Failed to update ticker item');
    }
  };

  const onDelete = async (id) => {
    if (!confirm('Delete this ticker item?')) return;
    setErr('');
    try {
      await api.delete(`/ticker/${id}`, { validateStatus: () => true });
      load();
    } catch (e) {
      setErr(e?.response?.data?.message || e?.message || 'Failed to delete ticker item');
    }
  };

  const bump = (id, dir) => {
    const current = items.find(i => i._id === id);
    if (!current) return;
    const newOrder = (Number(current.order) || 0) + (dir === 'up' ? -1 : 1);
    onUpdate(id, { order: newOrder });
  };

  return (
    <main style={styles.page}>
      <h1>Ticker</h1>
      <p style={styles.muted}>Manage the header ticker (stocks / weather / notes).</p>

      {err && (
        <div style={{ ...styles.card, borderColor: '#fee2e2', background: '#fff1f2', color: '#991b1b' }}>
          {err}
        </div>
      )}

      {/* Create form */}
      <form onSubmit={onCreate} style={{ ...styles.card, display: 'grid', gap: 8 }}>
        <div style={{ display: 'grid', gap: 8, gridTemplateColumns: '160px 1fr 1fr 160px 140px' }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600 }}>Type</label>
            <select
              value={form.type}
              onChange={(e) => setForm(s => ({ ...s, type: e.target.value }))}
              style={{ ...styles.input, marginBottom: 0 }}
            >
              {TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600 }}>Label</label>
            <input
              style={{ ...styles.input, marginBottom: 0 }}
              value={form.label}
              onChange={(e) => setForm(s => ({ ...s, label: e.target.value }))}
              placeholder="e.g., NIFTY / Delhi / AQI"
              required
            />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600 }}>Value</label>
            <input
              style={{ ...styles.input, marginBottom: 0 }}
              value={form.value}
              onChange={(e) => setForm(s => ({ ...s, value: e.target.value }))}
              placeholder="e.g., +0.7% / 35°C / Moderate"
              required
            />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600 }}>Order</label>
            <input
              type="number"
              style={{ ...styles.input, width: '100%', marginBottom: 0 }}
              value={form.order}
              onChange={(e) => setForm(s => ({ ...s, order: e.target.value }))}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'end', gap: 12 }}>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <input
                type="checkbox"
                checked={!!form.active}
                onChange={(e) => setForm(s => ({ ...s, active: e.target.checked }))}
              />
              Active
            </label>
            <button disabled={saving} style={{ ...styles.button, marginLeft: 'auto' }}>
              {saving ? 'Creating…' : 'Create'}
            </button>
          </div>
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
          <p className="opacity-70">No ticker items yet.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="min-w-full" style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
              <thead>
                <tr style={{ textAlign: 'left' }}>
                  <th style={{ padding: 10, width: 120 }}>Type</th>
                  <th style={{ padding: 10 }}>Label</th>
                  <th style={{ padding: 10 }}>Value</th>
                  <th style={{ padding: 10, width: 100 }}>Active</th>
                  <th style={{ padding: 10, width: 100 }}>Order</th>
                  <th style={{ padding: 10, width: 180 }}></th>
                </tr>
              </thead>
              <tbody>
                {sorted.map(row => (
                  <tr key={row._id} style={{ borderTop: '1px solid #eee' }}>
                    <td style={{ padding: 10 }}>{row.type}</td>
                    <td style={{ padding: 10 }}>{row.label}</td>
                    <td style={{ padding: 10 }}>{row.value}</td>
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
                          value={row.order ?? 0}
                          onChange={(e) => onUpdate(row._id, { order: e.target.value })}
                          style={{ ...styles.input, width: 90, margin: 0 }}
                        />
                      </div>
                    </td>
                    <td style={{ padding: 10 }}>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          onClick={() => {
                            const nLabel = prompt('Edit label', row.label || '');
                            if (nLabel == null) return;
                            const nValue = prompt('Edit value', row.value || '');
                            if (nValue == null) return;
                            onUpdate(row._id, { label: nLabel, value: nValue });
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
