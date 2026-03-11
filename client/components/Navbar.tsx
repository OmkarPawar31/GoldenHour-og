"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import "./Navbar.css";

/* ── Role → page mapping ── */
const ROLE_NAV: Record<string, { icon: string; label: string; href: string }> = {
  ambulance: { icon: "🚑", label: "Ambulance", href: "/ambulance" },
  hospital:  { icon: "🏥", label: "Hospital",  href: "/hospital" },
  admin:     { icon: "🖥️", label: "Admin",     href: "/admin" },
  driver:    { icon: "🚗", label: "Driver",    href: "/driver" },
  private:   { icon: "🚗", label: "Emergency", href: "/private-emergency" },
  organizer: { icon: "📋", label: "Control Room", href: "/organizer" },
};

export default function Navbar() {
  const pathname = usePathname();
  const [loggedIn, setLoggedIn] = useState(false);
  const [role, setRole] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  /* Read auth state from localStorage (client-only) */
  useEffect(() => {
    const token = localStorage.getItem("gh_token");
    const savedRole = localStorage.getItem("gh_role");
    setLoggedIn(!!token);
    setRole(savedRole);
  }, [pathname]); // re-check on navigation

  const handleLogout = () => {
    localStorage.removeItem("gh_token");
    localStorage.removeItem("gh_user");
    localStorage.removeItem("gh_role");
    setLoggedIn(false);
    setRole(null);
    setMobileOpen(false);
    window.location.href = "/";
  };

  /* Close mobile menu on route change */
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const isActive = (href: string) => pathname === href;

  const roleNav = role && ROLE_NAV[role] ? ROLE_NAV[role] : null;

  /* ── Build navigation links ── */
  const navLinks = (
    <>
      <Link href="/" className={isActive("/") ? "active" : ""}>
        <span className="nav-icon">🏠</span> Home
      </Link>
      {roleNav && (
        <Link href={roleNav.href} className={isActive(roleNav.href) ? "active" : ""}>
          <span className="nav-icon">{roleNav.icon}</span> {roleNav.label}
        </Link>
      )}
      <Link href="/dashboard" className={isActive("/dashboard") ? "active" : ""}>
        <span className="nav-icon">📊</span> Dashboard
      </Link>
      {role === "admin" && (
        <Link href="/admin" className={isActive("/admin") ? "active" : ""}>
          <span className="nav-icon">🖥️</span> Admin
        </Link>
      )}
    </>
  );

  return (
    <nav className="gh-navbar">
      {/* ── Logo ── */}
      <Link href="/" className="gh-nav-logo">
        <div className="gh-nav-logo-dot" />
        <span className="gh-nav-logo-text">Golden<span>Hour</span></span>
      </Link>

      {/* ── Desktop: center links ── */}
      {loggedIn && (
        <div className="gh-nav-links">
          {navLinks}
        </div>
      )}

      {/* ── Desktop: right side ── */}
      <div className="gh-nav-right">
        {loggedIn ? (
          <>
            {role && (
              <span className="gh-nav-role-badge">
                {ROLE_NAV[role]?.icon} {role}
              </span>
            )}
            <div className="gh-nav-divider" />
            <button onClick={handleLogout} className="gh-nav-logout">
              Logout
            </button>
          </>
        ) : (
          <div className="gh-nav-auth">
            <Link href="/auth" className="gh-nav-btn-login">Sign In</Link>
            <Link href="/auth?mode=register" className="gh-nav-btn-register">Register</Link>
          </div>
        )}

        {/* ── Hamburger (mobile) ── */}
        <button
          className={`gh-nav-hamburger ${mobileOpen ? "open" : ""}`}
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle navigation"
        >
          <span /><span /><span />
        </button>
      </div>

      {/* ── Mobile dropdown ── */}
      <div className={`gh-nav-mobile-menu ${mobileOpen ? "open" : ""}`}>
        {loggedIn ? (
          <>
            <Link href="/" className={isActive("/") ? "active" : ""}>
              <span>🏠</span> Home
            </Link>
            {roleNav && (
              <Link href={roleNav.href} className={isActive(roleNav.href) ? "active" : ""}>
                <span>{roleNav.icon}</span> {roleNav.label}
              </Link>
            )}
            <Link href="/dashboard" className={isActive("/dashboard") ? "active" : ""}>
              <span>📊</span> Dashboard
            </Link>
            {role === "admin" && (
              <Link href="/admin" className={isActive("/admin") ? "active" : ""}>
                <span>🖥️</span> Admin
              </Link>
            )}
            <div className="gh-nav-mobile-divider" />
            <button onClick={handleLogout}>
              <span>🚪</span> Logout
            </button>
          </>
        ) : (
          <>
            <Link href="/auth">Sign In</Link>
            <Link href="/auth?mode=register">Register</Link>
          </>
        )}
      </div>
    </nav>
  );
}
