// frontend/src/components/sections/GridSection.jsx
import { Link } from "react-router-dom";
import "./sections.common.css";

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

export default function GridSection({ title, items = [], moreLink, columns = 3 }) {
  const list = items.slice(0, 9);

  return (
    <section className="sec-wrap sec-compact">{/* same width + left align as HeadV2 */}
      <div className="sec-head">
        <h2 className="sec-title">{title}</h2>
        {moreLink ? (
          <Link className="sec-more" to={moreLink}>
            View all »
          </Link>
        ) : null}
      </div>

      <div className="grid" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
        {list.map((a, idx) => (
          <Link
            key={a.id || a._id || a.slug || idx}
            to={`/article/${a.slug}`}
            className="card grid-card"
            style={{
              padding: 10,
              textDecoration: "none",
              color: "inherit",
            }}
          >
            <div className="thumb" style={{ height: 120, marginBottom: 8 }} />
            <div
              className="grid-card-title"
              style={{ fontWeight: 700, lineHeight: 1.2, minHeight: 44 }}
            >
              {a.title}
            </div>
            <div className="meta">
              {formatDate(a.publishedAt)} • {a.category || ""}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
