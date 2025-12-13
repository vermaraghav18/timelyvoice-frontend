// frontend/src/components/rails/RailV8.jsx
import "./railV8.css";

export default function RailV8({ section, custom }) {
  const cfg = { ...(section?.custom || {}), ...(custom || {}) };
  const { imageUrl, title, summary, linkUrl } = cfg;

  if (!imageUrl || !title || !summary) {
    if (typeof window !== "undefined" && import.meta.env.DEV) {
      console.warn("[rail_v8] Missing required fields", { imageUrl, title, summary });
    }
    return null;
  }

  const Card = linkUrl ? "a" : "div";
  const cardProps = linkUrl
    ? { href: linkUrl, target: "_self", rel: "noopener noreferrer" }
    : {};

  return (
    <section className="railv8">
      <Card className="railv8__card" {...cardProps}>
        <div className="railv8__media">
          <img src={imageUrl} alt={title} loading="lazy" decoding="async" />
        </div>
        <div className="railv8__body">
          <h3 className="railv8__title">{title}</h3>
          <p className="railv8__summary">{summary}</p>
        </div>
      </Card>
    </section>
  );
}
