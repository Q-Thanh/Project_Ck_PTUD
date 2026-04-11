import { useState } from "react";
import { ChefHat, LogIn, ShieldCheck } from "lucide-react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/useAuth";

export function LoginPage() {
  const navigate = useNavigate();
  const { isAuthenticated, isAdmin, login, loginAsAdmin } = useAuth();
  const [formState, setFormState] = useState({
    email: "",
    password: "",
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

    // Thêm chữ await để chờ Backend trả kết quả
    const result = await login(formState); 
    
    if (!result.ok) {
      setErrorMessage(result.message);
      return;
    }

    const nextPath = result.session.role === "admin" ? "/admin" : "/";
    navigate(nextPath, {
      replace: true,
      state: {
        authMessage: `Chao mung ${result.session.displayName} quay tro lai (${result.source || "api"}).`,
      },
    });
  };

  const handleAdminDemo = () => {
    loginAsAdmin();
    navigate("/admin");
  };

  return (
    <div className="page-wrap">
      <div className="app-shell auth-shell">
        <section className="surface-card auth-card">
          <div className="auth-header">
            <div className="auth-logo">
              <ChefHat size={32} />
            </div>
            <h1>Chao mung tro lai</h1>
            <p>Dang nhap de luu dia diem yeu thich va tiep tuc hanh trinh an uong.</p>
          </div>

          {errorMessage && (
            <div className="auth-error" role="alert">
              {errorMessage}
            </div>
          )}

          <form className="auth-form" onSubmit={handleSubmit}>
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
                placeholder="Nhap mat khau cua ban"
              />
            </label>

            <button type="submit" className="brand-btn auth-submit">
              <LogIn size={16} />
              <span>Dang nhap</span>
            </button>
          </form>

          <div className="auth-support-row">
            <button type="button" className="brand-btn-secondary" onClick={handleAdminDemo}>
              <ShieldCheck size={16} />
              <span>Bat Admin Demo</span>
            </button>

            <Link to="/" className="ghost-btn">
              <span>Tiep tuc voi vai tro khach</span>
            </Link>
          </div>

          <p className="auth-footer">
            Chua co tai khoan? <Link to="/register">Dang ky ngay</Link>
          </p>
        </section>
      </div>
    </div>
  );
}
