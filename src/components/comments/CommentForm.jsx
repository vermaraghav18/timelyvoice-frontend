// src/components/comments/CommentForm.jsx
import { useState, useEffect } from 'react';
import { api, styles } from '../../App.jsx';
import { track } from '../../lib/analytics';

/** Detect mobile if parent doesn't pass isMobile */
function useIsMobileFallback(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth < breakpoint : false
  );
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < breakpoint);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [breakpoint]);
  return isMobile;
}

export default function CommentForm({
  slug,
  parentId = null,
  onSubmitted,
  isMobile: isMobileProp, // optional; parent can pass it
}) {
  const isMobile =
    typeof isMobileProp === 'boolean' ? isMobileProp : useIsMobileFallback(768);

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

  // ===== Styles =====
  const wrap = {
    marginTop: 12,
    background: 'transparent',
    borderRadius: 12,
    // side gutters so fields don't touch the card edge
    padding: isMobile ? '0 10px 10px' : '0 12px 12px',
    boxSizing: 'border-box',
  };

  // (kept for reference; not used after we switch to the pill heading)
  const title = {
    margin: '0 0 10px',
    color: '#ffffff',
    fontSize: isMobile ? 18 : 20,
    fontWeight: 700,
    letterSpacing: 0.2,
  };

  // NEW: pill heading + side lines (matches Keep Reading)
  const pillHeadingWrap = {
    margin: '8px 0 16px',
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
  };
  const lineStyle = {
    flex: '1',
    height: '2px',
    background: 'rgba(255,255,255,0.3)',
    maxWidth: '140px',
  };
  const pillHeading = {
    background: 'linear-gradient(135deg, #abcc16 0%, #9dff00 100%)', // Sports green
    color: '#000',
    fontWeight: 800,
    padding: isMobile ? '6px 14px' : '6px 16px',
    fontSize: isMobile ? 18 : 20,
    lineHeight: 1.2,
    borderRadius: 0,                          // no border radius
    boxShadow: '3px 3px 0 rgba(0,0,0,1)',     // solid shadow
    margin: 0,
    whiteSpace: 'nowrap',
  };

  const grid = {
    display: 'grid',
    gap: isMobile ? 10 : 12,
    gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
  };

  const fullRow = { gridColumn: isMobile ? 'auto' : '1 / -1' };

  const field = {
    width: '100%',
    boxSizing: 'border-box',
    background: '#0f1c44',
    color: '#ffffff',
    border: '1px solid #1e2a55',
    borderRadius: 10,
    padding: isMobile ? '10px 12px' : '12px 14px',
    fontSize: isMobile ? 14 : 16,
    lineHeight: 1.4,
    outline: 'none',
  };

  const textarea = {
    ...field,
    minHeight: isMobile ? 90 : 110,
    resize: 'vertical',
  };

  const btn = {
    background: busy ? '#3a5599' : '#2e6bff',
    color: '#ffffff',
    border: '1px solid rgba(255,255,255,.14)',
    borderRadius: 10,
    padding: isMobile ? '10px 14px' : '12px 16px',
    fontSize: isMobile ? 14 : 16,
    fontWeight: 700,
    cursor: busy ? 'not-allowed' : 'pointer',
    transition: 'transform .12s ease, box-shadow .12s ease, background .12s ease',
    boxShadow: busy ? 'none' : '0 8px 24px rgba(0,0,0,.25)',
  };

  const msgStyle = {
    marginTop: 8,
    color: '#e9edff',
    fontSize: isMobile ? 13 : 14,
  };

  return (
    <form onSubmit={submit} style={wrap}>
      {/* Heading: centered pill with side lines */}
      <div style={pillHeadingWrap}>
        <div style={lineStyle} />
        <h3 style={pillHeading}>Leave a comment</h3>
        <div style={lineStyle} />
      </div>

      {/* Responsive grid: name + email; textarea full width */}
      <div style={grid}>
        <input
          style={field}
          placeholder="Your name"
          value={authorName}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <input
          style={field}
          placeholder="Email (optional, never shown)"
          value={authorEmail}
          onChange={(e) => setEmail(e.target.value)}
        />
        <textarea
          style={{ ...textarea, ...fullRow }}
          placeholder="Write a comment…"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          required
        />
      </div>

      {/* Button */}
      <div style={{ marginTop: isMobile ? 10 : 12 }}>
        <button
          disabled={busy}
          style={btn}
          onMouseEnter={(e) => {
            if (!busy) e.currentTarget.style.background = '#3a7bff';
          }}
          onMouseLeave={(e) => {
            if (!busy) e.currentTarget.style.background = '#2e6bff';
          }}
        >
          {busy ? 'Submitting…' : 'Post Comment'}
        </button>
      </div>

      {msg && <div style={msgStyle}>{msg}</div>}
    </form>
  );
}
