// frontend/src/components/rails/RailV7.jsx
import "./railV7.css";

export default function RailV7({ section, custom }) {
  const cfg = { ...(section?.custom || {}), ...(custom || {}) };
  const { imageUrl, alt = "", linkUrl, aspect = "auto" } = cfg;

  if (!imageUrl) {
    // Dev-only hint so you don't silently see nothing
    if (typeof window !== "undefined" && import.meta.env.DEV) {
      console.warn("[rail_v7] Missing custom.imageUrl; nothing will render.", { section, custom });
    }
    return null;
  }

  const Wrapper = linkUrl ? "a" : "div";
  const wrapperProps = linkUrl
    ? { href: linkUrl, target: "_self", rel: "noopener noreferrer" }
    : {};

  // Allow optional aspect ratio control via CSS aspect-ratio
  const mediaStyle = {};
  if (aspect && aspect !== "auto") {
    mediaStyle.aspectRatio = aspect; // e.g., "16/9", "1/1", "4/3"
  }

  return (
    <section className="railv7">
      <Wrapper
        {...wrapperProps}
        className="railv7__media"
        aria-label={alt || "promo"}
        style={mediaStyle}
      >
        <img src={imageUrl} alt={alt} loading="lazy" decoding="async" />
      </Wrapper>
    </section>
  );
}
