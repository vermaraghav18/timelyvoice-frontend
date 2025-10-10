// frontend/src/components/rails/templates/RailListV2.jsx
import { Link } from "react-router-dom";

export default function RailListV2({ title = "Top Stories", items = [], config = {} }) {
  const showNumbers = config.showNumbers !== false;

  return (
    <section className="rail rail--listv2">
      <div className="rail__head">
        <h3 className="rail__title">{title}</h3>
      </div>

      <ol className="rail__list rail__list--numbered">
        {items.map((a, i) => {
          const key = a.id || a._id || a.slug || i;
          const when = a.publishedAt
            ? new Date(a.publishedAt).toLocaleDateString()
            : "";

          return (
            <li className="rail__row rail__row--numbered" key={key}>
              {showNumbers ? <span className="rail__num">{i + 1}</span> : null}
              <Link to={`/article/${a.slug}`} className="rail__numtext">
                <div className="rail__headline">{a.title}</div>
                {when ? <div className="rail__meta">{when}</div> : null}
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
