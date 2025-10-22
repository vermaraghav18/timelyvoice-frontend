import React from "react";
import { Link } from "react-router-dom";
import "./TopV2.css";

function timeAgo(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const diff = Math.max(0, Date.now() - d.getTime());
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs > 1 ? "s" : ""} ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days > 1 ? "s" : ""} ago`;
}

function ArticleImage({ src, alt, className }) {
  if (!src) {
    return <div className={`topv2-img placeholder ${className || ""}`} aria-hidden="true" />;
  }
  return <img className={`topv2-img ${className || ""}`} src={src} alt={alt || ""} loading="lazy" />;
}

/** Build a correct article URL for this app */
function articleHref(slug) {
  if (!slug) return "#";
  if (/^https?:\/\//i.test(slug)) return slug;             // external
  if (slug.startsWith("/article/")) return slug;            // already correct
  if (slug.startsWith("/")) return `/article${slug}`;       // leading slash but no /article
  return `/article/${slug}`;                                // plain slug
}

export default function TopV2({ section }) {
  const items = section?.items || {};
  const hero = Array.isArray(items.hero) ? items.hero[0] : null;

  const bottomCards = Array.isArray(items.belowGrid) && items.belowGrid.length
    ? items.belowGrid
    : (Array.isArray(items.sideStack) ? items.sideStack : []);

  const heroHref = articleHref(hero?.slug);
  const heroTime = timeAgo(hero?.publishedAt);

  return (
    <section className="topv2">
      {section?.title ? (
        <h2 className="topv2-title">
          <span className="topv2-title-badge">{section.title}</span>
        </h2>
      ) : null}

      {hero ? (
        <div className="topv2-hero">
          {/* Left: text */}
          <div className="topv2-hero-text">
            {heroTime ? <div className="topv2-updated">{`UPDATED ${heroTime.toUpperCase()}`}</div> : null}
            <Link to={heroHref} className="topv2-hero-title">
              {hero.title || ""}
            </Link>
            <div className="topv2-hero-meta">The Timely Voice</div>
            {hero?.summary ? <p className="topv2-hero-summary">{hero.summary}</p> : null}
          </div>

          {/* Right: image */}
          <Link to={heroHref} className="topv2-hero-media">
            <ArticleImage src={hero?.imageUrl} alt={hero?.imageAlt || hero?.title} />
          </Link>
        </div>
      ) : null}

      {/* Bottom cards */}
      {bottomCards?.length ? (
        <div className="topv2-cards">
          {bottomCards.map((a) => {
            const href = articleHref(a?.slug);
            const ta = timeAgo(a?.publishedAt);
            return (
              <article className="topv2-card" key={a.id || a._id || a.slug}>
                <Link to={href} className="topv2-card-media">
                  {ta ? <span className="topv2-chip">{ta}</span> : null}
                  <ArticleImage src={a?.imageUrl} alt={a?.imageAlt || a?.title} />
                </Link>
                <Link to={href} className="topv2-card-title">
                  {a.title || ""}
                </Link>
              </article>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
