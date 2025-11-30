/* eslint-disable */
import { useEffect } from 'react';
import SiteNav from '../../components/SiteNav.jsx';
import SiteFooter from '../../components/SiteFooter.jsx';
import {
  styles,
  removeManagedHeadTags,
  upsertTag,
  addJsonLd,
  buildCanonicalFromLocation,
} from '../../App.jsx';

const SITE_NAME = 'The Timely Voice';

export default function TermsAndConditionsPage() {
  useEffect(() => {
    removeManagedHeadTags();

    const canonical = buildCanonicalFromLocation();
    upsertTag('link', { rel: 'canonical', href: canonical });

    upsertTag('title', {}, { textContent: `Terms & Conditions — ${SITE_NAME}` });
    upsertTag('meta', {
      name: 'description',
      content:
        'Terms & Conditions governing your use of The Timely Voice website.',
    });

    const origin =
      typeof window !== 'undefined' ? window.location.origin : '';
    const url =
      typeof window !== 'undefined' ? window.location.href : '';

    addJsonLd('breadcrumbs-terms', {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${origin}/` },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'Terms & Conditions',
          item: url,
        },
      ],
    });

    addJsonLd('webpage-terms', {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: `Terms & Conditions — ${SITE_NAME}`,
      url,
      publisher: {
        '@type': 'Organization',
        name: SITE_NAME,
        url: origin,
      },
    });
  }, []);

  return (
    <>
      <SiteNav />
      <main style={styles.page} className="legal-page">
        <h1>Terms &amp; Conditions</h1>

        <p><strong>Last Updated:</strong> [Insert Date]</p>

        {/* … rest of your T&C text … */}
      </main>
      <SiteFooter />
    </>
  );
}
