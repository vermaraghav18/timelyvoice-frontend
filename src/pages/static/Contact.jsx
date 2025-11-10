// src/pages/static/Contact.jsx
import { useEffect } from 'react';
import SiteNav from '../../components/SiteNav.jsx';
import SiteFooter from '../../components/SiteFooter.jsx';
import { styles, removeManagedHeadTags, upsertTag, addJsonLd, buildCanonicalFromLocation } from '../../App.jsx';

export default function ContactPage() {
  useEffect(() => {
    removeManagedHeadTags();

    const canonical = buildCanonicalFromLocation(['contact']);
    upsertTag('link', { rel: 'canonical', href: canonical });

    upsertTag('title', {}, { textContent: 'Contact — NewsSite' });
    upsertTag('meta', { name: 'description', content: 'Contact the NewsSite team for tips, feedback, or advertising.' });

    addJsonLd('breadcrumbs', {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${window.location.origin}/` },
        { '@type': 'ListItem', position: 2, name: 'Contact', item: canonical },
      ],
    });
  }, []);

  return (
    <>
      <SiteNav />
      <main style={styles.page}>
        <h1>Contact</h1>
        <p>
          For news tips, corrections, and general queries, email us at{' '}
          <a href="mailto:knotshorts1@gmail.com">knotshorts1@gmail.com</a>. A contact form and newsroom inboxes will be added here.
        </p>
      </main>
      <SiteFooter />
    </>
  );
}
