// src/lib/images.js
const FALLBACK_IMG = 'https://res.cloudinary.com/damjdyqj2/image/upload/f_auto,q_auto,w_640/news-images/defaults/fallback-hero';

export function cloudinaryFromPublicId(publicId, { width = 640 } = {}) {
  if (!publicId) return '';
  // Basic unsigned Cloudinary delivery URL. Adjust cloud name if needed.
  return `https://res.cloudinary.com/damjdyqj2/image/upload/f_auto,q_auto,w_${width}/${publicId}.jpg`;
}

/** Choose a safe image URL for an article-like object */
export function ensureRenderableImage(a) {
  if (!a || typeof a !== 'object') return FALLBACK_IMG;
  if (a.ogImage && /^https?:\/\//i.test(a.ogImage)) return a.ogImage;
  if (a.imagePublicId) return cloudinaryFromPublicId(a.imagePublicId, { width: 640 });
  if (a.imageUrl && /^https?:\/\//i.test(a.imageUrl)) return a.imageUrl;
  return FALLBACK_IMG;
}
