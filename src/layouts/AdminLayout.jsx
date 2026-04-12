import { FileCheck2, Home, LayoutDashboard, LogOut, ShieldCheck, Store, Users } from "lucide-react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";

const navItems = [
  { to: "/admin/overview", icon: LayoutDashboard, label: "Tổng quan" },
  { to: "/admin/restaurants", icon: Store, label: "Quán ăn" },
  { to: "/admin/posts", icon: FileCheck2, label: "Bài đăng" },
  { to: "/admin/users", icon: Users, label: "Người dùng" },
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
            <span>Trang người dùng</span>
          </button>
          <button type="button" className="ghost-btn danger-btn" onClick={handleLogout}>
            <LogOut size={16} />
            <span>Thoát Admin</span>
          </button>
        </div>
      </aside>

      <main className="admin-main">
        <header className="admin-header surface-card">
          <div>
            <p className="admin-header-kicker">Quản trị nội dung</p>
            <h1>Bảng điều khiển Admin</h1>
          </div>
          <span className="status-pill status-pill-approved admin-role-pill">
            <ShieldCheck size={14} />
            <span>Quyền Admin</span>
          </span>
        </header>

        <section className="admin-content">
          <Outlet />
        </section>
      </main>
    </div>
  );
}
