import React from 'react';

export default function RailPromoSquareV1({ items = [], ui = {} }) {
  const it = items?.[0];
  if (!it) return null;
  const href = it.url || (it.slug ? `/article/${it.slug}` : '#');
  const overlay = ui?.overlay ?? 0;
  const radius  = ui?.radius ?? 8;
  const border  = ui?.border ? '1px solid #eee' : 'none';

  return (
    <div className="rail rail--promoSquareV1 promo--imageOnly">
      <a className="promo-square-only" href={href}
         style={{ borderRadius: radius, border }}>
        {it?.image?.url ? (
          <>
            <img src={it.image.url} alt={it.title || 'promo'} loading="lazy" />
            {overlay ? <div className="promo-media__overlay" style={{ opacity: overlay }} /> : null}
          </>
        ) : (
          <div className="promo-media__ph" />
        )}
      </a>
    </div>
  );
}
