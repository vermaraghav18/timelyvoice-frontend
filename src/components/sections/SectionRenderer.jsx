// frontend/src/components/sections/SectionRenderer.jsx
import NewsHeadSection from "./NewsHeadSection.jsx";
import HeadV2 from "./HeadV2.jsx";
import GridSection from "./GridSection.jsx";
import CarouselSection from "./CarouselSection.jsx";
import ListV1 from "./ListV1.jsx";
import HeroV1 from "./HeroV1.jsx";
import FeatureV1 from "./FeatureV1.jsx";
import FeatureV2 from "./FeatureV2.jsx";
import MegaV1 from "./MegaV1.jsx";
import BreakingV1 from "./BreakingV1.jsx";
import DarkV1 from "./DarkV1.jsx";
import MainV1 from "./MainV1.jsx";
import MainV2 from "./MainV2.jsx";
import MainV3 from "./MainV3.jsx";
import MainV4 from "./MainV4.jsx";
import MainV5 from "./MainV5.jsx";
import MainV6 from "./MainV6.jsx";
import MainV7 from "./MainV7.jsx";
import RailV3 from "../rails/RailV3.jsx";
import RailV4 from "../rails/RailV4.jsx";
import RailV5 from "../rails/RailV5.jsx";
import RailV6 from "../rails/RailV6.jsx";
import RailV7 from "../rails/RailV7.jsx";
import RailV8 from "../rails/RailV8";
import TopV1 from "./TopV1.jsx";
import TopV2 from "./TopV2.jsx";
import FilmyBazaarRailV1 from "./FilmyBazaarRailV1.jsx";
import FilmyBazaarRailV2 from "./FilmyBazaarRailV2";
import FilmyBazaarRailV3 from "./FilmyBazaarRailV3";
import FilmyBazaarRailV4 from "./FilmyBazaarRailV4";
import SportsRailV1 from "../rails/SportsRailV1.jsx";
import SportsV2 from "./SportsV2.jsx"; 
import SportsV3 from "./SportsV3.jsx"; 
import TechMainV1 from "./TechMainV1.jsx";  // 👈 add

const TEMPLATES = {
  head_v1: NewsHeadSection,
  head_v2: HeadV2,
  top_v1: TopV1,
  top_v2: TopV2,
  grid_v1: GridSection,
  carousel_v1: CarouselSection,
  list_v1: ListV1,
  hero_v1: HeroV1,
  feature_v1: FeatureV1,
  feature_v2: FeatureV2,
  mega_v1: MegaV1,
  breaking_v1: BreakingV1,
  dark_v1: DarkV1,
  main_v1: MainV1,
  main_v2: MainV2,
  main_v3: MainV3,
  main_v4: MainV4,
  main_v5: MainV5,
  main_v6: MainV6,
  main_v7: MainV7,
  rail_v3: RailV3,
  rail_v4: RailV4,
  rail_v5: RailV5,
  rail_v6: RailV6,
  rail_v7: RailV7,
  rail_v8: RailV8,
  rail_filmybazaar_v1: FilmyBazaarRailV1,
  rail_filmybazaar_v2: FilmyBazaarRailV2,
  rail_filmybazaar_v3: FilmyBazaarRailV3,
  rail_filmybazaar_v4: FilmyBazaarRailV4,
  rail_sports_v1: SportsRailV1, // 👈 add this
  sports_v2: SportsV2,
  sports_v3: SportsV3,   
  tech_main_v1: TechMainV1,  // 👈 add

};

export default function SectionRenderer({ section }) {
  if (!section || !section.template) return null;
  const Cmp = TEMPLATES[section.template];
  if (!Cmp) return null;

  return (
    <Cmp
      section={section}
      title={section.title || ""}
      items={section.items || []}
      moreLink={section.moreLink || ""}
      custom={section.custom || {}}   
      side={section.side || ""}         
    />
  );
}
