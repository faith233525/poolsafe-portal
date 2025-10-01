import React from "react";
import styles from "./Sidebar.module.css";

interface SidebarProps {
  role: "admin" | "support" | "partner";
  onNavigate?: (view: string) => void;
  activeView?: string;
  user?: {
    name?: string;
    email?: string;
    displayName?: string;
  };
}

const navLinks: Record<SidebarProps["role"], { label: string; view: string; icon: string }[]> = {
  admin: [
    { label: "Analytics Dashboard", view: "dashboard", icon: "📊" },
    { label: "Tickets", view: "tickets", icon: "🎫" },
    { label: "Partners", view: "partners", icon: "🤝" },
    { label: "Knowledge Base", view: "knowledge-base", icon: "📚" },
    { label: "Settings", view: "settings", icon: "⚙️" },
  ],
  support: [
    { label: "Analytics Dashboard", view: "dashboard", icon: "📊" },
    { label: "Tickets", view: "tickets", icon: "🎫" },
    { label: "Knowledge Base", view: "knowledge-base", icon: "📚" },
  ],
  partner: [
    { label: "Dashboard", view: "tickets", icon: "📊" },
    { label: "Service Records", view: "service-records", icon: "📋" },
    { label: "Knowledge Base", view: "knowledge-base", icon: "📚" },
  ],
};

const Sidebar: React.FC<SidebarProps> = ({ role, onNavigate, activeView }) => {
  const handleNavigation = (view: string) => {
    if (onNavigate) {
      onNavigate(view);
    }
  };

  return (
    <nav aria-label="Main navigation" className={styles.sidebar} role="navigation">
      <div className={styles.sidebarHeader}>
        <div className={styles.logo}>
          <span className={styles.logoIcon}>🛋️</span>
          <span className={styles.logoText}>LounGenie</span>
        </div>
        <div className={styles.sidebarTitle}>Navigation</div>
      </div>

      <div className={styles.navSection}>
        <ul className={styles.navList}>
          {navLinks[role].map((link) => (
            <li key={link.view} className={styles.navItem}>
              <button
                onClick={() => handleNavigation(link.view)}
                className={`${styles.navLink} ${activeView === link.view ? styles.active : ""}`}
                type="button"
              >
                <span className={styles.navIcon}>{link.icon}</span>
                <span className={styles.navLabel}>{link.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className={styles.sidebarFooter}>
        <div className={styles.roleIndicator}>
          <span className={styles.roleIcon}>
            {role === "admin" ? "👑" : role === "support" ? "🎧" : "🏢"}
          </span>
          <span className={styles.roleText}>{role.charAt(0).toUpperCase() + role.slice(1)}</span>
        </div>
      </div>
    </nav>
  );
};

export default Sidebar;
