import { useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { NotificationBell } from "./NotificationBell";

const NAVS = {
  CUSTOMER: [
    { to: "/customer/new", label: "New Order" },
    { to: "/customer/orders", label: "My Orders" },
    { to: "/notifications", label: "Notifications" },
  ],
  HEAD_OFFICE: [
    { to: "/ho/dashboard", label: "Dashboard" },
    { to: "/ho/pending", label: "Pending Approvals" },
    { to: "/ho/orders", label: "All Orders" },
    { to: "/ho/factory", label: "Factory Responses" },
    { to: "/notifications", label: "Notifications" },
  ],
  ADMIN: [
    { to: "/admin/dashboard", label: "Dashboard" },
    { to: "/admin/pending", label: "Pending Approvals" },
    { to: "/admin/orders", label: "All Orders" },
    { to: "/admin/factory", label: "Factory Responses" },
    { to: "/admin/users", label: "Users & Branches" },
    { to: "/admin/catalog", label: "Catalog" },
    { to: "/notifications", label: "Notifications" },
  ],
  FACTORY: [
    { to: "/factory/pending", label: "Pending Orders" },
    { to: "/factory/history", label: "History" },
    { to: "/notifications", label: "Notifications" },
  ],
};

export function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  if (!user) return null;
  const nav = NAVS[user.role];

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-3 md:px-4 py-3 flex items-center gap-3 md:gap-6">
          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-slate-600 hover:text-slate-900"
            aria-label="Toggle menu"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {mobileMenuOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>

          <Link to="/" className="text-brand-700 font-semibold text-base md:text-lg">
            AG Grow
          </Link>

          {/* Desktop navigation */}
          <nav className="hidden md:flex flex-1 items-center gap-4 overflow-auto">
            {nav.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                className={({ isActive }) =>
                  `text-sm whitespace-nowrap ${
                    isActive ? "text-brand-700 font-medium" : "text-slate-600 hover:text-slate-900"
                  }`
                }
              >
                {n.label}
              </NavLink>
            ))}
          </nav>

          {/* Desktop user info */}
          <div className="hidden md:flex items-center gap-3">
            <NotificationBell />
            <div className="text-right">
              <div className="text-sm font-medium">{user.name}</div>
              <div className="text-xs text-slate-500">{user.role.replace("_", " ")}</div>
            </div>
            <button onClick={handleLogout} className="btn-secondary">
              Logout
            </button>
          </div>

          {/* Mobile notification bell and user initial */}
          <div className="md:hidden ml-auto flex items-center gap-3">
            <NotificationBell />
            <div className="w-8 h-8 rounded-full bg-brand-600 text-white flex items-center justify-center text-sm font-medium">
              {user.name.charAt(0).toUpperCase()}
            </div>
          </div>
        </div>

        {/* Mobile menu drawer */}
        {mobileMenuOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black/50 z-40 md:hidden"
              onClick={() => setMobileMenuOpen(false)}
            />
            
            {/* Drawer */}
            <div className="fixed inset-y-0 left-0 w-72 bg-white shadow-xl z-50 md:hidden overflow-y-auto">
              <div className="p-4 border-b border-slate-200">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-brand-600 text-white flex items-center justify-center text-lg font-medium">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-slate-900">{user.name}</div>
                    <div className="text-xs text-slate-500">{user.role.replace("_", " ")}</div>
                  </div>
                </div>
              </div>

              <nav className="p-4 space-y-1">
                {nav.map((n) => (
                  <NavLink
                    key={n.to}
                    to={n.to}
                    onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      `block px-3 py-2 rounded-md text-sm ${
                        isActive
                          ? "bg-brand-50 text-brand-700 font-medium"
                          : "text-slate-700 hover:bg-slate-50"
                      }`
                    }
                  >
                    {n.label}
                  </NavLink>
                ))}
              </nav>

              <div className="p-4 border-t border-slate-200">
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleLogout();
                  }}
                  className="w-full btn-secondary justify-center"
                >
                  Logout
                </button>
              </div>
            </div>
          </>
        )}
      </header>
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 md:px-4 py-4 md:py-6">
        <Outlet />
      </main>
    </div>
  );
}
