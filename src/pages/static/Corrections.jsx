// src/pages/static/Corrections.jsx
import { useEffect } from 'react';
import SiteNav from '../../components/SiteNav.jsx';
import SiteFooter from '../../components/SiteFooter.jsx';
import {
  styles,
  removeManagedHeadTags,
  upsertTag,
  addJsonLd,
} from '../../App.jsx';

const SITE_NAME = 'The Timely Voice';

export default function CorrectionsPage() {
  useEffect(() => {
    removeManagedHeadTags();

    upsertTag('title', {}, { textContent: `Corrections — ${SITE_NAME}` });
    upsertTag('meta', {
      name: 'description',
      content:
        'How to request a correction or clarification for articles published on The Timely Voice.',
    });

    const origin =
      typeof window !== 'undefined' ? window.location.origin : '';
    const url =
      typeof window !== 'undefined' ? window.location.href : '';

    addJsonLd('breadcrumbs-corrections', {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${origin}/` },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'Corrections',
          item: url,
        },
      ],
    });

    addJsonLd('webpage-corrections', {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: `Corrections — ${SITE_NAME}`,
      url,
    });
  }, []);

  return (
    <>
      <SiteNav />
      <main style={styles.page} className="legal-page">
        <h1>Corrections</h1>

        <p>
          We take accuracy seriously. When we get something wrong, we aim to
          fix it transparently and quickly.
        </p>

        <h2>How to request a correction</h2>
        <ol>
          <li>Copy the full URL of the article you are concerned about.</li>
          <li>
            Quote the exact sentence or paragraph you believe is inaccurate.
          </li>
          <li>
            Provide any supporting documents, links, or context that show what
            you believe is correct.
          </li>
          <li>
            Email everything to{' '}
            <a href="mailto:corrections@timelyvoice.com">
              corrections@timelyvoice.com
            </a>
            .
          </li>
        </ol>

        <h2>What we do after receiving a request</h2>
        <ul>
          <li>
            An editor reviews the article, the original sources, and your
            evidence.
          </li>
          <li>
            If an error is confirmed, we update the article and add a note
            describing the change if it is significant.
          </li>
          <li>
            For minor fixes like spelling, we may silently update without a
            formal note.
          </li>
        </ul>

        <h2>Clarifications and updates</h2>
        <p>
          Sometimes information is not wrong but may be incomplete or unclear.
          In such cases, we may add clarifying paragraphs or context without
          changing the core conclusion of the story.
        </p>

        <p style={{ marginTop: 24, fontSize: 14 }}>
          To read more about our standards, please see our{' '}
          <a href="/editorial-policy">Editorial Policy</a>.
        </p>
      </main>
      <SiteFooter />
    </>
  );
}
