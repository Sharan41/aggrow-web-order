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
    { to: "/ho/users", label: "Users & Branches" },
    { to: "/ho/catalog", label: "Catalog" },
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
  if (!user) return null;
  const nav = NAVS[user.role];

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-6">
          <Link to="/" className="text-brand-700 font-semibold text-lg">
            AG Grow
          </Link>
          <nav className="flex-1 flex items-center gap-4 overflow-auto">
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
          <div className="flex items-center gap-3">
            <NotificationBell />
            <div className="text-right">
              <div className="text-sm font-medium">{user.name}</div>
              <div className="text-xs text-slate-500">{user.role.replace("_", " ")}</div>
            </div>
            <button
              onClick={() => {
                logout();
                navigate("/login", { replace: true });
              }}
              className="btn-secondary"
            >
              Logout
            </button>
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
