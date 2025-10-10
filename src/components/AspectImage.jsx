// frontend/src/components/AspectImage.jsx
export default function AspectImage({ ratio = "16/9", src, alt = "", className = "" }) {
  const [w, h] = (ratio || "16/9").split("/").map(Number);
  const pt = h && w ? (h / w) * 100 : (9 / 16) * 100;
  return (
    <div className={className} style={{ position: "relative", width: "100%", paddingTop: `${pt}%`, overflow: "hidden" }}>
      {src ? (
        <img
          src={src}
          alt={alt}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
          loading="lazy"
        />
      ) : null}
    </div>
  );
}
