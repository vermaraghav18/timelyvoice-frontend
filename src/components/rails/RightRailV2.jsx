// frontend/src/components/rails/RightRailV2.jsx
import { useEffect, useState } from "react";
import { listSectionsV2Public } from "../../api/sectionsV2";
import SectionRenderer from "../sections/SectionRenderer";
import "./rightRailV2.css";

/**
 * Props:
 *  - fetchItemsForSection: async (section) => []  // how to get items per section (reuse your existing fetcher)
 */
export default function RightRailV2({ fetchItemsForSection }) {
  const [sections, setSections] = useState([]);
  const [itemsMap, setItemsMap] = useState({}); // {sectionId: items[]}

  useEffect(() => {
    (async () => {
      const all = await listSectionsV2Public();
      const right = all.filter(s => s.side === "right" && s.enabled);
      setSections(right);

      // fetch items for each section in parallel
      const pairs = await Promise.all(
        right.map(async (s) => {
          const items = await fetchItemsForSection(s);
          return [s._id || s.key, items || []];
        })
      );
      const map = {};
      pairs.forEach(([k, v]) => { map[k] = v; });
      setItemsMap(map);
    })();
  }, [fetchItemsForSection]);

  if (!sections.length) return null;

  return (
    <aside className="right-rail-v2">
      {sections.map((s) => (
        <div className="right-rail-v2__block" key={s._id || s.key}>
          <SectionRenderer section={s} items={itemsMap[s._id || s.key] || []} />
        </div>
      ))}
    </aside>
  );
}
