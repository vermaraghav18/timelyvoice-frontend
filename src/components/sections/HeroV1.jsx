// frontend/src/components/sections/HeroV1.jsx
import { Link } from "react-router-dom";
import "./sections.common.css";

export default function HeroV1({ title, items = [], moreLink }) {
  const a = items[0];
  if (!a) return null;

  // choose link target
  const to = a.slug ? `/article/${a.slug}` : "#";

  return (
    <section className="sec-wrap sec-compact hero-v1" style={{ margin: "24px 0" }}>
      {title ? (
        <div className="sec-head">
          <h2 className="sec-title">{title}</h2>
          {moreLink ? (
            <Link to={moreLink} className="sec-more">
              More →
            </Link>
          ) : null}
        </div>
      ) : null}

      <Link to={to} style={{ textDecoration: "none", color: "inherit" }}>
        <div
          className="hero-v1__card"
          style={{
            position: "relative",
            borderRadius: 12,
            overflow: "hidden",
            background: "#111",
          }}
        >
          {/* Responsive aspect ratios:
              - mobile: 1:1
              - tablet: 4:3
              - desktop: 16:9
           */}
          <div
            className="hero-v1__media"
            style={{
              width: "100%",
              aspectRatio: "1 / 1",
            }}
          >
            {a.imageUrl ? (
              <img
                src={a.imageUrl}
                alt={a.imageAlt || a.title || ""}
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                loading="lazy"
              />
            ) : (
              <div style={{ width: "100%", height: "100%", background: "#222" }} />
            )}
          </div>

          {/* gradient overlay */}
          <div
            className="hero-v1__overlay"
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(0deg, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.25) 40%, rgba(0,0,0,0.0) 70%)",
            }}
          />

          {/* text block */}
          <div
            className="hero-v1__text"
            style={{
              position: "absolute",
              left: 16,
              right: 16,
              bottom: 16,
              color: "#fff",
              textShadow: "0 1px 2px rgba(0,0,0,0.5)",
            }}
          >
            <h3 style={{ margin: "0 0 8px", fontSize: 24, lineHeight: 1.2 }}>{a.title}</h3>
            {a.summary ? (
              <p style={{ margin: "0 0 10px", fontSize: 15, lineHeight: 1.5, opacity: 0.95 }}>
                {a.summary}
              </p>
            ) : null}
            <small style={{ opacity: 0.9 }}>
              {a.author ? a.author : "—"}{" "}
              {a.publishedAt ? " • " + new Date(a.publishedAt).toLocaleString() : ""}
            </small>
          </div>
        </div>
      </Link>

      {/* simple responsive CSS (scoped by class names) */}
      <style>{`
        @media (min-width: 640px) { /* ~tablet */
          .hero-v1__media { aspect-ratio: 4 / 3; }
          .hero-v1__text h3 { font-size: 28px; }
        }
        @media (min-width: 1024px) { /* desktop */
          .hero-v1__media { aspect-ratio: 16 / 9; }
          .hero-v1__text h3 { font-size: 32px; }
        }
        .hero-v1__card:hover .hero-v1__overlay {
          background: linear-gradient(0deg, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.3) 40%, rgba(0,0,0,0.0) 70%);
        }
      `}</style>
    </section>
  );
}
