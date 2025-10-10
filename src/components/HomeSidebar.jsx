import { Link } from "react-router-dom";

export default function HomeSidebar({ items = [] }) {
  if (!items.length) return null;
  return (
    <aside style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <h3 style={{ margin: "8px 0" }}>Trending</h3>
      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 12 }}>
        {items.map((a) => (
          <li key={a._id || a.id || a.slug} style={{ display: "grid", gridTemplateColumns: a.imageUrl ? "84px 1fr" : "1fr", gap: 8 }}>
            {a.imageUrl && (
              <Link to={`/article/${a.slug}`}>
                <div className="ar-16x9" style={{ width: 84, height: 56, paddingTop: 0 }}>
                  <img
                    src={a.imageUrl}
                    alt={a.imageAlt || a.title || ""}
                    loading="lazy"
                  />
                </div>
              </Link>
            )}
            <div>
              <Link to={`/article/${a.slug}`} style={{ textDecoration: "none", color: "inherit" }}>
                <div style={{ fontWeight: 600, lineHeight: 1.3 }}>{a.title}</div>
              </Link>
              <small style={{ color: "#4A4A4A" }}>
                {a.publishedAt ? new Date(a.publishedAt).toLocaleDateString() : ""}
              </small>
            </div>
          </li>
        ))}
      </ul>
    </aside>
  );
}
