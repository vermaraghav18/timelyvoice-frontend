// src/pages/static/Author.jsx
import { useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import SiteNav from '../../components/SiteNav.jsx';
import SiteFooter from '../../components/SiteFooter.jsx';
import {
  styles,
  removeManagedHeadTags,
  upsertTag,
  addJsonLd,
  buildCanonicalFromLocation,
} from '../../App.jsx';

function toTitleCase(s = '') {
  return s
    .split(/[-_ ]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

export default function AuthorPage() {
  const { slug } = useParams();
  const displayName = useMemo(() => toTitleCase(slug || 'Author'), [slug]);

  useEffect(() => {
    removeManagedHeadTags();

    // ✅ canonical (normalized, lower-cased)
    const canonical = buildCanonicalFromLocation([
      'author',
      String(slug || '').toLowerCase(),
    ]);
    upsertTag('link', { rel: 'canonical', href: canonical });

    // ✅ title & description
    upsertTag('title', {}, {
      textContent: `${displayName} — Author — NewsSite`,
    });
    upsertTag('meta', {
      name: 'description',
      content: `Articles and bio for ${displayName} on NewsSite.`,
    });

    // ❌ Author pages are still just placeholders → NOINDEX for now
    upsertTag('meta', {
      name: 'robots',
      content: 'noindex,follow',
      'data-managed': 'robots',
    });

    // ✅ structured data (breadcrumbs)
    addJsonLd('breadcrumbs', {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Home',
          item: `${window.location.origin}/`,
        },
        { '@type': 'ListItem', position: 2, name: 'Author', item: canonical },
      ],
    });

    // ✅ Minimal Person entity (extend later if needed)
    addJsonLd('author-person', {
      '@context': 'https://schema.org',
      '@type': 'Person',
      name: displayName,
      url: canonical,
    });
  }, [slug, displayName]);

  return (
    <>
      <SiteNav />
      <main style={styles.page}>
        <h1>{displayName}</h1>
        <p>
          Author profile page placeholder. We’ll add bio, headshot, and a list
          of recent articles here.
        </p>
      </main>
      <SiteFooter />
    </>
  );
}
