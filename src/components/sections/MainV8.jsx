import { Link } from "react-router-dom";
import "./main_v8.css";

function pickImg(a = {}) {
  return a?.imageUrl || a?.ogImage || a?.heroUrl || a?.thumbUrl || null;
}

/* ------- Small list row (title + right thumb) ------- */
function ListRow({ a }) {
  const img = pickImg(a);
  return (
    <article className="mv8-row">
      <div className="mv8-row-text">
        <Link to={`/article/${a.slug}`} className="mv8-row-title">
          {a.title}
        </Link>
      </div>
      {img && (
        <Link to={`/article/${a.slug}`} className="mv8-row-thumb" aria-hidden>
          <img src={img} alt="" />
        </Link>
      )}
    </article>
  );
}

/* ------- Big lead card (image + pill title) ------- */
function LeadCard({ a }) {
  if (!a) return null;
  const img = pickImg(a);
  return (
    <article className="mv8-lead">
      {img && (
        <Link to={`/article/${a.slug}`} className="mv8-lead-media" aria-label={a.title}>
          <img src={img} alt={a.imageAlt || a.title || ""} />
        </Link>
      )}
      {/* removed the pill/tag title */}
    </article>
  );
}


/* ------- Single column (lead + list) ------- */
function Column({ lead, list }) {
  return (
    <div className="mv8-col">
      <LeadCard a={lead} />
      <div className="mv8-list">
        {list.map((a) => (
          <ListRow key={a.id || a._id || a.slug} a={a} />
        ))}
      </div>
    </div>
  );
}

/* ------- MainV8: two columns, no heading ------- */
export default function MainV8({ section }) {
  const items = Array.isArray(section?.items) ? section.items : [];
  if (items.length === 0) return null;

  // Column leads
  const lead1 = items[0] || null;
  const lead2 = items[1] || null;

  // Distribute remaining items across the two columns (balanced)
  const rest = items.slice(2);
  const col1List = [];
  const col2List = [];
  rest.forEach((a, i) => {
    (i % 2 === 0 ? col1List : col2List).push(a);
  });

  return (
    <section className="mv8 mv8--two">
      <Column lead={lead1} list={col1List} />
      <Column lead={lead2} list={col2List} />
    </section>
  );
}
