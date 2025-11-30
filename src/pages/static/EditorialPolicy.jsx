// src/pages/static/EditorialPolicy.jsx
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

export default function EditorialPolicyPage() {
  useEffect(() => {
    removeManagedHeadTags();

    upsertTag('title', {}, { textContent: `Editorial Policy — ${SITE_NAME}` });
    upsertTag('meta', {
      name: 'description',
      content:
        'How The Timely Voice handles accuracy, corrections, sources, conflicts of interest, and the use of AI tools.',
    });

    const origin =
      typeof window !== 'undefined' ? window.location.origin : '';
    const url =
      typeof window !== 'undefined' ? window.location.href : '';

    addJsonLd('breadcrumbs-editorial', {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${origin}/` },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'Editorial Policy',
          item: url,
        },
      ],
    });

    addJsonLd('webpage-editorial', {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: `Editorial Policy — ${SITE_NAME}`,
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
        <h1>Editorial Policy</h1>

        <p>
          This editorial policy describes the standards and processes that guide
          journalism at <strong>{SITE_NAME}</strong>. Our goal is to publish
          accurate, fair, and clearly explained information for our readers.
        </p>

        <h2>Accuracy and verification</h2>
        <ul>
          <li>
            We aim to verify information with at least two independent,
            trustworthy sources whenever possible.
          </li>
          <li>
            For sensitive claims, we prioritise official documents, court
            orders, government filings, and on-the-record statements.
          </li>
          <li>
            When facts are still developing, we clearly label stories as
            &ldquo;developing&rdquo; and avoid definitive language.
          </li>
        </ul>

        <h2>Fairness and balance</h2>
        <ul>
          <li>
            We strive to present important perspectives on major issues,
            especially where there is genuine disagreement.
          </li>
          <li>
            We avoid needlessly sensational language and misleading headlines.
          </li>
          <li>
            When we criticise an individual, organisation, or policy, we make a
            reasonable effort to include their response or prior public
            statements.
          </li>
        </ul>

        <h2>Use of anonymous sources</h2>
        <p>
          Anonymous sources are used sparingly and only when the information is
          important and cannot be obtained otherwise. When anonymity is granted,
          editors must know the identity and assess the credibility of the
          source.
        </p>

        <h2>Conflicts of interest</h2>
        <p>
          Contributors are expected to disclose any personal, financial, or
          political interests that may affect their coverage. We avoid assigning
          such contributors to stories where those conflicts could bias the
          reporting.
        </p>

        <h2>Corrections and updates</h2>
        <p>
          If a story contains a significant error, we correct it as soon as it
          is confirmed and add a note explaining what changed. Smaller edits
          such as grammar or formatting may be made without a public note.
        </p>

        <h2>Use of AI tools</h2>
        <p>
          {SITE_NAME} uses AI tools to assist with drafting, summarising,
          translation, and formatting. These tools do <strong>not</strong>{' '}
          publish on their own. Human editors remain responsible for:
        </p>
        <ul>
          <li>Checking facts and numbers against original sources</li>
          <li>Ensuring that headlines accurately reflect the story</li>
          <li>Reviewing tone, fairness, and context</li>
          <li>Deciding whether an article should be published or updated</li>
        </ul>

        <h2>Separation of news and business</h2>
        <p>
          Advertising, sponsorship, or affiliate partnerships do not decide what
          we cover. Paid content, if any, will be clearly labelled as such and
          kept separate from editorial decisions.
        </p>

        <p style={{ marginTop: 24, fontSize: 14 }}>
          This policy may evolve as the newsroom grows. Any substantive changes
          will be reflected on this page.
        </p>
      </main>
      <SiteFooter />
    </>
  );
}
