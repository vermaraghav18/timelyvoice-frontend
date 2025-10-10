// frontend/src/components/sections/MainV1.jsx
import { useState } from "react";
import { Link } from "react-router-dom";
import "./mainV1.css";

/**
 * MainV1 (compact, right-aligned)
 * - Spans full grid; inner content aligns RIGHT.
 * - Wider max width, reduced paddings & hero height.
 * - Image handling mirrors NewsHeadSection (imageUrl/cover/thumbnailUrl/image.url)
 *   + http→https normalization + onError fallback.
 * - 4 compact red tiles underneath the hero.
 */
export default function MainV1({
  title = "LIVE",
  items = [],
  moreLink,
  // tune without touching CSS:
  containerMax = 1140,
  heroImgHeight = 280,
  tileMinHeight = 72,
}) {
  if (!Array.isArray(items) || items.length === 0) return null;

  // ---------- helpers ----------
  const toHttps = (url = "") => {
    if (!url) return "";
    if (url.startsWith("//")) return "https:" + url;
    if (
      typeof window !== "undefined" &&
      window.location.protocol === "https:" &&
      url.startsWith("http:")
    ) {
      return url.replace(/^http:/, "https:");
    }
    return url;
  };

  const pickImg = (a = {}) => {
    // Same priority order as NewsHeadSection, with extras:
    let src =
      a.imageUrl ||
      (typeof a.cover === "string" ? a.cover : a.cover?.url) ||
      a.thumbnailUrl ||
      a.image?.url ||
      a.heroImage?.url ||
      a.heroImage ||
      a.featuredImage?.url ||
      a.featuredImage ||
      a.thumb?.url ||
      a.thumb ||
      a.enclosure?.url ||
      a.media?.url ||
      "";

    const alt =
      a.imageAlt ||
      (typeof a.cover === "object" ? a.cover?.alt : "") ||
      a.alt ||
      a.title ||
      a.headline ||
      "image";

    src = toHttps(src);
    return { src, alt };
  };

  const linkFor = (a) => (a?.slug ? `/article/${a.slug}` : a?.url || "#");

  // ---------- data ----------
  const lead = items[0] || null;
  const minis = items.slice(1, 4); // up to 4 tiles

  const { src: leadSrc, alt: leadAlt } = pickImg(lead);
  const [imgOk, setImgOk] = useState(true);

  // ---------- render ----------
  return (
    <section className="mainv1 section-full">
      {/* RIGHT-ALIGNED inner container */}
      <div
        className="mainv1__inner mainv1__inner--right"
        style={{ maxWidth: `${containerMax}px` }}
      >
        {/* Header row (label + more) */}
        <div className="mainv1__header">
          <div className="mainv1__label">
            <span className="dot" />
            <span>{title}</span>
          </div>
          {moreLink ? (
            <Link className="mainv1__more" to={moreLink}>
              More →
            </Link>
          ) : null}
        </div>

        {/* HERO ROW */}
        <div className="mainv1__hero">
          {/* Text left */}
          <div className="mainv1__heroText">
            {lead?.title ? (
              <Link to={linkFor(lead)} className="mainv1__h1">
                {lead.title}
              </Link>
            ) : null}

            {lead?.summary ? (
              <p className="mainv1__dek">{lead.summary}</p>
            ) : null}

            
          </div>

          {/* Image right */}
          <Link
            to={linkFor(lead)}
            className="mainv1__heroImgWrap"
            style={{ height: `${heroImgHeight}px` }}
            aria-label={lead?.title || "lead"}
          >
            {imgOk && leadSrc ? (
              <img
                src={leadSrc}
                alt={leadAlt}
                className="mainv1__heroImg"
                loading="lazy"
                decoding="async"
                referrerPolicy="no-referrer"
                onError={() => setImgOk(false)} // fallback if 404/mixed-content/CORS
              />
            ) : (
              <div className="mainv1__imgFallback" />
            )}
          </Link>
        </div>

        {/* MINI TILES */}
        {minis?.length > 0 ? (
          <div className="mainv1__miniGrid">
            {minis.map((it, idx) => {
              const { title: mt } = it || {};
              return (
                <Link
                  key={it?.id || it?._id || it?.slug || idx}
                  to={linkFor(it)}
                  className="mainv1__mini"
                  style={{ minHeight: `${tileMinHeight}px` }}
                >
                  
                  <div className="mainv1__miniTitle">{mt}</div>
                </Link>
              );
            })}
          </div>
        ) : null}
      </div>
    </section>
  );
}
