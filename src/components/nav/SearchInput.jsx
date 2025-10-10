// src/components/nav/SearchInput.jsx
import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export default function SearchInput({ placeholder = 'Search…' }) {
  const [q, setQ] = useState('');
  const navigate = useNavigate();
  const loc = useLocation();

  const submit = () => {
    const v = q.trim();
    if (!v) return;
    const replace = loc.pathname.startsWith('/search');
    navigate(`/search?q=${encodeURIComponent(v)}`, { replace });
  };

  const wrap = { position: 'relative' };
  const input = {
    width: '100%',
    background: '#fff',
    color: '#0f172a',
    borderRadius: 999,
    padding: '12px 14px 12px 42px',
    border: '1px solid transparent',
    outline: 'none',
    boxShadow: 'inset 0 0 0 999px rgba(0,0,0,0)', // trick for smoother focus
  };
  const inputFocus = {
    border: '1px solid #4cc3ff',
    boxShadow: '0 0 0 3px rgba(76,195,255,0.25)',
  };
  const icon = {
    position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
    width: 20, height: 20, color: '#94a3b8',
  };

  return (
    <div style={wrap}>
      {/* search icon */}
      <svg viewBox="0 0 24 24" fill="none" style={icon}>
        <path d="M21 21l-4.2-4.2M17 10.5a6.5 6.5 0 11-13 0 6.5 6.5 0 0113 0z"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>

      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
        placeholder={placeholder}
        style={input}
        onFocus={(e) => Object.assign(e.currentTarget.style, inputFocus)}
        onBlur={(e) => Object.assign(e.currentTarget.style, { border: '1px solid transparent', boxShadow: 'inset 0 0 0 999px rgba(0,0,0,0)' })}
      />
    </div>
  );
}
