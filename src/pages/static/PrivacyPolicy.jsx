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

export default function PrivacyPolicyPage() {
  useEffect(() => {
    removeManagedHeadTags();

    const canonical = buildCanonicalFromLocation();
    upsertTag('link', { rel: 'canonical', href: canonical });

    upsertTag('title', {}, { textContent: `Privacy Policy — ${SITE_NAME}` });
    upsertTag('meta', {
      name: 'description',
      content:
        'Official Privacy Policy outlining data practices, disclaimers, and user rights.',
    });

    const origin =
      typeof window !== 'undefined' ? window.location.origin : '';
    const url =
      typeof window !== 'undefined' ? window.location.href : '';

    addJsonLd('breadcrumbs-privacy', {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${origin}/` },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'Privacy Policy',
          item: url,
        },
      ],
    });

    addJsonLd('webpage-privacy', {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: `Privacy Policy — ${SITE_NAME}`,
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
        <h1>Privacy Policy</h1>

        <p><strong>Last Updated:</strong> [Insert Date]</p>

        <p>
          This Privacy Policy (“<strong>Policy</strong>”) explains how
          <strong> {SITE_NAME} </strong> (“we”, “us”, “our”) collects, uses,
          stores, protects, and discloses information when you access or use our
          website. By using this Website, you agree to this Policy.
        </p>

        <p>
          This Policy is drafted with comprehensive legal clarity to minimise
          disputes and liabilities. All content on this Website is provided for
          <strong> informational purposes only</strong> and does <strong>not</strong> constitute legal,
          financial, professional, or any other form of advice. We expressly
          disclaim all responsibility and liability to the fullest extent
          permitted under applicable law.
        </p>

        <h2>1. Information We Collect</h2>

        <h3>1.1 Automatically Collected Data</h3>
        <p>
          When you access the Website, our servers and analytics tools may
          automatically collect:
        </p>
        <ul>
          <li>IP address</li>
          <li>Browser type, device type, and operating system</li>
          <li>Pages visited, time spent, and referral sources</li>
          <li>General approximate location (derived from IP)</li>
          <li>Timestamps and access logs</li>
        </ul>

        <h3>1.2 Cookies & Tracking Technologies</h3>
        <p>
          We may use cookies, tags, pixels, or similar technologies to:
        </p>
        <ul>
          <li>Maintain session preferences</li>
          <li>Measure website performance</li>
          <li>Improve user experience</li>
        </ul>

        <h3>1.3 Voluntary Information</h3>
        <p>
          If you contact us voluntarily, we may collect your name, email
          address, or message content solely for responding to your inquiry.
        </p>

        <h2>2. How We Use Your Information</h2>
        <ul>
          <li>To maintain the security and operation of the Website</li>
          <li>To analyse traffic and optimise performance</li>
          <li>To respond to communication or requests submitted by you</li>
          <li>To prevent fraudulent or malicious activity</li>
        </ul>

        <h2>3. Legal Disclaimer & Limitation of Liability</h2>
        <p>
          All articles, posts, reports, and materials published on this Website
          are provided strictly for <strong>general informational purposes</strong>. We do
          <strong> not</strong> warrant their accuracy, completeness, or suitability for any
          purpose.
        </p>
        <p>
          We <strong>do not accept responsibility</strong> for:
        </p>
        <ul>
          <li>Any errors, omissions, or inaccuracies in the content</li>
          <li>Any consequences arising from reliance on content</li>
          <li>Any third-party views, data, or external links displayed</li>
        </ul>
        <p>
          To the maximum extent permitted by law, <strong>we disclaim all liability</strong>
          for direct, indirect, incidental, or consequential loss or damage.
        </p>

        <h2>4. Data Sharing</h2>
        <p>
          We <strong>do not sell</strong> personal data. Limited information may be shared with
          trusted service providers (such as hosting, analytics, or security
          tools) solely for operational purposes and under strict confidentiality
          obligations.
        </p>

        <h2>5. Data Retention</h2>
        <p>
          We retain log data and analytics for only as long as necessary for
          security, performance optimisation, and legal compliance. Aggregated or
          anonymised data may be stored for longer periods.
        </p>

        <h2>6. Third-Party Links & Services</h2>
        <p>
          External links or embedded services may be present on the Website. We
          are <strong>not responsible</strong> for the privacy practices or content of any
          third-party websites or tools.
        </p>

        <h2>7. Your Choices</h2>
        <ul>
          <li>You may disable cookies through your browser settings.</li>
          <li>
            You may opt out of personalised ads through Google or other ad
            network settings.
          </li>
          <li>
            You may contact us regarding data associated with your usage.
          </li>
        </ul>

        <h2>8. No Guarantees or Warranties</h2>
        <p>
          Although we employ reasonable security measures, we do not guarantee
          absolute protection of data transmitted or stored. Use of this Website
          is at your own risk.
        </p>

        <h2>9. Changes to This Policy</h2>
        <p>
          We may update this Policy periodically. Continued use of the Website
          after changes indicates acceptance of the updated Policy.
        </p>

        <h2>10. Contact</h2>
        <p>
          For questions regarding this Policy, email us at:
          <br />
          <a href="mailto:privacy@timelyvoice.com">privacy@timelyvoice.com</a>
        </p>

        <p style={{ marginTop: 24, fontSize: 14 }}>
          This Policy is drafted in a legally cautious and protective manner.
          However, depending on your jurisdiction, you may wish to have it
          reviewed by a qualified legal professional for specific compliance
          obligations.
        </p>
      </main>
      <SiteFooter />
    </>
  );
}
