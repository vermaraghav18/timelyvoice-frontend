// frontend/src/components/sections/ListV1.jsx
import { Link } from "react-router-dom";

/**
 * ListV1 with whole-block scaling:
 * - Set `scale` to shrink/grow EVERYTHING (0.6 ≈ 40% smaller)
 * - `containerScale` controls the section width (matches Head v1)
 */
export default function ListV1({
  title = "More Headlines",
  moreLink,
  items = [],
  maxItems = 36,
  scale = 0.95,
  containerScale = 1, // 👈 new: match Head v1 width handling
}) {
  const list = Array.isArray(items) ? items.slice(0, maxItems) : [];

  const getThumb = (a) => {
    if (!a) return null;
    const src =
      a.imageUrl ||
      (typeof a.cover === "string" ? a.cover : a.cover?.url) ||
      a.thumbnailUrl ||
      a.image?.url ||
      null;
    const alt =
      a.imageAlt ||
      (typeof a.cover === "object" ? a.cover?.alt : "") ||
      a.title ||
      "";
    return src ? { src, alt } : null;
  };

  const sectionWidth = Math.round(860 * (containerScale || 1)); // same base as Head v1

  return (
    <section
      className="lv1"
      style={{ ["--s"]: scale, ["--section-w"]: `${sectionWidth}px` }}
    >
      <style>{`
        /* Container: same width as Head v1 */
        .lv1 {
          --s: 1;
          margin: 0 auto 30px auto;
          width: 100%;
          max-width: var(--section-w, 780px);
          box-sizing: border-box;
          overflow: hidden; /* prevent any sub-pixel overflow when scaling */
        }

        /* Scale layer */
        .lv1__scale {
          transform: scale(var(--s));
          transform-origin: top left;
          width: 100%;
          max-width: 100%;
        }

        /* Header */
        .lv1__head {
          display:flex; align-items:center; justify-content:space-between;
          margin-bottom:12px; padding-bottom:2px; 
        }
        .lv1__title {
          margin:0; font-size:0px; font-weight:700; letter-spacing:.2px;
          background: linear-gradient(90deg, #eeff00ff, #e5ff00ff);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .lv1__more { text-decoration:none; font-size:12px; font-weight:700; color:#1b4965; }

        /* Grid: always 2 columns on desktop/tablet */
        .lv1__grid {
          display:grid;
          grid-template-columns: repeat(2, minmax(0,1fr));
          gap:12px;
        }
        @media (max-width: 640px) {
          .lv1__grid { grid-template-columns: 1fr; }
        }

        /* Card */
        .lv1__row {
          display:grid; 
          grid-template-columns: 140px 1fr; 
          gap:8px; 
          align-items:flex-start;
          padding:10px; 
          border:1px solid #163955; 
          border-radius:4px; 
          background:#1B4965;           /* 💙 Deep blue background */
          text-decoration:none !important; 
          color:#ffffff;                 /* White text */
          min-height:88px; 
          box-sizing:border-box;
          transition: all 0.25s ease;
        }

        .lv1__row:hover { 
          background:#1D9A8E;            /* 💚 Brand teal hover */
          box-shadow:0 2px 6px rgba(0,0,0,0.25); 
          border-color:#1D9A8E;
        }

        .lv1__row:focus-visible { 
          outline:2px solid #1b4965; 
          outline-offset:1px; 
        }

        /* Thumb (16:9) */
        .lv1__thumb { 
          width:140px; 
          border-radius:3px; 
          overflow:hidden; 
          background:rgba(255,255,255,0.15); /* faint overlay look */
          flex-shrink:0; 
        }

        .lv1__thumb-inner { position:relative; width:100%; padding-top:56.25%; }
        .lv1__thumb img, .lv1__ph { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; display:block; }
        .lv1__ph { background:#e9eef3; }

        /* Text */
        .lv1__text { min-width:0; }
        .lv1__headline {
          margin:0 0 10px 0; 
          font-size:13px; 
          line-height:1.3; 
          font-weight:400;
          color:#ffffff;                /* White headline */
          display:block; 
          overflow-wrap:anywhere; 
          hyphens:auto;
        }

        .lv1__meta {
          font-size:12px; 
          line-height:1.1; 
          color:#e8f0f2;                /* Light grayish-white meta */
          white-space:nowrap; 
          overflow:hidden; 
          text-overflow:ellipsis;
        }

        /* Mobile */
        @media (max-width: 640px) {
          .lv1__row { 
            grid-template-columns: 96px 1fr; 
            gap:10px; 
            padding:10px; 
            min-height:72px; 
          }
          .lv1__thumb { width:96px; }
          .lv1__headline { font-size:15px; }
          .lv1__meta { font-size:11px; }
        }
      `}</style>

      <div className="lv1__scale">
        <div className="lv1__head">
          <h2 className="lv1__title">{title}</h2>
          {moreLink ? <Link className="lv1__more" to={moreLink}>More</Link> : null}
        </div>

        <div className="lv1__grid">
          {list.map((a, i) => {
            const key = a?.id || a?._id || a?.slug || i;
            const cat = typeof a?.category === "string" ? a.category : a?.category?.name || "";
            const time = a?.publishedAt
              ? new Date(a.publishedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
              : "";
            const href = a?.slug ? `/article/${a.slug}` : "#";
            const thumb = getThumb(a);

            return (
              <Link to={href} className="lv1__row" key={key}>
                <div className="lv1__thumb">
                  <div className="lv1__thumb-inner">
                    {thumb ? (
                      <img src={thumb.src} alt={thumb.alt} loading="lazy" />
                    ) : (
                      <div className="lv1__ph" aria-hidden="true" />
                    )}
                  </div>
                </div>

                <div className="lv1__text">
                  <h3 className="lv1__headline">{a?.title || "Untitled"}</h3>
                  <div className="lv1__meta">
                    {time && <span>{time}</span>}
                    {a?.author && <> • <span>{a.author}</span></>}
                    {cat && <> • <span>{cat}</span></>}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
