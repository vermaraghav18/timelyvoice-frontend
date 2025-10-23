import React from "react";
import "./m10.css";

/**
 * M10 section (two articles)
 * Props:
 *  a1: { title, summary, href, imageAlt, imageSrc }
 *  a2: { title, summary, href, imageAlt, imageSrc, bgTone }  // bgTone optional: 'white' | 'cream' | 'offwhite'
 *
 * Notes:
 * - Article 1 has transparent background; image occupies 70% of the area via grid rows (30/70).
 * - All headings are white. We add a text shadow for readability.
 */
export default function M10({ a1, a2 }) {
  // allow easy tweak of a2 background tone via CSS var
  const tone = (a2?.bgTone || "offwhite").toLowerCase();
  const toneValue =
    tone === "white" ? "#ffffff" :
    tone === "cream" ? "#fff4e0" :
    "#fffaf0"; // offwhite default

  return (
    <section
      className="m10"
      style={{ "--m10-offwhite": toneValue }}
    >
      {/* Article 1 */}
      <article className="m10-a1">
        <div className="m10-a1-meta">
          <h3 className="m10-title m10-title--shadow">
            {a1?.href ? <a href={a1.href} aria-label={a1.title}>{a1.title}</a> : a1?.title}
          </h3>
          {a1?.summary && <p className="m10-summary">{a1.summary}</p>}
        </div>

        <figure className="m10-a1-figure" aria-label={a1?.imageAlt || a1?.title}>
          {a1?.href ? (
            <a href={a1.href} aria-hidden="true" tabIndex={-1}>
              <img src={a1?.imageSrc} alt={a1?.imageAlt || ""} loading="lazy" />
            </a>
          ) : (
            <img src={a1?.imageSrc} alt={a1?.imageAlt || ""} loading="lazy" />
          )}
        </figure>
      </article>

      {/* Article 2 */}
      <article className="m10-a2">
        <h3 className="m10-title">
          {a2?.href ? <a href={a2.href} aria-label={a2.title}>{a2.title}</a> : a2?.title}
        </h3>

        <figure className="m10-a2-figure" aria-label={a2?.imageAlt || a2?.title}>
          {a2?.href ? (
            <a href={a2.href} aria-hidden="true" tabIndex={-1}>
              <img src={a2?.imageSrc} alt={a2?.imageAlt || ""} loading="lazy" />
            </a>
          ) : (
            <img src={a2?.imageSrc} alt={a2?.imageAlt || ""} loading="lazy" />
          )}
        </figure>

        {a2?.summary && <p className="m10-summary">{a2.summary}</p>}
      </article>
    </section>
  );
}
