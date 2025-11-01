// src/pages/static/Advertising.jsx
import { useEffect } from 'react';
import SiteNav from '../../components/SiteNav.jsx';
import SiteFooter from '../../components/SiteFooter.jsx';
import { styles, removeManagedHeadTags, upsertTag, addJsonLd } from '../../App.jsx';

export default function AdvertisingPage() {
  useEffect(() => {
    removeManagedHeadTags();
    upsertTag('title', {}, { textContent: 'Advertising — NewsSite' });
    upsertTag('meta', { name: 'description', content: 'Advertise with NewsSite. Rates and media kit coming soon.' });
    addJsonLd('breadcrumbs', {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${window.location.origin}/` },
        { '@type': 'ListItem', position: 2, name: 'Advertising', item: `${window.location.origin}/advertising` },
      ],
    });
  }, []);

  return (
    <>
      <SiteNav />
      <main style={styles.page}>
        <h1>Advertising</h1>
        <p>Partner with us to reach an engaged audience. Email <a href="mailto:ads@news.example">ads@news.example</a> to request the media kit.</p>
      </main>
      <SiteFooter />
    </>
  );
}
