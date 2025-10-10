// CommentForm.jsx
import { useState } from 'react';
import { api, styles } from '../../App.jsx';
import { track } from '../../lib/analytics';

export default function CommentForm({ slug, parentId = null, onSubmitted }) {
  const [authorName, setName] = useState('');
  const [authorEmail, setEmail] = useState('');
  const [content, setContent] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setMsg('');
    try {
      const { data } = await api.post(
        `/api/public/articles/${encodeURIComponent(slug)}/comments`,
        { authorName, authorEmail, content, parentId }
      );

      // 🔔 analytics
      track('comment_submit', { slug, parent: !!parentId });

      setMsg(
        data.status === 'pending'
          ? 'Thanks! Your comment is awaiting moderation.'
          : 'Submitted.'
      );
      setName('');
      setEmail('');
      setContent('');
      onSubmitted?.();
    } catch (err) {
      setMsg(err?.response?.data?.error || 'Failed to submit.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} style={{ marginTop: 12 }}>
      <input
        style={styles.input}
        placeholder="Your name"
        value={authorName}
        onChange={(e) => setName(e.target.value)}
        required
      />
      <input
        style={styles.input}
        placeholder="Email (optional, never shown)"
        value={authorEmail}
        onChange={(e) => setEmail(e.target.value)}
      />
      <textarea
        style={{ ...styles.input, minHeight: 100 }}
        placeholder="Write a comment…"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        required
      />
      <button disabled={busy} style={{ ...styles.button }}>
        {busy ? 'Submitting…' : 'Post Comment'}
      </button>
      {msg && <div style={{ marginTop: 8 }}>{msg}</div>}
    </form>
  );
}
