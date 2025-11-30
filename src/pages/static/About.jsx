// src/pages/static/About.jsx
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

export default function AboutPage() {
  useEffect(() => {
    removeManagedHeadTags();

    const canonical = buildCanonicalFromLocation();
    upsertTag('link', { rel: 'canonical', href: canonical });

    upsertTag('title', {}, { textContent: `About Us — ${SITE_NAME}` });
    upsertTag('meta', {
      name: 'description',
      content:
        `${SITE_NAME} is an independent digital newsroom focused on clear, context-rich coverage of India and the world.`,
    });

    const origin =
      typeof window !== 'undefined' ? window.location.origin : '';
    const url =
      typeof window !== 'undefined' ? window.location.href : '';

    addJsonLd('breadcrumbs', {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${origin}/` },
        { '@type': 'ListItem', position: 2, name: 'About', item: url },
      ],
    });

    addJsonLd('webpage-about', {
      '@context': 'https://schema.org',
      '@type': 'AboutPage',
      name: `About ${SITE_NAME}`,
      url,
      description:
        `${SITE_NAME} explains the news with clarity, verified facts, and exam-friendly summaries for readers across India.`,
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

        <h1>About The Timely Voice</h1>

        <p>
          <strong>The Timely Voice</strong> is a digital-first newsroom
          dedicated to helping readers understand the news, not just scroll
          past headlines. We focus on clear explanations, historical context,
          and exam-friendly coverage of India and global affairs.
        </p>

        <h2>What we cover</h2>
        <ul>
          <li>Daily news updates from India and key global developments</li>
          <li>Explainers that break down complex policies, conflicts, and events</li>
          <li>
            Background history so students and aspirants can connect current
            events with the past
          </li>
          <li>Carefully curated stories that actually matter to your life</li>
        </ul>

        <h2>How we work</h2>
        <p>
          Our stories go through a basic but strict workflow before they appear
          on the site:
        </p>
        <ol>
          <li>
            <strong>Source gathering:</strong> We rely on official documents,
            press briefings, reputable news wires, and government or court
            orders whenever available.
          </li>
          <li>
            <strong>Drafting &amp; summarising:</strong> Drafts may be assisted
            by AI tools to speed up summarisation and language clarity.
          </li>
          <li>
            <strong>Human review:</strong> Every published article is reviewed
            by a human editor who checks key facts, tone, and headline accuracy.
          </li>
          <li>
            <strong>Updates &amp; corrections:</strong> When facts evolve, we
            update stories and note major changes on the page.
          </li>
        </ol>

        <h2>Use of AI on The Timely Voice</h2>
        <p>
          We occasionally use AI tools to help with research, rewriting,
          structure, and formatting. These tools <strong>do not</strong>{' '}
          replace editorial judgement. Our editors remain responsible for
          verifying facts, choosing angles, writing headlines, and deciding
          whether a story should be published at all.
        </p>

        <h2>Independence &amp; monetisation</h2>
        <p>
          {SITE_NAME} is an independent publication. Our editorial decisions
          are kept separate from advertising and commercial partnerships. Ads
          and sponsorships will never determine whether we cover a story or how
          we write it.
        </p>

        <h2>Who we serve</h2>
        <p>
          We write primarily for Indian readers who want reliable updates in
          simple language—students, competitive-exam aspirants, and working
          professionals who need a quick but trustworthy overview of the news.
        </p>

        <h2>How to reach us</h2>
        <p>
          For story ideas, feedback, or collaboration proposals, please visit
          our <a href="/contact">Contact</a> page.
        </p>
      </main>
      <SiteFooter />
    </>
  );
}
