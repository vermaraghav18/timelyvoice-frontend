import { Link } from "react-router-dom";

export default function HomeHero({ article }) {
  if (!article) return null;

  const hasImage = !!article.imageUrl;
  return (
    <section style={{
      display: "grid",
      gridTemplateColumns: hasImage ? "1.2fr 1fr" : "1fr",
      gap: 16,
      marginBottom: 24,
      alignItems: "stretch"
    }}>
      {hasImage && (
        <Link to={`/article/${article.slug}`} style={{ display: "block" }}>
          <div className="ar-16x9">
            <img
              src={article.imageUrl}
              alt={article.imageAlt || article.title || ""}
              loading="eager"
            />
          </div>
        </Link>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <small style={{ color: "#1D9A8E", fontWeight: 700 }}>
          {article.category || "General"}
        </small>
        <Link to={`/article/${article.slug}`} style={{ color: "#212121", textDecoration: "none" }}>
          <h2 style={{ margin: 0, fontSize: 28, lineHeight: 1.2 }}>{article.title}</h2>
        </Link>
        <p style={{ margin: 0, color: "#4A4A4A" }}>{article.summary}</p>
        <small style={{ color: "#4A4A4A" }}>
          {article.publishedAt ? new Date(article.publishedAt).toLocaleString() : ""}
          {" • "}
          {article.author}
        </small>
      </div>
    </section>
  );
}
