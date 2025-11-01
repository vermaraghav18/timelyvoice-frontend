// src/pages/static/EditorialPolicy.jsx
import { useEffect } from 'react';
import SiteNav from '../../components/SiteNav.jsx';
import SiteFooter from '../../components/SiteFooter.jsx';
import { styles, removeManagedHeadTags, upsertTag, addJsonLd } from '../../App.jsx';

export default function EditorialPolicyPage() {
  useEffect(() => {
    removeManagedHeadTags();
    upsertTag('title', {}, { textContent: 'Editorial Policy — NewsSite' });
    upsertTag('meta', { name: 'description', content: 'Our standards for accuracy, sourcing, and editorial independence.' });
    addJsonLd('breadcrumbs', {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${window.location.origin}/` },
        { '@type': 'ListItem', position: 2, name: 'Editorial Policy', item: `${window.location.origin}/editorial-policy` },
      ],
    });
  }, []);

  return (
    <>
      <SiteNav />
      <main style={styles.page}>
        <h1>Editorial Policy</h1>
        <p>We follow strict standards for verification, attribution, conflicts of interest, and corrections. Detailed guidelines will be published here.</p>
      </main>
      <SiteFooter />
    </>
  );
}
