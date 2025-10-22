// frontend/src/components/sections/MainV1.jsx
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import "./mainV1.css";

/**
 * MainV1
 * - Skips the first `startAfter` items, then renders: lead + 3 minis.
 * - Minis show TITLE (left) and IMAGE (right).
 */

// smart link for internal/external URLs
function SmartLink({ to, children, ...rest }) {
  const href = String(to || "");
  const isExternal = /^https?:\/\//i.test(href);
  if (isExternal) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" {...rest}>
        {children}
      </a>
    );
  }
  return (
    <Link to={href} {...rest}>
      {children}
    </Link>
  );
}

export default function MainV1({
  title = "LIVE",
  items = [],
  moreLink,
  // tuning knobs
  containerMax = 1140,
  heroImgHeight = 280,
  tileMinHeight = 72,
  // NEW: how many newest items to skip (e.g., 8 to start at the 9th)
  startAfter = 0,
}) {
  // ---------- helpers ----------
  const toHttps = (url = "") => {
    if (!url) return "";
    // keep data: and blob: untouched
    if (/^(data:|blob:)/i.test(url)) return url;
    if (url.startsWith("//")) return "https:" + url;
    if (
      typeof window !== "undefined" &&
      window.location.protocol === "https:" &&
      url.startsWith("http:")
    )
      return url.replace(/^http:/, "https:");
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
    src = toHttps(src);
    return { src, alt };
  };

  const linkFor = (a) => (a?.slug ? `/article/${a.slug}` : a?.url || "#");

  // ---------- data ----------
  const safeStart = Math.max(0, Number(startAfter) || 0);
  const pool = Array.isArray(items) ? items.slice(safeStart) : [];
  if (pool.length === 0) return null;

  const lead = pool[0] || null;
  const minis = pool.slice(1, 4);

  const { src: leadSrc, alt: leadAlt } = pickImg(lead);
  const [imgOk, setImgOk] = useState(true);

  // reset hero image fallback when source changes
  useEffect(() => {
    setImgOk(true);
  }, [leadSrc]);

  // ---------- render ----------
  return (
    <section className="mainv1 section-full">
      <div
        className="mainv1__inner mainv1__inner--right"
        style={{
          maxWidth: `${containerMax}px`,
          ["--mv1-max"]: `${containerMax}px`,
          ["--mv1-hero-h"]: `${heroImgHeight}px`,
          ["--mv1-tile-min"]: `${tileMinHeight}px`,
        }}
      >
        {/* Header */}
        <div className="mainv1__header">
          <div className="mainv1__label">
            <span className="dot" />
            <span>{title}</span>
          </div>
          {moreLink ? (
            <SmartLink className="mainv1__more" to={moreLink}>
              More →
            </SmartLink>
          ) : null}
        </div>

        {/* Hero */}
        <div className="mainv1__hero">
          {/* Text */}
          <div className="mainv1__heroText">
            {lead?.title ? (
              <SmartLink to={linkFor(lead)} className="mainv1__h1">
                {lead.title}
              </SmartLink>
            ) : null}
            {lead?.summary ? <p className="mainv1__dek">{lead.summary}</p> : null}
          </div>

          {/* Image */}
          <SmartLink
            to={linkFor(lead)}
            className="mainv1__heroImgWrap"
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
                onError={() => setImgOk(false)}
              />
            ) : (
              <div className="mainv1__imgFallback" />
            )}
          </SmartLink>
        </div>

        {/* Minis: title left, image right */}
        {minis.length > 0 && (
          <div className="mainv1__miniGrid">
            {minis.map((it, idx) => {
              const { src, alt } = pickImg(it);
              return (
                <SmartLink
                  key={it?.id || it?._id || it?.slug || idx}
                  to={linkFor(it)}
                  className="mainv1__mini"
                  style={{ minHeight: `${tileMinHeight}px` }}
                >
                  <div className="mainv1__miniText">
                    <div className="mainv1__miniTitle">{it?.title || ""}</div>
                  </div>
                  {src ? (
                    <img
                      src={src}
                      alt={alt}
                      className="mainv1__miniImg"
                      loading="lazy"
                      decoding="async"
                      referrerPolicy="no-referrer"
                    />
                  ) : null}
                </SmartLink>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
