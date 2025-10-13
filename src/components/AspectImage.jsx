// src/components/AspectImage.jsx
import React from 'react';

/**
 * AspectImage
 * - Outputs responsive images with srcset/sizes to cut LCP bytes
 * - If the src is a Cloudinary URL, we append f_auto,q_auto,w for each breakpoint
 * - Otherwise we still provide a useful sizes attribute and async decoding
 *
 * Props:
 *  - src (string, required)
 *  - alt (string, required)
 *  - aspect (number, optional)  e.g. 16/9. If provided, we wrap in a box that preserves ratio.
 *  - className (string, optional)
 *  - priority (boolean, optional)  If true, marks as high priority (use for hero images)
 *  - widths (number[], optional)   Breakpoints; default [320, 640, 960, 1280]
 *  - sizes (string, optional)      CSS sizes for srcset; sensible default below
 *  - imgProps (object, optional)   Any other <img> props to pass through
 */
export default function AspectImage({
  src = '',
  alt = '',
  aspect,
  className = '',
  priority = false,
  widths = [320, 640, 960, 1280],
  sizes = '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw',
  imgProps = {},
}) {
  if (!src) return null;

  const isCloudinary = /res\.cloudinary\.com/.test(src);

  // Build a URL with width (Cloudinary), leaving other params intact.
  const withWidth = (url, w) => {
    if (!isCloudinary) return url; // fallback (we'll still set sizes/srcset but same URL)

    try {
      const u = new URL(url);
      // Cloudinary delivery urls look like: https://res.cloudinary.com/<cloud>/image/upload/<transforms...>/<publicId>.<ext>
      // We want to inject/merge transforms: f_auto,q_auto,c_fill,w_<w>
      const parts = u.pathname.split('/');
      const uploadIdx = parts.findIndex(p => p === 'upload');
      if (uploadIdx !== -1) {
        const before = parts.slice(0, uploadIdx + 1);     // .../upload
        const after = parts.slice(uploadIdx + 1);         // existing transforms + publicId
        // If the first of "after" segment looks like transforms, keep it; else start with our transforms.
        // We ensure our w_ is present and f_auto,q_auto,c_fill are applied.
        const t = [
          'f_auto',
          'q_auto',
          'c_fill',
          `w_${w}`,
        ].join(',');

        // If there are already transforms, merge them by prefixing ours (Cloudinary will reconcile).
        let merged;
        if (after.length > 1 && after[0].includes(',')) {
          merged = [t + ',' + after[0], ...after.slice(1)];
        } else {
          merged = [t, ...after];
        }
        u.pathname = [...before, ...merged].join('/');
      }
      return u.toString();
    } catch {
      return url;
    }
  };

  const srcSet = widths
    .map(w => `${withWidth(src, w)} ${w}w`)
    .join(', ');

  // If this is a hero/above-the-fold image, hint higher fetch priority.
  const fetchPriority = priority ? 'high' : 'auto';
  const loading = priority ? 'eager' : 'lazy';

  const image = (
    <img
      src={withWidth(src, widths[widths.length - 1])} // largest as default src
      srcSet={srcSet}
      sizes={sizes}
      alt={alt}
      loading={loading}
      decoding="async"
      fetchpriority={fetchPriority}
      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
      {...imgProps}
    />
  );

  if (!aspect) {
    // No aspect wrapper: just return the image
    return <div className={className}>{image}</div>;
  }

  // Preserve aspect ratio using CSS aspect-ratio if supported
  const wrapperStyle = {
    position: 'relative',
    width: '100%',
    aspectRatio: String(aspect), // e.g., 16/9
    overflow: 'hidden',
    borderRadius: imgProps?.style?.borderRadius ?? undefined,
  };

  return (
    <div className={className} style={wrapperStyle}>
      {image}
    </div>
  );
}
