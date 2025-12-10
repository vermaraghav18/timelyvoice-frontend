// src/lib/images.js
// Central place for turning article image fields into a real <img src="...">

// This is your crest / default hero
const FALLBACK_IMG =
  "https://res.cloudinary.com/damjdyqj2/image/upload/f_auto,q_auto,w_640/news-images/defaults/fallback-hero";

// If you ever change Cloudinary cloud name, update here once.
const CLOUDINARY_CLOUD_NAME = "damjdyqj2";

/**
 * Build a Cloudinary URL from a publicId or path like
 *   "news-images/foo-bar"
 */
export function cloudinaryFromPublicId(publicId, { width = 640 } = {}) {
  if (!publicId) return "";
  const clean = String(publicId).replace(/^\/+/, "");
  return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload/f_auto,q_auto,w_${width}/${clean}.jpg`;
}

/**
 * Normalise any "maybe URL or maybe publicId" string:
 * - If it already starts with http/https → keep as is
 * - If it's a bare Cloudinary publicId → turn into full URL
 */
function normaliseMaybeUrl(value, width = 640) {
  if (!value) return "";
  const s = String(value).trim();
  if (!s) return "";

  if (/^https?:\/\//i.test(s)) return s;

  // Treat as a publicId / path inside Cloudinary
  const clean = s.replace(/^\/+/, "");
  return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload/f_auto,q_auto,w_${width}/${clean}`;
}

/**
 * Choose a safe image URL for any "article-like" object.
 *
 * We look in many places so that:
 * - old articles that only have cover.url work
 * - newer articles that only have imagePublicId work
 * - manual JSON payloads that filled imageUrl with a publicId work
 */
/**
 * Choose a safe image URL for any "article-like" object.
 *
 * We look in many places so that:
 * - newer articles that only have imagePublicId/imageUrl work
 * - old articles that only have cover.url work
 * - we AVOID Google Drive ogImage links that break <img>
 */
export function ensureRenderableImage(a) {
  if (!a || typeof a !== "object") return FALLBACK_IMG;

  const cover = a.cover || null;
  const seo = a.seo || {};

  const candidates = [];

  // 1) Cloudinary / main article image FIRST (this is what we want!)
  if (a.imagePublicId) {
    candidates.push(cloudinaryFromPublicId(a.imagePublicId, { width: 640 }));
  }

  if (a.imageUrl) {
    candidates.push(a.imageUrl);
  }

  // 2) SEO image fields (these might also be Cloudinary URLs)
  if (seo.ogImageUrl) candidates.push(seo.ogImageUrl);
  if (seo.imageUrl) candidates.push(seo.imageUrl);
  if (seo.image) candidates.push(seo.image);

  // 3) cover: can be string or { url, secure_url }
  if (typeof cover === "string") {
    candidates.push(cover);
  } else if (cover && typeof cover === "object") {
    if (cover.secure_url) candidates.push(cover.secure_url);
    if (cover.url) candidates.push(cover.url);
  }

  // 4) LAST: ogImage, but NEVER use Google Drive here
  if (
    a.ogImage &&
    !/drive\.google\.com/i.test(a.ogImage) // skip Drive links
  ) {
    candidates.push(a.ogImage);
  }

  // 5) First thing that we can turn into a URL
  for (const raw of candidates) {
    const url = normaliseMaybeUrl(raw, 640);
    if (url) return url;
  }

  return FALLBACK_IMG;
}
