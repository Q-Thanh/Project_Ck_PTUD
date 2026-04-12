import { useState } from "react";
import { ChefHat, UserPlus } from "lucide-react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/useAuth";

export function RegisterPage() {
  const navigate = useNavigate();
  const { isAuthenticated, isAdmin, register } = useAuth();
  const [formState, setFormState] = useState({
    displayName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [errorMessage, setErrorMessage] = useState("");

  if (isAuthenticated) {
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

    if (formState.password !== formState.confirmPassword) {
      setErrorMessage("Mật khẩu xác nhận không khớp.");
      return;
    }

    const result = await register({
      displayName: formState.displayName,
      email: formState.email,
      password: formState.password,
    });

    if (!result.ok) {
      setErrorMessage(result.message);
      return;
    }

    navigate("/", {
      replace: true,
      state: { authMessage: `Tài khoản ${result.session.displayName} đã sẵn sàng (${result.source || "api"}).` },
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
            <h1>Tạo tài khoản mới</h1>
            <p>Đăng ký để lưu hành trình khám phá ẩm thực của bạn trong FoodFinder.</p>
          </div>

          {errorMessage && (
            <div className="auth-error" role="alert">
              {errorMessage}
            </div>
          )}

          <form className="auth-form" onSubmit={handleSubmit}>
            <label className="control-field">
              <span>Họ và tên</span>
              <input
                name="displayName"
                type="text"
                value={formState.displayName}
                onChange={handleChange}
                placeholder="Nguyen Van A"
              />
            </label>

            <label className="control-field">
              <span>Email</span>
              <input
                name="email"
                type="email"
                value={formState.email}
                onChange={handleChange}
                placeholder="ban@foodfinder.vn"
              />
            </label>

            <label className="control-field">
              <span>Mật khẩu</span>
              <input
                name="password"
                type="password"
                value={formState.password}
                onChange={handleChange}
                placeholder="Tạo mật khẩu của bạn"
              />
            </label>

            <label className="control-field">
              <span>Nhập lại mật khẩu</span>
              <input
                name="confirmPassword"
                type="password"
                value={formState.confirmPassword}
                onChange={handleChange}
                placeholder="Nhập lại mật khẩu"
              />
            </label>

            <button type="submit" className="brand-btn auth-submit">
              <UserPlus size={16} />
              <span>Đăng ký tài khoản</span>
            </button>
          </form>

          <div className="auth-support-row">
            <Link to="/login" className="brand-btn-secondary">
              <span>Đã có tài khoản</span>
            </Link>

            <Link to="/" className="ghost-btn">
              <span>Tiếp tục với vai trò khách</span>
            </Link>
          </div>

          <p className="auth-footer">
            Bạn đã sẵn sàng đăng nhập? <Link to="/login">Mở trang đăng nhập</Link>
          </p>
        </section>
      </div>
    </div>
  );
}
