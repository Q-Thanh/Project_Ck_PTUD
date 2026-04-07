import { LayoutDashboard, LogOut, ShieldCheck, Store, UsersRound, FileCheck2, Home } from "lucide-react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";

const navItems = [
  { to: "/admin/overview", icon: LayoutDashboard, label: "Tong quan" },
  { to: "/admin/posts", icon: FileCheck2, label: "Bai dang" },
  { to: "/admin/restaurants", icon: Store, label: "Quan an" },
  { to: "/admin/users", icon: UsersRound, label: "Nguoi dung" },
];

export function AdminLayout() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar surface-card">
        <div className="admin-brand">
          <div className="brand-icon">F</div>
          <div>
            <p className="brand-title">FoodFinder</p>
            <p className="brand-subtitle">Admin Console</p>
          </div>
        </div>

        <nav className="admin-nav">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `admin-nav-item ${isActive ? "admin-nav-item-active" : ""}`
              }
            >
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="admin-sidebar-footer">
          <button type="button" className="ghost-btn" onClick={() => navigate("/")}>
            <Home size={16} />
            <span>Trang nguoi dung</span>
          </button>
          <button type="button" className="ghost-btn danger-btn" onClick={handleLogout}>
            <LogOut size={16} />
            <span>Thoat Admin</span>
          </button>
        </div>
      </aside>

      <main className="admin-main">
        <header className="admin-header surface-card">
          <div>
            <p className="admin-header-kicker">Quan tri noi dung</p>
            <h1>Bang dieu khien Admin</h1>
          </div>
          <span className="status-pill status-pill-approved admin-role-pill">
            <ShieldCheck size={14} />
            <span>Quyen Admin</span>
          </span>
        </header>

        <section className="admin-content">
          <Outlet />
        </section>
      </main>
    </div>
  );
}

