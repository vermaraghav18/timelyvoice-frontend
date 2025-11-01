// src/pages/static/Author.jsx
import { useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import SiteNav from '../../components/SiteNav.jsx';
import SiteFooter from '../../components/SiteFooter.jsx';
import { styles, removeManagedHeadTags, upsertTag, addJsonLd } from '../../App.jsx';

function toTitleCase(s = '') {
  return s
    .split(/[-_ ]+/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

export default function AuthorPage() {
  const { slug } = useParams();
  const displayName = useMemo(() => toTitleCase(slug || 'Author'), [slug]);

  useEffect(() => {
    const url = `${window.location.origin}/author/${encodeURIComponent(slug || '')}`;
    removeManagedHeadTags();
    upsertTag('title', {}, { textContent: `${displayName} — Author — NewsSite` });
    upsertTag('meta', { name: 'description', content: `Articles and bio for ${displayName} on NewsSite.` });

    addJsonLd('breadcrumbs', {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${window.location.origin}/` },
        { '@type': 'ListItem', position: 2, name: 'Author', item: `${window.location.origin}/author/${encodeURIComponent(slug || '')}` },
      ],
    });

    // Minimal Person entity (expand later with sameAs, jobTitle, etc.)
    addJsonLd('author-person', {
      '@context': 'https://schema.org',
      '@type': 'Person',
      name: displayName,
      url,
    });
  }, [slug, displayName]);

  return (
    <>
      <SiteNav />
      <main style={styles.page}>
        <h1>{displayName}</h1>
        <p>Author profile page placeholder. We’ll add bio, headshot, and a list of recent articles here.</p>
      </main>
      <SiteFooter />
    </>
  );
}
