// frontend/src/utils/seo.js
export function setSeoForArticle(article, options = {}) {
  const {
    siteName = "The Timely Voice",
    origin = "https://timelyvoice.com",
    logoUrl = `${origin}/logo.png`,
  } = options;

  const url = `${origin}/article/${article.slug}`;
  const img = article.imageUrl;

  // <title>
  document.title = `${article.title} – ${siteName}`;

  // helper: upsert <meta> by name or property
  const upsertMeta = (attr, key, value) => {
    let el = document.head.querySelector(`meta[${attr}="${key}"]`);
    if (!el) {
      el = document.createElement("meta");
      el.setAttribute(attr, key);
      el.setAttribute("data-managed-by", "seo-util");
      document.head.appendChild(el);
    }
    el.setAttribute("content", value);
    return el;
  };

  // helper: upsert <link rel="canonical">
  const upsertCanonical = (href) => {
    let el = document.head.querySelector(`link[rel="canonical"]`);
    if (!el) {
      el = document.createElement("link");
      el.setAttribute("rel", "canonical");
      el.setAttribute("data-managed-by", "seo-util");
      document.head.appendChild(el);
    }
    el.setAttribute("href", href);
    return el;
  };

  // Open Graph / Twitter
  upsertMeta("property", "og:type", "article");
  upsertMeta("property", "og:title", article.title);
  upsertMeta("property", "og:url", url);
  if (img) upsertMeta("property", "og:image", img);

  upsertMeta("name", "twitter:card", img ? "summary_large_image" : "summary");
  upsertMeta("name", "twitter:title", article.title);
  if (img) upsertMeta("name", "twitter:image", img);

  // Canonical
  upsertCanonical(url);

  // JSON-LD <script>
  const scriptId = "jsonld-newsarticle";
  let script = document.head.querySelector(`#${scriptId}`);
  if (!script) {
    script = document.createElement("script");
    script.type = "application/ld+json";
    script.id = scriptId;
    script.setAttribute("data-managed-by", "seo-util");
    document.head.appendChild(script);
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    "headline": article.title,
    "image": img ? [img] : undefined,
    "author": { "@type": "Person", "name": article.authorName || siteName },
    "publisher": {
      "@type": "Organization",
      "name": siteName,
      "logo": { "@type": "ImageObject", "url": logoUrl }
    },
    "datePublished": new Date(article.publishedAt).toISOString(),
    "dateModified": new Date(article.updatedAt || article.publishedAt).toISOString(),
    "mainEntityOfPage": { "@type": "WebPage", "@id": url }
  };

  script.textContent = JSON.stringify(jsonLd);

  // return a cleanup that removes what we added
  return () => {
    [...document.head.querySelectorAll("[data-managed-by='seo-util']")].forEach(n => n.remove());
    const s = document.getElementById(scriptId);
    if (s) s.remove();
  };
}
