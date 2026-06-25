import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// ── Inline icons ──────────────────────────────────────────────────────────────

function UsersIcon() {
  return (
    <svg
      className="w-5 h-5"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.6}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
      />
    </svg>
  );
}

function CameraIcon() {
  return (
    <svg
      className="w-5 h-5"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.6}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.864 47.864 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z"
      />
    </svg>
  );
}

function DocumentIcon() {
  return (
    <svg
      className="w-5 h-5"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.6}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
      />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg
      className="w-5 h-5"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.6}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
      />
    </svg>
  );
}

function CogIcon() {
  return (
    <svg
      className="w-5 h-5"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.6}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75"
      />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg
      className="w-4 h-4"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.8}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75"
      />
    </svg>
  );
}

function TicketIcon() {
  return (
    <svg
      className="w-5 h-5"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.6}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
      />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg
      className="w-6 h-6 text-blue-600"
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

// ── Nav item definitions ──────────────────────────────────────────────────────

const ADMIN_NAV = [
  {
    label: "Drivers",
    path: "/dashboard/admin/drivers",
    icon: <UsersIcon />,
    disabled: false,
  },
  {
    label: "Issue Offence",
    path: "/dashboard/officer/issue-offence",
    icon: <TicketIcon />,
    disabled: false,
  },
  {
    label: "Offences",
    path: "/dashboard/admin/offences",
    icon: <DocumentIcon />,
    disabled: false,
  },
  {
    label: "Offence Types",
    path: "/dashboard/admin/offence-types",
    icon: <CogIcon />,
    disabled: false,
  },
  {
    label: "Penalty Rules",
    path: "/dashboard/admin/penalty-rules",
    icon: <ChartIcon />,
    disabled: false,
  },
  // {
  //   label: "Analytics",
  //   path: "/dashboard/admin/analytics",
  //   icon: <ChartIcon />,
  //   disabled: true,
  // },
  // {
  //   label: "Settings",
  //   path: "/dashboard/admin/settings",
  //   icon: <CogIcon />,
  //   disabled: true,
  // },
];

const OFFICER_NAV = [
  {
    label: "Issue Offence",
    path: "/dashboard/officer/issue-offence",
    icon: <TicketIcon />,
    disabled: false,
  },
  {
    label: "Identify Driver",
    path: "/dashboard/officer/identify",
    icon: <CameraIcon />,
    disabled: false,
  },
  {
    label: "Drivers",
    path: "/dashboard/officer/drivers",
    icon: <UsersIcon />,
    disabled: false,
  },
  {
    label: "Offence Types",
    path: "/dashboard/officer/offence-types",
    icon: <DocumentIcon />,
    disabled: false,
  },
  {
    label: "Penalty Rules",
    path: "/dashboard/officer/penalty-rules",
    icon: <ChartIcon />,
    disabled: false,
  },
  // {
  //   label: "My Offences",
  //   path: "/dashboard/officer/offences",
  //   icon: <DocumentIcon />,
  //   disabled: true,
  // },
];

// ── NavItem ────────────────────────────────────────────────────────────────────

function NavItem({ item, onClick }) {
  const location = useLocation();
  const isActive = !item.disabled && location.pathname.startsWith(item.path);

  if (item.disabled) {
    return (
      <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-400 cursor-not-allowed select-none">
        <span className="shrink-0 opacity-50">{item.icon}</span>
        <span className="text-sm font-medium">{item.label}</span>
        <span className="ml-auto text-xs bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded-md">
          Soon
        </span>
      </div>
    );
  }

  return (
    <NavLink
      to={item.path}
      onClick={onClick}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
        isActive
          ? "bg-blue-50 text-blue-700"
          : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
      }`}
    >
      <span className={`shrink-0 ${isActive ? "text-blue-600" : ""}`}>
        {item.icon}
      </span>
      {item.label}
    </NavLink>
  );
}

// ── Sidebar content (shared between desktop sidebar and mobile drawer) ────────

function SidebarContent({ onClose, user, logout }) {
  const navItems = user?.role === "admin" ? ADMIN_NAV : OFFICER_NAV;
  const initials = user?.full_name
    ? user.full_name
        .split(" ")
        .slice(0, 2)
        .map((w) => w[0])
        .join("")
        .toUpperCase()
    : "?";

  return (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-4 py-5 border-b border-gray-100">
        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
          <ShieldIcon />
        </div>
        <div>
          <p className="text-sm font-bold text-gray-900 leading-tight">TMS</p>
          <p className="text-xs text-gray-400">Traffic Enforcement</p>
        </div>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavItem key={item.path} item={item} onClick={onClose} />
        ))}
      </nav>

      {/* User info + logout */}
      <div className="px-4 py-4 border-t border-gray-100 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-700 shrink-0">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-800 truncate">
              {user?.full_name}
            </p>
            <p className="text-xs text-gray-400 capitalize">{user?.role}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 transition"
        >
          <LogoutIcon />
          Logout
        </button>
      </div>
    </div>
  );
}

// ── Navigation (exported) — handles desktop sidebar + mobile header  ──────────

/**
 * Navigation component.
 *
 * Props:
 *   mobileOpen    — boolean controlled by DashboardLayout
 *   onMobileClose — () => void
 */
export default function Navigation({ mobileOpen, onMobileClose }) {
  const { user, logout } = useAuth();

  return (
    <>
      {/* ── Desktop sidebar — hidden on mobile ── */}
      <aside className="hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:w-56 bg-white border-r border-gray-100 shadow-sm z-20">
        <SidebarContent user={user} logout={logout} onClose={undefined} />
      </aside>

      {/* ── Mobile sidebar overlay ── */}
      {mobileOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-30 lg:hidden"
            onClick={onMobileClose}
          />
          {/* Drawer */}
          <aside className="fixed inset-y-0 left-0 w-64 bg-white shadow-xl z-40 lg:hidden">
            <div className="absolute top-3 right-3">
              <button
                onClick={onMobileClose}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"
              >
                <svg
                  className="w-4 h-4"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <SidebarContent
              user={user}
              logout={logout}
              onClose={onMobileClose}
            />
          </aside>
        </>
      )}
    </>
  );
}
