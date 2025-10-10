import RailListV1 from './RailListV1.jsx';
import RailListV2 from './RailListV2.jsx';
import RailPromoSquareV1 from './RailPromoSquareV1.jsx';

export const RAIL_TEMPLATES = {
  rail_list_v1: RailListV1,
  rail_list_v2: RailListV2,
  rail_promo_square_v1: RailPromoSquareV1, // <- promo
};

export function getRailComponentByType(type = 'rail_list_v1') {
  return RAIL_TEMPLATES[type] ?? RailListV1;
}
