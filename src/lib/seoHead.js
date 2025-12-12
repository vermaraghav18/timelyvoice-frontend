// frontend/src/lib/seoHead.js

export function upsertTag(tagName, attrs = {}, { textContent } = {}) {
  if (!tagName || /[\[\]#.:]/.test(tagName)) {
    throw new Error(`upsertTag: tagName must be a bare tag (received "${tagName}")`);
  }

  const attrSelector = Object.entries(attrs)
    .map(([k, v]) => `[${k}="${String(v)}"]`)
    .join("");

  const selector = `${tagName}${attrSelector}`;
  let el = document.head.querySelector(selector);

  if (!el) {
    el = document.createElement(tagName);
    el.setAttribute("data-managed", "seo");
    document.head.appendChild(el);
  }

  Object.entries(attrs).forEach(([k, v]) => {
    if (v == null) el.removeAttribute(k);
    else el.setAttribute(k, String(v));
  });

  if (typeof textContent === "string") el.textContent = textContent;
  return el;
}

export function removeManagedHeadTags() {
  document.querySelectorAll('head [data-managed="seo"]').forEach((n) => n.remove());
}

/**
 * One-off JSON-LD (non-id)
 * Useful for pages where you want exactly one JSON-LD block.
 */
export function setJsonLd(obj) {
  document
    .querySelectorAll(
      'script[type="application/ld+json"][data-managed="seo"]:not([data-jsonld-id])'
    )
    .forEach((n) => n.remove());

  const s = document.createElement("script");
  s.type = "application/ld+json";
  s.setAttribute("data-managed", "seo");
  s.text = JSON.stringify(obj);
  document.head.appendChild(s);
}

/**
 * ID-based JSON-LD updater
 * Allows multiple JSON-LD blocks (site, breadcrumbs, article, org, etc.)
 * without duplicates.
 */
export function addJsonLd(id, obj) {
  const head = document.head;
  let s = head.querySelector(
    `script[type="application/ld+json"][data-managed="seo"][data-jsonld-id="${id}"]`
  );

  if (!s) {
    s = document.createElement("script");
    s.type = "application/ld+json";
    s.setAttribute("data-managed", "seo");
    s.setAttribute("data-jsonld-id", id);
    head.appendChild(s);
  }

  s.text = JSON.stringify(obj);
}

/**
 * Convenience breadcrumb JSON-LD
 * trail = [{ name, url }, ...]
 */
export function emitBreadcrumbs(trail = []) {
  const itemListElement = trail.map((c, i) => ({
    "@type": "ListItem",
    position: i + 1,
    name: c.name,
    item: c.url,
  }));

  addJsonLd("breadcrumbs", {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement,
  });
}

export function stripHtmlClient(s = "") {
  return String(s).replace(/<[^>]*>/g, "");
}

export function buildDescriptionClient(doc = {}) {
  const raw =
    (doc.summary && doc.summary.trim()) ||
    stripHtmlClient(doc.body || doc.bodyHtml || "").slice(0, 200);
  return String(raw).replace(/\s+/g, " ").slice(0, 160);
}

export function buildCanonicalFromLocation() {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const url = new URL(origin + window.location.pathname + window.location.search);

  [
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_term",
    "utm_content",
    "fbclid",
    "gclid",
  ].forEach((k) => url.searchParams.delete(k));

  url.hash = "";
  return url.toString();
}
