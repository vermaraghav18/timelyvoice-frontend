import { Link } from "react-router-dom";
import "./main_v9.css";

/* choose best image you have */
const pickImg = (a = {}) =>
  a?.imageUrl || a?.ogImage || a?.heroUrl || a?.thumbUrl || null;

function SmallRow({ a }) {
  const img = pickImg(a);
  return (
    <article className="mv9-small">
      <div className="mv9-small__text">
        <Link to={`/article/${a.slug}`} className="mv9-small__title">
          {a.title}
        </Link>
      </div>
      {img && (
        <Link to={`/article/${a.slug}`} className="mv9-small__thumb" aria-hidden>
          <img src={img} alt="" loading="lazy" />
        </Link>
      )}
    </article>
  );
}

/* FEATURE LEFT: title → summary → big image */
function FeatureLeft({ a }) {
  if (!a) return null;
  const img = pickImg(a);
  return (
    <article className="mv9-feature mv9-feature--left">
      <header className="mv9-feature__head">
        <h2 className="mv9-feature__h">
          <Link
            to={`/article/${a.slug}`}
            className="mv9-feature__title mv9-badge"
            aria-label={a.title}
          >
            {a.title}
          </Link>
        </h2>
        {/* removed source line */}
      </header>
      {a.summary ? <p className="mv9-feature__summary">{a.summary}</p> : null}
      {img && (
        <Link
          to={`/article/${a.slug}`}
          className="mv9-feature__media"
          aria-label={a.title}
        >
          <img src={img} alt={a.imageAlt || a.title || ""} loading="lazy" />
        </Link>
      )}
    </article>
  );
}

/* FEATURE RIGHT (vertical): title → image → summary */
function FeatureRight({ a }) {
  if (!a) return null;
  const img = pickImg(a);
  return (
    <article className="mv9-feature mv9-feature--right">
      <h2 className="mv9-feature__h">
        <Link
          to={`/article/${a.slug}`}
          className="mv9-feature__title mv9-feature__title--top mv9-badge"
          aria-label={a.title}
        >
          {a.title}
        </Link>
      </h2>
      {img && (
        <Link to={`/article/${a.slug}`} className="mv9-feature__media mv9-feature__media--tight" aria-label={a.title}>
          <img src={img} alt={a.imageAlt || a.title || ""} loading="lazy" />
        </Link>
      )}
      {a.summary ? <p className="mv9-feature__summary">{a.summary}</p> : null}
    </article>
  );
}

export default function MainV9({ section }) {
  const items = Array.isArray(section?.items) ? section.items.slice(0, 8) : [];
  if (items.length < 8) return null; // enforce layout contract

  const [a1, a2, a3, a4, a5, a6, a7, a8] = items;

  return (
    <section className="mv9">
      {/* Top 3 small rows */}
      <div className="mv9-top">
        <SmallRow a={a1} />
        <SmallRow a={a2} />
        <SmallRow a={a3} />
      </div>

      {/* Two big features */}
      <div className="mv9-mid">
        <FeatureLeft a={a7} />
        <FeatureRight a={a8} />
      </div>

      {/* Bottom 3 small rows */}
      <div className="mv9-bot">
        <SmallRow a={a4} />
        <SmallRow a={a5} />
        <SmallRow a={a6} />
      </div>
    </section>
  );
}
