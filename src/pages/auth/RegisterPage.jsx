import { useState } from 'react';
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/useAuth";

export default function RegisterPage() {
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
    <div style={{ maxWidth: '600px', margin: '50px auto', padding: '40px', backgroundColor: '#f9f9f9', borderRadius: '12px' }}>
      <div style={{ textAlign: 'center', marginBottom: '30px' }}>
        <div style={{ fontSize: '48px', marginBottom: '10px' }}>👨‍🍳</div>
        <h1>Tạo tài khoản mới</h1>
        <p>Đăng ký để lưu hành trình khám phá ẩm thực của bạn trong FoodFinder.</p>
      </div>

      {errorMessage && (
        <div style={{ color: '#d32f2f', backgroundColor: '#ffebee', padding: '10px', borderRadius: '5px', marginBottom: '15px' }}>
          {errorMessage}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Họ và tên</label>
          <input
            name="displayName"
            type="text"
            value={formState.displayName}
            onChange={handleChange}
            placeholder="Nguyen Van A"
            required
            style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '14px', boxSizing: 'border-box' }}
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Email</label>
          <input
            name="email"
            type="email"
            value={formState.email}
            onChange={handleChange}
            placeholder="ban@foodfinder.vn"
            required
            style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '14px', boxSizing: 'border-box' }}
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Mật khẩu</label>
          <input
            name="password"
            type="password"
            value={formState.password}
            onChange={handleChange}
            placeholder="Tạo mật khẩu của bạn"
            required
            style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '14px', boxSizing: 'border-box' }}
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Nhập lại mật khẩu</label>
          <input
            name="confirmPassword"
            type="password"
            value={formState.confirmPassword}
            onChange={handleChange}
            placeholder="Nhập lại mật khẩu"
            required
            style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '14px', boxSizing: 'border-box' }}
          />
        </div>

        <button type="submit" style={{ width: '100%', padding: '14px', backgroundColor: '#FF6B4A', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', marginBottom: '15px' }}>
          👤 Đăng ký tài khoản
        </button>
      </form>

      {/* 🔐 GOOGLE + FACEBOOK LOGIN */}
      <div style={{ margin: '20px 0' }}>
        <p style={{ textAlign: 'center', color: '#666', marginBottom: '15px', fontSize: '14px' }}>Hoặc đăng ký với:</p>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          {/* Google Button */}
          <a 
            href="/api/auth/google"
            style={{ 
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '12px',
              backgroundColor: '#DB4437',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              textDecoration: 'none',
              fontWeight: 'bold',
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'background-color 0.3s'
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = '#c1351d'}
            onMouseLeave={(e) => e.target.style.backgroundColor = '#DB4437'}
          >
            🔵 Google
          </a>

          {/* Facebook Button */}
          <a 
            href="/api/auth/facebook"
            style={{ 
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '12px',
              backgroundColor: '#1877F2',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              textDecoration: 'none',
              fontWeight: 'bold',
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'background-color 0.3s'
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = '#0a66c2'}
            onMouseLeave={(e) => e.target.style.backgroundColor = '#1877F2'}
          >
            📘 Facebook
          </a>
        </div>
      </div>

      <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '14px' }}>
        <span>Bạn đã sẵn sàng đăng nhập? </span>
        <a href="/login" style={{ color: '#FF6B4A', textDecoration: 'none', fontWeight: 'bold' }}>Mở trang đăng nhập</a>
      </div>
    </div>
  );
}
