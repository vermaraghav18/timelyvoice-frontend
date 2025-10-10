// frontend/src/components/sections/FeatureV1.jsx
import { Link } from "react-router-dom";
import "./sections.common.css";

/**
 * Wide Feature (feature_v1)
 * Desktop: two columns (left image 16:9, right text)
 * Tablet/mobile: stacked (image on top, text below)
 * Fields: image, title, summary, author, publishedAt
 */
export default function FeatureV1({ title, items = [], moreLink }) {
  const a = items[0];
  if (!a) return null;

  const to = a.slug ? `/article/${a.slug}` : "#";

  return (
    <section className="sec-wrap sec-compact feature-v1" style={{ margin: "24px 0" }}>
      {/* Section header (shared) */}
      <div className="sec-head">
        {title ? <h2 className="sec-title">{title}</h2> : <div />}
        {moreLink ? (
          <Link to={moreLink} className="sec-more">
            More →
          </Link>
        ) : null}
      </div>

      <Link to={to} style={{ textDecoration: "none", color: "inherit" }}>
        <article
          className="feature-v1__card card grid-card"
          style={{
            display: "grid",
            gap: 16,
            gridTemplateColumns: "1fr",  // stacked by default
            overflow: "hidden",          // keep rounded media edges clean
          }}
        >
          {/* LEFT: image (responsive aspect) */}
          <div className="feature-v1__mediaWrap" style={{ position: "relative" }}>
            <div
              className="feature-v1__media"
              style={{ width: "100%", aspectRatio: "16 / 9", background: "#f2f2f2" }}
            >
              {a.imageUrl ? (
                <img
                  src={a.imageUrl}
                  alt={a.imageAlt || a.title || ""}
                  loading="lazy"
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                />
              ) : null}
            </div>
          </div>

          {/* RIGHT: text */}
          <div className="feature-v1__text" style={{ padding: 16 }}>
            <h3 style={{ margin: "0 0 8px", fontSize: 24, lineHeight: 1.25 }}>{a.title}</h3>
            {a.summary ? (
              <p style={{ margin: "0 0 10px", fontSize: 16, lineHeight: 1.6, color: "#111" }}>
                {a.summary}
              </p>
            ) : null}
            <small style={{ color: "#555" }}>
              {a.author ? a.author : "—"}
              {a.publishedAt ? " • " + new Date(a.publishedAt).toLocaleString() : ""}
            </small>
          </div>
        </article>
      </Link>

      {/* scoped styles */}
      <style>{`
        /* Tablet and up: two columns (image left ~56%, text right) */
        @media (min-width: 768px) {
          .feature-v1__card {
            grid-template-columns: 56% 1fr;
          }
          .feature-v1__text h3 { font-size: 28px; }
        }
        /* Desktop: slightly bigger title */
        @media (min-width: 1024px) {
          .feature-v1__text h3 { font-size: 30px; }
        }
        /* Hover: gentle zoom */
        .feature-v1__card:hover img {
          transform: scale(1.02);
          transition: transform 160ms ease;
        }
        img { transition: transform 160ms ease; }
      `}</style>
    </section>
  );
}
