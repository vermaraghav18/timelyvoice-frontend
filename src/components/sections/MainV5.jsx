import { useState } from "react";
import { Link } from "react-router-dom";
import "./mainV5.css";

/**
 * MainV5 — Dark hero:
 *  - Large white headline, small uppercase byline, grey summary
 *  - Big hero image full inner width (16:9)
 *  - Bottom row: 2 mini cards (thumb LEFT, title RIGHT)
 *  - Width aligns with left column and pushes sidebar down
 */
export default function MainV5({
  items = [],
  title = "",             // optional kicker (unused in screenshot)
  containerMax,           // optional px to override --main-col-width
}) {
  if (!Array.isArray(items) || items.length === 0) return null;

  const lead = items[0];
  const minis = items.slice(1, 3);

  const toHttps = (u = "") => {
    if (!u) return "";
    if (u.startsWith("//")) return "https:" + u;
    if (typeof window !== "undefined" && window.location.protocol === "https:" && u.startsWith("http:"))
      return u.replace(/^http:/, "https:");
    return u;
  };

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
      a.title || a.headline || "image";
    return { src: toHttps(src), alt };
  };

  const linkFor = (a) => (a?.slug ? `/article/${a.slug}` : a?.url || "#");
  const { src: heroSrc, alt: heroAlt } = pickImg(lead);
  const [imgOk, setImgOk] = useState(true);

  const widthStyle =
    typeof containerMax === "number" ? { ["--main-col-width"]: `${containerMax}px` } : undefined;

  const byline = lead?.author || lead?.byline || "";
  const summary = lead?.summary || lead?.dek || lead?.excerpt || "";

  return (
    <section className="mainv5 section-full">
      <div className="mainv5__inner" style={widthStyle}>
        {/* Text block */}
        <div className="mainv5__text">
          {lead?.title ? (
            <h1 className="mainv5__headline">
              <Link to={linkFor(lead)}>{lead.title}</Link>
            </h1>
          ) : null}

          {byline ? <div className="mainv5__byline">BY {byline}</div> : null}

          {summary ? <p className="mainv5__dek">{summary}</p> : null}
        </div>

        {/* Big hero media */}
        {imgOk && heroSrc ? (
          <Link to={linkFor(lead)} className="mainv5__media" aria-label={lead?.title || "lead"}>
            <img
              src={heroSrc}
              alt={heroAlt}
              className="mainv5__img"
              loading="lazy"
              decoding="async"
              onError={() => setImgOk(false)}
              referrerPolicy="no-referrer"
            />
          </Link>
        ) : null}

        {/* Bottom two minis */}
        {minis.length > 0 ? (
          <div className="mainv5__miniRow">
            {minis.map((a, i) => {
              const { src, alt } = pickImg(a);
              return (
                <Link key={a.id || a._id || i} to={linkFor(a)} className="mainv5__mini">
                  <div className="mainv5__miniThumb">
                    {src ? <img src={src} alt={alt} loading="lazy" /> : <div className="ph" />}
                  </div>
                  <div className="mainv5__miniBody">
                    <h4 className="mainv5__miniTitle">{a.title}</h4>
                    <div className="mainv5__miniMeta">{a.author || a.byline || ""}</div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : null}
      </div>
    </section>
  );
}
