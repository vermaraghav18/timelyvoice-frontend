// src/pages/static/Terms.jsx
import { useEffect } from 'react';
import SiteNav from '../../components/SiteNav.jsx';
import SiteFooter from '../../components/SiteFooter.jsx';
import { styles, removeManagedHeadTags, upsertTag, addJsonLd } from '../../App.jsx';

export default function TermsPage() {
  useEffect(() => {
    removeManagedHeadTags();
    upsertTag('title', {}, { textContent: 'Terms & Conditions — NewsSite' });
    upsertTag('meta', { name: 'description', content: 'Terms for using NewsSite products and services.' });
    addJsonLd('breadcrumbs', {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${window.location.origin}/` },
        { '@type': 'ListItem', position: 2, name: 'Terms', item: `${window.location.origin}/terms` },
      ],
    });
  }, []);

  return (
    <>
      <SiteNav />
      <main style={styles.page}>
        <h1>Terms &amp; Conditions</h1>
        <p>These terms govern your use of our site and services. A finalized version will be published here.</p>
      </main>
      <SiteFooter />
    </>
  );
}
