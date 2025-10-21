// frontend/src/components/sections/TechMainV1.jsx
import { Link } from "react-router-dom";
import "./techMainV1.css";

function hrefOf(a = {}) {
  return a?.slug ? `/article/${encodeURIComponent(a.slug)}` : a?.url || "#";
}
function imgOf(a = {}) {
  return (
    a.heroImage ||
    a.heroUrl ||
    a.socialImage ||
    a.imageUrl ||
    a.leadImage ||
    a.thumb ||
    a.thumbUrl ||
    a.cover?.url ||
    ""
  );
}
function when(a = {}) {
  const iso =
    a.updatedAt || a.publishedAt || a.publishAt || a.createdAt || a.date;
  if (!iso) return "";
  const d = new Date(iso);
  const diff = Math.max(0, (Date.now() - d.getTime()) / 1000);
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function TechMainV1({
  title = "Top Tech",
  items = [],
  moreLink = "",
}) {
  // defensive split (works even if plan sent fewer items)
  const hero = items[0] || null;
  const mids = items.slice(1, 3);
  const heads = items.slice(3, 9);

  const hasAnything = hero || mids.length || heads.length;
  if (!hasAnything) return null;

  return (
    <section className="tmv1">
      <header className="tmv1__header">
        <h2 className="tmv1__title">
          <span className="tmv1__titleDot" />
          {title || "Top Tech"}
        </h2>
        {moreLink ? (
          <Link className="tmv1__more" to={moreLink}>
            More
          </Link>
        ) : null}
      </header>

      <div className="tmv1__grid">
        {/* LEFT: HERO */}
        <div className="tmv1__left">
          {hero ? (
            <Link to={hrefOf(hero)} className="tmv1__hero">
              <figure className="tmv1__heroMedia">
                {imgOf(hero) ? (
                  <img
                    className="tmv1__img"
                    src={imgOf(hero)}
                    alt={hero?.imageAlt || hero?.title || ""}
                    loading="lazy"
                  />
                ) : (
                  <div className="tmv1__img tmv1__img--placeholder" />
                )}
              </figure>
              <div className="tmv1__heroText">
                <h3 className="tmv1__heroTitle">{hero?.title}</h3>
                {hero?.summary ? (
                  <p className="tmv1__heroSummary">{hero.summary}</p>
                ) : null}
                <div className="tmv1__meta">
                  <span>{hero?.author || "Desk"}</span>
                  <span>•</span>
                  <span>{when(hero)}</span>
                </div>
              </div>
            </Link>
          ) : null}
        </div>

        {/* MIDDLE: STACKED MIDS */}
        <div className="tmv1__mid">
          {mids.map((a, i) => (
            <Link to={hrefOf(a)} className="tmv1__midCard" key={a._id || a.id || a.slug || i}>
              <div className="tmv1__midMedia">
                {imgOf(a) ? (
                  <img
                    className="tmv1__img"
                    src={imgOf(a)}
                    alt={a?.imageAlt || a?.title || ""}
                    loading="lazy"
                  />
                ) : (
                  <div className="tmv1__img tmv1__img--placeholder" />
                )}
              </div>
              <div className="tmv1__midText">
                <h4 className="tmv1__midTitle">{a?.title}</h4>
                <div className="tmv1__meta">
                  <span>{a?.author || "Desk"}</span>
                  <span>•</span>
                  <span>{when(a)}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* RIGHT: HEADLINES LIST */}
        <aside className="tmv1__right">
          <div className="tmv1__rightHead">Top Headlines</div>
          <ul className="tmv1__list">
            {heads.map((a, i) => (
              <li className="tmv1__li" key={a._id || a.id || a.slug || i}>
                <Link to={hrefOf(a)} className="tmv1__liLink">
                  <span className="tmv1__liTitle">{a?.title}</span>
                </Link>
                <div className="tmv1__liMeta">
                  {a?.author || "—"} • {when(a)}
                </div>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </section>
  );
}
