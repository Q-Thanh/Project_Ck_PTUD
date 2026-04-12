import { Link, NavLink } from "react-router-dom";
import { LogOut, MapPinned, ShieldCheck, Sparkles, UserRound } from "lucide-react";
import { useAuth } from "../context/useAuth";

export function AppTopNav() {
  const { session, isAdmin, isAuthenticated, logout } = useAuth();

  return (
    <header className="surface-card top-nav">
      <div className="top-nav-brand">
        <div className="brand-icon">F</div>
        <div>
          <p className="brand-title">FoodFinder</p>
          <p className="brand-subtitle">Community + Bản đồ + Moderation</p>
        </div>
      </div>

      <nav className="top-nav-links">
        <NavLink to="/">Trang chủ</NavLink>
        <NavLink to="/community">Cộng đồng</NavLink>
        <NavLink to="/map">Bản đồ</NavLink>
      </nav>

      <div className="top-nav-actions">
        {!isAuthenticated && (
          <>
            <Link to="/login" className="ghost-btn">
              <UserRound size={16} />
              <span>Đăng nhập</span>
            </Link>
            <Link to="/register" className="brand-btn-secondary">
              <span>Đăng ký</span>
            </Link>
          </>
        )}

        {isAuthenticated && !isAdmin && (
          <>
            <Link to="/posts/create" className="brand-btn">
              <Sparkles size={16} />
              <span>Đăng bài</span>
            </Link>
            <Link to="/profile" className="ghost-btn">
              <MapPinned size={16} />
              <span>{session.displayName}</span>
            </Link>
            <button type="button" className="ghost-btn" onClick={logout}>
              <LogOut size={16} />
              <span>Đăng xuất</span>
            </button>
          </>
        )}

        {isAuthenticated && isAdmin && (
          <>
            <Link to="/admin" className="brand-btn">
              <ShieldCheck size={16} />
              <span>Quản trị viên</span>
            </Link>
            <Link to="/profile" className="ghost-btn">
              <MapPinned size={16} />
              <span>{session.displayName}</span>
            </Link>
            <button type="button" className="ghost-btn" onClick={logout}>
              <LogOut size={16} />
              <span>Đăng xuất</span>
            </button>
          </>
        )}
      </div>
    </header>
  );
}
