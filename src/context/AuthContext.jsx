import { useEffect, useMemo, useState } from "react";
import { AuthContext } from "./authContextStore";

const SESSION_STORAGE_KEY = "foodfinder_session_v1";
// Không cần ACCOUNT_STORAGE_KEY nữa vì ta đã dùng SQLite Backend

function createGuestSession() {
  return { role: "guest", displayName: "Khach" };
}

function readStoredSession() {
  if (typeof window === "undefined") return createGuestSession();
  try {
    const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return createGuestSession();
    const parsed = JSON.parse(raw);
    if (!parsed || !["guest", "user", "admin"].includes(parsed.role)) {
      return createGuestSession();
    }
    return {
      displayName: typeof parsed.displayName === "string" ? parsed.displayName : "Khach",
      email: typeof parsed.email === "string" ? parsed.email : "",
      role: parsed.role,
    };
  } catch {
    return createGuestSession();
  }
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(readStoredSession);

  // Vẫn giữ lại Session Storage để người dùng F5 không bị văng đăng nhập
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    }
  }, [session]);

  const value = useMemo(
    () => ({
      session,
      isAuthenticated: session.role !== "guest",
      isAdmin: session.role === "admin",
      loginAsAdmin: () => setSession({ role: "admin", displayName: "Admin Demo" }),

      // 1. API ĐĂNG NHẬP
      login: async ({ email, password }) => {
        try {
          // Gọi API xuống Backend Node.js
          const response = await fetch("http://localhost:3000/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
          });

          const data = await response.json();

          if (!data.ok) {
            return { ok: false, message: data.message };
          }

          // Đăng nhập thành công, lưu phiên người dùng
          const nextSession = { role: "user", ...data.session };
          setSession(nextSession);
          return { ok: true, session: nextSession };

        } catch (error) {
          return { ok: false, message: "Không thể kết nối đến máy chủ Backend." };
        }
      },

      // 2. API ĐĂNG KÝ
      register: async ({ displayName, email, password }) => {
        const normalizedDisplayName = displayName.trim();
        const normalizedEmail = email.trim().toLowerCase();

        if (!normalizedDisplayName || !normalizedEmail || !password) {
          return { ok: false, message: "Vui lòng điền đầy đủ thông tin." };
        }

        try {
          // Gọi API xuống Backend Node.js
          const response = await fetch("http://localhost:3000/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
              displayName: normalizedDisplayName, 
              email: normalizedEmail, 
              password 
            }),
          });

          const data = await response.json();

          if (!data.ok) {
            return { ok: false, message: data.message };
          }

          // Đăng ký thành công, tự động đăng nhập
          const nextSession = { role: "user", ...data.session };
          setSession(nextSession);
          return { ok: true, session: nextSession };

        } catch (error) {
          return { ok: false, message: "Không thể kết nối đến máy chủ Backend." };
        }
      },

      logout: () => setSession(createGuestSession()),
    }),
    [session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}