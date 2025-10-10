// src/components/admin/TodayAnalyticsCard.jsx
import { useEffect, useState } from "react";
import { api, styles } from "../../App.jsx";
import { todayISO } from "../../lib/date.js";

function Stat({ label, value }) {
  return (
    <div style={{ padding: 12, border: '1px solid #eef1ef', borderRadius: 12, background: '#fafcff' }}>
      <div style={{ fontSize: 12, color: '#667085' }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, marginTop: 4 }}>{value ?? 0}</div>
    </div>
  );
}

function TopItem({ a }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8, padding: '8px 0', borderBottom: '1px dashed #eef1ef' }}>
      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {a?.title || a?.slug || '—'}
      </div>
      <div style={{ color: '#667085' }}>{a?.views ?? 0} views</div>
    </div>
  );
}

export default function TodayAnalyticsCard() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [rollup, setRollup] = useState(null);

  useEffect(() => {
    let ignore = false;
    (async () => {
      setLoading(true); setErr('');
      try {
        const date = todayISO();
        // force=1 to refresh counters instantly in dev
        const res = await api.get(`/analytics/rollup/daily`, { params: { date, force: 1 } });
        if (ignore) return;
        setRollup(res.data || {});
      } catch (e) {
        if (!ignore) setErr('Failed to load analytics');
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => { ignore = true; };
  }, []);

  const totals = rollup?.totals || {};
  const top = rollup?.topArticles || []; // if backend provides; otherwise empty

  return (
    <section style={{ ...styles.card, padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <h3 style={{ margin: 0 }}>Today</h3>
        <small style={{ color: '#667085' }}>{todayISO()}</small>
      </div>

      {loading && <div style={{ paddingTop: 8 }}>Loading…</div>}
      {err && <div style={{ color: 'crimson' }}>{err}</div>}

      {!loading && !err && (
        <>
          {/* Stats grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginTop: 12 }}>
            <Stat label="Page Views" value={totals?.page_view ?? totals?.pageViews ?? 0} />
            <Stat label="Read Complete" value={totals?.read_complete ?? 0} />
            <Stat label="Shares" value={(totals?.share || 0) + (totals?.share_copy || 0)} />
            <Stat label="Heartbeats" value={totals?.heartbeat ?? 0} />
            {/* Add more cards if your rollup exposes others */}
          </div>

          {/* Top Articles */}
          <div style={{ marginTop: 16 }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Top Articles (today)</div>
            {Array.isArray(top) && top.length > 0 ? (
              <div>
                {top.slice(0, 5).map((a, i) => <TopItem key={a.id || a.slug || i} a={a} />)}
              </div>
            ) : (
              <div style={{ color: '#667085' }}>No top articles yet.</div>
            )}
          </div>
        </>
      )}
    </section>
  );
}
