import { useState } from 'react';
import { styles } from '../App.jsx';        // still uses the UI tokens from App
import { api } from '../lib/publicApi';     
import { track } from '../lib/analytics';

export default function NewsletterBanner({ variant='inline' }) {
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault(); setBusy(true); setMsg('');
    try {
      const { data } = await api.post('/newsletter/subscribe', { email });
      track('newsletter_subscribe', { variant });
      setMsg('Check your email to confirm your subscription. (Dev: token: ' + data.token + ')');
      setEmail('');
    } catch (err) {
      setMsg(err?.response?.data?.error || 'Failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} style={{ ...styles.card, background: '#fcfcff' }}>
      <div style={{ fontWeight: 700, marginBottom: 8 }}>Get top stories by email</div>
      <input type="email" required placeholder="you@example.com" value={email}
             onChange={e=>setEmail(e.target.value)} style={styles.input} />
      <button disabled={busy} style={styles.button}>{busy ? 'Submitting…' : 'Subscribe'}</button>
      {msg && <div style={{ marginTop: 8 }}>{msg}</div>}
    </form>
  );
}
