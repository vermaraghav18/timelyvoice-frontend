import { useEffect } from "react";
import { pushAd } from "../lib/adsense";

export default function PageShell({ children }) {
  useEffect(() => {
    // Initial + delayed push (important for Vercel + SPA)
    pushAd();
    const t = setTimeout(() => pushAd(), 300);
    return () => clearTimeout(t);
  }, []);

  return (
    <>
      {/* LEFT PAGE SKIN */}
      <div className="page-skin left-skin">
        <ins
          className="adsbygoogle"
          style={{ display: "inline-block", width: "160px", height: "600px" }}
          data-ad-client="ca-pub-8472487092329023"
          data-ad-slot="4085777094"
        />
      </div>

      {/* RIGHT PAGE SKIN */}
      <div className="page-skin right-skin">
        <ins
          className="adsbygoogle"
          style={{ display: "inline-block", width: "160px", height: "600px" }}
          data-ad-client="ca-pub-8472487092329023"
          data-ad-slot="4652096765"
        />
      </div>

      {/* MAIN CONTENT */}
      <main className="site-container">
        {children}
      </main>
    </>
  );
}
