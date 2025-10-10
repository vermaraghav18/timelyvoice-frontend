import { Link } from "react-router-dom";

export default function DarkV1({ title, items = [], moreLink }) {
  if (!items.length) return null;

  const hero = items[0];
  const subs = items.slice(1, 5);
  const href = `/article/${hero.slug}`;
  const when = hero.publishedAt ? new Date(hero.publishedAt).toLocaleString() : "";
  const img = hero.imageUrl || "";
  const imgAlt = hero.imageAlt || hero.title || "";

  return (
    <section style={{ marginBottom: 24, background:"#0f172a", borderRadius:16, overflow:"hidden", color:"#e5e7eb" }}>
      {/* header */}
      {(title || moreLink) && (
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",padding:"12px 14px", background:"#0b1220", borderBottom:"1px solid #1f2937"}}>
          {title ? <h3 style={{ margin: 0, fontSize: 18, color:"#f8fafc" }}>{title}</h3> : <span/>}
          {moreLink ? <Link to={moreLink} style={{ textDecoration:"none", color:"#93c5fd", fontWeight:600 }}>More →</Link> : null}
        </div>
      )}

      {/* HERO */}
      <article style={{ padding:14 }}>
        <div style={{ border:"1px solid #1f2937", background:"#0b1220", borderRadius:12, overflow:"hidden", marginBottom:12 }}>
          <Link to={href} style={{ display:"block", background:"#0b1220" }}>
            {img ? (
              <img
                src={img}
                alt={imgAlt}
                style={{ width:"100%", height:0, paddingBottom:"56.25%", objectFit:"cover", display:"block" }}
              />
            ) : (
              <div style={{ width:"100%", height:0, paddingBottom:"56.25%", background:"#111827" }}/>
            )}
          </Link>
          <div style={{ padding:14 }}>
            <h2 style={{ margin:"0 0 8px", fontSize:26, lineHeight:1.25, color:"#f8fafc" }}>
              <Link to={href} style={{ color:"inherit", textDecoration:"none" }}>{hero.title}</Link>
            </h2>
            {hero.summary && <p style={{ margin:"0 0 8px", color:"#cbd5e1", lineHeight:1.6 }}>{hero.summary}</p>}
            <small style={{ color:"#94a3b8" }}>
              {hero.author || ""}{(hero.author && when) ? " • " : ""}{when}
            </small>
          </div>
        </div>

        {/* SUB STRIP */}
        {subs.length > 0 && (
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap: 12 }}>
            {subs.map((s) => {
              const u = `/article/${s.slug}`;
              const t = s.publishedAt ? new Date(s.publishedAt).toLocaleDateString() : "";
              return (
                <Link key={s.id || s._id || s.slug} to={u} style={{ textDecoration:"none", color:"inherit" }}>
                  <div style={{ border:"1px solid #1f2937", borderRadius:10, overflow:"hidden", background:"#0b1220" }}>
                    <div style={{ background:"#0b1220" }}>
                      {s.imageUrl ? (
                        <img
                          src={s.imageUrl}
                          alt={s.imageAlt || s.title || ""}
                          style={{ width:"100%", height:0, paddingBottom:"100%", objectFit:"cover", display:"block" }} // 1:1
                        />
                      ) : (
                        <div style={{ width:"100%", height:0, paddingBottom:"100%", background:"#111827" }}/>
                      )}
                    </div>
                    <div style={{ padding:10 }}>
                      <div style={{ fontWeight:600, fontSize:14, lineHeight:1.35, color:"#f3f4f6", marginBottom:6 }}>
                        {s.title}
                      </div>
                      <small style={{ color:"#94a3b8" }}>{t}</small>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </article>
    </section>
  );
}
