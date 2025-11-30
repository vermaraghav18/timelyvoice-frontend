// src/pages/static/Terms.jsx
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

export default function TermsPage() {
  useEffect(() => {
    removeManagedHeadTags();

    const canonical = buildCanonicalFromLocation();
    upsertTag('link', { rel: 'canonical', href: canonical });

    upsertTag('title', {}, { textContent: `Terms & Conditions — ${SITE_NAME}` });
    upsertTag('meta', {
      name: 'description',
      content:
        'Terms and conditions for using The Timely Voice website and its content.',
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
    });
  }, []);

  return (
    <>
      <SiteNav />
     <main style={styles.page} className="legal-page">
        <h1>Terms &amp; Conditions</h1>

        <p>
          These Terms &amp; Conditions (&ldquo;Terms&rdquo;) govern your use of
          the <strong>{SITE_NAME}</strong> website and any content provided
          through it.
        </p>

        <h2>Acceptance of terms</h2>
        <p>
          By accessing or using this website, you agree to be bound by these
          Terms. If you do not agree, please do not use the site.
        </p>

        <h2>Use of content</h2>
        <ul>
          <li>
            You may read and share links to our articles for personal,
            non-commercial use.
          </li>
          <li>
            Republishing full articles, scraping, or bulk copying content
            without permission is not allowed.
          </li>
          <li>
            Excerpts may be quoted with proper attribution and a link back to
            the original article.
          </li>
        </ul>

        <h2>User conduct</h2>
        <p>
          You agree not to use this website to engage in unlawful activity,
          harassment, hate speech, or any behaviour that could damage the
          website or interfere with other users.
        </p>

        <h2>Links to third-party sites</h2>
        <p>
          Articles may link to third-party websites. {SITE_NAME} is not
          responsible for the content or privacy practices of third-party
          sites.
        </p>

        <h2>Disclaimer</h2>
        <p>
          While we strive for accuracy, information on this site may sometimes
          be incomplete or out of date. Nothing on this site should be treated
          as professional legal, financial, or medical advice.
        </p>

        <h2>Limitation of liability</h2>
        <p>
          {SITE_NAME} will not be liable for any indirect, incidental, or
          consequential damages arising from your use of the website or
          reliance on its content.
        </p>

        <h2>Changes to these Terms</h2>
        <p>
          We may update these Terms from time to time. Continued use of the
          website after changes are posted will constitute your acceptance of
          the revised Terms.
        </p>

        <h2>Contact</h2>
        <p>
          For questions about these Terms, you may contact us via the details
          on our <a href="/contact">Contact</a> page.
        </p>

        <p style={{ marginTop: 24, fontSize: 14 }}>
          This document is a general template and does not constitute legal
          advice. You may wish to review it with a legal professional.
        </p>
      </main>
      <SiteFooter />
    </>
  );
}
