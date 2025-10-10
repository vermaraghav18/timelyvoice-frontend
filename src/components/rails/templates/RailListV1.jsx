// frontend/src/components/rails/templates/RailListV1.jsx
import { Link } from "react-router-dom";

export default function RailListV1({ title = "Trending", items = [], config = {} }) {
  const showDate = config.showDate !== false;

  return (
    <section className="rail rail--listv1">
      <div className="rail__head">
        <h3 className="rail__title">{title}</h3>
      </div>

      <div className="rail__list">
        {items.map((a, i) => {
          const key = a.id || a._id || a.slug || i;
          const img =
            a.imageUrl ||
            (typeof a.cover === "string" ? a.cover : a.cover?.url) ||
            a.thumbnailUrl ||
            a.image?.url ||
            "";
        const when = a.publishedAt
            ? new Date(a.publishedAt).toLocaleDateString()
            : "";

          return (
            <Link to={`/article/${a.slug}`} className="rail__row" key={key}>
              <div className="rail__thumb">
                {img ? (
                  <img src={img} alt={a.imageAlt || a.title || ""} loading="lazy" />
                ) : (
                  <div className="rail__ph" aria-hidden="true" />
                )}
              </div>
              <div className="rail__text">
                <div className="rail__headline">{a.title}</div>
                {showDate && when ? <div className="rail__meta">{when}</div> : null}
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
