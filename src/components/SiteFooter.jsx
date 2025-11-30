/* eslint-disable */
import { Link } from 'react-router-dom';

const SITE_NAME = 'The Timely Voice';

export default function SiteFooter() {
  return (
    <footer
      style={{
        borderTop: '1px solid #00133aff',
        marginTop: 24,
        padding: '16px 12px',
        background: '#001a33ff',
      }}
    >
      <div
        style={{
          maxWidth: 980,
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        <nav
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 12,
            fontSize: 14,
          }}
        >
          <Link to="/about">About</Link>
          <Link to="/contact">Contact</Link>
          <Link to="/editorial-policy">Editorial Policy</Link>
          <Link to="/corrections">Corrections</Link>
          <Link to="/privacy-policy">Privacy Policy</Link>
          <Link to="/editorial-disclaimer">Editorial Disclaimer</Link>
          <Link to="/terms-and-conditions">Terms &amp; Conditions</Link>
          <Link to="/advertising">Advertising</Link>
        </nav>

        <div style={{ fontSize: 12, color: '#ffffffff' }}>
          © {new Date().getFullYear()} {SITE_NAME}. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
