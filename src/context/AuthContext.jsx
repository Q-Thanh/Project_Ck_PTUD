import { useMemo, useState } from "react";
import { AuthContext } from "./authContextStore";
import { apiRequest } from "../services/apiClient";

const SESSION_STORAGE_KEY = "foodfinder_session_v1";

function createGuestSession() {
  return { id: 0, role: "guest", displayName: "Khach", email: "", username: "" };
}

function readStoredSession() {
  if (typeof window === "undefined") return createGuestSession();
  try {
    const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return createGuestSession();
    const parsed = JSON.parse(raw);
    if (!parsed || !["guest", "user", "admin"].includes(parsed.role)) return createGuestSession();
    return {
      id: Number(parsed.id) || 0,
      role: parsed.role,
      displayName: String(parsed.displayName || "Khach"),
      email: String(parsed.email || ""),
      username: String(parsed.username || ""),
    };
  } catch {
    return createGuestSession();
  }
}

function persistSession(session) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
}

function normalizeSession(payload) {
  return {
    id: Number(payload?.id) || 0,
    role: ["guest", "user", "admin"].includes(payload?.role) ? payload.role : "user",
    displayName: String(payload?.displayName || payload?.name || "Người dùng"),
    email: String(payload?.email || ""),
    username: String(payload?.username || ""),
  };
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(readStoredSession);

  const value = useMemo(
    () => ({
      session,
      isAuthenticated: session.role !== "guest",
      isAdmin: session.role === "admin",

      login: async ({ identifier, email, password }) => {
        const normalizedIdentifier = String(identifier || email || "").trim().toLowerCase();
        if (!normalizedIdentifier || !password) {
          return { ok: false, message: "Vui lòng nhập đầy đủ tài khoản và mật khẩu." };
        }

        try {
          const data = await apiRequest("/api/auth/login", {
            method: "POST",
            body: {
              identifier: normalizedIdentifier,
              email: normalizedIdentifier,
              password,
            },
          });
          const nextSession = normalizeSession(data.session || {});
          persistSession(nextSession);
          setSession(nextSession);
          return { ok: true, session: nextSession, source: "api" };
        } catch (error) {
          return { ok: false, message: error.message || "Đăng nhập thất bại." };
        }
      },

      register: async ({ displayName, email, password }) => {
        const payload = {
          displayName: String(displayName ?? "").trim(),
          email: String(email ?? "").trim().toLowerCase(),
          password: String(password ?? ""),
        };
        if (!payload.displayName || !payload.email || !payload.password) {
          return { ok: false, message: "Vui lòng điền đầy đủ thông tin." };
        }

        try {
          const data = await apiRequest("/api/auth/register", {
            method: "POST",
            body: payload,
          });
          const nextSession = normalizeSession(data.session || {});
          persistSession(nextSession);
          setSession(nextSession);
          return { ok: true, session: nextSession, source: "api" };
        } catch (error) {
          return { ok: false, message: error.message || "Đăng ký thất bại." };
        }
      },

      refreshSession: async () => {
        if (!session?.id) return null;
        try {
          const data = await apiRequest("/api/users/me");
          const nextSession = normalizeSession(data.session || session);
          persistSession(nextSession);
          setSession(nextSession);
          return data;
        } catch {
          return null;
        }
      },

      logout: () => {
        const guest = createGuestSession();
        persistSession(guest);
        setSession(guest);
      },
    }),
    [session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
