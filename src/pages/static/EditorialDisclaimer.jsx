// src/pages/static/EditorialDisclaimer.jsx
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

export default function EditorialDisclaimerPage() {
  useEffect(() => {
    removeManagedHeadTags();

    const canonical = buildCanonicalFromLocation();
    upsertTag('link', { rel: 'canonical', href: canonical });

    upsertTag('title', {}, {
      textContent: `Editorial Disclaimer — ${SITE_NAME}`,
    });
    upsertTag('meta', {
      name: 'description',
      content:
        'Editorial disclaimer clarifying responsibilities, limitations, and liability for content published on The Timely Voice.',
    });

    const origin =
      typeof window !== 'undefined' ? window.location.origin : '';
    const url =
      typeof window !== 'undefined' ? window.location.href : '';

    addJsonLd('breadcrumbs-editorial-disclaimer', {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${origin}/` },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'Editorial Disclaimer',
          item: url,
        },
      ],
    });

    addJsonLd('webpage-editorial-disclaimer', {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: `Editorial Disclaimer — ${SITE_NAME}`,
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
        <h1>Editorial Disclaimer</h1>

        <p><strong>Last Updated:</strong> [Insert Date]</p>

        <p>
          The content published on <strong>{SITE_NAME}</strong> is intended
          solely for general informational and educational purposes. While
          reasonable efforts are made to ensure accuracy at the time of
          publication, <strong>we do not guarantee, represent, or warrant</strong> that
          any information, analysis, opinion, or data presented on this website
          is complete, reliable, current, or error-free.
        </p>

        <h2>No Responsibility for Accuracy or Results</h2>
        <p>
          Articles, reports, opinions, and commentary reflect the views of the
          respective authors at the time of writing. Content may contain
          inaccuracies, omissions, or outdated information. <strong>We accept no
          responsibility or liability</strong> for any error, misstatement, or
          interpretation, nor for any actions taken or decisions made based on
          the content published.
        </p>
        <p>
          You agree that your use of the Website and reliance on any content is
          entirely at your own risk.
        </p>

        <h2>Not Professional Advice</h2>
        <p>
          Nothing on this Website constitutes legal, financial, medical,
          investment, or other professional advice. <strong>No
          writer–reader, advisor–client, or professional relationship is
          created</strong> by your viewing or interacting with any content.
        </p>

        <h2>Third-Party Sources &amp; External Links</h2>
        <p>
          Some articles may reference external data, quotes, embedded content,
          or third-party links. These are provided only for context or
          convenience. <strong>We are not responsible</strong> for the accuracy, policies,
          views, reliability, or practices of any third-party website,
          publication, or source.
        </p>

        <h2>Opinions Are Personal</h2>
        <p>
          Opinions expressed in articles, columns, or commentary belong solely
          to the respective writers and <strong>do not necessarily represent</strong> the
          official views or positions of {SITE_NAME}, its editors, or its
          partners.
        </p>

        <h2>No Warranties</h2>
        <p>
          All content and services on this Website are provided on an
          <strong> “as is”</strong> and <strong>“as available”</strong> basis, without any
          warranties of any kind, express or implied.
        </p>

        <h2>Editorial Rights</h2>
        <p>
          We reserve full editorial discretion, including the right to edit,
          update, correct, or remove any content at any time, without notice.
        </p>

        <h2>Limitation of Liability</h2>
        <p>
          To the fullest extent permitted by applicable law, <strong>we disclaim
          all liability</strong> for any direct, indirect, incidental,
          consequential, or punitive damages arising from:
        </p>
        <ul>
          <li>Your use of or inability to use the Website</li>
          <li>Your reliance on any content published</li>
          <li>Any errors, omissions, or inaccuracies</li>
          <li>Any third-party information, services, or links</li>
        </ul>

        <p>
          By accessing this Website, you acknowledge and agree that{' '}
          <strong>{SITE_NAME}</strong> is <strong>not responsible</strong> for any outcomes,
          decisions, or losses you may experience as a result of engaging with
          the content.
        </p>

        <h2>Contact</h2>
        <p>
          For questions about this Editorial Disclaimer, you may contact us at:{' '}
          <a href="mailto:editor@timelyvoice.com">editor@timelyvoice.com</a>.
        </p>

        <p style={{ marginTop: 24, fontSize: 14 }}>
          This Editorial Disclaimer is drafted to offer broad legal protection.
          Depending on your jurisdiction, you may wish to have it reviewed by a
          qualified legal professional for complete compliance.
        </p>
      </main>
      <SiteFooter />
    </>
  );
}
