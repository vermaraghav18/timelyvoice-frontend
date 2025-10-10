// src/components/nav/NewsletterCTA.jsx
import { Link } from 'react-router-dom';

export default function NewsletterCTA() {
  return (
    <Link
      to="/#newsletter"
      style={{
        padding: '10px 14px',
        borderRadius: 10,
        background: '#1D9A8E',
        color: '#fff',
        textDecoration: 'none',
        fontWeight: 600
      }}
      aria-label="Subscribe to our newsletter"
    >
      Subscribe
    </Link>
  );
}
