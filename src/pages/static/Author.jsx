// src/pages/static/Author.jsx
import { useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
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

function toTitleCase(s = '') {
  return s
    .split(/[-_ ]+/)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

export default function AuthorPage() {
  const { slug } = useParams();

  const { displayName, safeSlug } = useMemo(() => {
    const raw = (slug || '').trim();
    if (!raw) {
      return { displayName: 'Author', safeSlug: 'author' };
    }

    if (raw.toLowerCase().includes('desk')) {
      return {
        displayName: 'Timely Voice News Desk',
        safeSlug: 'timely-voice-news-desk',
      };
    }

    return {
      displayName: toTitleCase(raw),
      safeSlug: raw.toLowerCase(),
    };
  }, [slug]);

  useEffect(() => {
    removeManagedHeadTags();

    const canonical = buildCanonicalFromLocation();
    upsertTag('link', { rel: 'canonical', href: canonical });

    upsertTag('title', {}, {
      textContent: `${displayName} — Author at ${SITE_NAME}`,
    });
    upsertTag('meta', {
      name: 'description',
      content: `${displayName} writes and contributes news and explainers for ${SITE_NAME}.`,
    });

    const origin =
      typeof window !== 'undefined' ? window.location.origin : '';
    const url =
      typeof window !== 'undefined' ? window.location.href : '';

    addJsonLd(`author-${safeSlug}`, {
      '@context': 'https://schema.org',
      '@type': 'Person',
      name: displayName,
      url,
      worksFor: {
        '@type': 'Organization',
        name: SITE_NAME,
        url: origin,
      },
    });
  }, [displayName, safeSlug]);

  return (
    <>
      <SiteNav />
      <main style={styles.page} className="legal-page">
        <h1>{displayName}</h1>

        <p>
          {displayName} is a contributor at <strong>{SITE_NAME}</strong>.
          This page will gradually list recent articles, areas of focus, and
          additional background information as the newsroom grows.
        </p>

        <h2>Role at The Timely Voice</h2>
        <p>
          Authors on this site are responsible for researching stories, checking
          key facts, and working with editors to present information in clear,
          exam-friendly language.
        </p>

        <h2>Articles and beats</h2>
        <p>
          Over time, this page can include a list of stories published by{' '}
          {displayName}, organised by topic or date. For now, please use the
          site search to find articles by keyword or subject.
        </p>

        <p style={{ marginTop: 24, fontSize: 14 }}>
          If you are an author and would like to update your profile, please
          contact the editor via the email listed on our{' '}
          <a href="/contact">Contact</a> page.
        </p>
      </main>
      <SiteFooter />
    </>
  );
}
