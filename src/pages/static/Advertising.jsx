// src/pages/static/Advertising.jsx
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

export default function AdvertisingPage() {
  useEffect(() => {
    removeManagedHeadTags();

    upsertTag('title', {}, { textContent: `Advertising — ${SITE_NAME}` });
    upsertTag('meta', {
      name: 'description',
      content:
        'Information for advertisers and sponsors on The Timely Voice, including formats and editorial independence.',
    });

    const origin =
      typeof window !== 'undefined' ? window.location.origin : '';
    const url =
      typeof window !== 'undefined' ? window.location.href : '';

    addJsonLd('webpage-advertising', {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: `Advertising — ${SITE_NAME}`,
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
        <h1>Advertising</h1>

        <p>
          {SITE_NAME} is open to limited, clearly labelled advertising and
          sponsorships that do not compromise our editorial independence.
        </p>

        <h2>Available formats</h2>
        <ul>
          <li>Display banner placements on selected pages</li>
          <li>Section or series sponsorships</li>
          <li>
            Branded content or explainer articles, clearly labelled as
            &ldquo;Sponsored&rdquo; or &ldquo;Partner Content&rdquo;
          </li>
        </ul>

        <h2>Editorial independence</h2>
        <p>
          Advertisers do not control our newsroom and cannot preview or veto
          independent coverage. Sponsored content is handled separately from
          news articles and labelled so readers can distinguish it.
        </p>

        <h2>Basic restrictions</h2>
        <p>We do not accept advertising that promotes:</p>
        <ul>
          <li>Hate speech or discrimination</li>
          <li>Illegal activities</li>
          <li>Deliberate misinformation</li>
          <li>Adult or highly sensitive content not appropriate for our audience</li>
        </ul>

        <h2>Contact for advertising</h2>
        <p>
          For advertising enquiries, please write to{' '}
          <a href="mailto:ads@timelyvoice.com">ads@timelyvoice.com</a> with
          details about your brand, campaign goals, and preferred formats.
        </p>
      </main>
      <SiteFooter />
    </>
  );
}
