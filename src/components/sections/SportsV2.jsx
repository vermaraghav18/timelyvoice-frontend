import { Link } from "react-router-dom";
import "./sportsV2.css";

function hrefOf(a = {}) {
  return a?.slug ? `/article/${encodeURIComponent(a.slug)}` : a?.url || "#";
}

function pickImage(a = {}) {
  return (
    a.heroImage ||
    a.heroUrl ||
    a.socialImage ||
    a.imageUrl ||
    a.leadImage ||
    a.thumb ||
    a.thumbUrl ||
    a.ogImage ||
    ""
  );
}

function pickSummary(a = {}) {
  if (!a) return "";
  const raw =
    a.summary ||
    a.excerpt ||
    a.description ||
    a.seoDescription ||
    (typeof a.body === "string" ? a.body.replace(/<[^>]+>/g, "") : "");
  return String(raw || "").trim();
}

/**
 * SportsV2 — Two-column hero: image (left), title + summary (right)
 * Keeps both columns equal height and responsive.
 */
export default function SportsV2({ title = "", items = [], moreLink = "" }) {
  const it = items?.[0];
  if (!it) return null;

  const img = pickImage(it);
  const href = hrefOf(it);
  const headline = it.title || "Untitled";
  const summary = pickSummary(it);

  return (
    <section className="sports-v2">
      {title ? <h3 className="sports-v2__sectionTitle">{title}</h3> : null}

      <article className="sports-v2__wrap">
        {/* LEFT: Image */}
        <Link to={href} className="sports-v2__media" aria-label={headline}>
          {img ? (
            <img
              src={img}
              alt={it.imageAlt || headline}
              className="sports-v2__img"
              loading="lazy"
            />
          ) : (
            <div className="sports-v2__media--placeholder" />
          )}
        </Link>

        {/* RIGHT: Title + Summary */}
        <div className="sports-v2__content">
          <Link to={href} className="sports-v2__headlineLink">
            <h2 className="sports-v2__headline">{headline}</h2>
          </Link>

          {summary ? (
            <p className="sports-v2__summary">{summary}</p>
          ) : null}

          {moreLink ? (
            <div className="sports-v2__more">
              <Link to={moreLink} className="sports-v2__moreLink">
                See all Sports
              </Link>
            </div>
          ) : null}
        </div>
      </article>
    </section>
  );
}
