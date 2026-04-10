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

  const handleSubmit = async (event) => { // Thêm chữ async
    event.preventDefault();

    if (formState.password !== formState.confirmPassword) {
      setErrorMessage("Mật khẩu xác nhận không khớp.");
      return;
    }

    // Thêm chữ await
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
      state: { authMessage: `Tài khoản ${result.session.displayName} đã sẵn sàng.` },
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
            <h1>Tao tai khoan moi</h1>
            <p>Dang ky de luu hanh trinh kham pha am thuc cua ban trong FoodFinder.</p>
          </div>

          {errorMessage && (
            <div className="auth-error" role="alert">
              {errorMessage}
            </div>
          )}

          <form className="auth-form" onSubmit={handleSubmit}>
            <label className="control-field">
              <span>Ho va ten</span>
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
              <span>Mat khau</span>
              <input
                name="password"
                type="password"
                value={formState.password}
                onChange={handleChange}
                placeholder="Tao mat khau cua ban"
              />
            </label>

            <label className="control-field">
              <span>Nhap lai mat khau</span>
              <input
                name="confirmPassword"
                type="password"
                value={formState.confirmPassword}
                onChange={handleChange}
                placeholder="Nhap lai mat khau"
              />
            </label>

            <button type="submit" className="brand-btn auth-submit">
              <UserPlus size={16} />
              <span>Dang ky tai khoan</span>
            </button>
          </form>

          <div className="auth-support-row">
            <Link to="/login" className="brand-btn-secondary">
              <span>Da co tai khoan</span>
            </Link>

            <Link to="/" className="ghost-btn">
              <span>Tiep tuc voi vai tro khach</span>
            </Link>
          </div>

          <p className="auth-footer">
            Ban da san sang dang nhap? <Link to="/login">Mo trang dang nhap</Link>
          </p>
        </section>
      </div>
    </div>
  );
}
