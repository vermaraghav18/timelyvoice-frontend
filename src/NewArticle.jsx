import { useState } from 'react';
import axios from 'axios';

export default function NewArticle({ onCreated }) {
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [author, setAuthor] = useState('');
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      const res = await axios.post('/api/articles', { title, summary, author, body });
      onCreated?.(res.data);
      setTitle(''); setSummary(''); setAuthor(''); setBody('');
    } catch (e) {
      setError('Failed to save article');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} style={{ border: '1px solid #eee', borderRadius: 12, padding: 16, marginBottom: 16 }}>
      <h3 style={{ marginTop: 0 }}>Create Article</h3>
      {error && <div style={{ color: 'crimson', marginBottom: 8 }}>{error}</div>}
      <input placeholder="Title" value={title} onChange={e=>setTitle(e.target.value)} required style={{ width: '100%', padding: 8, marginBottom: 8 }} />
      <input placeholder="Summary" value={summary} onChange={e=>setSummary(e.target.value)} required style={{ width: '100%', padding: 8, marginBottom: 8 }} />
      <input placeholder="Author" value={author} onChange={e=>setAuthor(e.target.value)} required style={{ width: '100%', padding: 8, marginBottom: 8 }} />
      <textarea placeholder="Body" value={body} onChange={e=>setBody(e.target.value)} required rows={6} style={{ width: '100%', padding: 8, marginBottom: 8 }} />
      <button disabled={saving}>{saving ? 'Saving…' : 'Publish'}</button>
    </form>
  );
}
