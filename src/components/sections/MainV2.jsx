// frontend/src/components/sections/MainV2.jsx
import { useState } from "react";
import { Link } from "react-router-dom";
import "./mainV2.css";

/**
 * MainV2 — left: badge/headline/byline/dek; right: 16:9 image.
 * Outer wrapper spans grid, INNER box has the purple background and width cap.
 */
export default function MainV2({
  title = "",
  items = [],
  moreLink = "",
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

  const linkFor = (a) => (a?.slug ? `/article/${a.slug}` : a?.url || "#");
  const formatDek = (t = "", max = 220) => {
    const s = String(t || "").replace(/\s+/g, " ").trim();
    return s.length > max ? s.slice(0, max - 1) + "…" : s;
  };

  const badgeText =
    lead?.badge ||
    (typeof lead?.category === "string" ? lead?.category : lead?.category?.name) ||
    title ||
    "";
  const byline = lead?.author ? `By ${lead.author}` : "";

  const { src: leadSrc, alt: leadAlt } = pickImg(lead);
  const [imgOk, setImgOk] = useState(true);

  return (
    <section className="mainv2 section-full">
      {/* Inner box now holds background + width cap */}
      <div className="mainv2__inner">
        <div className="mainv2__grid">
          <div className="mainv2__text">
            {badgeText ? <div className="mainv2__badge">{badgeText}</div> : null}

            {lead?.title ? (
              <h1 className="mainv2__headline">
                <Link to={linkFor(lead)}>{lead.title}</Link>
              </h1>
            ) : null}

            {byline ? <div className="mainv2__byline">{byline}</div> : null}

            {lead?.summary ? (
              <p className="mainv2__dek">{formatDek(lead.summary, 240)}</p>
            ) : null}
          </div>

          <Link to={linkFor(lead)} className="mainv2__media" aria-label={lead?.title || "lead"}>
            {imgOk && leadSrc ? (
              <img
                src={leadSrc}
                alt={leadAlt}
                loading="lazy"
                decoding="async"
                className="mainv2__img"
                onError={() => setImgOk(false)}
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="mainv2__imgPh" />
            )}
          </Link>
        </div>

        {moreLink ? (
          <div className="mainv2__moreRow">
            <Link to={moreLink} className="mainv2__more">More →</Link>
          </div>
        ) : null}
      </div>
    </section>
  );
}
