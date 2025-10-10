// frontend/src/components/HomeCategoryRow.jsx
import { Link } from "react-router-dom";

export default function HomeCategoryRow({ title, items = [], viewAllSlug }) {
  if (!items.length) return null;
  return (
    <section style={{ marginTop: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
        <h3 style={{ margin: 0 }}>{title}</h3>
        <Link to={`/category/${encodeURIComponent(viewAllSlug || title)}`} style={{ color: "#1D9A8E" }}>
          View all →
        </Link>
      </div>
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
        gap: 12
      }}>
        {items.map(a => (
          <Link key={a._id || a.id || a.slug} to={`/article/${a.slug}`} style={{ textDecoration: "none", color: "inherit" }}>
            <article style={{ border: "1px solid #e8eceb", borderRadius: 12, padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
              {a.imageUrl && (
                <img
                  src={a.imageUrl}
                  alt={a.imageAlt || a.title || ""}
                  style={{ width: "100%", aspectRatio: "16/9", objectFit: "cover", borderRadius: 8 }}
                  loading="lazy"
                />
              )}
              <div style={{ fontWeight: 600, lineHeight: 1.3 }}>{a.title}</div>
              <small style={{ color: "#4A4A4A" }}>
                {a.publishedAt ? new Date(a.publishedAt).toLocaleDateString() : ""}
              </small>
            </article>
          </Link>
        ))}
      </div>
    </section>
  );
}
