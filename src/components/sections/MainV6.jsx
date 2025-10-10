// frontend/src/components/sections/MainV6.jsx
import { Link } from "react-router-dom";
import "./mainV6.css";

/**
 * MainV6 — Two-column cluster
 * Column layout:
 *  - Optional column heading
 *  - Lead card: image on TOP, headline BELOW
 *  - 5 mini rows: title LEFT, thumb RIGHT
 * Notes:
 *  - Provide two headings via section.title = "Left|Right" (optional).
 *  - Expects at least 2 items; uses up to 12 (6 per column).
 */
export default function MainV6({
  title = "",              // "Left|Right" headings (optional)
  items = [],
  containerMax,            // override width: sets --main-col-width
}) {
  if (!Array.isArray(items) || items.length === 0) return null;

  // Split title into left/right headings if provided as "Left|Right"
  let leftHeading = "", rightHeading = "";
  if (title && title.includes("|")) {
    const [l, r] = title.split("|");
    leftHeading = (l || "").trim();
    rightHeading = (r || "").trim();
  }

  // Partition items: 6 per column (1 lead + 5 minis)
  const leftItems = items.slice(0, 6);
  const rightItems = items.slice(6, 12);

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
      a.title || "image";
    return { src, alt };
  };

  const hrefOf = (a) => (a?.slug ? `/article/${a.slug}` : a?.url || "#");

  const Col = ({ heading = "", arr = [] }) => {
    if (!arr.length) return null;
    const lead = arr[0];
    const minis = arr.slice(1, 6);

    const { src: leadSrc, alt: leadAlt } = pickImg(lead);

    return (
      <div className="m6__col">
        {heading ? <div className="m6__colHead">{heading}</div> : null}

        {/* Lead card */}
        <Link to={hrefOf(lead)} className="m6__lead">
          <div className="m6__leadMedia">
            {leadSrc ? <img src={leadSrc} alt={leadAlt} loading="lazy" /> : <div className="ph" />}
          </div>
          <h3 className="m6__leadTitle">{lead?.title}</h3>
        </Link>

        {/* Minis list */}
        <div className="m6__list">
          {minis.map((a, i) => {
            const { src, alt } = pickImg(a);
            return (
              <Link key={a.id || a._id || i} to={hrefOf(a)} className="m6__row">
                <div className="m6__rowText">{a.title}</div>
                <div className="m6__rowThumb">
                  {src ? <img src={src} alt={alt} loading="lazy" /> : <div className="ph" />}
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    );
  };

  const widthStyle =
    typeof containerMax === "number"
      ? { ["--main-col-width"]: `${containerMax}px` }
      : undefined;

  return (
    <section className="m6 section-full">
      <div className="m6__inner" style={widthStyle}>
        <div className="m6__grid">
          <Col heading={leftHeading} arr={leftItems} />
          <Col heading={rightHeading} arr={rightItems} />
        </div>
      </div>
    </section>
  );
}
