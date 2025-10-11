// frontend/src/components/sections/TopV2.jsx
import { Link } from "react-router-dom";
import AspectImage from "../AspectImage.jsx";
import "./TopV2.css";

function pickImg(a = {}) {
  const c = a.cover;
  return a.imageUrl || (typeof c === "string" ? c : c?.url) || "";
}

export default function TopV2({ section, items = {}, custom = {} }) {
  const hero = (items.hero || [])[0] || null;
  const sideStack = items.sideStack || [];
  const belowGrid = items.belowGrid || [];
  const trending = items.trending || [];

  return (
    <section className="topv2">
      <div className="topv2-row">
        <div className="topv2-main">
          {hero ? (
            <article className="topv2-hero">
              <Link to={`/news/${hero.slug}`} className="topv2-hero-title">
                {hero.title}
              </Link>
              {pickImg(hero) ? (
                <AspectImage ratio="16/9" src={pickImg(hero)} alt={hero.title} />
              ) : null}
              {hero.summary ? (
                <p className="topv2-hero-summary">{hero.summary}</p>
              ) : null}
            </article>
          ) : null}
        </div>

        <aside className="topv2-side">
          {sideStack.map((a) => (
            <Link key={a._id || a.id || a.slug} to={`/news/${a.slug}`} className="topv2-side-item">
              {pickImg(a) ? (
                <div className="topv2-side-thumb">
                  <AspectImage ratio="1/1" src={pickImg(a)} alt={a.title} />
                </div>
              ) : null}
              <div className="topv2-side-title">{a.title}</div>
            </Link>
          ))}
        </aside>
      </div>

      <div className="topv2-below">
        {belowGrid.map((a) => (
          <Link key={a._id || a.id || a.slug} to={`/news/${a.slug}`} className="topv2-card">
            {pickImg(a) ? <AspectImage ratio="16/9" src={pickImg(a)} alt={a.title} /> : null}
            <div className="topv2-card-title">{a.title}</div>
          </Link>
        ))}
      </div>

      <aside className="topv2-trending">
        <h3 className="topv2-trending-title">{custom?.trending?.panelTitle ?? "Trending"}</h3>
        <div className="topv2-trending-list">
          {trending.map((a) => (
            <Link key={a._id || a.id || a.slug} to={`/news/${a.slug}`} className="topv2-trending-item">
              <div className="topv2-trending-text">{a.title}</div>
            </Link>
          ))}
        </div>
      </aside>
    </section>
  );
}
