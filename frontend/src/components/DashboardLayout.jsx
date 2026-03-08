import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Navigation from "./Navigation";

function HamburgerIcon() {
  return (
    <svg
      className="w-5 h-5"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
      />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg
      className="w-5 h-5 text-blue-600"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.8}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
      />
    </svg>
  );
}

/**
 * DashboardLayout — wraps all dashboard pages with the Navigation sidebar.
 * Renders <Outlet /> for nested React Router routes.
 */
export default function DashboardLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user } = useAuth();
  const location = useLocation();

  // Derive a short page title from the pathname
  function getPageTitle() {
    const path = location.pathname;
    if (path.includes("/drivers/new")) return "Register Driver";
    if (/\/drivers\/[^/]+$/.test(path)) return "Driver Profile";
    if (path.includes("/drivers")) return "Drivers";
    if (path.includes("/offences")) return "Offences";
    if (path.includes("/analytics")) return "Analytics";
    if (path.includes("/settings")) return "Settings";
    if (path.includes("/identify")) return "Identify Driver";
    return "Dashboard";
  }

  const initials = user?.full_name
    ? user.full_name
        .split(" ")
        .slice(0, 2)
        .map((w) => w[0])
        .join("")
        .toUpperCase()
    : "?";

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <Navigation
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      {/* Main content — offset by sidebar on desktop */}
      <div className="lg:pl-56">
        {/* Top header */}
        <header className="sticky top-0 z-10 bg-white border-b border-gray-100 shadow-sm">
          <div className="flex items-center justify-between px-4 sm:px-6 h-14">
            {/* Left: hamburger (mobile) + page title */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMobileOpen(true)}
                className="lg:hidden p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition"
              >
                <HamburgerIcon />
              </button>
              {/* Brand on mobile (replaces sidebar) */}
              <div className="flex items-center gap-1.5 lg:hidden">
                <ShieldIcon />
                <span className="text-sm font-bold text-gray-900">DDITS</span>
              </div>
              <span className="hidden lg:block text-sm font-semibold text-gray-700">
                {getPageTitle()}
              </span>
            </div>

            {/* Right: user avatar */}
            <div className="flex items-center gap-2">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-semibold text-gray-700 leading-tight">
                  {user?.full_name}
                </p>
                <p className="text-xs text-gray-400 capitalize">{user?.role}</p>
              </div>
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-700 shrink-0">
                {initials}
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="px-4 sm:px-6 py-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
