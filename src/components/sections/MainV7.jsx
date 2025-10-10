import { Link } from "react-router-dom";
import "./mainV7.css";

/**
 * MainV7 — Hero (image LEFT, headline RIGHT) + 6 cards.
 * Cards: fixed-ratio image on top, fixed-height caption BELOW (uniform total height).
 */
export default function MainV7({
  title = "",
  items = [],
  containerMax, // optional: override --main-col-width (px)
}) {
  if (!Array.isArray(items) || items.length === 0) return null;

  const hero = items[0];
  const cards = items.slice(1, 7);

  const pickImg = (a = {}) => {
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
  };

  const hrefOf = (a) => (a?.slug ? `/article/${a.slug}` : a?.url || "#");

  const { src: heroSrc, alt: heroAlt } = pickImg(hero);

  const styleWidth =
    typeof containerMax === "number"
      ? { ["--main-col-width"]: `${containerMax}px` }
      : undefined;

  return (
    <section className="m7 section-full">
      <div className="m7__inner" style={styleWidth}>
        {title ? <h2 className="m7__heading">{title}</h2> : null}

        {/* HERO */}
        <div className="m7__hero">
          <Link to={hrefOf(hero)} className="m7__heroMedia">
            {heroSrc ? <img src={heroSrc} alt={heroAlt} loading="lazy" /> : <div className="ph" />}
          </Link>
          <div className="m7__heroBody">
            <h1 className="m7__heroTitle">
              <Link to={hrefOf(hero)}>{hero?.title}</Link>
            </h1>
          </div>
        </div>

        {/* 6 CARDS */}
        <div className="m7__grid">
          {cards.map((a, i) => {
            const { src, alt } = pickImg(a);
            return (
              <Link key={a.id || a._id || i} to={hrefOf(a)} className="m7__card">
                <div className="m7__cardMedia">
                  {src ? <img src={src} alt={alt} loading="lazy" /> : <div className="ph" />}
                </div>
                <div className="m7__cardCaption">
                  <div className="m7__cardTitle">{a.title}</div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
