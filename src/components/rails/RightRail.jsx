import React from 'react';
import { getRailComponentByType } from './templates/registry';

// Renders ONE rail block
export default function RightRailBlock({ section, items }) {
  const type = section?.type;
  const Comp = getRailComponentByType(type);
  const isPromo = type === 'rail_promo_square_v1';

  // Modifier class for CSS overrides
  const modClass = isPromo ? 'rail-block--promo' : '';

  return (
    <aside className={`rail-block ${modClass}`} data-rail-type={type}>
      {!isPromo && section?.title ? (
        <div className="rail-head">
          <h3 className="rail-title">{section.title}</h3>
          {section?.config?.moreLink ? (
            <a className="rail-more" href={section.config.moreLink}>More</a>
          ) : null}
        </div>
      ) : null}

      {isPromo ? (
        <Comp items={items} ui={section?.ui || {}} />
      ) : (
        <div className="rail-scroll">
          <Comp
            title={section?.title}
            items={items}
            moreLink={section?.config?.moreLink}
            ui={section?.ui || {}}
          />
        </div>
      )}
    </aside>
  );
}
