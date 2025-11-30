// src/pages/static/Contact.jsx
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

export default function ContactPage() {
  useEffect(() => {
    removeManagedHeadTags();

    const canonical = buildCanonicalFromLocation();
    upsertTag('link', { rel: 'canonical', href: canonical });

    upsertTag('title', {}, { textContent: `Contact — ${SITE_NAME}` });
    upsertTag('meta', {
      name: 'description',
      content:
        'Contact The Timely Voice newsroom for tips, feedback, corrections, and advertising enquiries.',
    });

    const origin =
      typeof window !== 'undefined' ? window.location.origin : '';
    const url =
      typeof window !== 'undefined' ? window.location.href : '';

    addJsonLd('breadcrumbs-contact', {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${origin}/` },
        { '@type': 'ListItem', position: 2, name: 'Contact', item: url },
      ],
    });

    addJsonLd('webpage-contact', {
      '@context': 'https://schema.org',
      '@type': 'ContactPage',
      name: `Contact — ${SITE_NAME}`,
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
        <h1>Contact</h1>

        <p>
          We welcome news tips, feedback, and corrections from our readers.
          Choose the most relevant email address below, and we will do our best
          to respond in a reasonable time.
        </p>

        <h2>News tips &amp; story ideas</h2>
        <p>
          Email our news desk at{' '}
          <a href="mailto:newsdesk@timelyvoice.com">
            newsdesk@timelyvoice.com
          </a>
          . Please include links, documents, and any background information
          that can help us verify the story.
        </p>

        <h2>Corrections</h2>
        <p>
          If you believe we&rsquo;ve made an error in any article, write to{' '}
          <a href="mailto:corrections@timelyvoice.com">
            corrections@timelyvoice.com
          </a>{' '}
          with the article link, the incorrect statement, and any supporting
          evidence. Our editors will review and update the story if needed.
        </p>

        <h2>Advertising &amp; partnerships</h2>
        <p>
          For banner ads, sponsorships, or branded content proposals, please
          write to{' '}
          <a href="mailto:ads@timelyvoice.com">ads@timelyvoice.com</a>. See our{' '}
          <a href="/advertising">Advertising</a> page for more details on
          formats and basic guidelines.
        </p>

        <h2>General feedback</h2>
        <p>
          For general queries, suggestions, or technical issues with the site,
          reach us at{' '}
          <a href="mailto:contact@timelyvoice.com">
            contact@timelyvoice.com
          </a>
          .
        </p>

        <p style={{ fontSize: 14, marginTop: 24 }}>
          <em>
            Note: The email addresses above are placeholders. You should update
            them to the actual inboxes you monitor regularly.
          </em>
        </p>
      </main>
      <SiteFooter />
    </>
  );
}
