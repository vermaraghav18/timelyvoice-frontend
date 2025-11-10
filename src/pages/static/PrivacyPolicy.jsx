// src/pages/static/PrivacyPolicy.jsx
import { useEffect } from 'react';
import SiteNav from '../../components/SiteNav.jsx';
import SiteFooter from '../../components/SiteFooter.jsx';
import { styles, removeManagedHeadTags, upsertTag, addJsonLd, buildCanonicalFromLocation } from '../../App.jsx';

export default function PrivacyPolicyPage() {
  useEffect(() => {
    removeManagedHeadTags();

    const canonical = buildCanonicalFromLocation(['privacy-policy']);
    upsertTag('link', { rel: 'canonical', href: canonical });

    upsertTag('title', {}, { textContent: 'Privacy Policy — NewsSite' });
    upsertTag('meta', { name: 'description', content: 'Your privacy and our data handling practices.' });

    addJsonLd('breadcrumbs', {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${window.location.origin}/` },
        { '@type': 'ListItem', position: 2, name: 'Privacy Policy', item: canonical },
      ],
    });
  }, []);

  return (
    <>
      <SiteNav />
      <main style={styles.page}>
        <h1>Privacy Policy</h1>
        <p>This placeholder outlines what data we collect and how we use it. Full policy text will be added soon.</p>
      </main>
      <SiteFooter />
    </>
  );
}
