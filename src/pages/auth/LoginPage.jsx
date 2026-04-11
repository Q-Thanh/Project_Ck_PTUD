import { useState } from "react";
import { ChefHat, LogIn, ShieldCheck } from "lucide-react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/useAuth";

const DEFAULT_ADMIN_HINT = "De dung chuc nang Admin, dang nhap tai khoan: admin, mat khau: admin.";

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
  const adminHint = location.state?.adminHint || DEFAULT_ADMIN_HINT;

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
        authMessage: `Chao mung ${result.session.displayName} quay tro lai (${result.source || "api"}).`,
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
            <h1>Chao mung tro lai</h1>
            <p>Dang nhap de luu dia diem yeu thich va tiep tuc hanh trinh an uong.</p>
          </div>

          <div className="auth-info" role="note">
            <div className="auth-info-title">
              <ShieldCheck size={16} />
              <strong>Thong tin dang nhap Admin</strong>
            </div>
            <p>{adminHint}</p>
          </div>

          {adminRequired && deniedPath && (
            <div className="auth-error" role="alert">
              Duong dan {deniedPath} can quyen admin. Vui long dang nhap bang tai khoan admin.
            </div>
          )}

          {errorMessage && (
            <div className="auth-error" role="alert">
              {errorMessage}
            </div>
          )}

          <form className="auth-form" onSubmit={handleSubmit}>
            <label className="control-field">
              <span>Tai khoan hoac Email</span>
              <input
                name="identifier"
                type="text"
                value={formState.identifier}
                onChange={handleChange}
                placeholder="admin hoac ban@foodfinder.vn"
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
