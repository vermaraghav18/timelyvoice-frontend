import { Link } from "react-router-dom";

export default function FeatureV2({ title, items = [], moreLink }) {
  const a = items[0];
  if (!a) return null;

  const href = `/article/${a.slug}`;
  const when = a.publishedAt ? new Date(a.publishedAt).toLocaleString() : "";
  const img = a.imageUrl || "";
  const imgAlt = a.imageAlt || a.title || "";

  return (
    <section style={{ marginBottom: 24 }}>
      {(title || moreLink) && (
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:8,gap:8}}>
          {title ? <h3 style={{ margin: 0, fontSize: 18 }}>{title}</h3> : <span/>}
          {moreLink ? <Link to={moreLink} style={{ textDecoration:"none", color:"#1B4965", fontWeight:600, fontSize:14 }}>More →</Link> : null}
        </div>
      )}

      <article style={{ border:"1px solid #eee", borderRadius:12, overflow:"hidden", background:"#fff" }}>
        {/* 16:9 image */}
        <Link to={href} style={{ display:"block", background:"#f3f4f6" }}>
          {img ? (
            <img
              src={img}
              alt={imgAlt}
              style={{ width:"100%", height:0, paddingBottom:"56.25%", objectFit:"cover", display:"block" }}
            />
          ) : (
            <div style={{ width:"100%", height:0, paddingBottom:"56.25%", background:"#e5e7eb" }}/>
          )}
        </Link>

        <div style={{ padding:16 }}>
          <h2 style={{ margin:"0 0 8px", fontSize:24, lineHeight:1.25 }}>
            <Link to={href} style={{ color:"inherit", textDecoration:"none" }}>{a.title}</Link>
          </h2>

          {a.summary && <p style={{ margin:"0 0 12px", color:"#374151", lineHeight:1.6 }}>{a.summary}</p>}

          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:12 }}>
            <small style={{ color:"#6b7280" }}>
              {a.author || ""}{(a.author && when) ? " • " : ""}{when}
            </small>
            <Link
              to={href}
              style={{
                textDecoration:"none",
                background:"#111", color:"#fff",
                padding:"8px 12px", borderRadius:10, fontWeight:600
              }}
              aria-label={`Continue reading: ${a.title}`}
            >
              Continue Reading →
            </Link>
          </div>
        </div>
      </article>
    </section>
  );
}
