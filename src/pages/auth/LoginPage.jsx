import { useState } from "react";
import { ChefHat, LogIn } from "lucide-react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/useAuth";

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, isAdmin, login } = useAuth();
  const [formState, setFormState] = useState({
    identifier: "",
    password: "",
  });
  const [errorMessage, setErrorMessage] = useState("");

  const adminRequired = Boolean(location.state?.adminRequired);
  const deniedPath = location.state?.deniedPath;

  if (isAuthenticated && !adminRequired) {
    return <Navigate to={isAdmin ? "/admin" : "/"} replace />;
  }

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormState((currentState) => ({
      ...currentState,
      [name]: value,
    }));

    if (errorMessage) {
      setErrorMessage("");
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const result = await login(formState);

    if (!result.ok) {
      setErrorMessage(result.message);
      return;
    }

    const nextPath = result.session.role === "admin" ? "/admin" : "/";
    navigate(nextPath, {
      replace: true,
      state: {
        authMessage: `Chào mừng ${result.session.displayName} quay trở lại (${result.source || "api"}).`,
      },
    });
  };

  return (
    <div className="page-wrap">
      <div className="app-shell auth-shell">
        <section className="surface-card auth-card">
          <div className="auth-header">
            <div className="auth-logo">
              <ChefHat size={32} />
            </div>
            <h1>Chào mừng trở lại</h1>
            <p>Đăng nhập để lưu địa điểm yêu thích và tiếp tục hành trình ăn uống.</p>
          </div>

          {adminRequired && deniedPath && (
            <div className="auth-error" role="alert">
              Đường dẫn {deniedPath} cần quyền admin. Vui lòng đăng nhập bằng tài khoản admin.
            </div>
          )}

          {errorMessage && (
            <div className="auth-error" role="alert">
              {errorMessage}
            </div>
          )}

          <form className="auth-form" onSubmit={handleSubmit}>
            <label className="control-field">
              <span>Tài khoản hoặc Email</span>
              <input
                name="identifier"
                type="text"
                value={formState.identifier}
                onChange={handleChange}
                placeholder="admin hoặc ban@foodfinder.vn"
              />
            </label>

            <label className="control-field">
              <span>Mật khẩu</span>
              <input
                name="password"
                type="password"
                value={formState.password}
                onChange={handleChange}
                placeholder="Nhập mật khẩu của bạn"
              />
            </label>

            <button type="submit" className="brand-btn auth-submit">
              <LogIn size={16} />
              <span>Đăng nhập</span>
            </button>
          </form>

          <div className="auth-support-row">
            <Link to="/" className="ghost-btn">
              <span>Tiếp tục với vai trò khách</span>
            </Link>
          </div>

          <p className="auth-footer">
            Chưa có tài khoản? <Link to="/register">Đăng ký ngay</Link>
          </p>
        </section>
      </div>
    </div>
  );
}
