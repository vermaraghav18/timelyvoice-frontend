import { Link } from "react-router-dom";
import "./sections.common.css";

function t(iso) {
  try { return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }); }
  catch { return ""; }
}

export default function HeadV2({ title, items = [], moreLink }) {
  const [lead, ...rest] = items.slice(0, 5);

  return (
    <section className="sec-wrap sec-compact">{/* 👈 compact + left-aligned */}
      <div className="sec-head">
        <h2 className="sec-title">{title}</h2>
        {moreLink ? <Link className="sec-more" to={moreLink}>More {title} »</Link> : null}
      </div>

      {/* tighter columns */}
      <div className="grid" style={{ gridTemplateColumns: "1.35fr 1fr" }}>
        {/* Left: compact hero */}
        {lead ? (
          <Link
            to={`/article/${lead.slug}`}
            className="card"
            style={{ padding: 10, textDecoration: "none", color: "inherit" }}
          >
            <div className="thumb" style={{ height: 200, marginBottom: 8 }} /> {/* was 260 */}
            <div style={{ fontWeight: 800, fontSize: 18, lineHeight: 1.15 }}>{lead.title}</div> {/* was 20 */}
            <div className="meta">{t(lead.publishedAt)} • {lead.author || ""}</div>
          </Link>
        ) : (
          <div className="card" style={{ height: 260 }} />
        )}

        {/* Right: stacked list of 4 (smaller thumb + tighter text) */}
        <div className="grid" style={{ gridTemplateRows: "repeat(4, 1fr)", gap: 8 }}>
          {rest.slice(0, 4).map(a => (
            <Link
              key={a.id || a._id || a.slug}
              to={`/article/${a.slug}`}
              className="card"
              style={{
                padding: 8,
                textDecoration: "none",
                color: "inherit",
                display: "grid",
                gridTemplateColumns: "72px 1fr", /* was 80px */
                gap: 8
              }}
            >
              <div className="thumb" style={{ width: 72, height: 54 }} /> {/* was 80x64 */}
              <div>
                <div style={{ fontWeight: 700, lineHeight: 1.2, fontSize: 14 }} className="nowrap">{a.title}</div>
                <div className="meta">{t(a.publishedAt)} • {a.category || ""}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
