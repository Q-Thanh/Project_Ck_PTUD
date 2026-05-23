import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/useAuth";

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, isAdmin, login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const adminRequired = Boolean(location.state?.adminRequired);
  const deniedPath = location.state?.deniedPath;

  if (isAuthenticated && !adminRequired) {
    return <Navigate to={isAdmin ? "/admin" : "/"} replace />;
  }

  const handleLogin = async (event) => {
    event.preventDefault();

    const result = await login({ identifier: email, password });

    if (!result.ok) {
      setError(result.message);
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
    <div style={{ maxWidth: "600px", margin: "50px auto", padding: "40px", backgroundColor: "#f9f9f9", borderRadius: "12px" }}>
      <div style={{ textAlign: "center", marginBottom: "30px" }}>
        <div style={{ fontSize: "48px", marginBottom: "10px" }}>👨‍💼</div>
        <h1>Chào mừng trở lại</h1>
        <p>Đăng nhập để lưu địa điểm yêu thích và tiếp tục hành trình ăn uống.</p>
      </div>

      {error && (
        <div style={{ color: "#d32f2f", backgroundColor: "#ffebee", padding: "10px", borderRadius: "5px", marginBottom: "15px" }}>
          {error}
        </div>
      )}

      <form onSubmit={handleLogin}>
        <div style={{ marginBottom: "15px" }}>
          <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>Tài khoản hoặc Email</label>
          <input
            type="email"
            placeholder="admin hoặc ban@foodfinder.vn"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "14px", boxSizing: "border-box" }}
          />
        </div>

        <div style={{ marginBottom: "20px" }}>
          <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>Mật khẩu</label>
          <input
            type="password"
            placeholder="Nhập mật khẩu của bạn"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "14px", boxSizing: "border-box" }}
          />
        </div>

        <button
          type="submit"
          style={{
            width: "100%",
            padding: "14px",
            backgroundColor: "#FF6B4A",
            color: "white",
            border: "none",
            borderRadius: "8px",
            fontSize: "16px",
            fontWeight: "bold",
            cursor: "pointer",
            marginBottom: "20px",
          }}
        >
          ➜ Đăng nhập
        </button>
      </form>

      <button
        style={{
          width: "100%",
          padding: "10px",
          backgroundColor: "white",
          color: "#FF6B4A",
          border: "2px solid #FF6B4A",
          borderRadius: "8px",
          fontSize: "14px",
          fontWeight: "bold",
          cursor: "pointer",
          marginBottom: "25px",
        }}
      >
        Tiếp tục với vai trò khách
      </button>

      {/* 🔐 GOOGLE + FACEBOOK LOGIN */}
      <div style={{ margin: "20px 0", borderTop: "1px solid #ddd", paddingTop: "20px" }}>
        <p style={{ textAlign: "center", color: "#666", marginBottom: "12px", fontSize: "14px" }}>Hoặc đăng nhập với:</p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <a
            href="/api/auth/google"
            style={{
              display: "block",
              width: "100%",
              padding: "12px",
              textAlign: "center",
              backgroundColor: "#DB4437",
              color: "white",
              textDecoration: "none",
              fontWeight: "bold",
              fontSize: "14px",
              borderRadius: "8px",
              border: "none",
              cursor: "pointer",
              transition: "background-color 0.3s",
              boxSizing: "border-box",
            }}
            onMouseEnter={(e) => (e.target.style.backgroundColor = "#c1351d")}
            onMouseLeave={(e) => (e.target.style.backgroundColor = "#DB4437")}
          >
            Google
          </a>

          <a
            href="/api/auth/facebook"
            style={{
              display: "block",
              width: "100%",
              padding: "12px",
              textAlign: "center",
              backgroundColor: "#1877F2",
              color: "white",
              textDecoration: "none",
              fontWeight: "bold",
              fontSize: "14px",
              borderRadius: "8px",
              border: "none",
              cursor: "pointer",
              transition: "background-color 0.3s",
              boxSizing: "border-box",
            }}
            onMouseEnter={(e) => (e.target.style.backgroundColor = "#0a66c2")}
            onMouseLeave={(e) => (e.target.style.backgroundColor = "#1877F2")}
          >
            Facebook
          </a>
        </div>
      </div>

      <div style={{ textAlign: "center", marginTop: "20px", fontSize: "14px" }}>
        <span>Chưa có tài khoản? </span>
        <a href="/register" style={{ color: "#FF6B4A", textDecoration: "none", fontWeight: "bold" }}>
          Mở trang đăng ký
        </a>
      </div>
    </div>
  );
}
