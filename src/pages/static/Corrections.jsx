// src/pages/static/Corrections.jsx
import { useEffect } from 'react';
import SiteNav from '../../components/SiteNav.jsx';
import SiteFooter from '../../components/SiteFooter.jsx';
import { styles, removeManagedHeadTags, upsertTag, addJsonLd } from '../../App.jsx';

export default function CorrectionsPage() {
  useEffect(() => {
    removeManagedHeadTags();
    upsertTag('title', {}, { textContent: 'Corrections — NewsSite' });
    upsertTag('meta', { name: 'description', content: 'How we handle corrections and clarifications.' });
    addJsonLd('breadcrumbs', {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${window.location.origin}/` },
        { '@type': 'ListItem', position: 2, name: 'Corrections', item: `${window.location.origin}/corrections` },
      ],
    });
  }, []);

  return (
    <>
      <SiteNav />
      <main style={styles.page}>
        <h1>Corrections</h1>
        <p>If you spot an error, write to <a href="mailto:corrections@news.example">corrections@news.example</a>. We document substantive corrections and note them on the article page.</p>
      </main>
      <SiteFooter />
    </>
  );
}
