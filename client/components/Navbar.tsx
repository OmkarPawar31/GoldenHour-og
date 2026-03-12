"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clearAuth } from "../utils/auth";
import "./Navbar.css";

const ROLE_NAV: Record<string, { icon: string; label: string; href: string }> = {
  ambulance: { icon: "🚑", label: "Ambulance",     href: "/ambulance" },
  hospital:  { icon: "🏥", label: "Hospital",      href: "/hospital"  },
  admin:     { icon: "🖥️", label: "Admin",         href: "/admin"     },
  driver:    { icon: "🚗", label: "Driver",         href: "/driver"    },
  private:   { icon: "🚗", label: "Emergency",     href: "/private-emergency" },
  organizer: { icon: "📋", label: "Control Room",  href: "/operator" },
};

export default function Navbar() {
  const pathname    = usePathname();
  const router      = useRouter();
  const [loggedIn, setLoggedIn]     = useState(false);
  const [role, setRole]             = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  /* ── Emergency modal state ── */
  const [showEmModal, setShowEmModal]   = useState(false);
  const [emName, setEmName]             = useState("");
  const [emPhone, setEmPhone]           = useState("");
  const [emPlate, setEmPlate]           = useState("");
  const [emSeverity, setEmSeverity]     = useState("");
  const [emDestination, setEmDest]      = useState("");
  const [emLoading, setEmLoading]       = useState(false);

  useEffect(() => {
    const token     = localStorage.getItem("gh_token");
    const savedRole = localStorage.getItem("gh_role");
    setLoggedIn(!!token);
    setRole(savedRole);
  }, [pathname]);

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  const handleLogout = () => {
    clearAuth();
    setLoggedIn(false); setRole(null); setMobileOpen(false);
    window.location.href = "/";
  };

  const isActive = (href: string) => pathname === href;
  const roleNav  = role && ROLE_NAV[role] ? ROLE_NAV[role] : null;

  const openEmergencyModal = (e: React.MouseEvent) => {
    e.preventDefault();
    setShowEmModal(true);
    setMobileOpen(false);
  };

  const handleEmergencySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emName || !emPhone || !emPlate || !emSeverity) return;
    setEmLoading(true);
    sessionStorage.setItem("em_name",        emName);
    sessionStorage.setItem("em_phone",       emPhone);
    sessionStorage.setItem("em_plate",       emPlate);
    sessionStorage.setItem("em_severity",    emSeverity);
    sessionStorage.setItem("em_destination", emDestination);
    await new Promise(r => setTimeout(r, 700));
    setEmLoading(false);
    setShowEmModal(false);
    router.push("/private-emergency");
  };

  const closeModal = () => {
    setShowEmModal(false);
    setEmName(""); setEmPhone(""); setEmPlate(""); setEmSeverity(""); setEmDest("");
  };

  return (
    <>
      <nav className="gh-navbar">
        {/* Logo */}
        <Link href="/" className="gh-nav-logo">
          <div className="gh-nav-logo-dot" />
          <span className="gh-nav-logo-text">Golden<span>Hour</span></span>
        </Link>

        {/* Desktop centre links (logged in) */}
        {loggedIn && (
          <div className="gh-nav-links">
            <Link href="/" className={isActive("/") ? "active" : ""}><span className="nav-icon">🏠</span> Home</Link>
            {roleNav && (
              <Link href={roleNav.href} className={isActive(roleNav.href) ? "active" : ""}>
                <span className="nav-icon">{roleNav.icon}</span> {roleNav.label}
              </Link>
            )}
          </div>
        )}

        {/* Desktop right */}
        <div className="gh-nav-right">
          {loggedIn ? (
            <>
              {role && <span className="gh-nav-role-badge">{ROLE_NAV[role]?.icon} {role}</span>}
              <div className="gh-nav-divider" />
              <button onClick={handleLogout} className="gh-nav-logout">Logout</button>
            </>
          ) : (
            <div className="gh-nav-portals">
              <Link href="/login/ambulance" className="gh-nav-portal-btn" style={{ ["--portal-clr" as string]: "#E8571A" }}>🚑 Ambulance Driver</Link>
              <Link href="/login/hospital"  className="gh-nav-portal-btn" style={{ ["--portal-clr" as string]: "#3B82F6" }}>🏥 Hospital</Link>
              <Link href="/login/operator"  className="gh-nav-portal-btn" style={{ ["--portal-clr" as string]: "#8B5CF6" }}>📋 Operator</Link>
              <Link href="/login/admin"     className="gh-nav-portal-btn" style={{ ["--portal-clr" as string]: "#10B981" }}>🖥️ Admin / Traffic Control</Link>
              <a href="#" onClick={openEmergencyModal} className="gh-nav-portal-btn gh-nav-portal-btn--emergency">🆘 Emergency User</a>
            </div>
          )}
          <button className={`gh-nav-hamburger ${mobileOpen ? "open" : ""}`} onClick={() => setMobileOpen(!mobileOpen)} aria-label="Toggle navigation">
            <span /><span /><span />
          </button>
        </div>

        {/* Mobile dropdown */}
        <div className={`gh-nav-mobile-menu ${mobileOpen ? "open" : ""}`}>
          {loggedIn ? (
            <>
              <Link href="/" className={isActive("/") ? "active" : ""}><span>🏠</span> Home</Link>
              {roleNav && <Link href={roleNav.href} className={isActive(roleNav.href) ? "active" : ""}><span>{roleNav.icon}</span> {roleNav.label}</Link>}
              <div className="gh-nav-mobile-divider" />
              <button onClick={handleLogout}><span>🚪</span> Logout</button>
            </>
          ) : (
            <>
              <Link href="/login/ambulance"><span>🚑</span> Ambulance Driver</Link>
              <Link href="/login/hospital"><span>🏥</span> Hospital Control</Link>
              <Link href="/login/operator"><span>📋</span> Event Operator</Link>
              <Link href="/login/admin"><span>🖥️</span> Admin / Traffic</Link>
              <a href="#" onClick={openEmergencyModal}><span>🆘</span> Emergency User</a>
            </>
          )}
        </div>
      </nav>

      {/* ── EMERGENCY MODAL ── */}
      {showEmModal && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
          style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.55)", backdropFilter: "blur(10px)" }}
        >
          <div style={{ background: "#FFFBF5", borderRadius: "24px", width: "100%", maxWidth: "520px", boxShadow: "0 24px 80px rgba(0,0,0,0.2)", position: "relative", overflow: "hidden", fontFamily: "'DM Sans', sans-serif" }}>
            <div style={{ height: "4px", background: "linear-gradient(90deg, #F59E0B, #EF4444)" }} />
            <div style={{ padding: "2.2rem 2.5rem 2.5rem" }}>
              <button onClick={closeModal} style={{ position: "absolute", top: "1.4rem", right: "1.6rem", background: "none", border: "none", fontSize: "1.4rem", cursor: "pointer", color: "#94A3B8", lineHeight: 1 }}>×</button>
              <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.6rem" }}>
                <div style={{ width: "52px", height: "52px", borderRadius: "16px", background: "rgba(245,158,11,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.8rem", flexShrink: 0 }}>🆘</div>
                <div>
                  <h2 style={{ fontFamily: "'Bebas Neue', cursive", fontSize: "1.8rem", letterSpacing: "0.03em", color: "#1E293B", lineHeight: 1 }}>Emergency Request</h2>
                  <p style={{ fontSize: "0.8rem", color: "#64748B", marginTop: "0.25rem", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.06em", textTransform: "uppercase" }}>Priority Corridor Access</p>
                </div>
              </div>

              <form onSubmit={handleEmergencySubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {/* Full Name */}
                <div>
                  <label style={{ display: "block", fontFamily: "'JetBrains Mono', monospace", fontSize: "0.58rem", fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: "0.45rem" }}>Full Name</label>
                  <input required type="text" placeholder="John Doe" value={emName} onChange={e => setEmName(e.target.value)}
                    style={{ width: "100%", padding: "0.78rem 1rem", borderRadius: "12px", border: "1.5px solid #E2E8F0", background: "#F8FAFC", outline: "none", fontSize: "0.9rem", fontFamily: "inherit", color: "#1E293B" }}
                    onFocus={e => (e.target.style.borderColor = "#F59E0B")} onBlur={e => (e.target.style.borderColor = "#E2E8F0")} />
                </div>

                {/* Phone + Car Plate */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.9rem" }}>
                  <div>
                    <label style={{ display: "block", fontFamily: "'JetBrains Mono', monospace", fontSize: "0.58rem", fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: "0.45rem" }}>Phone</label>
                    <input required type="tel" placeholder="+91 98765…" value={emPhone} onChange={e => setEmPhone(e.target.value)}
                      style={{ width: "100%", padding: "0.78rem 1rem", borderRadius: "12px", border: "1.5px solid #E2E8F0", background: "#F8FAFC", outline: "none", fontSize: "0.9rem", fontFamily: "inherit", color: "#1E293B" }}
                      onFocus={e => (e.target.style.borderColor = "#F59E0B")} onBlur={e => (e.target.style.borderColor = "#E2E8F0")} />
                  </div>
                  <div>
                    <label style={{ display: "block", fontFamily: "'JetBrains Mono', monospace", fontSize: "0.58rem", fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: "0.45rem" }}>Car Plate</label>
                    <input required type="text" placeholder="MH-01-AB-1234" value={emPlate} onChange={e => setEmPlate(e.target.value.toUpperCase())}
                      style={{ width: "100%", padding: "0.78rem 1rem", borderRadius: "12px", border: "1.5px solid #E2E8F0", background: "#F8FAFC", outline: "none", fontSize: "0.9rem", fontFamily: "'JetBrains Mono', monospace", textTransform: "uppercase", color: "#1E293B" }}
                      onFocus={e => (e.target.style.borderColor = "#F59E0B")} onBlur={e => (e.target.style.borderColor = "#E2E8F0")} />
                  </div>
                </div>

                {/* Severity */}
                <div>
                  <label style={{ display: "block", fontFamily: "'JetBrains Mono', monospace", fontSize: "0.58rem", fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: "0.45rem" }}>Severity Level</label>
                  <select required value={emSeverity} onChange={e => setEmSeverity(e.target.value)}
                    style={{ width: "100%", padding: "0.78rem 1rem", borderRadius: "12px", border: "1.5px solid #E2E8F0", background: "#F8FAFC", outline: "none", fontSize: "0.9rem", fontFamily: "inherit", color: emSeverity ? "#1E293B" : "#CBD5E1", appearance: "none" }}
                    onFocus={e => (e.target.style.borderColor = "#F59E0B")} onBlur={e => (e.target.style.borderColor = "#E2E8F0")}>
                    <option value="" disabled>Select severity level…</option>
                    <option value="critical">🔴 Critical — Life Threatening</option>
                    <option value="high">🟠 High — Immediate Care</option>
                    <option value="medium">🟡 Medium — Urgent</option>
                    <option value="low">🟢 Low — Standard Emergency</option>
                  </select>
                </div>

                {/* Hospital (optional) */}
                <div>
                  <label style={{ display: "block", fontFamily: "'JetBrains Mono', monospace", fontSize: "0.58rem", fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: "0.45rem" }}>Nearest Hospital <span style={{ color: "#CBD5E1" }}>(optional)</span></label>
                  <input type="text" list="hosp-list" placeholder="Search hospital or leave auto…" value={emDestination} onChange={e => setEmDest(e.target.value)}
                    style={{ width: "100%", padding: "0.78rem 1rem", borderRadius: "12px", border: "1.5px solid #E2E8F0", background: "#F8FAFC", outline: "none", fontSize: "0.9rem", fontFamily: "inherit", color: "#1E293B" }}
                    onFocus={e => (e.target.style.borderColor = "#F59E0B")} onBlur={e => (e.target.style.borderColor = "#E2E8F0")} />
                  <datalist id="hosp-list">
                    <option value="City General Hospital" /><option value="Apollo Medical Center" /><option value="Fortis Healthcare" /><option value="Regional Trauma Center" />
                  </datalist>
                </div>

                {/* Submit */}
                <button type="submit" disabled={emLoading}
                  style={{ marginTop: "0.4rem", padding: "0.95rem", borderRadius: "12px", border: "none", cursor: emLoading ? "not-allowed" : "pointer", background: "linear-gradient(135deg, #F59E0B, #EF4444)", color: "#fff", fontFamily: "'DM Sans', sans-serif", fontSize: "0.95rem", fontWeight: 700, boxShadow: "0 4px 20px rgba(245,158,11,0.3)", transition: "all 0.2s", opacity: emLoading ? 0.7 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}>
                  {emLoading
                    ? <><span style={{ display: "inline-block", width: "14px", height: "14px", border: "2px solid rgba(255,255,255,0.4)", borderTopColor: "#fff", borderRadius: "50%", animation: "em-spin 0.65s linear infinite" }} /> Activating…</>
                    : "Activate Emergency Corridor →"}
                </button>
              </form>
            </div>
          </div>
          <style>{`@keyframes em-spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}
    </>
  );
}
