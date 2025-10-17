// src/layouts/AdminShell.jsx
import { NavLink } from "react-router-dom";

const colors = {
  primary: "#1D9A8E",
  text: "#212121",
  bg: "#F4F7F6",
  white: "#fff",
  border: "#e5e7eb",
  hover: "#f3f4f6",
};

export default function AdminShell({ children }) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", background: colors.bg, color: colors.text }}>
      <aside style={{ width: 240, display: "none", borderRight: `1px solid ${colors.border}`, background: colors.white }}
             className="admin-aside">
        <div style={{ height: 64, display: "flex", alignItems: "center", padding: "0 16px", fontWeight: 700, fontSize: 18 }}>
          Admin
        </div>
        <nav style={{ padding: 8 }}>
          <NavItem to="/admin/articles" label="Articles" icon={DocumentIcon} />
          <NavItem to="/admin/media" label="Media" icon={ImageIcon} />
          <NavItem to="/admin/categories" label="Categories" icon={FolderIcon} />
          <NavItem to="/admin/tags" label="Tags" icon={TagIcon} />
          <NavItem to="/admin/settings" label="Settings" icon={SettingsIcon} />

         <NavItem to="/admin/autmotion/feeds" label="Feeds" icon={DocumentIcon} />
        <NavItem to="/admin/autmotion/queue" label="Queue" icon={DocumentIcon} />
        <NavItem to="/admin/autmotion/drafts" label="Drafts" icon={DocumentIcon} />

        </nav>
      </aside>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <header style={{
          height: 64, background: colors.white, borderBottom: `1px solid ${colors.border}`,
          display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px"
        }}>
          <div style={{ fontWeight: 600 }}>CMS</div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <a href="/" target="_blank" rel="noreferrer" style={{ fontSize: 14, textDecoration: "underline" }}>View site</a>
            <ProfileBadge />
          </div>
        </header>
        <main style={{ flex: 1, padding: 16 }}>{children}</main>
      </div>

      {/* small CSS to show sidebar on >=768px */}
      <style>{`
        @media (min-width: 768px) {
          .admin-aside { display: flex; flex-direction: column; }
        }
      `}</style>
    </div>
  );
}

function NavItem({ to, label, icon: Icon }) {
  const base = {
    display: "flex", alignItems: "center", gap: 8,
    padding: "10px 12px", borderRadius: 10, fontSize: 14,
    color: colors.text, textDecoration: "none",
  };
  return (
    <NavLink
      to={to}
      style={({ isActive }) => ({
        ...base,
        background: isActive ? colors.primary : "transparent",
        color: isActive ? "#fff" : colors.text,
      })}
      onMouseEnter={(e) => { if (!e.currentTarget.classList.contains("active")) e.currentTarget.style.background = colors.hover; }}
      onMouseLeave={(e) => { if (!e.currentTarget.classList.contains("active")) e.currentTarget.style.background = "transparent"; }}
      className={({ isActive }) => (isActive ? "active" : "")}
    >
      <Icon size={16} color="currentColor" />
      <span>{label}</span>
    </NavLink>
  );
}

function ProfileBadge() {
  const name = localStorage.getItem("adminEmail") || "Admin";
  return <div style={{ fontSize: 14, color: "#6b7280" }}>{name}</div>;
}

/* ---------- Icons (fixed size so they don't blow up) ---------- */
function DocumentIcon({ size = 16, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" opacity=".2"/>
      <path d="M14 2v6a2 2 0 0 0 2 2h6" fill="none" stroke={color} strokeWidth="2"/>
    </svg>
  );
}
function ImageIcon({ size = 16, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" opacity=".2"/>
      <circle cx="9" cy="9" r="2"/>
      <path d="M21 15l-5-5L5 21" fill="none" stroke={color} strokeWidth="2"/>
    </svg>
  );
}
function FolderIcon({ size = 16, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden>
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
    </svg>
  );
}
function TagIcon({ size = 16, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden>
      <path d="M20.59 13.41L12 22l-8-8 8-8 8.59 8.41z" opacity=".2"/>
      <circle cx="7.5" cy="12.5" r="1.5"/>
    </svg>
  );
}
function SettingsIcon({ size = 16, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden>
      <path d="M12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8z"/>
      <path d="M2 12h4m12 0h4M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48 2.83 2.83m0-14.14-2.83 2.83M7.76 16.24 4.93 19.07"
            fill="none" stroke={color} strokeWidth="2"/>
    </svg>
  );
}
