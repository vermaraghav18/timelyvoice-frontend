import { useEffect, useState } from 'react';
import { api, styles } from '../../App.jsx';

export default function CommentsPage() {
  const [status, setStatus] = useState('pending');
  const [items, setItems] = useState([]);

  async function load() {
    const { data } = await api.get(`/api/admin/comments?status=${status}`);
    setItems(data || []);
  }
  useEffect(() => { load(); }, [status]);

  async function act(id, action) {
    await api.patch(`/api/admin/comments/${id}`, { action });
    load();
  }

  return (
    <AdminShell active="comments">
      <h1>Comments</h1>
      <div style={{ margin: '12px 0' }}>
        <select value={status} onChange={e=>setStatus(e.target.value)}>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="spam">Spam</option>
          <option value="all">All</option>
        </select>
      </div>

      {items.map(c => (
        <div key={c._id} style={styles.card}>
          <div style={{ fontWeight: 600 }}>{c.authorName}</div>
          <div style={{ color: '#666', fontSize: 12 }}>{new Date(c.createdAt).toLocaleString()}</div>
          <div style={{ marginTop: 8, whiteSpace: 'pre-wrap' }}>{c.content}</div>
          <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
            <button onClick={() => act(c._id, 'approved')} style={styles.button}>Approve</button>
            <button onClick={() => act(c._id, 'pending')} style={styles.button}>Pending</button>
            <button onClick={() => act(c._id, 'spam')} style={styles.button}>Spam</button>
            <button onClick={() => act(c._id, 'delete')} style={styles.button} disabled>Delete (use trash icon if you add route)</button>
          </div>
        </div>
      ))}
    </AdminShell>
  );
}
