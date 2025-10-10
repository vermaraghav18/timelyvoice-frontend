import { Link } from "react-router-dom";
import "./sections.common.css";

function pickImg(a = {}) {
  const src =
    a.imageUrl ||
    (typeof a.cover === "string" ? a.cover : a.cover?.url) ||
    a.thumbnailUrl ||
    a.image?.url ||
    a.heroImage?.url ||
    a.featuredImage?.url ||
    a.thumb?.url ||
    a.media?.url ||
    a.enclosure?.url ||
    "";
  const alt =
    a.imageAlt ||
    (typeof a.cover === "object" ? a.cover?.alt : "") ||
    a.title ||
    "image";
  return { src, alt };
}

function hrefOf(a = {}) {
  return a?.slug ? `/article/${a.slug}` : a?.url || "#";
}

export default function CarouselSection({ title, items = [], moreLink }) {
  if (!Array.isArray(items) || items.length === 0) return null;

  return (
    <section className="sec-wrap sec-compact">
      {/* header */}
      <div className="sec-head">
        <h2 className="sec-title">{title}</h2>
        {moreLink ? (
          <Link className="sec-more" to={moreLink}>
            Explore »
          </Link>
        ) : null}
      </div>

      {/* horizontal scroller */}
      <div className="carousel-wrap">
        <div className="carousel-row">
          {items.map((a, idx) => {
            const { src, alt } = pickImg(a);
            const href = hrefOf(a);
            const cat =
              typeof a.category === "string"
                ? a.category
                : a.category?.name || a.section || "";

            return (
              <Link
                key={a.id || a._id || a.slug || idx}
                to={href}
                className="card grid-card"
                style={{
                  minWidth: 260,
                  textDecoration: "none",
                  color: "inherit",
                }}
                aria-label={a.title}
              >
                <div className="thumb">
                  {src ? (
                    <>
                      <img src={src} alt={alt} loading="lazy" decoding="async" />
                      {cat && <span className="tag-overlay">{cat}</span>}
                    </>
                  ) : (
                    <div className="thumb-ph" aria-hidden="true" />
                  )}
                </div>

                <div className="grid-card-title">{a.title}</div>

              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
