// src/hooks/useReadComplete.js
import { useEffect, useRef } from 'react';
import { track } from '../lib/analytics';

/**
 * Fires a one-time "read_complete" analytics event when the user scrolls
 * past ~80% of the page on an article.
 *
 * Usage in Article.jsx (after you have article data):
 *   useReadComplete({ id: article?.id, slug: article?.slug, title: article?.title });
 */
export default function useReadComplete({ id, slug, title }) {
  const sentRef = useRef(false);

  useEffect(() => {
    if (!slug && !id) return; // need some identifier

    // Use localStorage key to avoid duplicate firing for the same article
    const key = id ? `read_done:${id}` : `read_done_slug:${slug}`;
    if (localStorage.getItem(key)) {
      sentRef.current = true;
    } else {
      sentRef.current = false;
    }

    let ticking = false;
    const THRESHOLD = 0.8; // 80%

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        try {
          const doc = document.documentElement;
          const scrollTop = doc.scrollTop || document.body.scrollTop || 0;
          const viewportH = window.innerHeight || doc.clientHeight || 0;
          const fullH = doc.scrollHeight || 0;

          // Avoid divide-by-zero
          if (fullH <= viewportH) {
            // If content is short, consider it completed as soon as loaded/visible
            maybeFire(1);
          } else {
            const progress = (scrollTop + viewportH) / fullH;
            maybeFire(progress);
          }
        } finally {
          ticking = false;
        }
      });
    };

    const maybeFire = (progress) => {
      if (sentRef.current) return;
      if (progress >= THRESHOLD) {
        sentRef.current = true;
        localStorage.setItem(key, '1');

        track('read_complete', {
          id: id || '',
          slug: slug || '',
          title: title || '',
          progress: 0.8,
          ts: Date.now()
        });
      }
    };

    // Attach listeners
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    // Run once on mount (handles very short pages)
    onScroll();

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [id, slug, title]);
}
