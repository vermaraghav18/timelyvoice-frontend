// frontend/src/components/sections/MegaV1.jsx
import { Link } from "react-router-dom";

export default function MegaV1({
  title = "Breaking News",
  items = [],
  moreLink,
  scale = 0.92,
  containerMax = 650,
}) {
  if (!Array.isArray(items) || items.length === 0) return null;

  const pickImg = (a = {}) => {
    const src =
      a.imageUrl ||
      (typeof a.cover === "string" ? a.cover : a.cover?.url) ||
      a.thumbnailUrl ||
      a.image?.url ||
      "";
    const alt =
      a.imageAlt ||
      (typeof a.cover === "object" ? a.cover?.alt : "") ||
      a.title ||
      "";
    return { src, alt };
  };

  const hero = items[0];
  const subs = items.slice(1, 3);

  const heroImg = pickImg(hero);
  const heroHref = hero?.slug ? `/article/${hero.slug}` : "#";
  const when = hero?.publishedAt
    ? new Date(hero.publishedAt).toLocaleString()
    : "";

  return (
    <section
      className="mega-wrap"
      style={{ ["--mw"]: `${containerMax}px`, ["--ms"]: scale }}
    >
      <style>{`
        /* ===== Outer container ===== */
        .mega-wrap {
          width: 100%;
          max-width: var(--mw, 780px);
          margin: 0 0 30px 0;
          border: 1px solid #0000000c;
          border-radius: 2px;
          background: #ff0000ff;
          padding: 14px;
          box-sizing: border-box;
          overflow: hidden;
        }

        /* Scale */
        .mega-scale {
          transform: scale(var(--ms, 1));
          transform-origin: top left;
          width: calc(100% / var(--ms, 1));
        }

        /* Header */
        .mega-head {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 8px;
          margin-bottom: 10px;
          padding-bottom: 2px;
          border-bottom: 1.5px solid #ffffff;
        }
        .mega-title {
          margin: 0;
          font-size: 28px;
          font-weight: 900;
          background: linear-gradient(90deg, #ffffffff, #ffffffff);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .mega-more {
          text-decoration: none;
          color: #ffffffff;
          font-weight: 700;
          font-size: 14px;
          white-space: nowrap;
        }

        /* ===== HERO (text left, image right) ===== */
        .mega-hero {
          border: 0;
          border-radius: 2px;
          background: #940000ff;
          margin-bottom: 20px;

          display: grid;
          grid-template-columns: 1.1fr 1fr;
          gap: 14px;
          padding: 14px;
          align-items: start;
        }
        .mega-hero-left { min-width: 0; }
        .mega-hero-right { min-width: 0; }

        .mega-hero-title { margin: 0 0 8px 0; font-size: 26px; line-height: 1.25; }
        .mega-hero-title a { color: #ffffffff; text-decoration: none; }
        .mega-hero-summary { margin: 0 0 8px 0; color: #ffffffff; line-height: 1.6; }
        .mega-hero-meta { color: #ffffffff; font-size: 12px; }

        .mega-hero-media { display:block; background:#f3f4f6; border-radius: 2px; overflow: hidden; }
        .ratio { position: relative; width: 100%; }
        .ratio-4x3 { padding-top: 75%; }
        .ratio > img, .ratio > .ph {
          position: absolute; inset: 0;
          width: 100%; height: 100%;
          object-fit: cover;
          display: block;
        }

        /* ===== Subcards (2 across, with spacing + divider lines) ===== */
        .mega-strip {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
          position: relative;
          padding-top: 20px;       /* spacing before top line */
          padding-bottom: 20px;    /* spacing after bottom line */
          border-top: 1.5px solid #ffffff;
          border-bottom: 1.5px solid #ffffff;
        }

        /* middle divider */
        .mega-strip::before {
          content: "";
          position: absolute;
          top: 10px;
          bottom: 10px;
          left: 50%;
          width: 1.5px;
          background: #ffffff;
          transform: translateX(-50%);
          pointer-events: none;
        }

        .mega-card {
          border: 0;
          border-radius: 2px;
          overflow: hidden;
          background: #940000ff;
          text-decoration: none;
          color: inherit;

          display: grid;
          grid-template-columns: 120px 1fr;
          gap: 10px;
          align-items: center;
          padding: 10px;
        }

        .mega-card-thumb {
          width: 120px;
          height: 80px;
          border-radius: 2px;
          overflow: hidden;
          background: #ff0000ff;
          position: relative;
        }
        .mega-card-thumb img, .mega-card-thumb .ph {
          position: absolute; inset: 0;
          width: 100%; height: 100%; object-fit: cover;
        }

        .mega-card-title {
          margin: 0 0 6px 0;
          font-weight: 700;
          font-size: 15px;
          line-height: 1.3;
          color: #ffffff;
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .mega-card-date { color: #ffffffff; font-size: 12px; }

        /* Responsive */
        @media (max-width: 900px) {
          .mega-hero { grid-template-columns: 1fr; }
          .mega-hero-title { font-size: 22px; }
          .mega-strip { grid-template-columns: 1fr; padding: 10px 0; }
          .mega-strip::before { display: none; }
        }
      `}</style>

      <div className="mega-scale">
        {(title || moreLink) && (
          <div className="mega-head">
            {title ? <h3 className="mega-title">{title}</h3> : <span />}
            {moreLink ? <Link className="mega-more" to={moreLink}>More →</Link> : null}
          </div>
        )}

        {/* HERO */}
        <article className="mega-hero">
          <div className="mega-hero-left">
            <h2 className="mega-hero-title">
              <Link to={heroHref}>{hero?.title}</Link>
            </h2>
            {hero?.summary ? (
              <p className="mega-hero-summary">{hero.summary}</p>
            ) : null}
            <small className="mega-hero-meta">
              {hero?.author || ""}
              {(hero?.author && when) ? " • " : ""}
              {when}
            </small>
          </div>

          <div className="mega-hero-right">
            <Link to={heroHref} className="mega-hero-media" aria-label={heroImg.alt}>
              <div className="ratio ratio-4x3">
                {heroImg.src ? (
                  <img src={heroImg.src} alt={heroImg.alt} loading="lazy" />
                ) : (
                  <div className="ph" aria-hidden="true" />
                )}
              </div>
            </Link>
          </div>
        </article>

        {/* SUBCARDS */}
        {subs.length > 0 && (
          <div className="mega-strip">
            {subs.map((s) => {
              const href = s?.slug ? `/article/${s.slug}` : "#";
              const date = s?.publishedAt
                ? new Date(s.publishedAt).toLocaleDateString()
                : "";
              const img = pickImg(s);

              return (
                <Link key={s.id || s._id || s.slug} to={href} className="mega-card">
                  <div className="mega-card-thumb">
                    {img.src ? (
                      <img src={img.src} alt={img.alt} loading="lazy" />
                    ) : (
                      <div className="ph" aria-hidden="true" />
                    )}
                  </div>
                  <div className="mega-card-body">
                    <div className="mega-card-title">{s?.title}</div>
                    <small className="mega-card-date">{date}</small>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
