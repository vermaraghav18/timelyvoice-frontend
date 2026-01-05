// frontend/src/components/BrandMark.jsx
import { Link } from "react-router-dom";

export default function BrandMark({
  to = "/",
  size = "sm",
  text = "timelyvoice.com",
  style,
  showGoogleNewsBadge = true, // ✅ NEW
}) {
  const isSm = size === "sm";

  // Wrapper lets us position the Google News badge
  const wrapStyle = {
    position: "relative",
    display: "inline-block",
    ...(style || {}),
  };

  const logoStyle = {
    display: "inline-block",
    textDecoration: "none",
    color: "#fff",
    fontWeight: 800,

    /* size */
    fontSize: isSm ? 18 : 22,

    letterSpacing: "0.02em",
    textTransform: "none",
    lineHeight: 1,
    whiteSpace: "nowrap",
  };

  const logoBadgeCommon = {
    background: "linear-gradient(130deg, #008080 0%, #00aaaaff 100%)",
    color: "#fff",
    border: isSm ? "1.5px solid #000" : "2px solid #000",
    padding: isSm ? "4px 12px" : "6px 14px",
    borderRadius: "2px",
    display: "inline-block",
    boxShadow: isSm ? "3px 4px 0 #000" : "6px 8px 0 #000",

    // ✅ Make room for Google News badge so it doesn't overlap text
    paddingRight: showGoogleNewsBadge ? (isSm ? 28 : 34) : (isSm ? 12 : 14),
  };

  // Google News badge sizing/placement (matched to your SiteNav feel)
const gBadgeStyle = {
  position: "absolute",
  right: isSm ? "-6px" : "-30px", // 👈 shifted LEFT towards card edge
  top: "70%",
  transform: "translateY(-50%) rotate(3deg)",
  background: "#ffffff",
  borderRadius: "8px",
  border: isSm ? "1.5px solid #000" : "2px solid #000",
  boxShadow: isSm ? "3px 4px 0 #000" : "5px 6px 0 #000",
  padding: isSm ? "2px" : "3px",
  zIndex: 3,
};

  const gImgStyle = {
    display: "block",
    width: isSm ? "22px" : "34px",
    height: "auto",
    pointerEvents: "none",
    userSelect: "none",
  };

  return (
    <span style={wrapStyle}>
      <Link
        to={to}
        aria-label="The Timely Voice — Home"
        style={{ ...logoStyle, ...logoBadgeCommon }}
      >
        {text}
      </Link>

      {showGoogleNewsBadge && (
        <span aria-hidden="true" style={gBadgeStyle}>
          <img
            src="/images/google-news.png"
            alt="Google News"
            style={gImgStyle}
          />
        </span>
      )}
    </span>
  );
}
