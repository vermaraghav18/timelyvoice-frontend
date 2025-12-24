// src/lib/images.js
// Central place for turning article image fields into a real <img src="...">

// Default fallback image (always guaranteed to load)
const FALLBACK_IMG =
  "https://res.cloudinary.com/damjdyqj2/image/upload/f_auto,q_auto,w_640/news-images/defaults/fallback-hero";

// Cloudinary config
const CLOUDINARY_CLOUD_NAME = "damjdyqj2";

/**
 * Build a Cloudinary URL from a clean publicId
 * Example publicId: "news-images/foo-bar"
 */
export function cloudinaryFromPublicId(publicId, { width = 640 } = {}) {
  if (!publicId) return "";

  const clean = String(publicId)
    .trim()
    .replace(/^\/+/, "")              // remove leading slashes
    .replace(/\.[a-z0-9]+$/i, "");    // remove any extension (.jpg/.png)

  if (!clean) return "";

  return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload/f_auto,q_auto,w_${width}/${clean}.jpg`;
}

/**
 * Normalize anything that might be:
 * - a full URL
 * - a Cloudinary publicId
 *
 * Rules:
 * - NEVER allow Google Drive links (they break <img>)
 * - If it's already http(s), return as-is
 * - Otherwise treat it as a Cloudinary publicId
 */
function normaliseMaybeUrl(value, width = 640) {
  if (!value) return "";

  const s = String(value).trim();
  if (!s) return "";

  // ❌ Never render Google Drive images
  if (/drive\.google\.com/i.test(s)) return "";

  // ✅ Already a full URL
  if (/^https?:\/\//i.test(s)) return s;

  // ✅ Treat as Cloudinary publicId
  return cloudinaryFromPublicId(s, { width });
}

/**
 * Choose the safest possible image for an article
 * Works for:
 * - new articles
 * - old articles
 * - mixed / messy data
 */
export function ensureRenderableImage(a) {
  if (!a || typeof a !== "object") return FALLBACK_IMG;

  const cover = a.cover || null;
  const seo = a.seo || {};

  const candidates = [];

  /**
   * IMPORTANT ORDER (MOST RELIABLE → LEAST)
   */

  // 1️⃣ Explicit imageUrl (best & safest)
  if (a.imageUrl) {
    candidates.push(a.imageUrl);
  }

  // 2️⃣ Cloudinary publicId (only if it's NOT a URL)
  if (a.imagePublicId && typeof a.imagePublicId === "string") {
    const pid = a.imagePublicId.trim();
    if (pid && !/^https?:\/\//i.test(pid)) {
      candidates.push(cloudinaryFromPublicId(pid, { width: 640 }));
    }
  }

  // 3️⃣ SEO images
  if (seo.ogImageUrl) candidates.push(seo.ogImageUrl);
  if (seo.imageUrl) candidates.push(seo.imageUrl);
  if (seo.image) candidates.push(seo.image);

  // 4️⃣ cover field (legacy articles)
  if (typeof cover === "string") {
    candidates.push(cover);
  } else if (cover && typeof cover === "object") {
    if (cover.secure_url) candidates.push(cover.secure_url);
    if (cover.url) candidates.push(cover.url);
  }

  // 5️⃣ ogImage (LAST, and never Google Drive)
  if (a.ogImage && !/drive\.google\.com/i.test(a.ogImage)) {
    candidates.push(a.ogImage);
  }

  // Pick the first valid, renderable URL
  for (const raw of candidates) {
    const url = normaliseMaybeUrl(raw, 640);
    if (url) return url;
  }

  // Absolute fallback (never broken)
  return FALLBACK_IMG;
}
