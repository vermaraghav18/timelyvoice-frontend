import React from 'react';
import RightRailBlock from './RightRail.jsx';

const promoSection = {
  type: 'rail_promo_square_v1',
  title: 'SHOULD NOT APPEAR',
  ui: { overlay: 0, radius: 8, border: false },
};
const promoItems = [
  { title: 'Promo', url: '#', image: { url: 'https://picsum.photos/600' } }
];

const listSection = { type: 'rail_list_v1', title: 'Regular List' };
const listItems = Array.from({ length: 5 }).map((_, i) => ({
  _id: String(i),
  slug: `demo-${i}`,
  title: `Demo Headline ${i}`,
  category: { name: 'Opinion' },
  image: { url: 'https://picsum.photos/seed/' + (i+1) + '/120/90' },
  publishedAt: new Date().toISOString(),
}));

export default function TestRails() {
  return (
    <div className="home-rails">
      <div className="home-grid">
        <main>
          <div style={{ height: 400, background: '#fafafa' }}>Main content placeholder</div>
        </main>
        <aside>
          {/* Promo must be ONLY a square image */}
          <RightRailBlock section={promoSection} items={promoItems} />

          {/* Regular list below (to prove difference) */}
          <RightRailBlock section={listSection} items={listItems} />
        </aside>
      </div>
    </div>
  );
}
