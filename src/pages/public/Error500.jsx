import { Link } from "react-router-dom";
import SiteNav from "../../components/SiteNav.jsx";
import SiteFooter from "../../components/SiteFooter.jsx";

export default function Error500({ message = "Something went wrong." }) {
  return (
    <>
      <SiteNav />
      <main className="container">
        <section style={{ padding: 32, textAlign: "center" }}>
          <h1 style={{ margin: 0, fontSize: 28 }}>Error</h1>
          <p style={{ color: "#666" }}>{message}</p>
          <Link to="/" style={{ textDecoration: "none", color: "#1B4965", fontWeight: 600 }}>
            ← Back to home
          </Link>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
