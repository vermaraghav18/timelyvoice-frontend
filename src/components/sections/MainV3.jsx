// frontend/src/components/sections/MainV3.jsx
import { useState } from "react";
import { Link } from "react-router-dom";
import "./mainV3.css";

/**
 * MainV3 — Centered story hero:
 * - Small kicker top (uppercase, centered)
 * - BIG centered headline
 * - Byline centered
 * - Short centered dek
 * - Wide image below (full inner width), 3:2-ish
 * - Width-capped to main column; pushes sidebar down
 */
export default function MainV3({
  items = [],
  title = "",          // fallback if kicker absent
  moreLink = "",       // rarely used for this pattern
}) {
  if (!Array.isArray(items) || items.length === 0) return null;

  const lead = items[0];

  // utils
  const toHttps = (url = "") => {
    if (!url) return "";
    if (url.startsWith("//")) return "https:" + url;
    if (typeof window !== "undefined" && window.location.protocol === "https:" && url.startsWith("http:")) {
      return url.replace(/^http:/, "https:");
    }
    return url;
  };

  const pickImg = (a = {}) => {
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

    return { src: toHttps(src), alt };
  };

  const kicker =
    lead?.kicker ||
    lead?.badge ||
    (typeof lead?.category === "string" ? lead?.category : lead?.category?.name) ||
    title ||
    "";

  const byline = lead?.author || lead?.byline || "";

  const { src: imgSrc, alt: imgAlt } = pickImg(lead);
  const [imgOk, setImgOk] = useState(true);

  const linkFor = (a) => (a?.slug ? `/article/${a.slug}` : a?.url || "#");

  return (
    <section className="m3 section-full">
      <div className="m3__inner">
        {/* Optional thin rule above kicker to match the ref */}
        <div className="m3__rule" aria-hidden="true" />

        {kicker ? <div className="m3__kicker">{kicker}</div> : null}

        {lead?.title ? (
          <h1 className="m3__headline">
            <Link to={linkFor(lead)}>{lead.title}</Link>
          </h1>
        ) : null}

        {byline ? (
          <div className="m3__byline">
            By <span className="m3__author">{byline}</span>
          </div>
        ) : null}

        {lead?.summary ? (
          <p className="m3__dek">{lead.summary}</p>
        ) : null}

        {imgOk && imgSrc ? (
          <Link to={linkFor(lead)} className="m3__media" aria-label={lead?.title || "lead"}>
            <img
              src={imgSrc}
              alt={imgAlt}
              className="m3__img"
              loading="lazy"
              decoding="async"
              onError={() => setImgOk(false)}
              referrerPolicy="no-referrer"
            />
          </Link>
        ) : null}
      </div>
    </section>
  );
}
