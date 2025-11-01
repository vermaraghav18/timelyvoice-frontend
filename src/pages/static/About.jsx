// src/pages/static/About.jsx
import { useEffect } from 'react';
import SiteNav from '../../components/SiteNav.jsx';
import SiteFooter from '../../components/SiteFooter.jsx';
import { styles, removeManagedHeadTags, upsertTag, addJsonLd } from '../../App.jsx';

export default function AboutPage() {
  useEffect(() => {
    removeManagedHeadTags();
    upsertTag('title', {}, { textContent: 'About Us — NewsSite' });
    upsertTag('meta', { name: 'description', content: 'Learn about NewsSite, our mission, and how we report.' });
    addJsonLd('breadcrumbs', {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${window.location.origin}/` },
        { '@type': 'ListItem', position: 2, name: 'About', item: `${window.location.origin}/about` },
      ],
    });
  }, []);

  return (
    <>
      <SiteNav />
      <main style={styles.page}>
        <h1>About NewsSite</h1>
        <p>We are an independent newsroom focused on fast, accurate, and clear reporting. This page will soon include our team overview, ownership, and how we work.</p>
      </main>
      <SiteFooter />
    </>
  );
}
