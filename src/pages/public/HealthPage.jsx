// src/pages/public/HealthPage.jsx
// Reuse the FinanceCategoryPage layout + logic, but fixed to Health.

import FinanceCategoryPage from './FinanceCategoryPage.jsx';

export default function HealthPage() {
  return (
    <FinanceCategoryPage
      categorySlug="health" // slug used in /public/categories/:slug/articles
      displayName="Health" // title, SEO text, labels
    />
  );
}
